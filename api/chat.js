module.exports = (req, res) => {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'POST') {
    const { action, user, message } = req.body || {};
    
    if (action === 'join' && user) {
      return res.json({ 
        success: true, 
        users: [user],
        messages: []
      });
    }
    
    if (action === 'message' && user && message) {
      return res.json({ 
        success: true, 
        message: {
          id: Date.now(),
          user,
          message,
          timestamp: Date.now()
        }
      });
    }
    
    return res.status(400).json({ error: 'Invalid request' });
  }
  
  if (req.method === 'GET') {
    return res.json({
      messages: [],
      users: [],
      serverTime: Date.now()
    });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};