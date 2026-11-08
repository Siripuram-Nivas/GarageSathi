import fs from 'fs';
import os from 'os';
import path from 'path';

// Must run before app modules read config.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'garagesathi-test-'));
process.env.MONGODB_URI = '';
process.env.AI_PROVIDER_MODE = 'mock';
process.env.GNANI_API_KEY_ID = '';
process.env.DEMO_MODE = 'true';
process.env.CORS_ORIGIN = 'http://localhost:5173';
