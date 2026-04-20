export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, history = [], caseContext = {} } = req.body;

    // Anonymize case context (strip phone numbers and emails)
    let contextStr = JSON.stringify(caseContext);
    
    // Replace emails
    contextStr = contextStr.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL-REDACTED]');
    // Replace phone numbers (simple heuristics for +, hyphen, digits over 9 chars)
    contextStr = contextStr.replace(/\+?[0-9][0-9\- ]{8,}[0-9]/g, '[PHONE-REDACTED]');

    const systemPrompt = `You are Forensix AI, a professional forensic investigation assistant for law enforcement. Analyse the provided case data and answer the officer's question. Be concise and professional. Reference specific patterns from the data.\n\nCase Data: ${contextStr}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: question }
    ];

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: messages,
        stream: true,
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      return res.status(groqResponse.status).json({ error: errorText });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Read stream from Groq and pass it down
    // Use Web Streams API (fetch body is a ReadableStream)
    const reader = groqResponse.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        break;
      }
      res.write(value);
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
