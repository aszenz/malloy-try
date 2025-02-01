import ModelExplorer from "./Explore";
import { useRuntimeSetup } from "./hooks";

export default App;

function App() {
  const definition = `
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
    view: Everything is {
      select: *
    }
    view: by_category is {
        group_by: category
        aggregate: product_count is count(product_id)
        # bar_chart
        nest: by_products is {
          group_by: product_id
          aggregate: tot_price is sum(price)
        }
    }
}`;
  const setup = useRuntimeSetup(definition);
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
