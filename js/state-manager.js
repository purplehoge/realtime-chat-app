/**
 * アプリケーション状態管理クラス
 * 状態クリア・初期化処理を担当
 */
class StateManager {
  /**
   * LocalStorage キー定義
   */
  static STORAGE_KEYS = {
    MESSAGES: 'chatApp_messages',
    USERS: 'chatApp_users', 
    CURRENT_USER: 'chatApp_currentUser',
    LAST_ACTIVITY: 'chatApp_lastActivity',
    SESSION_ID: 'chatApp_sessionId'
  };

  /**
   * セッション終了時の完全クリア処理
   * LocalStorageの全チャットデータを削除
   */
  static clearAllState() {
    try {
      console.log('[StateManager] 全状態をクリア中...');
      
      // 全てのチャット関連データを削除
      Object.values(StateManager.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      // UI状態もリセット
      StateManager.resetUI();
      
      console.log('[StateManager] 状態クリア完了');
      
      // 他のタブに状態クリア通知
      StateManager.notifyOtherTabs('state-cleared');
      
    } catch (error) {
      console.error('[StateManager] 状態クリアエラー:', error);
    }
  }

  /**
   * ページ離脱前のクリーンアップ処理
   * beforeunload/unloadイベントで実行
   */
  static beforeUnloadHandler() {
    try {
      console.log('[StateManager] ページ離脱前処理実行中...');
      
      // 現在のユーザー情報を取得
      const currentUser = StateManager.getCurrentUser();
      
      if (currentUser) {
        // 他のタブに離脱通知
        StateManager.notifyOtherTabs('user-leaving', {
          nickname: currentUser.nickname,
          timestamp: new Date().toISOString()
        });
      }
      
      // セッション終了時刻を記録
      localStorage.setItem(
        StateManager.STORAGE_KEYS.LAST_ACTIVITY, 
        new Date().toISOString()
      );
      
    } catch (error) {
      console.error('[StateManager] 離脱前処理エラー:', error);
    }
  }

  /**
   * 初期化オプション付きでアプリ開始
   * @param {boolean} forceReset - 強制リセットフラグ
   */
  static initializeApp(forceReset = false) {
    try {
      console.log('[StateManager] アプリ初期化中...', { forceReset });
      
      if (forceReset) {
        // 強制リセット時は全データクリア
        StateManager.clearAllState();
        return;
      }
      
      // 既存データの確認
      const hasExistingData = StateManager.hasExistingChatData();
      
      if (hasExistingData) {
        // 既存データがある場合は選択肢を表示
        StateManager.showContinueOrResetOptions();
      } else {
        // 新規セッション開始
        StateManager.startNewSession();
      }
      
    } catch (error) {
      console.error('[StateManager] 初期化エラー:', error);
      // エラー時は強制的に新規セッション開始
      StateManager.startNewSession();
    }
  }

  /**
   * 既存チャットデータの存在確認
   * @returns {boolean} データが存在する場合true
   */
  static hasExistingChatData() {
    const messages = localStorage.getItem(StateManager.STORAGE_KEYS.MESSAGES);
    const users = localStorage.getItem(StateManager.STORAGE_KEYS.USERS);
    
    return !!(messages || users);
  }

  /**
   * 継続またはリセットの選択肢を表示
   */
  static showContinueOrResetOptions() {
    const existingUser = StateManager.getCurrentUser();
    const messageCount = StateManager.getMessageCount();
    const userCount = StateManager.getUserCount();
    
    const message = `前回のチャットデータが残っています。\n` +
                   `メッセージ: ${messageCount}件, 参加者: ${userCount}名\n` +
                   `${existingUser ? `前回のニックネーム: ${existingUser.nickname}\n` : ''}` +
                   `どうしますか？`;
    
    if (confirm(message + '\n\n「OK」: 続きから開始　「キャンセル」: 新規開始')) {
      StateManager.continuePreviousSession();
    } else {
      StateManager.clearAllState();
      StateManager.startNewSession();
    }
  }

  /**
   * 前回セッションの続きから開始
   */
  static continuePreviousSession() {
    console.log('[StateManager] 前回セッションを継続');
    // 通常のアプリ初期化処理（チャット画面に移行）
    // この処理は既存のHttpChatAppに委譲
  }

  /**
   * 新規セッション開始
   */
  static startNewSession() {
    console.log('[StateManager] 新規セッション開始');
    
    // セッションIDを生成
    const sessionId = StateManager.generateSessionId();
    localStorage.setItem(StateManager.STORAGE_KEYS.SESSION_ID, sessionId);
    
    // 開始時刻を記録
    localStorage.setItem(StateManager.STORAGE_KEYS.LAST_ACTIVITY, new Date().toISOString());
  }

  /**
   * UI状態をリセット
   */
  static resetUI() {
    try {
      // ログイン画面に戻す
      const screens = ['loading-screen', 'chat-screen'];
      screens.forEach(screenId => {
        const screen = document.getElementById(screenId);
        if (screen) screen.style.display = 'none';
      });
      
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) loginScreen.style.display = 'flex';
      
      // フォームをリセット
      const nicknameInput = document.getElementById('nickname');
      if (nicknameInput) nicknameInput.value = '';
      
      // チャット画面要素をクリア
      const messagesContainer = document.getElementById('messages');
      if (messagesContainer) messagesContainer.innerHTML = '';
      
      const usersContainer = document.getElementById('users');
      if (usersContainer) usersContainer.innerHTML = '';
      
    } catch (error) {
      console.error('[StateManager] UI リセットエラー:', error);
    }
  }

