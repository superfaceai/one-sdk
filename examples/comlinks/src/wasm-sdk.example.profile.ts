/// <reference types="@superfaceai/map-std" />
type Example = UseCase<{
  safety: 'safe'
  input: { id: AnyValue }
  result: { url: AnyValue, method: AnyValue, query: AnyValue, headers: AnyValue, x?: 1, y: true, z: "seven" }
  error: { title: AnyValue, detail?: AnyValue, r: boolean }
}>;

const exampleExamples: Example['examples'] = [
  { input: { id: "a" }, result: { url: 1, method: 2, query: 3, headers: 4, x: 1, y: true, z: 'seven' } },
  { input: { id: 1 }, error: { title: "hi", r: true } }
]