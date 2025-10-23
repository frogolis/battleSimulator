import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CharacterConfig } from '../lib/gameTypes';
import { LevelConfig } from '../lib/levelSystem';
import { Skill, BasicAttackSlot } from '../lib/skillSystem';
import { ItemSlot } from '../lib/itemSystem';
import { CharacterTypeInfo } from '../lib/characterTypes';
import { MonsterTypeStats } from './MonsterTypeDefinition';
import { DataRow } from '../lib/mockData';
import * as XLSX from 'xlsx';

interface DataExportImportProps {
  // Player config
  playerConfig: CharacterConfig;
  onPlayerConfigChange: (config: CharacterConfig) => void;
  
  // Monster config
  monsterConfig: CharacterConfig;
  onMonsterConfigChange: (config: CharacterConfig) => void;
  
  // Level configs
  playerLevelConfig: LevelConfig;
  onPlayerLevelConfigChange: (config: LevelConfig) => void;
  monsterLevelConfig: LevelConfig;
  onMonsterLevelConfigChange: (config: LevelConfig) => void;
  
  // Skill system
  skillConfigs: Record<string, Skill>;
  onSkillConfigsChange: (configs: Record<string, Skill>) => void;
  playerBasicAttack: BasicAttackSlot;
  onPlayerBasicAttackChange: (slot: BasicAttackSlot) => void;
  monsterBasicAttack: BasicAttackSlot;
  onMonsterBasicAttackChange: (slot: BasicAttackSlot) => void;
  
  // Item system
  itemSlots: ItemSlot[];
  onItemSlotsChange: (slots: ItemSlot[]) => void;
  
  // Character types
  characterTypes: CharacterTypeInfo[];
  onCharacterTypesChange: (types: CharacterTypeInfo[]) => void;
  
  // Monster types
  monsterTypeStats: Record<string, MonsterTypeStats>;
  onMonsterTypeStatsChange: (stats: Record<string, MonsterTypeStats>) => void;
  
  // Datasets
  playerDataset: DataRow[];
  onPlayerDatasetChange: (dataset: DataRow[]) => void;
  monsterDataset: DataRow[];
  onMonsterDatasetChange: (dataset: DataRow[]) => void;
}

