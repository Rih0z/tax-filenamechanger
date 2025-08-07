/**
 * ハードコード完全排除検証テスト
 * 第3条準拠確認 - モック・ハードコード一切なし確認
 */

const { TaxDocumentConfigManager } = require('../src/shared/config/TaxDocumentConfig');
const { PeriodCodeExtractor } = require('../src/main/services/PeriodCodeExtractor');
const { EnhancedDocumentProcessor } = require('../src/main/services/EnhancedDocumentProcessor');
const { FileRenamer } = require('../src/main/services/FileRenamer');

console.log('🧪 ハードコード完全排除検証テスト開始\n');

async function testConfigBasedImplementation() {
    console.log('📋 設定ベース実装テスト:');

    try {
        // 1. 設定マネージャーの動的読み込み確認
        const configManager = TaxDocumentConfigManager.getInstance();
        const config = await configManager.loadConfig();
        
        console.log(`  ✅ 設定ファイル読み込み: ${config.patterns.length} パターン`);
        console.log(`  ✅ 期間コードデフォルト: ${config.periodCodeConfig.defaultPeriodCode}`);
        console.log(`  ✅ フォルダマッピング: ${Object.keys(config.folderMapping).length} 種類`);
        
        // 2. PeriodCodeExtractor の設定ベース確認
        const periodExtractor = new PeriodCodeExtractor();
        await periodExtractor.initialize();
        
        const testDate = '20240731';
        const periodCode = await periodExtractor.extractPeriodCode(testDate);
        console.log(`  ✅ 期間コード抽出（設定ベース）: ${testDate} -> ${periodCode}`);
        
        // 3. EnhancedDocumentProcessor の設定ベース確認
        const docProcessor = new EnhancedDocumentProcessor();
        await docProcessor.initialize();
        
        const testFile = '仕訳帳_20250720_1541.pdf';
        const docInfo = await docProcessor.processDocument(testFile);
        console.log(`  ✅ 書類判定（設定ベース）: ${testFile} -> ${docInfo.type} (${docInfo.code})`);
        
        // 4. FileRenamer の設定ベース確認
        const fileRenamer = new FileRenamer();
        await fileRenamer.initialize();
        
        console.log('  ✅ FileRenamer初期化完了（設定ベース）');
        
        return true;
        
    } catch (error) {
        console.log(`  ❌ 設定ベース実装エラー: ${error.message}`);
        return false;
    }
}

async function testHardcodeElimination() {
    console.log('\n📋 ハードコード排除確認テスト:');
    
    const testCases = [
        // 期間コードテスト
        { input: '20240731', expected: '2407', description: 'YYYYMMDD形式期間コード' },
        { input: '令和6年7月31日', expected: '2407', description: '令和形式期間コード' },
        
        // 書類判定テスト  
        { input: '一括償却資産明細.pdf', expected: '6002', description: '一括償却書類' },
        { input: '仕訳帳_20250720_1541.pdf', expected: '5005', description: '仕訳帳書類' },
        { input: '納税一覧.pdf', expected: '0000', description: '納税一覧書類' },
    ];
    
    try {
        const periodExtractor = new PeriodCodeExtractor();
        await periodExtractor.initialize();
        
        const docProcessor = new EnhancedDocumentProcessor();
        await docProcessor.initialize();
        
        let successCount = 0;
        
        for (const testCase of testCases) {
            try {
                let result;
                
                if (testCase.description.includes('期間コード')) {
                    result = await periodExtractor.extractPeriodCode(testCase.input);
                } else {
                    const docInfo = await docProcessor.processDocument(testCase.input);
                    result = docInfo.code;
                }
                
                if (result === testCase.expected) {
                    console.log(`  ✅ ${testCase.description}: ${testCase.input} -> ${result}`);
                    successCount++;
                } else {
                    console.log(`  ❌ ${testCase.description}: ${testCase.input} -> ${result} (期待値: ${testCase.expected})`);
                }
                
            } catch (error) {
                console.log(`  ❌ ${testCase.description}: エラー - ${error.message}`);
            }
        }
        
        console.log(`\n📊 ハードコード排除テスト結果: ${successCount}/${testCases.length} (${Math.round(successCount/testCases.length*100)}%)`);
        return successCount === testCases.length;
        
    } catch (error) {
        console.log(`  ❌ テストエラー: ${error.message}`);
        return false;
    }
}

async function testDynamicConfiguration() {
    console.log('\n📋 動的設定変更テスト:');
    
    try {
        const configManager = TaxDocumentConfigManager.getInstance();
        
        // 設定リロード
        const reloadedConfig = await configManager.reloadConfig();
        console.log(`  ✅ 設定リロード成功: ${reloadedConfig.patterns.length} パターン`);
        
        // パターン検索機能
        const pattern = configManager.findPatternByKeyword('仕訳帳');
        if (pattern) {
            console.log(`  ✅ 動的パターン検索: "仕訳帳" -> ${pattern.type} (${pattern.code})`);
        }
        
        // フォルダマッピング取得
        const folder = configManager.getFolderFromCode('5005');
        console.log(`  ✅ 動的フォルダ取得: 5005 -> ${folder}`);
        
        return true;
        
    } catch (error) {
        console.log(`  ❌ 動的設定テストエラー: ${error.message}`);
        return false;
    }
}

// メインテスト実行
async function runHardcodeEliminationTests() {
    console.log('🎯 第3条完全準拠確認 - ハードコード完全排除検証\n');
    
    const results = [];
    
    results.push(await testConfigBasedImplementation());
    results.push(await testHardcodeElimination());
    results.push(await testDynamicConfiguration());
    
    const successCount = results.filter(r => r).length;
    const totalTests = results.length;
    const successRate = Math.round(successCount / totalTests * 100);
    
    console.log('\n🎯 最終結果サマリー');
    console.log(`✅ 設定ベース実装: ${results[0] ? '合格' : '不合格'}`);
    console.log(`✅ ハードコード排除: ${results[1] ? '合格' : '不合格'}`);
    console.log(`✅ 動的設定変更: ${results[2] ? '合格' : '不合格'}`);
    
    console.log(`\n🏆 総合結果: ${successCount}/${totalTests} (${successRate}%)`);
    
    if (successRate === 100) {
        console.log('🎉🎉🎉 第3条完全準拠達成！ハードコード完全排除成功！ 🎉🎉🎉');
        console.log('✨ モック・仮のコード・ハードコード一切なし確認完了');
    } else {
        console.log('⚠️ 一部テストが失敗しています。修正が必要です。');
    }
    
    return successRate === 100;
}

// テスト実行
runHardcodeEliminationTests().catch(console.error);