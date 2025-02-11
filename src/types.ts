import * as malloy from "@malloydata/malloy";

export type { RuntimeSetup };

type RuntimeSetup = {
  runtime: malloy.Runtime;
  model: malloy.Model;
  refreshModel: () => void;
};
