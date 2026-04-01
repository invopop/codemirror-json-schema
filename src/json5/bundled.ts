import { JSONSchema7 } from "json-schema";
import { json5, json5Language, json5ParseLinter } from "codemirror-json5";
import { hoverTooltip, ViewPlugin } from "@codemirror/view";
import { json5Completion } from "./completion";
import { json5SchemaLinter } from "./validation";
import { json5SchemaHover } from "./hover";

import { linter } from "@codemirror/lint";
import { handleRefresh } from "../features/validation";
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

const json5SchemaResolverPlugin = ViewPlugin.define((view) => {
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

    updateCompiledSchema(view, compileSchema(raw));

    resolver.compileAndResolve(raw).then((compiled) => {
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
      json5SchemaResolverPlugin,
    );
  }

  return extensions;
}
