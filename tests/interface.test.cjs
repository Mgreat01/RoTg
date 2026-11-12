const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const engine = require('../js/graphe.js');
function mount() {
  const context = new Proxy({}, { get: (target, name) => target[name] ?? (() => {}) });
  const element = value => ({ value, textContent: '', events: {}, addEventListener(name, fn) { this.events[name] = fn; } });
  const canvas = Object.assign(element(), { width: 1000, height: 600, getContext: () => context,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 300 }) });
  const elements = { graphCanvas: canvas, output: element(), directionSelect: element('directed'),
    algoSelect: element('dijkstra'), runButton: element() };
  let input = '1', calls = 0;
  const scope = vm.createContext({ document: { getElementById: id => elements[id] ?? null },
    prompt: () => input, GraphEngine: { run(...args) { calls++; return engine.run(...args); } } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8'), scope);
  return { elements, scope, setInput(value) { input = value; }, get calls() { return calls; },
    click(x, y) { canvas.events.click({ clientX: x, clientY: y }); },
    run(algo = 'dijkstra') { elements.algoSelect.value = algo; elements.runButton.events.click(); } };
}
test('initialisation, bouton unique et graphe vide', () => {
  const ui = mount(); ui.run();
  assert.equal(ui.calls, 1); assert.match(ui.elements.output.textContent, /EMPTY_GRAPH/);
  const html = fs.readFileSync(path.join(__dirname, '../exercices.html'), 'utf8');
  assert.match(html, /id="runButton"/); assert.doesNotMatch(html, /onclick="runAlgorithm/);
  assert.ok(html.indexOf('src="js/graphe.js"') < html.indexOf('src="script.js"'));
});
test('coordonnées mises à échelle, saisie décimale et invalidation', () => {
  const ui = mount(); ui.click(50, 50); ui.click(150, 50);
  assert.equal(vm.runInContext('nodes[0].x', ui.scope), 100);
  vm.runInContext('setMode("edge")', ui.scope);
  ui.setInput('1,5'); ui.click(50, 50); ui.click(150, 50); ui.run();
  assert.match(ui.elements.output.textContent, /coût : 1.5/);
  vm.runInContext('setMode("node")', ui.scope); ui.click(200, 100);
  assert.match(ui.elements.output.textContent, /relancez/);
  assert.equal(vm.runInContext('result', ui.scope), null);
});
test('annuler ou saisir un poids non fini ne crée aucune arête', () => {
  const ui = mount(); ui.click(50, 50); ui.click(150, 50); vm.runInContext('setMode("edge")', ui.scope);
  for (const input of [null, '', 'abc', 'Infinity', '1e309']) {
    ui.setInput(input); ui.click(50, 50); ui.click(150, 50);
    assert.equal(vm.runInContext('edges.length', ui.scope), 0);
    assert.equal(vm.runInContext('selectedNode', ui.scope), null);
  }
});
test('parcours nommé correctement et Kruskal accessible en non orienté', () => {
  const ui = mount(); ui.click(50, 50); ui.click(150, 50); vm.runInContext('setMode("edge")', ui.scope);
  ui.click(50, 50); ui.click(150, 50); ui.run('bfs');
  assert.match(ui.elements.output.textContent, /Ordre de visite/);
  ui.run('kruskal'); assert.match(ui.elements.output.textContent, /UNDIRECTED_REQUIRED/);
  ui.elements.directionSelect.value = 'undirected'; ui.elements.directionSelect.events.change();
  ui.run('kruskal'); assert.match(ui.elements.output.textContent, /Poids total : 1/);
});
