import * as THREE from 'three';
import { Project } from '../components/bodies';

export interface SimBody {
  name: string;
  project: Project | null;
  mass: number;
  radius: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: number;
}