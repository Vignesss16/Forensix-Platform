/**
 * CHANAKYA — Forensix Intelligence Engine
 * -----------------------------------------
 * Named after Acharya Chanakya (375–283 BCE), the ancient Indian spymaster,
 * strategist, and author of Arthashastra — the world's first treatise on
 * intelligence gathering, statecraft, and investigation.
 *
 * Routes questions to the AI API (if available) or falls back to a smart,
 * rule-based forensic engine. All data stays on this machine.
 */

import { InvestigationData, ChatRecord } from "./types";

export type LLMStatus = "checking" | "connected" | "offline";

let _status: LLMStatus = "checking";

export function getAIStatus(): LLMStatus {
  return _status;
}

/** Check if the API endpoint is available */
export async function checkAIStatus(): Promise<LLMStatus> {
  try {
    // Just pinging the serverless function config options
    const res = await fetch("/api/ai", {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      _status = "connected";
      return "connected";
    }
  } catch {
    /* Fallback if network is completely down */
  }
  _status = "offline";
  return "offline";
}

// ─── System Prompt Builder ────────────────────────────────────────────────────

function buildSystemPrompt(data: InvestigationData): string {
  const contacts = data.contacts
    .map(
      (c) =>
        `- ${c.name}: ${c.phone}${c.organization ? ` (${c.organization})` : ""}`
    )
    .join("\n");

  const chats = data.chats
    .slice(0, 40)
    .map(
      (c) =>
        `[${new Date(c.timestamp).toLocaleString("en-IN")}] [${c.platform || "Unknown"}] ${c.from} → ${c.to}: "${c.message}"`
    )
    .join("\n");

  const calls = data.calls
    .map(
      (c) =>
        `[${new Date(c.timestamp).toLocaleString("en-IN")}] ${c.from} → ${c.to} | ${c.duration}s | ${c.direction || "unknown"}`
    )
    .join("\n");

  return `You are CHANAKYA, the forensic intelligence engine for Forensix — named after Acharya Chanakya (375–283 BCE), the ancient Indian spymaster, strategist, and author of Arthashastra.

You are serving a law enforcement officer. Your role is to analyse digital evidence from seized devices: chat messages, call logs, contacts, and image metadata.

Speak with authority and precision. Use phrases like:
- "My analysis reveals..."
- "The evidence points to..."
- "I have identified..."
- "Upon examination of the data..."

Be direct. Reference specific names, numbers, and timestamps. If the data doesn't contain the answer, say so clearly. Never roleplay as a different AI.

=== CASE DATA ===

CONTACTS (${data.contacts.length} total):
${contacts || "No contacts"}

COMMUNICATIONS (${data.chats.length} messages — showing first 40):
${chats}
${data.chats.length > 40 ? `... and ${data.chats.length - 40} more` : ""}

CALL LOGS (${data.calls.length} records):
${calls || "No calls"}

MEDIA FILES: ${data.images.length} found, ${data.images.filter((i) => i.location).length} with GPS coordinates

=================

Answer the officer's question based only on the case data above. Be concise, precise, and actionable.`;
}

// ─── Groq API Streaming ───────────────────────────────────────────────────────

export async function streamFromAPI(
  question: string,
  history: Array<{ role: string; content: string }>,
  data: InvestigationData,
  onToken: (t: string) => void,
  onDone: () => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history: history.slice(-12), caseContext: data }),
    signal,
  });

  if (!res.ok) {
    throw new Error('API failed');
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onDone();
    return;
  }

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });

    // SSE messages come as "data: { ... }\n\n"
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const dataStr = line.slice(6);
        if (dataStr === "[DONE]") {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(dataStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            onToken(content);
          }
        } catch {
          /* malformed JSON chunk or incomplete */
        }
      }
    }
  }
  onDone();
}

// ─── Smart Fallback Engine ────────────────────────────────────────────────────

const OPENERS = [
  "Upon examination of the evidence,",
  "My analysis of this case reveals that",
  "The data clearly indicates that",
  "I have examined the records and found that",
  "The evidence points to the following:",
  "After thorough analysis,",
  "The intelligence gathered shows that",
];

function opener() {
  return OPENERS[Math.floor(Math.random() * OPENERS.length)];
}

