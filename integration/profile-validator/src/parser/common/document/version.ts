import { splitLimit } from '../../../ast';

import { tryParseVersionNumber } from './parser';

/**
 * Structure representing abstract semver version tag.
 */
export class VersionRange {
  public static fromString(input: string): VersionRange {
    const [restVersion, label] = splitLimit(input, '-', 1);
    const [majorStr, minorStr, patchStr] = splitLimit(restVersion, '.', 2);
    let minor,
      patch = undefined;

    if (majorStr === undefined || majorStr === '') {
      throw new Error(
        `Invalid version range: ${input} - major component: ${majorStr} is not a valid number`
      );
    }
    const major = tryParseVersionNumber(majorStr);
    if (major === undefined) {
      throw new Error(
        `Invalid version range: ${input} - major component: ${majorStr} is not a valid number`
      );
    }

    if (minorStr) {
      minor = tryParseVersionNumber(minorStr);
      if (minor === undefined) {
        throw new Error(
          `Invalid version range: ${input} - minor component: ${minorStr} is not a valid number`
        );
      }
    }
    if (patchStr) {
      patch = tryParseVersionNumber(patchStr);
      if (patch === undefined) {
        throw new Error(
          `Invalid version range: ${input} - patch component: ${patchStr} is not a valid number`
        );
      }
    }

    return new VersionRange(major, minor, patch, label);
  }

  public static fromParameters(params: {
    major: number;
    minor?: number;
    patch?: number;
    label?: string;
  }): VersionRange {
    /** Patch version cannot appear without minor version. */
    if (params.patch !== undefined && params.minor === undefined) {
      throw new Error(
        'Invalid Version Range - patch version cannot appear without minor version'
      );
    }

    return new VersionRange(
      params.major,
      params.minor,
      params.patch,
      params.label
    );
  }

  toString(): string {
    let str = this.major.toString();
    str += this.minor !== undefined ? `.${this.minor}` : '';
    str += this.patch !== undefined ? `.${this.patch}` : '';

    return this.label ? `${str}-${this.label}` : str;
  }

  private constructor(
    public readonly major: number,
    public readonly minor?: number,
    /** Patch version cannot appear without minor version. */
    public readonly patch?: number,
    /** Label can appear even without major and minor version. */
    public readonly label?: string
  ) {}
}
