import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const wrap = document.getElementById("canvas-wrap");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 5.4, 19);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
wrap.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.045;
controls.minDistance = 12;
controls.maxDistance = 34;
controls.maxPolarAngle = Math.PI * 0.78;
controls.target.set(0.4, 4.4, 0);
controls.autoRotate = false;
controls.autoRotateSpeed = 0.32;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.06, 0.4, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight(0xd9d9ff, 0x48243f, 1.05));
const keyLight = new THREE.DirectionalLight(0xffe4d2, 1.35);
keyLight.position.set(-5, 12, 10);
scene.add(keyLight);
const pinkLight = new THREE.PointLight(0xff72bd, 18, 25, 2);
pinkLight.position.set(2, 6, 3);
scene.add(pinkLight);

function makeSky() {
  const geometry = new THREE.SphereGeometry(80, 32, 24);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x26102b) },
      horizonColor: { value: new THREE.Color(0x76445f) },
    },
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPosition;
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      void main() {
        float height = normalize(vPosition).y * 0.5 + 0.5;
        vec3 color = mix(horizonColor, topColor, smoothstep(0.12, 0.9, height));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(geometry, material));
}

makeSky();

const bouquet = new THREE.Group();
bouquet.position.x = 2.5;
scene.add(bouquet);

function fitBouquetToViewport() {
  const compact = window.innerWidth <= 600;
  bouquet.position.x = compact ? 0.35 : 2.5;
  bouquet.scale.setScalar(compact ? 0.88 : 1.32);
  bouquet.userData.baseY = compact ? 0.45 : 0;
  camera.position.z = compact ? 20.5 : 19;
  controls.target.x = compact ? 0.1 : 0.4;
}

const flowerColors = [0xff3478, 0xff648e, 0xffbd38, 0x9e62e8, 0xffe39a, 0xe83f77, 0xff783c];
const flowerPositions = [
  [-2.55, 6.55, 0.3], [-1.7, 7.15, -0.5], [-0.85, 6.35, 0.6],
  [0, 7.5, -0.55], [0.9, 6.5, 0.6], [1.8, 7.1, -0.45], [2.6, 6.4, 0.4],
];

const particlePositions = [];
const particleColors = [];
const paperPositions = [];
const paperColors = [];
const addParticle = (x, y, z, color) => {
  particlePositions.push(x, y, z);
  particleColors.push(color.r, color.g, color.b);
};
const addPaperParticle = (x, y, z, color) => {
  paperPositions.push(x, y, z);
  paperColors.push(color.r, color.g, color.b);
};

flowerPositions.forEach(([flowerX, flowerY, flowerZ], flowerIndex) => {
  const base = new THREE.Vector3(flowerX * 0.12, 1.55, flowerZ * 0.12);
  const head = new THREE.Vector3(flowerX * 0.88, flowerY - 0.25, flowerZ - 0.1);
  const petalColor = new THREE.Color(flowerColors[flowerIndex]);

  for (let i = 0; i < 560; i++) {
    const along = Math.random();
    const center = base.clone().lerp(head, along);
    const spread = 0.035 + along * 0.045;
    const shade = 0.75 + Math.random() * 0.5;
    const green = new THREE.Color(0x56b879).multiplyScalar(shade);
    addParticle(
      center.x + (Math.random() - 0.5) * spread,
      center.y + (Math.random() - 0.5) * spread,
      center.z + (Math.random() - 0.5) * spread,
      green
    );
  }

  for (let leafIndex = 0; leafIndex < 2; leafIndex++) {
    const anchor = base.clone().lerp(head, 0.42 + leafIndex * 0.16);
    const side = leafIndex ? 1 : -1;
    for (let i = 0; i < 220; i++) {
      const along = Math.random();
      const across = (Math.random() - 0.5) * Math.sin(along * Math.PI) * 0.28;
      addParticle(
        anchor.x + side * along * 0.72,
        anchor.y - along * 0.16 + across,
        anchor.z + 0.12 + (Math.random() - 0.5) * 0.12,
        new THREE.Color(Math.random() > 0.5 ? 0x7be39b : 0x3b9d69)
      );
    }
  }

  const petalLayers = [
    { count: 12, samples: 220, length: 1.02, width: 0.52, z: 0 },
    { count: 10, samples: 160, length: 0.78, width: 0.42, z: 0.16 },
    { count: 8, samples: 110, length: 0.54, width: 0.31, z: 0.3 },
  ];
  petalLayers.forEach((layer, layerIndex) => {
    for (let petalIndex = 0; petalIndex < layer.count; petalIndex++) {
      const angle = (petalIndex / layer.count) * Math.PI * 2 + layerIndex * 0.18;
      const petalDirection = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
      const acrossDirection = new THREE.Vector2(-petalDirection.y, petalDirection.x);
      for (let sample = 0; sample < layer.samples; sample++) {
        const along = Math.random();
        const across = (Math.random() - 0.5) * Math.sin(along * Math.PI) * layer.width;
        const distance = 0.06 + along * layer.length;
        const colorMix = 0.02 + along * 0.04 + Math.random() * 0.05;
        const color = petalColor.clone().lerp(
          new THREE.Color(layerIndex === 0 ? 0xff8fb9 : 0xffe2c8),
          colorMix
        );
        addParticle(
          flowerX + petalDirection.x * distance + acrossDirection.x * across,
          flowerY + petalDirection.y * distance + acrossDirection.y * across,
          flowerZ + layer.z + (Math.random() - 0.5) * 0.11,
          color
        );
      }
    }
  });

  for (let i = 0; i < 125; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.17;
    addParticle(
      flowerX + Math.cos(angle) * radius,
      flowerY + Math.sin(angle) * radius,
      flowerZ + 0.34 + Math.random() * 0.08,
      new THREE.Color(Math.random() > 0.3 ? 0xffe28a : 0xfff5cb)
    );
  }
});

