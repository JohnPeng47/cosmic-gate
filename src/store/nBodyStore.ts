import { create } from 'zustand';

// First, define your types
type ZoomedInBody = {
  name: string;
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
};

type NBodyStore = {
  zoomedInBody: ZoomedInBody | null;
  setZoomedInBody: (bodyName: string, coordinates: { x: number; y: number; z: number }) => void;
  subscribeToZoomedInBody: (callback: (zoomedInBody: ZoomedInBody | null) => void) => () => void;
};

// Then create the store with explicit typing
// @ts-expect-error - create is not defined in the types
export const useNBodyStore = create<NBodyStore>()((set) => ({
  zoomedInBody: null,
  setZoomedInBody: (bodyName, coordinates) =>
    set({ zoomedInBody: { name: bodyName, coordinates } }),
  subscribeToZoomedInBody: (callback) => {
    return useNBodyStore.subscribe(
      (state: NBodyStore) => state.zoomedInBody,
      callback
    );
  },
}));