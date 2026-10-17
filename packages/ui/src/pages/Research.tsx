import { Select } from "../components/Select";
import { useState, useLayoutEffect, useEffect, useRef } from "react";
import {
  ArrowUp,
  BookOpen,
  ChartNoAxesCombined,
  FileText,
  Plus,
  Sparkles,
  Square,
} from "lucide-react";
import type { Conversation, Message } from "@aifi/core";
import { validateChatGPTRequest } from "@aifi/core";
import { requestChatGPT, respondWithChatGPT } from "@aifi/platform";
import { useChatGPT } from "../chatgpt-context";
import { useWorkspace, uid } from "../workspace-context";
import { Button, Logo, Tag } from "../components/primitives";
const starters = [
  {
    icon: FileText,
    title: "Company overview",
    text: "Build a research outline for NVIDIA.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Thesis risks",
    text: "What could challenge my long-term thesis for Apple?",
  },
  {
    icon: BookOpen,
    title: "Earnings prep",
    text: "What should I look for in Microsoft’s next earnings call?",
  },
];
export function Research({
  draft,
  clearDraft,
}: {
  draft: string;
  clearDraft: () => void;
}) {
  const { workspace, update, conversationId, openConversation, notify } =
    useWorkspace();
  const [prompt, setPrompt] = useState(draft);
  const chatgpt = useChatGPT();
  const profile = chatgpt.status?.profiles.find(
    (p) => p.id === chatgpt.status?.activeProfileId,
  );
  const [reply, setReply] = useState<{
    conversationId: string;
    text: string;
    error?: string;
  }>();
  const [sending, setSending] = useState(false);
  const running = useRef<
    { requestId: string; conversationId: string } | undefined
  >(undefined);
  function stop() {
    const request = running.current;
    running.current = undefined;
    setSending(false);
    if (request) {
      void requestChatGPT("cancelResponse", {
        requestId: request.requestId,
      }).catch(() => {});
      setReply((old) =>
        old ? { ...old, error: "Reply stopped. You can retry." } : old,
      );
    }
  }
  useEffect(
    () => () => {
      const request = running.current;
      running.current = undefined;
      if (request)
        void requestChatGPT("cancelResponse", {
          requestId: request.requestId,
        }).catch(() => {});
    },
    [],
  );
  useEffect(() => {
    if (running.current && running.current.conversationId !== conversationId)
      stop();
  }, [conversationId]);
  const end = useRef<HTMLDivElement>(null);
  const conversation = workspace.conversations.find(
    (c) => c.id === conversationId,
  );
  useLayoutEffect(() => {
    if (draft) {
      setPrompt(draft);
      clearDraft();
    }
  }, [draft, clearDraft]);
  useLayoutEffect(() => {
    end.current?.scrollIntoView({ behavior: "instant", block: "end" });
  }, [conversation?.id, conversation?.messages.length, reply?.text]);
  async function send(retry = false) {
    if (running.current || !profile?.sharing || !chatgpt.model) return;
    const text = prompt.trim();
    if (!retry && !text) return;
    if (text.length > 2000) {
      notify("Limit: 2,000 characters.");
      return;
    }
    if ((conversation?.messages.length ?? 0) > (retry ? 99 : 98)) {
      notify("Start a new conversation to continue.");
      return;
    }
    const messages: Message[] = [{ role: "user", content: text }];
    const next = conversation
      ? {
          ...conversation,
          messages: retry
            ? conversation.messages
            : [...conversation.messages, ...messages],
        }
      : { id: uid(), title: text.slice(0, 80), messages };
    const request = {
      requestId: uid(),
      profileId: profile.id,
      model: chatgpt.model,
      messages: next.messages,
    };
    try {
      validateChatGPTRequest(request);
    } catch (e) {
      notify((e as Error).message);
      return;
    }
    running.current = { requestId: request.requestId, conversationId: next.id };
    setSending(true);
    setReply({ conversationId: next.id, text: "" });
    update((w) => ({
      ...w,
      conversations: [
        next,
        ...w.conversations.filter((c) => c.id !== next.id),
      ].slice(0, 30),
    }));
    openConversation(next);
    setPrompt("");
    try {
      const result = await respondWithChatGPT(request, (delta) => {
        if (running.current?.requestId === request.requestId)
          setReply((old) => ({
            conversationId: next.id,
            text: (old?.text ?? "") + delta,
          }));
      });
      if (running.current?.requestId !== request.requestId) return;
      // A late response must not resurrect a chat removed by a workspace reset.
      update((w) => ({
        ...w,
        conversations: w.conversations.map((c) =>
          c.id === next.id
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    role: "assistant",
                    content: result.text,
                    source: "chatgpt",
                  },
                ],
              }
            : c,
        ),
      }));
      setReply(undefined);
    } catch (e) {
      if (running.current?.requestId === request.requestId)
        setReply((old) => ({
          conversationId: next.id,
          text: old?.text ?? "",
          error: (e as Error).message,
        }));
    } finally {
      if (running.current?.requestId === request.requestId) {
        running.current = undefined;
        setSending(false);
        void chatgpt.refresh();
      }
    }
  }
  const visibleReply =
    reply?.conversationId === conversationId ? reply : undefined;
  return (
    <div className={`research-page ${conversation ? "has-conversation" : ""}`}>
      {workspace.conversations.length > 0 && (
        <label className="chat-history-picker">
          <span>Chats</span>
          <select
            aria-label="Chat history"
            value={conversationId ?? ""}
            onChange={(e) =>
              openConversation(
                workspace.conversations.find((c) => c.id === e.target.value) ??
                  null,
              )
            }
          >
            <option value="">New chat</option>
            {workspace.conversations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {conversation ? (
        <>
          <div className="conversation-header">
            <h1>{conversation.title}</h1>
            <Button variant="ghost" onClick={() => openConversation(null)}>
              <Plus size={16} />
              New research
            </Button>
          </div>
          <div className="conversation" aria-label="Research conversation">
            {conversation.messages.map((message, i) => (
              <ChatMessage key={i} message={message} />
            ))}
            {visibleReply && (
              <article
                className="message message-assistant"
                aria-busy={sending}
              >
                <div className="assistant-label">
                  <Logo small />
                  <Tag>{sending ? "Responding…" : "Incomplete reply"}</Tag>
                </div>
                <div className="message-content">
                  {visibleReply.text.split("\n\n").map((text, i) => (
                    <p key={i}>{text}</p>
                  ))}
                </div>
                {visibleReply.error && (
                  <div className="chat-error" role="alert">
                    {visibleReply.error}
                    <div className="chat-actions">
                      <Button onClick={() => void chatgpt.action("openUsage")}>
                        Manage usage
                      </Button>
                      <Button
                        disabled={
                          sending || !profile?.sharing || !chatgpt.model
                        }
                        onClick={() => void send(true)}
                      >
                        Retry reply
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            )}
            {!visibleReply &&
              !sending &&
              conversation.messages.at(-1)?.role === "user" && (
                <Button
                  disabled={!profile?.sharing || !chatgpt.model}
                  onClick={() => void send(true)}
                >
                  Retry reply
                </Button>
              )}
            <div ref={end} />
          </div>
        </>
      ) : (
        <div className="research-welcome">
          <span className="welcome-mark">
            <Sparkles size={27} strokeWidth={1.5} />
          </span>
          <h1>What are you researching?</h1>
        </div>
      )}
      <div className="research-composer-area">
        <div className="chat-connection">
          {profile?.sharing ? (
            <>
              <span>Using ChatGPT plan · {profile.email || profile.label}</span>
              <Select
                label="Chat model"
                value={chatgpt.model}
                disabled={sending || !chatgpt.models.length}
                onValueChange={chatgpt.setModel}
                searchable
                variant="subtle"
                placeholder="No models available"
                options={chatgpt.models.map((m) => ({
                  value: m.slug,
                  label: m.displayName,
                }))}
              />
              <Button
                variant="ghost"
                onClick={() => void chatgpt.action("openUsage")}
              >
                Manage usage
              </Button>
            </>
          ) : (
            <>
              <span>
                {chatgpt.available
                  ? "Connect ChatGPT to start chatting."
                  : "Open the desktop app to connect ChatGPT."}
              </span>
              {chatgpt.available && (
                <a className="setting-link" href="#/settings/chatgpt">
                  Connect ChatGPT
                </a>
              )}
            </>
          )}
        </div>
        {chatgpt.error && (
          <div className="chat-error" role="alert">
            {chatgpt.error}{" "}
            <a className="setting-link" href="#/settings/chatgpt">
              Connection settings
            </a>
          </div>
        )}
        <form
          className="composer research-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            aria-label="Research question"
            placeholder="Ask about a company or idea…"
            maxLength={2000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div className="composer-footer">
            <span className="composer-mode">
              <Sparkles size={15} />
              Research
            </span>
            {sending ? (
              <button
                className="send-button"
                type="button"
                aria-label="Stop response"
                onClick={stop}
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                className="send-button"
                aria-label="Send research question"
                disabled={!prompt.trim() || !profile?.sharing || !chatgpt.model}
                type="submit"
              >
                <ArrowUp size={19} />
              </button>
            )}
          </div>
        </form>
      </div>
      {!conversation && (
        <div className="research-starters">
          {starters.map(({ icon: Icon, title, text }) => (
            <button
              key={title}
              onClick={() => {
                setPrompt(text);
                document
                  .querySelector<HTMLTextAreaElement>(
                    ".research-composer textarea",
                  )
                  ?.focus();
              }}
            >
              <Icon size={19} strokeWidth={1.5} />
              <strong>{title}</strong>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatMessage({
  message,
}: {
  message: Conversation["messages"][number];
}) {
  return (
    <article className={`message message-${message.role}`}>
      {message.role === "assistant" && (
        <div className="assistant-label">
          <Logo small />
          <Tag>
            {message.source === "chatgpt"
              ? "ChatGPT · Draft"
              : "Sample response"}
          </Tag>
        </div>
      )}
      <div className="message-content">
        {message.content.split("\n\n").map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </div>
    </article>
  );
}
