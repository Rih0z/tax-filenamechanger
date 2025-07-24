#!/usr/bin/env node
/**
 * 税務書類自動リネームシステム - スタンドアロン実行スクリプト
 * これだけで実行可能な最小構成
 */

const fs = require('fs');
const path = require('path');

// =====================================
// コア機能実装（外部依存なし版）
// =====================================

// 書類種別定義
const DocumentType = {
  CORPORATE_TAX: '法人税申告書',
  CONSUMPTION_TAX: '消費税申告書',
  PREFECTURAL_TAX: '都道府県税申告書',
  MUNICIPAL_TAX: '市民税申告書',
  RECEIPT_NOTICE: '受信通知',
  PAYMENT_INFO: '納付情報',
  FINANCIAL_STATEMENT: '決算書',
  FIXED_ASSET: '固定資産',
  TAX_CLASSIFICATION: '税区分集計表',
  UNKNOWN: '不明'
};

// PDFファイル名解析クラス
class PDFParser {
  analyzeFileName(fileName) {
    const analysis = {
      documentType: DocumentType.UNKNOWN,
      companyName: null,
      fiscalYear: null,
      prefecture: null,
      municipality: null,
      confidence: 0
    };

    // e-Tax形式の解析
    const eTaxPattern = /^(.+?)_(\d{8})(.+?)_(\d{14})\.pdf$/;
    const eTaxMatch = fileName.match(eTaxPattern);
    
    if (eTaxMatch) {
      const docName = eTaxMatch[1];
      const fiscalDate = eTaxMatch[2];
      const company = eTaxMatch[3];
      
      // 決算期の抽出（YYYYMMDD -> YYMM）
      const year = fiscalDate.substring(2, 4);
      const month = fiscalDate.substring(4, 6);
      analysis.fiscalYear = year + month;
      analysis.companyName = company.replace(/\s+/g, '');
      analysis.confidence = 0.9;

      // 書類種別の判定
      if (docName.includes('法人税及び地方法人税申告書')) {
        analysis.documentType = DocumentType.CORPORATE_TAX;
      } else if (docName.includes('消費税申告書')) {
        analysis.documentType = DocumentType.CONSUMPTION_TAX;
      } else if (docName.includes('都道府県民税') || docName.includes('事業税')) {
        analysis.documentType = DocumentType.PREFECTURAL_TAX;
        const prefMatch = fileName.match(/^(.+?都|.+?道|.+?府|.+?県)/);
        if (prefMatch) {
          analysis.prefecture = prefMatch[1];
        }
      } else if (docName.includes('市町村民税') || docName.includes('市民税')) {
        analysis.documentType = DocumentType.MUNICIPAL_TAX;
        const munMatch = fileName.match(/^(.+?市|.+?町|.+?村)/);
        if (munMatch) {
          analysis.municipality = munMatch[1];
        }
      }
      
      return analysis;
    }

    // 手動命名パターンの解析
    if (fileName.includes('受信通知')) {
      analysis.documentType = DocumentType.RECEIPT_NOTICE;
      analysis.confidence = 0.8;
    } else if (fileName.includes('納付情報') || fileName.includes('脳情報')) {
      analysis.documentType = DocumentType.PAYMENT_INFO;
      analysis.confidence = 0.8;
    } else if (fileName.includes('決算書')) {
      analysis.documentType = DocumentType.FINANCIAL_STATEMENT;
      analysis.confidence = 0.8;
    } else if (fileName.includes('固定資産台帳')) {
      analysis.documentType = DocumentType.FIXED_ASSET;
      analysis.confidence = 0.8;
    } else if (fileName.includes('税区分集計表')) {
      analysis.documentType = DocumentType.TAX_CLASSIFICATION;
      analysis.confidence = 0.8;
    }

    return analysis;
  }
}

