import { JSONSchema7 } from "json-schema";
import { json, jsonLanguage, jsonParseLinter } from "@codemirror/lang-json";
import { hoverTooltip, ViewPlugin } from "@codemirror/view";
import { jsonCompletion } from "../features/completion";
import { handleRefresh, jsonSchemaLinter } from "../features/validation";
import { jsonSchemaHover } from "../features/hover";
import {
  stateExtensions,
  getJSONSchema,
  updateCompiledSchema,
} from "../features/state";
import {
  schemaConfigFacet,
  type SchemaConfig,
} from "../features/schema-config";
import { RefResolver, type FetchSchemaFn } from "../features/ref-resolver";
import { compileSchema } from "json-schema-library";

import { linter } from "@codemirror/lint";

export interface JsonSchemaOptions {
  schema?: JSONSchema7;
  fetchSchema?: FetchSchemaFn;
}

function isJsonSchemaOptions(
  arg: JSONSchema7 | JsonSchemaOptions | undefined,
): arg is JsonSchemaOptions {
  return (
    arg != null &&
    typeof arg === "object" &&
    "fetchSchema" in arg &&
    typeof arg.fetchSchema === "function"
  );
}

const schemaResolverPlugin = ViewPlugin.define((view) => {
  let lastRawSchema: JSONSchema7 | void = undefined;
  const config = view.state.facet(schemaConfigFacet);
  const fetchFn = config.fetchSchema;
  if (!fetchFn) return { update() {} };

  const resolver = new RefResolver(fetchFn);

  function maybeResolve(view: import("@codemirror/view").EditorView) {
    const raw = getJSONSchema(view.state);
    if (raw === lastRawSchema) return;
    lastRawSchema = raw;
    if (!raw) {
      updateCompiledSchema(view, undefined);
      return;
    }

    // Immediate: compile without remotes so features work right away
    updateCompiledSchema(view, compileSchema(raw));

    // Async: resolve all external refs, then update with full compiled node
    resolver.compileAndResolve(raw).then((compiled) => {
      // Check that the schema hasn't changed while we were resolving
      if (getJSONSchema(view.state) === raw) {
        updateCompiledSchema(view, compiled);
      }
    });
  }

  maybeResolve(view);
  return {
    update(vu: import("@codemirror/view").ViewUpdate) {
      maybeResolve(vu.view);
    },
  };
});

/**
 * Full featured cm6 extension for json, including `@codemirror/lang-json`
 * @group Bundled Codemirror Extensions
 */
export function jsonSchema(schemaOrOpts?: JSONSchema7 | JsonSchemaOptions) {
  let schema: JSONSchema7 | undefined;
  let fetchSchema: FetchSchemaFn | undefined;

  if (isJsonSchemaOptions(schemaOrOpts)) {
    schema = schemaOrOpts.schema;
    fetchSchema = schemaOrOpts.fetchSchema;
  } else {
    schema = schemaOrOpts;
  }

  const extensions = [
    json(),
    linter(jsonParseLinter()),
    linter(jsonSchemaLinter(), {
      needsRefresh: handleRefresh,
    }),
    jsonLanguage.data.of({
      autocomplete: jsonCompletion(),
    }),
    hoverTooltip(jsonSchemaHover()),
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
