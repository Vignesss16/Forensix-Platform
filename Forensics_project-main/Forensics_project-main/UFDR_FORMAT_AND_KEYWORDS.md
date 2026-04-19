# UFDR Format & Keyword Connection Guide

## 1. UFDR JSON Structure

Your `ufdr_full_dataset.json` follows this structure:

```json
{
  "device_info": {
    "device_id": "UFDR-DEMO-003",
    "model": "Android Device",
    "imei": "152122431796342",
    "extraction_time": "2026-03-09T16:34:37.691938"
  },
  "contacts": [
    {
      "contact_id": 0,
      "name": "User_0",
      "phone": "+9716409268040",
      "country": "UAE"
    }
  ],
  "whatsapp_messages": [
    {
      "msg_id": 141,
      "platform": "WhatsApp",
      "sender": "+9711724428580",
      "receiver": "+9711042096669",
      "text": "Photo evidence attached",
      "timestamp": "2025-01-01T04:13:27",
      "has_media": false
    }
  ],
  "media_files": [
    {
      "media_id": 200,
      "type": "audio",
      "file_name": "media_200.jpg",
      "related_message": 400,
      "timestamp": "2025-01-05T17:02:31"
    }
  ],
  "crypto_mentions": [
    {
      "wallet_address": "gjDxk49ik6Nkk8QVuWrf9GfXzmuveLgSY3",
      "mentioned_in_msg": 589
    }
  ]
}
```

### Field Mappings:
| UFDR Field | App Field | Usage |
|------------|-----------|-------|
| `whatsapp_messages.sender` | ChatRecord.from | Message sender |
| `whatsapp_messages.receiver` | ChatRecord.to | Message receiver |
| `whatsapp_messages.text` | ChatRecord.message | Message content |
| `whatsapp_messages.timestamp` | ChatRecord.timestamp | Message time |
| `whatsapp_messages.platform` | ChatRecord.platform | "WhatsApp" |
| `contacts.name` | ContactRecord.name | Contact name |
| `contacts.phone` | ContactRecord.phone | Phone number |
| `crypto_mentions.wallet_address` | Wallet node | Crypto address |

---

## 2. Current Suspicious Keywords

The app detects these keywords for flagging suspicious messages:

```typescript
SUSPICIOUS_KEYWORDS = [
  "bitcoin", "btc", "crypto", "wallet", "transfer", "cash", "wire",
  "hawala", "darknet", "tor", "vpn", "burner", "encrypt", "delete",
  "evidence", "hide", "fake", "passport", "weapon", "drug", "launder",
  "offshore", "shell company", "monero", "ethereum", "usdt", "tether",
]
```

### How It Works:
1. Each message is scanned for keyword matches
2. If found, the message is flagged as suspicious
3. The phrase containing the keyword appears in the "Flagged Messages" dashboard

---

## 3. Crypto Wallet Pattern Detection

The app detects cryptocurrency addresses using regex patterns:

```typescript
CRYPTO_WALLET_PATTERNS = [
  /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/,    // Bitcoin (P2PKH/P2SH)
  /\b0x[a-fA-F0-9]{40}\b/,                  // Ethereum (ERC-20)
  /\b[LM][a-km-zA-HJ-NP-Z1-9]{26,33}\b/,   // Litecoin
  /\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b/,   // Monero
]
```

### How Wallet Connections Work:
1. Messages are scanned for wallet patterns
2. When a wallet is found, a new **"Wallet"** node is created in the graph
3. A link connects the message sender → wallet
4. This shows financial activity relationships

---

## 4. How to Improve Keyword Detection

### Option A: Add More Keywords

