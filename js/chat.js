/**
 * リアルタイムチャットアプリケーション - メインクライアント
 * Socket.IOを使用したリアルタイム通信機能
 */

// アプリケーション状態管理
class ChatApp {
  constructor() {
    // Socket.IO接続
    this.socket = null;
    this.isConnected = false;
    this.currentUser = null;
    
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
      
      // ダイアログ
      errorDialog: document.getElementById('error-dialog'),
      errorDialogMessage: document.getElementById('error-dialog-message'),
      errorDialogClose: document.getElementById('error-dialog-close'),
      errorDialogOk: document.getElementById('error-dialog-ok'),
      
      successDialog: document.getElementById('success-dialog'),
      successDialogMessage: document.getElementById('success-dialog-message'),
      successDialogClose: document.getElementById('success-dialog-close'),
      successDialogOk: document.getElementById('success-dialog-ok'),
      
      // 接続状態
      connectionStatus: document.getElementById('connection-status'),
      statusIndicator: document.getElementById('status-indicator'),
      statusText: document.getElementById('status-text'),
      
      // デバッグ情報
      debugInfo: document.getElementById('debug-info'),
      debugConnection: document.getElementById('debug-connection'),
      debugMessages: document.getElementById('debug-messages'),
      debugUsers: document.getElementById('debug-users')
    };
    
