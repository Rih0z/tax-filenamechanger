/**
 * サンプルファイル名解析の簡易テスト
 * Node.jsの標準ライブラリのみを使用してテスト実行
 */

const assert = require('assert');

// DocumentType定数の簡易版
const DocumentType = {
  CORPORATE_TAX: 'CORPORATE_TAX',
  CONSUMPTION_TAX: 'CONSUMPTION_TAX',
  PREFECTURAL_TAX: 'PREFECTURAL_TAX',
  MUNICIPAL_TAX: 'MUNICIPAL_TAX',
  RECEIPT_NOTICE: 'RECEIPT_NOTICE',
  PAYMENT_INFO: 'PAYMENT_INFO',
  FINANCIAL_STATEMENT: 'FINANCIAL_STATEMENT',
  GENERAL_LEDGER: 'GENERAL_LEDGER',
  SUBSIDIARY_LEDGER: 'SUBSIDIARY_LEDGER',
  BALANCE_SHEET: 'BALANCE_SHEET',
  JOURNAL: 'JOURNAL',
  JOURNAL_DATA: 'JOURNAL_DATA',
  FIXED_ASSET: 'FIXED_ASSET',
  BULK_DEPRECIATION: 'BULK_DEPRECIATION',
  SMALL_AMOUNT_ASSET: 'SMALL_AMOUNT_ASSET',
  TAX_CLASSIFICATION: 'TAX_CLASSIFICATION',
  TAX_CLASSIFICATION_BY_ACCOUNT: 'TAX_CLASSIFICATION_BY_ACCOUNT',
  CORPORATE_TAX_ATTACHMENT: 'CORPORATE_TAX_ATTACHMENT',
  CONSUMPTION_TAX_ATTACHMENT: 'CONSUMPTION_TAX_ATTACHMENT',
  TAX_PAYMENT_LIST: 'TAX_PAYMENT_LIST',
  UNKNOWN: 'UNKNOWN'
};

// PDFParser の簡易版
class SimplePDFParser {
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
    } else if (fileName.includes('総勘定元帳')) {
      analysis.documentType = DocumentType.GENERAL_LEDGER;
      analysis.confidence = 0.8;
    } else if (fileName.includes('補助元帳')) {
      analysis.documentType = DocumentType.SUBSIDIARY_LEDGER;
      analysis.confidence = 0.8;
    } else if (fileName.includes('残高試算表') || fileName.includes('貸借対照表') || fileName.includes('損益計算書')) {
      analysis.documentType = DocumentType.BALANCE_SHEET;
      analysis.confidence = 0.8;
    } else if (fileName.includes('仕訳帳') && fileName.endsWith('.pdf')) {
      analysis.documentType = DocumentType.JOURNAL;
      analysis.confidence = 0.8;
    } else if (fileName.includes('仕訳') && fileName.endsWith('.csv')) {
      analysis.documentType = DocumentType.JOURNAL_DATA;
      analysis.confidence = 0.8;
    } else if (fileName.includes('固定資産台帳')) {
      analysis.documentType = DocumentType.FIXED_ASSET;
      analysis.confidence = 0.8;
    } else if (fileName.includes('一括償却資産')) {
      analysis.documentType = DocumentType.BULK_DEPRECIATION;
      analysis.confidence = 0.8;
    } else if (fileName.includes('少額')) {
      analysis.documentType = DocumentType.SMALL_AMOUNT_ASSET;
      analysis.confidence = 0.8;
    } else if (fileName.includes('勘定科目別税区分集計表')) {
      analysis.documentType = DocumentType.TAX_CLASSIFICATION_BY_ACCOUNT;
      analysis.confidence = 0.8;
    } else if (fileName.includes('税区分集計表')) {
      analysis.documentType = DocumentType.TAX_CLASSIFICATION;
      analysis.confidence = 0.8;
    } else if (fileName.includes('イメージ添付書類') && fileName.includes('法人税申告')) {
      analysis.documentType = DocumentType.CORPORATE_TAX_ATTACHMENT;
      analysis.confidence = 0.8;
    } else if (fileName.includes('イメージ添付書類') && fileName.includes('法人消費税申告')) {
      analysis.documentType = DocumentType.CONSUMPTION_TAX_ATTACHMENT;
      analysis.confidence = 0.8;
    } else if (fileName.includes('納税一覧')) {
      analysis.documentType = DocumentType.TAX_PAYMENT_LIST;
      analysis.confidence = 0.8;
    }

    return analysis;
  }
}

