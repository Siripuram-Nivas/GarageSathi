import { DataLayer } from './types';
import { config } from '../config';
import { SERVICE_SEEDS } from '../catalogue';

let layerPromise: Promise<DataLayer> | null = null;

async function init(): Promise<DataLayer> {
  if (config.mongodbUri) {
    try {
      const { connectMongo, mongoDb } = await import('./mongo');
      await connectMongo();
      await mongoDb.services.upsertSeeds(SERVICE_SEEDS);
      return mongoDb;
    } catch (err) {
      // No secrets in logs. Fall back so the demo still runs.
      console.warn('[db] MongoDB connection failed, using local JSON store:', (err as Error).message);
    }
  }
  const { fileDb } = await import('./file');
  await fileDb.services.upsertSeeds(SERVICE_SEEDS);
  return fileDb;
}

export function getDb(): Promise<DataLayer> {
  if (!layerPromise) layerPromise = init();
  return layerPromise;
}

export async function resetDb(): Promise<void> {
  const db = await getDb();
  await db.reset();
  await db.services.upsertSeeds(SERVICE_SEEDS);
}
