import { promises as fs } from "node:fs";
import path from "node:path";
import { COLLECTIONS, DATA_DIR, SEED_DIR } from "@/lib/storage/config";
import { copyDirectory, ensureDirectory } from "@/lib/storage/files";

let initialized = false;

export async function ensureSeedData() {
  if (initialized) {
    return;
  }

  await ensureDirectory(DATA_DIR);

  const collectionNames = Object.values(COLLECTIONS);
  for (const collection of collectionNames) {
    const dataPath = path.join(DATA_DIR, collection);
    const seedPath = path.join(SEED_DIR, collection);

    await ensureDirectory(dataPath);
    const existing = await fs.readdir(dataPath);
    if (existing.length === 0) {
      await copyDirectory(seedPath, dataPath);
    }
  }

  initialized = true;
}
