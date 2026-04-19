import { useState, useRef, useEffect, useCallback } from "react";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { Navigate } from "react-router-dom";
import {
  Send,
  Plus,
  Trash2,
  Download,
  Shield,
  Wifi,
  WifiOff,
  Copy,
  ChevronRight,
  Sparkles,
  MessageCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  checkOllamaStatus,
  queryLLM,
  getOllamaStatus,
  LLMStatus,
} from "@/lib/localLLM";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Suggestion Chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: "Case Summary", prompt: "Give me a full overview of this case" },
  { label: "Suspicious Messages", prompt: "Show me all suspicious messages" },
  { label: "Crypto Activity", prompt: "Find any crypto wallet or bitcoin mentions" },
  { label: "Timeline", prompt: "Give me a timeline of events in this case" },
  { label: "Communication Patterns", prompt: "Analyse who communicates with whom most" },
  { label: "Foreign Numbers", prompt: "Show international or foreign phone numbers" },
  { label: "Call Logs", prompt: "Analyse the call records in this case" },
  { label: "GPS Locations", prompt: "What location data is available in this case?" },
];

// ─── Status Indicator ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LLMStatus }) {
  if (status === "checking") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
        <div className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
        Connecting…
      </div>
    );
  }
  if (status === "connected") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <Wifi className="h-3 w-3" />
        Local AI (Ollama)
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-400">
      <WifiOff className="h-3 w-3" />
      Smart Fallback Mode
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-primary/60"
          animate={{ y: ["0%", "-50%", "0%"] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  const copyContent = () => {
    navigator.clipboard.writeText(msg.content);
    toast.success("Copied to clipboard");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`group flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600"
        }`}
      >
        {isUser ? "You" : <Shield className="h-4 w-4 text-primary" />}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`relative rounded-2xl px-4 py-3 text-sm shadow-sm ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border rounded-tl-sm"
          }`}
        >
          {msg.streaming && !msg.content ? (
            <TypingDots />
          ) : isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:mb-1 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:font-semibold [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
              {msg.streaming && (
                <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${
            isUser ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <span className="text-[11px] text-muted-foreground">
            {msg.timestamp.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {!msg.streaming && msg.content && (
            <button
              onClick={copyContent}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Copy className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIChatPage() {
  const { data } = useInvestigation();

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const stored = localStorage.getItem("forensix-conversations-v2");
      return stored
        ? JSON.parse(stored).map((c: Conversation) => ({
            ...c,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
            messages: c.messages.map((m: Message) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          }))
        : [];
    } catch {
      return [];
    }
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [llmStatus, setLlmStatus] = useState<LLMStatus>("checking");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;

  // Check Ollama on mount
  useEffect(() => {
    checkOllamaStatus().then(setLlmStatus);
  }, []);

  // Persist conversations
  useEffect(() => {
    localStorage.setItem(
      "forensix-conversations-v2",
      JSON.stringify(conversations)
    );
  }, [conversations]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  // Auto-resize textarea
  const handleTextareaInput = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  };

  if (!data) return <Navigate to="/" replace />;

  // ── Conversation Management ──────────────────────────────────────────────────

  const createConversation = (): Conversation => {
    const conv: Conversation = {
      id: Date.now().toString(),
      title: "New conversation",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    return conv;
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const updateConvMessages = (
    convId: string,
    updater: (msgs: Message[]) => Message[]
  ) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: updater(c.messages),
              updatedAt: new Date(),
              title:
                c.title === "New conversation" && c.messages.length >= 1
                  ? c.messages[0]?.content?.slice(0, 45) + "…"
                  : c.title,
            }
          : c
      )
    );
  };

  // ── Send Message ─────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text?: string) => {
      const query = (text ?? input).trim();
      if (!query || isStreaming) return;

      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      // Get or create conversation
      let convId = activeId;
      if (!convId) {
        const conv = createConversation();
        convId = conv.id;
      }

      // Add user message
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: query,
        timestamp: new Date(),
      };
      updateConvMessages(convId, (msgs) => [...msgs, userMsg]);

      // Add streaming assistant placeholder
      const assistantId = `a-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      };
      updateConvMessages(convId, (msgs) => [...msgs, assistantMsg]);

      setIsStreaming(true);

      // Build history for Ollama context
      const history = (activeConv?.messages ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Abort controller for cleanup
      abortRef.current = new AbortController();
      let accumulated = "";

      await queryLLM(
        query,
        history,
        data,
        (token) => {
          accumulated += token;
          const snapshot = accumulated;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: snapshot, streaming: true }
                        : m
                    ),
                  }
                : c
            )
          );
        },
        () => {
          // Mark done
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    updatedAt: new Date(),
                    title:
                      c.title === "New conversation"
                        ? query.slice(0, 45) + (query.length > 45 ? "…" : "")
                        : c.title,
                    messages: c.messages.map((m) =>
                      m.id === assistantId ? { ...m, streaming: false } : m
                    ),
                  }
                : c
            )
          );
          setIsStreaming(false);
        },
        abortRef.current.signal
      );
    },
    [input, activeId, activeConv, isStreaming, data]
  );

  const stopStreaming = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const exportConversation = () => {
    if (!activeConv) return;
    const text = activeConv.messages
      .map(
        (m) =>
          `[${m.timestamp.toLocaleString("en-IN")}] ${m.role === "user" ? "Officer" : "Forensix AI"}\n${m.content}`
      )
      .join("\n\n---\n\n");
    const a = document.createElement("a");
    a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
    a.download = `forensix-chat-${Date.now()}.txt`;
    a.click();
    toast.success("Conversation exported");
  };

  // ── Group conversations by date ───────────────────────────────────────────

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const grouped: { label: string; items: Conversation[] }[] = [];
  const todayItems = conversations.filter(
    (c) => c.updatedAt.toDateString() === today
  );
  const yesterdayItems = conversations.filter(
    (c) => c.updatedAt.toDateString() === yesterday
  );
  const olderItems = conversations.filter(
    (c) =>
      c.updatedAt.toDateString() !== today &&
      c.updatedAt.toDateString() !== yesterday
  );

  if (todayItems.length) grouped.push({ label: "Today", items: todayItems });
  if (yesterdayItems.length)
    grouped.push({ label: "Yesterday", items: yesterdayItems });
  if (olderItems.length)
    grouped.push({ label: "Earlier", items: olderItems });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 border-r border-border bg-card flex flex-col overflow-hidden"
          >
            {/* New Chat Button */}
            <div className="p-3 border-b border-border">
              <Button
                onClick={createConversation}
                className="w-full justify-start gap-2 h-9"
                variant="default"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                New conversation
              </Button>
            </div>

            {/* Conversation List */}
            <ScrollArea className="flex-1 px-2 py-2">
              {grouped.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8 px-4">
                  No conversations yet.
                  <br />
                  Start one by asking anything!
                </p>
              )}
              {grouped.map((group) => (
                <div key={group.label} className="mb-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
                    {group.label}
                  </p>
                  {group.items.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setActiveId(conv.id)}
                      className={`group relative flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors text-sm mb-0.5 ${
                        activeId === conv.id
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate flex-1 text-xs">
                        {conv.title}
                      </span>
                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-all shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </ScrollArea>

            {/* Status Footer */}
            <div className="p-3 border-t border-border">
              <StatusBadge status={llmStatus} />
              {llmStatus === "offline" && (
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                  Running in smart fallback mode.{" "}
                  <a
                    href="https://ollama.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-foreground"
                  >
                    Install Ollama
                  </a>{" "}
                  for full AI.
                </p>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 border-b border-border px-4 py-2.5 flex items-center justify-between bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((s) => !s)}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform ${sidebarOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center shadow-sm">
                <Shield className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-semibold leading-none">
                  Forensix AI Assistant
                </h1>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                  {data.chats.length} messages · {data.contacts.length} contacts
                  loaded
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={llmStatus} />
            {activeConv && (
              <>
                <div className="w-px h-4 bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportConversation}
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Download className="h-3 w-3" />
                  Export
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Messages / Welcome */}
        <ScrollArea className="flex-1 px-4 py-4">
          {!activeConv ? (
            // ── Welcome Screen ───────────────────────────────────────────────
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8 pt-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-4 shadow-sm">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-1">
                  Forensix AI Assistant
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Ask anything about the case. I'll analyse the evidence and
                  give you actionable insights — all processed locally on your
                  device.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSend(s.prompt)}
                    className="text-left p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group text-sm"
                  >
                    <div className="font-medium text-foreground mb-0.5 text-sm group-hover:text-primary transition-colors">
                      {s.label}
                    </div>
                    <div className="text-xs text-muted-foreground leading-tight">
                      {s.prompt}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <div className="h-px flex-1 bg-border" />
                Case data loaded: {data.rawRecords.length} records
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>
          ) : (
            // ── Message Thread ───────────────────────────────────────────────
            <div className="max-w-3xl mx-auto space-y-5 pb-2">
              <AnimatePresence initial={false}>
                {activeConv.messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* ── Input Box ───────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border p-3 bg-card/50 backdrop-blur-sm">
          {/* Quick suggestions if conversation has messages */}
          {activeConv && activeConv.messages.length === 1 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {SUGGESTIONS.slice(0, 4).map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSend(s.prompt)}
                  disabled={isStreaming}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all disabled:opacity-40"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleTextareaInput();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask anything about this case…"
                rows={1}
                disabled={isStreaming}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all disabled:opacity-50 min-h-[46px] max-h-40 leading-relaxed"
              />
              <p className="absolute right-3 bottom-3 text-[10px] text-muted-foreground/50 select-none">
                ↵ Send
              </p>
            </div>

            {isStreaming ? (
              <Button
                onClick={stopStreaming}
                size="icon"
                variant="outline"
                className="h-[46px] w-[46px] rounded-xl shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming}
                size="icon"
                className="h-[46px] w-[46px] rounded-xl shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-2">
            All analysis runs locally · No data leaves your machine
          </p>
        </div>
      </div>
    </div>
  );
}
