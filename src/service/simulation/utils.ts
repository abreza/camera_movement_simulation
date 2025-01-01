import * as THREE from "three";

export const getLookAtAngle = (
  cameraPosition: THREE.Vector3,
  targetPosition: THREE.Vector3
): THREE.Euler => {
  const direction = new THREE.Vector3()
    .subVectors(targetPosition, cameraPosition)
    .normalize();

  const rotationMatrix = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);

  if (Math.abs(direction.x) < 1e-10 && Math.abs(direction.z) < 1e-10) {
    up.set(0, 0, direction.y > 0 ? 1 : -1);
  }

  rotationMatrix.lookAt(new THREE.Vector3(0, 0, 0), direction, up);

  const euler = new THREE.Euler();
  euler.setFromRotationMatrix(rotationMatrix, "XYZ");

  return euler;
};
