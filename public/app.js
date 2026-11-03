const mapView = document.getElementById('map-view');
const mapText = document.getElementById('map-text');
const mapEdit = document.getElementById('map-edit');
const mapInput = document.getElementById('map-input');
const statusText = document.getElementById('status');
const tabs = [...document.querySelectorAll('.tab')];
const panels = [...document.querySelectorAll('.panel')];

let farm = null; // the latest copy confirmed by the server

function showStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle('error', isError);
}

async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `The server returned an error (${res.status}).`);
  return data;
}

function render() {
  mapText.textContent = farm.mapName;
  mapEdit.hidden = false;
}

// ---------- Tabs ----------
function showTab(name) {
  const active = tabs.some(tab => tab.dataset.tab === name) ? name : tabs[0].dataset.tab;
  for (const tab of tabs) tab.setAttribute('aria-selected', String(tab.dataset.tab === active));
  for (const panel of panels) panel.hidden = panel.dataset.panel !== active;
}

// The tab lives in the URL, so a page refresh stays on the same one.
for (const tab of tabs) tab.addEventListener('click', () => { location.hash = tab.dataset.tab; });
window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));

// ---------- Map name ----------
function setMapEditing(editing) {
  mapView.hidden = editing;
  mapInput.hidden = !editing;
}

async function saveMapName() {
  const name = mapInput.value.trim();
  setMapEditing(false);
  if (!name || name === farm.mapName) return;
  try {
    farm = await api('/api/farm', 'PUT', { ...farm, mapName: name });
    showStatus('Saved');
    render();
  } catch (e) {
    showStatus(`Not saved: ${e.message}`, true);
  }
}

mapEdit.addEventListener('click', () => {
  mapInput.value = farm.mapName;
  setMapEditing(true);
  mapInput.focus();
  mapInput.select();
});
mapInput.addEventListener('blur', saveMapName);
mapInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') mapInput.blur();
  if (e.key === 'Escape') {
    mapInput.value = farm.mapName;
    mapInput.blur();
  }
});

// ---------- Start ----------
showTab(location.hash.slice(1));
api('/api/farm')
  .then(data => {
    farm = data;
    render();
  })
  .catch(e => showStatus(`Could not load the farm: ${e.message}`, true));
