// Vercel型定義
interface VercelRequest {
  method?: string;
  body?: any;
  query?: any;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => VercelResponse;
  end: () => void;
  setHeader: (key: string, value: string) => void;
}

// メモリ内メッセージストア（本番では外部DB使用推奨）
let messages: Array<{
  id: string;
  user: string;
  message: string;
  timestamp: number;
}> = [];

let users: Set<string> = new Set();

/**
 * HTTP APIベースのチャット機能
 * Socket.IOの代替実装
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
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
    console.error('[Chat API] Stack trace:', error instanceof Error ? error.stack : 'No stack');
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * POST: メッセージ送信・ユーザー参加
 */
function handlePost(req: VercelRequest, res: VercelResponse) {
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
        details: 'Request body is not valid JSON',
        received: typeof req.body === 'string' ? req.body.substring(0, 200) : req.body
      });
    }
    
    const { action, user, message } = body;
    console.log('[Chat API] Extracted action:', action, 'user:', user);

    if (!action) {
      console.error('[Chat API] Missing action in request');
      return res.status(400).json({ error: 'Missing action', body });
    }

  switch (action) {
    case 'join':
      if (!user || typeof user !== 'string' || user.length > 20) {
        return res.status(400).json({ error: 'Invalid user name' });
      }
      users.add(user);
      console.log(`[Chat API] ユーザー参加: ${user}`);
      return res.status(200).json({ 
        success: true, 
        users: Array.from(users),
        messages: messages.slice(-50) // 最新50件を返す
      });

    case 'message':
      if (!user || !message || typeof message !== 'string' || message.length > 500) {
        return res.status(400).json({ error: 'Invalid message' });
      }
      
      // ユーザーが参加しているかチェック
      if (!users.has(user)) {
        return res.status(400).json({ error: 'User not joined' });
      }
      
      const newMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        user,
        message,
        timestamp: Date.now()
      };
      
      messages.push(newMessage);
      // メッセージ数制限（最新100件まで保持）
      if (messages.length > 100) {
        messages = messages.slice(-100);
      }
      
      console.log(`[Chat API] メッセージ受信: ${user} - ${message}`);
      return res.status(200).json({ success: true, message: newMessage });

    case 'leave':
      if (user) {
        users.delete(user);
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
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET: メッセージ取得・ユーザー一覧取得
 */
function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('[Chat API] GET request query:', req.query);
    const query = req.query || {};
    const { action, since } = query;
    console.log('[Chat API] GET action:', action, 'since:', since);

  switch (action) {
    case 'messages':
      const sinceTimestamp = since ? parseInt(since as string) : 0;
      const filteredMessages = messages.filter(msg => msg.timestamp > sinceTimestamp);
      return res.status(200).json({
        messages: filteredMessages,
        users: Array.from(users),
        serverTime: Date.now()
      });

    case 'users':
      return res.status(200).json({
        users: Array.from(users),
        count: users.size
      });

    default:
      // デフォルト: 全データ取得
      return res.status(200).json({
        messages: messages.slice(-20), // 最新20件
        users: Array.from(users),
        serverTime: Date.now()
      });
  }
  } catch (error) {
    console.error('[Chat API] GET エラー:', error);
    return res.status(500).json({ error: 'GET request failed' });
  }
}