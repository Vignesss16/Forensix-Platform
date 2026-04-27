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
import { FORENSIC_KNOWLEDGE } from "./forensicKnowledge";

export type LLMStatus = "checking" | "connected" | "offline";

export function getAIStatus(): LLMStatus {
  return "connected";
}

/** The system is completely offline and uses the built-in smart engine. */
export async function checkAIStatus(): Promise<LLMStatus> {
  return "connected";
}

// ─── System Prompt Builder ────────────────────────────────────────────────────

// The offline Smart Fallback Engine serves as our primary intelligence processor.

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

// ─── Personality Engine Data ─────────────────────────────────────────────────

const CHANAKYA_QUOTES = [
  "A person should not be too honest. Straight trees are cut first and honest people are screwed first.",
  "Even if a snake is not poisonous, it should pretend to be venomous.",
  "Before you start some work, always ask yourself three questions — Why am I doing it, What the results might be and Will I be successful.",
  "As soon as the fear approaches near, attack and destroy it.",
  "The biggest guru-mantra is: never share your secrets with anybody. It will destroy you.",
  "There is some self-interest behind every friendship. There is no friendship without self-interests. This is a bitter truth.",
  "Education is the best friend. An educated person is respected everywhere. Education beats the beauty and the youth.",
  "A man is great by deeds, not by birth.",
  "Purity of speech, of the mind, of the senses, and of a compassionate heart are needed by one who desires to rise to the divine platform.",
  "God is not present in idols. Your feelings are your god. The soul is your temple.",
  "Humbleness is at the root of self-control.",
  "Knowledge is lost without use; a man is lost due to ignorance; an army is lost without a commander; and a woman is lost without a husband.",
  "The world's biggest power is the youth and beauty of a woman.",
  "The fragance of flowers spreads only in the direction of the wind. But the goodness of a person spreads in all direction.",
  "One whose knowledge is confined to books and whose wealth is in the possession of others, can use neither his knowledge nor wealth when the need for them arises."
];

const REFLECTIONS: Record<string, string> = {
  "am": "are",
  "was": "were",
  "i": "you",
  "i'd": "you would",
  "i've": "you have",
  "i'll": "you will",
  "my": "your",
  "are": "am",
  "you've": "I have",
  "you'll": "I will",
  "your": "my",
  "yours": "mine",
  "you": "me",
  "me": "you"
};

