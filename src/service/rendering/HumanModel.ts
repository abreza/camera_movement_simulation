import * as THREE from "three";

/**
 * Standing human preview with canonical local front = -Z. The full body is a
 * rigid proxy, not a skeleton or an animated gait. SubjectMeshCreator scales
 * its complete bounding box to the exported subject dimensions.
 */
export function createHumanModel(): THREE.Group {
  const model = new THREE.Group();
  model.name = "human-whole-body";
  model.userData.frontAxis = "-Z";
  model.userData.geometryModel = "whole-body-proxy-v1";

  const skin = new THREE.MeshStandardMaterial({ color: 0xc68d68, roughness: 0.85 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x32798a, roughness: 0.9 });
  const trousers = new THREE.MeshStandardMaterial({ color: 0x293b54, roughness: 0.95 });
  const shoes = new THREE.MeshStandardMaterial({ color: 0x222833, roughness: 0.85 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x33271f, roughness: 1 });
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xf6f2e9, roughness: 0.7 });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.7 });

  const ellipsoid = (
    name: string, material: THREE.Material,
    position: [number, number, number], scale: [number, number, number],
    geometry = new THREE.SphereGeometry(1, 20, 16)
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    model.add(mesh);
    return mesh;
  };
  const limb = (
    name: string, material: THREE.Material,
    from: [number, number, number], to: [number, number, number],
    topRadius: number, bottomRadius: number
  ) => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    // The cylinder's top (+Y) is the limb's start.
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(topRadius, bottomRadius, direction.length(), 16),
      material
    );
    mesh.name = name;
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction.normalize());
    model.add(mesh);
  };

  ellipsoid("torso", shirt, [0, 1.22, 0], [0.205, 0.285, 0.112]);
  ellipsoid("hips", trousers, [0, 0.96, 0], [0.173, 0.15, 0.106]);
  limb("neck", skin, [0, 1.55, 0], [0, 1.45, 0], 0.06, 0.063);
  ellipsoid("head", skin, [0, 1.664, -0.005], [0.115, 0.15, 0.108]);
  ellipsoid(
    "hair", hair, [0, 1.674, 0], [0.118, 0.145, 0.111],
    new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  );
  ellipsoid("nose", skin, [0, 1.655, -0.112], [0.019, 0.025, 0.025]);

  for (const side of [-1, 1]) {
    const label = side < 0 ? "left" : "right";
    ellipsoid(`${label}-ear`, skin, [side * 0.115, 1.661, 0], [0.018, 0.032, 0.022]);
    ellipsoid(`${label}-eye`, eyeWhite, [side * 0.04, 1.69, -0.103], [0.022, 0.013, 0.01]);
    ellipsoid(`${label}-pupil`, pupil, [side * 0.04, 1.69, -0.112], [0.009, 0.009, 0.004]);

    ellipsoid(`${label}-shoulder`, shirt, [side * 0.205, 1.38, 0], [0.077, 0.087, 0.081]);
    limb(`${label}-upper-arm`, shirt,
      [side * 0.215, 1.38, 0], [side * 0.251, 1.14, 0], 0.068, 0.055);
    ellipsoid(`${label}-elbow`, skin, [side * 0.251, 1.14, 0], [0.05, 0.056, 0.05]);
    limb(`${label}-forearm`, skin,
      [side * 0.251, 1.14, 0], [side * 0.264, 0.91, -0.012], 0.05, 0.033);
    ellipsoid(`${label}-hand`, skin, [side * 0.264, 0.858, -0.012], [0.039, 0.072, 0.032]);

    limb(`${label}-thigh`, trousers,
      [side * 0.091, 0.95, 0], [side * 0.101, 0.53, 0], 0.092, 0.066);
    ellipsoid(`${label}-knee`, trousers, [side * 0.101, 0.53, 0], [0.067, 0.075, 0.068]);
    limb(`${label}-shin`, trousers,
      [side * 0.101, 0.53, 0], [side * 0.105, 0.13, 0], 0.065, 0.045);
    ellipsoid(`${label}-shoe`, shoes, [side * 0.105, 0.065, -0.035], [0.073, 0.065, 0.136]);
  }

  // SubjectFrame.position denotes the centre of the exported whole-body box.
  const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
  for (const child of model.children) child.position.sub(center);
  return model;
}
