const path = require('path');
const fs = require('fs-extra');

// 本番のコンポーネントを直接使用
const { PDFParser } = require('../dist/main/services/PDFParser');
const { FileRenamer } = require('../dist/main/services/FileRenamer');

async function testRenameFunction() {
  console.log('=== 税務書類リネーム機能テスト ===\n');

  const testInputDir = path.join(__dirname, '..', 'sample', 'データ例', 'リネーム前');
  const testOutputDir = path.join(__dirname, '..', 'test-output-functional');

  try {
    // 出力ディレクトリの準備
    await fs.ensureDir(testOutputDir);
    console.log(`✅ 出力ディレクトリ作成: ${testOutputDir}`);

    // PDFファイルのリスト取得
    const files = await fs.readdir(testInputDir);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    
    console.log(`\n📁 テストファイル数: ${pdfFiles.length}`);

    // PDFパーサーとファイルリネーマーの初期化
    const pdfParser = new PDFParser();
    const fileRenamer = new FileRenamer();

    let successCount = 0;
    let failCount = 0;

    // 各ファイルを処理
    for (const file of pdfFiles) {
      const inputPath = path.join(testInputDir, file);
      console.log(`\n処理中: ${file}`);

      try {
        // PDFを解析
        const parsedDoc = await pdfParser.parse(inputPath);
        console.log(`  書類タイプ: ${parsedDoc.documentType || '不明'}`);
        console.log(`  会社名: ${parsedDoc.companyName || '不明'}`);
        console.log(`  期間コード: ${parsedDoc.fiscalYear || '不明'}`);
        
        // リネーム提案を取得
        const recommendedName = parsedDoc.recommendedName || `未分類_${file}`;
        console.log(`  推奨ファイル名: ${recommendedName}`);
        
        // ファイルをコピーしてリネーム
        const outputPath = path.join(testOutputDir, recommendedName);
        await fs.copy(inputPath, outputPath);
        console.log(`  ✅ リネーム成功: ${recommendedName}`);
        
        successCount++;
      } catch (error) {
        console.error(`  ❌ エラー: ${error.message}`);
        failCount++;
      }
    }

    // 結果サマリー
    console.log('\n=== テスト結果 ===');
    console.log(`成功: ${successCount}/${pdfFiles.length}`);
    console.log(`失敗: ${failCount}/${pdfFiles.length}`);
    console.log(`成功率: ${Math.round(successCount / pdfFiles.length * 100)}%`);
    
    // フォルダ振り分けの確認
    console.log('\n=== フォルダ振り分け結果 ===');
    const outputFiles = await fs.readdir(testOutputDir);
    const categories = {};
    
    outputFiles.forEach(file => {
      const category = file.split('_')[0];
      if (!categories[category]) categories[category] = 0;
      categories[category]++;
    });
    
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  ${cat}番台: ${count}ファイル`);
    });

  } catch (error) {
    console.error('テスト実行エラー:', error);
  }
}

// テスト実行
testRenameFunction().then(() => {
  console.log('\nテスト完了');
  process.exit(0);
}).catch(err => {
  console.error('致命的エラー:', err);
  process.exit(1);
});