import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const distDir = fileURLToPath(new URL('../dist', import.meta.url));

async function getHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return getHtmlFiles(fullPath);
      }
      return entry.name.endsWith('.html') ? [fullPath] : [];
    }),
  );

  return files.flat();
}

const htmlFiles = await getHtmlFiles(distDir);
const issues = [];

if (htmlFiles.length === 0) {
  issues.push('No built HTML files were found in dist/.');
}

for (const filePath of htmlFiles) {
  const source = await readFile(filePath, 'utf8');
  const relativePath = path.relative(distDir, filePath);
  const trimmedSource = source.trimEnd();
  const closingHtmlIndex = trimmedSource.lastIndexOf('</html>');

  if (closingHtmlIndex === -1) {
    issues.push(`${relativePath}: missing closing </html> tag.`);
  } else {
    const trailingContent = trimmedSource.slice(closingHtmlIndex + '</html>'.length).trim();
    if (trailingContent.length > 0) {
      issues.push(`${relativePath}: unexpected content found after </html>.`);
    }
  }

  if (source.includes('className=')) {
    issues.push(`${relativePath}: literal "className=" found in built HTML.`);
  }
}

if (issues.length > 0) {
  console.error('Built HTML validation failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Validated ${htmlFiles.length} built HTML files.`);
