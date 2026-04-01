import type { JSONSchema7 } from "json-schema";
import { compileSchema, type SchemaNode } from "json-schema-library";

export type FetchSchemaFn = (url: string) => Promise<any | undefined>;

/**
 * Recursively walks a JSON schema object and collects all external `$ref` URLs
 * (those starting with `http://` or `https://`). Fragments (`#/...`) are stripped
 * to produce base URLs. Returns a deduplicated `Set<string>`.
 */
export function collectExternalRefs(
  schema: any,
  collected?: Set<string>,
): Set<string> {
  const refs = collected ?? new Set<string>();
  if (!schema || typeof schema !== "object") return refs;

  if (Array.isArray(schema)) {
    for (const item of schema) {
      collectExternalRefs(item, refs);
    }
    return refs;
  }

  if (typeof schema.$ref === "string") {
    const ref: string = schema.$ref;
    if (ref.startsWith("http://") || ref.startsWith("https://")) {
      // Strip fragment to get the base URL
      const baseUrl = ref.split("#")[0];
      if (baseUrl) {
        refs.add(baseUrl);
      }
    }
  }

  // Walk all schema keywords that can contain nested schemas
  const keywords = [
    "properties",
    "additionalProperties",
    "items",
    "allOf",
    "anyOf",
    "oneOf",
    "if",
    "then",
    "else",
    "$defs",
    "definitions",
    "patternProperties",
    "prefixItems",
    "contains",
  ];

  for (const keyword of keywords) {
    const value = schema[keyword];
    if (!value || typeof value !== "object") continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        collectExternalRefs(item, refs);
      }
    } else if (
      keyword === "properties" ||
      keyword === "$defs" ||
      keyword === "definitions" ||
      keyword === "patternProperties"
    ) {
      for (const key of Object.keys(value)) {
        collectExternalRefs(value[key], refs);
      }
    } else {
      collectExternalRefs(value, refs);
    }
  }

  return refs;
}

export class RefResolver {
  private cache: Map<string, any> = new Map();
  private pending: Map<string, Promise<any | undefined>> = new Map();
  private fetchSchema: FetchSchemaFn;

  constructor(fetchSchema: FetchSchemaFn) {
    this.fetchSchema = fetchSchema;
  }

  async compileAndResolve(schema: JSONSchema7): Promise<SchemaNode> {
    const node = compileSchema(schema);

    const visited = new Set<string>();
    await this.resolveRefs(schema, node, visited);

    return node;
  }

  private async resolveRefs(
    schema: any,
    node: SchemaNode,
    visited: Set<string>,
  ): Promise<void> {
    const refs = collectExternalRefs(schema);

    // Filter out already-visited URLs (cycle prevention)
    const newUrls: string[] = [];
    for (const url of refs) {
      if (!visited.has(url)) {
        visited.add(url);
        newUrls.push(url);
      }
    }

    if (newUrls.length === 0) return;

    // Fetch all new URLs in parallel
    const results = await Promise.allSettled(
      newUrls.map((url) => this.fetchOne(url)),
    );

    // Register fetched schemas and collect them for transitive resolution
    const fetchedSchemas: any[] = [];
    for (let i = 0; i < newUrls.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled" && result.value != null) {
        const fetched = result.value;
        node.addRemoteSchema(newUrls[i], fetched);
        fetchedSchemas.push(fetched);
      }
    }

    // Recursively resolve transitive refs from fetched schemas
    for (const fetched of fetchedSchemas) {
      await this.resolveRefs(fetched, node, visited);
    }
  }

  private fetchOne(url: string): Promise<any | undefined> {
    // Return from cache if available
    if (this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url));
    }

    // Deduplicate in-flight requests
    if (this.pending.has(url)) {
      return this.pending.get(url)!;
    }

    const promise = this.fetchSchema(url).then(
      (result) => {
        if (result != null) {
          this.cache.set(url, result);
        }
        this.pending.delete(url);
        return result;
      },
      () => {
        this.pending.delete(url);
        return undefined;
      },
    );

    this.pending.set(url, promise);
    return promise;
  }
}
