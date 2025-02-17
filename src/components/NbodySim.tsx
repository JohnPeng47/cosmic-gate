import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
// @ts-expect-error - OrbitControls is not defined in the types
import { OrbitControls } from './OrbitControls.js';
import { SimBody } from '../types/simBody';
import { useNBodyStore } from '../store/nBodyStore';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

interface NBodySimulationProps {
  bodies: SimBody[];
}

interface SimulationBody extends SimBody {
  mesh: THREE.Mesh;
  textMesh: THREE.Mesh;
  haloMaterial: THREE.ShaderMaterial;
}

// Constants
const G = 2;
const dt = 0.01;
const TRANSITION_DURATION = 1000; // in milliseconds

/**
 * Helper: Translate browser coordinates to canvas coordinates
 */
function translateCoordinates(
  x: number,
  y: number,
  rect: DOMRect
) {
  // Get current scroll position
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;

  return {
    x: x - rect.left + scrollX,
    y: y - rect.top + scrollY,
  };
}

/**
 * Helper: Linear interpolation between two Vector3s (with a custom ease).
 */
function lerpVector3(
  start: THREE.Vector3,
  end: THREE.Vector3,
  alpha: number
) {
  return new THREE.Vector3(
    start.x + (end.x - start.x) * alpha,
    start.y + (end.y - start.y) * alpha,
    start.z + (end.z - start.z) * alpha
  );
}

/**
 * Initialization & animation of the 3D scene, camera, controls, physics, and events.
 * Returns a cleanup function to remove event listeners & dispose resources.
 */
