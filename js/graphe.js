/* Moteur sans DOM : utilisable dans une page statique ou dans les tests Node. */
(function (root) {
  "use strict";
  const algorithms = Object.freeze({
    dijkstra: { time: "O(V² + E)", space: "O(V + E)", description: "Plus court chemin sans poids négatif." },
    bellman: { time: "O(V × E)", space: "O(V + E)", description: "Plus court chemin ; détecte les cycles négatifs atteignables." },
    floyd: { time: "O(V³)", space: "O(V² + E)", description: "Distances entre toutes les paires ; refuse tout cycle négatif." },
    dfs: { time: "O(V + E)", space: "O(V + E)", description: "Ordre de visite en profondeur, distinct d'un chemin." },
    bfs: { time: "O(V + E)", space: "O(V + E)", description: "Ordre de visite en largeur, distinct d'un chemin." },
    kruskal: { time: "O(E log E + V + E log V)", space: "O(V + E)", description: "Forêt couvrante minimale d'un graphe non orienté." },
    longest: { time: "O(V + E)", space: "O(V + E)", description: "Plus long chemin dans un graphe orienté acyclique." },
  });

  function fail(code, message) { throw Object.assign(new Error(message), { code }); }
  function add(a, b) {
    const value = a + b;
    if (!Number.isFinite(value)) fail("NUMERIC_OVERFLOW", "Les poids dépassent la précision numérique disponible.");
    return value;
  }
  function prepare(graph, algorithm, start, end) {
    if (!algorithms[algorithm]) fail("UNKNOWN_ALGORITHM", "Algorithme inconnu.");
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || typeof graph.directed !== "boolean")
      fail("INVALID_GRAPH", "Le graphe doit déclarer ses sommets, ses arêtes et son orientation.");
    const ids = graph.nodes.map(n => n.id);
    if (!ids.length) fail("EMPTY_GRAPH", "Ajoutez au moins un sommet avant le calcul.");
    if (ids.length > 500 || graph.edges.length > 10000 || (algorithm === "floyd" && ids.length > 100))
      fail("GRAPH_TOO_LARGE", "Limite : 500 sommets, 10 000 arêtes ; Floyd-Warshall : 100 sommets.");
    if (ids.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length)
      fail("INVALID_ID", "Les identifiants doivent être des entiers positifs uniques.");
    const index = new Map(ids.map((id, i) => [id, i]));
    start ??= ids[0]; end ??= ids[ids.length - 1];
    if (!index.has(start) || !index.has(end)) fail("INVALID_ENDPOINT", "Sommet source ou destination inexistant.");
    const arcs = [], adjacency = ids.map(() => []);
    graph.edges.forEach((e, edgeIndex) => {
      if (!index.has(e.source) || !index.has(e.destination)) fail("INVALID_ENDPOINT", "Une arête référence un sommet inexistant.");
      if (typeof e.weight !== "number" || !Number.isFinite(e.weight)) fail("INVALID_WEIGHT", "Chaque poids doit être un nombre fini.");
      const arc = { u: index.get(e.source), v: index.get(e.destination), weight: e.weight, edgeIndex };
      arcs.push(arc); adjacency[arc.u].push(arc);
      if (!graph.directed && arc.u !== arc.v) {
        const reverse = { ...arc, u: arc.v, v: arc.u };
        arcs.push(reverse); adjacency[reverse.u].push(reverse);
      }
    });
    return { ids, arcs, adjacency, s: index.get(start), t: index.get(end), n: ids.length };
  }
  function reconstruct(prev, s, t, reachable) {
    if (!reachable) return [];
    const path = [], seen = new Set();
    for (let u = t; u !== null; u = prev[u]) {
      if (seen.has(u) || path.length >= prev.length) fail("INVALID_PATH", "La reconstruction du chemin est incohérente.");
      seen.add(u); path.push(u);
      if (u === s) return path.reverse();
    }
    fail("INVALID_PATH", "Le chemin ne rejoint pas la source.");
  }
  function pathResult(c, dist, prev) {
    const reachable = Number.isFinite(dist[c.t]);
    return {
      status: reachable ? "success" : "unreachable", kind: "path",
      message: reachable ? "Chemin calculé." : "La destination est inaccessible depuis la source.",
      path: reconstruct(prev, c.s, c.t, reachable).map(i => c.ids[i]), order: [],
      distance: reachable ? dist[c.t] : null,
      distances: Object.fromEntries(c.ids.map((id, i) => [id, Number.isFinite(dist[i]) ? dist[i] : null])),
      unreachable: c.ids.filter((_, i) => !Number.isFinite(dist[i])),
    };
  }
  function shortest(c, algorithm) {
    const dist = Array(c.n).fill(Infinity), prev = Array(c.n).fill(null);
    dist[c.s] = 0;
    if (algorithm === "dijkstra") {
      if (c.arcs.some(e => e.weight < 0)) fail("NEGATIVE_WEIGHT", "Dijkstra exige des poids positifs ou nuls.");
      const visited = new Set();
      for (let i = 0; i < c.n; i++) {
        let u = -1;
        for (let j = 0; j < c.n; j++) if (!visited.has(j) && Number.isFinite(dist[j]) && (u < 0 || dist[j] < dist[u])) u = j;
        if (u < 0) break;
        visited.add(u);
        for (const e of c.adjacency[u]) {
          const candidate = add(dist[u], e.weight);
          if (candidate < dist[e.v]) { dist[e.v] = candidate; prev[e.v] = u; }
        }
      }
    } else {
      for (let i = 1; i < c.n; i++) {
        let changed = false;
        for (const e of c.arcs) if (Number.isFinite(dist[e.u])) {
          const candidate = add(dist[e.u], e.weight);
          if (candidate < dist[e.v]) { dist[e.v] = candidate; prev[e.v] = e.u; changed = true; }
        }
        if (!changed) break;
      }
      if (c.arcs.some(e => Number.isFinite(dist[e.u]) && add(dist[e.u], e.weight) < dist[e.v]))
        fail("NEGATIVE_CYCLE", "Un cycle négatif est atteignable depuis la source.");
    }
    return pathResult(c, dist, prev);
  }
  function floyd(c) {
    const dist = Array.from({ length: c.n }, (_, i) => Array.from({ length: c.n }, (_, j) => i === j ? 0 : Infinity));
    const next = Array.from({ length: c.n }, () => Array(c.n).fill(null));
    for (const e of c.arcs) if (e.weight < dist[e.u][e.v]) { dist[e.u][e.v] = e.weight; next[e.u][e.v] = e.v; }
    for (let k = 0; k < c.n; k++) {
      for (let i = 0; i < c.n; i++) for (let j = 0; j < c.n; j++) {
        if (!Number.isFinite(dist[i][k]) || !Number.isFinite(dist[k][j])) continue;
        const candidate = add(dist[i][k], dist[k][j]);
        if (candidate < dist[i][j]) { dist[i][j] = candidate; next[i][j] = next[i][k]; }
      }
      if (dist.some((row, i) => row[i] < 0)) fail("NEGATIVE_CYCLE", "Le graphe contient un cycle négatif.");
    }
    const reachable = Number.isFinite(dist[c.s][c.t]), path = [];
    if (reachable) {
      let u = c.s;
      path.push(c.ids[u]);
      while (u !== c.t) {
        if (path.length >= c.n || next[u][c.t] === null) fail("INVALID_PATH", "La reconstruction du chemin est incohérente.");
        u = next[u][c.t]; path.push(c.ids[u]);
      }
    }
    return { status: reachable ? "success" : "unreachable", kind: "path", path, order: [],
      message: reachable ? "Chemin et matrice des distances calculés." : "La destination est inaccessible depuis la source.",
      distance: reachable ? dist[c.s][c.t] : null, nodeIds: c.ids,
      distances: Object.fromEntries(c.ids.map((id, i) => [id, Number.isFinite(dist[c.s][i]) ? dist[c.s][i] : null])),
      unreachable: c.ids.filter((_, i) => !Number.isFinite(dist[c.s][i])),
      matrix: dist.map(row => row.map(d => Number.isFinite(d) ? d : null)) };
  }
  function traverse(c, breadth) {
    const order = [], seen = new Set([c.s]), pending = [c.s];
    if (breadth) {
      for (let head = 0; head < pending.length; head++) {
        const u = pending[head]; order.push(c.ids[u]);
        for (const e of c.adjacency[u]) if (!seen.has(e.v)) { seen.add(e.v); pending.push(e.v); }
      }
    } else {
      const frames = [{ u: c.s, cursor: 0 }]; order.push(c.ids[c.s]);
      while (frames.length) {
        const frame = frames[frames.length - 1];
        if (frame.cursor >= c.adjacency[frame.u].length) { frames.pop(); continue; }
        const v = c.adjacency[frame.u][frame.cursor++].v;
        if (!seen.has(v)) { seen.add(v); order.push(c.ids[v]); frames.push({ u: v, cursor: 0 }); }
      }
    }
    return { status: "success", kind: "traversal", message: "Ordre de visite ; ce résultat n'est pas un chemin.", path: [], order,
      unreachable: c.ids.filter((_, i) => !seen.has(i)) };
  }
  function longest(c, directed) {
    if (!directed) fail("DIRECTED_REQUIRED", "Le plus long chemin exige un graphe orienté acyclique.");
    const indegree = Array(c.n).fill(0), queue = [], topo = [];
    c.arcs.forEach(e => indegree[e.v]++);
    indegree.forEach((d, i) => { if (!d) queue.push(i); });
    for (let head = 0; head < queue.length; head++) {
      const u = queue[head]; topo.push(u);
      for (const e of c.adjacency[u]) if (--indegree[e.v] === 0) queue.push(e.v);
    }
    if (topo.length !== c.n) fail("CYCLIC_GRAPH", "Le plus long chemin nécessite un DAG : le graphe contient un cycle.");
    const dist = Array(c.n).fill(-Infinity), prev = Array(c.n).fill(null); dist[c.s] = 0;
    for (const u of topo) if (Number.isFinite(dist[u])) for (const e of c.adjacency[u]) {
      const candidate = add(dist[u], e.weight);
      if (candidate > dist[e.v]) { dist[e.v] = candidate; prev[e.v] = u; }
    }
    return pathResult(c, dist, prev);
  }
  function kruskal(c, graph) {
    if (graph.directed) fail("UNDIRECTED_REQUIRED", "Kruskal nécessite un graphe non orienté. Changez le type du graphe.");
    const parent = Array.from({ length: c.n }, (_, i) => i), size = Array(c.n).fill(1);
    function find(u) { while (parent[u] !== u) { parent[u] = parent[parent[u]]; u = parent[u]; } return u; }
    const chosen = []; let totalWeight = 0, components = c.n;
    for (const e of c.arcs.filter(e => e.u <= e.v).sort((a, b) => a.weight - b.weight || a.edgeIndex - b.edgeIndex)) {
      let a = find(e.u), b = find(e.v);
      if (a === b) continue;
      if (size[a] < size[b]) [a, b] = [b, a];
      parent[b] = a; size[a] += size[b]; components--;
      chosen.push(e.edgeIndex); totalWeight = add(totalWeight, e.weight);
    }
    return { status: "success", kind: "forest", message: components > 1 ? "Graphe déconnecté : forêt couvrante minimale." : "Arbre couvrant minimal.",
      path: [], order: [], edges: chosen, totalWeight, components };
  }
  function run(graph, algorithm, start, end) {
    try {
      const c = prepare(graph, algorithm, start, end);
      let result;
      switch (algorithm) {
        case "dijkstra": case "bellman": result = shortest(c, algorithm); break;
        case "floyd": result = floyd(c); break;
        case "bfs": case "dfs": result = traverse(c, algorithm === "bfs"); break;
        case "longest": result = longest(c, graph.directed); break;
        case "kruskal": result = kruskal(c, graph); break;
      }
      return { algorithm, ...result, complexity: algorithms[algorithm] };
    } catch (error) {
      if (!error.code) throw error;
      return { algorithm, status: "error", kind: "error", code: error.code, message: error.message, path: [], order: [] };
    }
  }
  const api = Object.freeze({ run, algorithms });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GraphEngine = api;
})(globalThis);
