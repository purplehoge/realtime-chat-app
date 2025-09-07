import { v4 as uuidv4 } from 'uuid';
import { Message, ValidationConstraints, ErrorCodes } from '../types/chat';

/**
 * メッセージストア管理クラス
 * メッセージの保存・取得・履歴管理を担当
 */
export class MessageStore {
  /** メッセージ履歴配列（時系列順） */
  private messages: Message[] = [];

  /** 最大メッセージ保持数 */
  private readonly MAX_MESSAGES = ValidationConstraints.MAX_MESSAGES;

  /**
   * メッセージを追加
   * @param userId 送信者のソケットID
   * @param nickname 送信者のニックネーム
   * @param message メッセージ内容
   * @returns Message 作成されたメッセージオブジェクト
   * @throws Error バリデーションエラー時
   */
  addMessage(userId: string, nickname: string, message: string): Message {
    // メッセージバリデーション
    this.validateMessage(message);

    // メッセージオブジェクト作成
    const messageObj: Message = {
      id: uuidv4(),
      userId,
      nickname: nickname.trim(),
      message: this.sanitizeMessage(message.trim()),
      timestamp: new Date()
    };

    // 配列に追加
    this.messages.push(messageObj);

    // 上限チェックと古いメッセージ削除
    if (this.messages.length > this.MAX_MESSAGES) {
      const removedCount = this.messages.length - this.MAX_MESSAGES;
      this.messages.splice(0, removedCount);
      
      // メモリ使用量をログに出力（開発時のみ）
      if (process.env.NODE_ENV === 'development') {
        console.log(`[MessageStore] 古いメッセージを${removedCount}件削除しました`);
      }
    }

    return messageObj;
  }

  /**
   * 最新メッセージ一覧を取得
   * @param limit 取得件数（デフォルト: 50件、最大: 全件）
   * @returns Message[] メッセージ配列（時系列順）
   */
  getRecentMessages(limit: number = 50): Message[] {
    // 制限値の調整
    const actualLimit = Math.min(Math.max(1, limit), this.messages.length);
    
    // 最新のメッセージを指定件数取得
    return this.messages.slice(-actualLimit);
  }

  /**
   * 特定ユーザーのメッセージを取得
   * @param userId 対象ユーザーのソケットID
   * @param limit 取得件数（デフォルト: 20件）
   * @returns Message[] 該当ユーザーのメッセージ配列
   */
  getUserMessages(userId: string, limit: number = 20): Message[] {
    return this.messages
      .filter(msg => msg.userId === userId)
      .slice(-limit);
  }

  /**
   * メッセージ総数を取得
   * @returns number 現在保存されているメッセージ数
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * 全メッセージを削除（管理・テスト用）
   */
  clearMessages(): void {
    this.messages = [];
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[MessageStore] 全メッセージを削除しました');
    }
  }

  /**
   * メッセージ検索（部分一致）
   * @param searchTerm 検索キーワード
   * @param limit 取得件数上限（デフォルト: 10件）
   * @returns Message[] 検索結果のメッセージ配列
   */
  searchMessages(searchTerm: string, limit: number = 10): Message[] {
    if (!searchTerm || typeof searchTerm !== 'string') {
      return [];
    }

    const term = searchTerm.toLowerCase().trim();
    if (term.length === 0) {
      return [];
    }

    return this.messages
      .filter(msg => 
        msg.message.toLowerCase().includes(term) ||
        msg.nickname.toLowerCase().includes(term)
      )
      .slice(-limit);
  }

  /**
   * 指定時間範囲のメッセージを取得
   * @param startTime 開始時刻
   * @param endTime 終了時刻
   * @returns Message[] 指定期間のメッセージ配列
   */
  getMessagesByTimeRange(startTime: Date, endTime: Date): Message[] {
    return this.messages.filter(msg =>
      msg.timestamp >= startTime && msg.timestamp <= endTime
    );
  }

  /**
   * メッセージ統計情報を取得
   * @returns object メッセージ統計データ
   */
  getStatistics(): {
    totalMessages: number;
    oldestMessage: Date | null;
    newestMessage: Date | null;
    averageMessageLength: number;
    userMessageCounts: Record<string, number>;
  } {
    if (this.messages.length === 0) {
      return {
        totalMessages: 0,
        oldestMessage: null,
        newestMessage: null,
        averageMessageLength: 0,
        userMessageCounts: {}
      };
    }

    // ユーザー別メッセージ数カウント
    const userCounts: Record<string, number> = {};
    let totalLength = 0;

    for (const msg of this.messages) {
      userCounts[msg.nickname] = (userCounts[msg.nickname] || 0) + 1;
      totalLength += msg.message.length;
    }

    return {
      totalMessages: this.messages.length,
      oldestMessage: this.messages[0].timestamp,
      newestMessage: this.messages[this.messages.length - 1].timestamp,
      averageMessageLength: Math.round(totalLength / this.messages.length),
      userMessageCounts: userCounts
    };
  }

  /**
   * メッセージのバリデーション
   * @param message バリデーション対象のメッセージ
   * @throws Error バリデーションエラー時
   */
  private validateMessage(message: string): void {
    // null・undefined・空文字チェック
    if (!message || typeof message !== 'string') {
      throw new Error(ErrorCodes.INVALID_MESSAGE);
    }

    const trimmed = message.trim();

    // 文字数チェック
    if (trimmed.length < ValidationConstraints.MESSAGE_MIN_LENGTH || 
        trimmed.length > ValidationConstraints.MESSAGE_MAX_LENGTH) {
      throw new Error(ErrorCodes.INVALID_MESSAGE);
    }

    // 制御文字チェック（改行・タブは許可）
    const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(message);
    if (hasInvalidChars) {
      throw new Error(ErrorCodes.INVALID_MESSAGE);
    }
  }

  /**
   * メッセージのサニタイズ（XSS対策）
   * @param message サニタイズ対象のメッセージ
   * @returns string サニタイズされたメッセージ
   */
  private sanitizeMessage(message: string): string {
    return message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * デバッグ用: 現在の状態を出力
   * @returns object 現在のメッセージストア状態
   */
  getDebugInfo(): object {
    const stats = this.getStatistics();
    
    return {
      messageCount: this.messages.length,
      maxMessages: this.MAX_MESSAGES,
      memoryUsage: process.memoryUsage(),
      statistics: stats,
      recentMessages: this.getRecentMessages(5)
    };
  }
}