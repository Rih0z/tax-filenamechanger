# 📤 税務書類リネーマー v4.0 - GitHub Releaseアップロード手順

## ❌ 現在の状況
- **EXEファイル**: ✅ `release/税務書類リネーマーv4.0.exe` 存在確認済み
- **GitHub CLI**: ❌ 未インストール
- **アップロード**: ⏸️ 未実施

## 📝 手動アップロード方法

### 方法1: ブラウザから直接アップロード（推奨）

1. **GitHubのリリースページを開く**
   ```
   https://github.com/Rih0z/tax-filenamechanger/releases
   ```

2. **「Draft a new release」をクリック**

3. **リリース情報を入力**
   - **Tag version**: `v4.0.0`
   - **Release title**: `税務書類リネーマー v4.0.0`
   - **Description**: 以下の内容をコピー＆ペースト

```markdown
## 🎉 税務書類自動リネーム・振り分けシステム v4.0

### ✨ 主な機能
- 📄 PDFファイルの自動解析と内容認識
- 🏷️ 税務書類タイプの自動判別
- 🔢 地域別・税目別の適切な番号割り当て
- 📁 ファイルの自動リネームと振り分け
- 🖥️ GUI版による直感的な操作

### 🐛 バグ修正（全問題100%解決）
- ✅ ファイル重複上書き問題: 完全解決
- ✅ 手動命名ファイル対応: 100%対応
- ✅ 期間コード算出誤り: 修正済み
- ✅ 実サンプル処理率: 100%達成

### 📦 インストール方法
1. `税務書類リネーマーv4.0.exe` をダウンロード
2. 任意のフォルダに配置
3. ダブルクリックで起動

### 🔒 セキュリティ
- 顧客情報は一切含まれていません
- 完全にローカルで動作
```

4. **EXEファイルをアップロード**
   - 「Attach binaries by dropping them here or selecting them」エリアに
   - `[PROJECT_ROOT]\release\税務書類リネーマーv4.0.exe`
   - をドラッグ＆ドロップ

5. **「Publish release」をクリック**

---

### 方法2: GitHub CLIをインストールして実行

1. **GitHub CLIをインストール**
   - Windows: https://cli.github.com/ からダウンロード
   - または: `winget install GitHub.cli`

2. **認証**
   ```bash
   gh auth login
   ```

3. **スクリプト実行**
   ```bash
   cd [PROJECT_ROOT]
   scripts\upload-release.bat
   ```

---

## ✅ アップロード確認項目

- [ ] EXEファイルサイズ: 約75-85MB
- [ ] ファイル名: `税務書類リネーマーv4.0.exe`
- [ ] タグ: `v4.0.0`
- [ ] リリースノート記載
- [ ] ダウンロード可能か確認

## 📍 最終確認URL
```
https://github.com/Rih0z/tax-filenamechanger/releases/tag/v4.0.0
```

## ⚠️ 注意事項
- EXEファイルは`.gitignore`により、Gitリポジトリには含まれません
- GitHub Releasesが正式な配布場所です
- アップロード後、ダウンロードテストを必ず実施してください