import * as THREE from "three";

interface Subject {
  position: THREE.Vector3;
  size: THREE.Vector3;
}

interface Instruction {
  action: string;
  subject: Subject;
  startPosition: THREE.Vector3;
  startLookAt: THREE.Vector3;
}

export class PositionCalculator {
  private cameraPosition: THREE.Vector3;
  private cameraLookAt: THREE.Vector3;
  private subjects: Subject[];
  private currentInstruction: Instruction | null;
  private instructionProgress: number;
  private instructionDuration: number;

  constructor() {
    this.cameraPosition = new THREE.Vector3(0, 0, 10);
    this.cameraLookAt = new THREE.Vector3(0, 0, 0);
    this.subjects = [];
    this.currentInstruction = null;
    this.instructionProgress = 0;
    this.instructionDuration = 2000;
  }

  addSubject(position: THREE.Vector3, size: THREE.Vector3): void {
    this.subjects.push({ position: position.clone(), size: size.clone() });
  }

  startInstruction(instruction: string): void {
    const [action, subjectIndex, duration] = instruction.split(",");
    const subject = this.subjects[parseInt(subjectIndex, 10) - 1];

    if (!subject) {
      console.error("Subject not found");
      return;
    }

    this.currentInstruction = {
      action: action.trim().toLowerCase(),
      subject,
      startPosition: this.cameraPosition.clone(),
      startLookAt: this.cameraLookAt.clone(),
    };
    this.instructionProgress = 0;
    this.instructionDuration = parseInt(duration, 10);
  }

  updatePositions(deltaTime: number): void {
    if (this.currentInstruction) {
      this.instructionProgress += deltaTime / this.instructionDuration;
      this.instructionProgress = Math.min(this.instructionProgress, 1);

      const { action, subject, startPosition, startLookAt } =
        this.currentInstruction;
      const subjectPosition = subject.position;

      let endPosition: THREE.Vector3;
      let endLookAt: THREE.Vector3;

      switch (action) {
        case "zoomin":
          endPosition = subjectPosition.clone().add(new THREE.Vector3(0, 0, 2));
          endLookAt = subjectPosition;
          break;
        case "zoomout":
          endPosition = subjectPosition
            .clone()
            .add(new THREE.Vector3(0, 0, 10));
          endLookAt = subjectPosition;
          break;
        case "movearound":
          const radius = startPosition.distanceTo(subjectPosition);
          const angle = (Math.PI / 2) * this.instructionProgress;
          endPosition = new THREE.Vector3(
            subjectPosition.x + radius * Math.cos(angle),
            startPosition.y,
            subjectPosition.z + radius * Math.sin(angle)
          );
          endLookAt = subjectPosition;
          break;
        default:
          console.error("Unknown action:", action);
          return;
      }

      this.cameraPosition.lerpVectors(
        startPosition,
        endPosition,
        this.instructionProgress
      );
      this.cameraLookAt.lerpVectors(
        startLookAt,
        endLookAt,
        this.instructionProgress
      );
    }
  }

  isInstructionComplete(): boolean {
    return this.instructionProgress >= 1;
  }

  getCameraPosition(): THREE.Vector3 {
    return this.cameraPosition;
  }

  getCameraLookAt(): THREE.Vector3 {
    return this.cameraLookAt;
  }

  getSubjects(): Subject[] {
    return this.subjects;
  }
}
