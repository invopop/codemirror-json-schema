import { ViewPlugin, type EditorView, type ViewUpdate } from "@codemirror/view";
import type { JSONSchema7 } from "json-schema";
import { compileSchema } from "json-schema-library";
import { getJSONSchema, updateCompiledSchema } from "./state";
import { schemaConfigFacet } from "./schema-config";
import { RefResolver } from "./ref-resolver";

/**
 * ViewPlugin that watches for raw schema changes, compiles immediately,
 * then asynchronously resolves all external $ref URLs and updates the
 * compiled schema with remote schemas registered.
 *
 * All dispatches are deferred via setTimeout to avoid dispatching
 * while a CodeMirror update is already in progress.
 */
export const schemaResolverPlugin = ViewPlugin.define((view) => {
  let lastRawSchema: JSONSchema7 | void = undefined;
  const config = view.state.facet(schemaConfigFacet);
  const fetchFn = config.fetchSchema;
  if (!fetchFn) return { update() {} };

  const resolver = new RefResolver(fetchFn);

  function dispatchCompiled(
    view: EditorView,
    raw: JSONSchema7,
    node: import("json-schema-library").SchemaNode | undefined,
  ) {
    // Only update if the raw schema hasn't changed since we started
    if (getJSONSchema(view.state) === raw) {
      updateCompiledSchema(view, node);
    }
  }

  function maybeResolve(view: EditorView) {
    const raw = getJSONSchema(view.state);
    if (raw === lastRawSchema) return;
    lastRawSchema = raw;
    if (!raw) {
      // Defer to avoid dispatching during an update
      setTimeout(() => dispatchCompiled(view, raw!, undefined), 0);
      return;
    }

    // Defer immediate compile so features work right away without crashing
    const compiled = compileSchema(raw);
    setTimeout(() => dispatchCompiled(view, raw, compiled), 0);

    // Async: resolve all external refs, then update with full compiled node
    resolver.compileAndResolve(raw).then((fullCompiled) => {
      dispatchCompiled(view, raw, fullCompiled);
    });
  }

  maybeResolve(view);
  return {
    update(vu: ViewUpdate) {
      maybeResolve(vu.view);
    },
  };
});
