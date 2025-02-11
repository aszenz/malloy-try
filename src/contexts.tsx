import React, { createContext, useContext } from "react";
import { RuntimeSetup } from "./types";

export { useRuntime, RuntimeProvider };

function useRuntime() {
  const context = useContext(RuntimeContext);
  if (context === undefined) {
    throw new Error("useRuntime must be used within a RuntimeProvider");
  }
  return context;
}

const RuntimeContext = createContext<RuntimeSetup | undefined>(undefined);

type RuntimeProviderProps = {
  children: React.ReactNode;
  setup: RuntimeSetup;
};

function RuntimeProvider({ children, setup }: RuntimeProviderProps) {
  return (
    <RuntimeContext.Provider value={setup}>{children}</RuntimeContext.Provider>
  );
}
