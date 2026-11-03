const express = require('express');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8210;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'farm.json');
const LISTS = ['fields', 'animals', 'todos', 'plans', 'notes'];
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- JSON store ----------
const defaultFarm = () => ({ mapName: 'Alma, Missouri', lastUpdated: null, fields: [], animals: [], todos: [], plans: [], notes: [] });

let farm = defaultFarm();
function load() {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    farm = { ...defaultFarm(), ...saved };
    for (const key of LISTS) if (!Array.isArray(farm[key])) farm[key] = [];
  } catch (e) {
    if (e.code !== 'ENOENT') { // keep an unreadable file instead of overwriting it on the next save
      const bak = `${DATA_FILE}.corrupt-${Date.now()}`;
      try { fs.renameSync(DATA_FILE, bak); console.error('Unreadable farm.json moved to', bak); } catch {}
    }
  }
}
function save() { // atomic write
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(farm, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}
load();

// Returns a clean farm built from untrusted input, or null if it isn't a valid farm.
function parseFarm(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const mapName = typeof input.mapName === 'string' ? input.mapName.trim() : '';
  if (!mapName || !LISTS.every(key => Array.isArray(input[key]))) return null;
  const clean = { mapName };
  for (const key of LISTS) clean[key] = input[key];
  return clean;
}

// ---------- API ----------
const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/farm', (req, res) => res.json(farm));

app.put('/api/farm', (req, res) => {
  const next = parseFarm(req.body);
  if (!next) return res.status(400).json({ error: 'That is not valid farm data.' });
  farm = { ...next, lastUpdated: new Date().toISOString() };
  save();
  res.json(farm);
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status === 400 ? 'That is not valid JSON.' : err.message });
});

if (require.main === module) app.listen(PORT, () => console.log(`Farm Sim Status listening on port ${PORT}`));

module.exports = app;
