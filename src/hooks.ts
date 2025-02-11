import { useEffect, useState } from "react";
import * as malloy from "@malloydata/malloy";
import { DuckDBWASMConnection } from "@malloydata/db-duckdb/wasm";

export { useRuntimeSetup, useTopValues };
function useRuntimeSetup(modelDef: string) {
  const [setup, setRuntime] = useState<{
    runtime: malloy.Runtime;
    modelDef: malloy.ModelDef;
    refreshModel: () => void;
  } | null>(null);
  const [refreshModel, setRefreshModel] = useState(false);

  useEffect(() => {
    async function setup() {
      const { runtime, model } = await setupRuntime(modelDef);
      setRuntime({
        runtime,
        modelDef: model._modelDef,
        refreshModel: () => {
          setRefreshModel(!refreshModel);
        },
      });
    }
    void setup();
  }, [modelDef, refreshModel]);

  return setup;
}

function useTopValues(
  runtime: malloy.Runtime,
  model?: malloy.ModelDef,
  source?: malloy.StructDef,
  modelPath?: string,
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
    void getValues();
  }, [model, modelPath, runtime, source, refresh]);

  return {
    refresh: () => {
      setRefresh(!refresh);
    },
    topValues,
  };
}

async function setupRuntime(modelDef: string) {
  const conn = new MyDuckDBConnection("main", undefined, undefined, {
    // This is the default row limit of the connection (when no row limit is provided)
    rowLimit: 1000,
  });
  const runtime = new malloy.SingleConnectionRuntime({ connection: conn });
  async function load() {
    const modelMaterializer = runtime.loadModel(modelDef);
    return await modelMaterializer.getModel();
  }

  return { model: await load(), runtime };
}

async function fetchTopValues(
  runtime: malloy.Runtime,
  model?: malloy.ModelDef,
  source?: malloy.StructDef,
  modelPath?: string,
): Promise<malloy.SearchValueMapResult[] | undefined> {
  if (undefined === source || undefined === model) {
    return undefined;
  }
  console.log({ modelPath });

  const sourceName = source.as ?? source.name;
  // Returns top 1000(by count) values from every string column in the source
  return runtime._loadModelFromModelDef(model).searchValueMap(sourceName, 1000);
}

class MyDuckDBConnection extends DuckDBWASMConnection {
  /**
   * Override the runDuckDBQuery method to load the required tables from the server
   */
  protected async runDuckDBQuery(
    sql: string,
    abortSignal?: AbortSignal,
  ): Promise<{ rows: malloy.QueryDataRow[]; totalRows: number }> {
    if (null === this.connection) {
      throw new Error("Connection is null");
    }
    const connection = this.connection;
    const tablesRequiredForQueryExecution = [
      ...new Set(await connection.getTableNames(sql)),
    ];
    const alreadyLoadedTables = (await connection.query("SHOW TABLES"))
      .toArray()
      .map((row: { [columnName: string]: string }) => Object.values(row)[0]);
    await Promise.all(
      tablesRequiredForQueryExecution
        .filter((table) => !alreadyLoadedTables.includes(table))
        .map((table) =>
          fetch(this._getTableUrl(table), { signal: abortSignal })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Failed to fetch data for the table: ${table}`);
              }
              return response.text();
            })
            .then((text) =>
              this.database?.registerFileText(`${table}_file`, text),
            )
            .then(() =>
              connection.insertCSVFromPath(`${table}_file`, {
                name: table,
                header: true,
                detect: true,
              }),
            ),
        ),
    );
    return super.runDuckDBQuery(sql, abortSignal);
  }

  private _getTableUrl(tableName: string): string {
    return `/data/${tableName}.csv`;
  }
}
