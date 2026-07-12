import { MongoMemoryServer } from 'mongodb-memory-server';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), 'apps/api/.env');

const mongod = await MongoMemoryServer.create();
const uri = mongod.getUri();

const env = readFileSync(envPath, 'utf-8');
writeFileSync(
  envPath,
  env.includes('MONGODB_URI=')
    ? env.replace(/MONGODB_URI=.*/u, `MONGODB_URI=${uri}`)
    : `${env}\nMONGODB_URI=${uri}\n`,
);

console.log(`MONGO_URI=${uri}`);

process.on('SIGTERM', async () => {
  await mongod.stop();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await mongod.stop();
  process.exit(0);
});

setInterval(() => {}, 1 << 30);
