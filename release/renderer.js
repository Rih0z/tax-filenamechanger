// グローバル変数
let detectedFiles = [];
let processedFiles = new Set();
let isWatching = false;
let settings = {};

// 初期化
window.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    addLog('[システム] 設定を読み込みました', 'info');
    
    // フォルダ変更イベントリスナー
    window.electronAPI.onFolderChanged(async (folderPath) => {
        if (isWatching) {
            await scanFolder();
        }
    });
});

// 設定読み込み
async function loadSettings() {
    try {
        settings = await window.electronAPI.loadSettings();
        document.getElementById('watchFolder').value = settings.watchFolder;
        document.getElementById('outputFolder').value = settings.outputFolder;
    } catch (error) {
        addLog(`[エラー] 設定読み込み失敗: ${error.message}`, 'error');
    }
}

// フォルダ選択
async function selectWatchFolder() {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
        document.getElementById('watchFolder').value = folderPath;
        settings.watchFolder = folderPath;
        await saveSettings();
    }
}

async function selectOutputFolder() {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
        document.getElementById('outputFolder').value = folderPath;
        settings.outputFolder = folderPath;
        await saveSettings();
    }
}

// 設定保存
async function saveSettings() {
    try {
        await window.electronAPI.saveSettings(settings);
        addLog('[システム] 設定を保存しました', 'success');
    } catch (error) {
        addLog(`[エラー] 設定保存失敗: ${error.message}`, 'error');
    }
}

// 監視切り替え
async function toggleWatching() {
    if (isWatching) {
        await stopWatching();
    } else {
        await startWatching();
    }
}

// 監視開始
async function startWatching() {
    const watchFolder = document.getElementById('watchFolder').value;
    if (!watchFolder) {
        alert('監視フォルダを指定してください');
        return;
    }

    try {
        await window.electronAPI.startWatching(watchFolder);
        isWatching = true;
        
        const btn = document.getElementById('watchBtn');
        btn.innerHTML = '<span class="status-indicator status-active"></span>監視停止';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-danger');
        
        addLog(`[監視] 開始: ${watchFolder}`, 'success');
        
        // 初回スキャン
        await scanFolder();
    } catch (error) {
        addLog(`[エラー] 監視開始失敗: ${error.message}`, 'error');
    }
}

// 監視停止
async function stopWatching() {
    try {
        await window.electronAPI.stopWatching();
        isWatching = false;
        
        const btn = document.getElementById('watchBtn');
        btn.innerHTML = '<span class="status-indicator status-inactive"></span>監視開始';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-primary');
        
        addLog('[監視] 停止しました', 'info');
    } catch (error) {
        addLog(`[エラー] 監視停止失敗: ${error.message}`, 'error');
    }
}

// フォルダスキャン
async function scanFolder() {
    const watchFolder = document.getElementById('watchFolder').value;
    
    try {
        const files = await window.electronAPI.scanFolder(watchFolder);
        
        // 新規ファイルのみ追加
        const newFiles = files.filter(file => 
            !detectedFiles.some(df => df.path === file.path) && 
            !processedFiles.has(file.path)
        );
        
        if (newFiles.length > 0) {
            addLog(`[スキャン] ${newFiles.length}個の新規ファイルを検出`, 'info');
            detectedFiles = [...detectedFiles, ...newFiles];
            updateFileList();
            
            // 自動処理が有効な場合
            if (settings.autoProcess && isWatching) {
                setTimeout(() => processNewFiles(newFiles), 1000);
            }
        }
        
        updateStats();
    } catch (error) {
        addLog(`[エラー] スキャン失敗: ${error.message}`, 'error');
    }
}

// 今すぐスキャン
async function scanNow() {
    addLog('[スキャン] 手動スキャンを実行', 'info');
    await scanFolder();
}

