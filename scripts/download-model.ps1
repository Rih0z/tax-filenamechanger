# Model Download Script with Resume Support
# Usage: powershell -ExecutionPolicy Bypass -File scripts/download-model.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$Url,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputFile = "gpt-oss-20b-Q4_K_M.gguf"
)

Write-Host "🚀 Starting model download with resume support..." -ForegroundColor Green
Write-Host "URL: $Url" -ForegroundColor Yellow
Write-Host "Output: $OutputFile" -ForegroundColor Yellow

try {
    # Check if partial file exists
    if (Test-Path $OutputFile) {
        $existingSize = (Get-Item $OutputFile).Length
        Write-Host "📦 Found partial download: $([math]::Round($existingSize/1MB, 2)) MB" -ForegroundColor Cyan
        Write-Host "🔄 Resuming download..." -ForegroundColor Green
    } else {
        Write-Host "📥 Starting fresh download..." -ForegroundColor Green
    }
    
    # Download with resume support and progress
    $progressPreference = 'Continue'
    Invoke-WebRequest -Uri $Url -OutFile $OutputFile -Resume -UseBasicParsing
    
    # Verify download
    if (Test-Path $OutputFile) {
        $finalSize = (Get-Item $OutputFile).Length
        Write-Host "✅ Download complete: $([math]::Round($finalSize/1MB, 2)) MB" -ForegroundColor Green
        Write-Host "📁 Saved to: $(Get-Location)\$OutputFile" -ForegroundColor Green
    } else {
        Write-Host "❌ Download failed - file not created" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "🔧 Try using curl as alternative:" -ForegroundColor Yellow
    Write-Host "curl -L -C - -o `"$OutputFile`" `"$Url`"" -ForegroundColor White
    exit 1
}

Write-Host "🎉 Model download successful!" -ForegroundColor Green