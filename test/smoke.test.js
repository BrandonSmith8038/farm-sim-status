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
  assert.match(await res.text(), /Farm Sim Status/);
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
