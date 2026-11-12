"use strict";
const normalizeCourseText = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const lessons = [...document.querySelectorAll("[data-lesson]")];
const search = document.getElementById("courseSearch");
const category = document.getElementById("courseCategory");
function filterCourses() {
  const words = normalizeCourseText(search.value).trim().split(/\s+/).filter(Boolean);
  let count = 0;
  lessons.forEach(lesson => {
    const matches = (!category.value || lesson.dataset.category === category.value) &&
      words.every(word => normalizeCourseText(lesson.dataset.search).includes(word));
    lesson.hidden = !matches;
    const item = document.querySelector(`[data-toc="${lesson.id}"]`);
    if (item) item.hidden = !matches;
    if (matches) count++;
  });
  document.getElementById("courseCount").textContent = `${count} chapitre${count === 1 ? "" : "s"} disponible${count === 1 ? "" : "s"}.`;
  document.getElementById("noCourses").hidden = count !== 0;
}
function openCourseHash() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (!target?.hasAttribute("data-lesson")) return;
  if (target.hidden) { search.value = ""; category.value = ""; filterCourses(); }
  target.open = true;
  target.scrollIntoView({block: "start"});
}
search.addEventListener("input", filterCourses);
category.addEventListener("change", filterCourses);
document.getElementById("courseFilters").hidden = false;
window.addEventListener("hashchange", openCourseHash);
openCourseHash();
document.querySelectorAll(".quiz").forEach(form => {
  form.querySelector("button").disabled = false;
  form.addEventListener("change", () => {
    const feedback = form.querySelector(".feedback");
    feedback.textContent = "";
    delete feedback.dataset.correct;
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const answer = form.querySelector("input:checked");
    const feedback = form.querySelector(".feedback");
    if (!answer) { feedback.textContent = "Choisissez une réponse avant de vérifier."; return; }
    const correct = answer.value === form.dataset.correct;
    feedback.textContent = correct ? `Bonne réponse. ${form.dataset.explanation}` : `Réessayez. Indice : ${form.dataset.hint}`;
    feedback.dataset.correct = String(correct);
  });
});
