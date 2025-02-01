// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from "react";
import * as malloy from "@malloydata/malloy";
import {
  useQueryBuilder,
  UndoContext,
  useRunQuery,
  ExploreQueryEditor,
} from "@malloydata/query-composer";

import { SourceDef } from "@malloydata/malloy";
import { SingleConnectionRuntime } from "@malloydata/malloy";

import { DuckDBWASMConnection } from "@malloydata/db-duckdb/wasm";
import "@malloydata/render/webcomponent";

/**
 * https://github.com/malloydata/malloy-composer/blob/main/src/app/Explore/Explore.tsx
 */
export function App() {
  const [setup, setRuntime] = useState<{
    runtime: malloy.Runtime;
    modelDef: malloy.ModelDef;
  } | null>(null);
  useEffect(() => {
    async function set() {
      console.log("Setting up runtime");
      const { runtime, model } = await setupRuntime();
      setRuntime({ runtime, modelDef: model._modelDef });
    }
    set();
  }, []);

  if (!setup) {
    return <div>Loading...</div>;
  }
  return <Test modelDef={setup.modelDef} runtime={setup.runtime} />;
}

function Test({
  modelDef,
  runtime,
}: {
  modelDef: malloy.ModelDef;
  runtime: malloy.Runtime;
}) {
  const modelPath = "./";
  const sourceName = "test";
  const {
    error: builderError,
    queryWriter,
    queryModifiers,
    querySummary,
  } = useQueryBuilder(modelDef, sourceName, modelPath, () => {});
  const {
    error: runnerError,
    result,
    runQuery,
    // reset,
    isRunning,
  } = useRunQuery(
    modelDef,
    modelPath,
    (query: string, model: malloy.ModelDef) =>
      runQueryExt(runtime, query, model)
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

  // const {topValues, refresh: refreshTopValues} = useTopValues(
  //   modelDef,
  //   modelPath,
  //   sourceDef
  // );

  // const refresh = useCallback(
  //   ({shiftKey}: EventModifiers) => {
  //     refreshModel();
  //     if (shiftKey) {
  //       refreshTopValues();
  //     }
  //   },
  //   [refreshModel, refreshTopValues]
  // );

  const undoContext = useMemo(() => {
    // const updateQuery = () => {
    //   const query = history.current[historyIndex.current];
    //   if (query) {
    //     stubCompile
    //       .compileQuery(modelDef, query)
    //       .then(query => queryModifiers.setQuery(query, true))
    //       .catch(console.error);
    //   } else {
    //     queryModifiers.clearQuery(true);
    //   }
    // };

    const canRedo = () => false; // historyIndex.current < history.current.length - 1;
    const canUndo = () => false; //historyIndex.current > 0;

    const undo = () => {
      if (canUndo()) {
        // historyIndex.current--;
        // updateQuery();
      }
      // console.info('undo', history.current, historyIndex.current);
    };

    const redo = () => {
      if (canRedo()) {
        // historyIndex.current++;
        // updateQuery();
      }
      // console.info('redo', history.current, historyIndex.current);
    };

    return {
      canRedo,
      canUndo,
      redo,
      undo,
    };
  }, []);

  return (
    <UndoContext.Provider value={undoContext}>
      <div>
        <ExploreQueryEditor
          model={modelDef}
          modelPath="test"
          source={source}
          queryModifiers={queryModifiers}
          topValues={[]}
          queryWriter={queryWriter}
          querySummary={querySummary}
          result={result ?? runnerError ?? builderError}
          runQuery={runQueryAction}
          // refreshModel={() => setModeDef(structuredClone(modelDef))}
          isRunning={isRunning}
        />
      </div>
    </UndoContext.Provider>
  );
}

async function setupRuntime() {
  const conn = new DuckDBWASMConnection({ name: "test" });
  const runtime = new SingleConnectionRuntime({ connection: conn });
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
  const model = await modelMa.getModel();

  return {
    model,
    runtime,
  };
}

async function runQueryExt(
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

export async function search(
  model: malloy.ModelDef,
  runtime: malloy.Runtime,
  source: malloy.StructDef,
  searchTerm: string,
  fieldPath?: string
): Promise<malloy.SearchIndexResult[] | undefined | Error> {
  const sourceName = source.as || source.name;
  return runtime
    ._loadModelFromModelDef(model)
    .search(sourceName, searchTerm, undefined, fieldPath);
}

export async function topValues(
  runtime: malloy.Runtime,
  model: malloy.ModelDef,
  source: malloy.StructDef
): Promise<malloy.SearchValueMapResult[] | undefined> {
  const sourceName = source.as || source.name;
  return runtime._loadModelFromModelDef(model).searchValueMap(sourceName);
}
