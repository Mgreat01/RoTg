// Script JS pour les algorithmes de graphes
const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");

let nodes = [];
let edges = [];
let mode = "node"; // "node" or "edge"
let selectedNode = null;

function setMode(m) {
  mode = m;
  selectedNode = null;
}

// --- Dessin du graphe ---
function drawGraph() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Arêtes
  ctx.strokeStyle = "black";
  ctx.font = "14px Arial";
  edges.forEach(e => {
    ctx.beginPath();
    ctx.moveTo(e.from.x, e.from.y);
    ctx.lineTo(e.to.x, e.to.y);
    ctx.stroke();
    const midX = (e.from.x + e.to.x) / 2;
    const midY = (e.from.y + e.to.y) / 2;
    ctx.fillText(e.weight, midX, midY);
  });

  // Sommets
  nodes.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = "lightblue";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "black";
    ctx.fillText(n.id, n.x - 5, n.y + 5);
  });
}

canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (mode === "node") {
    nodes.push({ id: nodes.length + 1, x, y });
  } else if (mode === "edge") {
    const clicked = nodes.find(n => Math.hypot(n.x - x, n.y - y) < 20);
    if (clicked) {
      if (!selectedNode) {
        selectedNode = clicked;
      } else {
        const weight = parseInt(prompt("Poids de l'arête :", "1"));
        edges.push({ from: selectedNode, to: clicked, weight });
        selectedNode = null;
      }
    }
  }
  drawGraph();
});

// --- Algorithmes ---
function runAlgorithm() {
  const algo = document.getElementById("algoSelect").value;
  let result = "";

  switch (algo) {
    case "dijkstra":
      result = "Résultat Dijkstra: " + JSON.stringify(dijkstra(0));
      break;
    case "bellman":
      result = "Résultat Bellman-Ford: " + JSON.stringify(bellmanFord(0));
      break;
    case "floyd":
      result = "Résultat Floyd-Warshall: " + JSON.stringify(floydWarshall());
      break;
    case "dfs":
      result = "DFS: " + JSON.stringify(dfs(0));
      break;
    case "bfs":
      result = "BFS: " + JSON.stringify(bfs(0));
      break;
    case "kruskal":
      result = "Arbre couvrant (Kruskal): " + JSON.stringify(kruskal());
      break;
    case "longest":
      result = "Plus long chemin (DAG): " + JSON.stringify(longestPath());
      break;
  }

  document.getElementById("output").innerText = result;
}

// --- Implémentations simples ---
function dijkstra(start) {
  let dist = Array(nodes.length).fill(Infinity);
  dist[start] = 0;
  let visited = new Set();

  while (visited.size < nodes.length) {
    let u = -1;
    let minDist = Infinity;
    dist.forEach((d, i) => {
      if (!visited.has(i) && d < minDist) {
        minDist = d;
        u = i;
      }
    });

    if (u === -1) break;
    visited.add(u);

    edges.forEach(e => {
      if (e.from.id - 1 === u) {
        const v = e.to.id - 1;
        if (dist[u] + e.weight < dist[v]) {
          dist[v] = dist[u] + e.weight;
        }
      }
    });
  }
  return dist;
}

function bellmanFord(start) {
  let dist = Array(nodes.length).fill(Infinity);
  dist[start] = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.forEach(e => {
      let u = e.from.id - 1;
      let v = e.to.id - 1;
      if (dist[u] + e.weight < dist[v]) {
        dist[v] = dist[u] + e.weight;
      }
    });
  }
  return dist;
}

function floydWarshall() {
  let dist = Array.from({ length: nodes.length }, () => Array(nodes.length).fill(Infinity));
  nodes.forEach((_, i) => dist[i][i] = 0);
  edges.forEach(e => dist[e.from.id - 1][e.to.id - 1] = e.weight);

  for (let k = 0; k < nodes.length; k++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < nodes.length; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
        }
      }
    }
  }
  return dist;
}

function dfs(start) {
  let visited = [];
  function visit(u) {
    visited.push(u + 1);
    edges.forEach(e => {
      if (e.from.id - 1 === u && !visited.includes(e.to.id)) {
        visit(e.to.id - 1);
      }
    });
  }
  visit(start);
  return visited;
}

function bfs(start) {
  let visited = [];
  let queue = [start];
  while (queue.length) {
    let u = queue.shift();
    if (!visited.includes(u + 1)) {
      visited.push(u + 1);
      edges.forEach(e => {
        if (e.from.id - 1 === u) {
          queue.push(e.to.id - 1);
        }
      });
    }
  }
  return visited;
}

function kruskal() {
  let parent = Array.from({ length: nodes.length }, (_, i) => i);
  function find(x) { return parent[x] === x ? x : parent[x] = find(parent[x]); }
  function union(a, b) { parent[find(a)] = find(b); }

  let sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
  let mst = [];
  sortedEdges.forEach(e => {
    let u = e.from.id - 1, v = e.to.id - 1;
    if (find(u) !== find(v)) {
      mst.push(e);
      union(u, v);
    }
  });
  return mst;
}

function longestPath() {
  // Simplification: fonctionne seulement pour DAG
  return "Algorithme du plus long chemin pour DAG (non implémenté totalement)";
}
document.getElementById("runButton").addEventListener("click", runAlgorithm);