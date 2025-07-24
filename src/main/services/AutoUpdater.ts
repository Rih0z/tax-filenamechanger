import { autoUpdater } from 'electron-updater';
import { dialog, BrowserWindow } from 'electron';
import { Logger } from '../utils/logger';

export class AutoUpdater {
  private logger: Logger;
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.logger = new Logger('AutoUpdater');
    this.mainWindow = mainWindow;
    this.setupAutoUpdater();
  }

  private setupAutoUpdater() {
    // 開発環境では自動アップデートを無効化
    if (process.env.NODE_ENV === 'development') {
      autoUpdater.updateConfigPath = undefined;
      return;
    }

    // アップデートサーバーの設定（GitHubリリース使用）
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'Rih0z',
      repo: 'tax-filenamechanger',
      private: false
    });

    // 自動ダウンロードを無効化（ユーザー確認後にダウンロード）
    autoUpdater.autoDownload = false;

    // イベントリスナー設定
    this.registerEventListeners();

    // 起動時にアップデートをチェック（5秒後）
    setTimeout(() => {
      this.checkForUpdates();
    }, 5000);
  }

  private registerEventListeners() {
    // アップデート利用可能
    autoUpdater.on('update-available', (info) => {
      this.logger.info('Update available:', info.version);
      
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: '新しいバージョンが利用可能です',
        message: `新しいバージョン ${info.version} が利用可能です。\nアップデートしますか？`,
        detail: '最新機能やバグ修正が含まれています。',
        buttons: ['今すぐアップデート', '後でアップデート'],
        defaultId: 0,
        cancelId: 1
      }).then((response) => {
        if (response.response === 0) {
          // アップデートをダウンロード
          autoUpdater.downloadUpdate();
          
          // 進捗ダイアログを表示
          dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'アップデート中',
            message: 'アップデートをダウンロードしています...',
            buttons: ['OK']
          });
        }
      });
    });

    // アップデート利用不可
    autoUpdater.on('update-not-available', () => {
      this.logger.info('Update not available');
    });

    // ダウンロード進捗
    autoUpdater.on('download-progress', (progressObj) => {
      this.logger.info(`Download progress: ${progressObj.percent}%`);
      
      // レンダラープロセスに進捗を送信
      this.mainWindow.webContents.send('update:progress', {
        percent: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    });

    // ダウンロード完了
    autoUpdater.on('update-downloaded', (info) => {
      this.logger.info('Update downloaded:', info.version);
      
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'アップデート準備完了',
        message: 'アップデートの準備ができました。\n今すぐ再起動しますか？',
        detail: 'アプリケーションが再起動され、新しいバージョンが適用されます。',
        buttons: ['今すぐ再起動', '後で再起動'],
        defaultId: 0,
        cancelId: 1
      }).then((response) => {
        if (response.response === 0) {
          // アプリケーションを再起動してアップデートを適用
          autoUpdater.quitAndInstall(false, true);
        }
      });
    });

    // エラー発生
    autoUpdater.on('error', (error) => {
      this.logger.error('Auto updater error:', error);
      
      dialog.showErrorBox(
        'アップデートエラー',
        'アップデートの確認中にエラーが発生しました。\n手動で最新版をダウンロードしてください。'
      );
    });
  }

  // 手動でアップデートチェック
  checkForUpdates() {
    if (process.env.NODE_ENV === 'development') {
      this.logger.info('Skipping update check in development mode');
      return;
    }

    this.logger.info('Checking for updates...');
    autoUpdater.checkForUpdatesAndNotify();
  }

  // 手動でアップデートチェック（UIから呼び出し）
  async checkForUpdatesManual(): Promise<boolean> {
    if (process.env.NODE_ENV === 'development') {
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: '開発モード',
        message: '開発モードでは自動アップデート機能は利用できません。',
        buttons: ['OK']
      });
      return false;
    }

    try {
      const result = await autoUpdater.checkForUpdates();
      
      if (!result) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: '最新バージョンです',
          message: '現在お使いのバージョンが最新です。',
          buttons: ['OK']
        });
      }
      
      return !!result;
    } catch (error) {
      this.logger.error('Manual update check failed:', error);
      
      dialog.showErrorBox(
        'アップデートチェック失敗',
        'アップデートの確認に失敗しました。\nインターネット接続を確認してください。'
      );
      
      return false;
    }
  }
}