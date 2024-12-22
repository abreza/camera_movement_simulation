import * as THREE from "three";

export const getLookAtAngle = (
  cameraPos: THREE.Vector3,
  targetPos: THREE.Vector3
): THREE.Euler => {
  const direction = new THREE.Vector3()
    .subVectors(cameraPos, targetPos)
    .normalize();
  return new THREE.Euler(
    Math.atan2(
      -direction.y,
      Math.sqrt(direction.x * direction.x + direction.z * direction.z)
    ),
    Math.atan2(direction.x, direction.z),
    0,
    "YXZ"
  );
};
