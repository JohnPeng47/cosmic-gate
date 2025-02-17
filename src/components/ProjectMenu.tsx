import React, { useEffect, useRef, useState } from 'react';
import { useNBodyStore, ZoomedInBody, NBodyStore } from '../store/nBodyStore';

const BOX_WIDTH = '30%';
const BOX_HEIGHT = '30%';

/**
 * ProjectMenu does not return any JSX. Instead, it uses a DOM element
 * to dynamically draw the "mesh paragraph box" when a body is zoomed in.
 */
const ProjectMenu: React.FC = () => {
  // We'll keep a ref to the dynamically created DOM element so we can remove it easily.
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Local state for current zoomed-in body data (name, x, y).
  const [zoomedInBody, setZoomedInBody] = useState<ZoomedInBody | null>(null);

  // Subscribe to store updates once, on mount.
  useEffect(() => {
    const unsubscribe = useNBodyStore.subscribe(
      (state: NBodyStore) => {
        console.log("Body from store", state.zoomedInBody);
        setZoomedInBody(state.zoomedInBody);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    // If we already have a box in the DOM, remove it before we create/update a new one.
    if (boxRef.current) {
      document.body.removeChild(boxRef.current);
      boxRef.current = null;
    }

    // If there's no zoomedInBody, do nothing (i.e., remove the box).
    if (!zoomedInBody) {
      console.log("No zoomed in body");
      return;
    }

    console.log("Zoomed in body", zoomedInBody);
    // Otherwise, create a new box.
    const box = document.createElement('div');
    boxRef.current = box;

    // Basic styling for a “mesh-like” skeleton outline with white text.
    box.className = 'project-menu';
    box.style.position = 'absolute';
    box.style.width = BOX_WIDTH;
    box.style.height = BOX_HEIGHT;
    box.style.border = '2px solid lightgray';  // "mesh-like" outline
    box.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    box.style.color = 'white';
    box.style.padding = '10px';
    box.style.overflow = 'auto';
    box.style.pointerEvents = 'auto';          // allow interaction
    box.style.zIndex = '9999';                 // float above your canvas

    // Position the top-left corner at (zoomedInBody.x, zoomedInBody.y).
    // You can offset this if you want it to appear to the side or above the cursor.
    box.style.left = `${zoomedInBody.mouseClick.x}px`;
    box.style.top = `${zoomedInBody.mouseClick.y}px`;

    // Add some placeholder content about the zoomed body.
    box.innerHTML = `
      <h3>${zoomedInBody.name} Details</h3>
      <p>
        This is a paragraph about ${zoomedInBody.name} with a “mesh-like” box.
        You can put any content you like here: images, text, stats, etc.
      </p>
      <p>
        Mouse Coordinates: (x: ${zoomedInBody.mouseClick.x.toFixed(2)},
        y: ${zoomedInBody.mouseClick.y.toFixed(2)})
      </p>
    `;

    // Finally, attach the box to the body (or any other container).
    document.body.appendChild(box);

    // Cleanup: remove the box if component re-renders or unmounts.
    return () => {
      if (boxRef.current) {
        document.body.removeChild(boxRef.current);
        boxRef.current = null;
      }
    };
  }, [zoomedInBody]);

  // Since we're doing DOM manipulation, we return null from React’s standpoint.
  return null;
};

export default ProjectMenu;
