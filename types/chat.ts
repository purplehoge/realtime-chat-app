/**
 * チャットアプリケーションの共通型定義
 */

/**
 * ユーザー情報
 */
export interface User {
  /** ソケットID（一意識別子） */
  id: string;
  /** 表示用ニックネーム */
  nickname: string;
  /** 参加日時 */
  joinedAt: Date;
}

/**
 * メッセージ情報
 */
export interface Message {
  /** メッセージID（UUID） */
  id: string;
  /** 送信者のソケットID */
  userId: string;
  /** 送信者のニックネーム */
  nickname: string;
  /** メッセージ内容 */
  message: string;
  /** 送信日時 */
  timestamp: Date;
}

/**
 * チャットルームの状態
 */
export interface ChatRoom {
  /** アクティブなユーザー一覧（キー: ソケットID） */
  users: Map<string, User>;
  /** メッセージ履歴 */
  messages: Message[];
  /** 最大参加者数 */
  maxUsers: number;
  /** 最大メッセージ保持数 */
  maxMessages: number;
}

/**
 * WebSocketイベントの基底インタフェース
 */
export interface BaseSocketEvent {
  /** イベント名 */
  event: string;
  /** イベントデータ */
  data: any;
}

/**
 * クライアント → サーバー イベント
 */

/** チャットルーム参加イベント */
export interface JoinRoomEvent extends BaseSocketEvent {
  event: 'join-room';
  data: {
    nickname: string;
  };
}

/** メッセージ送信イベント */
export interface SendMessageEvent extends BaseSocketEvent {
  event: 'send-message';
  data: {
    message: string;
  };
}

/**
 * サーバー → クライアント イベント
 */

/** 参加成功イベント */
export interface JoinSuccessEvent extends BaseSocketEvent {
  event: 'join-success';
  data: {
    nickname: string;
    users: string[];
    messages: Message[];
  };
}

/** ユーザー参加通知イベント */
export interface UserJoinedEvent extends BaseSocketEvent {
  event: 'user-joined';
  data: {
    nickname: string;
    timestamp: string;
  };
}

/** ユーザー退出通知イベント */
export interface UserLeftEvent extends BaseSocketEvent {
  event: 'user-left';
  data: {
    nickname: string;
    timestamp: string;
  };
}

/** メッセージ受信イベント */
export interface ReceiveMessageEvent extends BaseSocketEvent {
  event: 'receive-message';
  data: Message;
}

/** 参加者一覧更新イベント */
export interface UpdateUsersEvent extends BaseSocketEvent {
  event: 'update-users';
  data: {
    users: string[];
  };
}

/** エラーイベント */
export interface ErrorEvent extends BaseSocketEvent {
  event: 'error';
  data: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * エラーコード定数
 */
export const ErrorCodes = {
  /** ニックネーム重複 */
  NICKNAME_TAKEN: 'nickname-taken',
  /** 不正なニックネーム */
  INVALID_NICKNAME: 'invalid-nickname',
  /** チャットルーム満員 */
  ROOM_FULL: 'room-full',
  /** 不正なメッセージ */
  INVALID_MESSAGE: 'invalid-message',
  /** 送信頻度制限 */
  RATE_LIMIT_EXCEEDED: 'rate-limit-exceeded',
  /** サーバーエラー */
  SERVER_ERROR: 'server-error',
  /** 接続エラー */
  CONNECTION_ERROR: 'connection-error'
} as const;

/**
 * バリデーション制約値
 */
export const ValidationConstraints = {
  /** ニックネームの最小文字数 */
  NICKNAME_MIN_LENGTH: 1,
  /** ニックネームの最大文字数 */
  NICKNAME_MAX_LENGTH: 20,
  /** メッセージの最小文字数 */
  MESSAGE_MIN_LENGTH: 1,
  /** メッセージの最大文字数 */
  MESSAGE_MAX_LENGTH: 500,
  /** 最大参加者数 */
  MAX_USERS: 50,
  /** 最大メッセージ保持数 */
  MAX_MESSAGES: 100,
  /** 送信頻度制限（秒あたりのメッセージ数） */
  RATE_LIMIT_PER_SECOND: 3
} as const;

/**
 * ユニオン型定義
 */

/** クライアント送信イベントのユニオン型 */
export type ClientToServerEvents = JoinRoomEvent | SendMessageEvent;

/** サーバー送信イベントのユニオン型 */
export type ServerToClientEvents = 
  | JoinSuccessEvent 
  | UserJoinedEvent 
  | UserLeftEvent 
  | ReceiveMessageEvent 
  | UpdateUsersEvent 
  | ErrorEvent;

/** 全イベントのユニオン型 */
export type AllSocketEvents = ClientToServerEvents | ServerToClientEvents;

/**
 * 設定値インタフェース
 */
export interface AppConfig {
  /** サーバーポート番号 */
  port: number;
  /** 実行環境 */
  nodeEnv: 'development' | 'production';
  /** 最大参加者数 */
  maxUsers: number;
  /** 最大メッセージ保持数 */
  maxMessages: number;
  /** メッセージ最大文字数 */
  maxMessageLength: number;
  /** 送信頻度制限 */
  rateLimitPerSecond: number;
  /** CORS設定 */
  corsOrigin: string;
  /** レート制限有効化フラグ */
  enableRateLimit: boolean;
}