const paperPalette = [0xf3a9c5, 0xffc9d7, 0xe98fb0, 0xffe4e8];
for (let i = 0; i < 14500; i++) {
  const height = Math.random();
  const angle = Math.random() * Math.PI * 2;
  const radius = 0.14 + height * 2.42 + (Math.random() - 0.5) * 0.07;
  const color = new THREE.Color(paperPalette[Math.floor(Math.random() * paperPalette.length)]);
  addPaperParticle(
    Math.cos(angle) * radius,
    0.16 + height * 4.02 + (Math.random() - 0.5) * 0.045,
    Math.sin(angle) * radius,
    color
  );
}

function addPaperPanel(points, count, color, depth) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 2);
  const positions = geometry.attributes.position;
  const triangles = [];
  let totalArea = 0;
  for (let i = 0; i < positions.count; i += 3) {
    const a = new THREE.Vector2(positions.getX(i), positions.getY(i));
    const b = new THREE.Vector2(positions.getX(i + 1), positions.getY(i + 1));
    const c = new THREE.Vector2(positions.getX(i + 2), positions.getY(i + 2));
    const area = Math.abs(b.clone().sub(a).cross(c.clone().sub(a))) * 0.5;
    totalArea += area;
    triangles.push({ a, b, c, area: totalArea });
  }

  for (let i = 0; i < count; i++) {
    const targetArea = Math.random() * totalArea;
    const triangle = triangles.find((entry) => entry.area >= targetArea) ?? triangles[triangles.length - 1];
    const root = Math.sqrt(Math.random());
    const second = Math.random();
    const point = triangle.a.clone().multiplyScalar(1 - root)
      .add(triangle.b.clone().multiplyScalar(root * (1 - second)))
      .add(triangle.c.clone().multiplyScalar(root * second));
    const shade = 0.84 + Math.random() * 0.28;
    addPaperParticle(point.x, point.y, depth + (Math.random() - 0.5) * 0.035, color.clone().multiplyScalar(shade));
  }
  geometry.dispose();
}

addPaperPanel([[-2.45, 4.2], [2.45, 4.2], [1.62, 3.08], [0.38, 0.34], [0, 0.18], [-0.38, 0.34], [-1.62, 3.08]], 4600, new THREE.Color(0xf5b7cd), 1.42);
addPaperPanel([[-2.45, 4.22], [-0.7, 3.35], [-0.16, 0.28], [-1.55, 3.25]], 1500, new THREE.Color(0xffc9d8), 1.37);
addPaperPanel([[2.45, 4.22], [0.7, 3.35], [0.16, 0.28], [1.55, 3.25]], 1500, new THREE.Color(0xe9a8c0), 1.38);

function addPaperLine(start, end, count, color, thickness = 0.03) {
  for (let i = 0; i < count; i++) {
    const along = Math.random();
    const spread = (Math.random() - 0.5) * thickness;
    addPaperParticle(
      start[0] + (end[0] - start[0]) * along + spread,
      start[1] + (end[1] - start[1]) * along + spread,
      start[2] + (end[2] - start[2]) * along,
      color
    );
  }
}

