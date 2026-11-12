const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const catalog = require('../content/courses.json');
const engine = require('../js/graphe.js');
const {renderCatalog,workshopLink} = require('../tools/build-courses.cjs');

test('treize chapitres rédigés avec tous les éléments pédagogiques', () => {
  assert.equal(catalog.lessons.length,13);
  assert.equal(new Set(catalog.lessons.map(c=>c.id)).size,13);
  const sourceIds = new Set(catalog.sources.map(s=>s.id));
  for (const course of catalog.lessons) {
    assert.match(course.id,/^[a-z0-9-]+$/);
    assert.ok(course.objectives.length >= 2,course.id);
    assert.ok(course.sections.length >= 2,course.id);
    assert.ok(course.example.steps.length >= 2,course.id);
    assert.ok(course.exercise.hints.length >= 2,course.id);
    assert.ok(course.exercise.solution.length >= 2,course.id);
    assert.ok(course.pseudocode.includes('\n'),course.id);
    assert.ok(course.complexity.length > 60,course.id);
    assert.ok(course.sourceIds.length && course.sourceIds.every(id=>sourceIds.has(id)),course.id);
    for (const question of course.quiz) {
      assert.ok(question.options.length >= 3);
      assert.ok(Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < question.options.length);
      assert.notEqual(question.hint,question.explanation);
    }
  }
});
for (const course of catalog.lessons.filter(c=>c.workshop.algorithm)) {
  test(`l'exemple pédagogique produit le résultat annoncé : ${course.id}`, () => {
    const result = engine.run(course.workshop.graph,course.workshop.algorithm);
    assert.equal(result.status,'success');
    for (const [field,value] of Object.entries(course.workshop.expected)) assert.deepEqual(result[field],value,field);
  });
}
test('validation indépendante des exemples de programmation linéaire, transport, affectation et CPM', () => {
  const vertices = [[0,0],[4,0],[3,2],[0,5]];
  assert.ok(vertices.every(([x,y])=>2*x+y<=8 && x+y<=5 && x>=0 && y>=0));
  assert.equal(Math.max(...vertices.map(([x,y])=>3*x+2*y)),13);
  const transportCosts = [];
  for (let t=0;t<=2;t++) transportCosts.push(t+4*(3-t)+3*(2-t)+2*t);
  assert.deepEqual(transportCosts,[18,14,10]);
  const costs = [[4,1,3],[2,0,5],[3,2,2]], assignments = [];
  for(let a=0;a<3;a++) for(let b=0;b<3;b++) for(let c=0;c<3;c++) {
    if (new Set([a,b,c]).size===3) assignments.push(costs[0][a]+costs[1][b]+costs[2][c]);
  }
  assert.equal(Math.min(...assignments),5);
  const durations=[3,2,4,2], parents=[[],[0],[0],[1,2]], es=[],ef=[];
  parents.forEach((p,i)=>{es[i]=Math.max(0,...p.map(j=>ef[j]));ef[i]=es[i]+durations[i];});
  assert.deepEqual(es,[0,3,3,7]);assert.deepEqual(ef,[3,5,7,9]);
  assert.equal((2+4*5+8)/6,5); assert.equal(((8-2)/6)**2,1);
});
test('page statique complète, reproductible et sans liens de chapitres factices', () => {
  const html=fs.readFileSync(path.join(__dirname,'../cours.html'),'utf8');
  assert.equal(html,renderCatalog(catalog));
  assert.doesNotMatch(html,/href="#"|Eza koya|cdn\.tailwindcss|<iframe/i);
  for(const course of catalog.lessons) {
    assert.ok(html.includes(`id="${course.id}"`));
    assert.ok(html.includes(`href="#${course.id}"`));
  }
  assert.equal((html.match(/data-lesson /g)||[]).length,13);
  const escaped = renderCatalog({...catalog,lessons:[{...catalog.lessons[0],title:'<script>alert("x")</script>'}]});
  assert.ok(escaped.includes('&lt;script&gt;')); assert.doesNotMatch(escaped,/<script>alert/);
});

