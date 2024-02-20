import { ComlinkParser } from './index.js'

const profile1 = {
  source: `
/// <reference types="@superface/map-std" />

type UseCaseName = UseCase<{
  safety: 'safe'

  /** Title of input */
  input: {
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
    value: AnyValue
  }

  error: { codes: Array<string> } | { message: string }
}>;

const UseCaseExamples: UseCaseName['examples'] = [
  { input: { id: 1 }, result: { title: 'example title', value: true } },
  { name: 'second example', input: { id: -1 }, error: { message: 'invalid id' } }
]
`,
  parsed: {
    "documentation": {
      "description": null,
      "title": null
    },
    "id": {
      "name": "example",
      "scope": "wasm-sdk",
      "version": "0.0.0"
    },
    "usecases": [
      {
        "documentation": {
          "description": null,
          "title": null
        },
        "error": {
          "$defs": {
            "AnyValue": {
              "oneOf": [
                {
                  "type": "null"
                },
                {
                  "type": "string"
                },
                {
                  "type": "number"
                },
                {
                  "type": "boolean"
                },
                {
                  "items": {
                    "$ref": "#/$defs/AnyValue"
                  },
                  "type": "array"
                },
                {
                  "additionalProperties": {
                    "$ref": "#/$defs/AnyValue"
                  },
                  "type": "object"
                }
              ]
            }
          },
          "oneOf": [
            {
              "additionalProperties": false,
              "properties": {
                "codes": {
                  "items": {
                    "type": "string"
                  },
                  "type": "array"
                }
              },
              "required": [
                "codes"
              ],
              "type": "object"
            },
            {
              "additionalProperties": false,
              "properties": {
                "message": {
                  "type": "string"
                }
              },
              "required": [
                "message"
              ],
              "type": "object"
            }
          ]
        },
        "examples": [
          {
            "input": {
              "id": 1.0
            },
            "result": {
              "title": "example title",
              "value": true
            }
          },
          {
            "error": {
              "message": "invalid id"
            },
            "input": {
              "id": -1.0
            },
            "name": "second example"
          }
        ],
        "input": {
          "$defs": {
            "AnyValue": {
              "oneOf": [
                {
                  "type": "null"
                },
                {
                  "type": "string"
                },
                {
                  "type": "number"
                },
                {
                  "type": "boolean"
                },
                {
                  "items": {
                    "$ref": "#/$defs/AnyValue"
                  },
                  "type": "array"
                },
                {
                  "additionalProperties": {
                    "$ref": "#/$defs/AnyValue"
                  },
                  "type": "object"
                }
              ]
            }
          },
          "additionalProperties": false,
          "properties": {
            "id": {
              "title": "This is a numeric ID of the item to fetch.",
              "type": "number"
            }
          },
          "required": [
            "id"
          ],
          "title": "Title of input",
          "type": "object"
        },
        "name": "UseCaseName",
        "result": {
          "$defs": {
            "AnyValue": {
              "oneOf": [
                {
                  "type": "null"
                },
                {
                  "type": "string"
                },
                {
                  "type": "number"
                },
                {
                  "type": "boolean"
                },
                {
                  "items": {
                    "$ref": "#/$defs/AnyValue"
                  },
                  "type": "array"
                },
                {
                  "additionalProperties": {
                    "$ref": "#/$defs/AnyValue"
                  },
                  "type": "object"
                }
              ]
            }
          },
          "additionalProperties": false,
          "description": "Description of result\nOn multiple lines",
          "properties": {
            "name": {
              "type": "string"
            },
            "title": {
              "oneOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ]
            },
            "value": {
              "$ref": "#/$defs/AnyValue"
            }
          },
          "required": [
            "title",
            "value"
          ],
          "title": "Title of result",
          "type": "object"
        },
        "safety": "safe"
      }
    ]
  }
}

describe('Comlink parser', () => {
  test('parses typescript profile', async () => {
    const parser = await ComlinkParser.create()
    const r = parser.parseProfile(profile1.source, 'foo/bar/wasm-sdk.example.profile.ts')
    expect(r.profile).toStrictEqual(profile1.parsed)
  })
})
