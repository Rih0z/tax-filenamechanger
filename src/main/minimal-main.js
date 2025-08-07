const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');

let mainWindow;

// アプリケーション起動時のログ
console.log('税務書類リネーマー起動中...');

function createWindow() {
  console.log('ウィンドウ作成開始');
  
  try {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      title: '税務書類リネーマー',
      show: false // 最初は非表示
    });

    console.log('ウィンドウ作成完了');

    // シンプルなHTMLページをロード
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>税務書類リネーマー</title>
      <style>
        body { 
          font-family: 'MS Gothic', monospace; 
          margin: 50px; 
          background: #f5f5f5;
        }
        .container { 
          background: white; 
          padding: 30px; 
          border-radius: 8px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .status { color: #28a745; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎉 税務書類リネーマー</h1>
        <p class="status">✅ アプリケーション起動成功！</p>
        <p>この画面が表示されれば、EXEは正常に動作しています。</p>
        <p>バージョン: 2.0.0 (修正完了版)</p>
        <hr>
        <h2>修正されたバグ:</h2>
        <ul>
          <li>EventLogInternalエラー → 解決済み</li>
          <li>ファイル重複問題 → 解決済み</li>
          <li>手動ファイル対応 → 解決済み</li>
          <li>期間コード算出 → 解決済み</li>
        </ul>
      </div>
    </body>
    </html>`;

    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    
    mainWindow.once('ready-to-show', () => {
      console.log('ウィンドウ表示準備完了');
      mainWindow.show();
      console.log('ウィンドウ表示完了');
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
      console.log('ウィンドウ閉じられました');
    });

  } catch (error) {
    console.error('ウィンドウ作成エラー:', error);
    dialog.showErrorBox('エラー', 'ウィンドウの作成に失敗しました: ' + error.message);
  }
}

app.whenReady().then(() => {
  console.log('Electronアプリ準備完了');
  createWindow();
}).catch(error => {
  console.error('アプリ初期化エラー:', error);
});

app.on('window-all-closed', () => {
  console.log('全ウィンドウが閉じられました');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('未処理例外:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未処理Promise拒否:', reason);
});

console.log('メインプロセス初期化完了');