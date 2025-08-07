#!/bin/bash
# Model Download Script with Resume Support
# Usage: ./scripts/download-model.sh <URL> [output_file]

URL="$1"
OUTPUT_FILE="${2:-gpt-oss-20b-Q4_K_M.gguf}"

if [ -z "$URL" ]; then
    echo "❌ Usage: $0 <download_url> [output_file]"
    echo "Example: $0 https://huggingface.co/model/file.gguf model.gguf"
    exit 1
fi

echo "🚀 Starting model download with resume support..."
echo "URL: $URL"
echo "Output: $OUTPUT_FILE"

# Check if partial file exists
if [ -f "$OUTPUT_FILE" ]; then
    SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo "📦 Found partial download: $SIZE"
    echo "🔄 Resuming download..."
else
    echo "📥 Starting fresh download..."
fi

# Download with resume support
echo "⏳ Downloading..."
if curl -L -C - --connect-timeout 30 --max-time 3600 --progress-bar -o "$OUTPUT_FILE" "$URL"; then
    if [ -f "$OUTPUT_FILE" ]; then
        FINAL_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
        echo "✅ Download complete: $FINAL_SIZE"
        echo "📁 Saved to: $(pwd)/$OUTPUT_FILE"
        echo "🎉 Model download successful!"
    else
        echo "❌ Download failed - file not created"
        exit 1
    fi
else
    echo "❌ Download failed"
    echo "🔧 You can try manually with:"
    echo "curl -L -C - -o \"$OUTPUT_FILE\" \"$URL\""
    exit 1
fi