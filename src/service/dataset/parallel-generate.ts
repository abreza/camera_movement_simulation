import { ObjectClass } from "../subjects/types";

export interface GenerateDatasetConfig {
  simulationCount: number;
  subjectCount?: number;
  instructionCount?: number;
  minFrameCount?: number;
  maxFrameCount?: number;
  subjectClassProbabilities?: Partial<Record<ObjectClass, number>>;
}

async function saveDataChunk(chunk: any[], index: number) {
  const jsonString = JSON.stringify(
    chunk,
    (key, value) => {
      if (value?.isVector3) {
        return { x: value.x, y: value.y, z: value.z };
      }
      if (value?.isEuler) {
        return { x: value.x, y: value.y, z: value.z };
      }
      return value;
    },
    2
  );

  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cinematography_dataset_part${index}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function generateRandomDataset(config: GenerateDatasetConfig) {
  const {
    simulationCount = 1000,
    subjectCount = 1,
    instructionCount = 1,
    minFrameCount = 30,
    maxFrameCount = 30,
    subjectClassProbabilities,
  } = config;

  const workerCount = Math.min(10, simulationCount);
  const batchSize = Math.ceil(simulationCount / workerCount);
  const workers: Worker[] = [];
  const saveChunkSize = 10000;
  let currentChunk: any[] = [];
  let chunkIndex = 0;

  const processWorkerResult = async (data: any[]) => {
    for (const item of data) {
      currentChunk.push(item);
      if (currentChunk.length >= saveChunkSize) {
        await saveDataChunk(currentChunk, chunkIndex++);
        currentChunk = [];
      }
    }
  };

  const workerPromises = [];

  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker(new URL("./datasetWorker.ts", import.meta.url));
    workers.push(worker);

    const promise = new Promise((resolve) => {
      worker.onmessage = async (e) => {
        await processWorkerResult(e.data);
        resolve(null);
      };

      worker.postMessage({
        batchSize:
          i === workerCount - 1
            ? simulationCount - (workerCount - 1) * batchSize
            : batchSize,
        subjectCount,
        instructionCount,
        minFrameCount,
        maxFrameCount,
        subjectClassProbabilities,
      });
    });

    workerPromises.push(promise);
  }

  await Promise.all(workerPromises);

  if (currentChunk.length > 0) {
    await saveDataChunk(currentChunk, chunkIndex);
  }

  workers.forEach((worker) => worker.terminate());

  return true;
}
