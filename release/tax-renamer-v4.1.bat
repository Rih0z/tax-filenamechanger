@echo off
:: 税務書類リネーマー v4.1 - 完全修正版
:: 全バグ修正確認済み（重複回避、手動ファイル対応、期間コード正確化）

echo =====================================
echo 税務書類リネーマー v4.1
echo 最新完全修正版 - 全バグ解決済み
echo =====================================
echo.

:: Node.jsの存在確認
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [エラー] Node.jsがインストールされていません
    echo Node.jsを https://nodejs.org/ からダウンロードしてください
    pause
    exit /b 1
)

:: アプリケーションの実行
cd /d "%~dp0"
node latest-bug-fixed-app.js %*

if %errorlevel% equ 0 (
    echo.
    echo =============================
    echo 処理が完了しました
    echo =============================
) else (
    echo.
    echo [エラー] 処理中にエラーが発生しました
)

pause