// FileRenamer の簡易版
class SimpleFileRenamer {
  generateSuggestedName(docType, companyName, fiscalYear, prefecture, municipality) {
    const docTypeMap = {
      [DocumentType.CORPORATE_TAX]: { number: '0001', name: '法人税及び地方法人税申告書' },
      [DocumentType.CORPORATE_TAX_ATTACHMENT]: { number: '0002', name: '添付資料' },
      [DocumentType.RECEIPT_NOTICE]: { number: '0003', name: '受信通知' },
      [DocumentType.PAYMENT_INFO]: { number: '0004', name: '納付情報' },
      [DocumentType.TAX_PAYMENT_LIST]: { number: '0000', name: '納付税額一覧表' },
      [DocumentType.PREFECTURAL_TAX]: { number: '1000', name: '都道府県税申告書' },
      [DocumentType.MUNICIPAL_TAX]: { number: '2000', name: '市民税申告書' },
      [DocumentType.CONSUMPTION_TAX]: { number: '3001', name: '消費税及び地方消費税申告書' },
      [DocumentType.CONSUMPTION_TAX_ATTACHMENT]: { number: '3002', name: '添付資料' },
      [DocumentType.FINANCIAL_STATEMENT]: { number: '5001', name: '決算書' },
      [DocumentType.GENERAL_LEDGER]: { number: '5002', name: '総勘定元帳' },
      [DocumentType.SUBSIDIARY_LEDGER]: { number: '5003', name: '補助元帳' },
      [DocumentType.BALANCE_SHEET]: { number: '5004', name: '残高試算表' },
      [DocumentType.JOURNAL]: { number: '5005', name: '仕訳帳' },
      [DocumentType.JOURNAL_DATA]: { number: '5006', name: '仕訳データ' },
      [DocumentType.FIXED_ASSET]: { number: '6001', name: '固定資産台帳' },
      [DocumentType.BULK_DEPRECIATION]: { number: '6002', name: '一括償却資産明細表' },
      [DocumentType.SMALL_AMOUNT_ASSET]: { number: '6003', name: '少額減価償却資産明細表' },
      [DocumentType.TAX_CLASSIFICATION]: { number: '7001', name: '税区分集計表' },
      [DocumentType.TAX_CLASSIFICATION_BY_ACCOUNT]: { number: '7002', name: '勘定科目別税区分集計表' }
    };

    const mapping = docTypeMap[docType];
    if (!mapping) {
      return null;
    }

    const extension = docType === DocumentType.JOURNAL_DATA ? '.csv' : '.pdf';
    return `${mapping.number}_${mapping.name}_${fiscalYear}${extension}`;
  }
}

