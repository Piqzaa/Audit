import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../data.json');
const TMP_PATH = DATA_PATH + '.tmp';

const DEFAULT_STORE = { prospects: [] };

export async function loadStore() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const cleaned = raw.replace(/^\uFEFF/, '');
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.prospects)) {
      return { ...DEFAULT_STORE };
    }
    return parsed;
  } catch (err) {
    if (err && err.code === 'ENOENT') return { ...DEFAULT_STORE };
    throw err;
  }
}

export async function saveStore(data) {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(TMP_PATH, json, 'utf8');
  await fs.rename(TMP_PATH, DATA_PATH);
}

let queue = Promise.resolve();
export function withStoreLock(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

export function nowISO() {
  return new Date().toISOString();
}
