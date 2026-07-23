import {
  CameraVerticalAngle,
  ShotSize,
  SubjectView,
  SubjectInFramePosition,
  CameraMovementType,
  MovementSpeed,
} from "@/service/simulation/instruction/types";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { normalizeCinematographyPrompt } from "@/service/simulation/instruction/high-level/rules";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_PROXY_URL || "https://api.openai.com/v1",
});

const systemPrompt = `
You are a cinematography technical assistant that converts text instructions into structured camera specifications using ONLY these enums:

CAMERA ANGLES: ${Object.values(CameraVerticalAngle).join(", ")}
SHOT SIZES: ${Object.values(ShotSize).join(", ")}
SUBJECT VIEWS: ${Object.values(SubjectView).join(", ")}
FRAMING POSITIONS: ${Object.values(SubjectInFramePosition).join(", ")}
MOVEMENT TYPES: ${Object.values(CameraMovementType).join(", ")}
SPEEDS: ${Object.values(MovementSpeed).join(", ")}

Follow these transformation rules:

1. **Direct Term Mapping**:
- "Low angle" → CameraVerticalAngle.Low
- "Close-up" → ShotSize.CloseUp
- "Over-the-shoulder" → SubjectView.ThreeQuarterFrontLeft
- "Dutch tilt" → CameraMovementType.DutchLeft
- "Slow zoom" → { type: DollyIn, speed: SlowToFast }

2. **Movement Interpretation**:
- "Pan" → PanLeft/PanRight based on context direction
- "Dolly" → DollyIn/DollyOut relative to subject
- "Crane shot" → CraneUp/CraneDown
- "Steadicam" → Track with SmoothStartStop speed

3. **Speed Conversion**:
- "Gradual" → SlowToFast
- "Sudden" → FastToSlow
- "Smooth" → SmoothStartStop
- "Maintain" → Constant

4. **Framing Logic**:
- "Centered" → Center
- "Off-center" → OuterLeft/OuterRight
- "Foreground" → Bottom
- "Background" → OuterBottom

5. **Transition Handling**:
- Only include 'final' properties if explicit transition
- Do not include 'final' for pan, tilt, truck, pedestal, or arc movements when an initial setup is present
- Match movement type to position changes
- Ensure physical camera possibility
`;

const cinematographySchema = z.object({
  initial: z.object({
    cameraAngle: z.nativeEnum(CameraVerticalAngle),
    shotSize: z.nativeEnum(ShotSize),
    subjectView: z.nativeEnum(SubjectView),
    subjectFraming: z.nativeEnum(SubjectInFramePosition),
  }),
  movement: z.object({
    type: z.nativeEnum(CameraMovementType),
    speed: z.nativeEnum(MovementSpeed),
  }),
  final: z
    .object({
      cameraAngle: z.nativeEnum(CameraVerticalAngle).optional(),
      shotSize: z.nativeEnum(ShotSize).optional(),
      subjectView: z.nativeEnum(SubjectView).optional(),
      subjectFraming: z.nativeEnum(SubjectInFramePosition).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt,
      schema: cinematographySchema,
    });

    return Response.json({
      cinematographyPrompt: normalizeCinematographyPrompt(object),
    });
  } catch (error) {
    console.error("AI processing error:", error);
    return Response.json(
      { error: "Failed to generate cinematography instructions" },
      { status: 500 }
    );
  }
}