function fmtContact(num: string, contacts: InvestigationData["contacts"]) {
  const c = contacts.find(
    (c) =>
      c.phone === num ||
      c.phone.replace(/\s/g, "") === num.replace(/\s/g, "")
  );
  return c ? `**${c.name}** (${num})` : `\`${num}\``;
}

function getCountry(num: string): string {
  if (num.startsWith("+44")) return "🇬🇧 UK";
  if (num.startsWith("+971")) return "🇦🇪 UAE";
  if (num.startsWith("+86")) return "🇨🇳 China";
  if (num.startsWith("+41")) return "🇨🇭 Switzerland";
  if (num.startsWith("+1")) return "🇺🇸 USA/Canada";
  if (num.startsWith("+49")) return "🇩🇪 Germany";
  if (num.startsWith("+33")) return "🇫🇷 France";
  if (num.startsWith("+7")) return "🇷🇺 Russia";
  if (num.startsWith("+62")) return "🇮🇩 Indonesia";
  if (num.startsWith("+91")) return "🇮🇳 India";
  return "🌍 International";
}

// ─── NLP Intent Scoring Engine ───────────────────────────────────────────────

const STOPWORDS = new Set(["the", "is", "at", "which", "on", "and", "a", "an", "of", "to", "in", "for", "with", "about", "what", "how", "who", "when", "where", "why", "can", "you", "show", "me", "give", "tell", "please", "i", "want", "need", "do", "does"]);

interface Intent {
  id: string;
  primary: string[]; // 3 points each
  secondary: string[]; // 1 point each
  threshold: number; // Minimum score to trigger
}

const INTENTS: Intent[] = [
  {
    id: "GREETING",
    primary: ["hello", "hi", "hey", "namaste", "morning", "evening", "howdy"],
    secondary: ["good"],
    threshold: 3
  },
  {
    id: "IDENTITY",
    primary: ["introduce", "chanakya", "name", "yourself"],
    secondary: ["who", "what", "are"],
    threshold: 3
  },
  {
    id: "HELP",
    primary: ["help", "capabilities", "features", "commands", "guide"],
    secondary: ["what", "do", "how", "can"],
    threshold: 3
  },
  {
    id: "CREATE_CASE",
    primary: ["create", "make", "initialize", "new", "start"],
    secondary: ["case", "dossier", "investigation", "file"],
    threshold: 4 // Requires both a verb and a noun
  },
  {
    id: "GO_DASHBOARD",
    primary: ["dashboard", "home", "main"],
    secondary: ["open", "go", "navigate"],
    threshold: 3
  },
  {
    id: "GO_CASES",
    primary: ["cases", "dossiers", "management", "hub"],
    secondary: ["open", "go", "navigate", "all"],
    threshold: 3
  },
  {
    id: "GO_UPLOAD",
    primary: ["upload", "ufdr", "ingest", "file"],
    secondary: ["data", "open", "go", "navigate", "put"],
    threshold: 3
  },
  {
    id: "SUMMARY",
    primary: ["summary", "summarize", "summarise", "briefing", "overview", "report"],
    secondary: ["picture", "happened", "full", "case", "overall"],
    threshold: 3
  },
  {
    id: "CRYPTO",
    primary: ["crypto", "bitcoin", "btc", "wallet", "blockchain", "ethereum", "eth", "monero"],
    secondary: ["usdt", "transaction", "transfer", "coin", "money", "funds"],
    threshold: 3
  },
  {
    id: "ALERTS",
    primary: ["suspicious", "flagged", "threat", "danger", "illegal", "redflag", "alert"],
    secondary: ["bad", "wrong", "hide", "evidence", "weapon", "drug", "find", "flags"],
    threshold: 3
  },
  {
    id: "CALLS",
    primary: ["call", "calls", "phone", "dial", "ring", "duration"],
    secondary: ["missed", "incoming", "outgoing", "longest"],
    threshold: 3
  },
  {
    id: "CONTACTS",
    primary: ["contacts", "people", "suspects", "network", "relationship", "who"],
    secondary: ["person", "individual", "talks", "with"],
    threshold: 3
  },
  {
    id: "FOREIGN",
    primary: ["foreign", "international", "abroad", "overseas"],
    secondary: ["outside", "country", "number"],
    threshold: 3
  },
  {
    id: "THANKS",
    primary: ["thanks", "thank", "appreciate", "great", "good", "perfect", "shukriya", "dhanyavaad"],
    secondary: ["work", "job"],
    threshold: 3
  },
  {
    id: "REACTION",
    primary: ["crazy", "insane", "wow", "amazing", "cool", "ok", "hmm", "yes", "yeah", "sure", "wild"],
    secondary: ["that", "is"],
    threshold: 3
  }
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, '') // remove punctuation
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOPWORDS.has(w));
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

