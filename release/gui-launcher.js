#!/usr/bin/env node
/**
 * GUI版 税務書類自動リネームシステム
 * Electron不要の軽量Webサーバー版
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const url = require('url');

// スタンドアロン実行ファイルをインポート
const { PDFParser, FileRenamer, TaxDocumentProcessor } = require('./standalone-runner.js');

// サーバーポート
const PORT = 3456;

// グローバル変数
let watchFolder = 'C:\\Downloads';
let outputFolder = 'C:\\TaxDocs\\2024';
let isWatching = false;
let watchInterval = null;
let processedFiles = new Set();

// ファイル監視
function startWatching(callback) {
    if (isWatching) return;
    
    isWatching = true;
    console.log(`監視開始: ${watchFolder}`);
    
    // 5秒ごとにスキャン
    watchInterval = setInterval(() => {
        scanFolder(callback);
    }, 5000);
    
    // 初回スキャン
    scanFolder(callback);
}

// 監視停止
function stopWatching() {
    if (!isWatching) return;
    
    isWatching = false;
    if (watchInterval) {
        clearInterval(watchInterval);
        watchInterval = null;
    }
    console.log('監視停止');
}

// フォルダスキャン
function scanFolder(callback) {
    if (!fs.existsSync(watchFolder)) {
        callback({ error: 'フォルダが存在しません' });
        return;
    }
    
    try {
        const files = fs.readdirSync(watchFolder)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return (ext === '.pdf' || ext === '.csv') && !processedFiles.has(file);
            })
            .map(file => ({
                name: file,
                path: path.join(watchFolder, file),
                size: fs.statSync(path.join(watchFolder, file)).size,
                isNew: !processedFiles.has(file)
            }));
        
        callback({ files });
    } catch (error) {
        callback({ error: error.message });
    }
}

// ファイル処理
async function processFiles(fileList, callback) {
    const parser = new PDFParser();
    const renamer = new FileRenamer();
    const results = [];
    
    for (const file of fileList) {
        try {
            // ファイル名解析
            const analysis = parser.analyzeFileName(file.name);
            
            // 推奨名生成
            let suggestedName = null;
            if (analysis.documentType !== '不明') {
                suggestedName = renamer.generateSuggestedName(
                    analysis.documentType,
                    analysis.companyName || 'デフォルト株式会社',
                    analysis.fiscalYear || '2407'
                );
            }
            
            if (suggestedName) {
                // リネーム実行
                const oldPath = file.path;
                const result = await renamer.renameFile(oldPath, suggestedName, outputFolder);
                
                if (result.success) {
                    processedFiles.add(file.name);
                    results.push({
                        original: file.name,
                        renamed: suggestedName,
                        category: result.categoryFolder,
                        success: true
                    });
                } else {
                    results.push({
                        original: file.name,
                        error: result.error,
                        success: false
                    });
                }
            } else {
                results.push({
                    original: file.name,
                    error: '推奨名を生成できませんでした',
                    success: false
                });
            }
        } catch (error) {
            results.push({
                original: file.name,
                error: error.message,
                success: false
            });
        }
    }
    
    callback({ results });
}

// HTTPサーバー作成
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // CORS対応
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // ルーティング
    if (pathname === '/' || pathname === '/index.html') {
        // HTMLファイルを返す
        const htmlPath = path.join(__dirname, 'gui.html');
        fs.readFile(htmlPath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading GUI');
                return;
            }
            
            // APIエンドポイントを追加
            const modifiedHtml = data.replace(
                '// ダミーデータ生成（デモ用）',
                `
                // API通信
                const API_URL = 'http://localhost:${PORT}';
                
                async function getFilesFromFolder(folder) {
                    const response = await fetch(\`\${API_URL}/api/scan?folder=\${encodeURIComponent(folder)}\`);
                    const data = await response.json();
                    if (data.error) throw new Error(data.error);
                    return data.files;
                }
                
                async function processFilesAPI(files) {
                    const response = await fetch(\`\${API_URL}/api/process\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ files, outputFolder: document.getElementById('outputFolder').value })
                    });
                    const data = await response.json();
                    return data.results;
                }
                
                // ファイル処理を修正
                async function processFile(file) {
                    try {
                        const results = await processFilesAPI([file]);
                        const result = results[0];
                        
                        if (result.success) {
                            addLog(\`✅ \${file.name} → \${result.renamed}\`, 'success');
                            processedFiles.add(file.path);
                        } else {
                            addLog(\`❌ \${file.name} - エラー: \${result.error}\`, 'error');
                        }
                        updateStats();
                    } catch (error) {
                        addLog(\`❌ \${file.name} - エラー: \${error.message}\`, 'error');
                    }
                }
                `
            );
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(modifiedHtml);
        });
        
    } else if (pathname === '/api/scan') {
        // フォルダスキャンAPI
        watchFolder = parsedUrl.query.folder || watchFolder;
        scanFolder((result) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        });
        
    } else if (pathname === '/api/process' && req.method === 'POST') {
        // ファイル処理API
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                outputFolder = data.outputFolder || outputFolder;
                
                processFiles(data.files, (result) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                });
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        
    } else if (pathname === '/api/watch/start') {
        // 監視開始API
        startWatching((result) => {
            console.log('監視結果:', result);
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'started' }));
        
    } else if (pathname === '/api/watch/stop') {
        // 監視停止API
        stopWatching();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'stopped' }));
        
    } else {
        // 404
        res.writeHead(404);
        res.end('Not Found');
    }
});

// サーバー起動
server.listen(PORT, () => {
    console.log(`
=====================================
税務書類自動リネームシステム GUI版
=====================================

サーバーが起動しました！

ブラウザで以下のURLを開いてください:
http://localhost:${PORT}

停止するには Ctrl+C を押してください。
`);
    
    // 自動的にブラウザを開く
    const startCommand = process.platform === 'win32' ? 'start' : 
                        process.platform === 'darwin' ? 'open' : 'xdg-open';
    
    exec(`${startCommand} http://localhost:${PORT}`, (error) => {
        if (error) {
            console.log('\nブラウザを手動で開いてください: http://localhost:' + PORT);
        }
    });
});

// 終了処理
process.on('SIGINT', () => {
    console.log('\nサーバーを停止しています...');
    stopWatching();
    server.close(() => {
        console.log('サーバーが停止しました。');
        process.exit(0);
    });
});