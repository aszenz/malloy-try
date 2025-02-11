import { useNavigate } from "react-router";
import { useRuntime } from "./contexts";
import { SchemaRenderer } from "./Schema";

export default Home;

function Home() {
  const setup = useRuntime();
  const navigate = useNavigate();
  return (
    <div>
      <h1>Malloy model explorer</h1>
      <SchemaRenderer
        explores={setup.model.explores}
        queries={[]}
        defaultShow={true}
        onPreviewClick={(explore) => {
          void navigate(`/sources/${explore.name}`);
        }}
        onFieldClick={(field) => {
          console.log("field", field);
        }}
        onQueryClick={(query) => {
          console.log("query", query);
        }}
      />
    </div>
  );
}
