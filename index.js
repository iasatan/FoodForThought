const app = document.getElementById('app');

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}. ${m}. ${d}.`;
}

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function offsetDate(n) {
  const dt = new Date();
  dt.setDate(dt.getDate() + n);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

function dayLabel(n) {
  if (n === 0) return 'Ma';
  if (n === 1) return 'Holnap';
  if (n === -1) return 'Tegnap';
  const [, m, d] = offsetDate(n).split('-').map(Number);
  const HU_MONTHS = ['jan.','febr.','márc.','ápr.','máj.','jún.','júl.','aug.','szept.','okt.','nov.','dec.'];
  return `${HU_MONTHS[m-1]} ${d}.`;
}

let activeType = localStorage.getItem('mealType') || 'lunch';
let dayOffset = 0;
let includeIngredient = '';
let excludeIngredient = '';

function getDataset() {
  return activeType === 'lunch' ? FOODS_DATA : BREAKFAST_DATA;
}

function normalizeText(value) {
  return value.toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchesIngredient(meal, searchTerm) {
  if (!searchTerm) return true;
  const ingredients = (meal.ingredients || []).map(normalizeText);
  return ingredients.some(ingredient => ingredient.includes(normalizeText(searchTerm)));
}

function ingredientTerms(value) {
  return value.split(',').map(term => term.trim()).filter(Boolean);
}

function getFilteredDataset() {
  return getDataset().filter(meal =>
    ingredientTerms(includeIngredient).every(term => matchesIngredient(meal, term))
      && ingredientTerms(excludeIngredient).every(term => !matchesIngredient(meal, term))
  );
}

function dislikedKey() {
  return 'disliked-' + activeType;
}

function loadDisliked() {
  return new Set(JSON.parse(sessionStorage.getItem(dislikedKey()) || '[]'));
}

// Disliked IDs are tracked per meal type, session only
let disliked = loadDisliked();

function saveDisliked() {
  sessionStorage.setItem(dislikedKey(), JSON.stringify([...disliked]));
}

function pickRandom() {
  const pool = getFilteredDataset().filter(m => !disliked.has(m.id));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function render(meal) {
  if (!meal) {
    const filteredData = getFilteredDataset();
    const exhausted = filteredData.length > 0 && filteredData.every(m => disliked.has(m.id));
    if (exhausted) {
      app.innerHTML = `<div class="all-disliked">Minden ételt elutasítottál. <button onclick="resetDisliked()" style="color:#464feb;background:none;border:none;cursor:pointer;font-size:inherit;text-decoration:underline;">Újrakezdés</button></div>`;
    } else if (filteredData.length === 0) {
      app.innerHTML = '<div class="no-meal">Nincs az összetevőfeltételeknek megfelelő étel.</div>';
    } else {
      app.innerHTML = '<div class="no-meal"><strong>Ma nincs tervezett étel.</strong> Nézd meg a <a href="shopping.html">bevásárlólistát</a> a közelgő napokhoz.</div>';
    }
    return;
  }

  const imgUrl = `https://source.unsplash.com/560x240/?${encodeURIComponent(meal.name)},food`;

  const ingredientsHtml = meal.ingredients && meal.ingredients.length
    ? `<h3>Hozzávalók</h3><ul class="ingredient-list">${meal.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>`
    : '';

  const dislikeBtnHtml = dayOffset === 0 ? `
    <button class="dislike-btn" onclick="dislikeCurrent(${meal.id})">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
        <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
      </svg>
      Nem kérem, mást kérek
    </button>` : '';

  app.innerHTML = `
    <p class="date-label">${formatDate(meal.date)}</p>
    <div class="meal-card">
      <img class="meal-img" src="${imgUrl}" alt="${meal.name}" onerror="this.style.display='none'" />
      <h2>${meal.name}</h2>
      ${ingredientsHtml}
    </div>
    ${dislikeBtnHtml}`;
}

function updateToggleUI() {
  document.getElementById('btn-lunch').classList.toggle('active', activeType === 'lunch');
  document.getElementById('btn-breakfast').classList.toggle('active', activeType === 'breakfast');
}

function updateDayNav() {
  const dates = getFilteredDataset().map(m => m.date).sort();
  const lbl = document.getElementById('day-label');
  lbl.textContent = dayLabel(dayOffset);
  lbl.className = 'day-nav-label' + (dayOffset === 0 ? ' today' : '');
  document.getElementById('btn-prev').disabled = !dates.length || offsetDate(dayOffset - 1) < dates[0];
  document.getElementById('btn-next').disabled = !dates.length || offsetDate(dayOffset + 1) > dates[dates.length - 1];
}

function loadMealForType() {
  const data = getFilteredDataset();
  const targetDate = offsetDate(dayOffset);
  if (dayOffset !== 0) {
    return data.find(item => item.date === targetDate) || null;
  }
  const day = new Date().getDate(); // 1–31
  const fallbackId = Math.min(day, data.length);
  return data.find(item => item.date === targetDate && !disliked.has(item.id))
      || data.find(item => item.id === fallbackId && !disliked.has(item.id))
      || pickRandom();
}

window.setType = function(type) {
  activeType = type;
  localStorage.setItem('mealType', type);
  disliked = loadDisliked();
  updateToggleUI();
  updateDayNav();
  render(loadMealForType());
};

window.stepDay = function(delta) {
  dayOffset += delta;
  updateDayNav();
  render(loadMealForType());
};

window.dislikeCurrent = function(id) {
  disliked.add(id);
  saveDisliked();
  render(pickRandom());
};

window.resetDisliked = function() {
  disliked.clear();
  saveDisliked();
  render(pickRandom());
};

function updateIngredientFilters() {
  includeIngredient = document.getElementById('include-ingredient').value.trim();
  excludeIngredient = document.getElementById('exclude-ingredient').value.trim();
  dayOffset = 0;
  updateDayNav();
  render(loadMealForType());
}

document.getElementById('include-ingredient').addEventListener('input', updateIngredientFilters);
document.getElementById('exclude-ingredient').addEventListener('input', updateIngredientFilters);

updateToggleUI();
updateDayNav();
render(loadMealForType());
