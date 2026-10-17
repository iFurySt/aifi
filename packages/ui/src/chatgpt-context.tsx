import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ChatGPTStatus, ChatGPTModel, ChatGPTMethod } from "@aifi/core";
import {
  chatGPTAvailable,
  readChatGPTStatus,
  requestChatGPT,
  listChatGPTModels,
} from "@aifi/platform";
import { Button, Modal } from "./components/primitives";

interface Connection {
  available: boolean;
  status?: ChatGPTStatus;
  models: ChatGPTModel[];
  model: string;
  setModel: (model: string) => void;
  busy: boolean;
  signingIn: boolean;
  error: string;
  refresh: () => Promise<void>;
  action: (method: ChatGPTMethod, params?: unknown) => Promise<void>;
}
const Context = createContext<Connection | null>(null);
export function useChatGPT() {
  const value = useContext(Context);
  if (!value) throw Error("ChatGPT provider is missing.");
  return value;
}
export function ChatGPTProvider({ children }: { children: ReactNode }) {
  const available = chatGPTAvailable();
  const [status, setStatus] = useState<ChatGPTStatus>();
  const [models, setModels] = useState<ChatGPTModel[]>([]);
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!available) return;
    const request = ++sequence.current;
    try {
      const next = await readChatGPTStatus();
      if (request === sequence.current) setStatus(next);
    } catch (e) {
      if (request === sequence.current) setError((e as Error).message);
    }
  }, [available]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const active = status?.profiles.find((p) => p.id === status.activeProfileId);
  const loadModels = useCallback(async () => {
    if (!active?.sharing) {
      setModels([]);
      setModel("");
      return;
    }
    const next = await listChatGPTModels(active.id);
    setModels(next);
    setModel((old) =>
      next.some((m) => m.slug === old) ? old : (next[0]?.slug ?? ""),
    );
  }, [active?.id, active?.sharing]);
  useEffect(() => {
    let current = true;
    setModels([]);
    setModel("");
    if (active?.sharing)
      void listChatGPTModels(active.id)
        .then((next) => {
          if (current) {
            setModels(next);
            setModel(next[0]?.slug ?? "");
          }
        })
        .catch((e) => {
          if (current) setError(e.message);
        });
    return () => {
      current = false;
    };
  }, [active?.id, active?.sharing]);
  const action = useCallback(
    async (method: ChatGPTMethod, params?: unknown) => {
      if (method !== "cancelSignIn") setBusy(true);
      if (method === "signIn") setSigningIn(true);
      setError("");
      try {
        const value =
          method === "models"
            ? await loadModels()
            : await requestChatGPT<{ revoked?: boolean }>(method, params);
        if (method === "signOut" && value && !value.revoked)
          setError(
            "Signed out on this device. Remote revocation was not confirmed; disconnect AIFi in ChatGPT settings.",
          );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        if (method === "signIn") setSigningIn(false);
        if (method !== "cancelSignIn") setBusy(false);
        await refresh();
      }
    },
    [refresh, loadModels],
  );
  return (
    <Context.Provider
      value={{
        available,
        status,
        models,
        model,
        setModel,
        busy,
        signingIn,
        error,
        refresh,
        action,
      }}
    >
      {children}
      <Modal
        open={!!active?.sharing && !status?.welcomeSeen}
        onOpenChange={(open) => {
          if (!open) void action("acknowledgeWelcome");
        }}
        title="You’re using your ChatGPT plan"
        description="Eligible AI requests in AIFi use your ChatGPT plan or authorized credits. Manage usage in ChatGPT settings."
      >
        <div className="dialog-actions">
          <Button onClick={() => void action("openUsage")}>Manage usage</Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void action("acknowledgeWelcome")}
          >
            Got it
          </Button>
        </div>
      </Modal>
    </Context.Provider>
  );
}
