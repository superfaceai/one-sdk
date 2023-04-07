import { VersionRange } from './version';

/**
 * Generic structure that covers both partial profile and partial map ids.
 */
export type DocumentId = {
  /** The optional leading scope before `/`. */
  scope?: string;
  /** The middle portion between of the `[<scope>/]middle[@<version>]`, split by `.`. */
  middle: string[];
  /** The optional trailing version after `@`. */
  version?: VersionRange;
};

/** Information encoded in the profile id string. */
export type ProfileIdRange = {
  /** Scope of the profile, if any. */
  scope?: string;
  /** Name of the profile. */
  name: string;
  /** Version of the profile. */
  version: VersionRange;
};

/** Information encoded in the map id string. */
export type MapDocumentId = {
  scope?: string;
  name: string;
  provider: string;
  variant?: string;
  version: {
    major: number;
    minor?: number;
    revision?: number;
  };
};
