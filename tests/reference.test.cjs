const { test } = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('../js/graphe.js');
const cases = require('./fixtures/reference.json');
for (const example of cases) {
  test(`référence commune : ${example.name}`, () => {
    const result = run({ nodes: example.nodes.map(id => ({ id })), directed: example.directed,
      edges: example.edges.map(([source, destination, weight]) => ({ source, destination, weight })) }, example.algorithm);
    for (const [field, value] of Object.entries(example.expected)) assert.deepEqual(result[field], value, field);
  });
}