async function initSimulation(
  container: HTMLDivElement | null,
  nameDisplay: HTMLDivElement | null,
  cameraDisplay: HTMLDivElement | null,
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>,
  bodies: SimBody[]
) {
  if (!container) return () => {};

  const scene = new THREE.Scene();

  // Setup camera
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 50, 50);
  camera.lookAt(0, 0, 0);

  // Load font asynchronously
  const fontLoader = new FontLoader();
  const loadedFont = await new Promise<Font>((resolve, reject) => {
    fontLoader.load(
      'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
      (font) => resolve(font),
      undefined,
      (error) => reject(error)
    );
  });

  // Setup renderer (if not already defined)
  if (!rendererRef.current) {
    rendererRef.current = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current.setPixelRatio(window.devicePixelRatio * 1.5);
    container.appendChild(rendererRef.current.domElement);
  }

  // Controls
  const controls = new OrbitControls(camera, rendererRef.current.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  // Raycaster
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Local references for transitions
  let isAnimationPaused = false;
  let isTransitioning = false;
  let transitionStartTime = 0;
  let originalCameraPosition: THREE.Vector3 | null = null;
  let originalCameraTarget: THREE.Vector3 | null = null;
  let targetCameraPosition = new THREE.Vector3();
  let targetCameraTarget = new THREE.Vector3();

  // Simulation bodies
  const simulationBodies: SimulationBody[] = [];
  const { setZoomedInBody } = useNBodyStore.getState();

  /**
   * Create a 3D body (mesh + halo + text) from SimBody data.
   */
  function createBody(body: SimBody): SimulationBody {
    const { position, radius, color, name } = body;

    // Sphere geometry & material
    const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
    });
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereMesh.position.copy(position);

    // Halo effect
    const haloGeometry = new THREE.SphereGeometry(radius * 2, 50, 50);
    const haloMaterial = new THREE.ShaderMaterial({
      uniforms: {
        haloColor: {
          value: new THREE.Vector3(
            ((color >> 16) & 255) / 255,
            ((color >> 8) & 255) / 255,
            (color & 255) / 255
          ),
        },
        haloOpacity: { value: 0.5 },
        haloIntensity: { value: 2.0 },
        isHovered: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vViewPosition;
        varying vec3 vNormal;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vNormal = normalMatrix * normal;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vViewPosition;
        varying vec3 vNormal;
        uniform vec3 haloColor;
        uniform float haloOpacity;
        uniform float haloIntensity;
        uniform float isHovered;
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          float rim = 1.0 - abs(dot(viewDir, normal));
          float intensity = pow(rim, haloIntensity);
          float finalOpacity = haloOpacity * (1.0 + isHovered * 0.5);
          gl_FragColor = vec4(haloColor, finalOpacity * intensity);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);

    // Text label
    const textGeometry = new TextGeometry(name, {
      font: loadedFont,
      size: radius * 0.5,
      depth: 0.1,
    });
    textGeometry.computeBoundingBox();
    let textWidth = 0;
    if (textGeometry.boundingBox) {
      textWidth =
        textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
    }
    const textMaterial = new THREE.MeshBasicMaterial({ color });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(0, radius * 2, 0);
    textMesh.geometry.translate(-textWidth / 2, 0, 0);

    // Combine mesh & text
    sphereMesh.add(textMesh);
    sphereMesh.add(haloMesh);
    scene.add(sphereMesh);

    return {
      ...body,
      mesh: sphereMesh,
      textMesh: textMesh,
      haloMaterial,
    };
  }

  /**
   * Update positions and velocities of bodies based on gravitational forces.
   */
  function updatePhysics() {
    for (let i = 0; i < simulationBodies.length; i++) {
      const bodyA = simulationBodies[i];
      const netForce = new THREE.Vector3();

      for (let j = 0; j < simulationBodies.length; j++) {
        if (i === j) continue;
        const bodyB = simulationBodies[j];
        const direction = new THREE.Vector3().subVectors(
          bodyB.position,
          bodyA.position
        );
        // Only 2D in x/z plane in the original code
        const distanceSq = direction.x * direction.x + direction.z * direction.z;
        const distance = Math.sqrt(distanceSq) + 0.1;
        direction.normalize();
        const forceMagnitude =
          (G * bodyA.mass * bodyB.mass) / (distance * distance);
        netForce.add(direction.multiplyScalar(forceMagnitude));
      }
      const acceleration = netForce.divideScalar(bodyA.mass);
      bodyA.velocity.add(acceleration.multiplyScalar(dt));
    }

    simulationBodies.forEach((body) => {
      body.position.add(body.velocity.clone().multiplyScalar(dt));
      body.mesh.position.set(body.position.x, 0, body.position.z);
    });
  }

  /**
   * Smoothly update the camera position/target during transitions.
   */
  function updateCameraTransition(currentTime: number) {
    if (!isTransitioning || !originalCameraPosition || !originalCameraTarget) return;
    const elapsed = currentTime - transitionStartTime;
    const progress = Math.min(elapsed / TRANSITION_DURATION, 1);

    // Simple ease in-out approach
    const alpha =
      progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

    if (progress >= 1) {
      isTransitioning = false;
    }

    const newPosition = lerpVector3(
      originalCameraPosition,
      targetCameraPosition,
      alpha
    );
    const newTarget = lerpVector3(
      originalCameraTarget,
      targetCameraTarget,
      alpha
    );

    camera.position.copy(newPosition);
    controls.target.copy(newTarget);
    controls.update();
  }

  function zoomToSphere(body: SimulationBody) {
    isAnimationPaused = true;
    isTransitioning = true;
    transitionStartTime = performance.now();
    originalCameraPosition = camera.position.clone();
    originalCameraTarget = controls.target.clone();

    // Arbitrary offset & camera distance
    const SCALE = 4;
    const offset = new THREE.Vector3(SCALE * 6.11, SCALE * -1.33, SCALE * 7.89);
    targetCameraTarget = body.position.clone().add(offset);

    const offsetDir = offset.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const perpendicular = new THREE.Vector3().crossVectors(offsetDir, up).normalize();
    const cameraDistance = offset.length();
    targetCameraPosition = body.position
      .clone()
      .add(perpendicular.multiplyScalar(cameraDistance));

    // Reduce opacity for other bodies
    simulationBodies.forEach((otherBody) => {
      if (otherBody.name !== body.name) {
        otherBody.mesh.visible = false;
      }
    });

    // Update the store with the zoomed–in body’s name and coordinates
    setZoomedInBody(body.name, {
      x: body.position.x,
      y: body.position.y,
      z: body.position.z,
    });
  }

  /**
   * Reset camera position/target and restore body opacities.
   */
  function resetView() {
    if (!originalCameraPosition || !originalCameraTarget) return;
    isTransitioning = true;
    transitionStartTime = performance.now();
    // Swap targets (so we can lerp back)
    targetCameraPosition = originalCameraPosition;
    targetCameraTarget = originalCameraTarget;
    originalCameraPosition = camera.position.clone();
    originalCameraTarget = controls.target.clone();

    simulationBodies.forEach((body) => {
      body.mesh.visible = true;
    });

    isAnimationPaused = false;
    // Clear the store's zoomed–in body if needed
    setZoomedInBody('', { x: 0, y: 0, z: 0 });
  }

  // Create bodies
  simulationBodies.push(...bodies.map(createBody));

  // Event handlers
  const rect = rendererRef.current.domElement.getBoundingClientRect();

  function onMouseMove(event: MouseEvent) {
    const { x, y } = translateCoordinates(event.clientX, event.clientY, rect);
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(
      simulationBodies.map((body) => body.mesh),
      true
    );
    simulationBodies.forEach((body) => {
      body.haloMaterial.uniforms.isHovered.value = 0.0;
    });
    if (intersects.length > 0) {
      let mesh: THREE.Object3D = intersects[0].object;
      while (mesh.parent && mesh.parent.type !== 'Scene') {
        mesh = mesh.parent;
      }
      const hoveredBody = simulationBodies.find((body) => body.mesh === mesh);
      if (hoveredBody && nameDisplay) {
        hoveredBody.haloMaterial.uniforms.isHovered.value = 1.0;
        nameDisplay.innerText = hoveredBody.name;
      }
    } else {
      if (nameDisplay) nameDisplay.innerText = '';
    }
  }

  function onClick(event: MouseEvent) {
    if (isTransitioning) return;
    const { x, y } = translateCoordinates(event.clientX, event.clientY, rect);
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(
      simulationBodies.map((body) => body.mesh),
      true
    );
    if (intersects.length > 0 && !isAnimationPaused) {
      let mesh: THREE.Object3D = intersects[0].object;
      while (mesh.parent && mesh.parent.type !== 'Scene') {
        mesh = mesh.parent;
      }
      const clickedBody = simulationBodies.find((body) => body.mesh === mesh);
      if (clickedBody) {
        console.log("Clicked body", clickedBody);
        zoomToSphere(clickedBody);
      }
    } else if (isAnimationPaused) {
      resetView();
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    rendererRef.current!.setSize(window.innerWidth, window.innerHeight);
  }

  function updateCameraDisplay() {
    if (!cameraDisplay) return;
    const pos = camera.position;
    cameraDisplay.innerText = `Camera Position:
  X: ${pos.x.toFixed(2)}
  Y: ${pos.y.toFixed(2)}
  Z: ${pos.z.toFixed(2)}`;
  }

  // Animation loop
  let animationFrameId: number;
  function animate(currentTime: number) {
    animationFrameId = requestAnimationFrame(animate);
    if (isTransitioning) {
      updateCameraTransition(currentTime);
    }
    if (!isAnimationPaused) {
      updatePhysics();
    }
    updateCameraDisplay();
    controls.update();
    rendererRef.current!.render(scene, camera);

    // Update all text meshes to face the camera on the y-axis only
    simulationBodies.forEach((body) => {
      body.textMesh.rotation.y = Math.atan2(
        camera.position.x - body.textMesh.position.x,
        camera.position.z - body.textMesh.position.z
      );
    });
  }
  animationFrameId = requestAnimationFrame(animate);

  // Add event listeners
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onClick);
  window.addEventListener('resize', onWindowResize);

  /**
   * Cleanup function removes listeners & disposes of the scene.
   */
  return () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('click', onClick);
    window.removeEventListener('resize', onWindowResize);
    cancelAnimationFrame(animationFrameId);

    // Remove renderer from DOM & dispose
    if (container && rendererRef.current?.domElement) {
      container.removeChild(rendererRef.current.domElement);
    }
    rendererRef.current?.dispose();
  };
}

const NBodySimulation: React.FC<NBodySimulationProps> = ({ bodies }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nameDisplayRef = useRef<HTMLDivElement>(null);
  const cameraDisplayRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    let cleanupFn: () => void;

    (async () => {
      cleanupFn = await initSimulation(
        containerRef.current,
        nameDisplayRef.current,
        cameraDisplayRef.current,
        rendererRef,
        bodies
      );
    })();

    // Cleanup
    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [bodies]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <div
        ref={nameDisplayRef}
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          pointerEvents: 'none',
          background: 'rgba(0, 0, 0, 0.5)',
          padding: '5px 10px',
          borderRadius: '5px',
        }}
      ></div>
      <div
        ref={cameraDisplayRef}
        style={{
          position: 'absolute',
          top: 40,
          left: 10,
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          pointerEvents: 'none',
          background: 'rgba(0, 0, 0, 0.5)',
          padding: '5px 10px',
          borderRadius: '5px',
        }}
      ></div>
    </div>
  );
};

export default NBodySimulation;
