import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  dataMethods,
  type DataMethod,
  type DataSettings,
} from "../../core/src/data-service.ts";

import {
  validateDirectoryQuery,
  validDirectorySymbol,
} from "../../core/src/stock-directory.ts";

export function defaultDataDir() {
  return (
    process.env.AIFI_DATA_DIR ||
    join(
      process.platform === "darwin"
        ? join(homedir(), "Library/Application Support")
        : process.platform === "win32"
          ? process.env.APPDATA || homedir()
          : process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
      "aifi/data",
    )
  );
}
export function encryptCredential(dataDir: string, value: string) {
  if (
    !value.trim() ||
    Buffer.byteLength(value.trim(), "utf8") > 4096 ||
    /[\r\n\0]/.test(value)
  )
    throw Error("Enter a valid credential.");
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const path = join(dataDir, "aifi-vault.key");
  try {
    writeFileSync(path, randomBytes(32), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST")
      throw Error("Credential storage is unavailable.");
  }
  const key = readFileSync(path);
  if (key.length !== 32) throw Error("Credential storage key is invalid.");
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value.trim(), "utf8"),
    cipher.final(),
  ]);
  return (
    "v1:" +
    Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64")
  );
}
export function validateSettings(
  value: unknown,
): asserts value is DataSettings {
  if (!value || typeof value !== "object") throw Error("Invalid settings.");
  const v = value as DataSettings;
  if (
    !Number.isInteger(v.revision) ||
    v.revision < 0 ||
    typeof v.directoryEnabled !== "boolean" ||
    typeof v.automatic !== "boolean" ||
    !Number.isInteger(v.intervalHours) ||
    v.intervalHours < 1 ||
    v.intervalHours > 720 ||
    typeof v.secUserAgent !== "string" ||
    v.secUserAgent.length > 255 ||
    /[\r\n\0]/.test(v.secUserAgent) ||
    Object.keys(v).some(
      (k) =>
        ![
          "revision",
          "directoryEnabled",
          "automatic",
          "intervalHours",
          "secUserAgent",
        ].includes(k),
    )
  )
    throw Error("Invalid settings.");
}
export class DataHost {
  private child?: ChildProcessWithoutNullStreams;
  private ready?: Promise<void>;
  private nextID = 0;
  private pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private stopping = false;
  private failure?: string;
  constructor(
    readonly binary: string,
    readonly dataDir = defaultDataDir(),
    readonly offline = false,
  ) {}
  get pid() {
    return this.child?.pid;
  }
  start(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      this.child = spawn(
        this.binary,
        [
          "--data-dir",
          this.dataDir,
          "service",
          ...(this.offline ? ["--offline"] : []),
        ],
        { stdio: "pipe", windowsHide: true },
      );
      const child = this.child;
      const timeout = setTimeout(() => {
        this.failure = "Data service startup timed out.";
        child.kill();
        reject(Error(this.failure));
      }, 10000);
      child.stderr.on("data", () => {
        /* Never mirror host diagnostics/credentials to renderer logs. */
      });
      createInterface({ input: child.stdout }).on("line", (line) => {
        if (line.length > 1 << 20) {
          child.kill();
          return;
        }
        let message: {
          event?: string;
          id?: number;
          result?: unknown;
          error?: string;
        };
        try {
          message = JSON.parse(line);
        } catch {
          child.kill();
          return;
        }
        if (message.event === "ready") {
          clearTimeout(timeout);
          resolve();
          return;
        }
        if (typeof message.id !== "number") return;
        const pending = this.pending.get(message.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(message.id);
        if (message.error) pending.reject(Error(message.error));
        else pending.resolve(message.result);
      });
      const fail = () => {
        clearTimeout(timeout);
        this.failure = "Data service stopped. Restart the app to reconnect.";
        reject(Error(this.failure));
        for (const p of this.pending.values()) {
          clearTimeout(p.timer);
          p.reject(Error(this.failure));
        }
        this.pending.clear();
      };
      child.once("error", fail);
      child.once("exit", fail);
      child.stdin.on("error", fail);
    });
    return this.ready;
  }
  private async rpc(method: string, params?: unknown) {
    if (this.stopping) throw Error("Data service is stopping.");
    await this.start();
    if (this.pending.size >= 32) throw Error("Data service busy. Try again.");
    if (this.failure || !this.child)
      throw Error(this.failure || "Data service is unavailable.");
    const id = ++this.nextID;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Error("Data service request timed out."));
      }, 18000);
      this.pending.set(id, { resolve, reject, timer });
      this.child!.stdin.write(JSON.stringify({ id, method, params }) + "\n");
    });
  }
  async request(method: DataMethod, params?: unknown): Promise<unknown> {
    if (!dataMethods.includes(method)) throw Error("Unsupported data action.");
    if (method === "directory.list") validateDirectoryQuery(params);
    if (method === "directory.get") {
      const p = params as { symbol?: unknown };
      if (
        !p ||
        Object.keys(p).length !== 1 ||
        typeof p.symbol !== "string" ||
        !validDirectorySymbol(p.symbol)
      )
        throw Error("Invalid directory symbol.");
    }
    if (method === "settings.save") validateSettings(params);
    if (method === "credentials.set") {
      const input = params as {
        provider?: string;
        values?: Record<string, string>;
      };
      if (
        !input ||
        !["massive", "alpaca"].includes(input.provider || "") ||
        !input.values ||
        typeof input.values !== "object"
      )
        throw Error("Invalid credential provider.");
      const values: Record<string, string> = {};
      for (const [field, value] of Object.entries(input.values)) {
        if (
          !(
            input.provider === "massive" ? ["apiKey"] : ["keyId", "secret"]
          ).includes(field) ||
          typeof value !== "string"
        )
          throw Error("Invalid credential field.");
        if (value.trim())
          values[field] = encryptCredential(this.dataDir, value);
      }
      if (!Object.keys(values).length) throw Error("Enter a credential.");
      return this.rpc("vault.put", { provider: input.provider, values });
    }
    if (method === "credentials.remove") {
      const input = params as { provider?: string };
      if (!input || !["massive", "alpaca"].includes(input.provider || ""))
        throw Error("Invalid credential provider.");
      return this.rpc("vault.remove", { provider: input.provider });
    }
    return this.rpc(method, params);
  }
  async stop() {
    if (this.stopping) return;
    this.stopping = true;
    const child = this.child;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => child.kill("SIGKILL"), 5000);
      child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
      child.stdin.end();
    });
  }
}
