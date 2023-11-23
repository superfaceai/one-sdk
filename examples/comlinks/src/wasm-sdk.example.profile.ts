/// <reference types="@superface/map-std" />
type Example = Usecase<{
  safety: 'safe'
  input: { id: AnyValue }
  result: { url: AnyValue, method: AnyValue, query: AnyValue, headers: AnyValue }
  error: { title: AnyValue, detail?: AnyValue }
}>;
