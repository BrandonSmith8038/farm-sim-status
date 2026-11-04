const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'farm-sim-status-'));
process.env.DATA_DIR = dataDir;
const dataFile = path.join(dataDir, 'farm.json');
const serverPath = require.resolve('../server.js');
const app = require(serverPath);

let server, base;
const send = (url, method, body) => fetch(base + url, {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

test.before(() => new Promise(resolve => {
  server = app.listen(0, () => {
    base = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));
test.after(() => {
  server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('serves the page shell', async () => {
  const res = await fetch(base + '/');
  assert.strictEqual(res.status, 200);
  assert.match(await res.text(), /Field Notes/);
});

test('serves the welcome back panel and its script', async () => {
  const page = await (await fetch(base + '/')).text();
  assert.match(page, /id="welcome"/);
  assert.match(page, /src="welcome\.js"/);
  assert.strictEqual((await fetch(base + '/welcome.js')).status, 200);
});

test('starts with the default farm', async () => {
  const farm = await (await fetch(base + '/api/farm')).json();
  assert.strictEqual(farm.mapName, 'Alma, Missouri');
  assert.strictEqual(farm.lastUpdated, null);
  assert.deepStrictEqual(farm.fields, []);
});

test('a save reaches farm.json and stamps the date', async () => {
  const farm = await (await fetch(base + '/api/farm')).json();
  const res = await send('/api/farm', 'PUT', { ...farm, mapName: 'Riverbend' });
  assert.strictEqual(res.status, 200);
  const onDisk = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.strictEqual(onDisk.mapName, 'Riverbend');
  assert.ok(onDisk.lastUpdated);
});

test('a field card and its lists are saved as sent', async () => {
  const farm = await (await fetch(base + '/api/farm')).json();
  const field = {
    name: 'Field 7', crop: 'Wheat', growth: 'Growing', plow: false, lime: true, weed: false, fertilize: true, soilSample: true, notes: 'Sloped',
    todos: [{ text: 'Spray', priority: 'urgent', done: false }], plans: [{ text: 'Try canola' }], updatedAt: '2026-11-03T00:00:00.000Z',
  };
  assert.strictEqual((await send('/api/farm', 'PUT', { ...farm, fields: [field] })).status, 200);
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(dataFile, 'utf8')).fields, [field]);
});

test('an animal card and its lists are saved as sent', async () => {
  const farm = await (await fetch(base + '/api/farm')).json();
  const animal = {
    type: 'Cows', location: 'Barn by Field 3', food: 'bad', foodNeeds: 'hay and water', notes: 'Holsteins',
    todos: [{ text: 'Fix the gate', priority: 'urgent', done: false }], plans: [{ text: 'Second barn' }], updatedAt: '2026-11-03T00:00:00.000Z',
  };
  assert.strictEqual((await send('/api/farm', 'PUT', { ...farm, animals: [animal] })).status, 200);
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(dataFile, 'utf8')).animals, [animal]);
});

test('general to-dos, plans and notes are saved as sent', async () => {
  const farm = await (await fetch(base + '/api/farm')).json();
  const todos = [{ text: 'Pay off the loan', priority: 'urgent', done: false }];
  const plans = [{ text: 'Build a second silo' }];
  const notes = [{ text: 'Left grain trailer at the silo', details: 'It is full of wheat', updatedAt: '2026-11-03T00:00:00.000Z' }];
  assert.strictEqual((await send('/api/farm', 'PUT', { ...farm, todos, plans, notes })).status, 200);
  const onDisk = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.deepStrictEqual(onDisk.todos, todos);
  assert.deepStrictEqual(onDisk.plans, plans);
  assert.deepStrictEqual(onDisk.notes, notes);
});

test('bad data is rejected and changes nothing', async () => {
  const before = fs.readFileSync(dataFile, 'utf8');
  for (const body of [{ mapName: 'No lists' }, { mapName: '  ', fields: [], animals: [], todos: [], plans: [], notes: [] }, [], 'not json']) {
    assert.strictEqual((await send('/api/farm', 'PUT', body)).status, 400);
  }
  assert.strictEqual(fs.readFileSync(dataFile, 'utf8'), before);
});

test('saved data survives a restart, and an unreadable file is kept', () => {
  const restart = () => {
    delete require.cache[serverPath];
    return require(serverPath);
  };
  const log = console.error;
  console.error = () => {};
  try {
    restart();
    assert.strictEqual(JSON.parse(fs.readFileSync(dataFile, 'utf8')).mapName, 'Riverbend');

    fs.writeFileSync(dataFile, '{ broken');
    restart();
    const kept = fs.readdirSync(dataDir).filter(name => name.includes('.corrupt-'));
    assert.strictEqual(kept.length, 1);
    assert.strictEqual(fs.readFileSync(path.join(dataDir, kept[0]), 'utf8'), '{ broken');
  } finally {
    console.error = log;
  }
});
