import * as THREE from "three";
import { CameraParameters } from "@/service/simulation/instruction/types";
import {
  SubjectInfo,
  SubjectFrame,
  ObjectClass,
  Subject,
} from "@/service/subjects/types";
import { DEFAULT_ASPECT_RATIO } from "@/service/simulation/constants";
import { objectSizes } from "@/service/subjects/constants";
import { translatePromptToSimulationInstruction } from "../simulation/instruction/high-level/translator";
import { simulatedPrompts } from "./constant";
import { generateCameraParameters } from "../simulation/rule-based/sequence";

export enum RideDataSource {
  CSV = "csv",
  SIMULATION = "simulation",
}

interface RideData {
  cameraFrames: CameraParameters[];
  subjectsInfo: SubjectInfo[];
  frameRate?: number;
  csvData?: string;
}

export function parseRideCsv(csvText: string): any[] {
  const lines = csvText.trim().split(/\r\n|\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const entry: { [key: string]: string } = {};
    header.forEach((h, i) => {
      entry[h] = values[i]?.trim();
    });
    return entry;
  });
}

function extractDataFromRideCsv(data: any[]): RideData {
  const cameraFrames: CameraParameters[] = [];
  const subjectsInfo: SubjectInfo[] = [];
  const totalHorses = 3;

  const horseFrames: { [key: number]: SubjectFrame[] } = {};
  for (let i = 1; i <= totalHorses; i++) {
    horseFrames[i] = [];
  }

  data.forEach((row) => {
    const cameraPosition = new THREE.Vector3(
      parseFloat(row.Camera_PosX),
      parseFloat(row.Camera_PosY),
      parseFloat(row.Camera_PosZ)
    );
    const cameraQuat = new THREE.Quaternion(
      parseFloat(row.Camera_RotX),
      parseFloat(row.Camera_RotY),
      parseFloat(row.Camera_RotZ),
      parseFloat(row.Camera_RotW)
    ).normalize();

    const cameraRotation = new THREE.Euler().setFromQuaternion(
      cameraQuat,
      "YXZ"
    );

    cameraRotation.x += Math.PI;
    cameraRotation.z += Math.PI;

    cameraFrames.push({
      position: cameraPosition,
      rotation: cameraRotation,
      focalLength: 25,
      aspectRatio: DEFAULT_ASPECT_RATIO,
    });

    for (let i = 1; i <= totalHorses; i++) {
      const horsePosition = new THREE.Vector3(
        parseFloat(row[`Horse${i}_PosX`]),
        parseFloat(row[`Horse${i}_PosY`]),
        parseFloat(row[`Horse${i}_PosZ`])
      );
      const horseQuat = new THREE.Quaternion(
        parseFloat(row[`Horse${i}_RotX`]),
        parseFloat(row[`Horse${i}_RotY`]),
        parseFloat(row[`Horse${i}_RotZ`]),
        parseFloat(row[`Horse${i}_RotW`])
      ).normalize();
      const horseRotation = new THREE.Euler().setFromQuaternion(
        horseQuat,
        "XYZ"
      );

      horseFrames[i].push({
        position: horsePosition,
        rotation: horseRotation,
      });
    }
  });

  for (let i = 1; i <= totalHorses; i++) {
    const horseSubject: Subject = {
      id: `ride-imported-horse-${i}`,
      class: ObjectClass.Car,
      dimensions: {
        width: objectSizes[ObjectClass.Car].mean.x * 2,
        height: objectSizes[ObjectClass.Car].mean.y * 2,
        depth: objectSizes[ObjectClass.Car].mean.z * 2,
      },
    };

    const horseSubjectInfo: SubjectInfo = {
      subject: horseSubject,
      frames: horseFrames[i],
      movementType: "ride-data",
    };
    subjectsInfo.push(horseSubjectInfo);
  }

  let frameRate = 60;
  if (data.length > 1) {
    const firstRowTime = parseFloat(data[0].ElapsedTime);
    const lastRowTime = parseFloat(data[data.length - 1].ElapsedTime);
    const totalDuration = lastRowTime - firstRowTime;
    if (totalDuration > 0) {
      frameRate = (data.length - 1) / totalDuration;
    }
  }

  return { cameraFrames, subjectsInfo, frameRate };
}

