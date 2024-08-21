export class PositionCalculator {
  constructor() {
    this.cameraPosition = new THREE.Vector3(0, 0, 10);
    this.cameraLookAt = new THREE.Vector3(0, 0, 0);
    this.subjects = [];
    this.currentInstruction = null;
    this.instructionProgress = 0;
    this.instructionDuration = 2000;
  }

  addSubject(position, size) {
    this.subjects.push({ position: position.clone(), size: size.clone() });
  }

  executeInstruction(instruction) {
    const [action, subjectIndex] = instruction.split(",");
    const subject = this.subjects[parseInt(subjectIndex) - 1];

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
  }

  updatePositions(deltaTime) {
    if (this.currentInstruction) {
      this.instructionProgress += deltaTime / this.instructionDuration;
      this.instructionProgress = Math.min(this.instructionProgress, 1);

      const { action, subject, startPosition, startLookAt } =
        this.currentInstruction;
      const subjectPosition = subject.position;

      let endPosition, endLookAt;

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

      if (this.instructionProgress === 1) {
        this.currentInstruction = null;
      }
    }
  }

  getCameraPosition() {
    return this.cameraPosition;
  }

  getCameraLookAt() {
    return this.cameraLookAt;
  }

  getSubjects() {
    return this.subjects;
  }
}
