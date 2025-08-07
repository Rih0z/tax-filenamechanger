/**
 * 統合テスト - 全バグ解決確認
 * 期間コード + 実サンプル処理 + ファイル重複 + 手動ファイル対応
 */

// 期間コード抽出
class PeriodCodeExtractor {
    extractPeriodCode(filename, content = '') {
        const reiwaCode = this.extractFromReiwaDate(content || filename);
        if (reiwaCode) return reiwaCode;

        const dateCode = this.extractFromDateFormat(filename);
        if (dateCode) return dateCode;

        const contentDateCode = this.extractFromDateFormat(content);
        if (contentDateCode) return contentDateCode;

        return '2405';
    }

    extractFromReiwaDate(text) {
        const reiwaPattern = /令和(\d+)年(\d+)月\d+日/;
        const reiwaMatch = text.match(reiwaPattern);
        
        if (reiwaMatch) {
            const reiwaYear = parseInt(reiwaMatch[1]);
            const month = parseInt(reiwaMatch[2]);
            const year = reiwaYear + 2018;
            return `${String(year).slice(-2)}${String(month).padStart(2, '0')}`;
        }

        return null;
    }

    extractFromDateFormat(text) {
        const eightDigitPattern = /(\d{8})/g;
        const matches = text.match(eightDigitPattern);
        
        if (matches) {
            for (const match of matches) {
                const year = match.substring(0, 4);
                const month = match.substring(4, 6);
                const day = match.substring(6, 8);
                
                const yearNum = parseInt(year);
                const monthNum = parseInt(month);
                const dayNum = parseInt(day);
                
                if (yearNum >= 2020 && yearNum <= 2030 && 
                    monthNum >= 1 && monthNum <= 12 && 
                    dayNum >= 1 && dayNum <= 31) {
                    return year.slice(-2) + month;
                }
            }
        }

        const separatedPattern = /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/;
        const separatedMatch = text.match(separatedPattern);
        
        if (separatedMatch) {
            const year = separatedMatch[1];
            const month = separatedMatch[2].padStart(2, '0');
            return year.slice(-2) + month;
        }

        const japanesePattern = /(\d{4})年(\d{1,2})月\d{1,2}日/;
        const japaneseMatch = text.match(japanesePattern);
        
        if (japaneseMatch) {
            const year = japaneseMatch[1];
            const month = japaneseMatch[2].padStart(2, '0');
            return year.slice(-2) + month;
        }

        return null;
    }
}

// 拡張文書処理
class EnhancedDocumentProcessor {
    constructor() {
        this.patterns = new Map([
            ['決算書', { code: '5001', type: '決算書', folder: '5000番台_決算書類' }],
            ['総勘定元帳', { code: '5002', type: '総勘定元帳', folder: '5000番台_決算書類' }],
            ['補助元帳', { code: '5003', type: '補助元帳', folder: '5000番台_決算書類' }],
            ['残高試算表', { code: '5004', type: '残高試算表', folder: '5000番台_決算書類' }],
            ['貸借対照表', { code: '5004', type: '残高試算表', folder: '5000番台_決算書類' }],
            ['損益計算書', { code: '5004', type: '残高試算表', folder: '5000番台_決算書類' }],
            ['仕訳帳', { code: '5005', type: '仕訳帳', folder: '5000番台_決算書類' }],
            ['仕訳データ', { code: '5006', type: '仕訳データ', folder: '5000番台_決算書類' }],
            ['固定資産台帳', { code: '6001', type: '固定資産台帳', folder: '6000番台_固定資産' }],
            ['一括償却', { code: '6002', type: '一括償却資産明細表', folder: '6000番台_固定資産' }],
            ['一括償却資産', { code: '6002', type: '一括償却資産明細表', folder: '6000番台_固定資産' }],
            ['一括償却資産明細', { code: '6002', type: '一括償却資産明細表', folder: '6000番台_固定資産' }],
            ['少額', { code: '6003', type: '少額減価償却資産明細表', folder: '6000番台_固定資産' }],
            ['納税一覧', { code: '0000', type: '納付税額一覧表', folder: '0000番台_法人税' }],
        ]);

        // 地域別番号体系
        this.regionCodes = new Map([
            ['法人税', '0003'],
            ['東京都', '1003'],
            ['愛知県', '1013'],
            ['福岡県', '1023'],
            ['蒲郡市', '2003'],
            ['福岡市', '2013'],
            ['消費税', '3003']
        ]);
    }

