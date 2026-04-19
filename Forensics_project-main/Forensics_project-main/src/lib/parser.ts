import { InvestigationData, ChatRecord, CallRecord, ContactRecord, ImageMetadata, ForensicRecord } from "./types";

// remove simple ampersand-based obfuscation inserted into some input exports
// by certain tools.  this helper is intentionally very dumb and simply strips
// every '&' character; the rest of the codebase then works with clean text.
function decryptText(str: any): string {
  if (typeof str !== "string") return str;
  return str.replace(/&/g, "");
}

export function parseUploadedFile(content: string, filename: string): InvestigationData {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    return parseJSON(content);
  } else if (ext === "xml") {
    return parseXML(content);
  }

  // Try JSON first, then XML
  try {
    return parseJSON(content);
  } catch {
    return parseXML(content);
  }
}

function parseJSON(content: string): InvestigationData {
  const raw = JSON.parse(content);
  const records: ForensicRecord[] = [];



  if (Array.isArray(raw)) {
    for (const item of raw) {
      const record = normalizeRecord(item);
      if (record) records.push(record);
    }
  } else if (raw.data && Array.isArray(raw.data)) {
    for (const item of raw.data) {
      const record = normalizeRecord(item);
      if (record) records.push(record);
    }
  } else if (raw.chats || raw.calls || raw.contacts || raw.images || raw.messages || raw.call_logs || raw.whatsapp_messages || raw.media_files) {
    // Handle sample data format
    if (raw.chats) raw.chats.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "chat" });
      if (r) records.push(r);
    });
    if (raw.calls) raw.calls.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "call" });
      if (r) records.push(r);
    });
    if (raw.contacts) raw.contacts.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "contact" });
      if (r) records.push(r);
    });
    if (raw.images) raw.images.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "image" });
      if (r) records.push(r);
    });

    // Handle UFDR format with different field names
    if (raw.messages) raw.messages.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "chat" });
      if (r) records.push(r);
    });
    if (raw.call_logs) raw.call_logs.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "call" });
      if (r) records.push(r);
    });
    
    // Handle WhatsApp specific format
    if (raw.whatsapp_messages) raw.whatsapp_messages.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "chat", platform: "WhatsApp" });
      if (r) records.push(r);
    });
    
    // Handle media files (UFDR format)
    if (raw.media_files) raw.media_files.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "image" });
      if (r) records.push(r);
    });
  }

  return categorize(records);
}

function parseXML(content: string): InvestigationData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/xml");
  const records: ForensicRecord[] = [];

  // Try to find record elements
  const elements = doc.querySelectorAll("record, chat, call, contact, image, message, entry, item");

  elements.forEach((el) => {
    const obj: Record<string, string> = {};
    // Get attributes
    Array.from(el.attributes).forEach((attr) => {
      obj[attr.name] = attr.value;
    });
    // Get child elements
    Array.from(el.children).forEach((child) => {
      obj[child.tagName.toLowerCase()] = child.textContent || "";
    });

    if (!obj.type) {
      obj.type = el.tagName.toLowerCase();
      if (["message", "chat"].includes(obj.type)) obj.type = "chat";
      if (["entry", "item"].includes(obj.type)) obj.type = "chat";
    }

    const record = normalizeRecord(obj);
    if (record) records.push(record);
  });

  return categorize(records);
}

function normalizeRecord(item: any): ForensicRecord | null {
  // run every incoming piece of text through our decrypter so that the rest of
  // the app never has to think about any obfuscation that may have been
  // present in the upload.  we modify the object in-place which is fine since
  // the parser only works with a fresh copy of the data.
  for (const key of Object.keys(item)) {
    if (typeof item[key] === "string") {
      item[key] = decryptText(item[key]);
    }
  }

  const type = item.type?.toLowerCase();

  if (type === "chat" || type === "message" || item.message || item.text) {
    return {
      type: "chat",
      from: item.from || item.sender || item.source || "Unknown",
      to: item.to || item.receiver || item.destination || "Unknown",
      message: item.message || item.body || item.text || item.content || "",
      timestamp: item.timestamp || item.date || item.time || "",
      platform: item.platform || item.app || "",
    } as ChatRecord;
  }

  if (type === "call") {
    return {
      type: "call",
      from: item.from || item.caller || item.phone_a || "Unknown",
      to: item.to || item.callee || item.phone_b || "Unknown",
      duration: parseInt(item.duration) || 0,
      timestamp: item.timestamp || item.date || item.call_time || "",
      direction: item.direction || item.call_direction || "outgoing",
    } as CallRecord;
  }

  if (type === "contact") {
    return {
      type: "contact",
      name: item.name || item.displayName || "Unknown",
      phone: item.phone || item.number || item.phoneNumber || "",
      email: item.email || "",
      organization: item.organization || item.org || "",
    } as ContactRecord;
  }

  if (type === "image" || type === "photo" || type === "audio" || type === "video") {
    return {
      type: "image",
      filename: item.filename || item.name || item.file || item.file_name || "unknown",
      timestamp: item.timestamp || item.date || "",
      location: item.lat && item.lng ? { lat: parseFloat(item.lat), lng: parseFloat(item.lng) } : undefined,
      device: item.device || "",
      url: item.url || item.path || undefined,
    } as ImageMetadata;
  }

  return null;
}

