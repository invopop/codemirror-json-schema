import { JSONSchema7 } from "json-schema";
import { json5, json5Language, json5ParseLinter } from "codemirror-json5";
import { hoverTooltip } from "@codemirror/view";
import { json5Completion } from "./completion";
import { json5SchemaLinter } from "./validation";
import { json5SchemaHover } from "./hover";

import { linter } from "@codemirror/lint";
import { handleRefresh } from "../features/validation";
import { stateExtensions } from "../features/state";
import { schemaConfigFacet } from "../features/schema-config";
import { schemaResolverPlugin } from "../features/schema-resolver";
import { type FetchSchemaFn } from "../features/ref-resolver";

export interface Json5SchemaOptions {
  schema?: JSONSchema7;
  fetchSchema?: FetchSchemaFn;
}

function isJson5SchemaOptions(
  arg: JSONSchema7 | Json5SchemaOptions | undefined,
): arg is Json5SchemaOptions {
  return (
    arg != null &&
    typeof arg === "object" &&
    "fetchSchema" in arg &&
    typeof arg.fetchSchema === "function"
  );
}

/**
 * Full featured cm6 extension for json5, including `codemirror-json5`
 * @group Bundled Codemirror Extensions
 */
export function json5Schema(schemaOrOpts?: JSONSchema7 | Json5SchemaOptions) {
  let schema: JSONSchema7 | undefined;
  let fetchSchema: FetchSchemaFn | undefined;

  if (isJson5SchemaOptions(schemaOrOpts)) {
    schema = schemaOrOpts.schema;
    fetchSchema = schemaOrOpts.fetchSchema;
  } else {
    schema = schemaOrOpts;
  }

  const extensions = [
    json5(),
    linter(json5ParseLinter()),
    linter(json5SchemaLinter(), {
      needsRefresh: handleRefresh,
    }),
    json5Language.data.of({
      autocomplete: json5Completion(),
    }),
    hoverTooltip(json5SchemaHover()),
    stateExtensions(schema),
  ];

  if (fetchSchema) {
    extensions.push(
      schemaConfigFacet.of({ fetchSchema }),
      schemaResolverPlugin,
    );
  }

  return extensions;
}
