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

  useEffect(() => {
    async function setup() {
      console.log("Setting up runtime");
      const { runtime, model, refreshModel } = await setupRuntime(modelDef);
      setRuntime({
        runtime,
        modelDef: model._modelDef,
        refreshModel,
      });
    }
    setup();
  }, [modelDef]);

  return setup;
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

async function setupRuntime(modelDef: string) {
  const conn = new DuckDBWASMConnection("test");
  const runtime = new malloy.SingleConnectionRuntime({ connection: conn });
  async function load() {
    const modelMaterializer = runtime.loadModel(modelDef);
    return await modelMaterializer.getModel();
  }

  return {
    model: await load(),
    refreshModel: load,
    runtime,
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

  const sourceName = source.as ?? source.name;
  return runtime._loadModelFromModelDef(model).searchValueMap(sourceName);
}
