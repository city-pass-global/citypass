import * as THREE from 'three';

/** A finite, action-triggered press. The accessible ink impression lives in HTML. */
export function pressStamp(host: HTMLElement, onContact: () => void, onDone: () => void) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.setClearColor(0, 0);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, host.clientWidth / host.clientHeight, 0.1, 30);
  camera.position.set(0, 4.3, 6.4);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xfff8dc, 0x163e35, 3));
  const light = new THREE.DirectionalLight(0xffffff, 4);
  light.position.set(-3, 5, 4);
  scene.add(light);
  const stamp = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x28533e, roughness: 0.48 });
  const brass = new THREE.MeshStandardMaterial({
    color: 0xc6aa67,
    metalness: 0.65,
    roughness: 0.32,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x183a30, roughness: 1 });
  const geometries: THREE.BufferGeometry[] = [];
  function part(radius: number, height: number, y: number, material: THREE.Material) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 48);
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    stamp.add(mesh);
  }
  part(0.86, 0.16, 0, rubber);
  part(0.9, 0.16, 0.15, brass);
  part(0.18, 0.7, 0.57, brass);
  part(0.38, 0.48, 1.12, wood);
  scene.add(stamp);
  let contacted = false;
  let disposed = false;
  const start = performance.now();
  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    renderer.domElement.removeEventListener('webglcontextlost', lost);
    document.removeEventListener('visibilitychange', hidden);
    geometries.forEach((g) => g.dispose());
    [wood, brass, rubber].forEach((m) => m.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  }
  function finish() {
    if (!contacted) {
      contacted = true;
      onContact();
    }
    dispose();
    onDone();
  }
  function lost(event: Event) {
    event.preventDefault();
    finish();
  }
  function hidden() {
    if (document.hidden) finish();
  }
  renderer.domElement.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', hidden);
  renderer.setAnimationLoop(() => {
    const progress = Math.min((performance.now() - start) / 1100, 1);
    if (progress < 0.43) {
      const t = progress / 0.43;
      stamp.position.y = 4 * (1 - t * t * t);
      stamp.rotation.z = 0.15 * (1 - t);
    } else {
      if (!contacted) {
        contacted = true;
        onContact();
      }
      const t = Math.max(0, (progress - 0.57) / 0.43);
      stamp.position.y = 5 * t * t;
      stamp.rotation.z = -0.12 * t;
    }
    renderer.render(scene, camera);
    if (progress === 1) finish();
  });
  return dispose;
}
