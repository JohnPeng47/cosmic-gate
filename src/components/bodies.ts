export interface Project {
  name: string;
  description: string;
  github: string | null;
  link: string | null;
}

const TOPIC_EXPLORER: Project = {
  name: "Topic Explorer",
  description: `
A novel tree-based UI for exploring nested topics
- uses only a single prompt to recursively generate topics for any user search query
- each branch subsequent branch of the tree inherits the previously generated entry as 
its context, allowing it to expand deeper into more relevant`,
  github: "https://github.com/JohnPeng47/TopicExplorer",
  link: "https://cowboy.rocks/TopicExplorer"
}

const JOHNPENG: Project = {
  name: "Topic Explorer",
  description: "I am me"
}

const PROJECTS = [
  JOHNPENG,
  TOPIC_EXPLORER, 
];
export default PROJECTS;
