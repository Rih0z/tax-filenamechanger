/**
 * パフォーマンステスト
 * 大量ファイル処理の性能測定
 */

const assert = require('assert');

// 簡易版パフォーマンステスト用プロセッサー
class PerformanceTestProcessor {
  constructor() {
    this.processedFiles = [];
    this.metrics = {
      startTime: null,
      endTime: null,
      processingTime: 0,
      memoryUsage: {
        start: null,
        end: null,
        peak: 0
      }
    };
  }

  // メモリ使用量記録
  recordMemoryUsage() {
    const usage = process.memoryUsage();
    const totalMB = Math.round(usage.heapUsed / 1024 / 1024);
    
    if (!this.metrics.memoryUsage.start) {
      this.metrics.memoryUsage.start = totalMB;
    }
    
    this.metrics.memoryUsage.end = totalMB;
    
    if (totalMB > this.metrics.memoryUsage.peak) {
      this.metrics.memoryUsage.peak = totalMB;
    }
    
    return totalMB;
  }

  // 高速ファイル名解析
  fastAnalyzeFileName(fileName) {
    // 基本的なパターンマッチングのみ（高速化のため）
    const patterns = [
      { regex: /法人税及び地方法人税申告書/, type: '法人税申告書', number: '0001' },
      { regex: /消費税申告書/, type: '消費税申告書', number: '3001' },
      { regex: /都道府県民税.*事業税/, type: '都道府県税申告書', number: '1000' },
      { regex: /市町村民税|市民税/, type: '市民税申告書', number: '2000' },
      { regex: /受信通知/, type: '受信通知', number: '0003' },
      { regex: /納付情報/, type: '納付情報', number: '0004' },
      { regex: /決算書/, type: '決算書', number: '5001' },
      { regex: /固定資産台帳/, type: '固定資産', number: '6001' },
      { regex: /税区分集計表/, type: '税区分集計表', number: '7001' }
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(fileName)) {
        return {
          documentType: pattern.type,
          suggestedName: `${pattern.number}_${pattern.type}_2407.pdf`,
          success: true
        };
      }
    }

    return {
      documentType: '不明',
      suggestedName: null,
      success: false
    };
  }

  // バッチ処理
  processBatch(fileNames) {
    this.metrics.startTime = Date.now();
    this.recordMemoryUsage();

    const batchSize = 50; // バッチサイズ
    const results = [];

    for (let i = 0; i < fileNames.length; i += batchSize) {
      const batch = fileNames.slice(i, i + batchSize);
      
      for (const fileName of batch) {
        const result = this.fastAnalyzeFileName(fileName);
        results.push({
          originalName: fileName,
          ...result,
          processedAt: Date.now()
        });
        
        // メモリ使用量を定期的に記録
        if (results.length % 100 === 0) {
          this.recordMemoryUsage();
        }
      }

      // バッチ間での少しの休憩（メモリ圧迫回避）
      if (i + batchSize < fileNames.length) {
        // 同期的に少し待つ代わりに、GCのヒントを与える
        if (global.gc) {
          global.gc();
        }
      }
    }

    this.metrics.endTime = Date.now();
    this.metrics.processingTime = this.metrics.endTime - this.metrics.startTime;
    this.recordMemoryUsage();

    this.processedFiles = results;
    return results;
  }

  // パフォーマンス統計取得
  getPerformanceStats() {
    const totalFiles = this.processedFiles.length;
    const successFiles = this.processedFiles.filter(f => f.success).length;
    
    return {
      totalFiles,
      successFiles,
      failedFiles: totalFiles - successFiles,
      successRate: Math.round((successFiles / totalFiles) * 100),
      processingTime: this.metrics.processingTime,
      avgTimePerFile: totalFiles > 0 ? Math.round(this.metrics.processingTime / totalFiles * 100) / 100 : 0,
      filesPerSecond: Math.round(totalFiles / (this.metrics.processingTime / 1000)),
      memoryUsage: this.metrics.memoryUsage
    };
  }
}

