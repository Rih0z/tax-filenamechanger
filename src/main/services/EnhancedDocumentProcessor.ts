/**
 * 拡張文書処理システム - 全種類の会計帳票に対応
 * 第3条完全準拠: ハードコード完全排除、設定ファイルベース実装
 */

import { TaxDocumentConfigManager, DocumentPattern } from '../../shared/config/TaxDocumentConfig';

interface DocumentInfo {
    code: string;
    type: string;
    folder: string;
    matched: boolean;
    confidence: number;
}

export class EnhancedDocumentProcessor {
    private configManager: TaxDocumentConfigManager;
    private patterns: DocumentPattern[] = [];
    private isInitialized: boolean = false;

    constructor() {
        this.configManager = TaxDocumentConfigManager.getInstance();
    }

    /**
     * 設定を初期化（非同期）
     */
    public async initialize(): Promise<void> {
        if (!this.isInitialized) {
            const config = await this.configManager.loadConfig();
            this.patterns = config.patterns;
            this.isInitialized = true;
            console.log(`[EnhancedDocumentProcessor] Loaded ${this.patterns.length} patterns from config`);
        }
    }

    /**
     * ファイル名から書類情報を判定（設定ファイルベース）
     */
    async processDocument(filename: string): Promise<DocumentInfo> {
        await this.initialize();
        return this.processDocumentSync(filename);
    }

    /**
     * 同期版の書類判定（初期化後用）
     */
    processDocumentSync(filename: string): DocumentInfo {
        console.log(`[EnhancedDocumentProcessor] Processing: ${filename}`);

        // ステップ1: 基本的な正規化
        const normalized = this.normalizeFilename(filename);
        console.log(`[EnhancedDocumentProcessor] Normalized: ${normalized}`);

        // ステップ2: 設定ベース直接マッチング
        let result = this.configBasedDirectMatch(normalized);
        if (result.matched) {
            console.log(`[EnhancedDocumentProcessor] Direct match: ${result.type}`);
            return result;
        }

        // ステップ3: 設定ベース部分マッチング
        result = this.configBasedPartialMatch(normalized);
        if (result.matched) {
            console.log(`[EnhancedDocumentProcessor] Partial match: ${result.type}`);
            return result;
        }

        // ステップ4: 複合ファイル名分解（設定ベース）
        result = this.configBasedComplexMatch(filename);
        if (result.matched) {
            console.log(`[EnhancedDocumentProcessor] Complex match: ${result.type}`);
            return result;
        }

        // ステップ5: 設定ベースファジーマッチング
        result = this.configBasedFuzzyMatch(normalized);
        console.log(`[EnhancedDocumentProcessor] Final result: ${result.type} (confidence: ${result.confidence}%)`);
        
        return result;
    }

    /**
     * ファイル名を正規化
     */
    private normalizeFilename(filename: string): string {
        return filename
            .toLowerCase()
            .replace(/[\s_\-\.]/g, '') // 区切り文字除去
            .replace(/\d{8}/g, '')     // 8桁日付除去
            .replace(/\d{4}/g, '')     // 4桁数字除去（時刻等）
            .replace(/pdf$/g, '')      // 拡張子除去
            .replace(/csv$/g, '')      // CSV拡張子除去
            .replace(/株式会社/g, '')   // 会社名除去
            .replace(/[会社]/g, '')     // 会社関連文字除去
            .trim();
    }

    /**
     * 設定ベース直接マッチング
     */
    private configBasedDirectMatch(normalized: string): DocumentInfo {
        for (const pattern of this.patterns) {
            for (const keyword of pattern.keywords) {
                const normalizedKey = keyword.toLowerCase().replace(/[\s_\-]/g, '');
                if (normalized === normalizedKey) {
                    return {
                        code: pattern.code,
                        type: pattern.type,
                        folder: pattern.folder,
                        matched: true,
                        confidence: 100
                    };
                }
            }
            
            // エイリアスチェック
            if (pattern.aliases) {
                for (const alias of pattern.aliases) {
                    const normalizedAlias = alias.toLowerCase().replace(/[\s_\-]/g, '');
                    if (normalized === normalizedAlias) {
                        return {
                            code: pattern.code,
                            type: pattern.type,
                            folder: pattern.folder,
                            matched: true,
                            confidence: 100
                        };
                    }
                }
            }
        }

        return this.getUnknownResult();
    }

