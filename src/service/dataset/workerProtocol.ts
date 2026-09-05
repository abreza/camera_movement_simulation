import type {
  DatasetProgressPhase,
  GenerateDatasetConfig,
} from "./generate";

export type DatasetWorkerConfig = Omit<GenerateDatasetConfig, "onProgress">;

export type DatasetWorkerRequest =
  | {
      type: "start";
      config: DatasetWorkerConfig;
      destination?: FileSystemFileHandle;
    }
  | { type: "cancel" };

export type DatasetWorkerResponse =
  | {
      type: "progress";
      progress: number;
      phase: DatasetProgressPhase;
    }
  | {
      type: "complete";
      datasetId: string;
      filename: string;
      data?: Blob;
    }
  | { type: "cancelled" }
  | {
      type: "error";
      error: {
        name: string;
        message: string;
        stack?: string;
      };
    };
