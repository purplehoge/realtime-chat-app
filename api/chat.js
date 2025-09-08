/**
 * HTTP APIベースのチャット機能
 * Vercel Edge Runtime対応の最小実装
 */

export default function handler(req, res) {
  try {
    console.log('[Chat API] Request received:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });

    // CORS設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    if (req.method === 'OPTIONS') {
      console.log('[Chat API] CORS preflight request handled');
      return res.status(200).end();
    }

    const method = req.method || 'GET';
    console.log('[Chat API] Processing method:', method);

    if (method === 'POST') {
      return handlePost(req, res);
    } else if (method === 'GET') {
      return handleGet(req, res);
    } else {
      console.log('[Chat API] Method not allowed:', method);
      return res.status(405).json({ error: 'Method not allowed', method });
    }
  } catch (error) {
    console.error('[Chat API] 致命的エラー:', error);
    console.error('[Chat API] Stack trace:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * POST: メッセージ送信・ユーザー参加
 */
function handlePost(req, res) {
  try {
    console.log('[Chat API] POST request body type:', typeof req.body);
    console.log('[Chat API] POST request body:', req.body);

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      console.log('[Chat API] Parsed body:', body);
    } catch (parseError) {
      console.error('[Chat API] JSON parse error:', parseError);
      return res.status(400).json({ 
        error: 'Invalid JSON', 
        details: 'Request body is not valid JSON'
      });
    }
    
    const { action, user, message } = body;
    console.log('[Chat API] Extracted action:', action, 'user:', user);

    if (!action) {
      console.error('[Chat API] Missing action in request');
      return res.status(400).json({ error: 'Missing action' });
    }

    switch (action) {
      case 'join':
        if (!user || typeof user !== 'string' || user.length > 20) {
          console.log(`[Chat API] 無効なユーザー名: ${user}`);
          return res.status(400).json({ error: 'Invalid user name' });
        }
        console.log(`[Chat API] ユーザー参加: ${user}`);
        return res.status(200).json({ 
          success: true, 
          users: [user],
          messages: []
        });

      case 'message':
        if (!user || !message || typeof message !== 'string' || message.length > 500) {
          console.log(`[Chat API] 無効なメッセージ: user=${user}, message=${message?.substring(0, 50)}`);
          return res.status(400).json({ error: 'Invalid message' });
        }
        
        const newMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          user,
          message,
          timestamp: Date.now()
        };
        
        console.log(`[Chat API] メッセージ受信: ${user} - ${message}`);
        return res.status(200).json({ success: true, message: newMessage });

      case 'leave':
        if (user) {
          console.log(`[Chat API] ユーザー退出: ${user}`);
        }
        return res.status(200).json({ success: true });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('[Chat API] POST エラー:', error);
    return res.status(500).json({ 
      error: 'POST request failed',
      details: error.message
    });
  }
}

/**
 * GET: メッセージ取得・ユーザー一覧取得
 */
function handleGet(req, res) {
  try {
    console.log('[Chat API] GET request query:', req.query);
    const query = req.query || {};
    const { action } = query;
    console.log('[Chat API] GET action:', action);

    switch (action) {
      case 'messages':
        console.log(`[Chat API] メッセージ取得リクエスト`);
        return res.status(200).json({
          messages: [],
          users: [],
          serverTime: Date.now()
        });

      case 'users':
        console.log(`[Chat API] ユーザー一覧取得`);
        return res.status(200).json({
          users: [],
          count: 0
        });

      default:
        console.log(`[Chat API] デフォルトデータ取得`);
        return res.status(200).json({
          messages: [],
          users: [],
          serverTime: Date.now()
        });
    }
  } catch (error) {
    console.error('[Chat API] GET エラー:', error);
    return res.status(500).json({ error: 'GET request failed' });
  }
}