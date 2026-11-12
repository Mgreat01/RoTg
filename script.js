// Adaptateur d'interface : les calculs sont centralisés dans js/graphe.js.
const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");
const output = document.getElementById("output");
const directionSelect = document.getElementById("directionSelect");
let nodes = [];
let edges = [];
let mode = "node";
let selectedNode = null;
let result = null;

function setMode(value) {
  mode = value;
  selectedNode = null;
  drawGraph();
}
function invalidate() {
  result = null;
  output.textContent = "Graphe modifié : relancez un calcul.";
}
function drawGraph() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "14px Arial";
  edges.forEach((edge, index) => {
    const from = edge.from, to = edge.to;
    const highlighted = result?.edges?.includes(index) ?? false;
    ctx.strokeStyle = highlighted ? "#c026d3" : "#334155";
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    if (from.id === to.id) {
      ctx.arc(from.x, from.y - 26, 18, 0, Math.PI * 2);
    } else {
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
    }
    ctx.stroke();
    if (directionSelect.value === "directed" && from.id !== to.id) {
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const x = to.x - 21 * Math.cos(angle), y = to.y - 21 * Math.sin(angle);
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x - 11 * Math.cos(angle - 0.45), y - 11 * Math.sin(angle - 0.45));
      ctx.lineTo(x - 11 * Math.cos(angle + 0.45), y - 11 * Math.sin(angle + 0.45));
      ctx.closePath(); ctx.fill();
    }
    ctx.fillText(String(edge.weight), (from.x + to.x) / 2 + 5,
      from.id === to.id ? from.y - 48 : (from.y + to.y) / 2 - 6);
  });
  nodes.forEach(node => {
    ctx.beginPath(); ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = result?.path?.includes(node.id) || result?.order?.includes(node.id) ? "#f5d0fe" : "#dbeafe";
    ctx.fill(); ctx.strokeStyle = selectedNode === node ? "#c026d3" : "#334155";
    ctx.stroke(); ctx.fillStyle = "#0f172a";
    ctx.fillText(String(node.id), node.x - 5, node.y + 5);
  });
}
canvas.addEventListener("click", event => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * canvas.width / rect.width;
  const y = (event.clientY - rect.top) * canvas.height / rect.height;
  if (mode === "node") {
    if (nodes.length >= 500) { output.textContent = "Limite de 500 sommets atteinte."; return; }
    nodes.push({ id: nodes.length + 1, x, y });
    invalidate();
  } else {
    const clicked = nodes.find(node => Math.hypot(node.x - x, node.y - y) < 20);
    if (!clicked) return;
    if (!selectedNode) selectedNode = clicked;
    else {
      const source = selectedNode;
      selectedNode = null;
      const input = prompt("Poids de l'arête (nombre fini) :", "1");
      if (input !== null) {
        const weight = input.trim() === "" ? NaN : Number(input.trim().replace(",", "."));
        if (!Number.isFinite(weight)) output.textContent = "Poids invalide : saisissez un nombre fini.";
        else if (edges.length >= 10000) output.textContent = "Limite de 10 000 arêtes atteinte.";
        else { edges.push({ from: source, to: clicked, weight }); invalidate(); }
      }
    }
  }
  drawGraph();
});
function runAlgorithm() {
  const algorithm = document.getElementById("algoSelect").value;
  result = GraphEngine.run({
    nodes,
    edges: edges.map(edge => ({ source: edge.from.id, destination: edge.to.id, weight: edge.weight })),
    directed: directionSelect.value === "directed",
  }, algorithm);
  const lines = [result.message];
  if (result.code) lines.push(`Code : ${result.code}`);
  if (result.path.length) lines.push(`Chemin : ${result.path.join(" → ")} ; coût : ${result.distance}`);
  if (result.kind === "traversal") lines.push(`Ordre de visite : ${result.order.join(", ")}`);
  if (result.kind === "forest") lines.push(`Poids total : ${result.totalWeight} ; composantes : ${result.components}`);
  if (result.distances) lines.push("Distances depuis la source :", ...Object.entries(result.distances).map(([id, d]) => `  ${id} : ${d ?? "inaccessible"}`));
  if (result.matrix) lines.push(`Matrice (ordre : ${result.nodeIds.join(", ")}) :`, ...result.matrix.map(row => row.map(d => d ?? "∞").join("\t")));
  if (result.unreachable?.length) lines.push(`Sommets inaccessibles : ${result.unreachable.join(", ")}`);
  if (result.complexity) lines.push(`Temps : ${result.complexity.time} ; espace : ${result.complexity.space}`);
  output.textContent = lines.join("\n");
  drawGraph();
}
document.getElementById("runButton").addEventListener("click", runAlgorithm);
directionSelect.addEventListener("change", () => { selectedNode = null; invalidate(); drawGraph(); });
