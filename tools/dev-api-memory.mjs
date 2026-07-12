import { spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.MONGOMS_STARTUP_TIMEOUT ??= '60000';

const mongo = await MongoMemoryServer.create();
const uri = mongo.getUri();

console.log(`[dev-api-memory] In-memory MongoDB ready at ${uri}`);

const env = {
  ...process.env,
  NODE_ENV: 'development',
  MONGODB_URI: uri,
};

const api = spawn('npm', ['run', 'dev', '-w', 'apps/api'], {
  stdio: 'inherit',
  env,
});

const seed = () =>
  new Promise((resolve) => {
    console.log('[dev-api-memory] Seeding database...');
    const seeder = spawn('npm', ['run', 'seed', '-w', 'apps/api'], {
      stdio: 'inherit',
      env,
    });
    seeder.on('exit', (code) => {
      if (code !== 0) {
        console.warn(`[dev-api-memory] Seed exited with code ${code}`);
      }
      resolve();
    });
  });

// Wait briefly for the API to begin listening, then seed.
setTimeout(seed, 4000);

api.on('exit', async () => {
  await mongo.stop();
  process.exit(0);
});
