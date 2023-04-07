import { splitLimit } from '../../../ast';

import { parseDocumentId, tryParseVersionNumber, VersionRange } from '.';

//TODO: move version stuff to verstion.ts??
/**
 * Class representing profile version, every property except label is required
 * Difference between this class and VersionRange is in optionality of properties - VersionRange is a more abstract structure
 */
export class ProfileVersion {
  public static fromVersionRange(input: VersionRange): ProfileVersion {
    if (input.minor === undefined) {
      throw new Error(
        `Invalid profile version: ${input.toString()} - minor version is required`
      );
    }

    if (input.patch === undefined) {
      throw new Error(
        `Invalid profile version: ${input.toString()} - patch version is required`
      );
    }

    return new ProfileVersion(
      input.major,
      input.minor,
      input.patch,
      input.label
    );
  }

  public static fromString(input: string): ProfileVersion {
    const [restVersion, label] = splitLimit(input, '-', 1);
    const [majorStr, minorStr, patchStr] = splitLimit(restVersion, '.', 2);

    const major = tryParseVersionNumber(majorStr);
    if (major === undefined) {
      throw new Error(
        `Invalid profile version: ${input} - major component: ${majorStr} is not a valid number`
      );
    }
    const minor = tryParseVersionNumber(minorStr);
    if (minor === undefined) {
      throw new Error(
        `Invalid profile version: ${input} - minor component: ${minorStr} is not a valid number`
      );
    }
    const patch = tryParseVersionNumber(patchStr);

    if (patch === undefined) {
      throw new Error(
        `Invalid profile version: ${input} - patch component: ${patchStr} is not a valid number`
      );
    }

    return new ProfileVersion(major, minor, patch, label);
  }

  public static fromParameters(params: {
    major: number;
    minor: number;
    patch: number;
    label?: string;
  }): ProfileVersion {
    return new ProfileVersion(
      params.major,
      params.minor,
      params.patch,
      params.label
    );
  }

  toString(): string {
    const str = `${this.major}.${this.minor}.${this.patch}`;

    return this.label ? `${str}-${this.label}` : str;
  }

  private constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
    public readonly label?: string
  ) {}
}

/**
 * Represents default value of profile version in ProfileId instance
 */
export const DEFAULT_PROFILE_VERSION = ProfileVersion.fromParameters({
  major: 1,
  minor: 0,
  patch: 0,
});

export class ProfileId {
  /**
   * Creates instance of ProfileId from string
   * @param profileId string in format {scope/}{name}{@major.minor.path-label} where scope,label and entire version is optional
   * @param versionString optional string representation of profile version, useful when creating ProfileId from two separate strings
   * @returns instance of ProfileId
   */
  public static fromId(profileId: string, versionString?: string): ProfileId {
    const parsed = parseDocumentId(profileId);
    if (parsed.kind === 'error') {
      throw new Error(`Invalid profile id: ${parsed.message}`);
    }
    //Name is required
    if (parsed.value.middle.length !== 1) {
      throw new Error(
        `"${parsed.value.middle.join('.')}" is not a valid lowercase identifier`
      );
    }

    let version: ProfileVersion | undefined = undefined;
    if (parsed.value.version) {
      version = ProfileVersion.fromVersionRange(parsed.value.version);
    } else if (versionString) {
      version = ProfileVersion.fromString(versionString);
    }

    return new ProfileId(parsed.value.scope, version, parsed.value.middle[0]);
  }

  public static fromParameters(params: {
    scope?: string;
    version?: ProfileVersion;
    name: string;
  }): ProfileId {
    return new ProfileId(params.scope, params.version, params.name);
  }

  private constructor(
    public readonly scope: string | undefined,
    public readonly version: ProfileVersion | undefined,
    public readonly name: string
  ) {}

  /**
   * Returns profile id without version
   */
  get withoutVersion(): string {
    return this.scope ? `${this.scope}/${this.name}` : this.name;
  }

  /**
   * Stringified profile id with version if version is defined
   * @returns stringified profile id
   */
  toString(): string {
    if (this.version) {
      return this.withoutVersion + `@${this.version.toString()}`;
    }

    return this.withoutVersion;
  }
}