const creaseColor = new THREE.Color(0xffe7ed);
for (const side of [-1, 1]) {
  addPaperLine([side * 2.08, 3.88, 1.48], [side * 1.32, 3.2, 1.48], 420, creaseColor, 0.045);
  addPaperLine([side * 1.32, 3.2, 1.48], [side * 0.3, 0.48, 1.48], 620, creaseColor, 0.045);
}

const ribbonGold = new THREE.Color(0xffd36e);
for (let i = 0; i < 2400; i++) {
  const around = Math.random() * Math.PI * 2;
  const across = Math.random() * Math.PI * 2;
  const tube = 0.075 * Math.cos(across);
  addPaperParticle(
    (0.82 + tube) * Math.cos(around),
    1.3 + 0.075 * Math.sin(across),
    (0.82 + tube) * Math.sin(around) + 0.92,
    ribbonGold.clone().lerp(new THREE.Color(0xfff0ae), Math.random() * 0.3)
  );
}

for (const side of [-1, 1]) {
  for (let i = 0; i < 850; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.29 + Math.random() * 0.045;
    addPaperParticle(
      side * 0.42 + Math.cos(angle) * radius,
      1.3 + Math.sin(angle) * radius * 0.58,
      1.76 + Math.random() * 0.035,
      ribbonGold
    );
  }
}

for (let i = 0; i < 520; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * 0.14;
  addPaperParticle(
    Math.cos(angle) * radius,
    1.3 + Math.sin(angle) * radius,
    1.9 + (Math.random() - 0.5) * 0.05,
    ribbonGold
  );
}

const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(particleColors, 3));
const particleMaterial = new THREE.PointsMaterial({
  size: 0.09,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  blending: THREE.NormalBlending,
  depthWrite: false,
  sizeAttenuation: true,
});
const particleBouquet = new THREE.Points(particleGeometry, particleMaterial);
bouquet.add(particleBouquet);

const paperGeometry = new THREE.BufferGeometry();
paperGeometry.setAttribute("position", new THREE.Float32BufferAttribute(paperPositions, 3));
paperGeometry.setAttribute("color", new THREE.Float32BufferAttribute(paperColors, 3));
const paperMaterial = new THREE.PointsMaterial({
  size: 0.052,
  vertexColors: true,
  transparent: true,
  opacity: 0.92,
  depthWrite: false,
  sizeAttenuation: true,
});
const paperCloud = new THREE.Points(paperGeometry, paperMaterial);
paperCloud.renderOrder = 1;
bouquet.add(paperCloud);

const heartShape = new THREE.Shape();
heartShape.moveTo(0, -0.34);
heartShape.bezierCurveTo(-0.3, -0.08, -0.67, 0.18, -0.6, 0.57);
heartShape.bezierCurveTo(-0.53, 0.94, -0.13, 0.99, 0, 0.65);
heartShape.bezierCurveTo(0.13, 0.99, 0.53, 0.94, 0.6, 0.57);
heartShape.bezierCurveTo(0.67, 0.18, 0.3, -0.08, 0, -0.34);
heartShape.closePath();
const heartGeometry = new THREE.ExtrudeGeometry(heartShape, {
  depth: 0.16,
  bevelEnabled: true,
  bevelSegments: 3,
  bevelSize: 0.045,
  bevelThickness: 0.045,
  curveSegments: 12,
});
heartGeometry.translate(0, -0.3, -0.08);
const heartMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  vertexColors: false,
  roughness: 0.32,
  metalness: 0.05,
  clearcoat: 0.6,
  emissive: 0x16020a,
  emissiveIntensity: 0.08,
});
const heartCount = 56;
const orbitHeartCount = 14;
const fallingHeartCount = heartCount - orbitHeartCount;
const hearts = new THREE.InstancedMesh(heartGeometry, heartMaterial, heartCount);
hearts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
hearts.frustumCulled = false;
const heartPalette = [0xff527f, 0xff7897, 0xe85079, 0xffa7bd, 0xd38bff, 0xffccda];
const heartStates = Array.from({ length: heartCount }, (_, index) => ({
  orbiting: index >= fallingHeartCount,
  x: bouquet.position.x + (Math.random() - 0.5) * (window.innerWidth <= 600 ? 11 : 23),
  y: -5 + Math.random() * 17,
  z: -3 + Math.random() * 8,
  speed: 0.7 + Math.random() * 1.1,
  scale: 0.2 + Math.random() * 0.34,
  angle: Math.random() * Math.PI * 2,
  orbitRadius: 3.4 + Math.random() * 2.2,
  phase: Math.random() * Math.PI * 2,
  rotation: Math.random() * Math.PI * 2,
}));
function fitFallingHearts() {
  const halfWidth = window.innerWidth <= 600 ? 5.5 : 11.5;
  heartStates.forEach((heart) => {
    if (!heart.orbiting) heart.x = bouquet.position.x + (Math.random() - 0.5) * halfWidth * 2;
  });
}

