/**
 * 最終ハードコード検証 - 第3条完全準拠確認
 * モック・仮のコード・ハードコード完全排除確認
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 第3条準拠 - ハードコード完全排除最終検証\n');

// 検証対象ファイル
const targetFiles = [
    'src/main/services/PeriodCodeExtractor.ts',
    'src/main/services/EnhancedDocumentProcessor.ts', 
    'src/main/services/FileRenamer.ts',
    'src/shared/config/TaxDocumentConfig.ts',
    'config/tax-document-config.json'
];

function analyzeHardcodes(filePath, content) {
    const violations = [];
    
    // ハードコードパターンの検出
    const hardcodePatterns = [
        // 数値ハードコード
        { pattern: /return\s+['"`]?\d{4}['"`]?[;\s]/, message: '固定数値リターン', severity: 'HIGH' },
        { pattern: /=\s*['"`]?\d{4}['"`]?[;\s]/, message: '固定数値代入', severity: 'HIGH' },
        
        // 文字列ハードコード  
        { pattern: /['"`]\d+番台_[^'"`]+['"`]/, message: '固定フォルダ番台名', severity: 'HIGH' },
        { pattern: /code:\s*['"`]\d{4}['"`]/, message: '固定コード値', severity: 'HIGH' },
        
        // 条件ハードコード
        { pattern: /if\s*\(\s*\w+\s*[<>=]+\s*\d{4}/, message: '固定数値条件判定', severity: 'MEDIUM' },
        
        // モック・仮コード
        { pattern: /\/\/\s*(TODO|FIXME|MOCK|仮|テスト用)/, message: 'TODO/MOCK/仮コードあり', severity: 'HIGH' },
        { pattern: /dummy|mock|test|仮|テスト用/i, message: 'モック・テスト用コード', severity: 'MEDIUM' }
    ];
    
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
        hardcodePatterns.forEach(({ pattern, message, severity }) => {
            if (pattern.test(line)) {
                // 設定ファイル関連は除外（正当な使用）
                if (line.includes('config') || line.includes('Config') || 
                    line.includes('pattern') || line.includes('settings')) {
                    return;
                }
                
                violations.push({
                    line: index + 1,
                    content: line.trim(),
                    message,
                    severity,
                    file: filePath
                });
            }
        });
    });
    
    return violations;
}

function verifyConfigFileExists() {
    console.log('📋 設定ファイル存在確認:');
    
    const configFiles = [
        'config/tax-document-config.json',
        'src/shared/config/TaxDocumentConfig.ts'
    ];
    
    let allExists = true;
    
    configFiles.forEach(configFile => {
        if (fs.existsSync(configFile)) {
            console.log(`  ✅ ${configFile} - 存在`);
            
            if (configFile.endsWith('.json')) {
                try {
                    const configContent = JSON.parse(fs.readFileSync(configFile, 'utf8'));
                    console.log(`    📊 パターン数: ${configContent.patterns?.length || 0}`);
                    console.log(`    📊 フォルダマッピング: ${Object.keys(configContent.folderMapping || {}).length}`);
                } catch (error) {
                    console.log(`    ❌ JSON解析エラー: ${error.message}`);
                    allExists = false;
                }
            }
        } else {
            console.log(`  ❌ ${configFile} - 存在しない`);
            allExists = false;
        }
    });
    
    return allExists;
}

function verifyHardcodeElimination() {
    console.log('\n🔍 ハードコード検出スキャン:');
    
    let totalViolations = 0;
    const violationsByFile = {};
    
    targetFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const violations = analyzeHardcodes(filePath, content);
            
            violationsByFile[filePath] = violations;
            totalViolations += violations.length;
            
            if (violations.length === 0) {
                console.log(`  ✅ ${filePath} - ハードコードなし`);
            } else {
                console.log(`  ⚠️ ${filePath} - ${violations.length}件の疑わしいコード`);
                violations.forEach(v => {
                    console.log(`    [${v.severity}] Line ${v.line}: ${v.message}`);
                    console.log(`           → ${v.content}`);
                });
            }
        } else {
            console.log(`  ❌ ${filePath} - ファイル存在しない`);
        }
    });
    
    return { totalViolations, violationsByFile };
}

function verifyDynamicImplementation() {
    console.log('\n📋 動的実装確認:');
    
    const implementationChecks = [];
    
    // PeriodCodeExtractor確認
    if (fs.existsSync('src/main/services/PeriodCodeExtractor.ts')) {
        const content = fs.readFileSync('src/main/services/PeriodCodeExtractor.ts', 'utf8');
        
        const hasConfigManager = content.includes('TaxDocumentConfigManager');
        const hasAsyncInit = content.includes('async initialize()') || content.includes('loadConfig()');
        const hasConfigBasedReturn = content.includes('config.periodCodeConfig.defaultPeriodCode');
        
        implementationChecks.push({
            file: 'PeriodCodeExtractor.ts',
            checks: [
                { name: '設定マネージャー使用', passed: hasConfigManager },
                { name: '非同期初期化', passed: hasAsyncInit },
                { name: '設定ベースリターン', passed: hasConfigBasedReturn }
            ]
        });
    }
    
    // EnhancedDocumentProcessor確認
    if (fs.existsSync('src/main/services/EnhancedDocumentProcessor.ts')) {
        const content = fs.readFileSync('src/main/services/EnhancedDocumentProcessor.ts', 'utf8');
        
        const hasConfigManager = content.includes('TaxDocumentConfigManager');
        const hasPatternArray = content.includes('patterns: DocumentPattern[]');
        const hasConfigBasedMethod = content.includes('configBased');
        
        implementationChecks.push({
            file: 'EnhancedDocumentProcessor.ts',
            checks: [
                { name: '設定マネージャー使用', passed: hasConfigManager },
                { name: 'パターン配列（非Map）', passed: hasPatternArray },
                { name: '設定ベースメソッド', passed: hasConfigBasedMethod }
            ]
        });
    }
    
    implementationChecks.forEach(({ file, checks }) => {
        console.log(`  📁 ${file}:`);
        checks.forEach(({ name, passed }) => {
            console.log(`    ${passed ? '✅' : '❌'} ${name}`);
        });
    });
    
    const allPassed = implementationChecks.every(ic => 
        ic.checks.every(c => c.passed)
    );
    
    return allPassed;
}

// メイン検証実行
function runFinalHardcodeVerification() {
    console.log('🎯 第3条完全準拠確認 - 最終ハードコード検証\n');
    
    // 1. 設定ファイル存在確認
    const configExists = verifyConfigFileExists();
    
    // 2. ハードコード排除確認  
    const { totalViolations, violationsByFile } = verifyHardcodeElimination();
    
    // 3. 動的実装確認
    const dynamicImplementation = verifyDynamicImplementation();
    
    // 最終結果
    console.log('\n🏆 最終検証結果:');
    console.log(`✅ 設定ファイル存在: ${configExists ? '合格' : '不合格'}`);
    console.log(`✅ ハードコード排除: ${totalViolations === 0 ? '合格' : `不合格 (${totalViolations}件の違反)`}`);
    console.log(`✅ 動的実装: ${dynamicImplementation ? '合格' : '不合格'}`);
    
    const isFullyCompliant = configExists && totalViolations === 0 && dynamicImplementation;
    
    if (isFullyCompliant) {
        console.log('\n🎉🎉🎉 第3条完全準拠達成！ 🎉🎉🎉');
        console.log('✨ モック・仮のコード・ハードコード完全排除成功！');
        console.log('🚀 エンタープライズレベルの動的設定実装完了！');
    } else {
        console.log('\n⚠️ 第3条違反が残っています：');
        if (!configExists) console.log('   - 設定ファイルが不完全');
        if (totalViolations > 0) console.log(`   - ${totalViolations}件のハードコード違反`);
        if (!dynamicImplementation) console.log('   - 動的実装が不完全');
    }
    
    return isFullyCompliant;
}

// 検証実行
const result = runFinalHardcodeVerification();
process.exit(result ? 0 : 1);