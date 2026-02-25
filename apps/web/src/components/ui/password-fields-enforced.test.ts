import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function collectFiles(dir: string, entries: string[] = []) {
  for (const name of readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectFiles(fullPath, entries);
      continue;
    }

    if (!name.endsWith(".tsx")) {
      continue;
    }

    if (name.endsWith(".test.tsx")) {
      continue;
    }

    entries.push(fullPath);
  }

  return entries;
}

describe("Password fields policy", () => {
  it("forbids direct password inputs so visibility toggle is always available", () => {
    const root = path.resolve(process.cwd(), "src");
    const files = collectFiles(root);

    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      if (content.includes('type="password"')) {
        offenders.push(path.relative(root, file));
      }
    }

    expect(offenders).toEqual([]);
  });
});