Edit [src/lib/types.ts](src/lib/types.ts#L57) and expand the list:

```typescript
export const SUSPICIOUS_KEYWORDS = [
  // Existing keywords...
  
  // Add new categories:
  // Money Laundering
  "structuring", "smurfing", "placement", "integration", "placement",
  
  // Drugs
  "mdma", "cocaine", "heroin", "fentanyl", "meth", "lsd",
  
  // Weapons
  "ammunition", "explosive", "detonator", "gunpowder",
  
  // Terrorism Financing
  "isis", "al-qaeda", "terrorist", "extremist", "jihad",
  
  // Human Trafficking
  "trafficking", "prostitution", "exploitation", "forced labor",
  
  // Fraud
  "phishing", "ransomware", "malware", "botnet", "ddos",
  
  // Language Variations
  "hodl", "defi", "nft", "dao", "staking",
];
```

### Option B: Add Weighted Keywords (Severity-Based)

Modify the detection logic to support keyword severity:

```typescript
export const SUSPICIOUS_KEYWORDS_WEIGHTED = {
  high: [
    "bomb", "kill", "assassination", "terrorism", "extreme violence",
  ],
  medium: [
    "drug", "cocaine", "transfer", "wallet", "encrypt", "vpn",
  ],
  low: [
    "meeting", "discuss", "arrangement", "contact",
  ]
};
```

### Option C: Add Context-Aware Patterns

Detect suspicious phrases, not just individual words:

```typescript
export const SUSPICIOUS_PATTERNS = [
  // Pattern: Amount + crypto
  /(\d+)\s*(btc|eth|monero|wallet|ethereum|bitcoin)/i,
  
  // Pattern: Hide/Delete + evidence
  /(delete|remove|hide|destroy)\s+(evidence|message|photo)/i,
  
  // Pattern: Burner/Temporary phone
  /(burner|temp|temporary|disposable)\s+(phone|sim|number)/i,
  
  // Pattern: VPN/TOR usage
  /(vpn|tor|proxy|anonymou)\s+(required|activate|enable)/i,
  
  // Pattern: Wire transfer instructions
  /(wire|transfer|send)\s*(to|at|account)\s*\d+/i,
];
```

### Option D: Add Language-Specific Detection

Support multiple languages:

```typescript
export const SUSPICIOUS_KEYWORDS_MULTILINGUAL = {
  english: ["bitcoin", "drug", "weapon"],
  spanish: ["bitcoin", "droga", "arma"],
  arabic: ["بيتكوين", "مخدرات", "سلاح"],
  hindi: ["बिटकॉइन", "दवा", "हथियार"],
};
```

---

## 5. How to Add Custom Keyword Connection Logic

Edit [src/pages/NetworkGraphPage.tsx](src/pages/NetworkGraphPage.tsx) to add keyword nodes:

```typescript
// Scan messages for keywords and create nodes
data.chats.forEach(c => {
  SUSPICIOUS_KEYWORDS.forEach(keyword => {
    if (c.message.toLowerCase().includes(keyword)) {
      const keywordId = `keyword:${keyword}`;
      addNode(keywordId, keyword, "keyword");
      links.push({ 
        source: c.from, 
        target: keywordId, 
        label: "mentions" 
      });
    }
  });
});
```

---

## 6. Recommended Improvements for Your Dataset

Based on your `ufdr_full_dataset.json` with 2000+ messages, here are recommended enhancements:

### 1. **Add Time-Based Analysis**
- Detect spikes in messaging activity
- Flag unusual hours of communication (e.g., 3-5 AM)
- Track relationship timelines

### 2. **Add Network Clustering**
- Find groups of communicating contacts
- Identify "hubs" (people with many connections)
- Detect isolated networks

### 3. **Add Frequency Analysis**
- Count keyword occurrences per contact
- Track cryptocurrency addresses per user
- Monitor foreign number interactions

### 4. **Add Sentiment Analysis**
- Detect aggressive/threatening language
- Analyze emotional tone of messages
- Flag rapid mood changes

### 5. **Add GeoIP Analysis**
Your contacts have country data:
```typescript
// Group contacts by country
const contactsByCountry = contacts.groupBy(c => c.country);

// Detect suspicious international patterns
const highRiskCountries = ["North Korea", "Iran", "Syria"];
```

---

## 7. Quick Implementation Guide

To add a new keyword category to the app:

### Step 1: Update types.ts
```typescript
export const SUSPICIOUS_KEYWORDS = [
  // ... existing keywords ...
  // NEW: Add your keywords here
];
```

### Step 2: The app will automatically:
✅ Flag messages containing these keywords  
✅ Show them in "Flagged Messages" section  
✅ Count them in the dashboard  

### Step 3: Optional - Add to Network Graph
Edit NetworkGraphPage.tsx to create keyword nodes in the visualization.

---

## 8. Testing Your Changes

1. Add a new keyword to `SUSPICIOUS_KEYWORDS`
2. Reload the app
3. Upload your UFDR file again
4. Check the "Flagged Messages" section
5. Verify the keyword appears and is properly detected

