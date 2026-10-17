import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";
import {
  constants,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  fstatSync,
  fsyncSync,
  statSync,
  rmdirSync,
} from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export interface SavedProfile {
  id: string;
  clientId: string;
  subject?: string;
  email?: string;
  name?: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  scopes: string[];
  expiresAt: number;
  earliestRefreshAt?: number;
}
export interface ChatGPTState {
  version: 1;
  hostId: string;
  activeProfileId?: string;
  welcomeSeen: boolean;
  profiles: SavedProfile[];
}
function readPrivate(path: string, limit: number) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = fstatSync(fd);
    if (
      !info.isFile() ||
      info.size > limit ||
      (process.platform !== "win32" && info.mode & 0o077)
    )
      throw Error("Unsafe credential file.");
    return readFileSync(fd);
  } finally {
    closeSync(fd);
  }
}
function validate(value: unknown): asserts value is ChatGPTState {
  const v = value as ChatGPTState;
  if (
    !v ||
    v.version !== 1 ||
    typeof v.hostId !== "string" ||
    !/^urn:uuid:[0-9a-f-]{36}$/.test(v.hostId) ||
    typeof v.welcomeSeen !== "boolean" ||
    !Array.isArray(v.profiles) ||
    v.profiles.length > 20 ||
    v.profiles.some(
      (p) =>
        !p ||
        !/^[\w-]{1,100}$/.test(p.id) ||
        typeof p.clientId !== "string" ||
        !p.clientId ||
        p.clientId === "dynamic_agent_client" ||
        !Array.isArray(p.scopes) ||
        p.scopes.some((s) => typeof s !== "string") ||
        !Number.isFinite(p.expiresAt) ||
        [
          p.subject,
          p.email,
          p.name,
          p.accessToken,
          p.refreshToken,
          p.idToken,
        ].some(
          (s) => s !== undefined && (typeof s !== "string" || s.length > 16384),
        ),
    ) ||
    new Set(v.profiles.map((p) => p.id)).size !== v.profiles.length ||
    (v.activeProfileId !== undefined &&
      !v.profiles.some((p) => p.id === v.activeProfileId))
  )
    throw Error("Invalid credential storage.");
}

/** A private encrypted file, outside workspace storage. The file key shares the
 * existing local-vault threat model: it does not resist same-user disk access. */
export class ChatGPTStore {
  readonly directory: string;
  constructor(dataDir: string) {
    this.directory = join(dataDir, "chatgpt");
  }
  private key() {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const path = join(this.directory, "vault.key");
    try {
      writeFileSync(path, randomBytes(32), { flag: "wx", mode: 0o600 });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    const key = readPrivate(path, 32);
    if (key.length !== 32) throw Error("Invalid credential key.");
    return key;
  }
  read(): ChatGPTState {
    try {
      const bytes = readPrivate(
        join(this.directory, "profiles.enc"),
        1024 * 1024,
      );
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.key(),
        bytes.subarray(0, 12),
      );
      decipher.setAuthTag(bytes.subarray(12, 28));
      const state: unknown = JSON.parse(
        Buffer.concat([
          decipher.update(bytes.subarray(28)),
          decipher.final(),
        ]).toString(),
      );
      validate(state);
      return state;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT")
        throw Error("ChatGPT storage is not initialized.");
      throw Error(
        "ChatGPT credentials could not be read. Restore this device's ChatGPT vault from backup.",
      );
    }
  }
  private write(state: ChatGPTState) {
    validate(state);
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(state)),
      cipher.final(),
    ]);
    const bytes = Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
    if (bytes.length > 1024 * 1024)
      throw Error("ChatGPT credential storage is full.");
    const temp = join(this.directory, `profiles-${randomUUID()}.tmp`);
    try {
      const fd = openSync(temp, "wx", 0o600);
      try {
        writeFileSync(fd, bytes);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      renameSync(temp, join(this.directory, "profiles.enc"));
    } finally {
      try {
        unlinkSync(temp);
      } catch {
        /* Already renamed. */
      }
    }
  }
  async transaction<T>(
    change: (state: ChatGPTState) => T | Promise<T>,
  ): Promise<T> {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const lock = join(this.directory, "session.lock");
    const deadline = Date.now() + 15000;
    while (true) {
      try {
        writeFileSync(lock, String(process.pid), { flag: "wx", mode: 0o600 });
        break;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST")
          throw Error("ChatGPT storage is unavailable.");
        // Serialize dead-owner recovery and re-read under that guard: two
        // waiters must never unlink a new live owner's replacement lock.
        const recovery = lock + ".recovery";
        let recovering = false;
        try {
          mkdirSync(recovery, { mode: 0o700 });
          recovering = true;
          const pid = Number(readPrivate(lock, 32).toString());
          if (Number.isSafeInteger(pid) && pid > 0) {
            try {
              process.kill(pid, 0);
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code === "ESRCH")
                unlinkSync(lock);
            }
          } else if (Date.now() - statSync(lock).mtimeMs > 30000)
            unlinkSync(lock);
        } catch {
          /* Another process may be completing its write/recovery. */
        } finally {
          if (recovering) rmdirSync(recovery);
        }
        if (Date.now() > deadline)
          throw Error(
            "ChatGPT connection is busy in another window. Try again.",
          );
        await delay(50);
      }
    }
    try {
      let state: ChatGPTState;
      try {
        statSync(join(this.directory, "profiles.enc"));
        state = this.read();
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        state = {
          version: 1,
          hostId: `urn:uuid:${randomUUID()}`,
          welcomeSeen: false,
          profiles: [],
        };
      }
      // Persist even if the operation fails: an issued registration or rotated
      // refresh token must survive a later verification/network failure.
      try {
        return await change(state);
      } finally {
        this.write(state);
      }
    } finally {
      unlinkSync(lock);
    }
  }
}
