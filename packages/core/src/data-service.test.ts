import { it, expect } from "vitest";
import { parseSettingsSection } from "./data-service";
it("keeps valid settings deep links and defaults unknown categories", () => {
  expect(parseSettingsSection("#/settings/sync")).toBe("sync");
  expect(parseSettingsSection("#/settings/sources?x=1")).toBe("sources");
  expect(parseSettingsSection("#/settings/missing")).toBe("general");
});
