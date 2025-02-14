import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
// @ts-expect-error - OrbitControls is not defined in the types
import { OrbitControls } from './OrbitControls.js';
import { SimBody } from '../types/simBody';
import { useNBodyStore } from '../store/nBodyStore';

interface NBodySimulationProps {
  bodies: SimBody[];
}

interface SimulationBody extends SimBody {
  mesh: THREE.Mesh;
  haloMaterial: THREE.ShaderMaterial;
}

const NBodySimulation: React.FC<NBodySimulationProps> = ({ bodies }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nameDisplayRef = useRef<HTMLDivElement>(null);
  const cameraDisplayRef = useRef<HTMLDivElement>(null);

  const translateCoordinates = (
    x: number,
    y: number,
    rect: DOMRect
  ) => {
    // Get current scroll position
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    
    return {
      x: x - rect.left + scrollX,  // Add scrollX to account for horizontal scroll
      y: y - rect.top + scrollY    // Add scrollY to account for vertical scroll
    };
  }

  useEffect(() => {
    // Set up scene, camera, and renderer.
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    camera.position.set(0, 50, 50);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current?.appendChild(renderer.domElement);
    // get bbox of canvas
    const rect = renderer.domElement.getBoundingClientRect();

    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const nameDisplay = nameDisplayRef.current;
    const cameraDisplay = cameraDisplayRef.current;

    // Simulation parameters.
    const G = 2;
    const dt = 0.01;
    const simulationBodies: SimulationBody[] = [];

    // Create a text texture for labels.
    const createTextTexture = (text: string): THREE.CanvasTexture => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      canvas.width = 256;
      canvas.height = 64;
      context.fillStyle = "rgba(0, 0, 0, 0)";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = "bold 32px Arial";
      context.fillStyle = "white";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    };

    // Create a simulation body from a SimBody.
    const createBody = (body: SimBody): SimulationBody => {
      const { position, radius, color, name } = body;
      // Main sphere.
      const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
      });
      const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphereMesh.position.copy(position);

      // Halo effect.
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
      sphereMesh.add(haloMesh);

      // Label using a sprite.
      const textSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createTextTexture(name),
          sizeAttenuation: false,
          depthTest: false,
        })
      );
      textSprite.position.y = radius * 2;
      textSprite.scale.set(0.05, 0.05, 1);
      sphereMesh.add(textSprite);

      scene.add(sphereMesh);

      return {
        ...body,
        mesh: sphereMesh,
        haloMaterial,
      };
    };

    // Create simulation bodies from the component props.
    simulationBodies.push(...bodies.map(createBody));

    // Physics update.
    const updatePhysics = () => {
      for (let i = 0; i < simulationBodies.length; i++) {
        const bodyA = simulationBodies[i];
        const netForce = new THREE.Vector3();

        for (let j = 0; j < simulationBodies.length; j++) {
          if (i === j) continue;
          const bodyB = simulationBodies[j];
          const direction = new THREE.Vector3().subVectors(bodyB.position, bodyA.position);
          const distanceSq = direction.x * direction.x + direction.z * direction.z;
          const distance = Math.sqrt(distanceSq) + 0.1;
          direction.normalize();
          const forceMagnitude = (G * bodyA.mass * bodyB.mass) / (distance * distance);
          netForce.add(direction.multiplyScalar(forceMagnitude));
        }
        const acceleration = netForce.divideScalar(bodyA.mass);
        bodyA.velocity.add(acceleration.multiplyScalar(dt));
      }

      simulationBodies.forEach((body) => {
        body.position.add(body.velocity.clone().multiplyScalar(dt));
        body.mesh.position.set(body.position.x, 0, body.position.z);
      });
    };

    // Camera transition variables.
    let isAnimationPaused = false;
    let originalCameraPosition: THREE.Vector3 | null = null;
    let originalCameraTarget: THREE.Vector3 | null = null;
    let isTransitioning = false;
    let transitionStartTime = 0;
    const TRANSITION_DURATION = 1000; // in milliseconds
    let targetCameraPosition = new THREE.Vector3();
    let targetCameraTarget = new THREE.Vector3();

    const lerpVector3 = (start: THREE.Vector3, end: THREE.Vector3, alpha: number) =>
      new THREE.Vector3(
        start.x + (end.x - start.x) * alpha,
        start.y + (end.y - start.y) * alpha,
        start.z + (end.z - start.z) * alpha
      );

    const updateCameraTransition = (currentTime: number) => {
      if (!isTransitioning || !originalCameraPosition || !originalCameraTarget) return;
      const elapsed = currentTime - transitionStartTime;
      const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
      const alpha = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      if (progress >= 1) {
        isTransitioning = false;
      }
      const newPosition = lerpVector3(originalCameraPosition, targetCameraPosition, alpha);
      const newTarget = lerpVector3(originalCameraTarget, targetCameraTarget, alpha);
      camera.position.copy(newPosition);
      controls.target.copy(newTarget);
      controls.update();
    };

    // Use the zustand store to update zoom events.
    const { setZoomedInBody } = useNBodyStore.getState();

    const zoomToSphere = (body: SimulationBody) => {
      isAnimationPaused = true;
      isTransitioning = true;
      transitionStartTime = performance.now();
      originalCameraPosition = camera.position.clone();
      originalCameraTarget = controls.target.clone();

      const SCALE = 4;
      const offset = new THREE.Vector3(SCALE * 6.11, SCALE * -1.33, SCALE * 7.89);
      targetCameraTarget = body.position.clone().add(offset);

      const offsetDir = offset.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const perpendicular = new THREE.Vector3().crossVectors(offsetDir, up).normalize();
      const cameraDistance = offset.length();
      targetCameraPosition = body.position.clone().add(perpendicular.multiplyScalar(cameraDistance));

      // Reduce opacity for other bodies.
      simulationBodies.forEach((otherBody) => {
        if (otherBody.name !== body.name) {
          otherBody.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              if ((child.material as THREE.MeshBasicMaterial).type === "MeshBasicMaterial") {
                (child.material as THREE.MeshBasicMaterial).opacity = 0.1;
              } else if ('uniforms' in child.material && child.material.uniforms.haloOpacity) {
                child.material.uniforms.haloOpacity.value = 0.5;
              }
            }
          });
        }
      });

      // Update the zustand store with the zoomed–in body’s name and coordinates.
      setZoomedInBody(body.name, { x: body.position.x, y: body.position.y, z: body.position.z });
    };

    const resetView = () => {
      if (!originalCameraPosition || !originalCameraTarget) return;
      isTransitioning = true;
      transitionStartTime = performance.now();
      targetCameraPosition = originalCameraPosition;
      targetCameraTarget = originalCameraTarget;
      originalCameraPosition = camera.position.clone();
      originalCameraTarget = controls.target.clone();
      simulationBodies.forEach((body) => {
        body.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            if ((child.material as THREE.MeshBasicMaterial).type === "MeshBasicMaterial") {
              (child.material as THREE.MeshBasicMaterial).opacity = 0.7;
            } else if ('uniforms' in child.material && child.material.uniforms.haloOpacity) {
              child.material.uniforms.haloOpacity.value = 0.5;
            }
          }
        });
      });
      isAnimationPaused = false;
      // Optionally clear the zoomed–in body.
      setZoomedInBody("", { x: 0, y: 0, z: 0 });
    };

    const onMouseMove = (event: MouseEvent) => {
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
        while (mesh.parent && mesh.parent.type !== "Scene") {
          mesh = mesh.parent;
        }
        const hoveredBody = simulationBodies.find((body) => body.mesh === mesh);
        if (hoveredBody && nameDisplay) {
          hoveredBody.haloMaterial.uniforms.isHovered.value = 1.0;
          nameDisplay.innerText = hoveredBody.name;
        }
      } else {
        if (nameDisplay) {
          nameDisplay.innerText = "";
        }
      }
    };

    const onClick = (event: MouseEvent) => {
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
        while (mesh.parent && mesh.parent.type !== "Scene") {
          mesh = mesh.parent;
        }
        const clickedBody = simulationBodies.find((body) => body.mesh === mesh);
        console.log("CLicked: ", clickedBody);
        if (clickedBody) {
          zoomToSphere(clickedBody);
        }
      } else if (isAnimationPaused) {
        resetView();
      }
    };

    const updateCameraDisplay = () => {
      if (cameraDisplay) {
        const pos = camera.position;
        cameraDisplay.innerText = `Camera Position:
X: ${pos.x.toFixed(2)}
Y: ${pos.y.toFixed(2)}
Z: ${pos.z.toFixed(2)}`;
      }
    };

    let animationFrameId: number;
    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);
      if (isTransitioning) {
        updateCameraTransition(currentTime);
      }
      if (!isAnimationPaused) {
        updatePhysics();
      }
      updateCameraDisplay();
      controls.update();
      renderer.render(scene, camera);
    };
    animationFrameId = requestAnimationFrame(animate);

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("mousemove", onMouseMove, false);
    window.addEventListener("click", onClick, false);
    window.addEventListener("resize", onWindowResize, false);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("resize", onWindowResize);
        //   cancelAnimationFrame(animationFrameId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [bodies]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000",
      }}
    >
      <div
        ref={nameDisplayRef}
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          color: "white",
          fontFamily: "Arial, sans-serif",
          pointerEvents: "none",
          background: "rgba(0, 0, 0, 0.5)",
          padding: "5px 10px",
          borderRadius: "5px",
        }}
      ></div>
      <div
        ref={cameraDisplayRef}
        style={{
          position: "absolute",
          top: 40,
          left: 10,
          color: "white",
          fontFamily: "Arial, sans-serif",
          pointerEvents: "none",
          background: "rgba(0, 0, 0, 0.5)",
          padding: "5px 10px",
          borderRadius: "5px",
        }}
      ></div>
    </div>
  );
};

export default NBodySimulation;
