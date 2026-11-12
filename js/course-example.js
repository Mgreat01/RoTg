// Chargement explicite d'un exemple pédagogique encodé dans le lien du cours.
// Aucun téléchargement et aucun calcul automatique à l'ouverture.
(function () {
  const raw = new URLSearchParams(window.location.hash.slice(1)).get("course");
  if (!raw) return;
  try {
    if (raw.length > 30000) throw new Error("L'exemple dépasse la taille autorisée.");
    const payload = JSON.parse(raw);
    const graph = payload.graph;
    const validation = GraphEngine.run(graph, "bfs");
    if (validation.status === "error") throw new Error(validation.message);
    if (graph.nodes.some(n => !Number.isFinite(n.x) || !Number.isFinite(n.y) || n.x < 20 || n.x > 340 || n.y < 20 || n.y > 200))
      throw new Error("Les positions des sommets de l'exemple sont invalides.");
    const algorithm = payload.algorithm ?? "bfs";
    if (!Object.hasOwn(GraphEngine.algorithms, algorithm)) throw new Error("Algorithme d'exemple inconnu.");
    nodes = graph.nodes.map(n => ({id:n.id, x:n.x * canvas.width / 360, y:n.y * canvas.height / 220}));
    const byId = new Map(nodes.map(n => [n.id,n]));
    edges = graph.edges.map(e => ({from:byId.get(e.source),to:byId.get(e.destination),weight:e.weight}));
    directionSelect.value = graph.directed ? "directed" : "undirected";
    document.getElementById("algoSelect").value = algorithm;
    selectedNode = null;
    result = null;
    output.textContent = "Exemple du cours chargé. Explorez le graphe, puis lancez un calcul lorsque vous êtes prêt.";
    drawGraph();
  } catch (error) {
    output.textContent = `Impossible d'ouvrir l'exemple : ${error.message}`;
  }
})();
