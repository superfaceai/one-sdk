/// <reference types="@superface/map-std" />

/**
 * The usecase title
 * 
 * The usecase description is anything following the title.
 */
type UseCaseName = UseCase<{
  // any of `'safe'`, `'idempotent'`, `'unsafe'`
  safety: 'safe'

  /** Title of input */
  input: {
    // documentation of fields done using `/** text */` syntax NOT `//` syntax
    /** This is a numeric ID of the item to fetch. */
    id: number
  }

  /** Title of result
   * 
   * Description of result
   * On multiple lines
  */
  result: {
    // non-required field
    name?: string
    // nullable type
    title: string | null
    // `AnyValue` is our type which acts the same as leaving out a type in Comlink profile
    // it comes from the package @superfaceai/map-std where we will define other supported types, for example for binary data
    value: AnyValue
  }

  error: { codes: Array<string> } | { message: string }
}>;

const UseCaseExamples: UseCaseName['examples'] = [
  { input: { id: 1 }, result: { title: 'example title', value: true } },
  { name: 'second example', input: { id: -1 }, error: { message: 'invalid id' } }
]
