import { create } from 'zustand';
import { SimBody } from '../types/simBody'; 

export type ZoomedInBody = SimBody & {
  mouseClick: {
    x: number;
    y: number;
  };
};

type NBodyStore = {
  zoomedInBody: ZoomedInBody | null;
  setZoomedInBody: (body: ZoomedInBody | null) => void;
};

export const useNBodyStore = create<NBodyStore>((set) => ({
  zoomedInBody: null,
  setZoomedInBody: (body) => set({ zoomedInBody: body }),
}));