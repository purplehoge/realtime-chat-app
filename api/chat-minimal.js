// 最小限のchat API実装
export default function handler(req, res) {
  console.log('Chat API called:', req.method);
  
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'POST') {
    return res.status(200).json({ 
      success: true, 
      users: ['TestUser'],
      messages: [],
      action: 'join'
    });
  }
  
  if (req.method === 'GET') {
    return res.status(200).json({
      messages: [],
      users: [],
      serverTime: Date.now()
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}