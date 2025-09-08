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
      connectionStatusText: document.getElementById('status-text')
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
      this.updateConnectionStatus('connected', 'オンライン');
      
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
   * メッセージ送信
   */
  async sendMessage() {
    const message = this.elements.messageInput.value.trim();
    
    if (!message) return;
    
    if (message.length > 500) {
      this.showError('メッセージは500文字以内で入力してください');
      return;
    }
    
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'message', 
          user: this.currentUser, 
          message 
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.elements.messageInput.value = '';
        this.elements.messageLength.textContent = '0/500';
        this.elements.messageLength.style.color = '#7f8c8d';
        
        // 送信したメッセージをすぐに表示
        this.displayMessages([data.message]);
        this.scrollToBottom();
        
        console.log('[HttpChatApp] メッセージ送信成功');
      }
    } catch (error) {
      console.error('[HttpChatApp] メッセージ送信エラー:', error);
      this.showError('メッセージの送信に失敗しました');
    }
  }

  /**
   * メッセージポーリング開始
   */
  startMessagePolling() {
    // 既存のポーリングを停止
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    
    // 新しいメッセージをポーリング（3秒間隔）
    this.pollInterval = setInterval(async () => {
      if (!this.isConnected) return;
      
      try {
        const pollUrl = `${this.apiUrl}?action=messages&since=${this.lastMessageTime}`;
        console.log('[HttpChatApp] ポーリング URL:', pollUrl);
        
        const response = await fetch(pollUrl);
        console.log('[HttpChatApp] ポーリング応答:', response.status, response.statusText);
        
        if (!response.ok) {
          console.error('[HttpChatApp] ポーリング失敗:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
          this.displayMessages(data.messages);
          this.scrollToBottom();
        }
        
        if (data.users) {
          this.updateUsersList(data.users);
        }
        
      } catch (error) {
        console.error('[HttpChatApp] ポーリングエラー:', error);
        this.updateConnectionStatus('error', '接続エラー');
      }
    }, 3000);
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
   * チャット退出
   */
  async leaveChat() {
    if (this.currentUser) {
      try {
        await fetch(this.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'leave', user: this.currentUser })
        });
      } catch (error) {
        console.error('[HttpChatApp] 退出通知エラー:', error);
      }
    }
    
    // ポーリング停止
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
    
    console.log('[HttpChatApp] チャット退出完了');
  }

  /**
   * 接続状態更新
   */
  updateConnectionStatus(status, text) {
    const statusElement = this.elements.connectionStatus;
    const textElement = this.elements.connectionStatusText;
    
    if (statusElement) {
      statusElement.className = `connection-status ${status}`;
    }
    if (textElement) {
      textElement.textContent = text;
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