export function DataExportImport({
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
}: DataExportImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');

  // Export all game data to Excel
  const handleExport = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // 1. Character Types Sheet
      const characterTypesData = characterTypes.map(ct => ({
        'ID': ct.id,
        '이름': ct.name,
        '설명': ct.description || '',
        '색상': ct.color,
      }));
      const wsCharacterTypes = XLSX.utils.json_to_sheet(characterTypesData);
      XLSX.utils.book_append_sheet(workbook, wsCharacterTypes, 'Character Types');

      // 2. Monster Types Sheet
      const monsterTypesData = Object.entries(monsterTypeStats).map(([id, stats]) => ({
        'ID': id,
        '캐릭터타입': stats.characterType,
        '기본레벨': stats.baseLevel,
        '크기': stats.size,
        'AI패턴': stats.aiPattern,
        '스킬': stats.skills.join(','),
      }));
      const wsMonsterTypes = XLSX.utils.json_to_sheet(monsterTypesData);
      XLSX.utils.book_append_sheet(workbook, wsMonsterTypes, 'Monster Types');

      // 3. Skills Sheet
      const skillsData = Object.entries(skillConfigs).map(([id, skill]) => ({
        'ID': id,
        '이름': skill.name,
        '타입': skill.type,
        '타겟': skill.target,
        '쿨다운': skill.cooldown,
        '시전시간': skill.castTime,
        '공격력': skill.damage,
        '크기': skill.size,
        '지속시간': skill.duration,
        '투사체속도': skill.projectileSpeed,
        '유효거리': skill.range,
        'X오프셋': skill.offsetX,
        'Y오프셋': skill.offsetY,
        '설명': skill.description || '',
        '색상': skill.color,
      }));
      const wsSkills = XLSX.utils.json_to_sheet(skillsData);
      XLSX.utils.book_append_sheet(workbook, wsSkills, 'Skills');

      // 4. Items Sheet
      const itemsData = itemSlots.map(item => ({
        'ID': item.id,
        '이름': item.name,
        '타입': item.type,
        '스탯타입': item.statType,
        '값': item.value,
        '설명': item.description || '',
      }));
      const wsItems = XLSX.utils.json_to_sheet(itemsData);
      XLSX.utils.book_append_sheet(workbook, wsItems, 'Items');

      // 5. Player Dataset Sheet
      const playerDatasetData = playerDataset.map(row => ({
        'ID': row.id,
        '캐릭터타입': row.characterType,
        '레벨': row.level,
        '장착아이템': row.equippedItems?.join(',') || '',
        '스킬': row.skills?.join(',') || '',
      }));
      const wsPlayerDataset = XLSX.utils.json_to_sheet(playerDatasetData);
      XLSX.utils.book_append_sheet(workbook, wsPlayerDataset, 'Player Dataset');

      // 6. Monster Dataset Sheet
      const monsterDatasetData = monsterDataset.map(row => ({
        'ID': row.id,
        '캐릭터타입': row.characterType,
        '레벨': row.level,
        '장착아이템': row.equippedItems?.join(',') || '',
        '스킬': row.skills?.join(',') || '',
      }));
      const wsMonsterDataset = XLSX.utils.json_to_sheet(monsterDatasetData);
      XLSX.utils.book_append_sheet(workbook, wsMonsterDataset, 'Monster Dataset');

      // 7. Player Level Config Sheet
      const playerLevelData = [{
        '최대레벨': playerLevelConfig.maxLevel,
        '기본경험치': playerLevelConfig.baseExpRequired,
        '경험치증가율': playerLevelConfig.expGrowthRate,
        '경험치증가타입': playerLevelConfig.expGrowthType,
      }];
      const wsPlayerLevel = XLSX.utils.json_to_sheet(playerLevelData);
      XLSX.utils.book_append_sheet(workbook, wsPlayerLevel, 'Player Level Config');

      // 8. Monster Level Config Sheet
      const monsterLevelData = [{
        '최대레벨': monsterLevelConfig.maxLevel,
        '기본경험치': monsterLevelConfig.baseExpRequired,
        '경험치증가율': monsterLevelConfig.expGrowthRate,
        '경험치증가타입': monsterLevelConfig.expGrowthType,
      }];
      const wsMonsterLevel = XLSX.utils.json_to_sheet(monsterLevelData);
      XLSX.utils.book_append_sheet(workbook, wsMonsterLevel, 'Monster Level Config');

      // 9. Player Basic Attack Sheet
      const playerBasicAttackData = [{
        'ID': playerBasicAttack.id,
        '이름': playerBasicAttack.name,
        '타입': playerBasicAttack.type,
        '크기': playerBasicAttack.size,
        '색상': playerBasicAttack.color,
      }];
      const wsPlayerBasicAttack = XLSX.utils.json_to_sheet(playerBasicAttackData);
      XLSX.utils.book_append_sheet(workbook, wsPlayerBasicAttack, 'Player Basic Attack');

      // 10. Monster Basic Attack Sheet
      const monsterBasicAttackData = [{
        'ID': monsterBasicAttack.id,
        '이름': monsterBasicAttack.name,
        '타입': monsterBasicAttack.type,
        '크기': monsterBasicAttack.size,
        '색상': monsterBasicAttack.color,
      }];
      const wsMonsterBasicAttack = XLSX.utils.json_to_sheet(monsterBasicAttackData);
      XLSX.utils.book_append_sheet(workbook, wsMonsterBasicAttack, 'Monster Basic Attack');

      // 11. Player Config Sheet
      const playerConfigData = [{
        'HP포뮬러': playerConfig.hpFormula,
        '공격력포뮬러': playerConfig.attackFormula,
        '방어력포뮬러': playerConfig.defenseFormula,
        '이동속도포뮬러': playerConfig.moveSpeedFormula,
        '공격속도포뮬러': playerConfig.attackSpeedFormula,
      }];
      const wsPlayerConfig = XLSX.utils.json_to_sheet(playerConfigData);
      XLSX.utils.book_append_sheet(workbook, wsPlayerConfig, 'Player Config');

      // 12. Monster Config Sheet
      const monsterConfigData = [{
        'HP포뮬러': monsterConfig.hpFormula,
        '공격력포뮬러': monsterConfig.attackFormula,
        '방어력포뮬러': monsterConfig.defenseFormula,
        '이동속도포뮬러': monsterConfig.moveSpeedFormula,
        '공격속도포뮬러': monsterConfig.attackSpeedFormula,
      }];
      const wsMonsterConfig = XLSX.utils.json_to_sheet(monsterConfigData);
      XLSX.utils.book_append_sheet(workbook, wsMonsterConfig, 'Monster Config');

      // Save Excel file
      const filename = `game-data-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.success('데이터가 성공적으로 내보내졌습니다!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('데이터 내보내기에 실패했습니다.');
    }
  };

  // Import game data from Excel file
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // 1. Character Types
        if (workbook.SheetNames.includes('Character Types')) {
          const sheet = workbook.Sheets['Character Types'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          const types: CharacterTypeInfo[] = rows.map(row => ({
            id: row['ID'],
            name: row['이름'],
            description: row['설명'] || '',
            color: row['색상'] || 'text-gray-600',
          }));
          onCharacterTypesChange(types);
        }

        // 2. Monster Types
        if (workbook.SheetNames.includes('Monster Types')) {
          const sheet = workbook.Sheets['Monster Types'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          const types: Record<string, MonsterTypeStats> = {};
          rows.forEach(row => {
            types[row['ID']] = {
              characterType: row['캐릭터타입'],
              baseLevel: row['기본레벨'],
              size: row['크기'],
              aiPattern: row['AI패턴'],
              skills: row['스킬'] ? row['스킬'].split(',').map((s: string) => s.trim()) : [],
            };
          });
          onMonsterTypeStatsChange(types);
        }

        // 3. Skills
        if (workbook.SheetNames.includes('Skills')) {
          const sheet = workbook.Sheets['Skills'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          const skills: Record<string, Skill> = {};
          rows.forEach(row => {
            skills[row['ID']] = {
              id: row['ID'],
              name: row['이름'],
              type: row['타입'],
              target: row['타겟'],
              cooldown: row['쿨다운'],
              castTime: row['시전시간'],
              damage: row['공격력'],
              size: row['크기'],
              duration: row['지속시간'],
              projectileSpeed: row['투사체속도'],
              range: row['유효거리'],
              offsetX: row['X오프셋'],
              offsetY: row['Y오프셋'],
              description: row['설명'] || '',
              color: row['색상'],
            };
          });
          onSkillConfigsChange(skills);
        }

        // 4. Items
        if (workbook.SheetNames.includes('Items')) {
          const sheet = workbook.Sheets['Items'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          const items: ItemSlot[] = rows.map(row => ({
            id: row['ID'],
            name: row['이름'],
            type: row['타입'],
            statType: row['스탯타입'],
            value: row['값'],
            description: row['설명'] || '',
          }));
          onItemSlotsChange(items);
        }

        // 5. Player Dataset
        if (workbook.SheetNames.includes('Player Dataset')) {
          const sheet = workbook.Sheets['Player Dataset'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          const dataset: DataRow[] = rows.map(row => ({
            id: row['ID'],
            characterType: row['캐릭터타입'],
            level: row['레벨'],
            equippedItems: row['장착아이템'] ? row['장착아이템'].split(',').map((s: string) => s.trim()) : [],
            skills: row['스킬'] ? row['스킬'].split(',').map((s: string) => s.trim()) : [],
          }));
          onPlayerDatasetChange(dataset);
        }

        // 6. Monster Dataset
        if (workbook.SheetNames.includes('Monster Dataset')) {
          const sheet = workbook.Sheets['Monster Dataset'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          const dataset: DataRow[] = rows.map(row => ({
            id: row['ID'],
            characterType: row['캐릭터타입'],
            level: row['레벨'],
            equippedItems: row['장착아이템'] ? row['장착아이템'].split(',').map((s: string) => s.trim()) : [],
            skills: row['스킬'] ? row['스킬'].split(',').map((s: string) => s.trim()) : [],
          }));
          onMonsterDatasetChange(dataset);
        }

        // 7. Player Level Config
        if (workbook.SheetNames.includes('Player Level Config')) {
          const sheet = workbook.Sheets['Player Level Config'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          if (rows.length > 0) {
            const row = rows[0];
            onPlayerLevelConfigChange({
              maxLevel: row['최대레벨'],
              baseExpRequired: row['기본경험치'],
              expGrowthRate: row['경험치증가율'],
              expGrowthType: row['경험치증가타입'],
            });
          }
        }

        // 8. Monster Level Config
        if (workbook.SheetNames.includes('Monster Level Config')) {
          const sheet = workbook.Sheets['Monster Level Config'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          if (rows.length > 0) {
            const row = rows[0];
            onMonsterLevelConfigChange({
              maxLevel: row['최대레벨'],
              baseExpRequired: row['기본경험치'],
              expGrowthRate: row['경험치증가율'],
              expGrowthType: row['경험치증가타입'],
            });
          }
        }

        // 9. Player Basic Attack
        if (workbook.SheetNames.includes('Player Basic Attack')) {
          const sheet = workbook.Sheets['Player Basic Attack'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          if (rows.length > 0) {
            const row = rows[0];
            onPlayerBasicAttackChange({
              id: row['ID'],
              name: row['이름'],
              type: row['타입'],
              size: row['크기'],
              color: row['색상'],
            });
          }
        }

        // 10. Monster Basic Attack
        if (workbook.SheetNames.includes('Monster Basic Attack')) {
          const sheet = workbook.Sheets['Monster Basic Attack'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          if (rows.length > 0) {
            const row = rows[0];
            onMonsterBasicAttackChange({
              id: row['ID'],
              name: row['이름'],
              type: row['타입'],
              size: row['크기'],
              color: row['색상'],
            });
          }
        }

        // 11. Player Config
        if (workbook.SheetNames.includes('Player Config')) {
          const sheet = workbook.Sheets['Player Config'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          if (rows.length > 0) {
            const row = rows[0];
            onPlayerConfigChange({
              hpFormula: row['HP포뮬러'],
              attackFormula: row['공격력포뮬러'],
              defenseFormula: row['방어력포뮬러'],
              moveSpeedFormula: row['이동속도포뮬러'],
              attackSpeedFormula: row['공격속도포뮬러'],
            });
          }
        }

        // 12. Monster Config
        if (workbook.SheetNames.includes('Monster Config')) {
          const sheet = workbook.Sheets['Monster Config'];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          if (rows.length > 0) {
            const row = rows[0];
            onMonsterConfigChange({
              hpFormula: row['HP포뮬러'],
              attackFormula: row['공격력포뮬러'],
              defenseFormula: row['방어력포뮬러'],
              moveSpeedFormula: row['이동속도포뮬러'],
              attackSpeedFormula: row['공격속도포뮬러'],
            });
          }
        }

        setUploadStatus('success');
        setUploadMessage('데이터를 성공적으로 불러왔습니다!');
        toast.success('데이터가 성공적으로 불러와졌습니다!');
      } catch (error) {
        console.error('Import error:', error);
        setUploadStatus('error');
        setUploadMessage(`데이터 불러오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        toast.error('데이터 불러오기에 실패했습니다.');
      }
    };

    reader.onerror = () => {
      setUploadStatus('error');
      setUploadMessage('파일 읽기에 실패했습니다.');
      toast.error('파일 읽기에 실패했습니다.');
    };

    reader.readAsBinaryString(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            데이터 내보내기/가져오기
          </CardTitle>
          <CardDescription>
            게임 설정, 스킬, 아이템, 캐릭터 타입, 데이터셋 등 모든 데이터를 Excel 파일로 저장하거나 불러올 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Section */}
          <div className="space-y-3">
            <div>
              <h3 className="mb-1">데이터 내보내기</h3>
              <p className="text-muted-foreground">
                현재 모든 게임 데이터를 Excel 파일로 다운로드합니다.
              </p>
            </div>
            <Button onClick={handleExport} className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Excel 파일로 내보내기
            </Button>
          </div>

          <Separator />

          {/* Import Section */}
          <div className="space-y-3">
            <div>
              <h3 className="mb-1">데이터 가져오기</h3>
              <p className="text-muted-foreground">
                이전에 내보낸 Excel 파일을 업로드하여 데이터를 복원합니다.
              </p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
              id="file-upload"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Upload className="w-4 h-4 mr-2" />
              Excel 파일 업로드
            </Button>

            {/* Upload Status */}
            {uploadStatus !== 'idle' && (
              <Alert variant={uploadStatus === 'success' ? 'default' : 'destructive'}>
                {uploadStatus === 'success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{uploadMessage}</AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Info Section */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Excel 파일 구조 (12개 시트)
            </h4>
            <ul className="text-muted-foreground space-y-1 ml-6">
              <li>• Character Types (캐릭터 타입)</li>
              <li>• Monster Types (몬스터 타입 - AI 패턴 포함)</li>
              <li>• Skills (스킬 시스템 설정)</li>
              <li>• Items (아이템 시스템 설정)</li>
              <li>• Player Dataset (플레이어 데이터셋)</li>
              <li>• Monster Dataset (몬스터 데이터셋)</li>
              <li>• Player Level Config (플레이어 레벨 설정)</li>
              <li>• Monster Level Config (몬스터 레벨 설정)</li>
              <li>• Player Basic Attack (플레이어 기본 공격)</li>
              <li>• Monster Basic Attack (몬스터 기본 공격)</li>
              <li>• Player Config (플레이어 스탯 포뮬러)</li>
              <li>• Monster Config (몬스터 스탯 포뮬러)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
