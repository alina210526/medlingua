const STORAGE_KEY = "medlingua.words.v1";
const KNOWN_KEY = "medlingua.known.v1";
const starterWords = [
  { id: 1, latin: "Cor, cordis n", russian: "сердце" },
  { id: 2, latin: "Pulmo, onis m", russian: "лёгкое" },
  { id: 3, latin: "Os, ossis n", russian: "кость" },
  { id: 4, latin: "Musculus, i m", russian: "мышца" },
  { id: 5, latin: "Vena, ae f", russian: "вена" },
  { id: 6, latin: "Arteria, ae f", russian: "артерия" },
  { id: 7, latin: "Nervus, i m", russian: "нерв" },
  { id: 8, latin: "Ren, renis m", russian: "почка" }
];

function readJSON(key, fallback) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}
let words = readJSON(STORAGE_KEY, starterWords);
let knownIds = readJSON(KNOWN_KEY, []);
let cardIndex = 0;
let cardDirection = "la";
let revealed = false;
let quizDirection = "la";
let quizCurrentId = null;
let quizChecked = false;
let quizScore = 0;
let quizTotal = 0;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const normalize = (s) => String(s ?? "").trim().toLocaleLowerCase("ru").replace(/\s+/g, " ");
const save = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  localStorage.setItem(KNOWN_KEY, JSON.stringify(knownIds));
};
const currentWord = () => words.length ? words[((cardIndex % words.length) + words.length) % words.length] : null;

function renderStats() {
  $("#wordCount").textContent = words.length;
  $("#knownCount").textContent = knownIds.filter(id => words.some(w => w.id === id)).length;
  const count = knownIds.filter(id => words.some(w => w.id === id)).length;
  $("#progress").textContent = words.length ? `${Math.round(count / words.length * 100)}%` : "0%";
}
function renderCard() {
  const word = currentWord();
  $("#cardCounter").textContent = words.length ? `${cardIndex + 1} / ${words.length}` : "0 / 0";
  $("#cardLabel").textContent = cardDirection === "la" ? "ЛАТИНСКИЙ ТЕРМИН" : "РУССКИЙ ПЕРЕВОД";
  $("#cardPrompt").textContent = word ? (cardDirection === "la" ? word.latin : word.russian) : "Добавь первые слова";
  $("#cardAnswer").textContent = word ? (cardDirection === "la" ? word.russian : word.latin) : "";
  $("#cardAnswer").classList.toggle("hidden", !revealed || !word);
  $("#revealBtn").textContent = revealed ? "Скрыть ответ" : "Показать перевод";
  $("#revealBtn").disabled = !word;
  $("#knownBtn").disabled = !word;
  $$(".choice[data-direction]").forEach(b => b.classList.toggle("active", b.dataset.direction === cardDirection));
}
function renderDictionary() {
  const query = normalize($("#searchInput").value);
  const shown = words.filter(w => normalize(`${w.latin} ${w.russian}`).includes(query));
  $("#wordList").innerHTML = "";
  if (!shown.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = words.length ? "Ничего не найдено." : "Словарь пуст — добавь первое слово выше.";
    $("#wordList").append(empty);
    return;
  }
  shown.forEach(word => {
    const item = document.createElement("article");
    item.className = "word-item";
    const info = document.createElement("div");
    info.className = "word-info";
    const latin = document.createElement("strong");
    latin.textContent = word.latin;
    const russian = document.createElement("span");
    russian.textContent = word.russian;
    info.append(latin, russian);
    if (knownIds.includes(word.id)) {
      const tag = document.createElement("span");
      tag.className = "known-tag";
      tag.textContent = "✓ Выучено";
      info.append(tag);
    }
    const del = document.createElement("button");
    del.className = "icon-button";
    del.textContent = "Удалить";
    del.setAttribute("aria-label", `Удалить ${word.latin}`);
    del.addEventListener("click", () => {
      if (!confirm(`Удалить слово «${word.latin}»?`)) return;
      words = words.filter(w => w.id !== word.id);
      knownIds = knownIds.filter(id => id !== word.id);
      save(); renderAll();
      $("#dictionaryStatus").textContent = "Слово удалено.";
    });
    item.append(info, del);
    $("#wordList").append(item);
  });
}
function renderAll() { renderStats(); renderCard(); renderDictionary(); renderQuizPrompt(); }

function setView(name) {
  $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  $$(".view").forEach(v => v.classList.toggle("active", v.id === `view-${name}`));
  if (name === "quiz") renderQuizPrompt();
}
$$(".tab").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));

$$(".choice[data-direction]").forEach(button => button.addEventListener("click", () => {
  cardDirection = button.dataset.direction; revealed = false; renderCard();
}));
$("#revealBtn").addEventListener("click", () => { revealed = !revealed; renderCard(); });
$("#prevCard").addEventListener("click", () => { if (words.length) cardIndex = (cardIndex - 1 + words.length) % words.length; revealed = false; renderCard(); });
$("#nextCard").addEventListener("click", () => { if (words.length) cardIndex = (cardIndex + 1) % words.length; revealed = false; renderCard(); });
$("#knownBtn").addEventListener("click", () => {
  const word = currentWord(); if (!word) return;
  if (!knownIds.includes(word.id)) knownIds.push(word.id);
  save(); renderStats(); renderDictionary();
  cardIndex = words.length ? (cardIndex + 1) % words.length : 0;
  revealed = false; renderCard();
});

