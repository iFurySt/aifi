import { afterEach, expect, it, vi } from "vitest";
import { requestChatGPT, respondWithChatGPT } from "./chatgpt";

afterEach(() => vi.unstubAllGlobals());
it("requires the desktop capability instead of sending credentials or requests from Web", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("window", {});
  await expect(requestChatGPT("signIn")).rejects.toThrow("desktop app");
  expect(fetcher).not.toHaveBeenCalled();
});
it("filters stream events by request and always removes the listener after failure", async () => {
  const unsubscribe = vi.fn(),
    delta = vi.fn();
  vi.stubGlobal("window", {
    aifiDesktop: {
      onChatGPTDelta(
        listener: (event: { requestId: string; text: string }) => void,
      ) {
        listener({ requestId: "different", text: "wrong reply" });
        listener({ requestId: "request-1", text: "partial" });
        return unsubscribe;
      },
      requestChatGPT: async () => ({
        ok: false,
        error: "Usage limit. Manage usage.",
      }),
    },
  });
  await expect(
    respondWithChatGPT(
      {
        requestId: "request-1",
        profileId: "profile",
        model: "model",
        messages: [{ role: "user", content: "hello" }],
      },
      delta,
    ),
  ).rejects.toThrow("Manage usage");
  expect(delta).toHaveBeenCalledExactlyOnceWith("partial");
  expect(unsubscribe).toHaveBeenCalledExactlyOnceWith();
});
