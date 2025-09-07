import type { VercelRequest, VercelResponse } from '@vercel/node';

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
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-vercel-protection-bypass');
  
  // Vercel認証保護の無効化
  res.setHeader('x-vercel-protection-bypass', 'bypass-enabled');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, body, query } = req;

  try {
    switch (method) {
      case 'POST':
        return handlePost(req, res);
      case 'GET':
        return handleGet(req, res);
      default:
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
  } catch (error) {
    console.error('[Chat API] エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST: メッセージ送信・ユーザー参加
 */
function handlePost(req: VercelRequest, res: VercelResponse) {
  const { action, user, message } = req.body;

  switch (action) {
    case 'join':
      if (!user || typeof user !== 'string' || user.length > 20) {
        return res.status(400).json({ error: 'Invalid user name' });
      }
      users.add(user);
      console.log(`[Chat API] ユーザー参加: ${user}`);
      res.status(200).json({ 
        success: true, 
        users: Array.from(users),
        messages: messages.slice(-50) // 最新50件を返す
      });
      break;

    case 'message':
      if (!user || !message || typeof message !== 'string' || message.length > 500) {
        return res.status(400).json({ error: 'Invalid message' });
      }
      
      const newMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      res.status(200).json({ success: true, message: newMessage });
      break;

    case 'leave':
      if (user) {
        users.delete(user);
        console.log(`[Chat API] ユーザー退出: ${user}`);
      }
      res.status(200).json({ success: true });
      break;

    default:
      res.status(400).json({ error: 'Invalid action' });
  }
}

/**
 * GET: メッセージ取得・ユーザー一覧取得
 */
function handleGet(req: VercelRequest, res: VercelResponse) {
  const { action, since } = req.query;

  switch (action) {
    case 'messages':
      const sinceTimestamp = since ? parseInt(since as string) : 0;
      const filteredMessages = messages.filter(msg => msg.timestamp > sinceTimestamp);
      res.status(200).json({
        messages: filteredMessages,
        users: Array.from(users),
        serverTime: Date.now()
      });
      break;

    case 'users':
      res.status(200).json({
        users: Array.from(users),
        count: users.size
      });
      break;

    default:
      // デフォルト: 全データ取得
      res.status(200).json({
        messages: messages.slice(-20), // 最新20件
        users: Array.from(users),
        serverTime: Date.now()
      });
  }
}