import {
  Location as AstLocation,
  LocationSpan as AstLocationSpan,
} from '../../../ast';

import { isNewline } from './util';

export type Location = AstLocation;
export type LocationSpan = AstLocationSpan;
export type LocationOffset = {
  /** Line offset - this is basically how many lines there are preceding the one in question */
  line: number;
  /** Column offset - this only applies to the first line */
  column: number;
};

export type CharIndexSpan = {
  start: number;
  end: number;
};

/** Source text with additionaly metadata. */
export class Source {
  /** Actual text of the source. */
  body: string;
  /** Name of the file to display in errors. */
  fileName: string;
  /** Offset from the start of the file the body covers. */
  fileLocationOffset: LocationOffset;

  constructor(
    body: string,
    fileName?: string,
    fileLocationOffset?: LocationOffset
  ) {
    this.body = body;

    this.fileName = fileName ?? '[input]';
    this.fileLocationOffset = fileLocationOffset ?? { line: 0, column: 0 };
  }

  checksum(): string {
    const hash = this.body.length.toString(); // brr

    return hash;
  }

  applyLocationOffset(location: LocationSpan): LocationSpan {
    const startColumnShift =
      location.start.line === 1 ? this.fileLocationOffset.column : 0;
    const endColumnShift =
      location.end.line === 1 ? this.fileLocationOffset.column : 0;

    return {
      start: {
        line: this.fileLocationOffset.line + location.start.line,
        column: location.start.column + startColumnShift,
        charIndex: location.start.charIndex,
      },
      end: {
        line: this.fileLocationOffset.line + location.end.line,
        column: location.end.column + endColumnShift,
        charIndex: location.end.charIndex,
      },
    };
  }
}

/**
 * Computes the location of the end of the slice given the starting location.
 *
 * The final location is affected by newlines contained in the `slice`.
 */
export function computeEndLocation(
  slice: string,
  startLocation: Location
): Location {
  const charArray = Array.from(slice);
  const [newlines, newlineOffset] = charArray.reduce(
    (acc: [newlines: number, offset: number | undefined], char, index) => {
      if (isNewline(char.charCodeAt(0))) {
        acc[0] += 1;
        acc[1] = index;
      }

      return acc;
    },
    [0, undefined]
  );

  let column;
  if (newlineOffset === undefined) {
    // If no newlines were found the new column is just the old column plus the slice length
    column = startLocation.column + slice.length;
  } else {
    column = slice.length - newlineOffset;
  }

  return {
    line: startLocation.line + newlines,
    column,
    charIndex: startLocation.charIndex + slice.length,
  };
}
