export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.json({ 
    message: "API is working!",
    timestamp: new Date().toISOString(),
    env: {
      hasGeminiKey: !!process.env.VITE_GEMINI_API_KEY,
      nodeEnv: process.env.NODE_ENV
    }
  });
} 