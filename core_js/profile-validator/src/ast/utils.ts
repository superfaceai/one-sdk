import { splitLimit } from './split';

export const IDENTIFIER_RE = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
export const IDENTIFIER_RE_SOURCE = IDENTIFIER_RE.source;
export const DOCUMENT_NAME_RE = /^[a-z][a-z0-9_-]*$/;
export const DOCUMENT_NAME_RE_SOURCE = DOCUMENT_NAME_RE.source;
export const VERSION_NUMBER_RE = /^[0-9]+$/;

export function isValidIdentifier(input: string): boolean {
  return IDENTIFIER_RE.test(input);
}

export function isValidDocumentName(input: string): boolean {
  return DOCUMENT_NAME_RE.test(input);
}

export type Guard<T> = (input: unknown) => input is T;
export type Assert<T> = (input: unknown) => asserts input is T;

/**
 * Checks if input string is valid version string.
 *
 * Example:
 * ```
 * isValidVersionString('1.2.3') // true
 * isValidVersionString('1.2.3-test') // true
 * ```
 */
export function isValidVersionString(version: string): boolean {
  const [restVersion, label] = splitLimit(version, '-', 1);
  const [majorStr, minorStr, patchStr] = splitLimit(restVersion, '.', 2);

  if (!VERSION_NUMBER_RE.test(majorStr)) {
    return false;
  }
  if (minorStr !== undefined) {
    if (!VERSION_NUMBER_RE.test(minorStr)) {
      return false;
    }
  }
  if (patchStr !== undefined) {
    if (!VERSION_NUMBER_RE.test(patchStr)) {
      return false;
    }
  }
  if (label !== undefined) {
    if (!isValidDocumentName(label)) {
      return false;
    }
  }

  return true;
}

/**
 * Tries to extract valid version string from input string contining @.
 *
 * Example:
 * ```
 * extractVersionString('test/test@1.2.3') // '1.2.3'
 * ```
 */
export function extractVersionString(input: string): string {
  if (input === '') {
    throw new Error('Invalid empty version string');
  }
  const [, version] = splitLimit(input, '@', 1);
  if (!isValidVersionString(version)) {
    throw new Error(`Invalid version string in "${input}"`);
  }

  return version;
}

/**
 * Tries to parse numeric string (0-9) to number.
 *
 * Example:
 * ```
 * parseVersionNumber('3') // 3
 * parseVersionNumber(' 3 ') // 3
 * ```
 */
export function parseVersionNumber(str: string): number {
  const value = str.trim();
  if (!VERSION_NUMBER_RE.test(value)) {
    throw new Error(`Unable to parse version string "${str}"`);
  }

  return parseInt(value, 10);
}

/**
 * Tries to extract version object from version string.
 *
 * Example:
 * ```
 * parseVersionNumber('1.2.3') // {major: 1, minor: 2, patch: 3}
 * parseVersionNumber('1.2.3-test') // {major: 1, minor: 2, patch: 3, label: 'test'}
 * ```
 */
export function extractVersion(versionString: string): {
  major: number;
  minor?: number;
  patch?: number;
  label?: string;
} {
  const [version, label] = splitLimit(versionString, '-', 1);
  const [majorStr, minorStr, patchStr] = splitLimit(version, '.', 2);

  const major = parseVersionNumber(majorStr);

  let minor = undefined;
  if (minorStr !== undefined) {
    minor = parseVersionNumber(minorStr);
  }

  let patch = undefined;
  if (patchStr !== undefined) {
    patch = parseVersionNumber(patchStr);
  }

  if (label !== undefined) {
    if (!isValidDocumentName(label)) {
      throw new Error(`Invalid version label "${label}"`);
    }
  }

  return { major, minor, patch, label };
}
