# 開発環境セットアップガイド

## 前提条件

### 必須ソフトウェア
- **Node.js**: v18.18.0 以上（推奨: v20.x LTS）
- **npm**: v9.0.0 以上（Node.js同梱）
- **Git**: v2.40.0 以上
- **Visual Studio Code**: 最新版（推奨エディタ）

### OS要件
- **Windows**: Windows 10 version 1903 以上（64bit）
- **macOS**: macOS 10.15 (Catalina) 以上
- **Linux**: Ubuntu 20.04 LTS 以上

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/tax-filenamechanger.git
cd tax-filenamechanger
```

### 2. 依存関係のインストール

```bash
# パッケージのインストール
npm install

# Electronのネイティブモジュールを再ビルド
npm run electron:rebuild
```

### 3. 環境設定

#### 3.1 環境変数の設定

`.env.development` ファイルを作成：

```bash
cp .env.example .env.development
```

`.env.development` の内容を編集：

```env
# アプリケーション設定
NODE_ENV=development
VITE_APP_VERSION=dev

# ログ設定
LOG_LEVEL=debug
LOG_PATH=./logs

# データベース設定
DB_PATH=./data/dev.db
DB_ENCRYPT=false

# 開発用設定
DEV_TOOLS=true
HOT_RELOAD=true
```

#### 3.2 VS Code設定

推奨拡張機能のインストール：

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension dsznajder.es7-react-js-snippets
code --install-extension formulahendry.auto-rename-tag
```

### 4. 開発サーバーの起動

```bash
# Electronアプリケーションの起動（開発モード）
npm run dev

# または個別に起動
npm run dev:renderer  # レンダラープロセスのみ
npm run dev:main     # メインプロセスのみ
```

### 5. ビルド確認

```bash
# 開発ビルド
npm run build

# 本番ビルド
npm run build:prod

# 配布用パッケージ作成
npm run dist
```

## 開発ツール

### Chrome DevTools

Electronアプリ内で `Ctrl+Shift+I` (Windows/Linux) または `Cmd+Opt+I` (macOS) で開発者ツールを開きます。

### React Developer Tools

```bash
# React DevTools Electronをインストール
npm install --save-dev react-devtools
```

package.json に追加：
```json
{
  "scripts": {
    "react-devtools": "react-devtools"
  }
}
```

### Redux DevTools

Redux DevTools Extension が自動的に有効化されます（開発環境のみ）。

## よくある問題と解決方法

### 1. better-sqlite3のビルドエラー

```bash
# node-gypの再インストール
npm install -g node-gyp

# ネイティブモジュールの再ビルド
npm run electron:rebuild
```

### 2. Windowsでの権限エラー

管理者権限でコマンドプロンプトを開いて実行：

```bash
npm install --global --production windows-build-tools
```

### 3. PDFプレビューが表示されない

```bash
# pdf.jsワーカーファイルのコピー
npm run copy:pdf-worker
```

### 4. ホットリロードが機能しない

```bash
# キャッシュクリア
npm run clean
npm install
npm run dev
```

## デバッグ設定

### VS Code デバッグ設定

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "args": ["."],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Renderer Process",
      "type": "chrome",
      "request": "attach",
      "port": 9223,
      "webRoot": "${workspaceFolder}/src/renderer",
      "timeout": 30000
    }
  ],
  "compounds": [
    {
      "name": "Debug All",
      "configurations": ["Debug Main Process", "Debug Renderer Process"]
    }
  ]
}
```

## テスト実行

```bash
# 単体テスト
npm test

# テストカバレッジ
npm run test:coverage

# E2Eテスト
npm run test:e2e

# 特定のテストファイルのみ実行
npm test -- --testPathPattern=PDFParser
```

## コード品質チェック

```bash
# ESLint
npm run lint

# ESLint自動修正
npm run lint:fix

# Prettier
npm run format

# TypeScript型チェック
npm run type-check
```

## Git フック設定

Husky による自動チェック：

```bash
# Husky設定
npm run prepare

# 手動でpre-commitフック実行
npm run pre-commit
```

## トラブルシューティング

### ログの確認

開発時のログ保存場所：
- Windows: `%APPDATA%/tax-filenamechanger-dev/logs/`
- macOS: `~/Library/Logs/tax-filenamechanger-dev/`
- Linux: `~/.config/tax-filenamechanger-dev/logs/`

### キャッシュクリア

```bash
# 全キャッシュクリア
npm run clean:all

# node_modulesも含めて完全クリーン
rm -rf node_modules package-lock.json
npm install
```

### ポート競合

デフォルトポート（3000）が使用中の場合：

```bash
# 別ポートで起動
PORT=3001 npm run dev
```

## 開発のベストプラクティス

### 1. ブランチ戦略

```bash
# 機能開発
git checkout -b feature/rename-logic

# バグ修正
git checkout -b fix/pdf-parse-error

# プルリクエスト前
npm run pre-push
```

### 2. コミットメッセージ

```
feat: PDF解析ロジックの実装
fix: ファイル名重複時のエラー修正
docs: README.mdの更新
test: PDFParserのテスト追加
refactor: ファイル監視処理のリファクタリング
```

### 3. 開発フロー

1. Issue作成またはアサイン
2. ブランチ作成
3. 開発・テスト
4. コード品質チェック
5. プルリクエスト作成
6. レビュー・マージ

## 参考リンク

- [Electron公式ドキュメント](https://www.electronjs.org/docs/latest)
- [React公式ドキュメント](https://react.dev/)
- [TypeScript公式ドキュメント](https://www.typescriptlang.org/docs/)
- [Vite公式ドキュメント](https://vitejs.dev/guide/)
- [Material-UI公式ドキュメント](https://mui.com/material-ui/getting-started/)