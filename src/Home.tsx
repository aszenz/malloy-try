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
          void navigate(`/explorer?name=${explore.name}`);
        }}
        onFieldClick={(field) => {
          console.log("field", field);
        }}
        onQueryClick={(query) => {
          console.log("query", query);
          if ("parentExplore" in query) {
            const source = query.parentExplore.name;
            const queryString = `run:\`${source}\`->\`${query.name}\``;
            void navigate(
              `/sources/${query.parentExplore.name}?query=${queryString}&name=${query.name}&run=true`,
            );
          }
        }}
      />
    </div>
  );
}
