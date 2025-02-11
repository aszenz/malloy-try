import { useCallback, useMemo, useRef } from "react";
import * as malloy from "@malloydata/malloy";
import {
  EventModifiers,
  useQueryBuilder,
  UndoContext,
  useRunQuery,
  ExploreQueryEditor,
} from "@malloydata/query-composer";

import "@malloydata/render/webcomponent";
import { useTopValues } from "./hooks";

export default ModelExplorer;

function ModelExplorer({
  runtime,
  modelDef,
  modelPath,
  sourceName,
  refreshModel,
}: {
  runtime: malloy.Runtime;
  modelDef: malloy.ModelDef;
  modelPath: string;
  sourceName: string;
  refreshModel: () => void;
}) {
  const history = useRef<Array<malloy.TurtleDef | undefined>>([undefined]);
  const historyIndex = useRef(0);

  const updateQueryInUrl = useCallback(
    ({ turtle }: { turtle: malloy.TurtleDef | undefined }) => {
      history.current = history.current.slice(0, historyIndex.current + 1);
      history.current.push(turtle);
      historyIndex.current++;

      console.info("updateQueryInUrl", history.current, historyIndex.current);
    },
    [],
  );
  const {
    error: builderError,
    queryWriter,
    queryModifiers,
    querySummary,
  } = useQueryBuilder(modelDef, sourceName, modelPath, updateQueryInUrl);
  const {
    error: runnerError,
    result,
    runQuery,
    isRunning,
  } = useRunQuery(modelDef, modelPath, (query, model, modelPath, queryName) =>
    executeMalloyQuery(runtime, query, model, modelPath, queryName),
  );

  const source = getSourceDef(modelDef, sourceName);

  const queryName = querySummary?.name ?? "new_query";

  const runQueryAction = useCallback(() => {
    const query = queryWriter.getQueryStringForNotebook();
    if (query) {
      runQuery(query, queryName);
    }
  }, [queryName, queryWriter, runQuery]);

  const { topValues, refresh: refreshTopValues } = useTopValues(
    runtime,
    modelDef,
    source,
    modelPath,
  );

  const refresh = useCallback(
    ({ shiftKey }: EventModifiers) => {
      refreshModel();
      if (shiftKey) {
        refreshTopValues();
      }
    },
    [refreshModel, refreshTopValues],
  );

  const undoContext = useMemo(() => {
    const updateQuery = () => {
      const turtle = history.current[historyIndex.current];
      if (undefined !== turtle) {
        queryModifiers.setQuery(turtle, true);
      } else {
        queryModifiers.clearQuery(true);
      }
    };

    const canRedo = () => historyIndex.current < history.current.length - 1;
    const canUndo = () => historyIndex.current > 0;

    const undo = () => {
      if (canUndo()) {
        historyIndex.current--;
        updateQuery();
      }
      console.info("undo", history.current, historyIndex.current);
    };

    const redo = () => {
      if (canRedo()) {
        historyIndex.current++;
        updateQuery();
      }
      console.info("redo", history.current, historyIndex.current);
    };

    return { canRedo, canUndo, redo, undo };
  }, [queryModifiers]);

  return (
    <UndoContext.Provider value={undoContext}>
      <div className="editor">
        <ExploreQueryEditor
          model={modelDef}
          modelPath={modelPath}
          source={source}
          queryModifiers={queryModifiers}
          topValues={topValues}
          queryWriter={queryWriter}
          querySummary={querySummary}
          result={result ?? runnerError ?? builderError}
          runQuery={runQueryAction}
          refreshModel={refresh}
          isRunning={isRunning}
        />
      </div>
    </UndoContext.Provider>
  );
}

async function executeMalloyQuery(
  runtime: malloy.Runtime,
  query: string,
  model: malloy.ModelDef,
  modelPath: string,
  queryName?: string,
): Promise<malloy.Result> {
  const baseModel = await runtime._loadModelFromModelDef(model).getModel();
  const queryModel = await malloy.Malloy.compile({
    urlReader: runtime.urlReader,
    connections: runtime.connections,
    model: baseModel,
    parse: malloy.Malloy.parse({ source: query }),
  });
  console.log("Running query", { modelPath, queryName });
  const runnable = runtime
    ._loadModelFromModelDef(queryModel._modelDef)
    .loadQuery(query);
  const rowLimit = (await runnable.getPreparedResult()).resultExplore.limit;
  return runnable.run({ rowLimit });
}

function getSourceDef(
  modelDef: malloy.ModelDef,
  name: string,
): malloy.SourceDef {
  const result = modelDef.contents[name];
  if (malloy.isSourceDef(result)) {
    return result;
  }
  throw new Error(`Not a source: ${name}`);
}
