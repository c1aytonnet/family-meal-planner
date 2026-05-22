import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

function normalizeYamlValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeYamlValue(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, normalizeYamlValue(item)] as const)
        .filter(([, item]) => item !== undefined),
    );
  }

  return value;
}

export async function ensureDirectory(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listMarkdownFiles(dirPath: string) {
  await ensureDirectory(dirPath);
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(dirPath, entry.name));
}

export async function readMarkdownFile<T>(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);
  return {
    data: normalizeYamlValue(parsed.data) as T,
    content: parsed.content.trim(),
  };
}

export async function atomicWriteMarkdownFile(
  filePath: string,
  data: Record<string, unknown>,
  content: string,
) {
  await ensureDirectory(path.dirname(filePath));
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = matter.stringify(
    content.trim(),
    normalizeYamlValue(data) as Record<string, unknown>,
  );
  await fs.writeFile(tmpPath, payload, "utf8");
  await fs.rename(tmpPath, filePath);
}

export async function copyDirectory(sourceDir: string, targetDir: string) {
  if (!(await fileExists(sourceDir))) {
    return;
  }

  await ensureDirectory(targetDir);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

export async function readJsonFile<T>(filePath: string, fallback: T) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function atomicWriteJsonFile(filePath: string, data: unknown) {
  await ensureDirectory(path.dirname(filePath));
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmpPath, filePath);
}
