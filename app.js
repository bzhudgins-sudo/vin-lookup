const NOTES_KEY = 'vin_notes';
const HISTORY_KEY = 'vin_history';

const vinInput = document.getElementById('vin');
const lookupBtn = document.getElementById('lookup-btn');
const errorEl = document.getElementById('error');
const results = document.getElementById('results');
const vehicleTitle = document.getElementById('vehicle-title');
const vehicleDetails = document.getElementById('vehicle-details');
const notesArea = document.getElementById('notes');
const saveNotesBtn = document.getElementById('save-notes');
const savedMsg = document.getElementById('saved-msg');
const historySection = document.getElementById('history');
const historyList = document.getElementById('history-list');

let currentVin = '';
let notes = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

function showError(msg) {
  errorEl.textContent = msg || '';
}

function clearError() {
  errorEl.textContent = '';
}

function isValidVin(vin) {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
}

async function lookupVin() {
  clearError();
  const vin = vinInput.value.trim().toUpperCase();
  if (!isValidVin(vin)) {
    showError('Enter a valid 17-character VIN');
    return;
  }

  lookupBtn.disabled = true;
  lookupBtn.textContent = 'Looking…';

  try {
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
    if (!res.ok) throw new Error('Lookup failed');
    const data = await res.json();

    const get = (variable) => {
      const item = data.Results.find(r => r.Variable === variable);
      return item && item.Value && item.Value !== 'Not Applicable' ? item.Value : null;
    };

    const make = get('Make');
    const model = get('Model');
    const year = get('Model Year');
    const body = get('Body Class');
    const doors = get('Doors');
    const drive = get('Drive Type');
    const fuel = get('Fuel Type - Primary');
    const engine = get('Displacement (L)');
    const plant = get('Plant Country');

    if (!make && !model) {
      showError('Could not decode this VIN');
      results.classList.add('hidden');
      return;
    }

    currentVin = vin;
    vehicleTitle.textContent = [year, make, model].filter(Boolean).join(' ') || 'Unknown vehicle';

    const details = [];
    if (year) details.push(`<div><strong>Year:</strong> ${year}</div>`);
    if (make) details.push(`<div><strong>Make:</strong> ${make}</div>`);
    if (model) details.push(`<div><strong>Model:</strong> ${model}</div>`);
    if (body) details.push(`<div><strong>Body:</strong> ${body}</div>`);
    if (doors) details.push(`<div><strong>Doors:</strong> ${doors}</div>`);
    if (drive) details.push(`<div><strong>Drive:</strong> ${drive}</div>`);
    if (fuel) details.push(`<div><strong>Fuel:</strong> ${fuel}</div>`);
    if (engine) details.push(`<div><strong>Engine:</strong> ${engine}L</div>`);
    if (plant) details.push(`<div><strong>Plant:</strong> ${plant}</div>`);
    details.push(`<div><strong>VIN:</strong> ${vin}</div>`);

    vehicleDetails.innerHTML = details.join('');
    notesArea.value = notes[vin] || '';
    results.classList.remove('hidden');

    // Add to history
    history = history.filter(h => h.vin !== vin);
    history.unshift({ vin, title: vehicleTitle.textContent, ts: Date.now() });
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();

  } catch (err) {
    showError('Lookup failed. Check connection and try again.');
    results.classList.add('hidden');
  } finally {
    lookupBtn.disabled = false;
    lookupBtn.textContent = 'Look up';
  }
}

function saveNotes() {
  if (!currentVin) return;
  notes[currentVin] = notesArea.value.trim();
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  savedMsg.textContent = 'Saved';
  setTimeout(() => savedMsg.textContent = '', 1500);
}

function renderHistory() {
  if (!history.length) {
    historySection.classList.add('hidden');
    return;
  }
  historySection.classList.remove('hidden');
  historyList.innerHTML = history.map(h => `
    <div class="card" data-vin="${h.vin}">
      <strong>${h.title}</strong>
      <div style="color:#aaa;font-size:0.85rem;margin-top:0.2rem">${h.vin}</div>
    </div>
  `).join('');

  historyList.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      vinInput.value = card.dataset.vin;
      lookupVin();
    });
  });
}

lookupBtn.addEventListener('click', lookupVin);
vinInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') lookupVin();
});
saveNotesBtn.addEventListener('click', saveNotes);

renderHistory();
