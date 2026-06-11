/**
 * JSON Schema 2020-12 treats `$ref` as an applicator that combines with any
 * sibling keywords (the implicit "and" of all assertions on the same object).
 * Earlier drafts (4/7) instead said a `$ref` replaces its siblings entirely.
 *
 * `json-schema-library` resolves a `$ref` by replacing the node with its
 * target, dropping sibling keywords — the old draft-4/7 behaviour — even when
 * the schema declares draft 2020-12. That silently discards constructs like:
 *
 *   { "$ref": "#/$defs/cbc.Key", "oneOf": [ { "const": "..." }, ... ] }
 *
 * where the `oneOf` carries the meaningful constraint (e.g. the list of
 * available `$addons` keys in a GOBL invoice). The resolved schema becomes a
 * bare string, so no enum/const completions are offered and the constraint is
 * not validated.
 *
 * This normalizer rewrites such nodes into the equivalent, draft-agnostic form
 *
 *   { "allOf": [ { "$ref": "#/$defs/cbc.Key" }, { "oneOf": [ ... ] } ] }
 *
 * which every draft (and `json-schema-library`) handles identically: both
 * members must hold, and the sibling keywords survive `getNode()` resolution.
 * Pure annotation keywords (title, description, …) are left alongside the new
 * `allOf` so property name/hover metadata is preserved.
 */

// Keywords that annotate rather than constrain. They are kept at the top level
// (next to the generated `allOf`) so consumers reading them directly — e.g.
// property-name completion and hover — still see them.
const ANNOTATION_KEYWORDS = new Set([
  "title",
  "description",
  "default",
  "examples",
  "deprecated",
  "readOnly",
  "writeOnly",
  "$comment",
  "$id",
  "$anchor",
  "$schema",
  "$defs",
  "definitions",
  "$dynamicAnchor",
  "$vocabulary",
]);

/**
 * Recursively rewrites every `$ref` that has constraining sibling keywords into
 * an `allOf` of the bare `$ref` and those siblings, so draft 2020-12 `$ref`
 * sibling semantics are honoured regardless of the resolver's default draft.
 *
 * The transform is idempotent: a second pass finds the `$ref` alone inside an
 * `allOf` member (no constraining siblings) and leaves it untouched.
 */
export function normalizeRefSiblings<T>(schema: T): T {
  if (Array.isArray(schema)) {
    return schema.map((entry) => normalizeRefSiblings(entry)) as unknown as T;
  }
  if (schema === null || typeof schema !== "object") {
    return schema;
  }

  const input = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = normalizeRefSiblings(value);
  }

  if (typeof out.$ref === "string") {
    const constraintKeys = Object.keys(out).filter(
      (key) => key !== "$ref" && !ANNOTATION_KEYWORDS.has(key),
    );
    if (constraintKeys.length > 0) {
      const ref = out.$ref as string;
      const constraints: Record<string, unknown> = {};
      for (const key of constraintKeys) {
        constraints[key] = out[key];
        delete out[key];
      }
      delete out.$ref;
      out.allOf = [{ $ref: ref }, constraints];
    }
  }

  return out as unknown as T;
}
