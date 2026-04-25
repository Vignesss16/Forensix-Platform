import { useState, useRef, useEffect, useCallback } from "react";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { useNavigate } from "react-router-dom";
import gsap from "@/lib/gsap-utils";
import { useGSAP } from "@gsap/react";
import {
  Send, Plus, Trash2, Download, Shield, WifiOff, Copy, ChevronRight, Sparkles, MessageCircle, X, FolderOpen, CheckCircle2, ChevronDown, PanelLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { checkAIStatus, queryLLM, LLMStatus } from "@/lib/localLLM";
import { getChats, saveChat, getCases } from "@/lib/api";

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

const SUGGESTIONS = [
  { label: "Case Summary", prompt: "Give me a full overview of this case", icon: "📋" },
  { label: "Suspicious Messages", prompt: "Show me all suspicious messages", icon: "🚨" },
  { label: "Crypto Activity", prompt: "Find any crypto wallet or bitcoin mentions", icon: "💰" },
  { label: "Timeline", prompt: "Give me a timeline of events in this case", icon: "📅" },
  { label: "Contact Network", prompt: "Who are the main contacts and suspects?", icon: "👤" },
  { label: "Foreign Numbers", prompt: "Show all international phone numbers", icon: "🌍" },
];

function StatusBadge({ status }: { status: LLMStatus }) {
  if (status === "checking") return <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-muted-foreground animate-pulse"><div className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> Connecting...</div>;
  if (status === "connected") return <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-emerald-500"><Sparkles className="h-3 w-3" /> Chanakya Online</div>;
  return <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-amber-500"><WifiOff className="h-3 w-3" /> Offline Mode</div>;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div key={i} className="h-1.5 w-1.5 rounded-full bg-primary/60" animate={{ y: ["0%", "-50%", "0%"] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const navigate = useNavigate();
  
  let content = msg.content || "";
  let actionCommand = null;

  if (content.includes("[ACTION:CREATE_CASE]")) {
    actionCommand = "CREATE_CASE";
    content = content.replace("[ACTION:CREATE_CASE]", "").trim();
  } else if (content.includes("[ACTION:GO_DASHBOARD]")) {
    actionCommand = "GO_DASHBOARD";
    content = content.replace("[ACTION:GO_DASHBOARD]", "").trim();
  } else if (content.includes("[ACTION:GO_CASES]")) {
    actionCommand = "GO_CASES";
    content = content.replace("[ACTION:GO_CASES]", "").trim();
  } else if (content.includes("[ACTION:GO_UPLOAD]")) {
    actionCommand = "GO_UPLOAD";
    content = content.replace("[ACTION:GO_UPLOAD]", "").trim();
  }

  return (
    <div className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"} mb-6 message-bubble`}>
      <div className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center border text-sm font-bold ${
        isUser ? "bg-primary border-primary/20 text-primary-foreground" : "bg-gradient-to-br from-amber-900/30 to-primary/10 border-primary/30 text-primary shadow-sm"
      }`}>
        {isUser ? "O" : <span className="font-mono text-xs tracking-wider">च</span>}
      </div>
      <div className={`flex flex-col max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-primary/60 mb-1.5 ml-1">CHANAKYA</span>}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-primary/10 text-foreground rounded-tr-sm border border-primary/20"
            : "bg-card border border-border rounded-tl-sm shadow-sm"
        }`}>
          {msg.streaming && !msg.content ? <TypingDots /> : <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{content}</ReactMarkdown></div>}
        </div>

        {/* Render Interactive Action Card if present */}
        {actionCommand && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 w-64 border border-primary/30 rounded-xl overflow-hidden bg-primary/5 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] relative group"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-primary group-hover:bg-primary/80 transition-colors" />
            <div className="p-3 pl-4">
              <span className="text-[9px] font-mono uppercase tracking-widest text-primary/80 block mb-1">System Action required</span>
              <p className="font-mono text-xs uppercase font-bold text-foreground mb-3">
                {actionCommand === "CREATE_CASE" && "Initialize Dossier"}
                {actionCommand === "GO_DASHBOARD" && "Access Dashboard"}
                {actionCommand === "GO_CASES" && "Dossier Management"}
                {actionCommand === "GO_UPLOAD" && "Ingest Evidence"}
              </p>
              <Button 
                size="sm" 
                className="w-full h-8 text-[10px] uppercase font-mono tracking-wider cyber-border bg-primary/20 hover:bg-primary/40 text-primary-foreground font-bold"
                onClick={() => {
                  if (actionCommand === "CREATE_CASE") navigate("/cases", { state: { openCreateModal: true } });
                  else if (actionCommand === "GO_CASES") navigate("/cases");
                  else if (actionCommand === "GO_DASHBOARD") navigate("/dashboard");
                  else if (actionCommand === "GO_UPLOAD") navigate("/upload");
                }}
              >
                Execute Command <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}
        
        <span className="text-[10px] text-muted-foreground mt-2 font-mono opacity-50">{msg.timestamp.toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIChatPage() {
  const { data, activeCaseId, setActiveCaseId, activeCase } = useInvestigation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const onboardingRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // ── Case switcher state ──
  const [allCases, setAllCases] = useState<any[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [showCaseSwitcher, setShowCaseSwitcher] = useState(false);

  // ── Cache keys (stable per case) ──
  const CACHE_KEY = activeCaseId ? `chanakya-conversations-${activeCaseId}` : null;
  const STATUS_KEY = `chanakya-llm-status`;



  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (!activeCaseId || !CACHE_KEY) return [];
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // Re-hydrate Date objects
      return parsed.map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        messages: c.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
      }));
    } catch { return []; }
  });

  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (!activeCaseId || !CACHE_KEY) return null;
    try { return localStorage.getItem(`chanakya-activeconv-${activeCaseId}`) || null; } catch { return null; }
  });
  const [input, setInput] = useState("");
  const [llmStatus, setLlmStatus] = useState<LLMStatus>(() => {
    try {
      const cached = localStorage.getItem(STATUS_KEY);
      if (!cached) return "checking";
      const { status, ts } = JSON.parse(cached);
      // Use cached status if < 2 minutes old
      return (Date.now() - ts < 120_000) ? status : "checking";
    } catch { return "checking"; }
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);

  // ── Persist conversations to localStorage on every change ──
  useEffect(() => {
    if (CACHE_KEY && conversations.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(conversations));
    }
  }, [conversations, CACHE_KEY]);

  // ── Persist activeId ──
  useEffect(() => {
    if (activeCaseId && CACHE_KEY) {
      if (activeId) localStorage.setItem(`chanakya-activeconv-${activeCaseId}`, activeId);
      else localStorage.removeItem(`chanakya-activeconv-${activeCaseId}`);
    }
  }, [activeId, activeCaseId, CACHE_KEY]);

  // ── Persist LLM status ──
  useEffect(() => {
    if (llmStatus !== "checking") {
      localStorage.setItem(STATUS_KEY, JSON.stringify({ status: llmStatus, ts: Date.now() }));
    }
  }, [llmStatus]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Streaming throttle: buffer tokens and flush to React state at ~80ms intervals
  const streamBufferRef = useRef("");
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;

  // Page entrance — simple safe fade-in, never conditional, never sets opacity:0
  useGSAP(() => {
    // Fade the whole page in reliably
    gsap.fromTo(containerRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: "power2.out" }
    );

    // Hacker title reveal (non-blocking)
    gsap.to(".chat-title", {
      delay: 0.3,
      duration: 1.2,
      text: "CHANAKYA AI ASSISTANT",
      ease: "none"
    });
  }, { scope: containerRef }); // mount-only

  // Sidebar stagger (safe - only animates if elements exist)
  useGSAP(() => {
    if (sidebarOpen) {
      const items = document.querySelectorAll(".conv-item");
      if (items.length > 0) {
        gsap.from(".conv-item", {
          x: -20,
          opacity: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: "power2.out"
        });
      }
    }
  }, { scope: containerRef, dependencies: [sidebarOpen] });

  // Animate new messages as they arrive
  useGSAP(() => {
    const lastMsgCount = activeConv?.messages.length || 0;
    if (lastMsgCount > 0) {
      const lastBubble = document.querySelector(".message-bubble:last-child");
      if (lastBubble) {
        gsap.fromTo(lastBubble, 
          { y: 15, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
        );
      }
    }
  }, { scope: chatWindowRef, dependencies: [activeConv?.messages.length] });


  // Clean up the streaming flush interval on unmount
  useEffect(() => {
    return () => {
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Load all cases for the switcher (cached in localStorage for speed)
    const loadCases = async () => {
      setLoadingCases(true);
      try {
        const cached = localStorage.getItem('chanakya-all-cases');
        if (cached) {
          const { data: c, ts } = JSON.parse(cached);
          if (Date.now() - ts < 120_000) { 
            setAllCases(c); 
            // We still set loading to false here as we have good data
            setLoadingCases(false);
            return; 
          }
        }
        const cases = await getCases();
        setAllCases(cases);
        localStorage.setItem('chanakya-all-cases', JSON.stringify({ data: cases, ts: Date.now() }));
      } catch { /* silent fail */ }
      finally { setLoadingCases(false); }
    };
    loadCases();
  }, []);

  useEffect(() => {
    const init = async () => {
      const needsStatusCheck = llmStatus === "checking";
      const needsHistoryFetch = activeCaseId && CACHE_KEY && (() => {
        // Only fetch from Supabase if cache is empty or older than 60 seconds
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (!raw) return true;
          const parsed = JSON.parse(raw);
          if (!parsed.length) return true;
          const lastMsg = parsed[0]?.updatedAt;
          return !lastMsg || (Date.now() - new Date(lastMsg).getTime() > 60_000);
        } catch { return true; }
      })();

      const tasks: Promise<any>[] = [];
      if (needsStatusCheck) tasks.push(checkAIStatus().then(setLlmStatus));
      if (needsHistoryFetch) tasks.push(loadHistory(activeCaseId!));
      if (tasks.length) await Promise.all(tasks);
    };
    init();
  }, [activeCaseId]);


  const loadHistory = async (caseId: string) => {
    setLoadingHistory(true);
    try {
      const dbChats = await getChats(caseId);
      if (dbChats && dbChats.length > 0) {
        const messages: Message[] = dbChats.map((c: any) => ({
          id: c.id || `msg-${Math.random()}`,
          role: c.role,
          content: c.content,
          timestamp: new Date(c.created_at || c.timestamp)
        }));
        const historyConv: Conversation = {
          id: 'primary',
          title: 'Investigation History',
          messages,
          createdAt: messages[0].timestamp,
          updatedAt: messages[messages.length - 1].timestamp
        };
        // MERGE: keep any "New investigation" conversations the user started,
        // just update/add the history entry — don't wipe everything
        setConversations(prev => {
          const without = prev.filter(c => c.id !== 'primary');
          return [historyConv, ...without];
        });
        setActiveId(prev => prev ?? 'primary');
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  const createConversation = (): Conversation => {
    const conv: Conversation = { id: Date.now().toString(), title: "New investigation query", messages: [], createdAt: new Date(), updatedAt: new Date() };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    return conv;
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const updateConvMessages = (convId: string, updater: (msgs: Message[]) => Message[]) => {
    setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, messages: updater(c.messages), updatedAt: new Date() } : c));
  };

  const handleSend = useCallback(async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || isStreaming) return;
    if (!activeCaseId) { toast.error("Please select a case to start investigating"); navigate("/cases"); return; }
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    let convId = activeId;
    if (!convId) { const conv = createConversation(); convId = conv.id; }
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: query, timestamp: new Date() };
    updateConvMessages(convId, (msgs) => [...msgs, userMsg]);
    if (activeCaseId) saveChat(activeCaseId, 'user', query);
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", timestamp: new Date(), streaming: true };
    updateConvMessages(convId, (msgs) => [...msgs, assistantMsg]);
    setIsStreaming(true);
    const history = (activeConv?.messages ?? []).map((m) => ({ role: m.role, content: m.content }));
    abortRef.current = new AbortController();
    // Reset the streaming buffer
    streamBufferRef.current = "";
    
    // Flush buffered tokens to React state at 80ms intervals — avoids re-rendering on every token
    flushIntervalRef.current = setInterval(() => {
      const buffered = streamBufferRef.current;
      if (!buffered) return;
      setConversations(prev =>
        prev.map(c => {
          if (c.id !== convId) return c;
          return {
            ...c,
            messages: c.messages.map(m =>
              m.id === assistantId ? { ...m, content: buffered } : m
            )
          };
        })
      );
    }, 80);

    try {
      await queryLLM(query, history, data, (token) => {
        // Accumulate tokens in ref — no setState here
        streamBufferRef.current += token;
      }, () => {
        // Stop the flush interval
        if (flushIntervalRef.current) {
          clearInterval(flushIntervalRef.current);
          flushIntervalRef.current = null;
        }
        // Final flush with streaming: false
        const finalContent = streamBufferRef.current;
        setConversations(prev =>
          prev.map(c => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: c.messages.map(m =>
                m.id === assistantId ? { ...m, content: finalContent, streaming: false } : m
              )
            };
          })
        );
        setIsStreaming(false);
        if (activeCaseId && finalContent) saveChat(activeCaseId, 'assistant', finalContent);
      }, abortRef.current.signal);
    } catch (err: any) {
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
      console.error("AI Query failed:", err);
      
      // Replace the loading message with a clean error message
      setConversations(prev =>
        prev.map(c => {
          if (c.id !== convId) return c;
          return {
            ...c,
            messages: c.messages.map(m =>
              m.id === assistantId ? { 
                ...m, 
                content: `> **SYSTEM WARNING**\n> An error occurred during data analysis. If you have not uploaded forensic evidence yet, please use the **Upload** module to attach a UFDR file to this case.\n\n*Error details: ${err.message}*`, 
                streaming: false 
              } : m
            )
          };
        })
      );
      
      setIsStreaming(false);
      toast.error("The AI assistant encountered an error.");
    }
  }, [input, activeId, activeConv, isStreaming, data, activeCaseId]);


  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background relative" ref={containerRef}>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
            className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40" 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sidebarOpen && (
        <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 288, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="absolute md:relative z-50 h-full shrink-0 border-r border-border bg-background md:bg-card/20 backdrop-blur-xl flex flex-col overflow-hidden shadow-2xl md:shadow-none">
            {/* CHANAKYA header */}
            <div className="p-4 border-b border-border space-y-3">
              {/* Case switcher */}
              <button
                onClick={() => setShowCaseSwitcher(s => !s)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-[10px] font-mono uppercase tracking-widest truncate text-muted-foreground">
                    {activeCase ? activeCase.title : activeCaseId ? 'Case Active' : 'No Case'}
                  </span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${showCaseSwitcher ? 'rotate-180' : ''}`} />
              </button>

              {/* Case list dropdown */}
              <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="fixed md:relative z-[60] md:z-auto h-full w-[280px] bg-sidebar border-r border-border flex flex-col shadow-2xl md:shadow-none"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-[10px] font-black font-mono tracking-[0.2em] text-primary uppercase">Dossier Index</h2>
              <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 hover:bg-secondary rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-4 bg-black/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono uppercase text-muted-foreground opacity-50">Active Case</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowCaseSwitcher(!showCaseSwitcher)}>
                  <GitBranch className="h-3 w-3" />
                </Button>
              </div>
              
              <AnimatePresence>
                {showCaseSwitcher && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {allCases.map((c: any) => (
                        <button
                          key={c.id || c._id}
                          onClick={() => { setActiveCaseId(c.id || c._id); setShowCaseSwitcher(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                            (c.id || c._id) === activeCaseId ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-secondary/50 text-muted-foreground border border-transparent'
                          }`}
                        >
                          <span className="text-[10px] font-mono uppercase truncate">{c.title}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button onClick={createConversation} className="w-full justify-start gap-2 cyber-border uppercase text-[10px] tracking-widest font-bold" variant="secondary" size="sm">
                <Plus className="h-4 w-4" /> New Investigation
              </Button>
            </div>

            <ScrollArea className="flex-1 px-3 py-4">
              {conversations.map((conv) => (
                <div key={conv.id} onClick={() => setActiveId(conv.id)} className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer mb-2 transition-all conv-item ${activeId === conv.id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-secondary/50 border border-transparent"}`}>
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1 font-mono text-[11px] uppercase tracking-tighter">{conv.title}</span>
                  <button onClick={(e) => deleteConversation(conv.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </ScrollArea>

            <div className="p-4 border-t border-border bg-black/20">
              <StatusBadge status={llmStatus} />
              <p className="text-[9px] text-muted-foreground mt-2 font-mono uppercase tracking-widest opacity-40">चाणक्य — अर्थशास्त्र</p>
            </div>
          </motion.aside>
        )}

      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden" ref={chatWindowRef}>
        {/* Forensic Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
          <div className="text-[15vw] font-black font-mono rotate-[-30deg] uppercase tracking-[0.5em]">Secret Analysis</div>
        </div>

        <div className="shrink-0 border-b border-border px-3 md:px-6 py-3 md:py-4 flex items-center justify-between bg-card/10 backdrop-blur-xl z-10">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button 
              onClick={() => setSidebarOpen((s) => !s)} 
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors md:hidden"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[10px] md:text-xs font-black font-mono tracking-[0.15em] md:tracking-[0.2em] flex items-center gap-2 md:gap-3 text-primary uppercase chat-title">
                CHANAKYA AI ANALYST
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-primary/20 bg-primary/5 uppercase tracking-widest h-4">
                  {data ? "LIVE ANALYTICS" : "HISTORICAL VIEW"}
                </Badge>
                <span className="hidden sm:inline text-[9px] text-muted-foreground/40 font-mono uppercase tracking-tighter">SECURE CHANNEL</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeConv && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/report")} 
                className="h-8 px-2 md:px-4 text-[9px] font-bold font-mono gap-2 uppercase tracking-widest hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export Analysis</span>
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 py-4 md:px-8 md:py-8">
          {(!activeCaseId && conversations.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center py-20 space-y-10" ref={onboardingRef}>
              <div className="relative">
                <div className="h-28 w-28 rounded-[2.5rem] bg-gradient-to-br from-amber-900/20 to-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_80px_rgba(var(--primary-rgb),0.15)]">
                  <span className="text-5xl font-bold text-primary/60" style={{fontFamily:'serif'}}>च</span>
                </div>
                <div className="absolute -inset-10 border border-primary/5 rounded-full animate-ping-slow opacity-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black font-mono text-primary tracking-[0.3em] uppercase">CHANAKYA</h2>
                <p className="text-xs text-muted-foreground/60 font-mono uppercase tracking-widest">चाणक्य — Forensic Intelligence Engine</p>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto opacity-60">Named after the ancient Indian spymaster &amp; author of Arthashastra. Upload UFDR evidence to begin deep analysis.</p>
              </div>
              <div className="flex flex-col gap-3 w-64 pt-4">
                <Button onClick={() => navigate("/upload")} className="w-full font-mono font-bold tracking-widest cyber-glow uppercase" size="lg">Initialize UFDR</Button>
                <Button onClick={() => navigate("/upload")} className="w-full font-mono tracking-widest opacity-40 hover:opacity-100 transition-opacity uppercase text-[10px]" variant="outline">Run Simulation</Button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {!activeConv || activeConv.messages.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mt-6 md:mt-12">
                  {SUGGESTIONS.map((s) => (
                    <button key={s.label} onClick={() => handleSend(s.prompt)} className="p-3 md:p-5 rounded-2xl border border-border bg-card/30 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group">
                      <div className="text-lg mb-2">{s.icon}</div>
                      <div className="text-xs font-bold text-primary mb-1 uppercase tracking-widest font-mono">{s.label}</div>
                      <div className="text-[10px] text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity">{s.prompt}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="pb-10"><AnimatePresence>{activeConv.messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}</AnimatePresence><div ref={messagesEndRef} /></div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="shrink-0 pt-2 pb-4 md:pb-6 px-3 md:px-6 bg-background">
          <div className="max-w-3xl mx-auto relative group">
            <textarea 
              ref={textareaRef} 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
              placeholder="Message Chanakya..." 
              rows={1} 
              disabled={isStreaming} 
              className="w-full resize-none rounded-[26px] border-0 bg-secondary/60 pl-6 pr-[50px] py-[14px] text-sm md:text-base text-foreground placeholder:text-muted-foreground focus:ring-0 focus:bg-secondary/80 transition-all min-h-[52px] max-h-[200px] leading-relaxed shadow-sm block" 
            />
            <div className="absolute right-2 bottom-2 flex items-center justify-center">
               {isStreaming ? (
                 <Button onClick={() => abortRef.current?.abort()} size="icon" variant="ghost" className="h-[36px] w-[36px] text-foreground animate-pulse rounded-full hover:bg-secondary"><X className="h-4 w-4" /></Button>
               ) : (
                 <Button 
                   onClick={() => handleSend()} 
                   disabled={!input.trim()} 
                   size="icon" 
                   className={`h-[36px] w-[36px] rounded-full transition-all flex items-center justify-center ${input.trim() ? "bg-foreground text-background hover:bg-foreground/90 shadow-md" : "bg-background text-muted-foreground opacity-60"}`}
                 >
                   <Send className="h-4 w-4 translate-x-[-1px] translate-y-[1px]" />
                 </Button>
               )}
            </div>
          </div>
          <p className="hidden md:block text-center text-[10px] text-muted-foreground/60 mt-3">Chanakya can make mistakes. Verify important forensic data.</p>
        </div>
      </div>
    </div>
  );
}
