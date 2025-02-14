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
          void navigate(`/explorer/${explore.name}`);
        }}
        onFieldClick={(field) => {
          console.log("field", field);
          const sourceName = field.parentExplore.name;

          const queryString =
            field.isAtomicField() && field.isCalculation()
              ? `run: \`${sourceName}\`->{aggregate: \`${field.name}\`}`
              : `run:\`${sourceName}\`->{ select: \`${field.name}\`}`;
          void navigate(
            `/explorer/${sourceName}?query=${queryString}&run=true`,
          );
        }}
        onQueryClick={(query) => {
          console.log("query", query);
          if ("parentExplore" in query) {
            const source = query.parentExplore.name;
            const queryString = `run:\`${source}\`->\`${query.name}\``;
            void navigate(
              `/explorer/${query.parentExplore.name}?query=${queryString}&name=${query.name}&run=true`,
            );
          }
        }}
      />
    </div>
  );
}
