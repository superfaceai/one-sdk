export type JsonValue = number | boolean | string | null | { [k: number]: JsonValue } | { [k: string]: JsonValue };
export type JsonSchema = JsonValue;

export type Documentation = {
	title?: string,
	description?: string
}
export type Profile = {
	scope?: string,
	name: string,
	documentation: Documentation
	usecases: UseCase[]
}
export type UseCaseSafety = 'safe' | 'idempotent' | 'unsafe'
export type UseCaseExample = {
	name?: string,
	input: JsonValue,
	result: JsonValue
} | {
	name?: string,
	input: JsonValue,
	error: JsonValue
}
export type UseCase = {
	name: string,
	safety: UseCaseSafety,
	documentation: Documentation,
	input: JsonSchema,
	result: JsonSchema,
	error: JsonSchema,
	examples: UseCaseExample[]
}
export type Diagnostic = {
	severity: 'error' | 'warning',
	code: number,
	message: string,
	range: [number, number]
}
