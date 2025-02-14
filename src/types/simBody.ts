import * as THREE from 'three';

export interface SimBody {
  name: string;
  mass: number;
  radius: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: number;
}