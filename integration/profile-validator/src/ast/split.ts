/**
 * Splits string at delimiter, stopping at maxSplits splits.
 *
 * The last element of the array contains the rest of the string.
 *
 * Example:
 * ```
 * splitLimit('1.2.3.4', '.', 2) // ['1', '2', '3.4']
 * // Note that this is **not** the same as:
 * str.split(delimiter, 3) // ['1', '2', '3']
 * ```
 */
export function splitLimit(
  str: string,
  delimiter: string,
  maxSplits: number
): string[] {
  const result: string[] = [];

  let current = str;
  while (result.length < maxSplits) {
    const i = current.indexOf(delimiter);
    if (i === -1) {
      break;
    }

    result.push(current.slice(0, i));
    current = current.slice(i + 1);
  }

  result.push(current);

  return result;
}