$("#addForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const latin = $("#latinInput").value.trim();
  const russian = $("#russianInput").value.trim();
  if (!latin || !russian) return;
  const duplicate = words.some(w => normalize(w.latin) === normalize(latin) && normalize(w.russian) === normalize(russian));
  if (duplicate) { $("#dictionaryStatus").textContent = "Такая пара уже есть в словаре."; return; }
  words.push({ id: Date.now() + Math.floor(Math.random() * 1000), latin, russian });
  save(); renderAll(); $("#addForm").reset();
  $("#dictionaryStatus").textContent = "Слово добавлено.";
});
$("#searchInput").addEventListener("input", renderDictionary);

function parseLines(text) {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const parts = line.split(/\s+[—–]\s+|\s*;\s*|\t+|\s+-\s+/);
    if (parts.length < 2) return null;
    const latin = parts.shift().trim();
    const russian = parts.join(" — ").trim();
    return latin && russian ? { latin, russian } : null;
  }).filter(Boolean);
}
function importText(text) {
  const parsed = parseLines(text);
  let added = 0, skipped = 0;
  parsed.forEach(entry => {
    if (words.some(w => normalize(w.latin) === normalize(entry.latin) && normalize(w.russian) === normalize(entry.russian))) { skipped++; return; }
    words.push({ id: Date.now() + Math.floor(Math.random() * 1000000) + added, ...entry });
    added++;
  });
  save(); renderAll();
  $("#importStatus").textContent = parsed.length
    ? `Добавлено: ${added}. Пропущено повторов: ${skipped}.`
    : "Не удалось распознать слова. Используй формат: латынь — русский.";
}
$("#importBtn").addEventListener("click", () => importText($("#bulkInput").value));
$("#fileInput").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  $("#bulkInput").value = text;
  $("#importStatus").textContent = `Файл «${file.name}» загружен. Нажми «Импортировать слова».`;
});
$("#exportBtn").addEventListener("click", () => {
  const csv = ["Латинский;Русский", ...words.map(w => `${csvCell(w.latin)};${csvCell(w.russian)}`)].join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "medlingua-словарь.csv"; a.click();
  URL.revokeObjectURL(url);
});
function csvCell(value) { return `"${String(value).replace(/"/g, '""')}"`; }

function pickQuizWord() {
  if (!words.length) { quizCurrentId = null; return; }
  const options = words.filter(w => w.id !== quizCurrentId);
  const pool = options.length ? options : words;
  quizCurrentId = pool[Math.floor(Math.random() * pool.length)].id;
  quizChecked = false;
}
function renderQuizPrompt() {
  const word = words.find(w => w.id === quizCurrentId);
  if (!word && words.length) { pickQuizWord(); return renderQuizPrompt(); }
  $("#quizPrompt").textContent = word ? (quizDirection === "la" ? word.latin : word.russian) : "Добавь слова, чтобы начать";
  $("#quizInput").value = "";
  $("#quizInput").disabled = !word || quizChecked;
  $("#quizForm").querySelector("button").disabled = !word || quizChecked;
  $("#nextQuestion").disabled = !word || !quizChecked;
  $("#quizFeedback").textContent = "";
  $("#quizFeedback").className = "";
  $("#quizScore").textContent = `${quizScore} / ${quizTotal}`;
  $$(".choice[data-quiz-direction]").forEach(b => b.classList.toggle("active", b.dataset.quizDirection === quizDirection));
}
$$(".choice[data-quiz-direction]").forEach(button => button.addEventListener("click", () => {
  quizDirection = button.dataset.quizDirection; quizChecked = false; pickQuizWord(); renderQuizPrompt();
}));
$("#quizForm").addEventListener("submit", event => {
  event.preventDefault();
  const word = words.find(w => w.id === quizCurrentId);
  if (!word || quizChecked) return;
  const expected = quizDirection === "la" ? word.russian : word.latin;
  const answer = $("#quizInput").value;
  const correct = normalize(answer) === normalize(expected);
  quizTotal++; if (correct) quizScore++;
  quizChecked = true;
  $("#quizFeedback").textContent = correct ? "Верно! Отличная работа." : `Правильный ответ: ${expected}`;
  $("#quizFeedback").className = correct ? "feedback-good" : "feedback-bad";
  $("#quizInput").disabled = true;
  $("#quizForm").querySelector("button").disabled = true;
  $("#nextQuestion").disabled = false;
  $("#quizScore").textContent = `${quizScore} / ${quizTotal}`;
});
$("#nextQuestion").addEventListener("click", () => { pickQuizWord(); renderQuizPrompt(); $("#quizInput").focus(); });
$("#resetQuiz").addEventListener("click", () => { quizScore = 0; quizTotal = 0; quizChecked = false; pickQuizWord(); renderQuizPrompt(); });

if (!Array.isArray(words)) words = starterWords;
if (!Array.isArray(knownIds)) knownIds = [];
renderAll();
