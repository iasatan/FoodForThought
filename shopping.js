const app   = document.getElementById('app');
const sub   = document.getElementById('subtitle');
const range = document.getElementById('range');

const HU_DAYS = ['Vasárnap','Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat'];
const HU_MONTHS = ['január','február','március','április','május','június',
                   'július','augusztus','szeptember','október','november','december'];

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

function formatDateHu(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}. ${HU_MONTHS[m-1]} ${d}.`;
}

function dayName(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return HU_DAYS[new Date(y, m-1, d).getDay()];
}

function addDays(str, n) {
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(y, m-1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

let allData = [];

function render() {
  const val   = range.value;
  const today = todayStr();
  let meals;

  if (val === 'all') {
    meals = allData;
  } else {
    const days  = parseInt(val);
    const limit = addDays(today, days);
    meals = allData.filter(m => m.date >= today && m.date < limit);
  }

  if (meals.length === 0) {
    app.innerHTML = `<div class="no-items"><strong>Nincs étel ebben az időszakban.</strong></div>`;
    sub.textContent = '';
    return;
  }

  sub.textContent = `${meals.length} étel, ${meals.reduce((s,m) => s + m.ingredients.length, 0)} hozzávaló`;

  app.innerHTML = meals.map(meal => {
    const isToday = meal.date === today;
    return `
      <div class="day-card${isToday ? ' today' : ''}" id="card-${meal.id}">
        <div class="day-header" onclick="toggleCard(${meal.id})">
          <div class="day-info">
            <span class="day-name">${dayName(meal.date)} ${isToday ? '<span class="today-badge">Ma</span>' : ''}</span>
            <span class="day-date">${formatDateHu(meal.date)}</span>
          </div>
          <span class="chevron" id="chev-${meal.id}">▼</span>
        </div>
        <div class="day-body${isToday ? ' open' : ''}" id="body-${meal.id}">
          <div class="meal-name">${meal.name}</div>
          <ul class="ingredient-list">
            ${meal.ingredients.map((ing, i) => `
              <li id="li-${meal.id}-${i}" onclick="toggleItem(${meal.id},${i})">
                <input type="checkbox" id="cb-${meal.id}-${i}" onclick="event.stopPropagation();toggleItem(${meal.id},${i})" />
                ${ing}
              </li>`).join('')}
          </ul>
        </div>
      </div>`;
  }).join('');

  // Restore checked state from sessionStorage
  meals.forEach(meal => {
    meal.ingredients.forEach((_, i) => {
      if (sessionStorage.getItem(`check-${meal.id}-${i}`) === '1') {
        const li = document.getElementById(`li-${meal.id}-${i}`);
        const cb = document.getElementById(`cb-${meal.id}-${i}`);
        if (li) li.classList.add('checked');
        if (cb) cb.checked = true;
      }
    });
  });
}

window.toggleCard = function(id) {
  const body = document.getElementById(`body-${id}`);
  const chev = document.getElementById(`chev-${id}`);
  const open = body.classList.toggle('open');
  chev.style.transform = open ? 'rotate(180deg)' : '';
};

window.toggleItem = function(mealId, idx) {
  const li = document.getElementById(`li-${mealId}-${idx}`);
  const cb = document.getElementById(`cb-${mealId}-${idx}`);
  const checked = li.classList.toggle('checked');
  cb.checked = checked;
  sessionStorage.setItem(`check-${mealId}-${idx}`, checked ? '1' : '0');
};

range.addEventListener('change', render);

allData = FOODS_DATA;
render();
