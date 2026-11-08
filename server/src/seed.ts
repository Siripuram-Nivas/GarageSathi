import { getDb } from './db';
import { SERVICE_SEEDS } from './catalogue';

async function main() {
  const db = await getDb();
  await db.services.upsertSeeds(SERVICE_SEEDS);
  const services = await db.services.list();
  console.log(`Seeded catalogue (${db.mode}). ${services.length} services available:`);
  for (const service of services) console.log(`- ${service.name}: ₹${service.pricePaise / 100}`);
}

main().catch((err) => {
  console.error('Seed failed:', (err as Error).message);
  process.exit(1);
});
