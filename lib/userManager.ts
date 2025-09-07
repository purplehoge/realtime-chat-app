import { User, ValidationConstraints, ErrorCodes } from '../types/chat';

/**
 * ユーザー管理クラス
 * アクティブなユーザーの追加・削除・検索を担当
 */
export class UserManager {
  /** アクティブユーザー一覧（キー: ソケットID、値: ユーザー情報） */
  private users: Map<string, User> = new Map();

  /**
   * ユーザーを追加
   * @param socketId ソケットID（一意識別子）
   * @param nickname ユーザーのニックネーム
   * @returns User 作成されたユーザーオブジェクト
   * @throws Error ニックネーム重複時、バリデーションエラー時
   */
  addUser(socketId: string, nickname: string): User {
    // バリデーション: ニックネーム形式チェック
    this.validateNickname(nickname);

    // 重複チェック
    if (this.isNicknameExists(nickname)) {
      throw new Error(ErrorCodes.NICKNAME_TAKEN);
    }

    // 参加者数上限チェック
    if (this.users.size >= ValidationConstraints.MAX_USERS) {
      throw new Error(ErrorCodes.ROOM_FULL);
    }

    // ユーザーオブジェクト作成
    const user: User = {
      id: socketId,
      nickname: nickname.trim(),
      joinedAt: new Date()
    };

    // マップに追加
    this.users.set(socketId, user);

    return user;
  }

  /**
   * ユーザーを削除
   * @param socketId 削除対象のソケットID
   * @returns User | null 削除されたユーザー情報（存在しない場合はnull）
   */
  removeUser(socketId: string): User | null {
    const user = this.users.get(socketId);
    if (user) {
      this.users.delete(socketId);
      return user;
    }
    return null;
  }

  /**
   * ユーザー情報を取得
   * @param socketId 取得対象のソケットID
   * @returns User | null ユーザー情報（存在しない場合はnull）
   */
  getUser(socketId: string): User | null {
    return this.users.get(socketId) || null;
  }

  /**
   * 全ユーザーのニックネーム一覧を取得
   * @returns string[] ニックネームの配列（参加順）
   */
  getAllNicknames(): string[] {
    return Array.from(this.users.values())
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
      .map(user => user.nickname);
  }

  /**
   * 全ユーザー情報を取得
   * @returns User[] ユーザー情報の配列
   */
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * アクティブユーザー数を取得
   * @returns number 現在のアクティブユーザー数
   */
  getUserCount(): number {
    return this.users.size;
  }

  /**
   * ニックネームの重複チェック
   * @param nickname チェック対象のニックネーム
   * @returns boolean 重複している場合true
   */
  isNicknameExists(nickname: string): boolean {
    const trimmedNickname = nickname.trim().toLowerCase();
    
    for (const user of this.users.values()) {
      if (user.nickname.toLowerCase() === trimmedNickname) {
        return true;
      }
    }
    return false;
  }

  /**
   * 全ユーザーを削除（テスト用・緊急時用）
   */
  clearAllUsers(): void {
    this.users.clear();
  }

  /**
   * ニックネームのバリデーション
   * @param nickname バリデーション対象のニックネーム
   * @throws Error バリデーションエラー時
   */
  private validateNickname(nickname: string): void {
    // null・undefined・空文字チェック
    if (!nickname || typeof nickname !== 'string') {
      throw new Error(ErrorCodes.INVALID_NICKNAME);
    }

    const trimmed = nickname.trim();

    // 文字数チェック
    if (trimmed.length < ValidationConstraints.NICKNAME_MIN_LENGTH || 
        trimmed.length > ValidationConstraints.NICKNAME_MAX_LENGTH) {
      throw new Error(ErrorCodes.INVALID_NICKNAME);
    }

    // 不正な文字チェック（基本的な文字のみ許可）
    const validPattern = /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\s\-_]+$/;
    if (!validPattern.test(trimmed)) {
      throw new Error(ErrorCodes.INVALID_NICKNAME);
    }

    // 連続スペース・先頭末尾スペースチェック
    if (trimmed !== nickname.replace(/\s+/g, ' ').trim()) {
      throw new Error(ErrorCodes.INVALID_NICKNAME);
    }
  }

  /**
   * デバッグ用: 現在の状態を出力
   * @returns object 現在のユーザー管理状態
   */
  getDebugInfo(): object {
    return {
      userCount: this.users.size,
      maxUsers: ValidationConstraints.MAX_USERS,
      users: this.getAllNicknames(),
      memoryUsage: process.memoryUsage()
    };
  }
}