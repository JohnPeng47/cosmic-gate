import React, { useEffect, useRef, useState } from 'react';
import { useNBodyStore, ZoomedInBody, NBodyStore } from '../store/nBodyStore';
import { Project } from './bodies';
import { insertElement } from './utils';
import styles from "./ProjectMenu.module.css"

class BoxRenderer {
  private element: HTMLDivElement | null = null;
  private static readonly BOX_WIDTH = "50%";
  private static readonly BOX_HEIGHT = "50%";

  constructor(private container: HTMLElement = document.body) {}

  private createBox(): HTMLDivElement {
    const box = insertElement<HTMLDivElement>(`
      <div class="${styles.projectBox}" onclick="event.stopPropagation()">
      </div>
    `);
    return box;
  }

  // Style this tmrw
  private generateContent(project: Project): string {
    return `
      <div class="${styles.projectDetails}">
        <h3>${project.name} Details</h3>
        <p>
          ${project.description}
        </p>
        <div class="${styles.projectLinks}">
          ${project.github ? `<a href="${project.github}" target="_blank">GitHub</a>` : ''}
          ${project.link ? `<a href="${project.link}" target="_blank">View Project</a>` : ''}
        </div>
      </div>
    `;
  }

  public update(body: ZoomedInBody | null): void {
    this.remove();

    if (!body) return;

    // Create and configure new box
    this.element = this.createBox();

    // First append to DOM so we can get actual dimensions
    this.container.appendChild(this.element);

    // Now we can get actual pixel dimensions
    const boxWidth = this.element.offsetWidth;
    const boxHeight = this.element.offsetHeight;

    // Calculate center position using actual pixel dimensions
    const centerX = window.innerWidth / 2 - boxWidth / 2;
    const centerY = window.innerHeight / 2 - boxHeight / 2;
    
    // Set position
    this.element.style.left = `${centerX}px`;
    this.element.style.top = `${centerY}px`;

    // Set content
    this.element.innerHTML = this.generateContent(body.project);

    // Trigger animation
    requestAnimationFrame(() => {
      if (this.element) {
        this.element.style.opacity = "1";
        this.element.style.transform = "translateY(0)";
      }
    });
  }

  public remove(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
  }
}

const ProjectMenu: React.FC = () => {
  const boxRendererRef = useRef<BoxRenderer | null>(null);
  const [zoomedInBody, setZoomedInBody] = useState<ZoomedInBody | null>(null);

  // Initialize BoxRenderer on mount
  useEffect(() => {
    boxRendererRef.current = new BoxRenderer();
    
    return () => {
      boxRendererRef.current?.remove();
      boxRendererRef.current = null;
    };
  }, []);

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = useNBodyStore.subscribe(
      (state: NBodyStore) => {
        setZoomedInBody(state.zoomedInBody);
      }
    );
    return unsubscribe;
  }, []);

  // Update box when zoomedInBody changes
  useEffect(() => {
    boxRendererRef.current?.update(zoomedInBody);
  }, [zoomedInBody]);

  return null;
};

export default ProjectMenu;