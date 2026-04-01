import { Facet } from "@codemirror/state";
import type { FetchSchemaFn } from "./ref-resolver";

export interface SchemaConfig {
  fetchSchema?: FetchSchemaFn;
}

export const schemaConfigFacet = Facet.define<SchemaConfig, SchemaConfig>({
  combine: (configs) => Object.assign({}, ...configs),
});