function categorize(records: ForensicRecord[]): InvestigationData {
  return {
    chats: records.filter((r): r is ChatRecord => r.type === "chat"),
    calls: records.filter((r): r is CallRecord => r.type === "call"),
    contacts: records.filter((r): r is ContactRecord => r.type === "contact"),
    images: records.filter((r): r is ImageMetadata => r.type === "image"),
    rawRecords: records,
  };
}

// Generate sample data for demo
export function generateSampleData(): InvestigationData {
  const chats: ChatRecord[] = [
    { type: "chat", from: "+919876543210", to: "+918765432109", message: "Send the BTC address for the Mumbai transfer. We need to clear the hawala channels before tomorrow.", timestamp: "2026-04-16T10:30:00Z", platform: "WhatsApp" },
    { type: "chat", from: "+918765432109", to: "+919876543210", message: "Here: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa. Ensure the courier brings the cash to the Andheri drop point.", timestamp: "2026-04-16T10:32:00Z", platform: "WhatsApp" },
    { type: "chat", from: "+919876543210", to: "+971501234567", message: "Dubai end is clear. Use the burner phone for the next contact.", timestamp: "2026-04-17T14:15:00Z", platform: "Telegram" },
    { type: "chat", from: "+971501234567", to: "+919876543210", message: "Will do. Are the fake Aadhar cards ready for the shell company directors?", timestamp: "2026-04-17T14:20:00Z", platform: "Telegram" },
    { type: "chat", from: "+919876543210", to: "+919988776655", message: "Is the passport forgery complete? Client needs to fly out of Delhi by weekend.", timestamp: "2026-04-18T09:00:00Z", platform: "Signal" },
    { type: "chat", from: "+919988776655", to: "+919876543210", message: "Passport copies are ready. The offshore account is also active.", timestamp: "2026-04-18T09:15:00Z", platform: "Signal" },
    { type: "chat", from: "+919876543210", to: "+447890123456", message: "Meeting confirmed at Connaught Place. Bring the encrypted USB.", timestamp: "2026-04-18T16:00:00Z", platform: "iMessage" },
    { type: "chat", from: "+447890123456", to: "+919876543210", message: "Delete this message immediately after reading. Sending 0.5 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38", timestamp: "2026-04-18T16:05:00Z", platform: "iMessage" }
  ];

  const calls: CallRecord[] = [
    { type: "call", from: "+919876543210", to: "+447890123456", duration: 342, timestamp: "2026-04-16T09:00:00Z", direction: "outgoing" },
    { type: "call", from: "+971501234567", to: "+919876543210", duration: 120, timestamp: "2026-04-17T13:00:00Z", direction: "incoming" },
    { type: "call", from: "+919876543210", to: "+918765432109", duration: 560, timestamp: "2026-04-18T08:30:00Z", direction: "outgoing" },
    { type: "call", from: "+919988776655", to: "+919876543210", duration: 0, timestamp: "2026-04-18T15:30:00Z", direction: "missed" }
  ];

  const contacts: ContactRecord[] = [
    { type: "contact", name: "Rahul Deshmukh", phone: "+918765432109", email: "rahul.d@zohomail.in" },
    { type: "contact", name: "Omar (Dubai Hawala)", phone: "+971501234567", organization: "Gulf General Trading" },
    { type: "contact", name: "Priya Sharma (Forger)", phone: "+919988776655", organization: "Delhi Consultancies" },
    { type: "contact", name: "UK Syndicate", phone: "+447890123456", email: "ukconnect@proton.me" },
    { type: "contact", name: "Target Suspect", phone: "+919876543210" }
  ];

  const images: ImageMetadata[] = [
    { type: "image", filename: "forged_aadhar_card.jpg", timestamp: "2026-04-16T12:00:00Z", device: "OnePlus 11 5G", url: "https://images.unsplash.com/photo-1588693891465-b778d910dc84?auto=format&fit=crop&w=500&q=80" },
    { type: "image", filename: "mumbai_cash_drop.png", timestamp: "2026-04-17T15:00:00Z", location: { lat: 19.1136, lng: 72.8697 }, device: "CCTV Mumbai Andheri East", url: "https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&w=500&q=80" },
    { type: "image", filename: "delhi_meeting_location.jpg", timestamp: "2026-04-18T17:00:00Z", location: { lat: 28.6315, lng: 77.2167 }, device: "iPhone 13", url: "https://images.unsplash.com/photo-1582506822521-1f9e578fa28f?auto=format&fit=crop&w=500&q=80" }
  ];

  return {
    chats,
    calls,
    contacts,
    images,
    rawRecords: [...chats, ...calls, ...contacts, ...images],
  };
}