function createRideCsv(
  subjectsInfo: SubjectInfo[],
  cameraFrames: CameraParameters[],
  frameRate: number = 60
): string {
  if (!cameraFrames?.length) {
    return "";
  }

  const SECONDS_PER_FRAME = 1 / frameRate;
  const SENSOR_HEIGHT = 24;

  const formatTimestamp = (date: Date): string => {
    const iso = date.toISOString();
    return iso.replace("T", " ").substring(0, 23);
  };

  const focalLengthToFov = (focalLength: number): number => {
    return 2 * Math.atan(SENSOR_HEIGHT / (2 * focalLength)) * (180 / Math.PI);
  };

  const header = [
    "Timestamp",
    "ElapsedTime",
    "Phase",
    "CameraVariation",
    "Camera_PosX",
    "Camera_PosY",
    "Camera_PosZ",
    "Camera_RotX",
    "Camera_RotY",
    "Camera_RotZ",
    "Camera_RotW",
    "Camera_FOV",
  ];

  const numSubjects = subjectsInfo.length;
  for (let i = 1; i <= numSubjects; i++) {
    header.push(
      `Horse${i}_PosX`,
      `Horse${i}_PosY`,
      `Horse${i}_PosZ`,
      `Horse${i}_RotX`,
      `Horse${i}_RotY`,
      `Horse${i}_RotZ`,
      `Horse${i}_RotW`,
      `Horse${i}_Speed`,
      `Horse${i}_DistanceFromStart`
    );
  }
  header.push("PrimaryHorse_IsJumping", "PhaseChanged");

  const rows: string[] = [header.join(",")];
  const startDate = new Date();
  const subjectDistances: number[] = new Array(numSubjects).fill(0);

  for (let i = 0; i < cameraFrames.length; i++) {
    const rowData: (string | number | boolean)[] = [];
    const camParams = cameraFrames[i];

    const elapsedTime = i * SECONDS_PER_FRAME;
    const timestamp = new Date(startDate.getTime() + elapsedTime * 1000);
    rowData.push(formatTimestamp(timestamp));
    rowData.push(elapsedTime.toFixed(3));

    rowData.push("Simulated");
    rowData.push("None");

    rowData.push(camParams.position.x.toFixed(3));
    rowData.push(camParams.position.y.toFixed(3));
    rowData.push(camParams.position.z.toFixed(3));

    const camQuat = new THREE.Quaternion().setFromEuler(camParams.rotation);
    rowData.push(camQuat.x.toFixed(6));
    rowData.push(camQuat.y.toFixed(6));
    rowData.push(camQuat.z.toFixed(6));
    rowData.push(camQuat.w.toFixed(6));
    rowData.push(focalLengthToFov(camParams.focalLength).toFixed(1));

    for (let j = 0; j < numSubjects; j++) {
      const subject = subjectsInfo[j];
      const currentFrame = subject.frames?.[i];
      const prevFrame = i > 0 ? subject.frames?.[i - 1] : undefined;

      if (!currentFrame) {
        rowData.push(...Array(9).fill(""));
        continue;
      }

      rowData.push(currentFrame.position.x.toFixed(3));
      rowData.push(currentFrame.position.y.toFixed(3));
      rowData.push(currentFrame.position.z.toFixed(3));

      const subjectQuat = new THREE.Quaternion().setFromEuler(
        currentFrame.rotation
      );
      rowData.push(subjectQuat.x.toFixed(6));
      rowData.push(subjectQuat.y.toFixed(6));
      rowData.push(subjectQuat.z.toFixed(6));
      rowData.push(subjectQuat.w.toFixed(6));

      let speed = 0;
      if (prevFrame) {
        const distanceThisFrame = currentFrame.position.distanceTo(
          prevFrame.position
        );
        speed = distanceThisFrame / SECONDS_PER_FRAME;
        subjectDistances[j] += distanceThisFrame;
      }
      rowData.push(speed.toFixed(2));
      rowData.push(subjectDistances[j].toFixed(2));
    }

    rowData.push("False");
    rowData.push("FALSE");

    rows.push(rowData.join(","));
  }

  return rows.join("\n");
}

