import * as THREE from 'three';

export type SceneController = {
  setPlaying: (playing: boolean) => void;
  setClose: (close: boolean) => void;
  dispose: () => void;
};

/** Decorative scene only: no domain data, network assets or input capture. */
export function createWaterfallScene(host: HTMLDivElement, onLost: () => void): SceneController {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xdce9de, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 60);
  camera.position.set(6.5, 5.4, 9);
  camera.lookAt(0, 1.1, 0);
  scene.add(new THREE.HemisphereLight(0xfffbea, 0x476c61, 2.8));
  const sun = new THREE.DirectionalLight(0xffedc0, 2.6);
  sun.position.set(-4, 8, 5);
  scene.add(sun);
  const world = new THREE.Group();
  scene.add(world);
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const material = (color: number) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
    materials.add(value);
    return value;
  };
  const geometry = <T extends THREE.BufferGeometry>(value: T): T => {
    geometries.add(value);
    return value;
  };
  const mesh = (
    shape: THREE.BufferGeometry,
    surface: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const object = new THREE.Mesh(shape, surface);
    object.position.set(x, y, z);
    world.add(object);
    return object;
  };
  const rock = material(0x58796b);
  const moss = material(0x73926a);
  const base = mesh(geometry(new THREE.CylinderGeometry(3.8, 3.45, 0.55, 64)), rock, 0, -0.31, 0);
  base.scale.z = 0.76;
  const pool = mesh(geometry(new THREE.CircleGeometry(3.73, 64)), material(0x69a9ad), 0, -0.02, 0);
  pool.rotation.x = -Math.PI / 2;
  pool.scale.y = 0.76;
  const cliffGeo = geometry(new THREE.DodecahedronGeometry(1, 0));
  const topWater = material(0x7ebcb7);
  const water = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec2 vUv;
      void main(){vUv=uv; vec3 p=position; p.z+=sin(p.y*7.0+p.x*9.0)*0.025; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    fragmentShader: `uniform float time; varying vec2 vUv;
      void main(){
        float streak=sin(vUv.x*95.0+sin(vUv.x*20.0)*3.0)*0.5+0.5;
        float flow=sin(vUv.y*30.0+time*3.4+vUv.x*21.0)*0.5+0.5;
        vec3 color=mix(vec3(0.48,0.75,0.74),vec3(0.91,0.98,0.93),0.5+streak*0.3+flow*0.15);
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
  });
  materials.add(water);
  const curtainGeo = geometry(new THREE.PlaneGeometry(0.34, 1.9, 1, 12));
  const riverGeo = geometry(new THREE.BoxGeometry(0.36, 0.055, 1.15));
  for (let i = 0; i < 17; i++) {
    const x = (i - 8) * 0.32;
    const z = -1.14 + 0.18 * x * x;
    const cliff = mesh(cliffGeo, i % 3 ? rock : moss, x, 0.98, z - 0.55);
    cliff.scale.set(0.43, 1.06, 0.48);
    const curtain = mesh(curtainGeo, water, x, 1.05, z + 0.15);
    curtain.rotation.y = -Math.atan(0.36 * x);
    const river = mesh(riverGeo, topWater, x, 2.03, z - 0.38);
    river.rotation.y = curtain.rotation.y;
  }
  // A forested rim surrounds the falls, leaving the water and basin legible.
  const canopyGeo = geometry(new THREE.DodecahedronGeometry(1, 0));
  const foliage = material(0xffffff);
  const trees = new THREE.InstancedMesh(canopyGeo, foliage, 56);
  const trunks = new THREE.InstancedMesh(
    geometry(new THREE.CylinderGeometry(0.035, 0.06, 0.55, 5)),
    material(0x5b7052),
    56,
  );
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < 56; i++) {
    const side = i < 36;
    const x = side ? ((i % 18) - 8.5) * 0.32 : (i % 2 ? -1 : 1) * (2.6 + Math.sin(i * 2.7) * 0.25);
    const z = side ? -1.95 + 0.13 * x * x - Math.floor(i / 18) * 0.33 : 0.2 + (i % 10) * 0.18;
    const y = side ? 2.05 : 0.18;
    const size = 0.23 + (Math.sin(i * 17.31) + 1) * 0.11;
    if (!side) {
      const island = mesh(cliffGeo, moss, x, -0.02, z);
      island.scale.set(0.49, 0.36, 0.46);
    }
    dummy.position.set(x, y + 0.3, z);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = y + 0.65;
    dummy.scale.set(size * 1.15, size * 1.4, size);
    dummy.updateMatrix();
    trees.setMatrixAt(i, dummy.matrix);
    color.setHex([0x245d46, 0x407954, 0x54825b, 0x779461][i % 4]);
    trees.setColorAt(i, color);
  }
  world.add(trunks, trees);
  const sunDisc = mesh(
    geometry(new THREE.SphereGeometry(0.48, 24, 16)),
    material(0xedd38b),
    -2,
    3.2,
    -2.4,
  );
  sunDisc.scale.z = 0.45;

  const rippleMaterial = new THREE.MeshBasicMaterial({
    color: 0xe8f5e8,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.add(rippleMaterial);
  const ringGeo = geometry(new THREE.RingGeometry(0.8, 0.813, 64));
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const ring = mesh(
      ringGeo,
      rippleMaterial,
      Math.sin(i * 2) * 1.3,
      0.012 + i * 0.002,
      0.65 + (i % 3) * 0.25,
    );
    ring.rotation.x = -Math.PI / 2;
    rings.push(ring);
  }
  const mistGeo = geometry(new THREE.BufferGeometry());
  const positions = new Float32Array(70 * 3);
  for (let i = 0; i < 70; i++) {
    positions[i * 3] = Math.sin(i * 8.71) * 2.4;
    positions[i * 3 + 1] = 0.1 + (i % 9) * 0.055;
    positions[i * 3 + 2] = -0.7 + 0.18 * positions[i * 3] ** 2 + (i % 4) * 0.18;
  }
  mistGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mistMat = new THREE.PointsMaterial({
    color: 0xf6fff2,
    size: 0.055,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  materials.add(mistMat);
  const mist = new THREE.Points(mistGeo, mistMat);
  world.add(mist);

  let playing = true,
    inView = true,
    disposed = false,
    close = false;
  let lastFrame = 0,
    elapsed = 0,
    yaw = -0.12,
    targetYaw = -0.12;
  const render = (timestamp: number) => {
    if (disposed) return;
    if (timestamp && timestamp - lastFrame < 1000 / 30) return;
    const delta = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0;
    lastFrame = timestamp;
    if (playing) elapsed += delta;
    water.uniforms.time.value = elapsed;
    yaw += (targetYaw - yaw) * 0.07;
    world.rotation.y = yaw;
    camera.zoom += ((close ? 1.22 : 1) - camera.zoom) * 0.065;
    camera.updateProjectionMatrix();
    rings.forEach((ring, i) => {
      const scale = 0.45 + ((elapsed * 0.15 + i * 0.21) % 1) * 1.7;
      ring.scale.set(scale, scale * 0.65, 1);
    });
    mist.position.y = Math.sin(elapsed * 0.8) * 0.07;
    renderer.render(scene, camera);
  };
  const sync = () => {
    if (disposed) return;
    lastFrame = 0;
    renderer.setAnimationLoop(playing && inView && !document.hidden ? render : null);
    if (inView && !document.hidden) render(0);
  };
  const resize = new ResizeObserver(() => {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height || disposed) return;
    const aspect = width / height;
    const vertical = aspect < 1 ? 8.1 / aspect : 8.1;
    camera.left = (-vertical * aspect) / 2;
    camera.right = (vertical * aspect) / 2;
    camera.top = vertical / 2;
    camera.bottom = -vertical / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render(0);
  });
  resize.observe(host);
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  });
  observer.observe(host);
  const pointer = (event: PointerEvent) => {
    if (!playing || event.pointerType !== 'mouse') return;
    const bounds = host.getBoundingClientRect();
    targetYaw = -0.12 + ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.3;
  };
  const leave = () => {
    targetYaw = -0.12;
  };
  const lost = (event: Event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    onLost();
  };
  host.addEventListener('pointermove', pointer);
  host.addEventListener('pointerleave', leave);
  renderer.domElement.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', sync);
  sync();
  return {
    setPlaying(value) {
      playing = value;
      sync();
    },
    setClose(value) {
      close = value;
      if (!playing) {
        camera.zoom = close ? 1.22 : 1;
        camera.updateProjectionMatrix();
        render(0);
      }
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      resize.disconnect();
      observer.disconnect();
      host.removeEventListener('pointermove', pointer);
      host.removeEventListener('pointerleave', leave);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      document.removeEventListener('visibilitychange', sync);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      trees.dispose();
      trunks.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
