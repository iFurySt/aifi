import type { Plugin, PreviewServer, ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { DataHost } from "../../packages/host/src/runtime.ts";
import { webBridge } from "../../packages/host/src/web-bridge.ts";
export function dataPlugin(): Plugin {
  let host: DataHost | undefined;
  const connect = async (server: ViteDevServer | PreviewServer) => {
    host = new DataHost(
      resolve(
        fileURLToPath(new URL("../../", import.meta.url)),
        "apps/desktop/dist",
        process.platform === "win32" ? "aifi.exe" : "aifi",
      ),
    );
    try {
      await host.start();
    } catch {
      console.error("AIFi data service unavailable. Run pnpm build first.");
    }
    server.middlewares.use(
      webBridge(host, () => {
        const address = server.httpServer?.address();
        return address && typeof address !== "string" ? address.port : 0;
      }),
    );
  };
  return {
    name: "aifi-local-data",
    configureServer: connect,
    configurePreviewServer: connect,
    closeServer: async () => host?.stop(),
    closePreviewServer: async () => host?.stop(),
  };
}
