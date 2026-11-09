import fs from 'fs';
import path from 'path';
import { JobDoc, ServiceDoc, DataLayer, OwnerRecord } from './types';
import { config } from '../config';

interface FileDb {
  seq: number;
  services: ServiceDoc[];
  jobs: JobDoc[];
  owner: OwnerRecord | null;
}

const dbPath = path.join(config.dataDir, 'db.json');

let state: FileDb | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function load(): FileDb {
  if (state) return state;
  try {
    state = JSON.parse(fs.readFileSync(dbPath, 'utf8')) as FileDb;
  } catch {
    state = { seq: 1000, services: [], jobs: [], owner: null };
  }
  return state!;
}

// Serialize writes: the file store is a single-process development/demo backend.
function persist() {
  const snapshot = JSON.stringify(load(), null, 2);
  writeQueue = writeQueue.then(async () => {
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.writeFileSync(dbPath, snapshot);
  });
  return writeQueue;
}

const now = () => new Date().toISOString();
const findJob = (db: FileDb, idOrJobId: string) =>
  db.jobs.find((j) => j.jobId === idOrJobId || j.id === idOrJobId);

export const fileDb: DataLayer = {
  mode: 'file',
  services: {
    async list() {
      return [...load().services].sort((a, b) => a.name.localeCompare(b.name));
    },
    async create(input) {
      const service: ServiceDoc = { ...input, id: crypto.randomUUID(), createdAt: now(), updatedAt: now() };
      load().services.push(service);
      await persist();
      return service;
    },
    async update(id, patch) {
      const service = load().services.find((s) => s.id === id);
      if (!service) return null;
      Object.assign(service, patch, { updatedAt: now() });
      await persist();
      return service;
    },
    async upsertSeeds(items) {
      const db = load();
      for (const item of items) {
        if (db.services.some((s) => s.name.toLowerCase() === item.name.toLowerCase())) continue;
        db.services.push({ ...item, id: crypto.randomUUID(), createdAt: now(), updatedAt: now() });
      }
      await persist();
    },
    async reset() {
      load().services = [];
      await persist();
    },
  },
  jobs: {
    async create(input) {
      const job: JobDoc = { ...input, id: crypto.randomUUID(), createdAt: now(), updatedAt: now() };
      load().jobs.push(job);
      await persist();
      return job;
    },
    async list() {
      return [...load().jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async find(idOrJobId) {
      return findJob(load(), idOrJobId) ?? null;
    },
    async update(idOrJobId, patch) {
      const job = findJob(load(), idOrJobId);
      if (!job) return null;
      Object.assign(job, patch, { updatedAt: now() });
      await persist();
      return job;
    },
    async reset() {
      load().jobs = [];
      await persist();
    },
  },
  auth: {
    async get() {
      return load().owner ?? null;
    },
    async create(input) {
      const owner: OwnerRecord = {
        id: crypto.randomUUID(),
        username: input.username,
        passwordHash: input.passwordHash,
        createdAt: now(),
      };
      load().owner = owner;
      await persist();
      return owner;
    },
    async reset() {
      load().owner = null;
      await persist();
    },
  },
  async nextJobSeq() {
    const db = load();
    db.seq += 1;
    await persist();
    return db.seq;
  },
  async reset() {
    state = { seq: 1000, services: [], jobs: [], owner: null };
    await persist();
  },
};