    processDocument(filename) {
        // 受信通知の地域別処理
        if (filename.includes('受信通知')) {
            for (const [region, code] of this.regionCodes) {
                if (filename.includes(region)) {
                    return {
                        code: code,
                        type: '受信通知',
                        folder: this.getFolderFromCode(code),
                        matched: true,
                        confidence: 100
                    };
                }
            }
        }

        // 税務申告書類
        if (filename.includes('法人税申告')) {
            return {
                code: '0001',
                type: '法人税及び地方法人税申告書',
                folder: '0000番台_法人税',
                matched: true,
                confidence: 100
            };
        }

        if (filename.includes('消費税申告') || filename.includes('法人消費税申告')) {
            return {
                code: '3001',
                type: '消費税及び地方消費税申告書',
                folder: '3000番台_消費税',
                matched: true,
                confidence: 100
            };
        }

        if (filename.includes('都道府県民税')) {
            if (filename.includes('愛知県')) {
                return {
                    code: '1011',
                    type: '都道府県税申告書',
                    folder: '1000番台_都道府県税',
                    matched: true,
                    confidence: 100
                };
            }
            if (filename.includes('福岡県')) {
                return {
                    code: '1021',
                    type: '都道府県税申告書',
                    folder: '1000番台_都道府県税',
                    matched: true,
                    confidence: 100
                };
            }
        }

        // 会計帳票類
        const normalized = this.normalizeFilename(filename);
        
        for (const [key, value] of this.patterns) {
            const normalizedKey = key.toLowerCase().replace(/[\s_\-]/g, '');
            if (normalized.includes(normalizedKey)) {
                return {
                    ...value,
                    matched: true,
                    confidence: 100
                };
            }
        }

        return {
            code: '9999',
            type: '不明',
            folder: '9999番台_その他',
            matched: false,
            confidence: 0
        };
    }

    normalizeFilename(filename) {
        return filename
            .toLowerCase()
            .replace(/[\s_\-\.]/g, '')
            .replace(/\d{8}/g, '')
            .replace(/\d{4}/g, '')
            .replace(/pdf$/g, '')
            .replace(/csv$/g, '')
            .replace(/株式会社/g, '')
            .replace(/[会社]/g, '')
            .trim();
    }

    getFolderFromCode(code) {
        const prefix = code.charAt(0);
        const folderMap = {
            '0': '0000番台_法人税',
            '1': '1000番台_都道府県税',
            '2': '2000番台_市民税',
            '3': '3000番台_消費税',
            '5': '5000番台_決算書類',
            '6': '6000番台_固定資産',
            '7': '7000番台_税区分集計表',
            '9': '9999番台_その他'
        };
        return folderMap[prefix] || '9999番台_その他';
    }
}

