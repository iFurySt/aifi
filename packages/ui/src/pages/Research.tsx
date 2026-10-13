import { useState, useEffect, useRef } from "react";
import {
  ArrowUp,
  BookOpen,
  ChartNoAxesCombined,
  FileText,
  Plus,
  Sparkles,
} from "lucide-react";
import { demoAnswer } from "@aifi/core";
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
  const [prompt, setPrompt] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const conversation = workspace.conversations.find(
    (c) => c.id === conversationId,
  );
  useEffect(() => {
    if (draft) {
      setPrompt(draft);
      clearDraft();
    }
  }, [draft, clearDraft]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "instant", block: "end" });
  }, [conversation?.messages.length]);
  function send() {
    const text = prompt.trim();
    if (!text) return;
    if (text.length > 2000) {
      notify("Limit: 2,000 characters.");
      return;
    }
    if ((conversation?.messages.length ?? 0) > 98) {
      notify("Start a new conversation to continue.");
      return;
    }
    const messages = [
      { role: "user" as const, content: text },
      { role: "assistant" as const, content: demoAnswer(text) },
    ];
    const next = conversation
      ? { ...conversation, messages: [...conversation.messages, ...messages] }
      : { id: uid(), title: text.slice(0, 80), messages };
    update((w) => ({
      ...w,
      conversations: [
        next,
        ...w.conversations.filter((c) => c.id !== next.id),
      ].slice(0, 30),
    }));
    openConversation(next);
    setPrompt("");
  }
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
              <article key={i} className={`message message-${message.role}`}>
                {message.role === "assistant" && (
                  <div className="assistant-label">
                    <Logo small />
                    <Tag>Sample response</Tag>
                  </div>
                )}
                <div className="message-content">
                  {message.content.split("\n\n").map((paragraph, j) => (
                    <p key={j}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
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
        <form
          className="composer research-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send();
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
                send();
              }
            }}
          />
          <div className="composer-footer">
            <span className="composer-mode">
              <Sparkles size={15} />
              Research
            </span>
            <button
              className="send-button"
              aria-label="Send research question"
              disabled={!prompt.trim()}
              type="submit"
            >
              <ArrowUp size={19} />
            </button>
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
