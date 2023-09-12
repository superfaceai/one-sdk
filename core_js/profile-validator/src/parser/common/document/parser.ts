import {
  isValidDocumentName,
  parseVersionNumber,
  splitLimit,
} from '../../../ast';

import { DocumentId, MapDocumentId, ProfileIdRange } from './interfaces';
import { VersionRange } from './version';

export type ParseResult<T> =
  | { kind: 'parsed'; value: T }
  | { kind: 'error'; message: string };

/**
 * Parses a singular version number or returns undefined.
 */
export function tryParseVersionNumber(str: string): number | undefined {
  try {
    return parseVersionNumber(str);
  } catch (error) {
    return undefined;
  }
}

/** Parses document id.
 *
 * This parses a more general structure that fits both the profile and map id.
 */
export function parseDocumentId(id: string): ParseResult<DocumentId> {
  // parse scope first
  let scope: string | undefined;
  const [splitScope, scopeRestId] = splitLimit(id, '/', 1);
  if (scopeRestId !== undefined) {
    scope = splitScope;
    if (!isValidDocumentName(scope)) {
      return {
        kind: 'error',
        message: `${scope} is not a valid lowercase identifier`,
      };
    }

    // strip the scope
    id = scopeRestId;
  }

  let parsedVersion;
  const [versionRestId, splitVersion] = splitLimit(id, '@', 1);
  if (splitVersion !== undefined) {
    try {
      parsedVersion = VersionRange.fromString(splitVersion);
    } catch (error) {
      return {
        kind: 'error',
        message: `${splitVersion} is not a valid version`,
      };
    }

    // strip the version
    id = versionRestId;
  }
  const version = parsedVersion;

  const middle = id.split('.');
  for (const m of middle) {
    if (!isValidDocumentName(m)) {
      return {
        kind: 'error',
        message: `"${m}" is not a valid lowercase identifier`,
      };
    }
  }

  return {
    kind: 'parsed',
    value: {
      scope,
      middle,
      version,
    },
  };
}

/** Parses the id using `parseDocumentId`, checks that the `middle` is a valid `name`. */
export function parseProfileId(id: string): ParseResult<ProfileIdRange> {
  const baseResult = parseDocumentId(id);
  if (baseResult.kind === 'error') {
    return baseResult;
  }
  const base = baseResult.value;

  if (base.middle.length !== 1) {
    return {
      kind: 'error',
      message: `"${base.middle.join('.')}" is not a valid lowercase identifier`,
    };
  }

  if (base.version === undefined) {
    return {
      kind: 'error',
      message: 'profile id requires a version tag',
    };
  }

  return {
    kind: 'parsed',
    value: {
      scope: base.scope,
      name: base.middle[0],
      version: base.version,
    },
  };
}

/**
 * Parses version label in format `revN`
 */
export function parseRevisionLabel(label: string): ParseResult<number> {
  let value = label.trim();

  if (!value.startsWith('rev')) {
    return {
      kind: 'error',
      message: 'revision label must be in format `revN`',
    };
  }
  value = value.slice(3);

  const revision = tryParseVersionNumber(value);
  if (revision === undefined) {
    return {
      kind: 'error',
      message:
        'revision label must be in format `revN` where N is a non-negative integer',
    };
  }

  return {
    kind: 'parsed',
    value: revision,
  };
}

/**
 * Parses the id using `parseDocumentId`, checks that the middle portion contains
 * a valid `name`, `provider` and parses the revision tag, if any.
 */
export function parseMapId(id: string): ParseResult<MapDocumentId> {
  const baseResult = parseDocumentId(id);
  if (baseResult.kind === 'error') {
    return baseResult;
  }
  const base = baseResult.value;

  // parse name portion
  const [name, provider, variant] = base.middle;
  if (provider === undefined) {
    return {
      kind: 'error',
      message: 'provider is not a valid lowercase identifier',
    };
  }

  if (base.version === undefined) {
    return {
      kind: 'error',
      message: 'version must be present in map id',
    };
  }
  let revision = undefined;
  if (base.version.label !== undefined) {
    const parseResult = parseRevisionLabel(base.version.label);
    if (parseResult.kind === 'error') {
      return parseResult;
    }

    revision = parseResult.value;
  }

  const version = {
    major: base.version.major,
    minor: base.version.minor,
    revision,
  };

  return {
    kind: 'parsed',
    value: {
      scope: base.scope,
      name,
      provider,
      variant,
      version,
    },
  };
}
