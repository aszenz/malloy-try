import { BrowserRouter, Route, Routes } from "react-router";
import tradingModelSource from "./models/trading.malloy?raw";
import "./index.css";
import Home from "./Home";
import { useRuntimeSetup } from "./hooks";
import { RuntimeProvider } from "./contexts";
import ModelExplorer from "./Explore";

export default App;
function App() {
  const setup = useRuntimeSetup(tradingModelSource);
  if (null === setup) {
    return <div>Loading...</div>;
  }
  return (
    <RuntimeProvider setup={setup}>
      <BrowserRouter>
        <Routes>
          <Route index path="/" element={<Home />} />
          <Route path="/explorer" element={<ModelExplorer />} />
        </Routes>
      </BrowserRouter>
    </RuntimeProvider>
  );
}
