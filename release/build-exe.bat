@echo off
echo =====================================
echo 税務書類リネーマー EXEビルド
echo =====================================
echo.
echo Windows用のEXEファイルを作成します...
echo.
npm run dist:win
echo.
echo ビルドが完了しました！
echo 作成されたファイル: dist\税務書類リネーマー Setup *.exe
echo.
pause