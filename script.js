let canvas = document.getElementById("graphCanvas");
let ctx = canvas.getContext("2d");

let nodes = [];
let edges = [];
let nodeId = 0;
let linkMode = false;
let selectedNode = null;

function addNode() {
  canvas.addEventListener("click", placeNodeOnce);
}

function placeNodeOnce(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  nodes.push({ id: nodeId++, x, y });
  drawGraph();
  canvas.removeEventListener("click", placeNodeOnce);
}

function setLinkMode() {
  linkMode = true;
  canvas.addEventListener("click", selectNodeForLink);
}

function selectNodeForLink(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const node = nodes.find(n => Math.hypot(n.x - x, n.y - y) < 20);

  if (node) {
    if (!selectedNode) {
      selectedNode = node;
    } else {
      const weight = prompt("Poids de l'arête ?");
      edges.push({ from: selectedNode.id, to: node.id, weight: parseInt(weight) });
      selectedNode = null;
      linkMode = false;
      canvas.removeEventListener("click", selectNodeForLink);
      drawGraph();
    }
  }
}

function drawGraph() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dessiner les arêtes
  edges.forEach(edge => {
    const from = nodes.find(n => n.id === edge.from);
    const to = nodes.find(n => n.id === edge.to);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.fillText(edge.weight, (from.x + to.x) / 2, (from.y + to.y) / 2);
  });

  // Dessiner les nœuds
  nodes.forEach(node => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = "lightblue";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "black";
    ctx.fillText(node.id, node.x - 5, node.y + 5);
  });
}

// Algorithme de Dijkstra
function runDijkstra() {
  if (nodes.length === 0) return alert("Ajoute des nœuds !");
  const start = parseInt(prompt("Nœud de départ ?"));
  const dist = {};
  const visited = {};

  nodes.forEach(n => dist[n.id] = Infinity);
  dist[start] = 0;

  for (let i = 0; i < nodes.length; i++) {
    let u = Object.keys(dist).filter(n => !visited[n])
      .reduce((a, b) => dist[a] < dist[b] ? a : b);

    visited[u] = true;

    edges.filter(e => e.from == u).forEach(e => {
      if (dist[e.to] > dist[u] + e.weight) {
        dist[e.to] = dist[u] + e.weight;
      }
    });
  }

  alert("Distances minimales depuis " + start + " : " + JSON.stringify(dist));
}
