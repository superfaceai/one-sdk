import fs from 'fs';

import { transpile } from './index';

function nope(): never {
  console.error(
    'Usage: comtrans --stdin|FILE'
  );
  process.exit(1);
}
function readStdin(): string {
  const value = fs.readFileSync(0).toString();

  if (value.trim() == '') {
    console.error('Invalid stdin input');

    return nope();
  }

  return value;
}
function readFile(path: string): string {
  if (path === undefined || path.trim() === '') {
    console.error('Invalid file input');

    return nope();
  }

  return fs.readFileSync(path).toString();
}
function readInput(): string {
  const arg = process.argv[2];
  switch (arg) {
    case undefined:
      return nope();

    case '--stdin':
    case '-':
      return readStdin();

    default:
      return readFile(arg);
  }
}
console.log(transpile(readInput()));
