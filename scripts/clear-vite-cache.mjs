import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const viteCacheDir = resolve(process.cwd(), 'node_modules/.vite');

try {
  await rm(viteCacheDir, { recursive: true, force: true });
  console.log(`Cleared Vite cache at ${viteCacheDir}`);
} catch (error) {
  console.error(`Failed to clear Vite cache at ${viteCacheDir}`);
  throw error;
}