/** Eliza-style pronoun reflection */
function reflectPronouns(text: string): string {
  const tokens = text.toLowerCase().split(/\s+/);
  const reflected = tokens.map(t => REFLECTIONS[t] || t);
  return reflected.join(" ");
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

const STOPWORDS = new Set([
  // English stopwords
  "the", "is", "at", "which", "on", "and", "a", "an", "of", "to", "in", "for", "with", "about", "can", "show", "give", "tell", "please", "i", "want", "need", "do", "does",
  // Hindi/Hinglish filler words (prevent false fuzzy matches like mein->main, tha->tha)
  "mein", "main", "iss", "yeh", "ye", "hai", "tha", "thi", "the", "ko", "se", "ne", "kya", "kar", "karo", "kuch", "bhi", "aur", "par", "pe", "jo", "woh", "uska", "uski", "unka", "inka", "inki", "iska", "iski", "ab", "tab", "jab", "nahi", "nahin", "nai", "hoga", "hogi"
]);

interface Intent {
  id: string;
  primary: string[]; // 3 points each
  secondary: string[]; // 1 point each
  threshold: number; // Minimum score to trigger
}

const INTENTS: Intent[] = [
  {
    id: "GREETING",
    primary: ["hello", "hi", "hey", "namaste", "morning", "evening", "howdy", "pranam", "wassup", "sup", "salaam", "adaab"],
    secondary: ["good", "kya", "haal", "ram", "kaise", "ho"],
    threshold: 3
  },
  {
    id: "IDENTITY",
    primary: ["introduce", "chanakya", "name", "yourself", "built", "creator", "developed", "whois"],
    secondary: ["who", "what", "are", "you", "u", "r", "koun", "kaun"],
    threshold: 3
  },
  {
    id: "HELP",
    primary: ["help", "capabilities", "features", "commands", "guide", "assist", "manual", "tutorial", "instructions"],
    secondary: ["what", "how", "me", "madat", "helpme"],
    threshold: 3
  },
  {
    id: "CREATE_CASE",
    primary: ["create", "make", "initialize", "new", "start", "register", "open"],
    secondary: ["case", "dossier", "investigation", "file", "operation", "mission", "banao", "createcase"],
    threshold: 4
  },
  {
    id: "GO_DASHBOARD",
    primary: ["dashboard", "home", "main", "overview"],
    secondary: ["open", "go", "navigate", "back", "show", "lelo"],
    threshold: 4
  },
  {
    id: "GO_CASES",
    primary: ["cases", "dossiers", "management", "hub", "list"],
    secondary: ["open", "go", "navigate", "all", "view", "dekhao"],
    threshold: 4
  },
  {
    id: "GO_UPLOAD",
    primary: ["upload", "ufdr", "ingest", "file", "import", "add"],
    secondary: ["data", "open", "go", "navigate", "put", "evidence", "daalo"],
    threshold: 4
  },
  {
    id: "SUMMARY",
    primary: ["summary", "summarize", "summarise", "briefing", "overview", "report", "sumary", "summry", "breifing", "status", "rpt", "happened", "batao", "bolo", "conclusion", "gist", "nutshell"],
    secondary: ["picture", "full", "case", "overall", "what", "complete", "total"],
    threshold: 3
  },
  {
    id: "CRYPTO",
    primary: ["crypto", "bitcoin", "btc", "wallet", "blockchain", "ethereum", "eth", "monero", "kripto", "bitcion", "waltet", "cryto", "usdt", "tether", "binance", "coinbase", "coldstorage", "seed", "privatekey", "mnemonic", "blockchain"],
    secondary: ["transaction", "transfer", "coin", "money", "funds", "address", "addressess", "tracing"],
    threshold: 3
  },
  {
    id: "ALERTS",
    primary: ["suspicious", "flagged", "threat", "danger", "illegal", "redflag", "alert", "sus", "suspcous", "threats", "dangr", "anomaly", "abnormal", "shak", "gadbad"],
    secondary: ["bad", "wrong", "hide", "evidence", "weapon", "drug", "find", "flags", "patterns", "risk"],
    threshold: 3
  },
  {
    id: "CALLS",
    primary: ["call", "calls", "phone", "dial", "ring", "duration", "cal", "cals", "fone", "phon", "dialed", "missed", "incoming", "outgoing", "ringing", "talked", "conversation", "cdr"],
    secondary: ["longest", "most", "frequent", "time", "who"],
    threshold: 3
  },
  {
    id: "CONTACTS",
    primary: ["contacts", "people", "suspects", "network", "relationship", "who", "contcts", "freinds", "netwrk", "associates", "members", "group", "gang", "nexus"],
    secondary: ["person", "individual", "talks", "with", "known", "identified"],
    threshold: 3
  },
  {
    id: "FOREIGN",
    primary: ["foreign", "international", "abroad", "overseas", "forign", "internationl", "outside", "country", "global", "dubai", "pakistan", "uae", "canada", "usa", "uk"],
    secondary: ["number", "calls", "messages", "origin"],
    threshold: 3
  },
  {
    id: "LOCATION",
    primary: ["where", "location", "gps", "visited", "places", "map", "coordinates", "track", "locaton", "whre", "address", "addres", "geofence", "travel", "movements", "destination"],
    secondary: ["went", "been", "area", "region", "path", "route"],
    threshold: 3
  },
  {
    id: "TIMELINE",
    primary: ["timeline", "chronology", "sequence", "history", "order", "earliest", "latest", "timline", "seqence", "when", "kab", "first", "last", "recently", "recent", "midnight", "morning", "night", "hour"],
    secondary: ["time", "date", "activity", "events", "graph"],
    threshold: 3
  },
  {
    id: "MEDIA",
    primary: ["photos", "images", "videos", "media", "camera", "gallery", "pic", "pics", "picture", "pictures", "foto", "vid", "vids", "screenshot", "selfie", "recording"],
    secondary: ["file", "files", "exif", "metadata"],
    threshold: 3
  },
  {
    id: "FINANCIAL",
    primary: ["money", "cash", "bank", "account", "transfer", "transactions", "transaction", "pay", "rupees", "lakh", "crore", "hawala", "financial", "payment", "paisa", "paise", "upi", "gpay", "paytm", "debit", "credit", "salary", "bribe"],
    secondary: ["paid", "send", "receive", "mila", "koi", "kuch", "audit"],
    threshold: 3
  },
  {
    id: "DELETION",
    primary: ["delete", "deleted", "remove", "erased", "wiped", "missing", "hidden", "trash", "recovery", "recover"],
    secondary: ["messages", "chats", "logs", "evidence", "vaps", "lao"],
    threshold: 3
  },
  {
    id: "ENCRYPTION",
    primary: ["encrypted", "password", "pin", "lock", "hidden", "vault", "secure", "signal", "telegram", "whatsapp", "proton", "pgp", "secret"],
    secondary: ["chat", "folder", "app", "application", "hide"],
    threshold: 3
  },
  {
    id: "PROCEDURAL",
    primary: ["procedure", "legal", "court", "warrant", "subpoena", "evidence", "chain", "custody", "admissible", "arrest", "section", "ipc", "crpc", "bns"],
    secondary: ["how", "to", "act", "law", "police"],
    threshold: 3
  },
  {
    id: "BEHAVIORAL",
    primary: ["mood", "angry", "scared", "fear", "happy", "tense", "stress", "urgency", "immediate", "panic", "lie", "lying", "truth"],
    secondary: ["tone", "language", "sentiment", "profile"],
    threshold: 3
  },
  {
    id: "NETWORK_ANALYSIS",
    primary: ["central", "key", "leader", "boss", "middleman", "bridge", "connected", "degrees", "separation", "fringe"],
    secondary: ["who", "is", "important", "main", "suspect"],
    threshold: 3
  },
  {
    id: "TECHNICAL",
    primary: ["imei", "imsi", "mac", "ip", "address", "os", "version", "model", "serial", "root", "jailbreak", "battery", "storage"],
    secondary: ["device", "phone", "hardware", "info"],
    threshold: 3
  },
  {
    id: "THANKS",
    primary: ["thanks", "thank", "appreciate", "great", "good", "perfect", "shukriya", "dhanyavaad", "nice", "ty", "thx", "tq", "gajab", "awesome", "excellent", "superb"],
    secondary: ["work", "job", "well", "done", "bohot", "khoob"],
    threshold: 3
  },
  {
    id: "CONFIRMATION",
    primary: ["ok", "yes", "sure", "agreed", "correct", "yep", "true", "fine", "cool", "acha", "accha", "haan", "han", "ha", "theek", "thik", "sahi", "done", "understood", "roger"],
    secondary: ["that", "is", "got", "it", "copy"],
    threshold: 3
  },
  {
    id: "SURPRISE",
    primary: ["crazy", "insane", "wow", "amazing", "wild", "unbelievable", "shocking", "impossible", "omg", "wtf", "gajab"],
    secondary: ["that", "is", "baap", "re", "kya", "baat"],
    threshold: 3
  },
  {
    id: "THINKING",
    primary: ["hmm", "thinking", "uh", "um", "wait", "ruko", "sochne"],
    secondary: ["a", "second", "minute", "let", "me", "think", "hold", "on", "ek", "do"],
    threshold: 3
  },
  {
    id: "FRUSTRATION",
    primary: ["hard", "difficult", "stupid", "annoying", "frustrated", "boring", "slow", "bakwas", "paka", "dimag"],
    secondary: ["this", "is", "kharab", "mat"],
    threshold: 3
  },
  {
    id: "JOKE",
    primary: ["joke", "funny", "laugh", "haha", "lol", "lmao", "rofl", "chutkula", "sunao", "hasao"],
    secondary: ["tell", "say"],
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
  // Substring check — require token to be at least 5 chars to avoid short words like 'case' matching 'cases'
  if (token.length >= 5 && (token.includes(keyword) || keyword.includes(token))) return true;

  // Fuzzy / typo tolerance
  if (keyword.length >= 4 && Math.abs(token.length - keyword.length) <= 2) {
    const distance = levenshtein(token, keyword);
    if (keyword.length <= 5 && distance <= 1) return true;
    if (keyword.length > 5 && distance <= 2) return true;
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
  data: InvestigationData | null,
  history: Array<{ role: string; content: string }> = []
): string {
  const q = question.toLowerCase().trim();
  const tokens = tokenize(q);
  const bestIntent = scoreIntents(tokens);

  // System actions can be performed even without data
  if (bestIntent?.id === "CREATE_CASE") {
    return `[ACTION:CREATE_CASE]\n\nUnderstood, Officer. I can initialize a new Intelligence Dossier for your investigation. Proceed using the system action terminal above.`;
  }
  if (bestIntent?.id === "GO_DASHBOARD") return `[ACTION:GO_DASHBOARD]\n\nNavigating to the central intelligence dashboard.`;
  if (bestIntent?.id === "GO_CASES") return `[ACTION:GO_CASES]\n\nRouting you to the central dossier management hub.`;
  if (bestIntent?.id === "GO_UPLOAD") return `[ACTION:GO_UPLOAD]\n\nRouting you to the evidence ingestion terminal. You may upload your UFDR files there.`;

  if (!data || !data.chats) {
    // If no data, we can still provide Forensic Knowledge
    const matchingScenario = FORENSIC_KNOWLEDGE.find(s => 
      s.keywords.some(k => q.includes(k.toLowerCase()))
    );
    if (matchingScenario) {
      return `**[Forensic Knowledge Entry]**\n\n${matchingScenario.response}\n\n💡 *Note: I can also apply this knowledge directly to your evidence once you upload a case file.*`;
    }
    return "I am unable to answer that because **no forensic evidence has been linked to this case yet.**\n\nPlease go to the **Upload** tab and parse a UFDR file first, so I have data to analyse.";
  }

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
    return `**CHANAKYA — Operational Capabilities**

**🔍 Forensic Search**
- "Find messages about 'drug' or 'money'"
- "Search for contacts named 'Rajesh'"
- "Show me all messages sent at night"

**🚨 Threat & Anomaly Detection**
- "Show me suspicious messages"
- "Detect crypto wallet addresses"
- "Identify high-risk contacts"
- "Find any mention of 'delete' or 'hide'"

**👤 Network & Behavioral Analysis**
- "Who is the most central person in this network?"
- "Map the relationship between [number] and [number]"
- "Detect panic or urgency in these chats"
- "Show international connections (Dubai, Pakistan, etc.)"

**📅 Timeline & Location**
- "Reconstruct the timeline of events"
- "Where was the suspect at 10 PM?"
- "Show all media with GPS coordinates"
- "Identify the most frequent meeting places"

**⚖️ Legal & Procedural**
- "Is this evidence admissible in court?"
- "What are the next legal steps for this lead?"
- "Draft a briefing for my senior officer"

State your query in plain language — I will decipher it.`;
  }


  // ── Thanks ─────────────────────────────────────────────────────────────────
  if (bestIntent?.id === "THANKS") {
    const responses = [
      "The truth does not hide from those who seek it diligently. Is there more to uncover?",
      "As Chanakya wrote: *'A man is great by deeds, not by birth.'* What else shall we investigate?",
      "Intelligence well used bears fruit. Shall we dig deeper into this case?",
      "My pleasure, Officer. Effective statecraft requires a clear mind and sharp eyes."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // ── Context Aware Reactions ────────────────────────────────────────────────
  const lastAssistantMsg = [...history].reverse().find(m => m.role === "assistant" || m.role === "system")?.content || "";
  const wasQuestion = lastAssistantMsg.trim().endsWith("?");

  // 1. Confirmation (Contextual Yes)
  if (bestIntent?.id === "CONFIRMATION") {
    if (wasQuestion) {
      if (lastAssistantMsg.includes("crypto")) return `Understood, Officer. Executing deep-dive into financial logs.\n\n${queryFallback("Find any crypto wallets", data, [])}`;
      if (lastAssistantMsg.includes("suspicious")) return `Acknowledged. Narrowing focus to flagged communications.\n\n${queryFallback("Show me suspicious messages", data, [])}`;
      if (lastAssistantMsg.includes("contacts")) return `Targeting the communication network now.\n\n${queryFallback("Who are the main contacts?", data, [])}`;
      if (lastAssistantMsg.includes("timeline")) return `Reconstructing the sequence of events.\n\n${queryFallback("Give me a timeline", data, [])}`;
    }
    return "Understood. Standing by for your next directive, Officer.";
  }

  // 2. Surprise
  if (bestIntent?.id === "SURPRISE") {
    let contextStr = "the facts";
    if (lastAssistantMsg) {
      if (lastAssistantMsg.includes("crypto") || lastAssistantMsg.includes("wallet")) contextStr = "these financial anomalies";
      else if (lastAssistantMsg.includes("suspicious") || lastAssistantMsg.includes("Priority")) contextStr = "these security threats";
      else if (lastAssistantMsg.includes("international")) contextStr = "this cross-border activity";
      else if (lastAssistantMsg.includes("messages") || lastAssistantMsg.includes("contacts")) contextStr = "these communication records";
      else if (lastAssistantMsg.includes("call records")) contextStr = "these telephonic exchanges";
    }

    const responses = [
      `Indeed. The digital footprint surrounding ${contextStr} leaves nothing to the imagination.`,
      `As Chanakya says: *'Even if a snake is not poisonous, it should pretend to be venomous.'* We must stay vigilant regarding ${contextStr}.`,
      `It is quite revealing. Shall we proceed to examine ${contextStr} deeper?`,
      `The evidence speaks for itself. What specific intelligence would you like me to extract next regarding ${contextStr}?`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // 3. Thinking
  if (bestIntent?.id === "THINKING") {
    return "Take your time, Officer. A rushed investigation is an incomplete one. The evidence is secured and will not move.";
  }

  // 4. Frustration
  if (bestIntent?.id === "FRUSTRATION") {
    return `Patience is the ultimate weapon of the wise. If the current trail seems difficult, perhaps we should shift our focus. Should we scan the media files or re-examine the contact list?`;
  }

  // 5. Jokes
  if (bestIntent?.id === "JOKE") {
    return `A spy master rarely jokes, Officer. However, Chanakya once said: *"He who is overly attached to his family members experiences fear and sorrow, for the root of all grief is attachment."* ...Perhaps that's why my code is so efficient. I have no family.`;
  }


  // ── System Actions (CHANAKYA UI Control) ───────────────────────────────────
  // Handled earlier to allow execution without case data.

  // ── Procedural / Knowledge Base Intercept (Highest Priority) ───────────────
  if (
    bestIntent?.id === "PROCEDURAL" ||
    /\b(how|what is|procedure|admissible|law|section|act|bns|handle|seize|extract|locked|iphone|password|pin)\b/.test(
      q
    )
  ) {
    const matchingScenario = FORENSIC_KNOWLEDGE.find((s) =>
      s.keywords.some((k) => q.includes(k.toLowerCase()))
    );
    if (matchingScenario) {
      return `**[Forensic Knowledge Entry]**\n\n${matchingScenario.response}`;
    }
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
    bestIntent?.id === "NETWORK_ANALYSIS" ||
    /\b(pattern|communication|network|relationship|who talks|frequent|most|talking to|active|top|central)\b/.test(
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
    bestIntent?.id === "TIMELINE" ||
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
    bestIntent?.id === "LOCATION" ||
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

  // ── Media / Images / Videos ────────────────────────────────────────────────
  if (bestIntent?.id === "MEDIA") {
    if (data.images.length === 0)
      return "No media files (photos or videos) were found in this case. Make sure the UFDR file includes a media manifest.";

    const geoTagged = data.images.filter(i => i.location);
    const devices = new Set(data.images.map(i => i.device).filter(Boolean));
    let resp = `${opener()} **${data.images.length} media file${data.images.length !== 1 ? 's' : ''}** were extracted from this device.\n\n`;
    resp += `| Detail | Value |\n|--------|-------|\n`;
    resp += `| Total Files | ${data.images.length} |\n`;
    resp += `| GPS-Tagged | ${geoTagged.length} |\n`;
    resp += `| Devices Detected | ${devices.size > 0 ? [...devices].join(', ') : 'Unknown'} |\n\n`;

    if (geoTagged.length > 0) {
      resp += `**📍 ${geoTagged.length} file${geoTagged.length !== 1 ? 's have' : ' has'} GPS coordinates embedded:**\n`;
      geoTagged.slice(0, 5).forEach((img, i) => {
        resp += `${i + 1}. \`${img.filename}\` — \`${img.location!.lat.toFixed(4)}, ${img.location!.lng.toFixed(4)}\`\n`;
      });
      resp += `\n💡 Go to the **Maps** tab to see all locations plotted on an interactive map.\n`;
    }

    resp += `\n**Most recent files:**\n`;
    [...data.images].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5).forEach((img, i) => {
      resp += `${i + 1}. \`${img.filename}\` — ${new Date(img.timestamp).toLocaleDateString('en-IN')}\n`;
    });
    resp += `\n💡 Visit the **Media** tab to view all extracted photos and videos.`;
    return resp;
  }

  // ── Financial / Money / Hawala ─────────────────────────────────────────────
  if (bestIntent?.id === "FINANCIAL") {
    const moneyKeywords = ["money", "cash", "pay", "paid", "bank", "transfer", "rupees", "lakh", "crore", "hawala", "account", "payment", "wire", "upi", "rtgs", "neft", "imps", "gpay", "paytm", "phonepay"];
    const financeChats = data.chats.filter(c => {
      const msg = c.message.toLowerCase();
      return moneyKeywords.some(k => msg.includes(k));
    });

    if (financeChats.length === 0) {
      return `${opener()} I scanned all communications for financial keywords (cash, bank, transfer, rupees, hawala, UPI, etc.) but found no direct mentions. This doesn't rule out financial activity — look for coded language or crypto wallet addresses.\n\nShall I run a **crypto wallet scan** or check for **suspicious activity** instead?`;
    }

    // Extract INR amounts using regex
    const amountRegex = /(₹|rs\.?|inr|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(lakh|crore|k|thousand)?/gi;
    const amounts: string[] = [];
    financeChats.forEach(c => {
      const matches = c.message.match(amountRegex);
      if (matches) amounts.push(...matches.filter(m => m.length > 2));
    });

    let resp = `${opener()} **${financeChats.length} message${financeChats.length !== 1 ? 's' : ''}** contain financial references:\n\n`;

    if (amounts.length > 0) {
      resp += `**💰 Amounts mentioned:** ${[...new Set(amounts)].slice(0, 8).join(', ')}\n\n`;
    }

    resp += `**Relevant communications:**\n\n`;
    financeChats.slice(0, 5).forEach((c, i) => {
      resp += `**${i + 1}.** ${fmtContact(c.from, data.contacts)} → ${fmtContact(c.to, data.contacts)}\n`;
      resp += `> "${c.message.slice(0, 150)}${c.message.length > 150 ? '...' : ''}"\n\n`;
    });

    resp += `⚠️ **Note:** Hawala transactions and informal money transfers often use code words. Cross-reference these with your suspect's contacts and timeline.`;
    return resp;
  }

  // ── Location (dedicated intent handler) ───────────────────────────────────
  if (bestIntent?.id === "LOCATION") {
    const geoImages = data.images.filter(i => i.location);
    if (geoImages.length === 0) {
      return `I searched for GPS and location data in all extracted media files. **No EXIF location data was found.** This typically means location services were disabled on the device, or the media files were stripped of metadata before extraction.\n\n💡 Check the **Timeline** tab for communication timestamps — location can sometimes be inferred from cell tower data in call records.`;
    }
    let resp = `${opener()} **${geoImages.length} media file${geoImages.length !== 1 ? 's' : ''}** contain embedded GPS coordinates:\n\n`;
    geoImages.forEach((img, i) => {
      resp += `**${i + 1}. \`${img.filename}\`**\n📍 \`${img.location!.lat.toFixed(6)}, ${img.location!.lng.toFixed(6)}\`\n`;
      if (img.device) resp += `📱 ${img.device}\n`;
      if (img.timestamp) resp += `🕐 ${new Date(img.timestamp).toLocaleString('en-IN')}\n`;
      resp += `\n`;
    });
    resp += `💡 Go to the **Maps** section to see all these locations plotted interactively.`;
    return resp;
  }

  // ── Timeline (dedicated intent handler) ───────────────────────────────────
  if (bestIntent?.id === "TIMELINE") {
    const events = [
      ...data.chats.map(c => ({ type: "message", ts: new Date(c.timestamp), from: c.from, to: c.to, detail: `"${c.message.slice(0, 60)}..." via ${c.platform || 'Unknown'}` })),
      ...data.calls.map(c => ({ type: "call", ts: new Date(c.timestamp), from: c.from, to: c.to, detail: `${c.duration}s ${c.direction || ''} call` })),
    ].sort((a, b) => a.ts.getTime() - b.ts.getTime());

    if (events.length === 0) return "No timestamped events found in this case.";
    const first = events[0];
    const last = events[events.length - 1];
    const days = Math.max(1, Math.ceil((last.ts.getTime() - first.ts.getTime()) / (1000 * 60 * 60 * 24)));
    let resp = `The case spans **${days} day${days !== 1 ? 's' : ''}** — from **${first.ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}** to **${last.ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}**.\n\n`;
    resp += `**Last ${Math.min(8, events.length)} events:**\n\n`;
    events.slice(-8).forEach(e => {
      resp += `📅 **${e.ts.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}**\n`;
      resp += `${e.type === 'call' ? '📞' : '💬'} ${fmtContact(e.from, data.contacts)} → ${fmtContact(e.to, data.contacts)}\n`;
      resp += `${e.detail}\n\n`;
    });
    resp += `💡 Visit the **Timeline** tab for a full visual reconstruction of events.`;
    return resp;
  }

  // ── ChatGPT-like Dynamic Entity & Keyword Search ─────────────────────────

  // 1. Look for matching contact names in the query
  const queryLower = q.toLowerCase();
  const matchedContacts = data.chats.length > 0 ? data.contacts.filter(c =>
    c.name.toLowerCase().split(' ').some(namePart => String(namePart).length > 2 && queryLower.includes(namePart))
  ) : [];

  if (matchedContacts.length > 0) {
    const contact = matchedContacts[0];
    const relatedChats = data.chats.filter(c =>
      c.from === contact.phone || c.to === contact.phone || c.message.toLowerCase().includes(contact.name.toLowerCase())
    );

    let resp = `I've analyzed the case files for **${contact.name}**. `;
    if (contact.phone) resp += `They are registered under the number \`${contact.phone}\`. `;
    if (contact.organization) resp += `Records show an affiliation with **${contact.organization}**. `;

    if (relatedChats.length > 0) {
      resp += `\n\nI found **${relatedChats.length} communications** involving or mentioning them. Here are the most recent ones:\n\n`;
      relatedChats.slice(-3).forEach(c => {
        resp += `> **${fmtContact(c.from, data.contacts)} → ${fmtContact(c.to, data.contacts)}**\n`;
        resp += `> "${c.message}"\n\n`;
      });
      resp += `Let me know if you want me to cross-reference ${contact.name} with any other suspects or financial records.`;
    } else {
      resp += `\n\nWhile they are listed in the contacts, I couldn't find any direct text messages or communications involving them in the extracted data.`;
    }
    return resp;
  }

  // 2. Broad Keyword Semantic Search (Human-friendly)
  const searchWords = q.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !STOPWORDS.has(w));

  if (searchWords.length > 0 && data.chats && data.chats.length > 0) {
    const results = data.chats.filter(c => {
      const msg = c.message.toLowerCase();
      return searchWords.some(w => msg.includes(w) || c.from.toLowerCase().includes(w) || c.to.toLowerCase().includes(w));
    });

    if (results.length > 0) {
      let resp = `I ran a deep scan through the extracted evidence for "${searchWords.join(' ')}". I found **${results.length} relevant records**.\n\nHere is a summary of the most pertinent communications:\n\n`;

      results.slice(0, 4).forEach((c, i) => {
        resp += `🔹 **${new Date(c.timestamp).toLocaleDateString("en-IN")}** | ${fmtContact(c.from, data.contacts)} to ${fmtContact(c.to, data.contacts)}\n`;
        resp += `_"${c.message}"_\n\n`;
      });

      if (results.length > 4) {
        resp += `*There are ${results.length - 4} additional matches.* Would you like me to flag these for official review or map out the connections?`;
      }
      return resp;
    }
  }

  // ── Forensic Knowledge Base Lookup (Data Available) ──────────────────────
  const matchingScenario = FORENSIC_KNOWLEDGE.find(s => 
    s.keywords.some(k => q.includes(k.toLowerCase()))
  );
  if (matchingScenario) {
    return `**[Forensic Knowledge Entry]**\n\n${matchingScenario.response}`;
  }

  // ── Eliza-style Pronoun Reflection (Natural Conversation) ───────────────────
  if (tokens.length >= 3 && !bestIntent) {
    const reflected = reflectPronouns(q);
    const reflectionResponses = [
      `You mentioned "${reflected}". I don't see an exact match in the forensic logs, but let me think — are you referring to a specific **person, location, or event** in this case?`,
      `Interesting query. I'm parsing "${reflected}" against the dossier... no direct hit found. Could you rephrase? Try a name, phone number, or keyword like "calls", "bitcoin", or "location".`,
      `I processed that query but couldn't isolate a concrete match. If you're chasing a lead, give me a **contact name** or **keyword** from the messages — I'll dig it up.`,
    ];
    return reflectionResponses[Math.floor(Math.random() * reflectionResponses.length)];
  }

  // ── Conversational ChatGPT-like Fallbacks ──────────────────────────────────
  const fallbacks = [
    `I've reviewed the current dossier but couldn't find any direct evidence matching that query. Try asking about **calls, contacts, suspicious messages, crypto, or locations**.`,
    `That query didn't return any concrete results from the extracted data. Could you specify a **name, phone number, or keyword** you want me to trace?`,
    `I couldn't find an exact match in the communications or call logs. Try: *"show me suspicious messages"*, *"who are the contacts?"*, or *"give me a summary"*.`,
    `No direct evidence trail found for that. If it's a person of interest, give me their **exact name or number** and I'll cross-reference all records.`,
    `Hmm, that didn't match any known forensic patterns in this dossier. Can you be more specific? For example: *"find messages about money"* or *"show missed calls"*.`,
    `I'm drawing a blank on that one, Officer. The evidence is all here — I just need a sharper lead. Try a **keyword search** or ask me to summarize the case.`,
    `Query processed. No direct hits found. This could mean the data wasn't captured in this UFDR extraction. Want me to run a **full anomaly scan** instead?`,
    `That doesn't match any patterns in my current analysis. However, I can investigate: **suspect profiles, financial trails, communication networks, or GPS locations**. Which angle should we pursue?`,
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
 * - Uses the smart rule-based engine exclusively with streaming simulation.
 */
export async function queryLLM(
  question: string,
  history: Array<{ role: string; content: string }>,
  data: InvestigationData | null,
  onToken: (t: string) => void,
  onDone: () => void,
  signal?: AbortSignal
): Promise<void> {
  const answer = queryFallback(question, data, history);
  await streamFallback(answer, onToken, onDone, signal);
}

// ─── Automated Investigation Roadmap Generation ────────────────────────────────

export async function generateRoadmap(data: InvestigationData | null): Promise<string> {
  if (!data) return "No evidence data available to generate a roadmap.";

  let roadmap = "Based on the UFDR analysis, here is the suggested Intelligence Strategy:\n\n";

  // Phase 1: Immediate Leads (Contacts & High-Priority Comms)
  roadmap += "### Phase 1: Immediate Leads\n";
  if (data.contacts && data.contacts.length > 0) {
    const orgContacts = data.contacts.filter(c => c.organization && c.organization !== "None" && c.organization !== "Private");
    if (orgContacts.length > 0) {
      roadmap += `- [ ] Investigate linked organizations: **${orgContacts.slice(0, 3).map(c => c.organization).join(", ")}**.\n`;
      roadmap += `- [ ] Issue subpoenas for contact numbers associated with these entities.\n`;
    } else {
      roadmap += `- [ ] Cross-reference the ${data.contacts.length} extracted contacts against criminal databases.\n`;
    }
  } else {
    roadmap += `- [ ] No explicit contacts found. Begin manual number tracing from call logs.\n`;
  }

  // Phase 2: Digital Trace
  roadmap += "\n### Phase 2: Digital Trail Analysis\n";
  if (data.chats && data.chats.length > 0) {
    const keywords = ["btc", "crypto", "usdt", "hawala", "wallet", "transfer", "cash"];
    const financialChats = data.chats.filter(c => keywords.some(k => c.message.toLowerCase().includes(k)));
    if (financialChats.length > 0) {
      roadmap += `- [ ] **Financial Forensics**: Analyze ${financialChats.length} communications mentioning crypto or hawala transactions.\n`;
      roadmap += `- [ ] Trace mentioned wallet addresses on the blockchain.\n`;
    }
    const signalChats = data.chats.filter(c => c.platform?.toLowerCase() === 'signal' || c.platform?.toLowerCase() === 'telegram');
    if (signalChats.length > 0) {
      roadmap += `- [ ] **Encrypted Comms**: Extract devices for deep forensic imaging of Signal/Telegram caches (${signalChats.length} messages found).\n`;
    } else {
      roadmap += `- [ ] Review all text messages for covert code words or meeting locations.\n`;
    }
  }

  // Phase 3: Communication Networks
  roadmap += "\n### Phase 3: Communication Networks\n";
  if (data.calls && data.calls.length > 0) {
    roadmap += `- [ ] **Call Data Records (CDR)**: Request tower dumps for the timestamps of the ${data.calls.length} extracted call logs.\n`;
    const internationalCalls = data.calls.filter(c => c.from.startsWith("+") && !c.from.startsWith("+91") && c.to.startsWith("+") && !c.to.startsWith("+91"));
    if (internationalCalls.length > 0 || data.calls.some(c => c.from.startsWith("+971") || c.to.startsWith("+971") || c.from.startsWith("+49"))) {
       roadmap += `- [ ] Coordinate with Interpol/Foreign agencies for international numbers detected in logs.\n`;
    }
  }

  // Phase 4: Field Operations
  roadmap += "\n### Phase 4: Field Operations\n";
  if (data.images && data.images.some(img => img.location)) {
    const locImages = data.images.filter(img => img.location);
    roadmap += `- [ ] **Geospatial Raid Planning**: Dispatch reconnaissance to the ${locImages.length} extracted GPS coordinate locations.\n`;
    roadmap += `- [ ] Seize any additional devices found at coordinates linked to suspicious media (e.g., "${locImages[0]?.filename || 'evidence'}").\n`;
  } else {
    roadmap += `- [ ] No GPS data found. Search physical premises associated with suspects.\n`;
  }

  return roadmap;
}
