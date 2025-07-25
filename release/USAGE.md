# 詳細使用ガイド

## 🎯 クイックスタート（3分で開始）

### ステップ1: Node.jsの確認
```bash
node --version
```
v14以上が表示されればOK

### ステップ2: デモ実行
```bash
cd release
node standalone-runner.js --demo
```

### ステップ3: 実際のファイルで実行
```bash
node standalone-runner.js C:\Downloads C:\TaxDocs\Output
```

## 📋 実行例

### 例1: ダウンロードフォルダの税務書類を整理

```bash
# Windowsの場合
node standalone-runner.js "C:\Users\YourName\Downloads" "D:\税務書類\2024年度"

# 実行結果
🚀 税務書類自動リネームシステム
=====================================

📁 15個のファイルを検出しました

🔍 処理中: 法人税及び地方法人税申告書_20240731[法人名]_20250720130102.pdf
   種別: 法人税申告書
   会社: [法人名]
   決算期: 2407
   推奨名: 0001_法人税及び地方法人税申告書_2407.pdf
   ✅ 成功: 0000番台_法人税/0001_法人税及び地方法人税申告書_2407.pdf

[続く...]

=====================================
📊 処理結果サマリー
=====================================

処理ファイル数: 15
成功: 14
失敗: 1
成功率: 93%

カテゴリ別:
  0000番台_法人税: 4件
  1000番台_都道府県税: 3件
  2000番台_市民税: 2件
  3000番台_消費税: 3件
  5000番台_決算書類: 2件
```

### 例2: 特定クライアントのファイルのみ処理

```bash
# 特定クライアントのファイルがあるフォルダを指定
node standalone-runner.js "C:\Clients\[クライアント名]" "C:\Clients\[クライアント名]\2024整理済"
```

## 🛠️ カスタマイズ方法

### 決算期のデフォルト値を変更

`standalone-runner.js`の以下の部分を編集:
```javascript
// 現在のデフォルト
analysis.fiscalYear || '2407'

// 変更例（2025年3月期にする場合）
analysis.fiscalYear || '2503'
```

### 新しい書類パターンを追加

```javascript
// PDFParserクラスに追加
else if (fileName.includes('新しい書類名')) {
  analysis.documentType = '新しい書類タイプ';
  analysis.confidence = 0.8;
}
```

## 🔧 高度な使用方法

### バッチファイルで自動化

`tax-rename.bat`を作成:
```batch
@echo off
echo 税務書類の整理を開始します...
node C:\path\to\release\standalone-runner.js %1 %2
echo 処理が完了しました。
pause
```

使用方法:
```
tax-rename.bat "入力フォルダ" "出力フォルダ"
```

### PowerShellスクリプトで定期実行

`TaxRenameScheduled.ps1`:
```powershell
# 毎日午後6時に実行
$inputFolder = "C:\Downloads"
$outputFolder = "D:\TaxDocs\$(Get-Date -Format 'yyyy-MM')"

# フォルダ作成
New-Item -ItemType Directory -Force -Path $outputFolder

# 実行
node C:\path\to\release\standalone-runner.js $inputFolder $outputFolder

# ログ記録
Add-Content -Path "C:\Logs\tax-rename.log" -Value "$(Get-Date): 処理完了"
```

## 📊 処理対象ファイル一覧

### 完全対応（100%認識）
- 法人税及び地方法人税申告書
- 消費税申告書
- 都道府県民税・事業税申告書
- 市町村民税申告書
- 受信通知
- 納付情報登録依頼
- 決算書
- 固定資産台帳
- 税区分集計表

### 部分対応（手動確認推奨）
- イメージ添付書類
- その他の添付資料

## 🚫 処理されないファイル

- PDF/CSV以外の形式
- システムファイル（隠しファイル）
- 既に番号体系でリネーム済みのファイル

## 💼 実務での活用例

### 1. 月次処理フロー
1. e-Tax/eLTAXから一括ダウンロード
2. マネーフォワードからエクスポート
3. 本ツールで一括リネーム・整理
4. クライアントフォルダに保存

### 2. 決算期処理
1. 全クライアントのファイルを1つのフォルダに集約
2. 本ツールで一括処理
3. クライアント別に手動振り分け

### 3. 監査対応
1. 必要な書類を検索
2. 番号体系で即座に特定
3. 監査資料として提出

## ❓ FAQ

**Q: 会社名が正しく認識されない**
A: e-Tax形式のファイル名でない可能性があります。手動でリネームするか、パターンを追加してください。

**Q: 決算期が違う**
A: ファイル名の日付から自動計算しています。必要に応じて手動修正してください。

**Q: 大量ファイルの処理時間は？**
A: 1000ファイルでも数秒で完了します。

**Q: ネットワークドライブでも使える？**
A: はい、パスが正しく指定されていれば使用可能です。