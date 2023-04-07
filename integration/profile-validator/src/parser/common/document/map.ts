import { splitLimit } from '../../../ast';

import { ProfileId } from '.';
import { parseRevisionLabel, tryParseVersionNumber } from './parser';
import { VersionRange } from './version';

/**
 * Class representing map version, every property except patch and label is required
 * Difference between this class and VersionRange is in optionality of properties - VersionRange is a more abstract structure
 */
export class MapVersion {
  public static fromVersionRange(input: VersionRange): MapVersion {
    if (input.minor === undefined) {
      throw new Error(
        `Invalid map version: ${input.toString()} - minor version is required`
      );
    }

    let revision = undefined;
    if (input.label) {
      const parseResult = parseRevisionLabel(input.label);
      if (parseResult.kind === 'error') {
        throw new Error(
          `Invalid map version: ${input.toString()} - revision has error: ${
            parseResult.message
          }`
        );
      }

      revision = parseResult.value;
    }

    return new MapVersion(input.major, input.minor, revision);
  }

  public static fromString(input: string): MapVersion {
    const [restVersion, label] = splitLimit(input, '-', 1);
    const [majorStr, minorStr] = splitLimit(restVersion, '.', 1);

    const major = tryParseVersionNumber(majorStr);
    if (major === undefined) {
      throw new Error(
        `Invalid map version: ${input} - major component: ${majorStr} is not a valid number`
      );
    }
    const minor = tryParseVersionNumber(minorStr);
    if (minor === undefined) {
      throw new Error(
        `Invalid map version: ${input} - minor component: ${minorStr} is not a valid number`
      );
    }

    let revision = undefined;
    if (label) {
      const parseResult = parseRevisionLabel(label);
      if (parseResult.kind === 'error') {
        throw new Error(
          `Invalid map version: ${input.toString()} - revision has error: ${
            parseResult.message
          }`
        );
      }
      revision = parseResult.value;
    }

    return new MapVersion(major, minor, revision);
  }

  public static fromParameters(params: {
    major: number;
    minor: number;
    revision?: number;
  }): MapVersion {
    return new MapVersion(params.major, params.minor, params.revision);
  }

  toString(): string {
    const str = `${this.major}.${this.minor}`;

    return this.revision !== undefined ? `${str}-rev${this.revision}` : str;
  }

  private constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly revision?: number
  ) {}
}

/**
 * Represents default value of profile version in ProfileId instance
 */
export const DEFAULT_MAP_VERSION = MapVersion.fromParameters({
  major: 1,
  minor: 0,
});

/**
 * Class representing map id
 */
export class MapId {
  public readonly profile: ProfileId;
  //In map id version has to contain major and minor property, others are optional
  public readonly version: MapVersion;
  public readonly provider: string;
  public readonly variant?: string;

  //TODO: fromId

  public static fromParameters(params: {
    profile: ProfileId;
    version: MapVersion;
    provider: string;
    variant?: string;
  }): MapId {
    return new MapId(
      params.profile,
      params.version,
      params.provider,
      params.variant
    );
  }

  private constructor(
    profile: ProfileId,
    version: MapVersion,
    provider: string,
    variant?: string
  ) {
    if (!profile.version) {
      throw new Error(
        `Invalid map id - map version: ${version.toString()} and undefined profile version does not match`
      );
    }
    if (profile.version.major !== version.major) {
      throw new Error(
        `Invalid map id - major component of map version: ${version.major} and major component of profile version: ${profile.version.major} does not match`
      );
    }
    if (profile.version.minor !== version.minor) {
      throw new Error(
        `Invalid map id - minor component of map version: ${version.minor} and minor component of profile version: ${profile.version.minor} does not match`
      );
    }

    this.profile = profile;
    this.version = version;
    this.provider = provider;
    this.variant = variant;
  }

  toString(): string {
    let id = `${this.profile.withoutVersion}.${this.provider}`;
    if (this.variant) {
      id += `.${this.variant}`;
    }

    return id + `@${this.version.toString()}`;
  }
}