// テストファイル名生成
function generateTestFileNames(count) {
  const basePatterns = [
    '法人税及び地方法人税申告書_20240731{company}_20250720130102.pdf',
    '消費税申告書_20240731{company}_20250720130433.pdf',
    '東京都　法人都道府県民税・事業税・特別法人事業税又は地方法人特別税　確定申告_20240731{company}_20250720133418.pdf',
    '福岡市　法人市町村民税　確定申告_20240731{company}_20250720133028.pdf',
    '法人税　受信通知.pdf',
    '消費税　納付情報登録依頼.pdf',
    '決算書_20250720_1535.pdf',
    '固定資産台帳.pdf',
    '税区分集計表_20250720_1540.pdf'
  ];

  const companies = [
    'テスト会社株式会社', 'サンプル会社株式会社', 'テストC会社株式会社',
    'テスト商事株式会社', 'サンプル工業株式会社', '模擬建設株式会社',
    'ダミー物産株式会社', '仮想サービス株式会社', '試験運輸株式会社'
  ];

  const fileNames = [];
  
  for (let i = 0; i < count; i++) {
    const pattern = basePatterns[i % basePatterns.length];
    const company = companies[i % companies.length];
    const fileName = pattern.replace('{company}', company);
    fileNames.push(fileName);
  }

  return fileNames;
}

// パフォーマンステスト実行
function runPerformanceTests() {
  console.log('🚀 パフォーマンステスト開始');
  
  const testSizes = [100, 500, 1000, 2000];
  const results = [];

  for (const size of testSizes) {
    console.log(`\n📊 ${size}ファイル処理テスト`);
    
    const processor = new PerformanceTestProcessor();
    const testFiles = generateTestFileNames(size);
    
    console.log(`   テストファイル生成: ${testFiles.length}件`);
    console.log(`   処理開始...`);
    
    const processingResults = processor.processBatch(testFiles);
    const stats = processor.getPerformanceStats();
    
    console.log(`   処理完了: ${stats.processingTime}ms`);
    console.log(`   成功率: ${stats.successRate}%`);
    console.log(`   平均処理時間: ${stats.avgTimePerFile}ms/ファイル`);
    console.log(`   処理速度: ${stats.filesPerSecond}ファイル/秒`);
    console.log(`   メモリ使用量: ${stats.memoryUsage.start}MB → ${stats.memoryUsage.end}MB (ピーク: ${stats.memoryUsage.peak}MB)`);
    
    results.push({
      fileCount: size,
      stats: stats
    });

    // 性能要件チェック
    const requirements = {
      avgTimePerFile: 10, // 10ms以内/ファイル
      successRate: 85,    // 85%以上の成功率
      memoryIncrease: 50  // メモリ増加50MB以内
    };

    const memoryIncrease = stats.memoryUsage.peak - stats.memoryUsage.start;
    const meetsRequirements = 
      stats.avgTimePerFile <= requirements.avgTimePerFile &&
      stats.successRate >= requirements.successRate &&
      memoryIncrease <= requirements.memoryIncrease;

    console.log(`   要件適合: ${meetsRequirements ? '✅ 合格' : '❌ 不合格'}`);
  }

  // 総合性能分析
  console.log(`\n📈 総合性能分析`);
  
  for (const result of results) {
    console.log(`   ${result.fileCount}ファイル: ${result.stats.filesPerSecond}f/s, ${result.stats.avgTimePerFile}ms/f, ${result.stats.successRate}%`);
  }

  // スケーラビリティ分析
  console.log(`\n🔍 スケーラビリティ分析`);
  
  if (results.length >= 2) {
    const first = results[0];
    const last = results[results.length - 1];
    
    const scaleRatio = last.fileCount / first.fileCount;
    const timeRatio = last.stats.processingTime / first.stats.processingTime;
    const memoryRatio = last.stats.memoryUsage.peak / first.stats.memoryUsage.peak;
    
    console.log(`   ファイル数スケール: ${scaleRatio}x`);
    console.log(`   処理時間スケール: ${Math.round(timeRatio * 100) / 100}x`);
    console.log(`   メモリ使用量スケール: ${Math.round(memoryRatio * 100) / 100}x`);
    
    const linearityScore = Math.round((scaleRatio / timeRatio) * 100);
    console.log(`   リニアリティ: ${linearityScore}% (100%=理想的線形性能)`);
  }

  // 性能評価
  const overallSuccess = results.every(result => 
    result.stats.avgTimePerFile <= 10 &&
    result.stats.successRate >= 85
  );

  console.log(`\n🎯 性能評価`);
  if (overallSuccess) {
    console.log('   ✅ 性能要件を満たしています');
    console.log('   大量ファイル処理に対応可能です');
  } else {
    console.log('   ⚠️  一部の性能要件を満たしていません');
    console.log('   最適化が必要な可能性があります');
  }

  return overallSuccess;
}

// テスト実行
if (require.main === module) {
  const success = runPerformanceTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runPerformanceTests, PerformanceTestProcessor };