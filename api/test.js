export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get memory usage
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };

  res.json({ 
    status: "API is working!",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      hasGeminiKey: !!process.env.VITE_GEMINI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      arch: process.arch
    },
    memory: memUsageMB,
    performance: {
      // These will be populated by the search API
      searchCount: global.searchCount || 0,
      avgSearchTime: global.avgSearchTime || 0,
      cacheSize: global.cacheSize || 0
    }
  });
} 