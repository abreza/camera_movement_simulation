import {
  CinematographyPrompt,
  SimulationInstruction,
} from "../simulation/instruction/types";
import { translatePromptToSimulationInstruction } from "../simulation/instruction/high-level/translator";

interface MessageChoice {
  message: {
    content: string;
  };
}

interface ApiResponse {
  choices: MessageChoice[];
}

interface InputItem {
  custom_id: string;
  response: ApiResponse;
}

interface OutputItem {
  custom_id: string;
  cinematographyPrompts: CinematographyPrompt[];
  simulationInstructions: SimulationInstruction[];
}

export function processInputData(inputData: InputItem[]): OutputItem[] {
  return inputData.map((item) => {
    try {
      const content = item.response.choices[0].message.content;

      const parsedContent = JSON.parse(content);
      const cinematographyPrompts = parsedContent.cinematographyPrompts || [];

      const simulationInstructions = cinematographyPrompts.map(
        (prompt: CinematographyPrompt) =>
          translatePromptToSimulationInstruction(prompt, { frameCount: 30 })
      );

      return {
        custom_id: item.custom_id,
        cinematographyPrompts,
        simulationInstructions,
      };
    } catch (error) {
      console.error(`Error processing item ${item.custom_id}:`, error);
      return {
        custom_id: item.custom_id,
        cinematographyPrompts: [],
        simulationInstructions: [],
      };
    }
  });
}

export function generateAndDownloadFile(outputData: OutputItem[]): void {
  const jsonData = JSON.stringify(outputData, null, 2);

  const blob = new Blob([jsonData], { type: "application/json" });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "cinematography_instructions.json";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
