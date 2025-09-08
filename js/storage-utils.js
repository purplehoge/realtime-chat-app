// LocalStorage ユーティリティ関数
HttpChatApp.prototype.getUsers = function() {
  try {
    const users = localStorage.getItem(this.usersKey);
    return users ? JSON.parse(users) : [];
  } catch (error) {
    console.error('[Storage] ユーザー取得エラー:', error);
    return [];
  }
};

HttpChatApp.prototype.saveUsers = function(users) {
  try {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  } catch (error) {
    console.error('[Storage] ユーザー保存エラー:', error);
  }
};

HttpChatApp.prototype.getMessages = function() {
  try {
    const messages = localStorage.getItem(this.messagesKey);
    return messages ? JSON.parse(messages) : [];
  } catch (error) {
    console.error('[Storage] メッセージ取得エラー:', error);
    return [];
  }
};

HttpChatApp.prototype.saveMessages = function(messages) {
  try {
    // 最新100件まで保持
    if (messages.length > 100) {
      messages = messages.slice(-100);
    }
    localStorage.setItem(this.messagesKey, JSON.stringify(messages));
  } catch (error) {
    console.error('[Storage] メッセージ保存エラー:', error);
  }
};

HttpChatApp.prototype.addMessage = function(message) {
  const messages = this.getMessages();
  messages.push(message);
  this.saveMessages(messages);
  return messages;
};