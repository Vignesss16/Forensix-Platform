export interface ChatRecord {
  type: "chat";
  from: string;
  to: string;
  message: string;
  timestamp: string;
  platform?: string;
}

export interface CallRecord {
  type: "call";
  from: string;
  to: string;
  duration?: number;
  timestamp: string;
  direction?: "incoming" | "outgoing" | "missed";
}

export interface ContactRecord {
  type: "contact";
  name: string;
  phone: string;
  email?: string;
  organization?: string;
}

export interface ImageMetadata {
  type: "image";
  filename: string;
  timestamp?: string;
  location?: { lat: number; lng: number };
  device?: string;
  url?: string;
}

export type ForensicRecord = ChatRecord | CallRecord | ContactRecord | ImageMetadata;

export interface InvestigationData {
  chats: ChatRecord[];
  calls: CallRecord[];
  contacts: ContactRecord[];
  images: ImageMetadata[];
  rawRecords: ForensicRecord[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: "person" | "phone" | "wallet" | "keyword";
  val?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  label?: string;
}

export interface SuspiciousItem {
  record: ForensicRecord;
  reason: string;
  severity: "low" | "medium" | "high";
}

export const SUSPICIOUS_KEYWORDS = [
  "bitcoin", "btc", "crypto", "wallet", "transfer", "cash", "wire",
  "hawala", "darknet", "tor", "vpn", "burner", "encrypt", "delete",
  "evidence", "hide", "fake", "passport", "weapon", "drug", "launder",
  "offshore", "shell company", "monero", "ethereum", "usdt", "tether",
];

export const CRYPTO_WALLET_PATTERNS = [
  /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/,  // Bitcoin
  /\b0x[a-fA-F0-9]{40}\b/,                  // Ethereum
  /\b[LM][a-km-zA-HJ-NP-Z1-9]{26,33}\b/,   // Litecoin
  /\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b/,   // Monero
];

export function isInternationalNumber(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  return cleaned.startsWith("+") && !cleaned.startsWith("+91") && !cleaned.startsWith("+1");
}
