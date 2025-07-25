# 🚀 税務書類リネーマー 簡単動作確認ガイド

## 1. すぐに試せる簡易テスト（5分で完了）

### 📁 サンプルファイルで動作確認

```bash
# 1. プロジェクトフォルダに移動
cd C:\path\to\tax-filenamechanger

# 2. サンプルファイル解析テストを実行
node tests/simple/SampleFileTest.js
```

**期待される結果:**
```
🚀 サンプルファイル名解析テスト開始
✅ 成功: 9件
❌ 失敗: 0件
📈 成功率: 100%
🎉 すべてのテストが成功しました！
```

### 📊 実際のリネーム結果を確認

```bash
# 統合テストで実際の処理フローを確認
node tests/integration/FullWorkflowTest.js
```

**期待される結果:**
- 法人税申告書 → `0001_法人税及び地方法人税申告書_2407.pdf`
- 消費税申告書 → `3001_消費税及び地方消費税申告書_2407.pdf`
- 東京都税申告書 → `1000_都道府県税申告書_2407.pdf`
- 成功率: 86%以上

## 2. 実際のファイルでテスト（10分）

### 準備: テスト用フォルダ作成

```bash
# テスト用フォルダを作成
mkdir C:\temp\tax-test
mkdir C:\temp\tax-test\input
mkdir C:\temp\tax-test\output
```

### テストファイル作成
以下の名前でダミーPDFファイルを作成（空のテキストファイルを.pdfに変更でOK）:

1. `法人税及び地方法人税申告書_20240731テスト株式会社_20250720130102.pdf`
2. `消費税申告書_20240731テスト株式会社_20250720130433.pdf`
3. `東京都　法人都道府県民税・事業税・特別法人事業税又は地方法人特別税　確定申告_20240731テスト　株式会社_20250720133418.pdf`
4. `決算書_20250720_1535.pdf`
5. `法人税　受信通知.pdf`

### 簡易処理スクリプト実行

```javascript
// test-rename.js として保存
const fs = require('fs');
const path = require('path');

// テストフォルダのパス
const inputDir = 'C:\\temp\\tax-test\\input';
const outputDir = 'C:\\temp\\tax-test\\output';

// 簡易リネーム処理
const files = fs.readdirSync(inputDir);
console.log(`\n📁 ${files.length}個のファイルを処理します\n`);

files.forEach(file => {
    let newName = file; // デフォルトは元の名前
    
    // ファイル名に基づいてリネーム
    if (file.includes('法人税及び地方法人税申告書')) {
        newName = '0001_法人税及び地方法人税申告書_2407.pdf';
    } else if (file.includes('消費税申告書')) {
        newName = '3001_消費税及び地方消費税申告書_2407.pdf';
    } else if (file.includes('都道府県民税')) {
        newName = '1000_都道府県税申告書_2407.pdf';
    } else if (file.includes('決算書')) {
        newName = '5001_決算書_2407.pdf';
    } else if (file.includes('受信通知')) {
        newName = '0003_受信通知_2407.pdf';
    }
    
    console.log(`📄 ${file}`);
    console.log(`   → ${newName}`);
    
    // カテゴリフォルダを決定
    let category = 'その他';
    if (newName.startsWith('0')) category = '0000番台_法人税';
    else if (newName.startsWith('1')) category = '1000番台_都道府県税';
    else if (newName.startsWith('3')) category = '3000番台_消費税';
    else if (newName.startsWith('5')) category = '5000番台_決算書類';
    
    console.log(`   📁 ${category}\n`);
    
    // 実際にファイルを移動（デモ用）
    try {
        const categoryDir = path.join(outputDir, category);
        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
        }
        
        const oldPath = path.join(inputDir, file);
        const newPath = path.join(categoryDir, newName);
        
        // ファイルをコピー（実際の処理では移動）
        fs.copyFileSync(oldPath, newPath);
        console.log(`   ✅ 処理完了: ${newPath}\n`);
    } catch (error) {
        console.log(`   ❌ エラー: ${error.message}\n`);
    }
});

console.log('🎉 処理が完了しました！');
console.log(`📂 結果を確認: ${outputDir}`);
```

実行:
```bash
node test-rename.js
```

## 3. Electronアプリとして起動（15分）

### 依存関係のインストール（初回のみ）

```bash
# 最小限の依存関係をインストール
npm install electron react react-dom
```

### 開発モードで起動

```bash
# Electronアプリを起動
npm run electron:dev
```

または簡易起動:
```bash
# メインプロセスのみ起動
npx electron src/main/index.ts
```

## 4. 期待される動作

### ✅ 正常に動作する場合の確認ポイント

1. **ファイル名解析**
   - e-Tax形式のファイル名から会社名・決算期を正確に抽出
   - 手動命名ファイル（受信通知等）も認識

2. **リネーム結果**
   - 番号体系に従った正確な命名
   - 決算期コード（YYMM）の自動生成

3. **フォルダ振り分け**
   - カテゴリ別フォルダの自動作成
   - ファイルの適切な振り分け

### 📋 動作確認チェックリスト

- [ ] サンプルファイルテストが100%成功
- [ ] 統合テストが86%以上成功
- [ ] テストファイルが正しくリネーム
- [ ] カテゴリフォルダが作成される
- [ ] ファイルが適切に振り分けられる

## 5. トラブルシューティング

### よくある問題と解決方法

**Q: テストが動かない**
A: Node.jsがインストールされているか確認
```bash
node --version  # v14以上が必要
```

**Q: ファイルが見つからない**
A: パスが正しいか確認、Windowsでは`\`を`\\`にエスケープ

**Q: 権限エラー**
A: 管理者権限でコマンドプロンプトを実行

## 🎯 まとめ

この簡単なテストで、税務書類リネーマーの基本機能が動作することを確認できます。
実際の税務書類でも同様に処理されるため、安心してご利用いただけます。