import {
  CinematographyPrompt,
  SimulationInstruction,
} from "@/service/simulation/instruction/types";
import { translatePromptToSimulationInstruction } from "@/service/simulation/instruction/high-level/translator";
import { generateSubjects } from "@/service/subjects/generateSubjects";
import { Subject } from "@/service/subjects/types";
import { generateRandomCinematographyPrompt } from "../simulation/instruction/high-level/generator";
import {
  generateFrames,
  movementGenerators,
} from "@/service/subjects/generateFrames";
import { calculateCameraPositions } from "../simulation/optimization";

function assignRandomMovements(subjects: Subject[]): Record<string, string> {
  const movements: Record<string, string> = {};
  const movementTypes = Object.keys(movementGenerators);

  subjects.forEach((subject) => {
    const randomMovement =
      movementTypes[Math.floor(Math.random() * movementTypes.length)];
    movements[subject.id] = randomMovement;
  });

  return movements;
}

self.onmessage = (e) => {
  const {
    batchSize,
    subjectCount,
    instructionCount,
    minFrameCount,
    maxFrameCount,
    subjectClassProbabilities,
  } = e.data;

  const batchData = [];

  for (let s = 0; s < batchSize; s++) {
    const subjects = generateSubjects(subjectCount, subjectClassProbabilities);
    const subjectMovements = assignRandomMovements(subjects);
    const subjectFrames = generateFrames(subjects, subjectMovements);

    const cinematographyPrompts: CinematographyPrompt[] = [];
    const simulationInstructions: SimulationInstruction[] = [];

    for (let i = 0; i < instructionCount; i++) {
      const frameCount =
        Math.floor(Math.random() * (maxFrameCount - minFrameCount + 1)) +
        minFrameCount;
      const prompt = generateRandomCinematographyPrompt();
      cinematographyPrompts.push(prompt);

      const instruction = translatePromptToSimulationInstruction(prompt, {
        frameCount,
        subjectIndex: Math.floor(Math.random() * subjects.length),
      });
      simulationInstructions.push(instruction);
    }

    const subjectsInfo = subjects.map((subject, index) => ({
      subject,
      frames: subjectFrames[index],
    }));

    const cameraFrames = calculateCameraPositions(
      simulationInstructions,
      subjectsInfo
    );

    batchData.push({
      subjectsInfo,
      cinematographyPrompts,
      simulationInstructions,
      cameraFrames,
    });
  }

  self.postMessage(batchData);
};
