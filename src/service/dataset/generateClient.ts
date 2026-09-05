import type { GenerateDatasetConfig } from "./generate";
import type {
  DatasetWorkerRequest,
  DatasetWorkerResponse,
} from "./workerProtocol";

export interface GenerateDatasetRunOptions {
  signal?: AbortSignal;
}

type SaveFilePicker = (options?: {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<FileSystemFileHandle>;

const LARGE_DATASET_STREAMING_THRESHOLD = 10_000;
const CANCEL_TERMINATION_TIMEOUT_MS = 1_000;

function downloadArchive(data: Blob, filename: string): void {
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function createAbortError(): DOMException {
  return new DOMException("Dataset generation was cancelled.", "AbortError");
}

async function chooseStreamingDestination(
  simulationCount: number
): Promise<FileSystemFileHandle | undefined> {
  if (simulationCount < LARGE_DATASET_STREAMING_THRESHOLD) return undefined;

  const picker = (
    window as Window & { showSaveFilePicker?: SaveFilePicker }
  ).showSaveFilePicker;
  if (!picker) {
    throw new Error(
      "Large datasets require a browser that can stream the ZIP directly to a selected file. Use a current Chromium-based browser or reduce the simulation count below 10,000."
    );
  }

  return picker.call(window, {
    suggestedName: "lenscraft_dataset.zip",
    types: [
      {
        description: "ZIP archive",
        accept: { "application/zip": [".zip"] },
      },
    ],
  });
}

export async function generateRandomDataset(
  config: GenerateDatasetConfig,
  options: GenerateDatasetRunOptions = {}
): Promise<void> {
  const { signal } = options;
  if (signal?.aborted) throw createAbortError();

  const destination = await chooseStreamingDestination(config.simulationCount);
  if (signal?.aborted) throw createAbortError();

  if (typeof Worker === "undefined") {
    const { buildRandomDatasetArchive } = await import("./generate");
    let writable: FileSystemWritableFileStream | undefined;
    try {
      writable = destination
        ? await destination.createWritable({ keepExistingData: false })
        : undefined;
      const archive = await buildRandomDatasetArchive(config, {
        writable,
        signal,
      });
      if (archive.data) downloadArchive(archive.data, archive.filename);
      return;
    } catch (error) {
      if (writable && !writable.locked) {
        try {
          await writable.abort(error);
        } catch {
          // The archive writer may already have aborted the destination.
        }
      }
      throw error;
    }
  }

  const { onProgress, ...workerConfig } = config;
  const worker = new Worker(new URL("./generate.worker.ts", import.meta.url), {
    type: "module",
    name: "lenscraft-dataset-generator",
  });

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let cancelling = false;
    let terminationTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      signal?.removeEventListener("abort", handleAbort);
      if (terminationTimer !== undefined) clearTimeout(terminationTimer);
      worker.terminate();
    };

    const settle = (operation: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      operation();
    };

    const handleAbort = () => {
      if (settled || cancelling) return;
      cancelling = true;

      try {
        worker.postMessage({ type: "cancel" } satisfies DatasetWorkerRequest);
      } catch {
        settle(() => reject(createAbortError()));
        return;
      }

      // Give the worker a chance to abort the file stream cleanly. If it is
      // stuck in third-party ZIP finalization, terminate it as a fallback.
      terminationTimer = setTimeout(
        () => settle(() => reject(createAbortError())),
        CANCEL_TERMINATION_TIMEOUT_MS
      );
    };

    worker.onmessage = (event: MessageEvent<DatasetWorkerResponse>) => {
      const message = event.data;
      if (settled) return;

      if (cancelling) {
        if (message.type !== "progress") {
          settle(() => reject(createAbortError()));
        }
        return;
      }

      switch (message.type) {
        case "progress":
          onProgress?.(message.progress, message.phase);
          break;
        case "complete":
          settle(() => {
            if (message.data) downloadArchive(message.data, message.filename);
            resolve();
          });
          break;
        case "cancelled":
          settle(() => reject(createAbortError()));
          break;
        case "error": {
          const error = new Error(message.error.message);
          error.name = message.error.name;
          if (message.error.stack) error.stack = message.error.stack;
          settle(() => reject(error));
          break;
        }
      }
    };

    worker.onerror = (event) => {
      settle(() =>
        reject(
          cancelling
            ? createAbortError()
            : new Error(event.message || "Dataset worker failed.")
        )
      );
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
    if (signal?.aborted) {
      settle(() => reject(createAbortError()));
      return;
    }

    try {
      worker.postMessage({
        type: "start",
        config: workerConfig,
        ...(destination ? { destination } : {}),
      } satisfies DatasetWorkerRequest);
    } catch (error) {
      settle(() => reject(error));
    }
  });
}