function generateSimulatedCameraFrames(
  allSubjects: SubjectInfo[]
): CameraParameters[] {
  if (
    !allSubjects ||
    allSubjects.length === 0 ||
    !allSubjects[0].frames ||
    allSubjects[0].frames.length === 0
  ) {
    return [];
  }

  const totalFramesFromCsv = allSubjects[0].frames?.length || 0;
  const totalRequiredFrames = simulatedPrompts.reduce(
    (sum, p) => sum + (p.frameCount || 0),
    0
  );

  if (totalFramesFromCsv < totalRequiredFrames) {
    console.error(
      `Not enough frames in CSV to simulate all prompts. Required: ${totalRequiredFrames}, Available: ${totalFramesFromCsv}`
    );
    throw new Error(
      `Not enough frames in CSV. Required: ${totalRequiredFrames}, Available: ${totalFramesFromCsv}`
    );
  }

  const allCameraFrames: CameraParameters[] = [];
  let currentSubjectFrameIndex = 0;
  let subjectIndexForPrompt = 0;

  simulatedPrompts.forEach((prompt) => {
    const frameCount = prompt.frameCount || 0;
    if (frameCount === 0) return;

    const currentSubjectInfo = allSubjects[subjectIndexForPrompt];

    const subjectInfoSegment: SubjectInfo = {
      ...currentSubjectInfo,
      frames: currentSubjectInfo.frames?.slice(
        currentSubjectFrameIndex,
        currentSubjectFrameIndex + frameCount
      ),
    };

    if (!subjectInfoSegment.frames || subjectInfoSegment.frames.length === 0) {
      return;
    }

    const instruction = translatePromptToSimulationInstruction(prompt, {
      frameCount,
      subjectIndex: subjectIndexForPrompt,
    });

    const startCameraParameter =
      allCameraFrames.length > 0
        ? allCameraFrames[allCameraFrames.length - 1]
        : undefined;

    const newFrames = generateCameraParameters(
      instruction,
      startCameraParameter,
      subjectInfoSegment
    );

    allCameraFrames.push(...newFrames);

    currentSubjectFrameIndex += frameCount;
    subjectIndexForPrompt = (subjectIndexForPrompt + 1) % allSubjects.length;
  });

  return allCameraFrames;
}

export function processRideData(
  source: RideDataSource,
  csvText: string
): RideData {
  if (!csvText) {
    throw new Error("CSV text is required to process ride data.");
  }

  const parsedData = parseRideCsv(csvText);
  const baseRideData = extractDataFromRideCsv(parsedData);

  switch (source) {
    case RideDataSource.CSV:
      return baseRideData;

    case RideDataSource.SIMULATION:
      const simulatedCameraFrames = generateSimulatedCameraFrames(
        baseRideData.subjectsInfo
      );

      const subjectsInfoForCsv = baseRideData.subjectsInfo.map((info) => ({
        ...info,
        frames: info.frames?.slice(0, simulatedCameraFrames.length),
      }));

      return {
        cameraFrames: simulatedCameraFrames,
        subjectsInfo: baseRideData.subjectsInfo,
        csvData: createRideCsv(
          subjectsInfoForCsv,
          simulatedCameraFrames,
          baseRideData.frameRate
        ),
      };

    default:
      throw new Error(`Unsupported ride data source: ${source}`);
  }
}
