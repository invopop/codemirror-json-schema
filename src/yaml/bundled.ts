import { JSONSchema7 } from "json-schema";
import { yaml, yamlLanguage } from "@codemirror/lang-yaml";
import { hoverTooltip, ViewPlugin } from "@codemirror/view";
import { handleRefresh } from "../features/validation";
import {
  stateExtensions,
  getJSONSchema,
  updateCompiledSchema,
} from "../features/state";

import { linter } from "@codemirror/lint";
import { yamlSchemaLinter } from "./validation";
import { yamlCompletion } from "./completion";
import { yamlSchemaHover } from "./hover";
import {
  schemaConfigFacet,
  type SchemaConfig,
} from "../features/schema-config";
import { RefResolver, type FetchSchemaFn } from "../features/ref-resolver";
import { compileSchema } from "json-schema-library";

export interface YamlSchemaOptions {
  schema?: JSONSchema7;
  fetchSchema?: FetchSchemaFn;
}

function isYamlSchemaOptions(
  arg: JSONSchema7 | YamlSchemaOptions | undefined,
): arg is YamlSchemaOptions {
  return (
    arg != null &&
    typeof arg === "object" &&
    "fetchSchema" in arg &&
    typeof arg.fetchSchema === "function"
  );
}

const yamlSchemaResolverPlugin = ViewPlugin.define((view) => {
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
 * Full featured cm6 extension for yaml, including `@codemirror/lang-yaml`
 * @group Bundled Codemirror Extensions
 */
export function yamlSchema(schemaOrOpts?: JSONSchema7 | YamlSchemaOptions) {
  let schema: JSONSchema7 | undefined;
  let fetchSchema: FetchSchemaFn | undefined;

  if (isYamlSchemaOptions(schemaOrOpts)) {
    schema = schemaOrOpts.schema;
    fetchSchema = schemaOrOpts.fetchSchema;
  } else {
    schema = schemaOrOpts;
  }

  const extensions = [
    yaml(),
    linter(yamlSchemaLinter(), {
      needsRefresh: handleRefresh,
    }),
    yamlLanguage.data.of({
      autocomplete: yamlCompletion(),
    }),
    hoverTooltip(yamlSchemaHover()),
    stateExtensions(schema),
  ];

  if (fetchSchema) {
    extensions.push(
      schemaConfigFacet.of({ fetchSchema }),
      yamlSchemaResolverPlugin,
    );
  }

  return extensions;
}
