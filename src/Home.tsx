import { useNavigate } from "react-router";
import { useRuntime } from "./contexts";
import { SchemaRenderer } from "./Schema";
import { quoteIfNecessary } from "./schema";

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
          const { name: sourceName, fieldPath } = explore;
          const select = fieldPath.slice(1).concat(["*"]).join(".");
          const queryString = `run: ${quoteIfNecessary(sourceName)}->{ select: ${select} }`;
          void navigate(
            `/explorer/${sourceName}?query=${queryString}&run=true`,
          );
        }}
        onFieldClick={(field) => {
          const sourceName = field.parentExplore.name;
          const queryString = `run: ${quoteIfNecessary(sourceName)}->${quoteIfNecessary(field.name)}`;
          void navigate(
            `/explorer/${sourceName}?query=${queryString}&run=true`,
          );
        }}
        onQueryClick={(query) => {
          console.log("query", query);
          if ("parentExplore" in query) {
            const source = query.parentExplore.name;
            const queryString = `run: ${quoteIfNecessary(source)}->${quoteIfNecessary(query.name)}`;
            void navigate(
              `/explorer/${query.parentExplore.name}?query=${queryString}&name=${query.name}&run=true`,
            );
          }
        }}
      />
    </div>
  );
}