// ファイル一覧更新
function updateFileList() {
    const fileList = document.getElementById('fileList');
    
    if (detectedFiles.length === 0) {
        fileList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>ファイルが検出されていません</p>
                <p style="margin-top: 10px; font-size: 14px;">監視を開始するか、「今すぐスキャン」を実行してください</p>
            </div>
        `;
        return;
    }
    
    fileList.innerHTML = detectedFiles.map((file, index) => {
        const analysis = analyzeFileName(file.name);
        const suggestedName = generateSuggestedName(analysis);
        const category = getCategoryFolder(suggestedName || file.name);
        
        return `
            <div class="file-card" onclick="toggleFileSelection(${index})">
                <div style="display: flex; align-items: flex-start;">
                    <input type="checkbox" 
                           id="file-${index}" 
                           class="file-checkbox"
                           checked
                           onclick="event.stopPropagation()">
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-rename">
                            <span>→</span>
                            <span>${suggestedName || '(推奨名なし)'}</span>
                        </div>
                        <div class="file-category">${category}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ファイル選択切り替え
function toggleFileSelection(index) {
    const checkbox = document.getElementById(`file-${index}`);
    checkbox.checked = !checkbox.checked;
}

// ファイル名解析
function analyzeFileName(fileName) {
    const analysis = {
        documentType: '不明',
        companyName: null,
        fiscalYear: null
    };

    // e-Tax形式
    const eTaxPattern = /^(.+?)_(\d{8})(.+?)_(\d{14})\.pdf$/;
    const match = fileName.match(eTaxPattern);
    
    if (match) {
        const docName = match[1];
        const fiscalDate = match[2];
        const company = match[3];
        
        analysis.fiscalYear = fiscalDate.substring(2, 4) + fiscalDate.substring(4, 6);
        analysis.companyName = company.replace(/\s+/g, '');
        
        if (docName.includes('法人税及び地方法人税申告書')) {
            analysis.documentType = '法人税申告書';
        } else if (docName.includes('消費税申告書')) {
            analysis.documentType = '消費税申告書';
        } else if (docName.includes('都道府県民税')) {
            analysis.documentType = '都道府県税申告書';
        }
    } else {
        // 手動命名パターン
        if (fileName.includes('受信通知')) {
            analysis.documentType = '受信通知';
        } else if (fileName.includes('納付情報')) {
            analysis.documentType = '納付情報';
        } else if (fileName.includes('決算書')) {
            analysis.documentType = '決算書';
        } else if (fileName.includes('固定資産')) {
            analysis.documentType = '固定資産台帳';
        }
    }
    
    return analysis;
}

// 推奨名生成
function generateSuggestedName(analysis) {
    const docTypeMap = {
        '法人税申告書': { number: '0001', name: '法人税及び地方法人税申告書' },
        '受信通知': { number: '0003', name: '受信通知' },
        '納付情報': { number: '0004', name: '納付情報' },
        '都道府県税申告書': { number: '1000', name: '都道府県税申告書' },
        '消費税申告書': { number: '3001', name: '消費税及び地方消費税申告書' },
        '決算書': { number: '5001', name: '決算書' },
        '固定資産台帳': { number: '6001', name: '固定資産台帳' }
    };

    const mapping = docTypeMap[analysis.documentType];
    if (!mapping) return null;

    const fiscalYear = analysis.fiscalYear || settings.defaultFiscalYear || '2407';
    return `${mapping.number}_${mapping.name}_${fiscalYear}.pdf`;
}

// カテゴリフォルダ取得
function getCategoryFolder(fileName) {
    const numberMatch = fileName.match(/^(\d{4})/);
    if (!numberMatch) return 'その他';

    const number = parseInt(numberMatch[1]);
    
    if (number >= 0 && number <= 999) return '0000番台_法人税';
    if (number >= 1000 && number <= 1999) return '1000番台_都道府県税';
    if (number >= 2000 && number <= 2999) return '2000番台_市民税';
    if (number >= 3000 && number <= 3999) return '3000番台_消費税';
    if (number >= 5000 && number <= 5999) return '5000番台_決算書類';
    if (number >= 6000 && number <= 6999) return '6000番台_固定資産';
    
    return 'その他';
}

// 選択ファイル処理
async function processSelected() {
    const selectedFiles = [];
    detectedFiles.forEach((file, index) => {
        const checkbox = document.getElementById(`file-${index}`);
        if (checkbox && checkbox.checked) {
            selectedFiles.push(file);
        }
    });

    if (selectedFiles.length === 0) {
        alert('処理するファイルを選択してください');
        return;
    }

    await processFiles(selectedFiles);
}

// 新規ファイル自動処理
async function processNewFiles(files) {
    addLog(`[自動処理] ${files.length}個のファイルを処理開始`, 'info');
    await processFiles(files);
}

// ファイル処理
async function processFiles(fileList) {
    const outputFolder = document.getElementById('outputFolder').value;
    if (!outputFolder) {
        alert('出力フォルダを指定してください');
        return;
    }

    // プログレス表示
    showProgress();
    updateProgress(0, '処理を開始しています...');

    try {
        const results = await window.electronAPI.processFiles(fileList, outputFolder);
        
        let successCount = 0;
        let errorCount = 0;

        results.forEach((result, index) => {
            const progress = Math.round(((index + 1) / results.length) * 100);
            updateProgress(progress, `${index + 1}/${results.length} ファイル処理中`);

            if (result.success) {
                successCount++;
                addLog(`[成功] ${result.original} → ${result.renamed}`, 'success');
                
                // 処理済みファイルをリストから削除
                const fileIndex = detectedFiles.findIndex(f => f.name === result.original);
                if (fileIndex !== -1) {
                    processedFiles.add(detectedFiles[fileIndex].path);
                    detectedFiles.splice(fileIndex, 1);
                }
            } else {
                errorCount++;
                addLog(`[エラー] ${result.original} - ${result.error}`, 'error');
            }
        });

        addLog(`[処理完了] 成功: ${successCount}, エラー: ${errorCount}`, 
               errorCount === 0 ? 'success' : 'warning');

        updateFileList();
        updateStats();
    } catch (error) {
        addLog(`[エラー] 処理失敗: ${error.message}`, 'error');
    } finally {
        hideProgress();
    }
}

// プログレス表示
function showProgress() {
    document.getElementById('progressOverlay').style.display = 'flex';
}

function hideProgress() {
    document.getElementById('progressOverlay').style.display = 'none';
}

function updateProgress(percent, text) {
    const fill = document.getElementById('progressFill');
    fill.style.width = `${percent}%`;
    fill.textContent = `${percent}%`;
    document.getElementById('progressText').textContent = text;
}

// 統計更新
function updateStats() {
    document.getElementById('totalFiles').textContent = detectedFiles.length;
    document.getElementById('successCount').textContent = processedFiles.size;
    document.getElementById('errorCount').textContent = 0; // TODO: エラーカウント実装
    
    const total = detectedFiles.length + processedFiles.size;
    const rate = total > 0 ? Math.round((processedFiles.size / total) * 100) : 0;
    document.getElementById('successRate').textContent = `${rate}%`;
}

// 全選択/全解除
function selectAll() {
    detectedFiles.forEach((_, index) => {
        const checkbox = document.getElementById(`file-${index}`);
        if (checkbox) checkbox.checked = true;
    });
}

function deselectAll() {
    detectedFiles.forEach((_, index) => {
        const checkbox = document.getElementById(`file-${index}`);
        if (checkbox) checkbox.checked = false;
    });
}

// 出力フォルダを開く
async function openOutputFolder() {
    const outputFolder = document.getElementById('outputFolder').value;
    if (outputFolder) {
        const result = await window.electronAPI.openFolder(outputFolder);
        if (!result) {
            addLog('[エラー] フォルダが存在しません', 'error');
        }
    }
}

// ログ追加
function addLog(message, type = 'info') {
    const logArea = document.getElementById('logArea');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logArea.appendChild(entry);
    logArea.scrollTop = logArea.scrollHeight;
    
    // ログが多すぎる場合は古いものを削除
    while (logArea.children.length > 1000) {
        logArea.removeChild(logArea.firstChild);
    }
}

// 設定画面（TODO: 実装）
function showSettings() {
    alert('設定画面は開発中です');
}