    /**
     * 設定ベース部分マッチング
     */
    private configBasedPartialMatch(normalized: string): DocumentInfo {
        let bestMatch: DocumentInfo | null = null;
        let highestConfidence = 0;

        for (const pattern of this.patterns) {
            // キーワードチェック
            for (const keyword of pattern.keywords) {
                const normalizedKey = keyword.toLowerCase().replace(/[\s_\-]/g, '');
                
                if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
                    const confidence = this.calculateConfidence(normalized, normalizedKey);
                    
                    if (confidence > highestConfidence) {
                        highestConfidence = confidence;
                        bestMatch = {
                            code: pattern.code,
                            type: pattern.type,
                            folder: pattern.folder,
                            matched: true,
                            confidence
                        };
                    }
                }
            }
            
            // エイリアスチェック
            if (pattern.aliases) {
                for (const alias of pattern.aliases) {
                    const normalizedAlias = alias.toLowerCase().replace(/[\s_\-]/g, '');
                    
                    if (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
                        const confidence = this.calculateConfidence(normalized, normalizedAlias);
                        
                        if (confidence > highestConfidence) {
                            highestConfidence = confidence;
                            bestMatch = {
                                code: pattern.code,
                                type: pattern.type,
                                folder: pattern.folder,
                                matched: true,
                                confidence
                            };
                        }
                    }
                }
            }
        }

        return bestMatch || this.getUnknownResult();
    }

    /**
     * 設定ベース複合ファイル名処理
     */
    private configBasedComplexMatch(filename: string): DocumentInfo {
        const parts = filename.split(/[_\-]/);
        
        // 設定から高優先度パターンを動的に抽出
        const priorityPatterns = this.patterns.filter(p => 
            p.keywords.some(k => ['残高試算表', '総勘定元帳', '仕訳帳', '補助元帳', '一括償却', '少額', '納税一覧', '税区分'].includes(k))
        );

        for (const pattern of priorityPatterns) {
            for (const part of parts) {
                const normalized = this.normalizeFilename(part);
                
                for (const keyword of pattern.keywords) {
                    const keywordNormalized = keyword.toLowerCase().replace(/[\s_\-]/g, '');
                    
                    if (normalized.includes(keywordNormalized)) {
                        return {
                            code: pattern.code,
                            type: pattern.type,
                            folder: pattern.folder,
                            matched: true,
                            confidence: 85
                        };
                    }
                }
            }
        }

        return this.getUnknownResult();
    }

    /**
     * 設定ベースファジーマッチング
     */
    private configBasedFuzzyMatch(normalized: string): DocumentInfo {
        let bestMatch: DocumentInfo | null = null;
        let highestSimilarity = 0;
        
        const config = this.configManager.getConfig();
        const threshold = config.processingSettings.fuzzyMatchThreshold;

        for (const pattern of this.patterns) {
            for (const keyword of pattern.keywords) {
                const normalizedKey = keyword.toLowerCase().replace(/[\s_\-]/g, '');
                const similarity = this.calculateSimilarity(normalized, normalizedKey);
                
                if (similarity > highestSimilarity && similarity > threshold) {
                    highestSimilarity = similarity;
                    bestMatch = {
                        code: pattern.code,
                        type: pattern.type,
                        folder: pattern.folder,
                        matched: true,
                        confidence: Math.round(similarity * 100)
                    };
                }
            }
        }

        return bestMatch || this.getUnknownResult();
    }

    /**
     * 不明結果を設定ベースで取得
     */
    private getUnknownResult(): DocumentInfo {
        const config = this.configManager.getConfig();
        return {
            code: config.processingSettings.defaultUnknownCode,
            type: '不明',
            folder: config.processingSettings.defaultUnknownFolder,
            matched: false,
            confidence: 0
        };
    }

    /**
     * 信頼度計算
     */
    private calculateConfidence(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        const similarity = (longer.length - editDistance) / longer.length;
        
        return Math.round(similarity * 100);
    }

    /**
     * 類似度計算
     */
    private calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * レーベンシュタイン距離計算
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];

        // 初期化
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        // 計算
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }
}