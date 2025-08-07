@echo off
REM 税務書類リネーマー v4.0 - GitHub Release アップロードスクリプト（Windows版）
REM EXEファイルはGitHub Releasesで配布する（.gitignore記載通り）

set VERSION=v4.0.0
set RELEASE_NAME=税務書類リネーマー %VERSION%

echo ===============================================
echo 📦 GitHub Release アップロードスクリプト
echo ===============================================
echo.

REM GitHub CLIがインストールされているか確認
where gh >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ エラー: GitHub CLI (gh) がインストールされていません
    echo 👉 https://cli.github.com/ からインストールしてください
    pause
    exit /b 1
)

REM 認証確認
echo 🔐 GitHub認証確認中...
gh auth status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ GitHub CLIが認証されていません
    echo 以下のコマンドを実行してください:
    echo gh auth login
    pause
    exit /b 1
)

REM EXEファイルの存在確認
if not exist "release\税務書類リネーマーv4.0.exe" (
    echo ❌ エラー: release\税務書類リネーマーv4.0.exe が見つかりません
    pause
    exit /b 1
)

echo.
echo 📤 GitHub Release を作成します...
echo バージョン: %VERSION%
echo.

REM リリース作成（ドラフトとして）
gh release create %VERSION% ^
  --repo Rih0z/tax-filenamechanger ^
  --title "%RELEASE_NAME%" ^
  --notes-file release\RELEASE_NOTES.md ^
  --draft

if %ERRORLEVEL% NEQ 0 (
    echo ❌ リリース作成に失敗しました
    pause
    exit /b 1
)

echo.
echo 📤 EXEファイルをアップロード中...
gh release upload %VERSION% ^
  "release\税務書類リネーマーv4.0.exe" ^
  --repo Rih0z/tax-filenamechanger ^
  --clobber

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ アップロード完了！
    echo.
    echo 👉 以下のURLでリリースを確認・公開してください:
    echo https://github.com/Rih0z/tax-filenamechanger/releases/tag/%VERSION%
    echo.
    echo 注意: リリースはドラフト状態です。確認後に公開してください。
) else (
    echo ❌ アップロードに失敗しました
)

pause