// ファイルリネーマークラス
class FileRenamer {
  generateSuggestedName(docType, companyName, fiscalYear, prefecture, municipality) {
    const docTypeMap = {
      [DocumentType.CORPORATE_TAX]: { number: '0001', name: '法人税及び地方法人税申告書' },
      [DocumentType.RECEIPT_NOTICE]: { number: '0003', name: '受信通知' },
      [DocumentType.PAYMENT_INFO]: { number: '0004', name: '納付情報' },
      [DocumentType.PREFECTURAL_TAX]: { number: '1000', name: '都道府県税申告書' },
      [DocumentType.MUNICIPAL_TAX]: { number: '2000', name: '市民税申告書' },
      [DocumentType.CONSUMPTION_TAX]: { number: '3001', name: '消費税及び地方消費税申告書' },
      [DocumentType.FINANCIAL_STATEMENT]: { number: '5001', name: '決算書' },
      [DocumentType.FIXED_ASSET]: { number: '6001', name: '固定資産台帳' },
      [DocumentType.TAX_CLASSIFICATION]: { number: '7001', name: '税区分集計表' }
    };

    const mapping = docTypeMap[docType];
    if (!mapping) {
      return null;
    }

    return `${mapping.number}_${mapping.name}_${fiscalYear}.pdf`;
  }

  getCategoryFolder(fileName) {
    const numberMatch = fileName.match(/^(\d{4})/);
    if (!numberMatch) {
      return 'その他';
    }

    const number = parseInt(numberMatch[1]);
    
    if (number >= 0 && number <= 999) {
      return '0000番台_法人税';
    } else if (number >= 1000 && number <= 1999) {
      return '1000番台_都道府県税';
    } else if (number >= 2000 && number <= 2999) {
      return '2000番台_市民税';
    } else if (number >= 3000 && number <= 3999) {
      return '3000番台_消費税';
    } else if (number >= 5000 && number <= 5999) {
      return '5000番台_決算書類';
    } else if (number >= 6000 && number <= 6999) {
      return '6000番台_固定資産';
    } else if (number >= 7000 && number <= 7999) {
      return '7000番台_税区分集計表';
    } else {
      return 'その他';
    }
  }

