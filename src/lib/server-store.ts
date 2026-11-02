import fs from 'fs';
import path from 'path';
import { Presentation, Participant, ResponseSubmission } from '@/types';
import { DEFAULT_PRESENTATIONS } from '@/lib/default-data';

export interface StoreData {
  presentations: Record<string, Presentation>;
  participants: Record<string, Participant[]>;
  responses: Record<string, ResponseSubmission[]>;
  deletedCodes?: string[];
}

declare global {
  // eslint-disable-next-line no-var
  var __AUDIENCEMETER_STORE__: StoreData | undefined;
}

function getStoreDir(): string {
  // Check if process.cwd()/.data is writable
  try {
    const cwdData = path.join(process.cwd(), '.data');
    if (!fs.existsSync(cwdData)) {
      fs.mkdirSync(cwdData, { recursive: true });
    }
    fs.accessSync(cwdData, fs.constants.W_OK);
    return cwdData;
  } catch {
    // On serverless platforms (Vercel / AWS Lambda), process.cwd() is read-only.
    // /tmp is the writable storage space.
    try {
      const tmpData = path.join('/tmp', '.audiencemeter_data');
      if (!fs.existsSync(tmpData)) {
        fs.mkdirSync(tmpData, { recursive: true });
      }
      return tmpData;
    } catch {
      return '/tmp';
    }
  }
}

function getStoreFilePath(): string {
  return path.join(getStoreDir(), 'store.json');
}

function loadInitialStore(): StoreData {
  const storeFile = getStoreFilePath();
  try {
    if (fs.existsSync(storeFile)) {
      const content = fs.readFileSync(storeFile, 'utf-8');
      if (content) {
        const data: StoreData = JSON.parse(content);
        if (!data.deletedCodes) data.deletedCodes = [];
        if (!data.presentations) data.presentations = {};
        if (!data.participants) data.participants = {};
        if (!data.responses) data.responses = {};

        let updated = false;
        for (const pres of DEFAULT_PRESENTATIONS) {
          if (!data.presentations[pres.code] && !data.deletedCodes.includes(pres.code)) {
            data.presentations[pres.code] = pres;
            if (!data.participants[pres.code]) data.participants[pres.code] = [];
            if (!data.responses[pres.code]) data.responses[pres.code] = [];
            updated = true;
          } else if (data.presentations[pres.code] && pres.type && !data.presentations[pres.code].type) {
            data.presentations[pres.code].type = pres.type;
            if (pres.surveySettings && !data.presentations[pres.code].surveySettings) {
              data.presentations[pres.code].surveySettings = pres.surveySettings;
            }
            if (pres.description && !data.presentations[pres.code].description) {
              data.presentations[pres.code].description = pres.description;
            }
            updated = true;
          }
        }
        if (updated) {
          try {
            fs.writeFileSync(storeFile, JSON.stringify(data, null, 2), 'utf-8');
          } catch {}
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('Could not read store file from disk:', err);
  }

  // Initial default data fallback
  const initialData: StoreData = {
    presentations: {},
    participants: {},
    responses: {},
    deletedCodes: [],
  };

  for (const pres of DEFAULT_PRESENTATIONS) {
    initialData.presentations[pres.code] = pres;
    initialData.participants[pres.code] = [];
    initialData.responses[pres.code] = [];
  }

  try {
    fs.writeFileSync(storeFile, JSON.stringify(initialData, null, 2), 'utf-8');
  } catch {}

  return initialData;
}

export function getStoreData(): StoreData {
  if (!globalThis.__AUDIENCEMETER_STORE__) {
    globalThis.__AUDIENCEMETER_STORE__ = loadInitialStore();
  }
  return globalThis.__AUDIENCEMETER_STORE__;
}

export function saveStoreData(data: StoreData) {
  // Always update in-memory global reference immediately
  globalThis.__AUDIENCEMETER_STORE__ = data;

  try {
    const storeFile = getStoreFilePath();
    fs.writeFileSync(storeFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write store file to disk:', err);
  }
}
