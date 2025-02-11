import ModelExplorer from "./Explore";
import { useRuntimeSetup } from "./hooks";
import ordersModelDef from "./models/orders.malloy?raw";

export default App;

function App() {
  const setup = useRuntimeSetup(ordersModelDef);
  const sourceName = "orders";
  const modelPath = "./orders";
  if (null === setup) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <h1>Malloy model explorer</h1>
      <ModelExplorer
        runtime={setup.runtime}
        modelDef={setup.modelDef}
        modelPath={modelPath}
        sourceName={sourceName}
        refreshModel={setup.refreshModel}
      />
    </div>
  );
}