const heartColor = new THREE.Color();
heartStates.forEach((heart, index) => {
  hearts.setColorAt(index, heartColor.setHex(heartPalette[index % heartPalette.length]));
});
hearts.instanceColor.needsUpdate = true;
scene.add(hearts);

const glow = new THREE.PointLight(0xffa4cc, 10, 18, 2);
glow.position.set(0.2, 5.8, 1.2);
scene.add(glow);

const letterTrigger = document.getElementById("letter-trigger");
const letterDialog = document.getElementById("love-letter");
const letterPaper = letterDialog.querySelector(".letter-paper");
const letterEffects = letterDialog.querySelector(".letter-effects");

function scatterLetterPetals() {
  letterEffects.replaceChildren();
  for (let i = 0; i < 28; i++) {
    const particle = document.createElement("span");
    const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.3;
    const distance = 100 + Math.random() * 180;
    particle.className = `letter-particle${i % 4 === 0 ? " is-star" : ""}`;
    particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--spin", `${Math.random() * 300 - 150}deg`);
    particle.style.setProperty("--delay", `${Math.random() * 150}ms`);
    letterEffects.appendChild(particle);
  }
}

letterTrigger.addEventListener("click", () => {
  letterDialog.showModal();
  letterDialog.classList.remove("is-opening");
  void letterPaper.offsetWidth;
  letterDialog.classList.add("is-opening");
  letterPaper.addEventListener("animationend", () => {
    letterDialog.classList.remove("is-opening");
  }, { once: true });
  scatterLetterPetals();
});

letterDialog.querySelector(".letter-close").addEventListener("click", () => {
  letterDialog.close();
});

letterDialog.addEventListener("click", (event) => {
  if (event.target === letterDialog) letterDialog.close();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && letterDialog.open) {
    event.preventDefault();
    letterDialog.close();
  }
});

letterDialog.addEventListener("close", () => {
  letterEffects.replaceChildren();
  letterTrigger.focus();
});

const clock = new THREE.Clock();
let previousTime = 0;
const heartTransform = new THREE.Object3D();
function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  const delta = Math.min(time - previousTime, 0.05);
  previousTime = time;
  bouquet.position.y = bouquet.userData.baseY + Math.sin(time * 0.8) * 0.1;
  bouquet.rotation.z = Math.sin(time * 0.55) * 0.025;
  particleBouquet.rotation.y = Math.sin(time * 0.45) * 0.018;
  particleMaterial.opacity = 0.84 + Math.sin(time * 1.4) * 0.04;
  glow.intensity = 8 + Math.sin(time * 1.7) * 2;
  heartStates.forEach((heart, index) => {
    if (heart.orbiting) {
      heart.angle += delta * heart.speed * 0.32;
      heartTransform.position.set(
        bouquet.position.x + Math.cos(heart.angle) * heart.orbitRadius,
        4.8 + Math.sin(heart.angle * 1.35 + heart.phase) * 2.3,
        1.2 + Math.sin(heart.angle + heart.phase) * 2.2
      );
    } else {
      heart.y -= delta * heart.speed;
      heart.x += Math.sin(time * 0.8 + heart.phase) * delta * 0.28;
      if (heart.y < -6) {
        heart.y = 11 + Math.random() * 5;
        heart.x = bouquet.position.x + (Math.random() - 0.5) * (window.innerWidth <= 600 ? 11 : 23);
        heart.z = -3 + Math.random() * 8;
      }
      heartTransform.position.set(heart.x, heart.y, heart.z);
    }
    heartTransform.rotation.set(
      Math.sin(time + heart.phase) * 0.16,
      Math.cos(time * 0.7 + heart.phase) * 0.24,
      heart.rotation + Math.sin(time * 0.8 + heart.phase) * 0.18
    );
    const scale = heart.scale * (heart.orbiting ? 0.8 : 1);
    heartTransform.scale.setScalar(scale);
    heartTransform.updateMatrix();
    hearts.setMatrixAt(index, heartTransform.matrix);
  });
  hearts.instanceMatrix.needsUpdate = true;
  controls.update();
  composer.render();
}

window.addEventListener("resize", () => {
  fitBouquetToViewport();
  fitFallingHearts();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.setSize(window.innerWidth, window.innerHeight);
});

fitBouquetToViewport();
fitFallingHearts();
animate();
