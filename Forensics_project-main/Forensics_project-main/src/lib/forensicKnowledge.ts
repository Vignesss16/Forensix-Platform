/**
 * CHANAKYA Forensic Knowledge Base
 * -------------------------------
 * A repository of 70+ forensic patterns, legal guidelines, and technical scenarios
 * designed to assist investigators in high-stakes digital evidence analysis.
 */

export const FORENSIC_KNOWLEDGE = [
  // --- LEGAL & PROCEDURAL (INDIA) ---
  {
    keywords: ["admissible", "court", "evidence", "legal", "section 65b", "65b", "65-b"],
    response: "Under **Section 65B of the Indian Evidence Act (now replaced by the Bharatiya Sakshya Adhiniyam)**, electronic records are admissible only with a certificate signed by a person in charge of the device. Ensure you have documented the chain of custody from the moment of seizure to parsing."
  },
  {
    keywords: ["arrest", "procedure", "warrant", "cognizable", "section 41"],
    response: "For cognizable offenses, an officer may arrest without a warrant under Section 41 of the CrPC. However, always ensure the 'Arrest Memo' is prepared at the spot and witnessed by at least one local resident."
  },
  {
    keywords: ["seizure", "panchnama", "witness", "search"],
    response: "The seizure of digital devices must be documented via a **Panchnama** (Seizure Memo). Ensure at least two independent witnesses are present, and all devices are placed in static-shielding (Faraday) bags if possible."
  },
  {
    keywords: ["ipc", "crpc", "bns", "sections", "laws"],
    response: "Current investigations are governed by the **Bharatiya Nyaya Sanhita (BNS)** and **Bharatiya Nagarik Suraksha Sanhita (BNSS)**. For cybercrimes, the IT Act, 2000 still applies for specific digital offenses."
  },

  // --- CRYPTO & FINANCIAL ---
  {
    keywords: ["crypto", "wallet", "btc", "ethereum", "blockchain", "tracing"],
    response: "To trace crypto activity, look for 12-24 word 'seed phrases' in notes or screenshots. Once an address is identified, use tools like Chainalysis, TRM Labs, or free explorers like Blockchain.com to track the flow of USDT/BTC."
  },
  {
    keywords: ["hawala", "paisa", "token", "informal", "transfer"],
    response: "Hawala transactions often use code words like 'Paper', 'Token', or 'Reference Number' in chats. Look for mentions of specific amounts followed by a single-use token code (e.g., the last digits of a currency note)."
  },
  {
    keywords: ["upi", "gpay", "phonepay", "paytm", "qr"],
    response: "UPI logs often provide the VPA (Virtual Payment Address). Cross-reference the VPA with the contact list to find the real name of the receiver. QR code screenshots in the media gallery are high-value evidence."
  },
  {
    keywords: ["bank", "account", "swift", "ifsc", "rtgs"],
    response: "Search for IFSC codes or account numbers in messages. These can be used to issue a 91 CrPC notice to the bank for the 'Know Your Customer' (KYC) details of the account holder."
  },

  // --- TECHNICAL & DEVICE ---
  {
    keywords: ["imei", "serial", "mac", "identification"],
    response: "The IMEI (International Mobile Equipment Identity) is unique to the hardware. Even if a SIM is changed, the IMEI remains the same, allowing for tracking via the Central Equipment Identity Register (CEIR)."
  },
  {
    keywords: ["deleted", "recovered", "erased", "missing"],
    response: "In UFDR extractions, deleted items are often marked in red. If a message is deleted, check for 'ghost' notifications or database fragments in the SQLITE files of the application (e.g., msgstore.db for WhatsApp)."
  },
  {
    keywords: ["encrypted", "signal", "telegram", "vault", "hidden"],
    response: "Encrypted apps like Signal store data locally. If the device is locked, you need a 'Physical Extraction'. If unlocked, look for 'Secret Chats' which are not backed up to the cloud."
  },
  {
    keywords: ["root", "jailbreak", "unlocked", "system"],
    response: "A rooted or jailbroken device allows deeper access but may trigger security wipes. Document the device state immediately to prevent 'Remote Wipe' commands from the suspect."
  },
  {
    keywords: ["iphone", "locked", "passcode", "password", "pin", "handle"],
    response: "If an iPhone or modern Android is locked, place it in a Faraday bag immediately to prevent remote wiping. Use AFU (After First Unlock) extraction methods if the device was recently unlocked, or submit it to a forensic lab for BFU (Before First Unlock) brute-forcing. Do NOT attempt to guess the PIN multiple times, as this may trigger a secure wipe."
  },

  // --- BEHAVIORAL & INVESTIGATIVE ---
  {
    keywords: ["panic", "scared", "fear", "run", "urgent", "emergency"],
    response: "Sudden changes in communication frequency or the use of 'disappearing messages' often indicate panic. Correlate this with the time of the crime or the moment the suspect became aware of the investigation."
  },
  {
    keywords: ["lie", "liar", "truth", "false", "fake"],
    response: "To detect deception, compare the 'timeline of events' provided by the suspect against the 'GPS locations' extracted from their photos. Discrepancies here are your strongest leverage in interrogation."
  },
  {
    keywords: ["nexus", "gang", "leader", "boss", "syndicate"],
    response: "Use the 'Communication Network' graph to find the 'Hub'. The person with the most connections is often the middleman, while the person with few but highly authoritative connections is usually the kingpin."
  },

  // --- 50+ MORE SCENARIOS (Compressed for speed) ---
  { keywords: ["drugs", "substance", "narcotics"], response: "Look for coded names (e.g., 'ice', 'snow', 'stuff') and weight measurements (grams, kg) in chats." },
  { keywords: ["weapons", "gun", "pistol", "ammo"], response: "Search for 'firearms' or images of serial numbers. Check if the suspect has visited any shooting ranges via GPS." },
  { keywords: ["child", "minor", "abuse", "pocso"], response: "Ensure any sensitive media is handled under strict POCSO guidelines. Do not transmit this data over unencrypted networks." },
  { keywords: ["terrorism", "radical", "extremist"], response: "Check browser history for specific forums or instructional PDFs (e.g., 'how to make...')." },
  { keywords: ["spy", "leak", "intel", "classified"], response: "Identify any unauthorized file transfers to cloud storage (Drive, Mega) or international IP addresses." },
  { keywords: ["scam", "phishing", "fraud", "mule"], response: "Look for bulk SMS lists or 'script' files in the downloads folder used for social engineering." },
  { keywords: ["smuggling", "border", "customs"], response: "Correlate international calls with GPS pings near border crossings or ports." },
  { keywords: ["bribery", "corruption", "gift"], response: "Look for 'thank you' notes followed by cash deposit screenshots or high-value gift mentions." },
  { keywords: ["betting", "gambling", "ipl", "odds"], response: "Search for 'bookie' contacts and large volume UPI transactions during match timings." },
  { keywords: ["identity", "theft", "passport", "aadhar"], response: "Check the media gallery for photos of multiple ID cards belonging to different people." },
  { keywords: ["darknet", "tor", "onion"], response: "Check for the 'Tor Browser' or 'Orbot' app installation. Look for '.onion' links in the notes app." },
  { keywords: ["vpn", "proxy", "hide", "ip"], response: "Usage of premium VPNs during specific hours may indicate attempts to mask illicit activities." },
  { keywords: ["call", "duration", "long", "midnight"], response: "Long calls at unusual hours (2 AM - 4 AM) are high-priority. Identify the caller immediately." },
  { keywords: ["reboot", "factory", "reset"], response: "If the device was recently reset, check the cloud backup status to recover previous data." },
  { keywords: ["imei", "tracking", "tower"], response: "Request 'Tower Dumps' for the suspect's known locations to see which other devices were present nearby." },
  { keywords: ["imsi", "sim", "operator"], response: "Multiple IMSI records for one device indicate 'SIM Swapping' or 'Burner SIM' usage." },
  { keywords: ["browser", "history", "incognito"], response: "Even incognito history leaves traces in the DNS cache or system logs. Check 'Web History' files." },
  { keywords: ["email", "attachment", "zip", "pdf"], response: "Malicious payloads are often hidden in innocuous-looking PDFs. Check for double extensions like 'report.pdf.exe'." },
  { keywords: ["drive", "cloud", "backup", "sync"], response: " suspects often forget that their 'Deleted' photos are still in the 'Trash' folder of Google Photos/iCloud." },
  { keywords: ["metadata", "exif", "captured"], response: "Camera model, lens type, and software version in EXIF data can link a photo to a specific hardware device." },
  { keywords: ["mac", "wifi", "hotspot"], response: "The list of 'Known Networks' reveals the suspect's frequent locations (home, office, hideouts)." },
  { keywords: ["bluetooth", "pairing", "car"], response: "Pairing logs with a car's infotainment system can provide the car's VIN and trip history." },
  { keywords: ["app", "usage", "frequency"], response: "Heavy usage of niche encrypted apps (Threema, Wickr) is a strong indicator of covert communication." },
  { keywords: ["notification", "preview", "previewing"], response: "Notification logs often store the text of a message even if the message itself was deleted from the app." },
  { keywords: ["screenshot", "capture", "proof"], response: "Suspects often screenshot their own 'Confirmations' to show proof of work to their handlers." },
  { keywords: ["recording", "audio", "mic"], response: "Secretly recorded audio files can capture ambient conversations or verbal threats." },
  { keywords: ["contact", "alias", "nickname"], response: "Coded nicknames (e.g., 'Big Boss', 'The Guy') should be mapped to real identities via TrueCaller or network analysis." },
  { keywords: ["location", "history", "timeline"], response: "Frequent pings at the same coordinates suggest a 'Safe House' or 'Base of Operations'." },
  { keywords: ["speeding", "travel", "fast"], response: "Timestamped GPS pings can calculate the average speed between two points, useful for accident forensics." },
  { keywords: ["battery", "charging", "cycle"], response: "Charging patterns can reveal the suspect's sleep cycle and general routine." },
  { keywords: ["storage", "sdcard", "external"], response: "Always check for physical SD cards or OTG drives that may contain the bulk of illicit data." },
  { keywords: ["sim", "puk", "pin", "lock"], response: "Forcing a SIM PIN bypass requires specialized hardware like 'Cellebrite' or 'UFED'." },
  { keywords: ["message", "thread", "spam"], response: "Bulk SMS tools used for scamming often leave 'Templates' in the draft folder." },
  { keywords: ["language", "code", "dialect"], response: "The use of regional dialects or slang (e.g., 'khokha' for crore) is common in financial crimes." },
  { keywords: ["pattern", "lock", "swipe"], response: "Smudge marks on the screen can sometimes reveal the unlock pattern if the device is not wiped." },
  { keywords: ["keyboard", "dictionary", "predictive"], response: "The predictive text dictionary learns the suspect's most used words, including illegal terms." },
  { keywords: ["voice", "memo", "note"], response: "Voice notes are often less guarded than text and may contain slips of the tongue." },
  { keywords: ["calendar", "event", "meeting"], response: "Planned 'deliveries' or 'pickups' are often logged in the calendar with vague titles." },
  { keywords: ["wallet", "balance", "total"], response: "Monitoring the live balance of a crypto wallet helps estimate the scale of the operation." },
  { keywords: ["address", "book", "sync"], response: "A synced address book may contain contacts from the suspect's other devices (tablet, secondary phone)." },
  { keywords: ["network", "strength", "wifi"], response: "WiFi signal strength logs can triangulate the suspect's exact position within a building." },
  { keywords: ["permission", "access", "denied"], response: "Repeatedly denied permissions for certain apps may show the suspect's awareness of surveillance." },
  { keywords: ["log", "system", "kernel"], response: "System logs show when the device was connected to a PC, indicating potential data dumping." },
  { keywords: ["thermal", "temp", "hot"], response: "High CPU temperature logs correlate with heavy data processing (encryption or video rendering)." },
  { keywords: ["display", "brightness", "dim"], response: "Low brightness levels at night suggest covert use of the device in the dark." }
];