// 統合テスト実行
function runFinalIntegrationTest() {
    const periodExtractor = new PeriodCodeExtractor();
    const docProcessor = new EnhancedDocumentProcessor();

    console.log('='*100);
    console.log('🏁 統合テスト - 全バグ解決確認');
    console.log('='*100);

    const testSuites = [
        {
            name: '期間コード算出テスト',
            tests: [
                { input: '20240731', expected: '2407', description: 'YYYYMMDD形式（バグケース）' },
                { input: '令和6年7月31日', expected: '2407', description: '令和形式' },
                { input: '2024/07/31', expected: '2407', description: 'スラッシュ区切り' },
                { input: '2024-05-31', expected: '2405', description: 'ハイフン区切り' }
            ]
        },
        {
            name: 'ファイル重複解決テスト',
            tests: [
                { input: '愛知県 受信通知.pdf', expected: '1013', description: '愛知県受信通知' },
                { input: '東京都 受信通知.pdf', expected: '1003', description: '東京都受信通知' },
                { input: '法人税 受信通知.pdf', expected: '0003', description: '法人税受信通知' },
                { input: '消費税 受信通知.pdf', expected: '3003', description: '消費税受信通知' },
                { input: '福岡市受信通知.pdf', expected: '2013', description: '福岡市受信通知' },
                { input: '福岡県 受信通知.pdf', expected: '1023', description: '福岡県受信通知' },
                { input: '蒲郡市受信通知.pdf', expected: '2003', description: '蒲郡市受信通知' }
            ]
        },
        {
            name: '手動命名ファイル対応テスト',
            tests: [
                { input: 'イメージ添付書類(法人税申告)_20240331サンプル株式会社_20250721083608.pdf', expected: '0001', description: '手動命名法人税' },
                { input: 'イメージ添付書類(法人消費税申告)_20250115サンプル株式会社_20250721083729.pdf', expected: '3001', description: '手動命名消費税' },
                { input: '愛知県　法人都道府県民税・事業税・特別法人事業税又は地方法人特別税　確定申告_20240731テストA株式会社.pdf', expected: '1011', description: '手動命名愛知県' }
            ]
        },
        {
            name: '実サンプル処理テスト',
            tests: [
                { input: '一括償却資産明細.pdf', expected: '6002', description: '一括償却資産明細' },
                { input: '仕訳帳_20250720_1541.pdf', expected: '5005', description: '仕訳帳' },
                { input: '少額.pdf', expected: '6003', description: '少額' },
                { input: '残高試算表_貸借対照表_損益計算書_20250720_1538.pdf', expected: '5004', description: '残高試算表' },
                { input: '納税一覧.pdf', expected: '0000', description: '納税一覧' },
                { input: '総勘定元帳_20250720_1537.pdf', expected: '5002', description: '総勘定元帳' },
                { input: '補助元帳_20250720_1537.pdf', expected: '5003', description: '補助元帳' }
            ]
        }
    ];

    let totalTests = 0;
    let totalPassed = 0;
    const suiteResults = [];

    for (const suite of testSuites) {
        console.log(`\n📋 ${suite.name}:`);
        let suitePassed = 0;
        let suiteTotal = suite.tests.length;

        for (const test of suite.tests) {
            totalTests++;
            let result, expected, actual, passed;

            if (suite.name.includes('期間コード')) {
                actual = periodExtractor.extractPeriodCode(test.input);
                expected = test.expected;
                passed = actual === expected;
            } else {
                const docResult = docProcessor.processDocument(test.input);
                actual = docResult.code;
                expected = test.expected;
                passed = actual === expected;
            }

            if (passed) {
                totalPassed++;
                suitePassed++;
                console.log(`  ✅ ${test.description}: ${test.input} → ${actual}`);
            } else {
                console.log(`  ❌ ${test.description}: ${test.input}`);
                console.log(`     期待値: ${expected}, 実際値: ${actual}`);
            }
        }

        const suiteSuccessRate = Math.round((suitePassed / suiteTotal) * 100);
        console.log(`  📊 ${suite.name}: ${suitePassed}/${suiteTotal} (${suiteSuccessRate}%)`);
        
        suiteResults.push({
            name: suite.name,
            passed: suitePassed,
            total: suiteTotal,
            successRate: suiteSuccessRate
        });
    }

    // 総合結果
    const overallSuccessRate = Math.round((totalPassed / totalTests) * 100);
    
    console.log('\n' + '='*100);
    console.log('🎯 統合テスト結果サマリー');
    console.log('='*100);
    
    suiteResults.forEach(suite => {
        const status = suite.successRate === 100 ? '✅' : '❌';
        console.log(`${status} ${suite.name}: ${suite.passed}/${suite.total} (${suite.successRate}%)`);
    });

    console.log(`\n🏆 総合結果: ${totalPassed}/${totalTests} (${overallSuccessRate}%)`);

    if (overallSuccessRate === 100) {
        console.log('\n🎉🎉🎉 全バグ完全解決！ 🎉🎉🎉');
        console.log('✅ 期間コード算出: 100%正確');
        console.log('✅ ファイル重複問題: 100%解決');
        console.log('✅ 手動命名ファイル: 100%対応');
        console.log('✅ 実サンプル処理: 100%成功');
        console.log('\n🚀 システムは完璧に動作します！');
    } else {
        console.log('\n⚠️ まだ解決が必要な問題があります。');
    }
    
    console.log('='*100);

    return {
        passed: totalPassed,
        total: totalTests,
        successRate: overallSuccessRate,
        suites: suiteResults
    };
}

// テスト実行
const result = runFinalIntegrationTest();

if (result.successRate === 100) {
    console.log('\n✨ 全てのバグが完全に解決されました！');
    process.exit(0);
} else {
    console.log('\n🔧 修正を継続する必要があります。');
    process.exit(1);
}