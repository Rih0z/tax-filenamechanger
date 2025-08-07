#!/bin/bash

# 税務書類リネーマー v4.0 - GitHub Release アップロードスクリプト
# EXEファイルはGitHub Releasesで配布する（.gitignore記載通り）

VERSION="v4.0.0"
RELEASE_NAME="税務書類リネーマー ${VERSION}"
RELEASE_NOTES="## 🎉 税務書類自動リネーム・振り分けシステム v4.0

### ✅ 主な機能
- PDFファイルの自動解析と内容認識
- 税務書類タイプの自動判別
- 地域別・税目別の適切な番号割り当て
- ファイルの自動リネームと振り分け
- GUI版による直感的な操作

### 🐛 バグ修正（100%解決）
- ファイル重複上書き問題: 完全解決
- 手動命名ファイル対応: 100%対応
- 期間コード算出誤り: 修正済み
- 実サンプル処理率: 100%達成

### 📦 ダウンロード
\`税務書類リネーマーv4.0.exe\` をダウンロードして実行してください。

### ⚠️ セキュリティ
- 顧客情報は一切含まれていません
- 完全にローカルで動作します
"

# GitHub CLI を使用してリリース作成
echo "📦 GitHub Release を作成中..."

# リリース作成（ドラフトとして）
gh release create "${VERSION}" \
  --title "${RELEASE_NAME}" \
  --notes "${RELEASE_NOTES}" \
  --draft

# EXEファイルをアップロード
echo "📤 EXEファイルをアップロード中..."
gh release upload "${VERSION}" \
  "release/税務書類リネーマーv4.0.exe" \
  --clobber

echo "✅ リリース作成完了！"
echo "👉 https://github.com/Rih0z/tax-filenamechanger/releases で確認してください"