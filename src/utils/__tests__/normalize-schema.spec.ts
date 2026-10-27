import { describe, expect, it } from "vitest";
import { normalizeRefSiblings } from "../normalize-schema";

describe("normalizeRefSiblings", () => {
  it("should move $ref siblings into an allOf", () => {
    expect(
      normalizeRefSiblings({
        properties: { key: { $ref: "#/$defs/key", title: "Key", enum: ["a"] } },
      }),
    ).toEqual({
      properties: {
        key: {
          title: "Key",
          allOf: [{ $ref: "#/$defs/key" }, { enum: ["a"] }],
        },
      },
    });
  });

  it("should leave data keywords unchanged", () => {
    const schema = {
      const: { $ref: "literal", type: "string" },
      enum: [{ $ref: "literal", type: "string" }],
      default: { $ref: "literal", type: "string" },
      examples: [{ $ref: "literal", type: "string" }],
    };
    expect(normalizeRefSiblings(schema)).toEqual(schema);
  });

  it("should normalize properties whose names are keywords", () => {
    expect(
      normalizeRefSiblings({
        properties: { const: { $ref: "#/$defs/key", enum: ["a"] } },
      }),
    ).toEqual({
      properties: {
        const: { allOf: [{ $ref: "#/$defs/key" }, { enum: ["a"] }] },
      },
    });
  });
});
