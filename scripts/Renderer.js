export class Renderer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document
      .getElementById("canvas-container")
      .appendChild(this.renderer.domElement);

    this.subjectMeshes = [];

    window.addEventListener("resize", this.onWindowResize.bind(this), false);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updateScene(cameraPosition, cameraLookAt, subjects) {
    this.camera.position.copy(cameraPosition);
    this.camera.lookAt(cameraLookAt);

    while (this.subjectMeshes.length < subjects.length) {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
      this.subjectMeshes.push(mesh);
    }

    subjects.forEach((subject, index) => {
      const mesh = this.subjectMeshes[index];
      mesh.position.copy(subject.position);
      mesh.scale.copy(subject.size);
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
