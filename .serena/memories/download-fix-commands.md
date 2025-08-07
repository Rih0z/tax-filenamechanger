# Download Fix Commands for GPT Model

## Problem
- Download of gpt-oss-20b-Q4_K_M.gguf fails at 50%
- User needs to complete download using Serena MCP

## Solution Commands

### Using curl with resume capability:
```bash
curl -L -C - -o gpt-oss-20b-Q4_K_M.gguf "https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/gpt-oss-20b-Q4_K_M.gguf"
```

### Using wget (if available):
```bash
wget -c "https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/gpt-oss-20b-Q4_K_M.gguf"
```

### PowerShell method with resume:
```powershell
$url = "https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/gpt-oss-20b-Q4_K_M.gguf"
$output = "gpt-oss-20b-Q4_K_M.gguf"
Invoke-WebRequest -Uri $url -OutFile $output -Resume
```

### Check existing partial download:
```bash
dir gpt-oss-20b-Q4_K_M.gguf*
```