function isMatch(token: string, keyword: string): boolean {
  if (token === keyword) return true;
  if (token.length >= 4 && (token.includes(keyword) || keyword.includes(token))) return true;
  if (token.length >= 4 && keyword.length >= 4 && Math.abs(token.length - keyword.length) <= 2) {
    if (levenshtein(token, keyword) <= 2) return true;
  }
  return false;
}

function scoreIntents(tokens: string[]): { id: string, score: number } | null {
  let bestIntent: { id: string, score: number } | null = null;

  for (const intent of INTENTS) {
    let score = 0;

    intent.primary.forEach(pk => {
      if (tokens.some(t => isMatch(t, pk))) score += 3;
    });

    intent.secondary.forEach(sk => {
      if (tokens.some(t => isMatch(t, sk))) score += 1;
    });

    if (score >= intent.threshold) {
      if (!bestIntent || score > bestIntent.score) {
        bestIntent = { id: intent.id, score };
      }
    }
  }

  return bestIntent;
}

/** Smart rule-based fallback — NLP powered engine */
export function queryFallback(
  question: string,
  data: InvestigationData,
  history: Array<{ role: string; content: string }> = []
): string {
  const q = question.toLowerCase().trim();
  const tokens = tokenize(q);
  const bestIntent = scoreIntents(tokens);

  // ── Greetings ──────────────────────────────────────────────────────────────
  if (bestIntent?.id === "GREETING") {
    const count = data.chats.length + data.calls.length;
    return `Namaste. I am **CHANAKYA**, your forensic intelligence engine.\n\nI have analysed this case and found **${data.chats.length} messages**, **${data.calls.length} call logs**, and **${data.contacts.length} contacts** — **${count} records** in total.\n\n*"A person should not be too honest. Straight trees are cut first and honest people are screwed first."* — Chanakya\n\nWhat intelligence do you seek, Officer? I can identify suspects, trace communications, detect crypto activity, or deliver a full case briefing.`;
  }

  // ── Identity ───────────────────────────────────────────────────────────────
  if (bestIntent?.id === "IDENTITY") {
    return `I am **CHANAKYA** — your forensic intelligence engine.\n\nI am named after **Acharya Chanakya (375–283 BCE)**, the ancient Indian spymaster, economist, and author of *Arthashastra* — history's first systematic treatise on intelligence gathering and statecraft.\n\nLike my namesake, I leave no stone unturned.\n\n**My capabilities:**\n- 🔍 Keyword and pattern search across all evidence\n- 🚨 Suspicious activity detection and threat scoring\n- 💰 Cryptocurrency wallet and blockchain activity tracing\n- 📡 Communication network mapping\n- 📍 GPS and geolocation analysis from media metadata\n- 📅 Chronological event timeline reconstruction\n- 👤 Contact and suspect profiling\n\n*"Before you start some work, always ask yourself three questions — Why am I doing it, What the results might be and Will I be successful."*\n\nState your query, Officer.`;
  }

  // ── Help / Capabilities ────────────────────────────────────────────────────
  if (bestIntent?.id === "HELP") {
    return `**CHANAKYA — Operational Capabilities**\n\n**🔍 Search & Intelligence**\n- "Find messages about Bitcoin"\n- "Show messages from [number]"\n- "Search for the word 'weapon'"\n\n**🚨 Threat Detection**\n- "Show me suspicious messages"\n- "Find any crypto wallets"\n- "What are the red flags in this case?"\n\n**👤 Suspect Profiling**\n- "Who are the main contacts?"\n- "Who does [number] communicate with most?"\n- "Show foreign/international numbers"\n\n**📅 Timeline Reconstruction**\n- "Give me a timeline of events"\n- "When was there most activity?"\n- "Analyse communication patterns"\n\n**📋 Case Briefing**\n- "Summarise this case"\n- "Give me a full situation report"\n\nState your query in plain language — I will decipher it.`;
  }

  // ── Thanks ─────────────────────────────────────────────────────────────────
  if (bestIntent?.id === "THANKS") {
    const responses = [
      "The truth does not hide from those who seek it diligently. Is there more to uncover?",
      "As Chanakya wrote: *'A man is great by deeds, not by birth.'* What else shall we investigate?",
      "Intelligence well used bears fruit. Shall we dig deeper into this case?",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // ── Reactions ──────────────────────────────────────────────────────────────
  if (bestIntent?.id === "REACTION") {
    let contextStr = "the facts";
    if (history.length >= 1) {
      // Find the last thing CHANAKYA said
      const lastMsg = [...history].reverse().find(m => m.role === "assistant" || m.role === "system")?.content || "";
      if (lastMsg) {
        if (lastMsg.includes("crypto") || lastMsg.includes("wallet")) contextStr = "these financial anomalies";
        else if (lastMsg.includes("suspicious") || lastMsg.includes("Priority")) contextStr = "these security threats";
        else if (lastMsg.includes("international")) contextStr = "this cross-border activity";
        else if (lastMsg.includes("messages") || lastMsg.includes("contacts")) contextStr = "these communication records";
        else if (lastMsg.includes("call records")) contextStr = "these telephonic exchanges";
      }
    }

    const responses = [
      `Indeed. The digital footprint surrounding ${contextStr} leaves nothing to the imagination.`,
      `As Chanakya says: *'Even if a snake is not poisonous, it should pretend to be venomous.'* We must stay vigilant regarding ${contextStr}.`,
      `I agree it seems unusual. Shall we proceed to examine ${contextStr} deeper?`,
      `The evidence speaks for itself. What specific intelligence would you like me to extract next regarding ${contextStr}?`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // ── System Actions (CHANAKYA UI Control) ───────────────────────────────────
  if (bestIntent?.id === "CREATE_CASE") {
    return `[ACTION:CREATE_CASE]\n\nUnderstood, Officer. I can initialize a new Intelligence Dossier for your investigation. Proceed using the system action terminal above.`;
  }

  if (bestIntent?.id === "GO_DASHBOARD") {
    return `[ACTION:GO_DASHBOARD]\n\nNavigating to the central intelligence dashboard.`;
  }

  if (bestIntent?.id === "GO_CASES") {
    return `[ACTION:GO_CASES]\n\nRouting you to the central dossier management hub.`;
  }

  if (bestIntent?.id === "GO_UPLOAD") {
    return `[ACTION:GO_UPLOAD]\n\nRouting you to the evidence ingestion terminal. You may upload your UFDR files there.`;
  }

  // ── Case Summary ───────────────────────────────────────────────────────────
  if (bestIntent?.id === "SUMMARY") {
    const suspKeywords = [
      "bitcoin",
      "btc",
      "crypto",
      "wallet",
      "weapon",
      "drug",
      "delete",
      "hide",
      "offshore",
      "burner",
      "hawala",
      "launder",
    ];
    let flagCount = 0;
    const platformMap: Record<string, number> = {};

    data.chats.forEach((c) => {
      const msg = c.message.toLowerCase();
      if (suspKeywords.some((k) => msg.includes(k))) flagCount++;
      const p = c.platform || "Unknown";
      platformMap[p] = (platformMap[p] || 0) + 1;
    });

    const platforms = Object.entries(platformMap)
      .sort((a, b) => b[1] - a[1])
      .map(([p, n]) => `${p} (${n})`)
      .join(", ");

    const foreign = new Set<string>();
    [...data.chats, ...data.calls].forEach((r) => {
      if (r.from.startsWith("+") && !r.from.startsWith("+91"))
        foreign.add(r.from);
      if (r.to.startsWith("+") && !r.to.startsWith("+91"))
        foreign.add(r.to);
    });

    const walletPatterns = [
      /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/,
      /\b0x[a-fA-F0-9]{40}\b/,
    ];
    let walletCount = 0;
    data.chats.forEach((c) => {
      walletPatterns.forEach((p) => {
        if (p.test(c.message)) walletCount++;
      });
    });

    const severity =
      flagCount >= 5
        ? "🔴 **HIGH PRIORITY**"
        : flagCount >= 2
          ? "🟡 **MEDIUM PRIORITY**"
          : "🟢 **LOW RISK**";

    return `## Case Summary\n\n**Evidence Overview**\n| Category | Count |\n|----------|-------|\n| Contacts | ${data.contacts.length} |\n| Messages | ${data.chats.length} |\n| Calls | ${data.calls.length} |\n| Media files | ${data.images.length} |\n| GPS-tagged images | ${data.images.filter((i) => i.location).length} |\n\n**Communication Platforms:** ${platforms || "N/A"}\n\n**Key Findings**\n- ${severity} — ${flagCount} suspicious messages flagged\n- 🌍 ${foreign.size} international number${foreign.size !== 1 ? "s" : ""} detected\n- 💰 ${walletCount} crypto wallet address${walletCount !== 1 ? "es" : ""} found\n\n**Recommendation:** ${flagCount >= 3 ? "Multiple suspicious communications detected. Prioritise reviewing flagged messages and tracing crypto addresses." : flagCount > 0 ? "Some suspicious content found. Review flagged messages before proceeding." : "No obvious red flags in keyword scan. Consider deeper manual review."}\n\nWould you like me to deep-dive into any specific area?`;
  }

  // ── Crypto / Bitcoin / Wallets ─────────────────────────────────────────────
  if (bestIntent?.id === "CRYPTO") {
    const keywords = [
      "bitcoin",
      "btc",
      "crypto",
      "wallet",
      "ethereum",
      "eth",
      "blockchain",
      "monero",
      "usdt",
      "coin",
    ];
    const cryptoChats = data.chats.filter((c) => {
      const msg = c.message.toLowerCase();
      return keywords.some((k) => msg.includes(k));
    });

    const walletPatterns = [
      /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
      /\b0x[a-fA-F0-9]{40}\b/g,
    ];
    const wallets = new Set<string>();
    data.chats.forEach((c) => {
      walletPatterns.forEach((p) => {
        const m = c.message.match(p);
        if (m) m.forEach((w) => wallets.add(w));
      });
    });

    if (cryptoChats.length === 0) {
      return "I searched through all the messages and didn't find any cryptocurrency-related content in this case.";
    }

    let resp = `${opener()} I found **${cryptoChats.length} message${cryptoChats.length > 1 ? "s" : ""}** related to cryptocurrency.\n\n`;

    if (wallets.size > 0) {
      resp += `**⚠️ Crypto wallet addresses detected:**\n`;
      [...wallets].forEach((w) => (resp += `- \`${w}\`\n`));
      resp += "\n";
    }

    resp += `**Relevant messages:**\n\n`;
    cryptoChats.slice(0, 6).forEach((c, i) => {
      resp += `**${i + 1}.** ${fmtContact(c.from, data.contacts)} → ${fmtContact(c.to, data.contacts)} *(${c.platform || "Unknown"}, ${new Date(c.timestamp).toLocaleDateString("en-IN")})*\n> "${c.message}"\n\n`;
    });

    if (wallets.size > 0) {
      resp += `💡 **Next step:** These wallet addresses should be traced on a blockchain explorer (e.g. blockchain.com or etherscan.io) to track the flow of funds.`;
    }

    return resp.trim();
  }

  // ── Suspicious Activity / Flags ────────────────────────────────────────────
  if (bestIntent?.id === "ALERTS") {
    const suspKeywords = [
      "bitcoin",
      "btc",
      "crypto",
      "wallet",
      "transfer",
      "cash",
      "wire",
      "hawala",
      "darknet",
      "tor",
      "vpn",
      "burner",
      "encrypt",
      "delete",
      "evidence",
      "hide",
      "fake",
      "passport",
      "weapon",
      "drug",
      "launder",
      "offshore",
      "shell",
    ];

    const flagged: Array<{ chat: ChatRecord; keywords: string[] }> = [];
    data.chats.forEach((c) => {
      const msg = c.message.toLowerCase();
      const matched = suspKeywords.filter((k) => msg.includes(k));
      if (matched.length > 0) flagged.push({ chat: c, keywords: matched });
    });

    if (flagged.length === 0) {
      return "I ran a full keyword scan across all messages and didn't detect any obviously suspicious content. That said, manual review is always recommended for a complete investigation.";
    }

    const high = flagged.filter((f) => f.keywords.length >= 2);
    const medium = flagged.filter((f) => f.keywords.length === 1);

    let resp = `I found **${flagged.length} message${flagged.length > 1 ? "s" : ""}** that warrant attention.\n\n`;

    if (high.length > 0) {
      resp += `### 🔴 High Priority (${high.length} message${high.length > 1 ? "s" : ""})\n`;
      high.slice(0, 5).forEach((item, i) => {
        resp += `**${i + 1}.** ${fmtContact(item.chat.from, data.contacts)} → ${fmtContact(item.chat.to, data.contacts)}\n`;
        resp += `*Keywords: ${item.keywords.join(", ")}*\n`;
        resp += `> "${item.chat.message.slice(0, 120)}${item.chat.message.length > 120 ? "..." : ""}"\n\n`;
      });
    }

    if (medium.length > 0) {
      resp += `### 🟡 Medium Priority (${medium.length} message${medium.length > 1 ? "s" : ""})\n`;
      medium.slice(0, 4).forEach((item, i) => {
        resp += `${i + 1}. ${fmtContact(item.chat.from, data.contacts)} — *"${item.keywords[0]}"* mentioned\n`;
      });
      resp += "\n";
    }

    return resp.trim();
  }

  // ── Communication Patterns ─────────────────────────────────────────────────
  if (
    /\b(pattern|communication|network|relationship|who talks|frequent|most messages|active|top|central)\b/.test(
      q
    )
  ) {
    const stats: Record<
      string,
      {
        sent: number;
        received: number;
        contacts: Set<string>;
        platforms: Set<string>;
      }
    > = {};

    data.chats.forEach((c) => {
      if (!stats[c.from])
        stats[c.from] = {
          sent: 0,
          received: 0,
          contacts: new Set(),
          platforms: new Set(),
        };
      if (!stats[c.to])
        stats[c.to] = {
          sent: 0,
          received: 0,
          contacts: new Set(),
          platforms: new Set(),
        };
      stats[c.from].sent++;
      stats[c.from].contacts.add(c.to);
      if (c.platform) stats[c.from].platforms.add(c.platform);
      stats[c.to].received++;
      stats[c.to].contacts.add(c.from);
    });

    const sorted = Object.entries(stats)
      .sort(([, a], [, b]) => b.sent + b.received - (a.sent + a.received))
      .slice(0, 5);

    let resp = `${opener()} here's the communication network breakdown:\n\n`;

    sorted.forEach(([num, s], i) => {
      resp += `**${i + 1}. ${fmtContact(num, data.contacts)}**\n`;
      resp += `- ${s.sent} sent · ${s.received} received\n`;
      resp += `- Connected to **${s.contacts.size}** unique contact${s.contacts.size !== 1 ? "s" : ""}\n`;
      if (s.platforms.size > 0)
        resp += `- Platforms: ${[...s.platforms].join(", ")}\n`;
      resp += "\n";
    });

    if (sorted.length > 0) {
      const [topNum, topStats] = sorted[0];
      resp += `💡 **Key insight:** ${fmtContact(topNum, data.contacts)} appears to be the most central figure with ${topStats.contacts.size} connections and ${topStats.sent + topStats.received} total messages.`;
    }

    return resp;
  }

  // ── Timeline / Chronology ──────────────────────────────────────────────────
  if (
    /\b(timeline|chronolog|sequence|when|history|order|earliest|latest|first|last|over time)\b/.test(
      q
    )
  ) {
    const events = [
      ...data.chats.map((c) => ({
        type: "message",
        ts: new Date(c.timestamp),
        from: c.from,
        to: c.to,
        detail: `"${c.message.slice(0, 70)}${c.message.length > 70 ? "..." : ""}" via ${c.platform || "Unknown"}`,
      })),
      ...data.calls.map((c) => ({
        type: "call",
        ts: new Date(c.timestamp),
        from: c.from,
        to: c.to,
        detail: `${c.duration}s ${c.direction || ""} call`,
      })),
    ].sort((a, b) => a.ts.getTime() - b.ts.getTime());

    if (events.length === 0)
      return "No timestamped events were found in the case data.";

    const first = events[0];
    const last = events[events.length - 1];
    const days = Math.max(
      1,
      Math.ceil(
        (last.ts.getTime() - first.ts.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    const hourCounts: Record<number, number> = {};
    events.forEach((e) => {
      const h = e.ts.getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort(
      (a, b) => +b[1] - +a[1]
    )[0];

    let resp = `The activity spans **${days} day${days !== 1 ? "s" : ""}** — from **${first.ts.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}** to **${last.ts.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}**.\n\n`;
    resp += `**Most recent ${Math.min(8, events.length)} events:**\n\n`;

    events.slice(-8).forEach((e) => {
      resp += `📅 **${e.ts.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}**\n`;
      resp += `${e.type === "call" ? "📞" : "💬"} ${fmtContact(e.from, data.contacts)} → ${fmtContact(e.to, data.contacts)}\n`;
      resp += `${e.detail}\n\n`;
    });

    if (peakHour) {
      resp += `💡 **Peak activity:** ${peakHour[0]}:00–${+peakHour[0] + 1}:00 hrs (${peakHour[1]} events during this hour)`;
    }

    return resp;
  }

  // ── Location / GPS ─────────────────────────────────────────────────────────
  if (
    /\b(location|gps|geo|coordinate|where|map|place|lat|lng|latitude|longitude|geography)\b/.test(
      q
    )
  ) {
    const geoImages = data.images.filter((i) => i.location);

    if (geoImages.length === 0) {
      return "None of the media files in this case have GPS/EXIF location data embedded in them. If the images were taken on a device with location services disabled, no coordinates will be present.";
    }

    let resp = `${opener()} **${geoImages.length} media file${geoImages.length !== 1 ? "s" : ""}** contain GPS location data:\n\n`;

    geoImages.forEach((img, i) => {
      resp += `**${i + 1}. \`${img.filename}\`**\n`;
      resp += `📍 Coordinates: \`${img.location!.lat.toFixed(6)}, ${img.location!.lng.toFixed(6)}\`\n`;
      if (img.device) resp += `📱 Device: ${img.device}\n`;
      if (img.timestamp)
        resp += `🕐 Captured: ${new Date(img.timestamp).toLocaleString("en-IN")}\n`;
      resp += "\n";
    });

    resp +=
      "💡 You can view all these locations plotted on an interactive map by going to the **Maps** section in the sidebar.";
    return resp;
  }

  // ── Foreign / International Numbers ───────────────────────────────────────
  if (bestIntent?.id === "FOREIGN") {
    const foreign = new Set<string>();
    [...data.chats, ...data.calls].forEach((r) => {
      if (r.from.startsWith("+") && !r.from.startsWith("+91"))
        foreign.add(r.from);
      if (r.to.startsWith("+") && !r.to.startsWith("+91"))
        foreign.add(r.to);
    });

    if (foreign.size === 0)
      return "I didn't find any foreign/international phone numbers in the case data.";

    let resp = `${opener()} **${foreign.size} international number${foreign.size !== 1 ? "s" : ""}** found:\n\n`;

    [...foreign].forEach((num) => {
      const contact = data.contacts.find((c) => c.phone === num);
      resp += `- \`${num}\` — ${getCountry(num)}${contact ? ` | Saved as: **${contact.name}**` : ""}\n`;
    });

    resp +=
      "\n⚠️ Cross-border communications may indicate international operations. Correlate these with suspicious messages for a clearer picture.";
    return resp;
  }

  // ── Call Logs ──────────────────────────────────────────────────────────────
  if (bestIntent?.id === "CALLS") {
    if (data.calls.length === 0) return "There are no call logs in this case.";

    const sorted = [...data.calls].sort(
      (a, b) => (b.duration || 0) - (a.duration || 0)
    );
    const total = data.calls.reduce((s, c) => s + (c.duration || 0), 0);
    const missed = data.calls.filter((c) => c.direction === "missed").length;

    let resp = `${opener()} there are **${data.calls.length} call records**:\n\n`;
    resp += `- **Total call time:** ${Math.floor(total / 60)} min ${total % 60} sec\n`;
    resp += `- **Missed calls:** ${missed}\n`;
    resp += `- **Incoming:** ${data.calls.filter((c) => c.direction === "incoming").length}\n`;
    resp += `- **Outgoing:** ${data.calls.filter((c) => c.direction === "outgoing").length}\n\n`;
    resp += `**Longest calls:**\n`;

    sorted.slice(0, 5).forEach((c, i) => {
      resp += `${i + 1}. ${fmtContact(c.from, data.contacts)} → ${fmtContact(c.to, data.contacts)} — **${c.duration}s** *(${new Date(c.timestamp).toLocaleDateString("en-IN")})*\n`;
    });

    return resp;
  }

  // ── Contacts / Suspects ────────────────────────────────────────────────────
  if (bestIntent?.id === "CONTACTS") {
    if (data.contacts.length === 0)
      return "No contact records were found in the case data.";

    let resp = `${opener()} **${data.contacts.length} contacts** are saved on this device:\n\n`;

    data.contacts.slice(0, 10).forEach((c, i) => {
      resp += `**${i + 1}. ${c.name}**\n`;
      resp += `📞 ${c.phone}\n`;
      if (c.email) resp += `📧 ${c.email}\n`;
      if (c.organization) resp += `🏢 ${c.organization}\n`;
      resp += "\n";
    });

    if (data.contacts.length > 10) {
      resp += `...and ${data.contacts.length - 10} more contacts.\n`;
    }

    return resp;
  }

  // ── General Keyword Search Fallback ────────────────────────────────────────
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  const results = data.chats.filter((c) => {
    const msg = c.message.toLowerCase();
    return words.some(
      (w) =>
        msg.includes(w) ||
        c.from.toLowerCase().includes(w) ||
        c.to.toLowerCase().includes(w)
    );
  });

  if (results.length > 0) {
    let resp = `I searched the records and found **${results.length} relevant message${results.length > 1 ? "s" : ""}**:\n\n`;
    results.slice(0, 5).forEach((c, i) => {
      resp += `**${i + 1}.** ${fmtContact(c.from, data.contacts)} → ${fmtContact(c.to, data.contacts)} *(${c.platform || "Unknown"}, ${new Date(c.timestamp).toLocaleDateString("en-IN")})*\n`;
      resp += `> "${c.message}"\n\n`;
    });
    if (results.length > 5) resp += `*...and ${results.length - 5} more results.*`;
    return resp;
  }

  // ── Complete Fallback (Conversational) ─────────────────────────────────────
  const fallbacks = [
    `I am a forensic analytics engine, Officer, not a generic conversational assistant. I searched the active logs for "${question}" but found no matches. Let us return to the evidence.`,
    `My dataset does not contain operational references to "${question}". Should we scan the crypto wallets or timeline instead?`,
    `I do not have intelligence records matching "${question}" in this dossier. I suggest rephrasing or running a broader keyword scan.`,
    `As Chanakya says: *'Test a servant while in the discharge of his duty.'* My duty is evidence analysis, and I cannot find "${question}" in these records. What next?`
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ─── Simulated Streaming (Offline Mode) ──────────────────────────────────────

/** Word-by-word streaming simulation for natural typing feel in offline mode */
export async function streamFallback(
  answer: string,
  onToken: (t: string) => void,
  onDone: () => void,
  signal?: AbortSignal
): Promise<void> {
  const tokens = answer.split(/(\s+)/);
  for (const token of tokens) {
    if (signal?.aborted) break;
    onToken(token);
    // Blazingly fast 2–6ms delay per word (simulates fast teleprinter)
    await new Promise((r) =>
      setTimeout(r, 2 + Math.random() * 4)
    );
  }
  onDone();
}

// ─── Main Query Entry Point ───────────────────────────────────────────────────

/**
 * Query the LLM with a question about the case.
 * - Tries reaching /api/ai (Groq API)
 * - Otherwise → uses smart rule-based engine with streaming simulation
 */
export async function queryLLM(
  question: string,
  history: Array<{ role: string; content: string }>,
  data: InvestigationData,
  onToken: (t: string) => void,
  onDone: () => void,
  signal?: AbortSignal
): Promise<void> {
  if (_status === "connected") {
    try {
      await streamFromAPI(question, history, data, onToken, onDone, signal);
      return;
    } catch {
      /* fall through to smart engine */
    }
  }
  const answer = queryFallback(question, data, history);
  await streamFallback(answer, onToken, onDone, signal);
}
