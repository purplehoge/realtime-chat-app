# リアルタイムチャットアプリケーション

Socket.IOを使用したリアルタイムチャットアプリケーション。Vercelでのサーバーレス環境でのデプロイに対応。

## 成果物の目的

- サーバー・クライアント構成のWebアプリケーション開発学習
- WebSocketを用いたリアルタイム通信技術の習得
- Vercelサーバーレス環境でのデプロイ経験
- TypeScriptを使ったフルスタック開発の実践

## 機能概要

- リアルタイムメッセージ送受信
- 複数ユーザーの同時参加
- ニックネーム機能
- 参加者一覧表示
- メッセージ履歴表示
- レスポンシブUI対応

## 前提条件

### 開発環境
- Node.js 18.0.0以上
- npm 9.0.0以上
- モダンブラウザ（Chrome、Firefox、Safari、Edge）

### デプロイ環境
- Vercelアカウント
- GitHub連携設定

## セットアップ手順

### 1. プロジェクトのクローン
```bash
git clone <repository-url>
cd ServerClient
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 開発サーバーの起動
```bash
npm run dev
```

### 4. ブラウザでアクセス
```
http://localhost:3000
```

## プロジェクト構成

```
ServerClient/
├── docs/                    # 設計書類
│   ├── 01_要件定義.md
│   ├── 02_基本設計.md
│   └── 03_詳細設計.md
├── api/                     # Vercel Serverless Functions
│   └── socket.ts           # Socket.IOハンドラー
├── lib/                     # サーバーライブラリ
│   ├── socketManager.ts    # 接続管理
│   ├── messageStore.ts     # メッセージ管理
│   └── userManager.ts      # ユーザー管理
├── public/                  # 静的ファイル
│   ├── index.html          # メインHTML
│   ├── css/
│   │   └── styles.css      # スタイルシート
│   └── js/
│       ├── chat.ts         # チャット機能メイン
│       ├── socket.ts       # Socket.IOクライアント
│       └── ui.ts           # UI操作
├── types/                   # TypeScript型定義
│   └── chat.ts
├── package.json
├── tsconfig.json
├── vercel.json             # Vercel設定
└── README.md
```

## 利用方法

### 基本的な使い方

1. **チャットへの参加**
   - ブラウザでアプリケーションにアクセス
   - ニックネーム（1-20文字）を入力
   - 「参加」ボタンをクリック

2. **メッセージの送信**
   - 画面下部の入力フィールドにメッセージを入力
   - 「送信」ボタンをクリックまたはEnterキーを押下
   - メッセージが全参加者にリアルタイムで配信される

3. **チャットからの退出**
   - ブラウザタブを閉じる
   - 他の参加者に退出通知が表示される

### 画面構成

- **ログイン画面**: ニックネーム入力フォーム
- **チャット画面**: 
  - 上部: 参加者一覧
  - 中央: メッセージ履歴
  - 下部: メッセージ入力フォーム

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# TypeScript型チェック
npm run type-check

# ビルド
npm run build

# テスト実行
npm test

# コードフォーマット
npm run format

# リント
npm run lint
```

## デプロイ手順

### Vercelへのデプロイ

1. **GitHubリポジトリの作成**
   ```bash
   gh repo create ServerClient --public
   git add .
   git commit -m \"Initial commit\"
   git push origin main
   ```

2. **Vercelプロジェクトの作成**
   - Vercelダッシュボードで「New Project」
   - GitHubリポジトリを選択
   - プロジェクト設定はデフォルトのまま「Deploy」

3. **環境変数の設定**（必要に応じて）
   - Vercelダッシュボードの「Settings」→「Environment Variables」
   - 必要な環境変数を設定

4. **デプロイ完了**
   - 自動ビルド・デプロイが実行される
   - 提供されるURLでアプリケーションにアクセス可能

## 技術スタック

### フロントエンド
- HTML5
- CSS3（レスポンシブデザイン）
- TypeScript
- Socket.IO Client

### バックエンド
- Node.js
- TypeScript
- Socket.IO Server
- Vercel Serverless Functions

### インフラ
- Vercel（ホスティング・サーバーレス実行環境）

## 注意点・制限事項

### 機能的制限
- メッセージは一時的な保存のみ（サーバー再起動で消失）
- 単一チャットルームのみ対応
- ファイル送信機能なし
- プライベートメッセージ機能なし

### 技術的制限
- Vercelサーバーレス関数の実行時間制限（10秒）
- WebSocket接続数の制限
- メッセージ履歴は最新100件まで
- 同時接続は50ユーザーまで

### セキュリティ制限
- ユーザー認証機能なし
- メッセージの暗号化なし
- 基本的なXSS対策のみ実装

## トラブルシューティング

### よくある問題

**接続できない場合**
- ブラウザのJavaScript有効化を確認
- ブラウザのコンソールでエラーメッセージを確認
- ネットワーク接続を確認

**メッセージが送信されない場合**
- 入力内容が制限（1-500文字）内か確認
- 送信頻度制限（1秒に3メッセージ）に抵触していないか確認
- WebSocket接続状態を確認

**デプロイエラーの場合**
- package.jsonの依存関係を確認
- TypeScript型エラーがないか確認
- vercel.json設定を確認

### ログ確認方法

**開発環境**
```bash
# サーバーログ
npm run dev  # コンソール出力を確認

# ブラウザログ
# F12開発者ツール → Console タブ
```

**本番環境（Vercel）**
- Vercelダッシュボード → プロジェクト → Functions → ログ表示

## 参考資料

- [Socket.IO Documentation](https://socket.io/docs/)
- [Vercel Documentation](https://vercel.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## ライセンス

MIT License

## 開発者情報

プロジェクト作成日: 2025-09-07  
開発モデル: ウォーターフォール（要件定義 → 基本設計 → 詳細設計 → 実装）