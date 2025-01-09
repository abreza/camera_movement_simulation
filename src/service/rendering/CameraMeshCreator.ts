import * as THREE from "three";

export class CameraMeshCreator {
  static createCameraMesh(color = 0x000000) {
    const cameraMesh = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(0.8, 0.8, 1.2);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: color });
    const cameraBody = new THREE.Mesh(bodyGeometry, bodyMaterial);

    const lensGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 32);
    const lensMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
    const lens = new THREE.Mesh(lensGeometry, lensMaterial);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = -0.85;

    const viewfinderGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const viewfinderMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const viewfinder = new THREE.Mesh(viewfinderGeometry, viewfinderMaterial);
    viewfinder.position.y = 0.6;
    viewfinder.position.z = 0.2;

    cameraMesh.add(cameraBody);
    cameraMesh.add(lens);
    cameraMesh.add(viewfinder);

    cameraMesh.rotation.y = Math.PI;

    cameraMesh.scale.set(0.5, 0.5, 0.5);

    return cameraMesh;
  }
}
