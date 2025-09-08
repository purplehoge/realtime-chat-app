/**
 * HTTP APIベースのリアルタイムチャットアプリケーション
 * Socket.IOの代替実装
 */

// アプリケーション状態管理
class HttpChatApp {
  constructor() {
    // 接続状態
    this.isConnected = false;
    this.currentUser = null;
    this.lastMessageTime = 0;
    this.pollInterval = null;
    
    // LocalStorage設定（静的サイト版）
    this.storagePrefix = 'chatApp_';
    this.usersKey = this.storagePrefix + 'users';
    this.messagesKey = this.storagePrefix + 'messages';
    
    // 擬似リアルタイム更新
    this.pollInterval = null;
    this.lastUpdate = 0;
    
    // UI要素の参照
    this.elements = {
      // 画面要素
      loadingScreen: document.getElementById('loading-screen'),
      loginScreen: document.getElementById('login-screen'),
      chatScreen: document.getElementById('chat-screen'),
      
      // ログイン関連
      nicknameForm: document.getElementById('nickname-form'),
      nicknameInput: document.getElementById('nickname-input'),
      joinBtn: document.getElementById('join-btn'),
      loginError: document.getElementById('login-error'),
      
      // チャット関連
      currentUserName: document.getElementById('current-user-name'),
      disconnectBtn: document.getElementById('disconnect-btn'),
      usersCount: document.getElementById('users-count'),
      usersList: document.getElementById('users-list'),
      messagesContainer: document.getElementById('messages-container'),
      messagesList: document.getElementById('messages-list'),
      messageForm: document.getElementById('message-form'),
      messageInput: document.getElementById('message-input'),
      sendBtn: document.getElementById('send-btn'),
      messageLength: document.getElementById('message-length'),
      
      // 接続状態
      connectionStatus: document.getElementById('connection-status'),
      connectionStatusText: document.getElementById('status-text'),
      statusIndicator: document.getElementById('status-indicator')
    };
    
    // イベントリスナーの設定
    this.setupEventListeners();
    
    // 初期化
    this.showScreen('login');
    console.log('[HttpChatApp] HTTP APIベースチャットアプリ初期化完了');
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // ログインフォーム
    this.elements.nicknameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.joinChat();
    });
    
    // メッセージフォーム
    this.elements.messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendMessage();
    });
    
    // 切断ボタン
    this.elements.disconnectBtn.addEventListener('click', () => {
      this.leaveChat();
    });
    
    // メッセージ入力文字数カウント
    this.elements.messageInput.addEventListener('input', () => {
      const length = this.elements.messageInput.value.length;
      this.elements.messageLength.textContent = `${length}/500`;
      
      if (length > 500) {
        this.elements.messageLength.style.color = '#e74c3c';
      } else {
        this.elements.messageLength.style.color = '#7f8c8d';
      }
    });
  }

  /**
   * 画面切り替え
   */
  showScreen(screenName) {
    console.log('[HttpChatApp] 画面切り替え:', screenName);
    const screens = ['loading', 'login', 'chat'];
    screens.forEach(name => {
      const element = this.elements[`${name}Screen`];
      const isTarget = name === screenName;
      console.log(`[HttpChatApp] ${name}Screen: ${element ? 'Found' : 'NOT FOUND'}, target: ${isTarget}`);
      if (element) {
        // CSSのhiddenクラスと競合するため、クラス操作で制御
        if (isTarget) {
          element.classList.remove('hidden');
          element.style.display = 'flex';
        } else {
          element.classList.add('hidden');
          element.style.display = 'none';
        }
      }
    });
  }

  /**
   * チャット参加（LocalStorage版）
   */
  async joinChat() {
    const nickname = this.elements.nicknameInput.value.trim();
    
    if (!nickname) {
      this.showError('ニックネームを入力してください');
      return;
    }
    
    if (nickname.length > 20) {
      this.showError('ニックネームは20文字以内で入力してください');
      return;
    }
    
    this.showScreen('loading');
    this.updateConnectionStatus('connecting', '接続中...');
    
    // LocalStorageからデータ取得
    try {
      const users = this.getUsers();
      const messages = this.getMessages();
      
      // ユーザーを追加
      if (!users.includes(nickname)) {
        users.push(nickname);
        this.saveUsers(users);
      }
      
      this.currentUser = nickname;
      this.isConnected = true;
      this.lastMessageTime = Date.now();
      
      // UI更新
      this.elements.currentUserName.textContent = nickname;
      this.updateUsersList(users);
      this.displayMessages(messages);
      
      console.log('[StaticChatApp] チャット画面に遷移中...');
      this.showScreen('chat');
      console.log('[DEBUG] About to call updateConnectionStatus with connected/オンライン');
      this.updateConnectionStatus('connected', 'オンライン');
      console.log('[DEBUG] updateConnectionStatus call completed');
      
      // メッセージ入力を有効化
      if (this.elements.messageInput) {
        this.elements.messageInput.disabled = false;
      }
      if (this.elements.sendBtn) {
        this.elements.sendBtn.disabled = false;
      }
      console.log('[StaticChatApp] チャット画面表示完了・入力フィールド有効化');
      
      // 擬似リアルタイム更新開始
      this.startMessagePolling();
      
      console.log('[StaticChatApp] チャット参加成功:', nickname);
    } catch (error) {
      console.error('[StaticChatApp] 参加エラー:', error);
      this.showError('チャットの初期化に失敗しました');
      this.showScreen('login');
      this.updateConnectionStatus('disconnected', 'オフライン');
    }
  }

  /**
   * メッセージ送信（LocalStorage版）
   */
  async sendMessage() {
    const message = this.elements.messageInput.value.trim();
    
    if (!message) return;
    
    if (message.length > 500) {
      this.showError('メッセージは500文字以内で入力してください');
      return;
    }
    
    try {
      // 新しいメッセージオブジェクトを作成
      const newMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        user: this.currentUser,
        message: message,
        timestamp: Date.now()
      };
      
      // LocalStorageに保存
      const updatedMessages = this.addMessage(newMessage);
      
      // UI更新
      this.elements.messageInput.value = '';
      this.elements.messageLength.textContent = '0/500';
      this.elements.messageLength.style.color = '#7f8c8d';
      
      // 送信したメッセージをすぐに表示
      this.displayMessages([newMessage]);
      this.scrollToBottom();
      
      console.log('[StaticChatApp] メッセージ送信成功:', newMessage);
    } catch (error) {
      console.error('[StaticChatApp] メッセージ送信エラー:', error);
      this.showError('メッセージの送信に失敗しました');
    }
  }

  /**
   * メッセージポーリング開始（LocalStorage版・シンプル化）
   */
  startMessagePolling() {
    console.log('[StaticChatApp] LocalStorage版ではポーリング不要');
    // LocalStorage版では他のユーザーからのメッセージはないため
    // ポーリング機能は無効化（将来のFirebase対応時に再実装予定）
  }

  /**
   * メッセージ表示
   */
  displayMessages(messages) {
    messages.forEach(msg => {
      // 重複チェック
      if (document.getElementById(msg.id)) return;
      
      const messageElement = this.createMessageElement(msg);
      this.elements.messagesList.appendChild(messageElement);
      
      // 最新タイムスタンプ更新
      if (msg.timestamp > this.lastMessageTime) {
        this.lastMessageTime = msg.timestamp;
      }
    });
  }

  /**
   * メッセージ要素作成
   */
  createMessageElement(message) {
    const div = document.createElement('div');
    div.id = message.id;
    div.className = 'message';
    
    const isOwnMessage = message.user === this.currentUser;
    if (isOwnMessage) {
      div.classList.add('own-message');
    }
    
    const time = new Date(message.timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    div.innerHTML = `
      <div class="message-header">
        <span class="message-user">${this.escapeHtml(message.user)}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-content">${this.escapeHtml(message.message)}</div>
    `;
    
    return div;
  }

  /**
   * ユーザー一覧更新
   */
  updateUsersList(users) {
    this.elements.usersCount.textContent = users.length;
    this.elements.usersList.innerHTML = '';
    
    users.forEach(user => {
      const li = document.createElement('li');
      li.className = 'user-item';
      if (user === this.currentUser) {
        li.classList.add('current-user');
      }
      li.textContent = user;
      this.elements.usersList.appendChild(li);
    });
  }

  /**
   * チャット退出（LocalStorage版）
   */
  async leaveChat() {
    if (this.currentUser) {
      try {
        // LocalStorageからユーザーを削除
        const users = this.getUsers();
        const updatedUsers = users.filter(user => user !== this.currentUser);
        this.saveUsers(updatedUsers);
        console.log('[StaticChatApp] ユーザー退出:', this.currentUser);
      } catch (error) {
        console.error('[StaticChatApp] 退出処理エラー:', error);
      }
    }
    
    // ポーリング停止（LocalStorage版では不要だが念のため）
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    // 状態リセット
    this.isConnected = false;
    this.currentUser = null;
    this.lastMessageTime = 0;
    
    // UI リセット
    this.elements.nicknameInput.value = '';
    this.elements.messageInput.value = '';
    this.elements.messagesList.innerHTML = '';
    this.elements.usersList.innerHTML = '';
    this.elements.messageLength.textContent = '0/500';
    
    this.showScreen('login');
    this.updateConnectionStatus('disconnected', 'オフライン');
    
    console.log('[StaticChatApp] チャット退出完了');
  }

  /**
   * 接続状態更新
   */
  updateConnectionStatus(status, text) {
    console.log('[DEBUG] updateConnectionStatus called:', { status, text });
    const statusElement = this.elements.connectionStatus;
    const textElement = this.elements.connectionStatusText;
    const indicatorElement = this.elements.statusIndicator;
    
    console.log('[DEBUG] Elements found:', { 
      statusElement: !!statusElement, 
      textElement: !!textElement,
      indicatorElement: !!indicatorElement
    });
    
    if (statusElement) {
      statusElement.className = `connection-status ${status}`;
      console.log('[DEBUG] Status element class updated:', statusElement.className);
    } else {
      console.error('[DEBUG] Status element not found!');
    }
    
    if (textElement) {
      textElement.textContent = text;
      console.log('[DEBUG] Status text updated:', textElement.textContent);
    } else {
      console.error('[DEBUG] Status text element not found!');
    }
    
    if (indicatorElement) {
      indicatorElement.className = `status-indicator ${status}`;
      console.log('[DEBUG] Status indicator class updated:', indicatorElement.className);
    } else {
      console.error('[DEBUG] Status indicator element not found!');
    }
  }

  /**
   * エラー表示
   */
  showError(message) {
    const errorElement = this.elements.loginError;
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }

  /**
   * メッセージエリア最下部へスクロール
   */
  scrollToBottom() {
    const container = this.elements.messagesContainer;
    container.scrollTop = container.scrollHeight;
  }

  /**
   * HTMLエスケープ
   */
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
  window.chatApp = new HttpChatApp();
});