  /**
   * 他のタブに通知を送信
   * @param {string} type - 通知タイプ
   * @param {object} data - 送信データ
   */
  static notifyOtherTabs(type, data = null) {
    try {
      const notification = {
        type,
        data,
        timestamp: Date.now(),
        sender: StateManager.getSessionId()
      };
      
      localStorage.setItem('chatApp_notification', JSON.stringify(notification));
      // 即座に削除（他タブのstorageイベントトリガー後）
      setTimeout(() => {
        localStorage.removeItem('chatApp_notification');
      }, 100);
      
    } catch (error) {
      console.error('[StateManager] タブ間通知エラー:', error);
    }
  }

  /**
   * 現在のユーザー情報を取得
   * @returns {object|null} ユーザー情報
   */
  static getCurrentUser() {
    try {
      const user = localStorage.getItem(StateManager.STORAGE_KEYS.CURRENT_USER);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('[StateManager] ユーザー情報取得エラー:', error);
      return null;
    }
  }

  /**
   * メッセージ数を取得
   * @returns {number} メッセージ数
   */
  static getMessageCount() {
    try {
      const messages = localStorage.getItem(StateManager.STORAGE_KEYS.MESSAGES);
      return messages ? JSON.parse(messages).length : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * ユーザー数を取得
   * @returns {number} ユーザー数
   */
  static getUserCount() {
    try {
      const users = localStorage.getItem(StateManager.STORAGE_KEYS.USERS);
      return users ? JSON.parse(users).length : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * セッションIDを生成
   * @returns {string} セッションID
   */
  static generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 現在のセッションIDを取得
   * @returns {string} セッションID
   */
  static getSessionId() {
    let sessionId = localStorage.getItem(StateManager.STORAGE_KEYS.SESSION_ID);
    if (!sessionId) {
      sessionId = StateManager.generateSessionId();
      localStorage.setItem(StateManager.STORAGE_KEYS.SESSION_ID, sessionId);
    }
    return sessionId;
  }

  /**
   * 「新しいチャット開始」ボタンを追加
   * （既存のUIに統合用）
   */
  static addClearStateButton() {
    try {
      // チャット画面内に「リセット」ボタンを追加
      const chatScreen = document.getElementById('chat-screen');
      if (!chatScreen) return;
      
      // 既存ボタンがあれば削除
      const existingButton = document.getElementById('clear-state-button');
      if (existingButton) existingButton.remove();
      
      // 新しいボタン作成
      const clearButton = document.createElement('button');
      clearButton.id = 'clear-state-button';
      clearButton.className = 'clear-state-button';
      clearButton.innerHTML = '🗑️ 新しいチャット開始';
      clearButton.title = 'すべてのメッセージと参加者をクリアして新規開始';
      
      clearButton.addEventListener('click', () => {
        if (confirm('全てのメッセージと参加者情報をクリアして、新しいチャットを開始しますか？')) {
          StateManager.clearAllState();
          // ページをリロードして完全に初期化
          window.location.reload();
        }
      });
      
      // チャットヘッダーに追加
      const chatHeader = chatScreen.querySelector('.chat-header') || chatScreen;
      chatHeader.appendChild(clearButton);
      
    } catch (error) {
      console.error('[StateManager] クリアボタン追加エラー:', error);
    }
  }

  /**
   * イベントリスナーを設定
   */
  static setupEventListeners() {
    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', StateManager.beforeUnloadHandler);
    window.addEventListener('unload', StateManager.beforeUnloadHandler);
    
    // 他のタブからの通知を監視
    window.addEventListener('storage', (event) => {
      if (event.key === 'chatApp_notification') {
        StateManager.handleTabNotification(event);
      }
    });
    
    console.log('[StateManager] イベントリスナー設定完了');
  }

  /**
   * 他タブからの通知を処理
   * @param {StorageEvent} event - ストレージイベント
   */
  static handleTabNotification(event) {
    try {
      if (!event.newValue) return;
      
      const notification = JSON.parse(event.newValue);
      const currentSessionId = StateManager.getSessionId();
      
      // 自分が送信した通知は無視
      if (notification.sender === currentSessionId) return;
      
      console.log('[StateManager] 他タブ通知受信:', notification);
      
      switch (notification.type) {
        case 'state-cleared':
          // 他のタブで状態がクリアされた場合、自分もクリア
          location.reload();
          break;
          
        case 'user-leaving':
          // 他のタブでユーザーが退出した場合の処理
          // （HttpChatAppに委譲可能）
          break;
      }
      
    } catch (error) {
      console.error('[StateManager] タブ通知処理エラー:', error);
    }
  }
}

// ページ読み込み時に StateManager を初期化
document.addEventListener('DOMContentLoaded', () => {
  StateManager.setupEventListeners();
  console.log('[StateManager] 初期化完了');
});

// グローバルアクセス用
window.StateManager = StateManager;