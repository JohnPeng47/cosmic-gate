import { create } from 'zustand';

export type ZoomedInBody = {
  name: string;
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