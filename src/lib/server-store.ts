import fs from 'fs';
import path from 'path';
import { Presentation, Participant, ResponseSubmission } from '@/types';
import { DEFAULT_PRESENTATIONS } from '@/lib/default-data';

interface StoreData {
  presentations: Record<string, Presentation>;
  participants: Record<string, Participant[]>;
  responses: Record<string, ResponseSubmission[]>;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

function ensureDataFile(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      if (content) {
        return JSON.parse(content);
      }
    }
  } catch (err) {
    console.warn('Could not read store file:', err);
  }

  // Initial default data
  const initialData: StoreData = {
    presentations: {},
    participants: {},
    responses: {},
  };

  for (const pres of DEFAULT_PRESENTATIONS) {
    initialData.presentations[pres.code] = pres;
    initialData.participants[pres.code] = [];
    initialData.responses[pres.code] = [];
  }

  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  } catch {}

  return initialData;
}

export function getStoreData(): StoreData {
  return ensureDataFile();
}

export function saveStoreData(data: StoreData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write store file:', err);
  }
}
