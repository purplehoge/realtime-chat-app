import { Server } from 'socket.io';
import { createServer } from 'http';
import { SocketManager } from '../lib/socketManager';

/**
 * Vercel Serverless Function用Socket.IOハンドラー
 * リアルタイムチャット機能のメインエンドポイント
 */

// グローバルなSocket.IOサーバーインスタンス（接続の永続化）
let io: Server | undefined;
let socketManager: SocketManager | undefined;

/**
 * Vercel Function のメインハンドラー
 * @param req HTTPリクエスト
 * @param res HTTPレスポンス
 */
export default function handler(req: any, res: any): void {
  try {
    // Socket.IOサーバーが未初期化の場合は作成
    if (!io || !socketManager) {
      console.log('[Socket Handler] Socket.IOサーバーを初期化中...');
      
      // HTTPサーバーの作成（Vercel環境用）
      const httpServer = createServer();
      
      // SocketManagerインスタンス作成（内部でSocket.IOサーバーも初期化）
      socketManager = new SocketManager(httpServer);
      io = socketManager.getIO();
      
      console.log('[Socket Handler] Socket.IOサーバー初期化完了');
    }

    // Socket.IOエンジンでリクエストを処理
    if (req.method === 'GET') {
      // Socket.IO接続確立用（ハンドシェイク）
      handleSocketIORequest(req, res);
    } else if (req.method === 'POST') {
      // Socket.IOメッセージング用
      handleSocketIORequest(req, res);
    } else if (req.method === 'OPTIONS') {
      // CORSプリフライトリクエスト対応
      handleCORS(res);
    } else {
      // サポートされていないHTTPメソッド
      res.status(405).json({ 
        error: 'Method not allowed',
        supportedMethods: ['GET', 'POST', 'OPTIONS']
      });
    }

  } catch (error) {
    console.error('[Socket Handler] エラーが発生しました:', error);
    
    // エラーレスポンス
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'サーバーエラーが発生しました'
    });
  }
}

/**
 * Socket.IOリクエストの処理
 * @param req HTTPリクエスト
 * @param res HTTPレスポンス
 */
function handleSocketIORequest(req: any, res: any): void {
  if (!io) {
    res.status(500).json({ error: 'Socket.IO server not initialized' });
    return;
  }

  try {
    // Socket.IOエンジンにリクエストを委譲
    (io.engine as any).handleRequest(req, res);
  } catch (error) {
    console.error('[Socket Handler] Socket.IO処理エラー:', error);
    res.status(500).json({ error: 'Socket.IO processing error' });
  }
}

/**
 * CORSプリフライトリクエストの処理
 * @param res HTTPレスポンス
 */
function handleCORS(res: any): void {
  // CORSヘッダー設定
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24時間キャッシュ
  
  res.status(200).end();
}

/**
 * サーバー情報取得用エンドポイント（デバッグ・監視用）
 * GET /api/socket?info=true でアクセス可能
 */
export function getServerInfo(): object {
  if (!socketManager) {
    return {
      status: 'Socket.IO server not initialized',
      timestamp: new Date().toISOString()
    };
  }

  return {
    status: 'running',
    timestamp: new Date().toISOString(),
    connectionInfo: socketManager.getConnectionInfo(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      corsOrigin: process.env.CORS_ORIGIN || '*',
      platform: 'vercel',
      nodeVersion: process.version
    },
    memoryUsage: process.memoryUsage()
  };
}

/**
 * サーバーヘルスチェック用関数
 * @returns boolean サーバーが正常動作中の場合true
 */
export function healthCheck(): boolean {
  try {
    return !!(io && socketManager);
  } catch (error) {
    console.error('[Socket Handler] ヘルスチェックエラー:', error);
    return false;
  }
}

/**
 * グレースフルシャットダウン処理
 * Vercelのタイムアウト前にクリーンアップを実行
 */
process.on('SIGTERM', () => {
  console.log('[Socket Handler] SIGTERM受信 - グレースフルシャットダウン開始');
  
  if (socketManager) {
    socketManager.close();
  }
  
  console.log('[Socket Handler] グレースフルシャットダウン完了');
  process.exit(0);
});

/**
 * 未処理例外のハンドリング
 */
process.on('uncaughtException', (error) => {
  console.error('[Socket Handler] 未処理例外:', error);
  
  // エラーログ出力後、プロセス継続（Vercel環境での安定性向上）
  if (process.env.NODE_ENV === 'production') {
    console.log('[Socket Handler] 本番環境 - プロセス継続');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Socket Handler] 未処理Promise拒否:', reason, 'at Promise:', promise);
  
  // 本番環境ではログのみ出力、開発環境では詳細表示
  if (process.env.NODE_ENV === 'development') {
    console.trace('詳細スタックトレース');
  }
});

/**
 * 開発環境用の追加情報出力
 */
if (process.env.NODE_ENV === 'development') {
  console.log('[Socket Handler] 開発モード - 追加ログ有効');
  console.log('[Socket Handler] 環境変数:', {
    NODE_ENV: process.env.NODE_ENV,
    CORS_ORIGIN: process.env.CORS_ORIGIN
  });
}