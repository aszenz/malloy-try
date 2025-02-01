import ModelExplorer from "./Explore";
import { useRuntimeSetup } from "./hooks";
import testModelDef from "./models/test.malloy?raw";

export default App;

function App() {
  const setup = useRuntimeSetup(testModelDef);
  if (null === setup) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <h1>My App</h1>
      <ModelExplorer
        runtime={setup.runtime}
        modelDef={setup.modelDef}
        modelPath="./"
        sourceName="test"
        refreshModel={setup.refreshModel}
      />
    </div>
  );
}
