const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function mount() {
  const element = () => ({events: {}, attributes: {}, textContent: '',
    addEventListener(name, handler) { this.events[name] = handler; },
    setAttribute(name, value) { this.attributes[name] = value; }});
  const elements = Object.fromEntries(['nodeTool', 'edgeTool', 'drawingHint', 'algoSelect', 'methodNote'].map(id => [id, element()]));
  elements.algoSelect.value = 'dijkstra';
  const selected = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/laboratoire-ui.js'), 'utf8'), {
    document: {getElementById: id => elements[id]}, setMode: mode => selected.push(mode),
  });
  return {elements, selected};
}

test('les outils changent le mode réel et annoncent leur sélection', () => {
  const {elements, selected} = mount();
  elements.edgeTool.events.click();
  assert.deepEqual(selected, ['edge']);
  assert.equal(elements.edgeTool.attributes['aria-pressed'], 'true');
  assert.equal(elements.nodeTool.attributes['aria-pressed'], 'false');
  assert.match(elements.drawingHint.textContent, /poids/);
  elements.nodeTool.events.click();
  assert.deepEqual(selected, ['edge', 'node']);
  assert.equal(elements.nodeTool.attributes['aria-pressed'], 'true');
});

test('les conditions de chaque méthode accompagnent le choix du calcul', () => {
  const {elements} = mount();
  assert.match(elements.methodNote.textContent, /positifs ou nuls/);
  for (const [method, condition] of Object.entries({bellman:/négatifs/, floyd:/100/, dfs:/ordre de visite/, bfs:/ordre de visite/, kruskal:/non orienté/, longest:/sans cycle/})) {
    elements.algoSelect.value = method;
    elements.algoSelect.events.change();
    assert.match(elements.methodNote.textContent, condition);
  }
});