  async renameFile(oldPath, newName, targetFolder, createSubfolders = true) {
    try {
      // 元ファイルの存在確認
      if (!fs.existsSync(oldPath)) {
        return { success: false, error: 'ファイルが見つかりません' };
      }

      // カテゴリフォルダの決定
      const categoryFolder = createSubfolders ? this.getCategoryFolder(newName) : '';
      const fullTargetFolder = path.join(targetFolder, categoryFolder);

      // フォルダ作成
      if (!fs.existsSync(fullTargetFolder)) {
        fs.mkdirSync(fullTargetFolder, { recursive: true });
      }

      // 新しいパス
      const newPath = path.join(fullTargetFolder, newName);

      // バックアップ作成（オプション）
      const backupDir = path.join(targetFolder, '.backup');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupPath = path.join(backupDir, `${Date.now()}_${path.basename(oldPath)}`);
      fs.copyFileSync(oldPath, backupPath);

      // ファイル移動
      fs.renameSync(oldPath, newPath);

      return {
        success: true,
        oldPath,
        newPath,
        backupPath,
        categoryFolder
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// =====================================
// メイン処理
// =====================================

class TaxDocumentProcessor {
  constructor() {
    this.parser = new PDFParser();
    this.renamer = new FileRenamer();
    this.processedFiles = [];
  }

  async processFolder(inputFolder, outputFolder) {
    console.log('\n🚀 税務書類自動リネームシステム');
    console.log('=====================================\n');

    // フォルダの存在確認
    if (!fs.existsSync(inputFolder)) {
      console.error(`❌ エラー: 入力フォルダが見つかりません: ${inputFolder}`);
      return;
    }

    // 出力フォルダの作成
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // ファイル一覧取得
    const files = fs.readdirSync(inputFolder)
      .filter(file => file.toLowerCase().endsWith('.pdf') || file.toLowerCase().endsWith('.csv'));

    console.log(`📁 ${files.length}個のファイルを検出しました\n`);

    // 各ファイルを処理
    for (const file of files) {
      console.log(`\n🔍 処理中: ${file}`);
      
      // ファイル名解析
      const analysis = this.parser.analyzeFileName(file);
      console.log(`   種別: ${analysis.documentType}`);
      console.log(`   会社: ${analysis.companyName || 'N/A'}`);
      console.log(`   決算期: ${analysis.fiscalYear || 'N/A'}`);

      // 推奨名生成
      let suggestedName = null;
      if (analysis.documentType !== DocumentType.UNKNOWN) {
        suggestedName = this.renamer.generateSuggestedName(
          analysis.documentType,
          analysis.companyName || 'デフォルト株式会社',
          analysis.fiscalYear || '2407',
          analysis.prefecture,
          analysis.municipality
        );
      }

      if (suggestedName) {
        console.log(`   推奨名: ${suggestedName}`);

        // リネーム実行
        const oldPath = path.join(inputFolder, file);
        const result = await this.renamer.renameFile(oldPath, suggestedName, outputFolder);

        if (result.success) {
          console.log(`   ✅ 成功: ${result.categoryFolder}/${suggestedName}`);
          this.processedFiles.push({
            original: file,
            renamed: suggestedName,
            category: result.categoryFolder,
            success: true
          });
        } else {
          console.log(`   ❌ 失敗: ${result.error}`);
          this.processedFiles.push({
            original: file,
            error: result.error,
            success: false
          });
        }
      } else {
        console.log(`   ⚠️  スキップ: 推奨名を生成できませんでした`);
      }
    }

    // 処理結果サマリー
    this.showSummary();
  }

  showSummary() {
    console.log('\n=====================================');
    console.log('📊 処理結果サマリー');
    console.log('=====================================\n');

    const successCount = this.processedFiles.filter(f => f.success).length;
    const totalCount = this.processedFiles.length;
    const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

    console.log(`処理ファイル数: ${totalCount}`);
    console.log(`成功: ${successCount}`);
    console.log(`失敗: ${totalCount - successCount}`);
    console.log(`成功率: ${successRate}%\n`);

    // カテゴリ別統計
    const categories = {};
    this.processedFiles.filter(f => f.success).forEach(file => {
      const cat = file.category || 'その他';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    console.log('カテゴリ別:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}件`);
    });
  }
}

// =====================================
// コマンドライン実行
// =====================================

function showUsage() {
  console.log(`
使用方法:
  node standalone-runner.js <入力フォルダ> <出力フォルダ>

例:
  node standalone-runner.js C:\\Downloads C:\\TaxDocs\\Output
  node standalone-runner.js ./input ./output

オプション:
  --help    このヘルプを表示
  --demo    デモモードで実行（サンプルファイルを使用）
`);
}

async function runDemo() {
  console.log('🎭 デモモード実行中...\n');
  
  // デモ用のサンプルファイル名
  const demoFiles = [
    '法人税及び地方法人税申告書_20240731メトロノーム株式会社_20250720130102.pdf',
    '消費税申告書_20240731メトロノーム株式会社_20250720130433.pdf',
    '東京都　法人都道府県民税・事業税・特別法人事業税又は地方法人特別税　確定申告_20240731メトロノーム　株式会社_20250720133418.pdf',
    '決算書_20250720_1535.pdf',
    '法人税　受信通知.pdf'
  ];

  const parser = new PDFParser();
  const renamer = new FileRenamer();

  console.log('📋 デモファイル処理結果:\n');
  
  demoFiles.forEach(file => {
    const analysis = parser.analyzeFileName(file);
    const suggestedName = analysis.documentType !== DocumentType.UNKNOWN
      ? renamer.generateSuggestedName(
          analysis.documentType,
          analysis.companyName || 'デフォルト株式会社',
          analysis.fiscalYear || '2407'
        )
      : null;

    console.log(`📄 ${file}`);
    console.log(`   → ${suggestedName || '(推奨名なし)'}`);
    console.log(`   📁 ${suggestedName ? renamer.getCategoryFolder(suggestedName) : 'その他'}\n`);
  });
}

// メイン実行
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    showUsage();
    return;
  }

  if (args.includes('--demo')) {
    await runDemo();
    return;
  }

  if (args.length < 2) {
    console.error('❌ エラー: 入力フォルダと出力フォルダを指定してください');
    showUsage();
    return;
  }

  const inputFolder = path.resolve(args[0]);
  const outputFolder = path.resolve(args[1]);

  const processor = new TaxDocumentProcessor();
  await processor.processFolder(inputFolder, outputFolder);
}

// エントリーポイント
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 実行エラー:', error.message);
    process.exit(1);
  });
}

module.exports = { PDFParser, FileRenamer, TaxDocumentProcessor };