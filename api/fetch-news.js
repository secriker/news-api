// Serverless function to fetch news using OpenAI API
// Deploy this to Vercel to bypass CORS restrictions

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { categories, count } = req.body;

    // Get API key from environment variable (set in Vercel dashboard)
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      res.status(500).json({ error: 'API key not configured' });
      return;
    }

    const categoriesText = categories.join(', ');
    const prompt = `Search the web for the ${count} most trending and breaking news articles from TODAY across these categories: ${categoriesText}.

For each article, provide:
1. Topic/Category (one word: AI, Crypto, EV, Security, etc.)
2. Headline (compelling, under 100 chars)
3. Brief description (2-3 sentences, under 150 chars)
4. Source name (publication/website name)
5. URL to the article

Focus on major news from reputable sources like TechCrunch, CoinDesk, Wired, Bloomberg, etc.

Return ONLY a JSON array with this exact format:
[
  {
    "topic": "AI",
    "headline": "...",
    "description": "...",
    "source": "TechCrunch",
    "url": "https://..."
  }
]

Return ONLY the JSON array, no other text.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a news curator. You search for trending articles and return them in JSON format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Remove markdown code fences if present
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const articles = JSON.parse(jsonStr);

    res.status(200).json({ articles });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
