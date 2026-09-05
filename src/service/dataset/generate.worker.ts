import { buildRandomDatasetArchive } from "./generate";
import type {
  DatasetWorkerRequest,
  DatasetWorkerResponse,
} from "./workerProtocol";

type DatasetWorkerScope = {
  onmessage: ((event: MessageEvent<DatasetWorkerRequest>) => void) | null;
  postMessage: (message: DatasetWorkerResponse) => void;
};

const workerScope = self as unknown as DatasetWorkerScope;
const PROGRESS_INTERVAL_MS = 100;

let abortController: AbortController | undefined;
let running = false;

function serializeError(error: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  if (error instanceof Error || error instanceof DOMException) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }

  return {
    name: "Error",
    message: typeof error === "string" ? error : "Dataset generation failed.",
  };
}

workerScope.onmessage = (event) => {
  const request = event.data;
  if (request.type === "cancel") {
    const reason = new DOMException(
      "Dataset generation was cancelled.",
      "AbortError"
    );
    abortController?.abort(reason);
    return;
  }

  if (running) {
    workerScope.postMessage({
      type: "error",
      error: {
        name: "InvalidStateError",
        message: "This dataset worker is already generating an archive.",
      },
    });
    return;
  }

  running = true;
  abortController = new AbortController();
  void runGeneration(request);
};

async function runGeneration(
  request: Extract<DatasetWorkerRequest, { type: "start" }>
): Promise<void> {
  const controller = abortController!;
  let writable: FileSystemWritableFileStream | undefined;
  let lastProgressAt = 0;
  let lastProgress = -1;
  let lastPhase: "generating" | "zipping" | undefined;

  try {
    if (request.destination) {
      writable = await request.destination.createWritable({
        keepExistingData: false,
      });
    }

    const archive = await buildRandomDatasetArchive(
      {
        ...request.config,
        onProgress: (progress, phase) => {
          if (phase === lastPhase && progress === lastProgress) return;

          const now = performance.now();
          const phaseChanged = phase !== lastPhase;
          if (
            phaseChanged ||
            progress >= 100 ||
            now - lastProgressAt >= PROGRESS_INTERVAL_MS
          ) {
            workerScope.postMessage({ type: "progress", progress, phase });
            lastProgressAt = now;
            lastProgress = progress;
            lastPhase = phase;
          }
        },
      },
      { writable, signal: controller.signal }
    );

    workerScope.postMessage({
      type: "complete",
      datasetId: archive.datasetId,
      filename: archive.filename,
      ...(archive.data ? { data: archive.data } : {}),
    });
  } catch (error) {
    if (writable && !writable.locked) {
      try {
        await writable.abort(error);
      } catch {
        // The ZIP writer may already have aborted/closed the destination.
      }
    }

    if (controller.signal.aborted) {
      workerScope.postMessage({ type: "cancelled" });
    } else {
      workerScope.postMessage({ type: "error", error: serializeError(error) });
    }
  } finally {
    running = false;
    abortController = undefined;
  }
}

export {};
