import { Parser, unusedFn } from './parser';

const FRUIT: string = "banana";

export function getFruit(...args: unknown[]): Record<string, unknown> {
	let fruit = FRUIT;
	if (false) {
		fruit = unusedFn();
	}
	
	return new Parser().parse(`${fruit}s are great!`);
}