    // 統計情報
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      usersCount: 0,
      startTime: Date.now()
    };
    
    // レート制限管理
    this.rateLimitMap = [];
    this.RATE_LIMIT_WINDOW = 1000; // 1秒
    this.MAX_MESSAGES_PER_SECOND = 3;
    
    // 初期化
    this.init();
  }

  /**
   * アプリケーションの初期化
   */
  init() {
    console.log('[ChatApp] アプリケーション初期化開始');
    
    // イベントリスナーの設定
    this.setupEventListeners();
    
    // 開発モードの確認
    if (this.isDevelopmentMode()) {
      this.elements.debugInfo.style.display = 'block';
      console.log('[ChatApp] 開発モードが有効です');
    }
    
    // Socket.IO接続の開始
    this.connectToServer();
    
    // フォーカス管理
    this.setupFocusManagement();
    
    console.log('[ChatApp] アプリケーション初期化完了');
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // ニックネーム入力フォーム
    this.elements.nicknameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleJoinRoom();
    });
    
    // メッセージ送信フォーム
    this.elements.messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSendMessage();
    });
    
    // メッセージ入力時の文字数カウント
    this.elements.messageInput.addEventListener('input', () => {
      this.updateMessageLength();
    });
    
    // Enterキーでの送信（Shift+Enterは改行）
    this.elements.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });
    
    // 切断ボタン
    this.elements.disconnectBtn.addEventListener('click', () => {
      this.disconnect();
    });
    
    // ダイアログ関連
    [this.elements.errorDialogClose, this.elements.errorDialogOk].forEach(btn => {
      btn.addEventListener('click', () => this.hideErrorDialog());
    });
    
    [this.elements.successDialogClose, this.elements.successDialogOk].forEach(btn => {
      btn.addEventListener('click', () => this.hideSuccessDialog());
    });
    
    // エスケープキーでダイアログを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideErrorDialog();
        this.hideSuccessDialog();
      }
    });
    
    // ページ離脱前の確認
    window.addEventListener('beforeunload', (e) => {
      if (this.isConnected) {
        e.preventDefault();
        e.returnValue = 'チャットから退出します。よろしいですか？';
      }
    });
  }

  /**
   * Socket.IOサーバーに接続
   */
  connectToServer() {
    console.log('[ChatApp] サーバーへの接続を開始');
    this.updateConnectionStatus('connecting', '接続中...');
    
    try {
      // Socket.IO接続の作成（環境に応じた接続先設定）
      const socketUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000'
        : window.location.origin;
      
      console.log('[ChatApp] Socket.IO接続先:', socketUrl);
      
      this.socket = io(socketUrl, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      // 接続イベントリスナーの設定
      this.setupSocketListeners();
      
    } catch (error) {
      console.error('[ChatApp] Socket.IO接続エラー:', error);
      this.updateConnectionStatus('disconnected', '接続失敗');
      this.showErrorDialog('サーバーに接続できませんでした。ページを再読み込みしてください。');
    }
  }

  /**
   * Socket.IOイベントリスナーの設定
   */
  setupSocketListeners() {
    // 接続成功
    this.socket.on('connect', () => {
      console.log('[ChatApp] サーバーに接続しました:', this.socket.id);
      this.isConnected = true;
      this.updateConnectionStatus('connected', '接続済み');
      this.showLoginScreen();
    });
    
    // 切断
    this.socket.on('disconnect', (reason) => {
      console.log('[ChatApp] サーバーから切断されました:', reason);
      this.isConnected = false;
      this.updateConnectionStatus('disconnected', '切断済み');
      
      if (reason === 'io server disconnect') {
        // サーバー側からの切断
        this.showErrorDialog('サーバーから切断されました。');
      } else {
        // 再接続を試行
        this.updateConnectionStatus('connecting', '再接続中...');
      }
    });
    
    // 参加成功
    this.socket.on('join-success', (data) => {
      console.log('[ChatApp] チャット参加成功:', data);
      this.currentUser = data.nickname;
      this.showChatScreen();
      this.updateUsersList(data.users);
      this.loadMessageHistory(data.messages);
      this.showSuccessDialog(`${data.nickname}としてチャットに参加しました`);
    });
    
    // ユーザー参加通知
    this.socket.on('user-joined', (data) => {
      console.log('[ChatApp] 新規ユーザー参加:', data);
      this.addSystemMessage(`${data.nickname}さんが参加しました`, data.timestamp);
    });
    
    // ユーザー退出通知
    this.socket.on('user-left', (data) => {
      console.log('[ChatApp] ユーザー退出:', data);
      this.addSystemMessage(`${data.nickname}さんが退出しました`, data.timestamp);
    });
    
    // メッセージ受信
    this.socket.on('receive-message', (message) => {
      console.log('[ChatApp] メッセージ受信:', message);
      this.addMessage(message);
      this.stats.messagesReceived++;
      this.updateDebugInfo();
    });
    
    // 参加者一覧更新
    this.socket.on('update-users', (data) => {
      console.log('[ChatApp] 参加者一覧更新:', data);
      this.updateUsersList(data.users);
    });
    
    // エラー受信
    this.socket.on('error', (error) => {
      console.error('[ChatApp] サーバーエラー:', error);
      this.showErrorDialog(error.message);
    });
    
    // 接続エラー
    this.socket.on('connect_error', (error) => {
      console.error('[ChatApp] 接続エラー:', error);
      this.updateConnectionStatus('disconnected', '接続エラー');
      this.showErrorDialog('サーバーに接続できませんでした。しばらく待ってから再試行してください。');
    });
    
    // 再接続
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[ChatApp] 再接続成功:', attemptNumber);
      this.isConnected = true;
      this.updateConnectionStatus('connected', '再接続完了');
    });
    
    // 再接続失敗
    this.socket.on('reconnect_failed', () => {
      console.error('[ChatApp] 再接続に失敗しました');
      this.updateConnectionStatus('disconnected', '再接続失敗');
      this.showErrorDialog('サーバーへの再接続に失敗しました。ページを再読み込みしてください。');
    });
  }

  /**
   * チャットルーム参加処理
   */
  handleJoinRoom() {
    const nickname = this.elements.nicknameInput.value.trim();
    
    // バリデーション
    if (!this.validateNickname(nickname)) {
      return;
    }
    
    if (!this.isConnected) {
      this.showErrorDialog('サーバーに接続されていません。');
      return;
    }
    
    console.log('[ChatApp] チャット参加要求:', nickname);
    
    // UIの無効化
    this.elements.joinBtn.disabled = true;
    this.elements.nicknameInput.disabled = true;
    
    // サーバーに参加要求を送信
    this.socket.emit('join-room', { nickname });
    
    // タイムアウト処理
    setTimeout(() => {
      if (!this.currentUser) {
        this.elements.joinBtn.disabled = false;
        this.elements.nicknameInput.disabled = false;
      }
    }, 5000);
  }

  /**
   * メッセージ送信処理
   */
  handleSendMessage() {
    const message = this.elements.messageInput.value.trim();
    
    // バリデーション
    if (!this.validateMessage(message)) {
      return;
    }
    
    if (!this.isConnected) {
      this.showErrorDialog('サーバーに接続されていません。');
      return;
    }
    
    // レート制限チェック
    if (!this.checkRateLimit()) {
      this.showErrorDialog('送信頻度が高すぎます。少し待ってから送信してください。');
      return;
    }
    
    console.log('[ChatApp] メッセージ送信:', message);
    
    // サーバーにメッセージを送信
    this.socket.emit('send-message', { message });
    
    // 入力フィールドをクリア
    this.elements.messageInput.value = '';
    this.updateMessageLength();
    
    // 統計更新
    this.stats.messagesSent++;
    this.updateDebugInfo();
  }

  /**
   * ニックネームのバリデーション
   */
  validateNickname(nickname) {
    if (!nickname || nickname.length === 0) {
      this.showLoginError('ニックネームを入力してください');
      return false;
    }
    
    if (nickname.length > 20) {
      this.showLoginError('ニックネームは20文字以内で入力してください');
      return false;
    }
    
    if (nickname.length < 1) {
      this.showLoginError('ニックネームは1文字以上で入力してください');
      return false;
    }
    
    // 使用可能文字のチェック
    const validPattern = /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\s\-_]+$/;
    if (!validPattern.test(nickname)) {
      this.showLoginError('ニックネームに使用できない文字が含まれています');
      return false;
    }
    
    this.hideLoginError();
    return true;
  }

  /**
   * メッセージのバリデーション
   */
  validateMessage(message) {
    if (!message || message.length === 0) {
      return false;
    }
    
    if (message.length > 500) {
      this.showErrorDialog('メッセージは500文字以内で入力してください');
      return false;
    }
    
    return true;
  }

  /**
   * 送信頻度制限チェック
   */
  checkRateLimit() {
    const now = Date.now();
    
    // 1秒以内の送信記録を取得
    this.rateLimitMap = this.rateLimitMap.filter(
      timestamp => now - timestamp < this.RATE_LIMIT_WINDOW
    );
    
    // 制限チェック
    if (this.rateLimitMap.length >= this.MAX_MESSAGES_PER_SECOND) {
      return false;
    }
    
    // 新しいタイムスタンプを追加
    this.rateLimitMap.push(now);
    return true;
  }

  /**
   * ログイン画面を表示
   */
  showLoginScreen() {
    this.elements.loadingScreen.classList.add('hidden');
    this.elements.loginScreen.classList.remove('hidden');
    this.elements.chatScreen.classList.add('hidden');
    this.elements.nicknameInput.focus();
  }

  /**
   * チャット画面を表示
   */
  showChatScreen() {
    this.elements.loadingScreen.classList.add('hidden');
    this.elements.loginScreen.classList.add('hidden');
    this.elements.chatScreen.classList.remove('hidden');
    
    // ユーザー名を表示
    this.elements.currentUserName.textContent = this.currentUser;
    
    // メッセージ入力を有効化
    this.elements.messageInput.disabled = false;
    this.elements.sendBtn.disabled = false;
    this.elements.messageInput.focus();
  }

  /**
   * メッセージ履歴の読み込み
   */
  loadMessageHistory(messages) {
    console.log('[ChatApp] メッセージ履歴読み込み:', messages.length, '件');
    
    this.elements.messagesList.innerHTML = '';
    
    messages.forEach(message => {
      this.addMessage(message, false);
    });
    
    this.scrollToBottom();
  }

  /**
   * メッセージを画面に追加
   */
  addMessage(message, shouldAnimate = true) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    // 自分のメッセージかどうか判定
    if (message.nickname === this.currentUser) {
      messageElement.classList.add('own');
    }
    
    // メッセージHTML作成
    const timestamp = this.formatTimestamp(message.timestamp);
    messageElement.innerHTML = `
      <div class="message-header">
        <span class="message-author">${this.escapeHtml(message.nickname)}</span>
        <span class="message-time">${timestamp}</span>
      </div>
      <div class="message-content">${this.escapeHtml(message.message)}</div>
    `;
    
    // アニメーション追加
    if (shouldAnimate) {
      messageElement.classList.add('fade-in');
    }
    
    // メッセージリストに追加
    this.elements.messagesList.appendChild(messageElement);
    
    // スクロール
    this.scrollToBottom();
  }

  /**
   * システムメッセージを追加
   */
  addSystemMessage(text, timestamp) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message system fade-in';
    
    const formattedTime = this.formatTimestamp(timestamp);
    messageElement.innerHTML = `
      <div class="message-header">
        <span class="message-time">${formattedTime}</span>
      </div>
      <div class="message-content">${this.escapeHtml(text)}</div>
    `;
    
    this.elements.messagesList.appendChild(messageElement);
    this.scrollToBottom();
  }

  /**
   * 参加者一覧の更新
   */
  updateUsersList(users) {
    this.elements.usersCount.textContent = users.length;
    this.elements.usersList.innerHTML = '';
    
    users.forEach(nickname => {
      const userElement = document.createElement('li');
      userElement.textContent = nickname;
      
      if (nickname === this.currentUser) {
        userElement.classList.add('current-user');
      }
      
      this.elements.usersList.appendChild(userElement);
    });
    
    // 統計更新
    this.stats.usersCount = users.length;
    this.updateDebugInfo();
  }

  /**
   * 接続状態の更新
   */
  updateConnectionStatus(status, text) {
    this.elements.statusIndicator.className = `status-indicator ${status}`;
    this.elements.statusText.textContent = text;
    
    if (this.isDevelopmentMode()) {
      this.elements.debugConnection.textContent = status;
    }
  }

  /**
   * メッセージ文字数の更新
   */
  updateMessageLength() {
    const length = this.elements.messageInput.value.length;
    this.elements.messageLength.textContent = length;
    
    // 文字数制限の視覚的フィードバック
    if (length > 450) {
      this.elements.messageLength.style.color = 'var(--error-color)';
      this.elements.messageLength.style.fontWeight = '700';
    } else if (length > 400) {
      this.elements.messageLength.style.color = 'var(--warning-color)';
      this.elements.messageLength.style.fontWeight = '600';
    } else {
      this.elements.messageLength.style.color = '#000000';
      this.elements.messageLength.style.fontWeight = '700';
    }
  }

  /**
   * エラーダイアログを表示
   */
  showErrorDialog(message) {
    this.elements.errorDialogMessage.textContent = message;
    this.elements.errorDialog.classList.remove('hidden');
  }

  /**
   * エラーダイアログを非表示
   */
  hideErrorDialog() {
    this.elements.errorDialog.classList.add('hidden');
  }

  /**
   * 成功ダイアログを表示
   */
  showSuccessDialog(message) {
    this.elements.successDialogMessage.textContent = message;
    this.elements.successDialog.classList.remove('hidden');
    
    // 3秒後に自動で閉じる
    setTimeout(() => {
      this.hideSuccessDialog();
    }, 3000);
  }

  /**
   * 成功ダイアログを非表示
   */
  hideSuccessDialog() {
    this.elements.successDialog.classList.add('hidden');
  }

  /**
   * ログインエラーを表示
   */
  showLoginError(message) {
    this.elements.loginError.textContent = message;
    this.elements.loginError.classList.remove('hidden');
  }

  /**
   * ログインエラーを非表示
   */
  hideLoginError() {
    this.elements.loginError.classList.add('hidden');
  }

  /**
   * メッセージエリアを一番下にスクロール
   */
  scrollToBottom() {
    this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
  }

  /**
   * サーバーから切断
   */
  disconnect() {
    console.log('[ChatApp] 手動切断');
    
    if (this.socket) {
      this.socket.disconnect();
    }
    
    // 状態をリセット
    this.isConnected = false;
    this.currentUser = null;
    
    // ログイン画面に戻る
    this.showLoginScreen();
    
    // フォームをリセット
    this.elements.nicknameInput.value = '';
    this.elements.nicknameInput.disabled = false;
    this.elements.joinBtn.disabled = false;
    this.elements.messageInput.disabled = true;
    this.elements.sendBtn.disabled = true;
    
    // エラーメッセージをクリア
    this.hideLoginError();
  }

  /**
   * フォーカス管理の設定
   */
  setupFocusManagement() {
    // タブキーでのフォーカス移動を改善
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        // フォーカス可能な要素を適切に管理
        const focusableElements = document.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }

  /**
   * デバッグ情報の更新
   */
  updateDebugInfo() {
    if (this.isDevelopmentMode()) {
      this.elements.debugMessages.textContent = 
        `送信: ${this.stats.messagesSent}, 受信: ${this.stats.messagesReceived}`;
      this.elements.debugUsers.textContent = this.stats.usersCount;
    }
  }

  /**
   * 開発モード判定
   */
  isDevelopmentMode() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.search.includes('debug=1');
  }

  /**
   * タイムスタンプのフォーマット
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * HTMLエスケープ（XSS対策）
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
  console.log('[ChatApp] DOM読み込み完了 - アプリケーション開始');
  new ChatApp();
});

// グローバルエラーハンドラー
window.addEventListener('error', (e) => {
  console.error('[ChatApp] グローバルエラー:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[ChatApp] 未処理のPromise拒否:', e.reason);
});

// パフォーマンス監視（開発モードのみ）
if (window.location.hostname === 'localhost') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = window.performance.timing;
      const loadTime = perfData.loadEventEnd - perfData.navigationStart;
      console.log(`[ChatApp] ページ読み込み時間: ${loadTime}ms`);
    }, 0);
  });
}