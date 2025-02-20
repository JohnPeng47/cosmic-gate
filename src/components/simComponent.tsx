import React from 'react';
import * as THREE from 'three';
import NBodySimulation from './NbodySim';
import { SimBody } from '../types/simBody';
import PROJECTS from './bodies';

const SimComponent: React.FC = () => {
  // Create a central body (Sun) …
  const centralBody: SimBody = {
    name: 'Sun',
    mass: 100,
    radius: 3,
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    color: 0xffff00,
    project: PROJECTS[0],
  };

  // … and a few orbiting planets.
  const planets: SimBody[] = [];
  const G = 2; // gravitational constant (used for velocity calculation)
  for (let i = 1; i < PROJECTS.length; i++) {
    const project = PROJECTS[i];
    const angle = (i / 5) * Math.PI * 2;
    const distance = 15 + i * 3;
    const posX = Math.cos(angle) * distance;
    const posZ = Math.sin(angle) * distance;
    const speed = Math.sqrt((G * centralBody.mass) / distance);
    const velX = -Math.sin(angle) * speed;
    const velZ = Math.cos(angle) * speed;
    
    planets.push({
      name: `${project.name}`,
      project: project,
      mass: 1 + Math.random() * 2,
      radius: 1,
      position: new THREE.Vector3(posX, 0, posZ),
      velocity: new THREE.Vector3(velX, 0, velZ),
      color: 0xffffff,
    });
  }

  const bodies: SimBody[] = [centralBody, ...planets];

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <NBodySimulation bodies={bodies} />
    </div>
  );
};

export default SimComponent;