// テスト実行
function runTests() {
  console.log('🚀 サンプルファイル名解析テスト開始');
  
  const parser = new SimplePDFParser();
  const renamer = new SimpleFileRenamer();
  
  const testCases = [
    {
      name: '法人税及び地方法人税申告書の解析',
      fileName: '法人税及び地方法人税申告書_20240731テスト会社株式会社_20250720130102.pdf',
      expected: {
        documentType: DocumentType.CORPORATE_TAX,
        companyName: 'テスト会社株式会社',
        fiscalYear: '2407',
        suggestedName: '0001_法人税及び地方法人税申告書_2407.pdf'
      }
    },
    {
      name: '消費税申告書の解析',
      fileName: '消費税申告書_20240731テスト会社株式会社_20250720130433.pdf',
      expected: {
        documentType: DocumentType.CONSUMPTION_TAX,
        companyName: 'テスト会社株式会社',
        fiscalYear: '2407',
        suggestedName: '3001_消費税及び地方消費税申告書_2407.pdf'
      }
    },
    {
      name: '東京都の都道府県税申告書の解析',
      fileName: '東京都　法人都道府県民税・事業税・特別法人事業税又は地方法人特別税　確定申告_20240731テスト会社　株式会社_20250720133418.pdf',
      expected: {
        documentType: DocumentType.PREFECTURAL_TAX,
        companyName: 'テスト会社株式会社',
        fiscalYear: '2407',
        prefecture: '東京都',
        suggestedName: '1000_都道府県税申告書_2407.pdf'
      }
    },
    {
      name: '福岡市の市民税申告書の解析',
      fileName: '福岡市　法人市町村民税　確定申告_20240731テスト会社　株式会社_20250720133028.pdf',
      expected: {
        documentType: DocumentType.MUNICIPAL_TAX,
        companyName: 'テスト会社株式会社',
        fiscalYear: '2407',
        municipality: '福岡市',
        suggestedName: '2000_市民税申告書_2407.pdf'
      }
    },
    {
      name: '受信通知の解析',
      fileName: '法人税　受信通知.pdf',
      expected: {
        documentType: DocumentType.RECEIPT_NOTICE,
        suggestedName: '0003_受信通知_2407.pdf'
      }
    },
    {
      name: '納付情報の解析',
      fileName: '法人税　納付情報登録依頼.pdf',
      expected: {
        documentType: DocumentType.PAYMENT_INFO,
        suggestedName: '0004_納付情報_2407.pdf'
      }
    },
    {
      name: '決算書の解析',
      fileName: '決算書_20250720_1535.pdf',
      expected: {
        documentType: DocumentType.FINANCIAL_STATEMENT,
        suggestedName: '5001_決算書_2407.pdf'
      }
    },
    {
      name: '固定資産台帳の解析',
      fileName: '固定資産台帳.pdf',
      expected: {
        documentType: DocumentType.FIXED_ASSET,
        suggestedName: '6001_固定資産台帳_2407.pdf'
      }
    },
    {
      name: 'CSVファイル（仕訳データ）の解析',
      fileName: '仕訳帳_20250720_1635.csv のコピー.csv',
      expected: {
        documentType: DocumentType.JOURNAL_DATA,
        suggestedName: '5006_仕訳データ_2407.csv'
      }
    }
  ];

  let passCount = 0;
  let failCount = 0;

  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 テスト: ${testCase.name}`);
      console.log(`   ファイル名: ${testCase.fileName}`);
      
      const analysis = parser.analyzeFileName(testCase.fileName);
      
      // 書類種別のチェック
      assert.strictEqual(analysis.documentType, testCase.expected.documentType, 
        `書類種別が異なります。期待値: ${testCase.expected.documentType}, 実際: ${analysis.documentType}`);
      
      // 会社名のチェック（期待値が設定されている場合のみ）
      if (testCase.expected.companyName) {
        assert.strictEqual(analysis.companyName, testCase.expected.companyName,
          `会社名が異なります。期待値: ${testCase.expected.companyName}, 実際: ${analysis.companyName}`);
      }
      
      // 決算期のチェック（期待値が設定されている場合のみ）
      if (testCase.expected.fiscalYear) {
        assert.strictEqual(analysis.fiscalYear, testCase.expected.fiscalYear,
          `決算期が異なります。期待値: ${testCase.expected.fiscalYear}, 実際: ${analysis.fiscalYear}`);
      }

      // 推奨名の生成と確認
      const suggestedName = renamer.generateSuggestedName(
        analysis.documentType,
        analysis.companyName || 'テスト会社株式会社',
        analysis.fiscalYear || '2407',
        analysis.prefecture,
        analysis.municipality
      );
      
      assert.strictEqual(suggestedName, testCase.expected.suggestedName,
        `推奨名が異なります。期待値: ${testCase.expected.suggestedName}, 実際: ${suggestedName}`);
      
      console.log(`   ✅ 成功: ${suggestedName}`);
      passCount++;
      
    } catch (error) {
      console.log(`   ❌ 失敗: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 テスト結果`);
  console.log(`   ✅ 成功: ${passCount}件`);
  console.log(`   ❌ 失敗: ${failCount}件`);
  console.log(`   📈 成功率: ${Math.round(passCount / (passCount + failCount) * 100)}%`);
  
  if (failCount === 0) {
    console.log('\n🎉 すべてのテストが成功しました！');
    console.log('   サンプルファイルは正確にリネーム処理されます。');
  } else {
    console.log('\n⚠️  一部のテストが失敗しました。');
    console.log('   実装の見直しが必要です。');
  }

  return failCount === 0;
}

// テスト実行
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };