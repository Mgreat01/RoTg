const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list = values => `<ul>${values.map(value => `<li>${escape(value)}</li>`).join('')}</ul>`;
const section = (title, body) => `<section><h3>${escape(title)}</h3>${body}</section>`;

function figure(lesson) {
  const graph = lesson.workshop.graph;
  if (!graph) return '';
  const byId = new Map(graph.nodes.map(n => [n.id, n]));
  const marker = `arrow-${lesson.id}`;
  const edges = graph.edges.map(e => {
    const a = byId.get(e.source), b = byId.get(e.destination);
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const dx = (b.x - a.x) * 20 / length, dy = (b.y - a.y) * 20 / length;
    return `<line x1="${a.x + dx}" y1="${a.y + dy}" x2="${b.x - dx}" y2="${b.y - dy}" ${graph.directed ? `marker-end="url(#${marker})"` : ''}/><text class="weight" x="${(a.x+b.x)/2 + 7}" y="${(a.y+b.y)/2 - 7}">${escape(e.weight)}</text>`;
  }).join('');
  const nodes = graph.nodes.map(n => `<circle cx="${n.x}" cy="${n.y}" r="18"/><text class="node-label" x="${n.x}" y="${n.y+5}">${escape(n.id)}</text>`).join('');
  return `<figure><svg viewBox="0 0 360 220" role="img" aria-labelledby="figure-${lesson.id}"><title id="figure-${lesson.id}">Exemple ${graph.directed ? 'orienté' : 'non orienté'} du chapitre ${escape(lesson.title)}</title><defs><marker id="${marker}" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z"/></marker></defs>${edges}${nodes}</svg><figcaption>Exemple du chapitre · ${graph.directed ? 'arcs orientés' : 'arêtes non orientées'} · les nombres sur les connexions indiquent leurs poids.</figcaption></figure>`;
}
function workshopLink(workshop) {
  if (!workshop.graph) return '';
  const payload = encodeURIComponent(JSON.stringify({graph:workshop.graph,algorithm:workshop.algorithm ?? null}));
  return `<a class="button" href="exercices.html#course=${payload}">Ouvrir cet exemple dans le laboratoire →</a>`;
}
function renderLesson(lesson, index, sources) {
  const quiz = lesson.quiz.map((question, i) => `<form class="quiz" data-correct="${question.correctIndex}" data-explanation="${escape(question.explanation)}" data-hint="${escape(question.hint)}"><fieldset><legend>${escape(question.prompt)}</legend>${question.options.map((option, j) => `<label class="answer"><input type="radio" name="answer-${lesson.id}-${i}" value="${j}"> ${escape(option)}</label>`).join('')}<button type="submit" disabled>Vérifier ma réponse</button><p class="feedback" role="status" aria-live="polite"></p></fieldset></form>`).join('');
  const table = lesson.table ? `<div class="table-scroll"><table><thead><tr>${lesson.table.columns.map(c => `<th scope="col">${escape(c)}</th>`).join('')}</tr></thead><tbody>${lesson.table.rows.map(row => `<tr>${row.map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  const refs = lesson.sourceIds.map(id => sources.find(s => s.id === id)).map(source => `<li><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)} ↗</a><span class="muted"> · ${escape(source.language)} · ressource externe</span></li>`).join('');
  const search = [lesson.title,lesson.summary,lesson.definition,...lesson.objectives,...lesson.sections.flatMap(s => [s.title,...s.paragraphs])].join(' ');
  return `<details class="lesson" id="${lesson.id}" data-lesson data-category="${escape(lesson.category)}" data-search="${escape(search)}">
<summary><span class="chapter-number">${String(index+1).padStart(2,'0')}</span><span><span class="eyebrow">${escape(lesson.category)} · ${escape(lesson.level)} · ${lesson.minutes} min indicatives</span><span class="chapter-title">${escape(lesson.title)}</span><span class="muted">${escape(lesson.summary)}</span></span></summary>
<div class="lesson-body">
${section('Objectifs pédagogiques',list(lesson.objectives))}
<p class="prerequisites"><strong>Prérequis.</strong> ${escape(lesson.prerequisites)}</p>
${section('Définition',`<p>${escape(lesson.definition)}</p>`)}
${lesson.sections.map(s => section(s.title,s.paragraphs.map(p => `<p>${escape(p)}</p>`).join(''))).join('')}
${section('Formules et conventions',lesson.formulas.map(f => `<pre class="formula">${escape(f)}</pre>`).join(''))}
${figure(lesson)}
${section('Exemple résolu',`<p>${escape(lesson.example.statement)}</p><ol>${lesson.example.steps.map(s => `<li>${escape(s)}</li>`).join('')}</ol><p class="takeaway">${escape(lesson.example.answer)}</p>${table}`)}
${section('Pseudocode',`<pre><code>${escape(lesson.pseudocode)}</code></pre>`)}
${section('Complexité et limites',`<p>${escape(lesson.complexity)}</p>`)}
${section('Activité guidée',list(lesson.workshop.instructions)+workshopLink(lesson.workshop))}
${section('À vous de résoudre',`<p>${escape(lesson.exercise.prompt)}</p>${lesson.exercise.hints.map((hint,i) => `<details class="hint"><summary>Indice ${i+1}</summary><p>${escape(hint)}</p></details>`).join('')}<details class="correction"><summary>Afficher la correction détaillée</summary><ol>${lesson.exercise.solution.map(s => `<li>${escape(s)}</li>`).join('')}</ol></details>`)}
${section('Quiz de compréhension',quiz)}
${section('Pour approfondir',`<ul class="sources">${refs}</ul>`)}
<a href="#chapitres" class="back-to-top">Retour au sommaire ↑</a>
</div></details>`;
}
function renderCatalog(catalog) {
  if (catalog.schemaVersion !== '1.0') throw new Error('Version de catalogue non prise en charge.');
  const categories = [...new Set(catalog.lessons.map(l => l.category))];
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="Treize cours en français sur les graphes et la recherche opérationnelle, avec exemples corrigés, quiz et activités.">
<title>Cours et exercices corrigés | GraphX Lab</title><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="site.css"><script defer src="js/cours.js"></script></head>
<body><a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header"><a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">↗</span> GraphX Lab</a><nav aria-label="Navigation principale"><a href="index.html">Accueil</a><a href="cours.html" aria-current="page">Cours</a><a href="exercices.html">Laboratoire</a></nav></header>
<main id="contenu"><div class="hero"><p class="eyebrow">La bibliothèque</p><h1>Le cours à portée de main.</h1><p>Une notion à revoir, un exercice à préparer ? Choisissez un chapitre et avancez à votre rythme, avec les exemples, les indices et les corrections.</p><div class="stats"><span><strong>${catalog.lessons.length}</strong> chapitres</span><span><strong>${catalog.lessons.reduce((n,l) => n+l.quiz.length,0)}</strong> quiz corrigés</span><span>Lecture locale · sans compte</span></div></div>
<div class="course-layout"><aside id="chapitres"><h2>Votre parcours</h2><p class="muted">Suivez l’ordre proposé ou choisissez une notion.</p><ol class="toc">${catalog.lessons.map(l => `<li data-toc="${l.id}"><a href="#${l.id}">${escape(l.title)}</a></li>`).join('')}</ol></aside>
<div class="course-content"><div class="filters" id="courseFilters" hidden><label for="courseSearch">Rechercher une notion<input id="courseSearch" type="search" placeholder="Ex. : cycle négatif, transport…" autocomplete="off"></label><label for="courseCategory">Domaine<select id="courseCategory"><option value="">Tous les domaines</option>${categories.map(c => `<option>${escape(c)}</option>`).join('')}</select></label><p id="courseCount" role="status" aria-live="polite">${catalog.lessons.length} chapitres disponibles.</p></div>
<noscript><p>Les cours, indices et corrections sont lisibles sans JavaScript. Activez JavaScript pour la recherche et la validation des quiz.</p></noscript>
<p id="noCourses" hidden>Aucun chapitre ne correspond à votre recherche. Essayez un autre terme.</p>
${catalog.lessons.map((l,i) => renderLesson(l,i,catalog.sources)).join('\n')}
</div></div><section class="editorial"><h2>Des bases solides, des ressources pour aller plus loin.</h2><p>${escape(catalog.editorial)}</p><p>Les références universitaires s’ouvrent dans un nouvel onglet et nécessitent une connexion. Les leçons de cette page sont déjà présentes dans le document : aucun chargement distant n’est nécessaire pour les lire.</p></section></main>
<footer><span>GraphX Lab</span><span>Cours mis à jour le ${escape(catalog.updatedAt)}</span><a href="exercices.html">Ouvrir le laboratoire →</a></footer></body></html>\n`;
}
if (require.main === module) {
  const source = path.join(root,'content/courses.json');
  const catalog = JSON.parse(fs.readFileSync(source,'utf8'));
  fs.writeFileSync(path.join(root,'cours.html'),renderCatalog(catalog));
  const flag = process.argv.indexOf('--mobile-output');
  if (flag >= 0) {
    if (!process.argv[flag+1]) throw new Error('Destination mobile manquante.');
    const target = path.resolve(process.argv[flag+1]);
    fs.mkdirSync(path.dirname(target),{recursive:true}); fs.copyFileSync(source,target);
  }
  console.log(`${catalog.lessons.length} chapitres intégrés à cours.html.`);
}
module.exports = {renderCatalog,workshopLink};
