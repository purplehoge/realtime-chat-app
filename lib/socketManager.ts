import { Server, Socket } from 'socket.io';
import { UserManager } from './userManager';
import { MessageStore } from './messageStore';
import { 
  JoinRoomEvent, 
  SendMessageEvent, 
  ErrorCodes, 
  ValidationConstraints 
} from '../types/chat';

/**
 * Socket.IO接続管理クラス
 * WebSocket接続の管理とイベントハンドリングを担当
 */
export class SocketManager {
  private io: Server;
  private userManager: UserManager;
  private messageStore: MessageStore;
  
  /** 送信頻度制限用マップ（ソケットID -> 最後の送信時刻配列） */
  private rateLimitMap: Map<string, number[]> = new Map();
  
  /** レート制限チェック間隔（ミリ秒） */
  private readonly RATE_LIMIT_WINDOW_MS = 1000; // 1秒
  
  /** サーバー統計情報 */
  private stats = {
    startTime: Date.now()
  };

  /**
   * Socket管理クラスのコンストラクタ
   * @param server HTTPサーバーインスタンス
   */
  constructor(server: any) {
    // Socket.IOサーバーの初期化
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'], // Vercelでのフォールバック対応
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.userManager = new UserManager();
    this.messageStore = new MessageStore();

    this.setupEventHandlers();
    
    console.log('[SocketManager] Socket.IOサーバーを初期化しました');
  }

