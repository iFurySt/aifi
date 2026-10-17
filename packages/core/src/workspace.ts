export type WorkspacePage =
  | "stocks"
  | "agents"
  | "research"
  | "watchlist"
  | "portfolio"
  | "library"
  | "settings";
export const workspacePages: WorkspacePage[] = [
  "stocks",
  "agents",
  "research",
  "watchlist",
  "portfolio",
  "library",
  "settings",
];
export type Cadence = "Daily" | "Weekly" | "On demand";
export type Theme = "light" | "dark";
export interface Agent {
  id: string;
  name: string;
  prompt: string;
  symbols: string[];
  cadence: Cadence;
  active: boolean;
  tone: "mint" | "peach" | "blue" | "violet";
}
export interface PreviewEvent {
  id: string;
  agentId: string;
  title: string;
  summary: string;
  createdAt: string;
}
export interface Message {
  role: "user" | "assistant";
  content: string;
  source?: "sample" | "chatgpt";
}
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}
export interface Workspace {
  schemaVersion: 1;
  agents: Agent[];
  events: PreviewEvent[];
  watchlist: string[];
  conversations: Conversation[];
  theme: Theme;
}
export const cadences: Cadence[] = ["Daily", "Weekly", "On demand"];
export const normalizeSymbol = (value: string) => value.trim().toUpperCase();
export function validSymbol(value: string) {
  return /^[A-Z](?:[A-Z0-9]|[.-](?=[A-Z0-9])){0,9}$/.test(value);
}
export function createAgent(
  prompt: string,
  cadence: Cadence,
  id: string,
): Agent {
  const text = prompt.trim();
  if (text.length < 8 || text.length > 500)
    throw new Error("Use 8–500 characters.");
  if (!cadences.includes(cadence)) throw new Error("Choose a valid cadence.");
  const symbols = [
    ...new Set(
      (
        text.match(/\$[A-Za-z](?:[A-Za-z0-9]|[.-](?=[A-Za-z0-9])){0,9}/g) ?? []
      ).map((s) => s.slice(1).toUpperCase()),
    ),
  ];
  const name = text.length > 52 ? `${text.slice(0, 49).trimEnd()}…` : text;
  return {
    id,
    name,
    prompt: text,
    symbols,
    cadence,
    active: true,
    tone: "mint",
  };
}
export function previewAgent(
  agent: Agent,
  id: string,
  now: string,
): PreviewEvent {
  if (!agent.active) throw new Error("Resume this agent to preview.");
  return {
    id,
    agentId: agent.id,
    title: `${agent.name} · preview`,
    createdAt: now,
    summary: `Sample brief for ${agent.symbols.length ? agent.symbols.join(", ") : "this agent"}. No sources were fetched.`,
  };
}
export function addWatchSymbol(symbols: string[], input: string) {
  const symbol = normalizeSymbol(input);
  if (!validSymbol(symbol))
    throw new Error("Enter a valid ticker (max 10 characters).");
  if (symbols.includes(symbol))
    throw new Error(`${symbol} is already in your watchlist.`);
  if (symbols.length >= 50) throw new Error("Limit: 50 symbols.");
  return [...symbols, symbol];
}
export function demoAnswer(_prompt: string) {
  return "Thesis\nWhat would confirm or challenge your view?\n\nEvidence\nReview filings, earnings and competitors.\n\nRisks\nList key assumptions and the next event to watch.";
}
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 2000): v is string =>
  typeof v === "string" && v.length <= max;
const list = (v: unknown, max: number, check: (item: unknown) => boolean) =>
  Array.isArray(v) && v.length <= max && v.every(check);
const agentCheck = (v: unknown) =>
  isRecord(v) &&
  str(v.id, 100) &&
  str(v.name, 100) &&
  str(v.prompt, 500) &&
  list(v.symbols, 50, (x) => str(x, 10) && validSymbol(x)) &&
  cadences.includes(v.cadence as Cadence) &&
  typeof v.active === "boolean" &&
  ["mint", "peach", "blue", "violet"].includes(v.tone as string);
const eventCheck = (v: unknown) =>
  isRecord(v) &&
  str(v.id, 100) &&
  str(v.agentId, 100) &&
  str(v.title, 200) &&
  str(v.summary) &&
  str(v.createdAt, 40) &&
  Number.isFinite(Date.parse(v.createdAt));
const conversationCheck = (v: unknown) =>
  isRecord(v) &&
  str(v.id, 100) &&
  str(v.title, 120) &&
  list(
    v.messages,
    100,
    (m) =>
      isRecord(m) &&
      ["user", "assistant"].includes(m.role as string) &&
      str(m.content, m.role === "assistant" ? 32000 : 5000) &&
      (m.source === undefined ||
        m.source === "sample" ||
        m.source === "chatgpt"),
  );
/** Validate persisted input before it enters the UI. Unknown schemas are never silently migrated. */
export function decodeWorkspace(raw: string): Workspace {
  const value: unknown = JSON.parse(raw);
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !list(value.agents, 100, agentCheck) ||
    !list(value.events, 100, eventCheck) ||
    !list(value.watchlist, 50, (x) => str(x, 10) && validSymbol(x)) ||
    !list(value.conversations, 30, conversationCheck) ||
    !["light", "dark"].includes(value.theme as string)
  ) {
    throw new Error(
      "Saved workspace is invalid or from an unsupported version.",
    );
  }
  const workspace = value as unknown as Workspace;
  if (
    new Set(workspace.agents.map((a) => a.id)).size !==
      workspace.agents.length ||
    new Set(workspace.conversations.map((c) => c.id)).size !==
      workspace.conversations.length ||
    new Set(workspace.watchlist).size !== workspace.watchlist.length ||
    new Set(workspace.events.map((e) => e.id)).size !== workspace.events.length
  )
    throw new Error("Saved workspace contains duplicate entries.");
  if (
    workspace.events.some(
      (event) => !workspace.agents.some((agent) => agent.id === event.agentId),
    )
  )
    throw new Error("Saved previews refer to a missing agent.");
  return workspace;
}
