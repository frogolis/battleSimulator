import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { DATA_WORKBOOK_SHEET_LABELS } from '../features/data-file/constants';
import { exportGameDataToWorkbook } from '../features/data-file/exportManager';
import { importGameDataFromWorkbook, readFileAsBinary } from '../features/data-io/importManager';
import { DATA_IO_MESSAGES } from '../features/data-io/messages';
import { GameDataSetters, GameDataState, ImportedGameData } from '../features/data-io/model';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

interface DataExportImportProps extends GameDataState, GameDataSetters {
  currentTick: number;
  onImportSuccess: (data: ImportedGameData) => void;
}

const logDataIO = (..._args: unknown[]): void => {};

export function DataExportImport({
  currentTick,
  playerConfig,
  onPlayerConfigChange,
  monsterConfig,
  onMonsterConfigChange,
  playerLevelConfig,
  onPlayerLevelConfigChange,
  monsterLevelConfig,
  onMonsterLevelConfigChange,
  skillConfigs,
  onSkillConfigsChange,
  playerBasicAttack,
  onPlayerBasicAttackChange,
  monsterBasicAttack,
  onMonsterBasicAttackChange,
  itemSlots,
  onItemSlotsChange,
  characterTypes,
  onCharacterTypesChange,
  monsterTypeStats,
  onMonsterTypeStatsChange,
  playerDataset,
  onPlayerDatasetChange,
  monsterDataset,
  onMonsterDatasetChange,
  stageDefinitions,
  onStageDefinitionsChange,
  onImportSuccess,
}: DataExportImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importContextRef = useRef({
    currentTick,
    playerTypeId: playerConfig.typeId,
    monsterTypeId: monsterConfig.typeId,
  });
  importContextRef.current = {
    currentTick,
    playerTypeId: playerConfig.typeId,
    monsterTypeId: monsterConfig.typeId,
  };
  const importSuccessRef = useRef(onImportSuccess);
  importSuccessRef.current = onImportSuccess;
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');

  // Export all game data to Excel
  const handleExport = () => {
    try {
      exportGameDataToWorkbook({
        playerConfig,
        monsterConfig,
        playerLevelConfig,
        monsterLevelConfig,
        skillConfigs,
        playerBasicAttack,
        monsterBasicAttack,
        itemSlots,
        characterTypes,
        monsterTypeStats,
        playerDataset,
        monsterDataset,
        stageDefinitions,
      });

      toast.success(DATA_IO_MESSAGES.EXPORT_SUCCESS);
    } catch (error) {
      logDataIO('Export error:', error);
      toast.error(
        error instanceof Error
          ? `${DATA_IO_MESSAGES.EXPORT_ERROR} ${error.message}`
          : DATA_IO_MESSAGES.EXPORT_ERROR
      );
    }
  };

  // Import game data from Excel file
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const binary = await readFileAsBinary(file);
      const data = importGameDataFromWorkbook(
        binary,
        {
          onPlayerConfigChange,
          onMonsterConfigChange,
          onPlayerLevelConfigChange,
          onMonsterLevelConfigChange,
          onSkillConfigsChange,
          onPlayerBasicAttackChange,
          onMonsterBasicAttackChange,
          onItemSlotsChange,
          onCharacterTypesChange,
          onMonsterTypeStatsChange,
          onPlayerDatasetChange,
          onMonsterDatasetChange,
          onStageDefinitionsChange,
        },
        importContextRef.current
      );
      importSuccessRef.current(data);

      setUploadStatus('success');
      setUploadMessage(DATA_IO_MESSAGES.IMPORT_STATUS_SUCCESS);
      toast.success(DATA_IO_MESSAGES.IMPORT_SUCCESS);
    } catch (error) {
      logDataIO('Import error:', error);
      setUploadStatus('error');
      setUploadMessage(
        `${DATA_IO_MESSAGES.IMPORT_STATUS_ERROR_PREFIX} ${
          error instanceof Error ? error.message : '알 수 없는 오류'
        }`
      );
      toast.error(DATA_IO_MESSAGES.IMPORT_ERROR);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <FileSpreadsheet className='w-5 h-5' />
            {DATA_IO_MESSAGES.TITLE}
          </CardTitle>
          <CardDescription>{DATA_IO_MESSAGES.DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Export Section */}
          <div className='space-y-3'>
            <div>
              <h3 className='mb-1'>{DATA_IO_MESSAGES.EXPORT_SECTION_TITLE}</h3>
              <p className='text-muted-foreground'>{DATA_IO_MESSAGES.EXPORT_SECTION_DESCRIPTION}</p>
            </div>
            <Button onClick={handleExport} className='w-full sm:w-auto'>
              <Download className='w-4 h-4 mr-2' />
              {DATA_IO_MESSAGES.EXPORT_BUTTON}
            </Button>
          </div>

          <Separator />

          {/* Import Section */}
          <div className='space-y-3'>
            <div>
              <h3 className='mb-1'>{DATA_IO_MESSAGES.IMPORT_SECTION_TITLE}</h3>
              <p className='text-muted-foreground'>{DATA_IO_MESSAGES.IMPORT_SECTION_DESCRIPTION}</p>
            </div>

            <input
              ref={fileInputRef}
              type='file'
              accept='.xlsx,.xls'
              onChange={handleImport}
              className='hidden'
              id='file-upload'
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              variant='outline'
              className='w-full sm:w-auto'
            >
              <Upload className='w-4 h-4 mr-2' />
              {DATA_IO_MESSAGES.IMPORT_BUTTON}
            </Button>

            {/* Upload Status */}
            {uploadStatus !== 'idle' && (
              <Alert variant={uploadStatus === 'success' ? 'default' : 'destructive'}>
                {uploadStatus === 'success' ? (
                  <CheckCircle2 className='h-4 w-4' />
                ) : (
                  <AlertCircle className='h-4 w-4' />
                )}
                <AlertDescription>{uploadMessage}</AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Info Section */}
          <div className='bg-muted/50 rounded-lg p-4 space-y-2'>
            <h4 className='flex items-center gap-2'>
              <FileSpreadsheet className='w-4 h-4' />
              {DATA_IO_MESSAGES.SHEET_INFO_TITLE}
            </h4>
            <ul className='text-muted-foreground space-y-1 ml-6'>
              {DATA_WORKBOOK_SHEET_LABELS.map(label => (
                <li key={label}>• {label}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