function mountCourses() {
  const element = value=>({value,hidden:false,events:{},dataset:{},textContent:'',addEventListener(name,fn){this.events[name]=fn;}});
  const first={...element(),id:'chemins',dataset:{search:'Dijkstra et les cycles négatifs',category:'Graphes'},hasAttribute:()=>true,scrollIntoView(){}};
  const second={...element(),id:'transport',dataset:{search:'Problème de transport',category:'RO'}};
  const output=element(), submit=element();submit.disabled=true;
  let selected=null;
  const form={...element(),dataset:{correct:'1',explanation:'Les contraintes sont satisfaites.',hint:'Vérifiez la faisabilité.'},querySelector(selector){return selector==='button'?submit:selector==='.feedback'?output:selected;}};
  const elements={courseSearch:element(''),courseCategory:element(''),courseCount:element(),noCourses:element(),courseFilters:element(),chemins:first};
  const scope=vm.createContext({document:{getElementById:id=>elements[id]??null,querySelector:()=>element(),querySelectorAll:selector=>selector==='[data-lesson]'?[first,second]:[form]},location:{hash:''},window:{addEventListener(){}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/cours.js'),'utf8'),scope);
  return {elements,first,second,output,form,submit,select(value){selected={value};}};
}
test('recherche insensible aux accents, filtres et état vide', () => {
  const ui=mountCourses();ui.elements.courseSearch.value='negatifs';ui.elements.courseSearch.events.input();
  assert.equal(ui.first.hidden,false);assert.equal(ui.second.hidden,true);
  ui.elements.courseCategory.value='RO';ui.elements.courseCategory.events.change();
  assert.equal(ui.first.hidden,true);assert.equal(ui.elements.noCourses.hidden,false);
});
test('quiz : retour progressif, sans correction révélée sur erreur', () => {
  const ui=mountCourses(),submit=()=>ui.form.events.submit({preventDefault(){}});
  assert.equal(ui.submit.disabled,false);submit();assert.match(ui.output.textContent,/Choisissez/);
  ui.select('0');submit();assert.match(ui.output.textContent,/Indice/);assert.doesNotMatch(ui.output.textContent,/Les contraintes sont satisfaites/);
  ui.select('1');submit();assert.match(ui.output.textContent,/Bonne réponse/);assert.match(ui.output.textContent,/Les contraintes sont satisfaites/);
});
function mountExample(raw) {
  const ctx=new Proxy({}, {get:(object,key)=>object[key]??(()=>{})});
  const el=value=>({value,textContent:'',addEventListener(){}});
  const elements={graphCanvas:{...el(),width:1000,height:600,getContext:()=>ctx},output:el(),directionSelect:el('directed'),algoSelect:el('dijkstra'),runButton:el()};
  const scope=vm.createContext({document:{getElementById:id=>elements[id]},GraphEngine:engine,URLSearchParams,window:{location:{hash:`#course=${encodeURIComponent(raw)}`}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../script.js'),'utf8'),scope);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/course-example.js'),'utf8'),scope);
  return {scope,elements};
}
test('lien de cours : exemple ouvert puis calcul réel dans le laboratoire', () => {
  const course=catalog.lessons.find(c=>c.id==='plus-courts-chemins');
  const link=workshopLink(course.workshop);assert.ok(link.includes('exercices.html#course='));
  const ui=mountExample(JSON.stringify(course.workshop));
  assert.match(ui.elements.output.textContent,/Exemple du cours chargé/);
  assert.equal(vm.runInContext('result',ui.scope),null);
  vm.runInContext('runAlgorithm()',ui.scope);
  assert.match(ui.elements.output.textContent,/coût : 5/);
});
test('exemples mal formés refusés sans modifier le graphe', () => {
  for (const raw of ['null','{}','pas du JSON',JSON.stringify({graph:{directed:true,nodes:[{id:1,x:Infinity,y:0}],edges:[]}})]) {
    const ui=mountExample(raw);assert.match(ui.elements.output.textContent,/Impossible/);
    assert.equal(vm.runInContext('nodes.length',ui.scope),0);
  }
});
