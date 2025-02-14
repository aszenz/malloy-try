import { useCallback, useEffect, useMemo, useRef } from "react";
import * as malloy from "@malloydata/malloy";
import {
  EventModifiers,
  useQueryBuilder,
  UndoContext,
  useRunQuery,
  ExploreQueryEditor,
  StubCompile,
  RunQuery,
} from "@malloydata/query-composer";

import "@malloydata/render/webcomponent";
import { useTopValues } from "./hooks";
import { useParams, useSearchParams } from "react-router";
import { useRuntime } from "./contexts";

export default ModelExplorer;

function ModelExplorer() {
  const {
    model: { _modelDef: modelDef },
    runtime,
    refreshModel,
  } = useRuntime();
  const urlParams = useParams();
  const sourceName = urlParams.source;
  if (undefined === sourceName) {
    throw new Error("Source name is required");
  }
  const modelPath = "./"; // todo: think about the need for this
  // URL Parameter values
  const [searchParams, setSearchParams] = useSearchParams();

  const history = useRef<Array<malloy.TurtleDef | undefined>>([undefined]);
  const historyIndex = useRef(0);

  const updateQueryInUrl = useCallback(
    ({
      run,
      query: newQuery,
      turtle,
    }: {
      run: boolean;
      query: string | undefined;
      turtle: malloy.TurtleDef | undefined;
    }) => {
      history.current = history.current.slice(0, historyIndex.current + 1);
      history.current.push(turtle);
      historyIndex.current++;

      if (searchParams.get("query") === newQuery) {
        return;
      }
      if (newQuery === undefined) {
        searchParams.delete("query");
      } else {
        searchParams.set("query", newQuery);
        searchParams.delete("name");
      }
      if (run) {
        searchParams.set("run", "true");
      } else {
        searchParams.delete("run");
      }
      console.log({ urlParams: searchParams });
      setSearchParams(searchParams);

      console.info("updateQueryInUrl", history.current, historyIndex.current);
    },
    [searchParams, setSearchParams],
  );
  const runQueryImpl: RunQuery = useCallback(
    (query, model, modelPath, queryName) =>
      executeMalloyQuery(runtime, query, model, modelPath, queryName),
    [runtime],
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
  } = useRunQuery(modelDef, modelPath, runQueryImpl);

  useEffect(() => {
    async function loadQueryFromUrl() {
      try {
        const queryNameParam = searchParams.get("name");
        const querySrcParam = searchParams.get("query");
        const runParam = searchParams.get("run");
        if (null !== querySrcParam) {
          const compiler = new StubCompile();
          const compiledQuery = await compiler.compileQuery(
            modelDef,
            querySrcParam,
          );
          queryModifiers.setQuery(compiledQuery, true);
          if ("true" === runParam) {
            runQuery(querySrcParam, queryNameParam ?? "unnamed");
          }
        } else {
          searchParams.delete("query");
          searchParams.delete("run");
          searchParams.delete("name");
          queryModifiers.clearQuery(true);
        }
      } catch (error) {
        console.error(error);
      } finally {
        // setLoading(loading => --loading);
      }
    }
    void loadQueryFromUrl();
    // TODO: only run on start/urlParams changed
  }, [modelDef, queryModifiers, runQuery, searchParams]);

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
