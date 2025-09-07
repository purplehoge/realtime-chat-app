/**
 * ローカル開発用サーバー
 * Vercel CLIの代替としてExpressサーバーでSocket.IOを動作させる
 */

const express = require('express');
const http = require('http');
const path = require('path');

// TypeScriptファイルを動的にコンパイル・実行
require('ts-node/register');

// SocketManagerをインポート
const { SocketManager } = require('./lib/socketManager');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// 静的ファイルの配信設定
app.use(express.static(path.join(__dirname, 'public')));

// JSONパーサー設定
app.use(express.json());

// Socket.IOの初期化
console.log('[Server] Socket.IO初期化中...');
const socketManager = new SocketManager(server);

// ルート設定
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API情報エンドポイント
app.get('/api/info', (req, res) => {
  try {
    const connectionInfo = socketManager.getConnectionInfo();
    res.json({
      status: 'running',
      environment: 'development',
      timestamp: new Date().toISOString(),
      ...connectionInfo
    });
  } catch (error) {
    console.error('[Server] API情報取得エラー:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// エラーハンドラー
app.use((error, req, res, next) => {
  console.error('[Server] エラー:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'サーバーエラーが発生しました'
  });
});

// サーバー開始
server.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 リアルタイムチャットサーバー起動');
  console.log('=================================');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌐 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ 起動時刻: ${new Date().toLocaleString('ja-JP')}`);
  console.log('=================================');
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM受信 - サーバー停止中...');
  
  socketManager.close();
  
  server.close(() => {
    console.log('[Server] サーバー停止完了');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT受信 - サーバー停止中...');
  
  socketManager.close();
  
  server.close(() => {
    console.log('[Server] サーバー停止完了');
    process.exit(0);
  });
});

// 未処理例外のハンドリング
process.on('uncaughtException', (error) => {
  console.error('[Server] 未処理例外:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] 未処理Promise拒否:', reason);
  console.error('[Server] Promise:', promise);
  process.exit(1);
});

module.exports = { app, server, socketManager };