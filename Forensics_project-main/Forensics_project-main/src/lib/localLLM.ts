/**
 * Forensix Local LLM Engine
 * --------------------------
 * Routes questions to Ollama (if running) or falls back to a smart,
 * human-like conversational engine. All data stays on this machine.
 *
 * To enable full AI: Install Ollama (https://ollama.com) and run:
 *   ollama pull llama3.2:3b
 */

import { InvestigationData, ChatRecord } from "./types";

export type LLMStatus = "checking" | "connected" | "offline";

let _status: LLMStatus = "checking";
let _model = "llama3.2:3b";

export function getOllamaStatus(): LLMStatus {
  return _status;
}

/** Probe Ollama at localhost:11434. Call once on app start. */
export async function checkOllamaStatus(): Promise<LLMStatus> {
  try {
    const res = await fetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.models?.length > 0) {
        _model = data.models[0].name;
      }
      _status = "connected";
      return "connected";
    }
  } catch {
    /* Ollama not running — expected when not installed */
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

  return `You are Forensix AI, a professional forensic investigation assistant for law enforcement officers. You analyse digital evidence from seized devices: chat messages, call logs, contacts, and image metadata.

Be professional but conversational. Speak clearly without unnecessary jargon. Reference specific names, numbers, and timestamps from the case when relevant. If the data doesn't contain the answer, say so honestly. Never roleplay as a fictional AI.

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

Answer the officer's question based only on the case data above. Be concise and actionable.`;
}

// ─── Ollama Streaming ─────────────────────────────────────────────────────────

export async function streamFromOllama(
  question: string,
  history: Array<{ role: string; content: string }>,
  data: InvestigationData,
  onToken: (t: string) => void,
  onDone: () => void,
  signal?: AbortSignal
): Promise<void> {
  const messages = [
    { role: "system", content: buildSystemPrompt(data) },
    ...history.slice(-12),
    { role: "user", content: question },
  ];

  try {
    const res = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: _model, messages, stream: true }),
      signal,
    });

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
      for (const line of chunk.split("\n").filter(Boolean)) {
        try {
          const j = JSON.parse(line);
          if (j.message?.content) onToken(j.message.content);
          if (j.done) {
            onDone();
            return;
          }
        } catch {
          /* skip malformed */
        }
      }
    }
  } catch {
    /* aborted or connection lost */
  }
  onDone();
}

// ─── Smart Fallback Engine ────────────────────────────────────────────────────

const OPENERS = [
  "Based on the evidence in this case,",
  "Looking at the case data,",
  "From what I can see in the records,",
  "I checked through the evidence and found that",
  "Here's what the data shows:",
  "Good question. Looking at this case,",
  "Let me check that for you.",
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

/** Smart rule-based fallback — understands natural language queries about case data */
export function queryFallback(
  question: string,
  data: InvestigationData
): string {
  const q = question.toLowerCase().trim();

  // ── Greetings ──────────────────────────────────────────────────────────────
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy)\b/.test(q)) {
    const count = data.chats.length + data.calls.length;
    return `Hello! I'm **Forensix AI**, your investigation assistant.\n\nI've loaded this case and found **${data.chats.length} messages**, **${data.calls.length} call logs**, and **${data.contacts.length} contacts** — ${count} records in total.\n\nWhat would you like to investigate? I can help you find suspicious activity, trace communications, analyse patterns, or give you a full case summary.`;
  }

  // ── Identity ───────────────────────────────────────────────────────────────
  if (/who are you|what are you|your name|introduce yourself/.test(q)) {
    return `I'm **Forensix AI**, a forensic investigation assistant built specifically for law enforcement officers.\n\nI analyse digital evidence — messages, calls, contacts, and media — entirely on your local machine. Your case data never leaves your system.\n\nI can help you:\n- 🔍 Find specific conversations or keywords\n- 🚨 Identify suspicious activity\n- 📊 Analyse communication patterns\n- 📍 Locate GPS data from images\n- 📋 Summarise the case\n\nWhat would you like to know?`;
  }

  // ── Help / Capabilities ────────────────────────────────────────────────────
  if (/\b(help|what can you|how do i|capabilities|features|commands)\b/.test(q)) {
    return `Here's what I can help you with:\n\n**🔍 Search & Find**\n- "Find messages about Bitcoin"\n- "Show messages from [number]"\n- "Search for the word 'weapon'"\n\n**🚨 Suspicious Activity**\n- "Show me suspicious messages"\n- "Find any crypto wallets"\n- "What are the red flags in this case?"\n\n**👥 People & Contacts**\n- "Who are the main contacts?"\n- "Who does [number] communicate with most?"\n- "Show foreign/international numbers"\n\n**📅 Timeline & Patterns**\n- "Give me a timeline of events"\n- "When was there most activity?"\n- "Analyse communication patterns"\n\n**📋 Summary & Reports**\n- "Summarise this case"\n- "Give me a full overview"\n\nJust ask naturally — I'll understand!`;
  }

  // ── Thanks ─────────────────────────────────────────────────────────────────
  if (/\b(thanks|thank you|appreciate|great|good work|perfect)\b/.test(q)) {
    const responses = [
      "You're welcome! Let me know if you need to dig deeper into anything.",
      "Happy to help. Is there anything else in this case you'd like to explore?",
      "Of course! Feel free to ask anything else about the investigation.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // ── Case Summary ───────────────────────────────────────────────────────────
  if (
    /\b(summary|summarize|summarise|overview|brief|report|what happened|what's in|full picture)\b/.test(
      q
    )
  ) {
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
  if (
    /\b(crypto|bitcoin|btc|wallet|blockchain|ethereum|eth|monero|usdt|tether|coin|transfer|transaction)\b/.test(
      q
    )
  ) {
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
  if (
    /\b(suspicious|flag|alert|danger|threat|illegal|concern|red flag|warrant|evidence)\b/.test(
      q
    )
  ) {
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
  if (
    /\b(foreign|international|abroad|overseas|outside india|international number)\b/.test(
      q
    )
  ) {
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
  if (
    /\b(call|calls|phone|dial|ring|duration|missed|incoming|outgoing)\b/.test(
      q
    )
  ) {
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
  if (
    /\b(contact|contacts|person|people|individual|suspect|who is|show me people)\b/.test(
      q
    )
  ) {
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

  // ── Complete Fallback ──────────────────────────────────────────────────────
  return `I searched the case data but couldn't find anything specific to "${question}".\n\nHere are some things you can ask me:\n- **"Summarise this case"** — get an overview of all evidence\n- **"Show suspicious messages"** — see flagged communications\n- **"Find crypto wallet mentions"** — trace financial activity\n- **"Who are the main contacts?"** — see the contact network\n- **"Show the call logs"** — analyse phone call records\n- **"Give me a timeline"** — see events in order\n\nOr try rephrasing your question.`;
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
    // 18–40ms delay per word — feels natural, not too fast or slow
    await new Promise((r) =>
      setTimeout(r, 18 + Math.random() * 22)
    );
  }
  onDone();
}

// ─── Main Query Entry Point ───────────────────────────────────────────────────

/**
 * Query the LLM with a question about the case.
 * - If Ollama is running → streams real AI response
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
      await streamFromOllama(question, history, data, onToken, onDone, signal);
      return;
    } catch {
      /* fall through to smart engine */
    }
  }
  const answer = queryFallback(question, data);
  await streamFallback(answer, onToken, onDone, signal);
}