  /**
   * イベントハンドラーの設定
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * クライアント接続時の処理
   * @param socket 新しく接続されたソケット
   */
  private handleConnection(socket: Socket): void {
    console.log(`[SocketManager] 新しいクライアントが接続: ${socket.id}`);

    // レート制限マップの初期化
    this.rateLimitMap.set(socket.id, []);

    // イベントリスナーの登録
    socket.on('join-room', (data: JoinRoomEvent['data']) => {
      this.handleJoinRoom(socket, data);
    });

    socket.on('send-message', (data: SendMessageEvent['data']) => {
      this.handleSendMessage(socket, data);
    });

    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });

    socket.on('error', (error: Error) => {
      console.error(`[SocketManager] ソケットエラー (${socket.id}):`, error);
    });
  }

  /**
   * チャットルーム参加処理
   * @param socket 参加を要求するソケット
   * @param data 参加データ（ニックネーム）
   */
  private handleJoinRoom(socket: Socket, data: JoinRoomEvent['data']): void {
    try {
      console.log(`[SocketManager] 参加要求: ${socket.id}, ニックネーム: ${data.nickname}`);

      // ユーザー追加
      const user = this.userManager.addUser(socket.id, data.nickname);

      // 参加成功をクライアントに通知
      socket.emit('join-success', {
        nickname: user.nickname,
        users: this.userManager.getAllNicknames(),
        messages: this.messageStore.getRecentMessages(50)
      });

      // 他の参加者に新規参加を通知
      socket.broadcast.emit('user-joined', {
        nickname: user.nickname,
        timestamp: user.joinedAt.toISOString()
      });

      // 参加者一覧更新を全員に送信
      this.io.emit('update-users', {
        users: this.userManager.getAllNicknames()
      });

      console.log(`[SocketManager] ユーザー参加完了: ${user.nickname} (${socket.id})`);

    } catch (error: any) {
      console.error(`[SocketManager] 参加エラー (${socket.id}):`, error.message);

      // エラーをクライアントに送信
      socket.emit('error', {
        code: error.message,
        message: this.getErrorMessage(error.message),
        details: null
      });
    }
  }

  /**
   * メッセージ送信処理
   * @param socket 送信者のソケット
   * @param data メッセージデータ
   */
  private handleSendMessage(socket: Socket, data: SendMessageEvent['data']): void {
    try {
      // 送信者の確認
      const user = this.userManager.getUser(socket.id);
      if (!user) {
        throw new Error(ErrorCodes.CONNECTION_ERROR);
      }

      // レート制限チェック
      if (!this.checkRateLimit(socket.id)) {
        throw new Error(ErrorCodes.RATE_LIMIT_EXCEEDED);
      }

      console.log(`[SocketManager] メッセージ受信: ${user.nickname} -> "${data.message}"`);

      // メッセージ保存
      const message = this.messageStore.addMessage(
        user.id,
        user.nickname,
        data.message
      );

      // 全クライアントにメッセージ配信
      this.io.emit('receive-message', message);

      console.log(`[SocketManager] メッセージ配信完了: ${message.id}`);

    } catch (error: any) {
      console.error(`[SocketManager] メッセージ送信エラー (${socket.id}):`, error.message);

      // エラーをクライアントに送信
      socket.emit('error', {
        code: error.message,
        message: this.getErrorMessage(error.message),
        details: null
      });
    }
  }

  /**
   * クライアント切断処理
   * @param socket 切断されるソケット
   */
  private handleDisconnect(socket: Socket): void {
    console.log(`[SocketManager] クライアント切断: ${socket.id}`);

    // ユーザー削除
    const user = this.userManager.removeUser(socket.id);
    
    if (user) {
      // 他の参加者に退出通知
      socket.broadcast.emit('user-left', {
        nickname: user.nickname,
        timestamp: new Date().toISOString()
      });

      // 参加者一覧更新を全員に送信
      this.io.emit('update-users', {
        users: this.userManager.getAllNicknames()
      });

      console.log(`[SocketManager] ユーザー退出完了: ${user.nickname}`);
    }

    // レート制限マップから削除
    this.rateLimitMap.delete(socket.id);
  }

  /**
   * 送信頻度制限チェック
   * @param socketId チェック対象のソケットID
   * @returns boolean 送信可能な場合true
   */
  private checkRateLimit(socketId: string): boolean {
    const now = Date.now();
    const timestamps = this.rateLimitMap.get(socketId) || [];

    // 古いタイムスタンプを削除（1秒以内のみ保持）
    const recentTimestamps = timestamps.filter(
      timestamp => now - timestamp < this.RATE_LIMIT_WINDOW_MS
    );

    // レート制限チェック
    if (recentTimestamps.length >= ValidationConstraints.RATE_LIMIT_PER_SECOND) {
      return false; // 制限に達している
    }

    // 新しいタイムスタンプを追加
    recentTimestamps.push(now);
    this.rateLimitMap.set(socketId, recentTimestamps);

    return true;
  }

  /**
   * エラーコードに対応するユーザー向けメッセージを取得
   * @param errorCode エラーコード
   * @returns string ユーザー向けエラーメッセージ
   */
  private getErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      [ErrorCodes.NICKNAME_TAKEN]: 'このニックネームは既に使用されています',
      [ErrorCodes.INVALID_NICKNAME]: 'ニックネームは1-20文字で入力してください',
      [ErrorCodes.ROOM_FULL]: 'チャットルームが満員です。しばらく時間をおいて再度お試しください',
      [ErrorCodes.INVALID_MESSAGE]: 'メッセージは1-500文字で入力してください',
      [ErrorCodes.RATE_LIMIT_EXCEEDED]: '送信頻度が高すぎます。少し時間をおいてから送信してください',
      [ErrorCodes.SERVER_ERROR]: 'サーバーエラーが発生しました',
      [ErrorCodes.CONNECTION_ERROR]: '接続エラーが発生しました。再度接続してください'
    };

    return errorMessages[errorCode] || '不明なエラーが発生しました';
  }

  /**
   * 現在の接続状況を取得（管理・デバッグ用）
   * @returns object 接続状況データ
   */
  public getConnectionInfo(): object {
    return {
      connectedSockets: this.io.engine.clientsCount,
      activeUsers: this.userManager.getUserCount(),
      totalMessages: this.messageStore.getMessageCount(),
      rateLimitEntries: this.rateLimitMap.size,
      serverInfo: {
        connected: true,
        version: '4.7.4',
        uptime: Date.now() - this.stats.startTime
      }
    };
  }

  /**
   * Socket.IOサーバーインスタンスを取得
   * @returns Server Socket.IOサーバーインスタンス
   */
  public getIO(): Server {
    return this.io;
  }

  /**
   * サーバー停止処理
   */
  public close(): void {
    console.log('[SocketManager] サーバーを停止中...');
    
    // 全クライアントに切断通知
    this.io.emit('server-shutdown', {
      message: 'サーバーがメンテナンスのため停止します'
    });

    // Socket.IOサーバーを停止
    this.io.close();

    // リソースクリーンアップ
    this.userManager.clearAllUsers();
    this.messageStore.clearMessages();
    this.rateLimitMap.clear();

    console.log('[SocketManager] サーバー停止完了');
  }
}