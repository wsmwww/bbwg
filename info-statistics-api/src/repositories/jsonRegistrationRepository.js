const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'info-registrations.json');

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]\n', 'utf8');
  }
}

async function readData() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const cleanRaw = raw.replace(/^\uFEFF/, '').trim();
  const parsed = JSON.parse(cleanRaw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

async function writeData(items) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
  return items;
}

async function listRegistrations() {
  return readData();
}

async function replaceRegistrations(items) {
  return writeData(items);
}

async function createRegistration(record) {
  const items = await readData();
  const next = [record, ...items.filter(item => item.id !== record.id)];
  await writeData(next);
  return record;
}

async function updateRegistration(id, record) {
  const items = await readData();
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return null;
  const next = [...items];
  next[index] = {
    ...items[index],
    ...record,
    id,
    createdAt: items[index].createdAt || record.createdAt
  };
  await writeData(next);
  return next[index];
}

async function deleteRegistration(id) {
  const items = await readData();
  const target = items.find(item => item.id === id);
  if (!target) return null;
  await writeData(items.filter(item => item.id !== id));
  return target;
}

async function clearRegistrations() {
  return writeData([]);
}

module.exports = {
  listRegistrations,
  replaceRegistrations,
  createRegistration,
  updateRegistration,
  deleteRegistration,
  clearRegistrations
};
