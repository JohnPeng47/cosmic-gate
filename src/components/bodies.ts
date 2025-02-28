export interface Project {
  name: string;
  description: string;
  github?: string | null;
  link?: string | null;
}

const TOPIC_EXPLORER: Project = {
  name: "Topic Explorer",
  description: `
A novel tree-based UI for exploring nested topics<br>
- Uses only a single prompt to recursively generate topics for any user search query<br>
- each subsequent branch of the tree inherits the previously generated entry as its context, allowing it to expand deeper into more categories`,
  github: "https://github.com/JohnPeng47/TopicExplorer",
  link: "https://cowboy.rocks/TopicExplorer?query=the%20glorious%20revolution"
}

const CODESEARCH: Project = {
  name: "Codesearch",
  description: `
<div>
<h1>What am I looking at?</h1>
<p>https://cowboy.rocks/codesearch</p>

<p>The original idea behind this was: can AI help solve code understanding?</p>
<p>I approached this problem by:</p>
<ol>
  <li>Identifying clusters of code that represented distinct functional components in the code (ie. API Request Error Handling)</li>
  <li>Generate summaries of these</li>
  <li>Present a UI that allows you to browse the source code using the summaries as guidance</li>
</ol>
<p>The goal here was not to replace looking at source code with summaries, but to present the user with summaries that represents a 10,000 ft. view of the code, quickly orienting them in the unfamiliar territory so they can better navigate it on their own</p>

<h1>How it works</h1>
<p>At its core, Codesearch tries to discover groups of source code that works together to implement a system function; so essentially a "clustering" problem in ML parlance.</p>
<p>At a high level, it accomplishes this by first running a generic graph-based clustering algorithm over a dependency graph (references -> definitions) of code chunks. It then uses LLMs to clean-up the results of the previous clustering step by reassigning chunks to clusters. Finally, a summary is generated for each cluster.</p>

<p>A detailed description is provided below.</p>
<ol>
  <li>
    <p>Chunk using code aware chunking strategy (lifted from https://github.com/aorwall/moatless-tools)</p>
    <p>"Code aware" means for example chunking on function boundaries to keep variable scopes intact during retrieval</p>
    <pre>
def func(a: T, b: S):
------- CHUNK BOUNDARY ------
    dostuff(a, b):
    </pre>
    <p>(Example of non-code aware chunking) -> awareness of a,b as the function parameters is lost when the boundary is arbitrarily selected by a non-code aware chunking scheme</p>
    <p>[Implementation]</p>
    <ul>
      <li>src/chunk/chunkers/python.py -> Python chunker, wraps moatless</li>
      <li>moatless/index/epic_split.py -> actual chunking logic</li>
      <li>moatless/codeblocks/parser/python.py -> python parser</li>
    </ul>
  </li>

  <li>
    <p>Generate dependency graph for references -> definitions (inspired by https://github.com/BloopAI/bloop.git)</p>
    <p>My dependency resolution algorithm works by assigning referenced/defined relationships to variables at the chunk level. So for each chunk, its outgoing edges are references to externally defined (in another chunk) symbols and the incoming edges when another chunk references its definitions.</p>
    <p>A problem we encounter is disambiguating between references to variables that share common names within a source file.</p>
    <pre>
f1.py

# scope 1, global scope
------- CHUNK 1 ---------
from f2 import a,b

------- CHUNK 2 ---------
def f(x, y): # scope 2, func scope
  ...
  x = a()
  y = b + 1 #
  global_var = 1


f2.py
------- CHUNK 1 ---------
def a(): # scope 2
    ...
------- CHUNK 2 ---------
b = x
    </pre>
    <p>The solution that I lifted from Bloop's rust code and optimized into python uses a scope graph (DAG) that tracks nested scopes by constructing a edge from child to parent. So starting from the global scope (root node), I iterate through each scope in the file and connecting each child to a path that eventually leads to the parent. When this is done, every reference can be unambiguously resolved by first checking its current scope, then walking up its parents until a scope containing the reference is found.</p>
    <pre>f1::chunk2 -- (a,b) --> f2::a(chunk1), f2::b(chunk2)</pre>
    <p>With references/definitions tied to scope, I can now construct edges from references to definitions across different chunks (chunk -> chunk graph)</p>
    <p>[Implementation]</p>
    <ul>
      <li>rtfs/build_scopes.py -> goes over the code and extracts nodes using TS queries</li>
      <li>rtfs/scope_resolution/scope_graph.py -> constructing the scopegraph</li>
      <li>rtfs/repo_resolution/graph.py -> file -> file graph that maps import/export</li>
      <li>rtfs/chunk_resolution/graph.py -> chunk -> chunk graph constructed using the import/export relationships above</li>
    </ul>
  </li>

  <li>
    <p>Cluster chunks together using a generic graph clustering/community detection algorithm (https://github.com/mapequation/infomap.git)</p>
    <ul>
      <li>Run a graph clustering algorithm to detect clusters in the previous chunk -> chunk graph</li>
      <li>The graph clustering objective here is roughly like "find a group of nodes that maximizes the ratio of in-group connections/out-group edges"</li>
      <li>(Works surprisingly well!)</li>
    </ul>
    <p>[Implementation]</p>
    <ul>
      <li>rtfs/cluster/infomap.py -> wrapper around infoMap package</li>
    </ul>
  </li>

  <li>
    <p>Reassign chunks with LLM</p>
    <ul>
      <li>Reason why this step exists is because (as you can imagine) steps 1-3 can end up with badly clustered chunks.</li>
      <li>Reason why steps 1-3 exists is because clustering with LLM naively doesnt work very well (long list of reasons, mostly having to do with context length)</li>
    </ul>
    <p>[Implementation]</p>
    <ul>
      <li>rtfs/cluster/cluster_graph.py -> main cluster cleanup routine</li>
      <li>rtfs/cluster/lmp/graph_ops.py -> a "pseudo-DSL" for LLM-based graph modifications</li>
    </ul>
  </li>

  <li>
    <p>Generate summaries for chunks</p>
    <ul>
      <li>Generate summaries for each cluster</li>
    </ul>
    <p>[Implementation]</p>
    <ul>
      <li>rtfs/cluster/cluster_graph.py -> main cluster cleanup routine</li>
    </ul>
  </li>

  <li>
    <p>(ROADMAP) Code search [some thoughts for implementation]</p>
    <p>When thinking about NL queries against a repo-wide codesearching system, I find the following categorizations helpful:</p>
    <ol>
      <li>queries relating to a single file</li>
      <li>queries relating to multiple files</li>
      <li>queries with references to specific symbols in the code (made by a user who is already familiar with the codebase)</li>
      <li>queries without references to specific symbols, using more generally descriptive language (made by users who are unfamiliar with the codebase)</li>
    </ol>
    <p>In comparing queries over a index built with summarized clusters vs. an index of chunks of raw code, I think there is a benefit in (2,3) from above. The reason for this is because cosine similarity is a vector by vector comparison, which means that comparison of code chunks are isolated from their wider context in interacting with the rest of the codebase. Also, for new users of the codebase who might not be familiar with the symbol names, queries that ask more general questions should be anticipated. Summaries in natural language might be a better match against these queries than raw code.</p>
  </li>
</ol>

<h1>Evaluations</h1>
<p>It should be noted while some evaluation attemps have been made to quantify the quality of the clusters, most of the setup here is "one-shotted" and methodologies generally not based on empirical observation. It's on the roadmap :)</p>

<h1>Honorable Mentions</h1>
<p>The original idea was inspired for Microsoft's https://github.com/microsoft/graphrag; figured that code dependency edges probably should convey way more information than generic entity relation graphs</p>
</div>`,
  github: "https://github.com/JohnPeng47/codesearch-backend",
}

const TESTBOT: Project = {
  name: "Testbot",
  description: `
Automated test generation for Python code
  `,
  github: "https://github.com/JohnPeng47/testbot",
}


const JOHNPENG: Project = {
  name: "Topic Explorer",
  description: "I am me"
}

const PROJECTS = [
  JOHNPENG,
  TOPIC_EXPLORER, 
  CODESEARCH,
  TESTBOT
];

export default PROJECTS;