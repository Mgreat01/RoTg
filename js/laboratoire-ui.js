// Les aides visuelles restent indépendantes du moteur de calcul.
const tools = [document.getElementById('nodeTool'), document.getElementById('edgeTool')];
const hint = document.getElementById('drawingHint');
tools.forEach((tool, index) => tool.addEventListener('click', () => {
  setMode(index === 0 ? 'node' : 'edge');
  tools.forEach((button, selected) => button.setAttribute('aria-pressed', String(selected === index)));
  hint.textContent = index === 0
    ? 'Touchez la feuille pour ajouter un sommet.'
    : 'Sélectionnez le sommet de départ, puis celui d’arrivée, et saisissez le poids.';
}));
const notes = {
  dijkstra: 'Plus court chemin. Les poids doivent être positifs ou nuls.',
  bellman: 'Plus court chemin. Accepte les poids négatifs et détecte les cycles négatifs accessibles.',
  floyd: 'Distances entre toutes les paires de sommets. Limité à 100 sommets.',
  dfs: 'Visite les sommets en profondeur. Le résultat est un ordre de visite.',
  bfs: 'Visite les sommets par niveaux. Le résultat est un ordre de visite.',
  kruskal: 'Forêt couvrante de poids minimal. Choisissez un graphe non orienté.',
  longest: 'Plus long chemin dans un graphe orienté sans cycle (DAG).',
};
const method = document.getElementById('algoSelect');
function updateNote() { document.getElementById('methodNote').textContent = notes[method.value]; }
method.addEventListener('change', updateNote);
updateNote();
