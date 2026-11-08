import { createApp } from './app';
import { config } from './config';
import { getDb } from './db';

async function main() {
  const db = await getDb();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`GarageSathi API on http://localhost:${config.port}`);
    console.log(`Database: ${db.mode}${db.mode === 'file' ? ` (${config.dataDir})` : ''}`);
    console.log(`AI provider: ${process.env.AI_PROVIDER_MODE === 'live' && config.gnani.apiKey ? 'live' : 'mock'}`);
  });
}

main().catch((err) => {
  console.error('Failed to start GarageSathi API:', (err as Error).message);
  process.exit(1);
});
