import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const FORBIDDEN_SOURCE_REFERENCES = [
  /(?:^|["'`])[^"'`]*operator\//i,
  /docs\/autonomous-business-ai-plan\.md/i,
  /docs\/EXEC-SUMMARY\.md/i,
  /\.manus-logs\//i,
];

export const FORBIDDEN_BUILD_MARKERS = [
  '__manus__',
  'manus-debug-collector',
  'sessionReplay',
  'autonomous-business-ai-plan',
  'COO Engine',
];

const SOURCE_ROOTS = ['client/src', 'server', 'shared'];
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.html']);

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const stack = [root];
  const files = [];
  while (stack.length) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) stack.push(path.join(current, entry));
    } else if (TEXT_EXTENSIONS.has(path.extname(current))) {
      files.push(current);
    }
  }
  return files.sort();
}

export function scanSourceBoundary(repoRoot) {
  const findings = [];
  for (const relativeRoot of SOURCE_ROOTS) {
    for (const file of walkFiles(path.join(repoRoot, relativeRoot))) {
      const text = fs.readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN_SOURCE_REFERENCES) {
        if (pattern.test(text)) {
          findings.push({ file: path.relative(repoRoot, file), marker: pattern.source });
        }
      }
    }
  }
  return findings;
}

export function scanBuildBoundary(repoRoot) {
  const targets = [path.join(repoRoot, 'dist/index.js'), path.join(repoRoot, 'dist/public/assets')];
  const findings = [];
  for (const target of targets) {
    for (const file of walkFiles(target)) {
      const text = fs.readFileSync(file, 'utf8');
      for (const marker of FORBIDDEN_BUILD_MARKERS) {
        if (text.includes(marker)) findings.push({ file: path.relative(repoRoot, file), marker });
      }
    }
  }
  return findings;
}

export function checkProductionBoundary(repoRoot = process.cwd()) {
  const sourceFindings = scanSourceBoundary(repoRoot);
  const buildFindings = scanBuildBoundary(repoRoot);
  return { ok: sourceFindings.length === 0 && buildFindings.length === 0, sourceFindings, buildFindings };
}

function main() {
  const result = checkProductionBoundary(process.cwd());
  if (result.ok) {
    console.log('HostGraph production boundary: PASS');
    return;
  }
  console.error('HostGraph production boundary: FAIL');
  for (const finding of [...result.sourceFindings, ...result.buildFindings]) {
    console.error(`${finding.file}: ${finding.marker}`);
  }
  process.exitCode = 1;
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(thisFile).href) main();
