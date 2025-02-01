import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as malloy from "@malloydata/malloy";
import {
  EventModifiers,
  useQueryBuilder,
  StubCompile,
  UndoContext,
  useRunQuery,
  ExploreQueryEditor,
} from "@malloydata/query-composer";

import { SourceDef } from "@malloydata/malloy";
import { SingleConnectionRuntime } from "@malloydata/malloy";

import { DuckDBWASMConnection } from "@malloydata/db-duckdb/wasm";
import "@malloydata/render/webcomponent";

const stubCompile = new StubCompile();

/**
 * https://github.com/malloydata/malloy-composer/blob/main/src/app/Explore/Explore.tsx
 */
export function App() {
  const setup = useRuntimeSetup();

  if (null === setup) {
    return <div>Loading...</div>;
  }
  return (
    <ModelExplorer
      runtime={setup.runtime}
      modelDef={setup.modelDef}
      refreshModel={setup.refreshModel}
    />
  );
}

function ModelExplorer({
  runtime,
  modelDef,
  refreshModel,
}: {
  runtime: malloy.Runtime;
  modelDef: malloy.ModelDef;
  refreshModel: () => void;
}) {
  const modelPath = "./";
  const sourceName = "test";
  const history = useRef<string[]>([""]);
  const historyIndex = useRef(0);

  const updateQueryInUrl = useCallback(
    ({ query }: { query: string | undefined }) => {
      if (query && query !== history.current[historyIndex.current]) {
        history.current = history.current.slice(0, historyIndex.current + 1);
        history.current.push(query);
        historyIndex.current++;
      }
      console.info("updateQueryInUrl", history.current, historyIndex.current);
    },
    []
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
  } = useRunQuery(
    modelDef,
    modelPath,
    (query: string, model: malloy.ModelDef) =>
      executeMalloyQuery(runtime, query, model)
  );

  const source = modelDef.contents["test"] as SourceDef;

  const queryName = querySummary?.name ?? "new_query";

  const runQueryAction = useCallback(() => {
    const query = queryWriter.getQueryStringForNotebook();
    console.log({ query });
    if (query) {
      runQuery(query, queryName);
    }
  }, [queryName, queryWriter, runQuery]);

  const { topValues, refresh: refreshTopValues } = useTopValues(
    runtime,
    modelDef,
    source,
    modelPath
  );

  console.log({ topValues });

  const refresh = useCallback(
    ({ shiftKey }: EventModifiers) => {
      refreshModel();
      if (shiftKey) {
        refreshTopValues();
      }
    },
    [refreshModel, refreshTopValues]
  );

  const undoContext = useMemo(() => {
    const updateQuery = () => {
      const query = history.current[historyIndex.current];
      if (query) {
        stubCompile
          .compileQuery(modelDef, query)
          .then((query: string) => queryModifiers.setQuery(query, true))
          .catch(console.error);
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

    return {
      canRedo,
      canUndo,
      redo,
      undo,
    };
  }, [modelDef, queryModifiers]);

  return (
    <UndoContext.Provider value={undoContext}>
      <div>
        <ExploreQueryEditor
          model={modelDef}
          modelPath="test"
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

function useRuntimeSetup() {
  const [setup, setRuntime] = useState<{
    runtime: malloy.Runtime;
    modelDef: malloy.ModelDef;
    refreshModel: () => void;
  } | null>(null);

  useEffect(() => {
    async function setup() {
      console.log("Setting up runtime");
      const { runtime, model, refreshModel } = await setupRuntime();
      setRuntime({
        runtime,
        modelDef: model._modelDef,
        refreshModel,
      });
    }
    setup();
  }, []);

  return setup;
}

async function setupRuntime() {
  const conn = new DuckDBWASMConnection({ name: "test" });
  const runtime = new SingleConnectionRuntime({ connection: conn });
  async function load() {
    const modelMa = runtime.loadModel(
      `
    source: test is duckdb.sql("""
    SELECT
        'P' || CAST(ROW_NUMBER() OVER() AS VARCHAR) as product_id,
        CASE (RANDOM() * 3)::INT 
            WHEN 0 THEN 'Electronics'
            WHEN 1 THEN 'Clothing'
            ELSE 'Books'
        END as category,
        ROUND(RANDOM() * 1000, 2) as price,
        'C' || CAST((RANDOM() * 100)::INT AS VARCHAR) as customer_id,
        CURRENT_DATE - ((RANDOM() * 365)::INT || ' days')::INTERVAL as sale_date
    FROM generate_series(1, 1000)
""") extend {
    view: Everything is {
      select: *
    }
    view: by_category is {
        group_by: category
        aggregate: product_count is count(product_id)
        # bar_chart
        nest: by_products is {
          group_by: product_id
          aggregate: tot_price is sum(price)
        }
    }
}
    `
    );
    return await modelMa.getModel();
  }

  return {
    model: await load(),
    refreshModel: load,
    runtime,
  };
}

async function executeMalloyQuery(
  runtime: malloy.Runtime,
  query: string,
  model: malloy.ModelDef
): Promise<Error | malloy.Result> {
  const baseModel = await runtime._loadModelFromModelDef(model).getModel();
  const queryModel = await malloy.Malloy.compile({
    urlReader: runtime.urlReader,
    connections: runtime.connections,
    model: baseModel,
    parse: malloy.Malloy.parse({ source: query }),
  });
  const runnable = runtime
    ._loadModelFromModelDef(queryModel._modelDef)
    .loadQuery(query);
  const rowLimit = (await runnable.getPreparedResult()).resultExplore.limit;
  return runnable.run({ rowLimit });
}

function useTopValues(
  runtime: malloy.Runtime,
  model?: malloy.ModelDef,
  source?: malloy.StructDef,
  modelPath?: string
): {
  refresh: () => void;
  topValues: malloy.SearchValueMapResult[] | undefined;
} {
  const [topValues, setTopValues] = useState<
    malloy.SearchValueMapResult[] | undefined
  >();
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    async function getValues() {
      setTopValues(await fetchTopValues(runtime, model, source, modelPath));
    }
    getValues();
  }, [model, modelPath, runtime, source, refresh]);

  return {
    refresh: () => {
      setRefresh(!refresh);
    },
    topValues,
  };
}

async function fetchTopValues(
  runtime: malloy.Runtime,
  model?: malloy.ModelDef,
  source?: malloy.StructDef,
  modelPath?: string
): Promise<malloy.SearchValueMapResult[] | undefined> {
  if (source === undefined || model === undefined) {
    return undefined;
  }
  console.log({ modelPath });

  const sourceName = source.as || source.name;
  return runtime._loadModelFromModelDef(model).searchValueMap(sourceName);
}
