console.log('=== バグ検証テストの問題分析 ===');

// 現在のバグ検証テストのgetDocumentTypeメソッド（不完全版）
function bugVerificationGetDocumentType(filename, content = '') {
  if (filename.includes('法人税申告') || content.includes('法人税及び地方法人税')) {
    return { type: '法人税及び地方法人税申告書', baseCode: '0001' };
  }
  if (filename.includes('法人消費税申告') || content.includes('消費税及び地方消費税')) {
    return { type: '消費税及び地方消費税申告書', baseCode: '3001' };
  }
  if (filename.includes('都道府県民税') || content.includes('都道府県民税')) {
    return { type: '都道府県税申告書', baseCode: '1000' };
  }
  if (filename.includes('受信通知')) {
    return { type: '受信通知', baseCode: '0003' };
  }
  if (filename.includes('納付情報')) {
    return { type: '納付情報', baseCode: '0004' };
  }
  return { type: '不明', baseCode: '9999' };  // 問題：多くの書類タイプが未対応
}

// 実際のPDFParserの実装（完全版）
function actualPDFParserGetDocumentType(fileName) {
  if (fileName.includes('受信通知')) return 'RECEIPT_NOTICE';
  if (fileName.includes('納付情報') || fileName.includes('納付区分') || fileName.includes('脳情報')) return 'PAYMENT_INFO';
  if (fileName.includes('一括償却')) return 'LUMP_SUM_DEPRECIATION';  // ← 重要：これが欠けている
  if (fileName.includes('少額')) return 'SMALL_AMOUNT_DEPRECIATION';     // ← 重要：これが欠けている
  if (fileName.includes('固定資産台帳')) return 'FIXED_ASSET_LEDGER';
  if (fileName.includes('納税一覧')) return 'TAX_PAYMENT_LIST';         // ← 重要：これが欠けている
  if (fileName.includes('仕訳帳')) return 'JOURNAL';                   // ← 重要：これが欠けている
  if (fileName.includes('総勘定元帳')) return 'GENERAL_LEDGER';         // ← 重要：これが欠けている
  if (fileName.includes('補助元帳')) return 'SUBSIDIARY_LEDGER';        // ← 重要：これが欠けている
  if (fileName.includes('残高試算表')) return 'FINANCIAL_STATEMENT';    // ← 重要：これが欠けている
  if (fileName.includes('イメージ添付')) return 'ATTACHMENT';
  return 'UNKNOWN';
}

console.log('=== 失敗ファイルのテスト ===');
const failedFiles = [
  '一括償却資産明細.pdf',
  '仕訳帳_20250720_1541.pdf',
  '少額.pdf',
  '残高試算表_貸借対照表_損益計算書_20250720_1538.pdf',
  '納税一覧.pdf',
  '総勘定元帳_20250720_1537.pdf',
  '補助元帳_20250720_1537.pdf'
];

console.log('\n現在のバグ検証テスト（不完全版）での結果:');
let bugTestSuccessCount = 0;
failedFiles.forEach(file => {
  const result = bugVerificationGetDocumentType(file);
  const success = result.baseCode !== '9999';
  if (success) bugTestSuccessCount++;
  console.log(`${success ? '✅' : '❌'} ${file} -> ${result.type} (${result.baseCode})`);
});

console.log('\n実際のPDFParser実装での結果:');
let actualSuccessCount = 0;
failedFiles.forEach(file => {
  const result = actualPDFParserGetDocumentType(file);
  const success = result !== 'UNKNOWN';
  if (success) actualSuccessCount++;
  console.log(`${success ? '✅' : '❌'} ${file} -> ${result}`);
});

console.log('\n=== 結論 ===');
console.log(`バグ検証テスト成功率: ${Math.round((bugTestSuccessCount / failedFiles.length) * 100)}% (${bugTestSuccessCount}/${failedFiles.length})`);
console.log(`実際のPDFParser成功率: ${Math.round((actualSuccessCount / failedFiles.length) * 100)}% (${actualSuccessCount}/${failedFiles.length})`);
console.log('\n問題: バグ検証テストが不完全で、実際の実装の能力を正しく評価していない');
console.log('解決: comprehensive-bug-verification.jsのgetDocumentTypeメソッドを修正する必要がある');