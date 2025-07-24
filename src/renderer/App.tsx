import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import {
  FolderOpen as FolderIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { FileInfo, Client, ParsedDocument } from '@shared/types';

interface ElectronAPI {
  scanFiles: (folders: string[]) => Promise<any>;
  parsePDF: (filePath: string) => Promise<any>;
  batchProcess: (operations: any[]) => Promise<any>;
  getClients: () => Promise<any>;
  createClient: (client: any) => Promise<any>;
  selectFolder: () => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

interface ProcessableFile extends FileInfo {
  parsedDocument?: ParsedDocument;
  suggestedName?: string;
  selected: boolean;
  editing: boolean;
  customName?: string;
}

const App: React.FC = () => {
  const [files, setFiles] = useState<ProcessableFile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [watchFolders] = useState<string[]>([
    process.platform === 'win32' 
      ? `${process.env.USERPROFILE}\\Downloads`
      : `${process.env.HOME}/Downloads`
  ]);

  // 初期化
  useEffect(() => {
    loadClients();
    setupEventListeners();
    
    return () => {
      // イベントリスナーのクリーンアップ
      window.electronAPI.off('file:detected', handleFileDetected);
    };
  }, []);

  const setupEventListeners = () => {
    window.electronAPI.on('file:detected', handleFileDetected);
  };

  const handleFileDetected = async (fileInfo: FileInfo) => {
    toast.info('新しいファイルが見つかりました');
    await scanFiles();
  };

  const loadClients = async () => {
    try {
      const response = await window.electronAPI.getClients();
      if (response.success) {
        setClients(response.data.clients);
      }
    } catch (error) {
      console.error('クライアント読み込みエラー:', error);
    }
  };

  const scanFiles = async () => {
    setScanning(true);
    try {
      const response = await window.electronAPI.scanFiles(watchFolders);
      
      if (response.success) {
        const detectedFiles = response.data.files;
        const processableFiles: ProcessableFile[] = [];
        
        // 各ファイルを解析
        for (const fileInfo of detectedFiles) {
          if (fileInfo.extension === '.pdf') {
            try {
              const parseResponse = await window.electronAPI.parsePDF(fileInfo.path);
              
              if (parseResponse.success) {
                processableFiles.push({
                  ...fileInfo,
                  parsedDocument: parseResponse.data.document,
                  suggestedName: parseResponse.data.document.suggestedName,
                  selected: true,
                  editing: false
                });
              }
            } catch (error) {
              // PDF解析に失敗した場合でもファイルは表示
              processableFiles.push({
                ...fileInfo,
                selected: true,
                editing: false
              });
            }
          } else {
            // CSV等の他のファイル
            processableFiles.push({
              ...fileInfo,
              selected: true,
              editing: false
            });
          }
        }
        
        setFiles(processableFiles);
        
        if (processableFiles.length > 0) {
          toast.success(`${processableFiles.length}件のファイルを検出しました`);
        } else {
          toast.info('新しいファイルは見つかりませんでした');
        }
      }
    } catch (error) {
      toast.error('ファイルスキャンに失敗しました');
      console.error('Scan error:', error);
    } finally {
      setScanning(false);
    }
  };

  const handleFileToggle = (fileId: string) => {
    setFiles(files.map(file => 
      file.id === fileId 
        ? { ...file, selected: !file.selected }
        : file
    ));
  };

  const handleFileEdit = (fileId: string) => {
    setFiles(files.map(file => 
      file.id === fileId 
        ? { ...file, editing: true, customName: file.suggestedName || file.name }
        : file
    ));
  };

  const handleFileNameSave = (fileId: string, newName: string) => {
    setFiles(files.map(file => 
      file.id === fileId 
        ? { ...file, editing: false, customName: newName, suggestedName: newName }
        : file
    ));
  };

  const processFiles = async () => {
    if (!selectedClient) {
      toast.error('振り分け先クライアントを選択してください');
      return;
    }

    const selectedFiles = files.filter(file => file.selected);
    if (selectedFiles.length === 0) {
      toast.error('処理するファイルを選択してください');
      return;
    }

    setProcessing(true);

    try {
      const client = clients.find(c => c.id === selectedClient);
      if (!client) {
        toast.error('選択されたクライアントが見つかりません');
        return;
      }

      const operations = selectedFiles.map(file => ({
        fileId: file.id,
        oldPath: file.path,
        newName: file.customName || file.suggestedName || file.name,
        targetFolder: client.outputFolder,
        documentType: file.parsedDocument?.analysis.documentType
      }));

      const response = await window.electronAPI.batchProcess(operations);
      
      if (response.success) {
        const { processedFiles, failedFiles } = response.data;
        
        if (processedFiles > 0) {
          toast.success(`${processedFiles}件のファイルを処理しました`);
        }
        
        if (failedFiles > 0) {
          toast.warn(`${failedFiles}件のファイル処理に失敗しました`);
        }

        // 処理済みファイルを一覧から除去
        setFiles(files.filter(file => !file.selected));
      }
    } catch (error) {
      toast.error('ファイル処理に失敗しました');
      console.error('Process error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const selectAllFiles = () => {
    setFiles(files.map(file => ({ ...file, selected: true })));
  };

  const deselectAllFiles = () => {
    setFiles(files.map(file => ({ ...file, selected: false })));
  };

  const selectedCount = files.filter(f => f.selected).length;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          税務書類リネーマー
        </Typography>
        <Typography variant="body1" color="text.secondary">
          e-Tax/eLTAXからダウンロードした税務書類を自動でリネーム・整理します
        </Typography>
      </Paper>

      {/* 操作パネル */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <Button
                variant="contained"
                startIcon={scanning ? <CircularProgress size={20} /> : <RefreshIcon />}
                onClick={scanFiles}
                disabled={scanning}
                fullWidth
              >
                {scanning ? 'スキャン中...' : 'ファイルをスキャン'}
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="text.secondary">
                監視フォルダ: {watchFolders[0]}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ファイル一覧 */}
      {files.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                検出ファイル: {files.length}件 
                <Chip 
                  label={`${selectedCount}件選択中`} 
                  size="small" 
                  sx={{ ml: 1 }}
                  color={selectedCount > 0 ? 'primary' : 'default'}
                />
              </Typography>
              <Box>
                <Button onClick={selectAllFiles} size="small">
                  全選択
                </Button>
                <Button onClick={deselectAllFiles} size="small">
                  全解除
                </Button>
              </Box>
            </Box>
          </Box>

          <List>
            {files.map((file, index) => (
              <React.Fragment key={file.id}>
                <ListItem>
                  <Checkbox
                    checked={file.selected}
                    onChange={() => handleFileToggle(file.id)}
                    sx={{ mr: 1 }}
                  />
                  
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {file.name}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body1" sx={{ mr: 1 }}>
                            →
                          </Typography>
                          {file.editing ? (
                            <TextField
                              value={file.customName || ''}
                              onChange={(e) => {
                                const updatedFiles = files.map(f => 
                                  f.id === file.id 
                                    ? { ...f, customName: e.target.value }
                                    : f
                                );
                                setFiles(updatedFiles);
                              }}
                              onBlur={() => handleFileNameSave(file.id, file.customName || '')}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleFileNameSave(file.id, file.customName || '');
                                }
                              }}
                              size="small"
                              autoFocus
                              sx={{ flexGrow: 1 }}
                            />
                          ) : (
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontWeight: 500,
                                color: file.suggestedName ? 'primary.main' : 'text.primary'
                              }}
                            >
                              {file.customName || file.suggestedName || file.name}
                            </Typography>
                          )}
                        </Box>
                        
                        {file.parsedDocument && (
                          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip 
                              label={file.parsedDocument.analysis.documentType}
                              size="small"
                              color="secondary"
                            />
                            {file.parsedDocument.analysis.companyName && (
                              <Chip 
                                label={file.parsedDocument.analysis.companyName}
                                size="small"
                                variant="outlined"
                              />
                            )}
                            {file.parsedDocument.analysis.confidence && (
                              <Chip 
                                label={`信頼度: ${Math.round(file.parsedDocument.analysis.confidence * 100)}%`}
                                size="small"
                                color={file.parsedDocument.analysis.confidence > 0.8 ? 'success' : 'warning'}
                                variant="outlined"
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton
                      onClick={() => handleFileEdit(file.id)}
                      disabled={file.editing}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                
                {index < files.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* 処理パネル */}
      {files.length > 0 && (
        <Card>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>振り分け先クライアント</InputLabel>
                  <Select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    label="振り分け先クライアント"
                  >
                    {clients.map((client) => (
                      <MenuItem key={client.id} value={client.id}>
                        {client.name} ({client.fiscalYearEnd}期)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={processing ? <CircularProgress size={20} /> : <PlayIcon />}
                  onClick={processFiles}
                  disabled={processing || selectedCount === 0 || !selectedClient}
                  fullWidth
                >
                  {processing ? '処理中...' : `リネーム+移動 実行 (${selectedCount}件)`}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 空状態 */}
      {files.length === 0 && !scanning && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            処理対象のファイルがありません
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            「ファイルをスキャン」ボタンをクリックして新しいファイルを検索してください
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={scanFiles}
          >
            ファイルをスキャン
          </Button>
        </Paper>
      )}
    </Container>
  );
};

export default App;