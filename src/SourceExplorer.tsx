import { useParams } from "react-router";
import { useRuntime } from "./contexts";
import ModelExplorer from "./Explore";

export default SourceExplorer;

function SourceExplorer() {
  const setup = useRuntime();
  const params = useParams();
  const sourceName = params.sourceName;
  const modelPath = "./"; // todo: think about the need for this
  if (undefined === sourceName) {
    throw new Error("Source name not found");
  }
  return (
    <div>
      <h1>{sourceName} explorer</h1>
      <ModelExplorer
        runtime={setup.runtime}
        modelDef={setup.model._modelDef}
        modelPath={modelPath}
        sourceName={sourceName}
        refreshModel={setup.refreshModel}
      />
    </div>
  );
}
