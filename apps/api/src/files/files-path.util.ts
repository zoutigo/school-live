import { existsSync } from "node:fs";
import path from "node:path";

function findRepoRoot(startDir: string) {
  let currentDir = startDir;

  for (let depth = 0; depth < 8; depth += 1) {
    const hasAppsDir = existsSync(path.join(currentDir, "apps"));
    const hasPackageJson = existsSync(path.join(currentDir, "package.json"));

    if (hasAppsDir && hasPackageJson) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return startDir;
}

export function getFilesDirectory() {
  if (process.env.FILES_DIR?.trim()) {
    return path.resolve(process.env.FILES_DIR.trim());
  }

  const repoRoot = findRepoRoot(process.cwd());
  return path.join(repoRoot, "files");
}
