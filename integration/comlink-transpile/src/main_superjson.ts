import fs from 'fs';
import { join as joinPath } from 'path';

import { transpile } from './index';

function nope(): never {
  console.error(
    'Usage: comtrans-superjson SUPER_JSON OUT_PATH'
  );
  process.exit(1);
}
function readFile(path: string): string {
  if (path === undefined || path.trim() === '') {
    console.error('Invalid file input');

    return nope();
  }

  return fs.readFileSync(path).toString();
}

const superJsonPath = process.argv[2];
const outputPath = process.argv[3];
if (outputPath === undefined) {
  console.error('Invalid output path');
  nope();
}

const superJson = JSON.parse(readFile(superJsonPath));
const profiles: Record<string, any> = superJson["profiles"];
for (const [profileId, profile]  of Object.entries(profiles)) {
  const providers: Record<string, any> = profile["providers"];
  for (const [providerName, provider] of Object.entries(providers)) {
    let sourcePath = provider["file"];
    if (sourcePath === undefined) {
      continue;
    }
    sourcePath = joinPath(superJsonPath, '..', provider["file"]);
    const destinationPath = joinPath(outputPath, `${profileId.replace('/', '_')}.${providerName}.suma.js`);

    console.log(`Transpiling ${sourcePath} -> ${destinationPath}`);
    const transpiled = transpile(readFile(sourcePath));
    fs.writeFileSync(destinationPath, transpiled);
  }
}
