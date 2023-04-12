import type { MultiMap } from './types';

export function ensureMultimap(map: unknown, lowercaseKeys: boolean = false): MultiMap {
	const result: MultiMap = {};

	if (typeof map !== 'object' || map === null) {
		return result;
	}

	for (let [key, value] of Object.entries(map)) {
		if (lowercaseKeys) {
			key = key.toLowerCase();
		}

		if (!Array.isArray(value)) {
			value = [value];
		}

		result[key] = value.filter((v: any) => v !== undefined && v !== null).map((v: any) => v.toString());
	}

	return result;
}
