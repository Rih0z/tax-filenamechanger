@echo off
echo =====================================
echo 税務書類自動リネームシステム
echo =====================================
echo.

if "%1"=="" goto :usage
if "%2"=="" goto :usage

echo 処理を開始します...
echo 入力フォルダ: %1
echo 出力フォルダ: %2
echo.

node "%~dp0standalone-runner.js" %1 %2

echo.
echo 処理が完了しました。
pause
goto :eof

:usage
echo 使用方法: run.bat "入力フォルダ" "出力フォルダ"
echo.
echo 例: run.bat "C:\Downloads" "D:\税務書類\2024"
echo.
echo デモを実行する場合:
node "%~dp0standalone-runner.js" --demo
echo.
pause