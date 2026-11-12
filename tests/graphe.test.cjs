const { test } = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('../js/graphe.js');

const graph = (ids = [1, 2, 3], edges = [[1, 2, 2], [2, 3, 3], [1, 3, 10]], directed = true) => ({
  nodes: ids.map(id => ({ id })), edges: edges.map(([source, destination, weight]) => ({ source, destination, weight })), directed,
});
for (const algo of ['dijkstra', 'bellman', 'floyd', 'longest']) {
  test(`${algo} : chemin pondéré et identifiants stables`, () => {
    const result = run(graph([10, 20, 30], [[10, 20, 2], [20, 30, 3], [10, 30, 10]]), algo);
    assert.equal(result.status, 'success'); assert.equal(result.distance, algo === 'longest' ? 10 : 5);
    assert.deepEqual(result.path, algo === 'longest' ? [10, 30] : [10, 20, 30]);
  });
  test(`${algo} : destination inaccessible`, () => {
    const result = run(graph([1, 2], []), algo);
    assert.equal(result.status, 'unreachable'); assert.equal(result.distance, null); assert.deepEqual(result.path, []);
  });
  test(`${algo} : sommet unique et boucle positive`, () => {
    const result = run(graph([7], [[7, 7, 4]]), algo);
    if (algo === 'longest') assert.equal(result.code, 'CYCLIC_GRAPH');
    else { assert.deepEqual(result.path, [7]); assert.equal(result.distance, 0); }
    assert.deepEqual(run(graph([7], []), algo).path, [7]);
  });
}
for (const algo of ['dijkstra', 'bellman', 'floyd', 'longest', 'bfs', 'dfs', 'kruskal']) {
  test(`${algo} : validation des entrées`, () => {
    assert.equal(run(graph([], []), algo).code, 'EMPTY_GRAPH');
    assert.equal(run(graph([1, 1], []), algo).code, 'INVALID_ID');
    assert.equal(run(graph([0], []), algo).code, 'INVALID_ID');
    assert.equal(run(graph([1], [[1, 2, 1]]), algo).code, 'INVALID_ENDPOINT');
    for (const weight of [NaN, Infinity, -Infinity, '2']) assert.equal(run(graph([1], [[1, 1, weight]]), algo).code, 'INVALID_WEIGHT');
    assert.equal(run(graph(), algo, 42).code, 'INVALID_ENDPOINT');
    assert.equal(run(graph(Array.from({ length: 501 }, (_, i) => i + 1), []), algo).code, 'GRAPH_TOO_LARGE');
  });
}
test('poids négatifs et cycles négatifs atteignables ou isolés', () => {
  const negative = graph([1, 2, 3], [[1, 2, -2], [2, 3, 1]]);
  assert.equal(run(negative, 'dijkstra').code, 'NEGATIVE_WEIGHT');
  assert.equal(run(negative, 'bellman').distance, -1);
  const cycle = graph([1, 2, 3], [[1, 2, 1], [2, 3, -2], [3, 2, 1]]);
  assert.equal(run(cycle, 'bellman').code, 'NEGATIVE_CYCLE');
  assert.equal(run(cycle, 'floyd').code, 'NEGATIVE_CYCLE');
  const isolated = graph([1, 2, 3], [[2, 3, -2], [3, 2, 1]]);
  assert.equal(run(isolated, 'bellman').status, 'unreachable');
  assert.equal(run(isolated, 'floyd').code, 'NEGATIVE_CYCLE');
  assert.equal(run(graph([1], [[1, 1, -1]]), 'bellman').code, 'NEGATIVE_CYCLE');
});
test('DAG requis dans toutes les composantes', () => {
  assert.equal(run(graph([1, 2, 3], [[2, 3, 1], [3, 2, 1]]), 'longest').code, 'CYCLIC_GRAPH');
  assert.equal(run(graph([1, 2], [[1, 2, 1]], false), 'longest').code, 'DIRECTED_REQUIRED');
});
test('arêtes parallèles : minimum indépendant de la saisie et décimales', () => {
  for (const algo of ['dijkstra', 'bellman', 'floyd']) {
    const result = run(graph([1, 2], [[1, 2, 1.5], [1, 2, 9]]), algo);
    assert.equal(result.distance, 1.5);
  }
});
test('parcours déterministes, cycles et distinction avec un chemin', () => {
  const g = graph([1, 2, 3, 4], [[1, 2, 1], [1, 3, 1], [2, 4, 1], [4, 1, 1]]);
  assert.deepEqual(run(g, 'bfs').order, [1, 2, 3, 4]);
  assert.deepEqual(run(g, 'dfs').order, [1, 2, 4, 3]);
  assert.deepEqual(run(g, 'bfs').path, []);
  assert.equal(run(g, 'dfs').kind, 'traversal');
});
test('orientation et forêt minimale, boucles et arêtes parallèles', () => {
  const g = graph([1, 2, 3, 4], [[2, 1, 4], [2, 1, 1], [2, 3, 2], [1, 1, -8]], false);
  const result = run(g, 'kruskal');
  assert.equal(result.totalWeight, 3); assert.equal(result.components, 2);
  assert.deepEqual(result.edges.sort(), [1, 2]);
  assert.equal(run(graph(), 'kruskal').code, 'UNDIRECTED_REQUIRED');
  assert.equal(run(graph([1, 2], [[2, 1, 2]], false), 'dijkstra').distance, 2);
  assert.equal(run(graph([1, 2], [[2, 1, 2]]), 'dijkstra').status, 'unreachable');
});
test('limites numériques et mémoire explicites', () => {
  assert.equal(run(graph([1, 2, 3], [[1, 2, 1e308], [2, 3, 1e308]]), 'dijkstra').code, 'NUMERIC_OVERFLOW');
  assert.equal(run(graph(Array.from({ length: 101 }, (_, i) => i + 1), []), 'floyd').code, 'GRAPH_TOO_LARGE');
});
