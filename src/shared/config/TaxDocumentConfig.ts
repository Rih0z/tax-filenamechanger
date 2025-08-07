/**
 * 税務書類設定管理 - ハードコード排除
 * 全設定を外部設定ファイルから動的読み込み
 */

export interface DocumentPattern {
    code: string;
    type: string;
    folder: string;
    keywords: string[];
    aliases?: string[];
}

export interface PeriodCodeConfig {
    defaultPeriodCode: string;
    validYearRange: {
        min: number;
        max: number;
    };
    reiwaStartYear: number;
    similarityThreshold: number;
}

export interface TaxDocumentConfiguration {
    patterns: DocumentPattern[];
    periodCodeConfig: PeriodCodeConfig;
    folderMapping: {
        [prefix: string]: string;
    };
    processingSettings: {
        fuzzyMatchThreshold: number;
        confidenceThreshold: number;
        defaultUnknownCode: string;
        defaultUnknownFolder: string;
    };
}

/**
 * 設定ファイル管理クラス
 */
export class TaxDocumentConfigManager {
    private static instance: TaxDocumentConfigManager;
    private config: TaxDocumentConfiguration | null = null;
    private configPath: string;

    private constructor() {
        this.configPath = process.env.TAX_CONFIG_PATH || 'config/tax-document-config.json';
    }

    public static getInstance(): TaxDocumentConfigManager {
        if (!TaxDocumentConfigManager.instance) {
            TaxDocumentConfigManager.instance = new TaxDocumentConfigManager();
        }
        return TaxDocumentConfigManager.instance;
    }

    /**
     * 設定を動的に読み込み
     */
    public async loadConfig(): Promise<TaxDocumentConfiguration> {
        if (this.config) {
            return this.config;
        }

        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            const configFilePath = path.resolve(process.cwd(), this.configPath);
            const configData = await fs.readFile(configFilePath, 'utf-8');
            this.config = JSON.parse(configData);
            
            console.log(`[ConfigManager] Loaded config from: ${configFilePath}`);
            return this.config!;
        } catch (error) {
            console.warn(`[ConfigManager] Failed to load config from ${this.configPath}, using fallback`);
            return this.getFallbackConfig();
        }
    }

    /**
     * 設定を同期的に読み込み（初期化後）
     */
    public getConfig(): TaxDocumentConfiguration {
        if (!this.config) {
            throw new Error('Config not loaded. Call loadConfig() first.');
        }
        return this.config;
    }

    /**
     * 設定を再読み込み
     */
    public async reloadConfig(): Promise<TaxDocumentConfiguration> {
        this.config = null;
        return this.loadConfig();
    }

    /**
     * フォールバック設定（最小限の設定）
     */
    private getFallbackConfig(): TaxDocumentConfiguration {
        return {
            patterns: [
                // 最小限のパターンのみ - 本来は外部設定ファイルから読み込み
                {
                    code: '5001',
                    type: '決算書',
                    folder: '5000番台_決算書類',
                    keywords: ['決算書'],
                    aliases: ['けっさんしょ']
                },
                {
                    code: '5002',
                    type: '総勘定元帳',
                    folder: '5000番台_決算書類',
                    keywords: ['総勘定元帳'],
                    aliases: ['そうかんじょうもとちょう']
                }
            ],
            periodCodeConfig: {
                defaultPeriodCode: process.env.DEFAULT_PERIOD_CODE || '2405',
                validYearRange: {
                    min: parseInt(process.env.MIN_VALID_YEAR || '2020'),
                    max: parseInt(process.env.MAX_VALID_YEAR || '2030')
                },
                reiwaStartYear: parseInt(process.env.REIWA_START_YEAR || '2019'),
                similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.6')
            },
            folderMapping: {
                '0': '0000番台_法人税',
                '1': '1000番台_都道府県税',
                '2': '2000番台_市民税',
                '3': '3000番台_消費税',
                '5': '5000番台_決算書類',
                '6': '6000番台_固定資産',
                '7': '7000番台_税区分集計表',
                '9': '9999番台_その他'
            },
            processingSettings: {
                fuzzyMatchThreshold: parseFloat(process.env.FUZZY_MATCH_THRESHOLD || '0.6'),
                confidenceThreshold: parseInt(process.env.CONFIDENCE_THRESHOLD || '85'),
                defaultUnknownCode: process.env.DEFAULT_UNKNOWN_CODE || '9999',
                defaultUnknownFolder: process.env.DEFAULT_UNKNOWN_FOLDER || '9999番台_その他'
            }
        };
    }

    /**
     * パターンをキーワードで検索
     */
    public findPatternByKeyword(keyword: string): DocumentPattern | null {
        const config = this.getConfig();
        const normalizedKeyword = keyword.toLowerCase().replace(/[\s_\-]/g, '');

        for (const pattern of config.patterns) {
            // メインキーワードチェック
            for (const patternKeyword of pattern.keywords) {
                const normalizedPattern = patternKeyword.toLowerCase().replace(/[\s_\-]/g, '');
                if (normalizedKeyword.includes(normalizedPattern) || 
                    normalizedPattern.includes(normalizedKeyword)) {
                    return pattern;
                }
            }

            // エイリアスチェック
            if (pattern.aliases) {
                for (const alias of pattern.aliases) {
                    const normalizedAlias = alias.toLowerCase().replace(/[\s_\-]/g, '');
                    if (normalizedKeyword.includes(normalizedAlias) || 
                        normalizedAlias.includes(normalizedKeyword)) {
                        return pattern;
                    }
                }
            }
        }

        return null;
    }

    /**
     * フォルダマッピングを取得
     */
    public getFolderFromCode(code: string): string {
        const config = this.getConfig();
        const prefix = code.charAt(0);
        return config.folderMapping[prefix] || config.processingSettings.defaultUnknownFolder;
    }
}