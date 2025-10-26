import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import {
  FileSpreadsheet,
  ExternalLink,
  Upload,
  AlertCircle,
  CheckCircle2,
  Link2,
  Trash2,
  RefreshCw,
  Package,
  Copy,
  Code,
  Download,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  writeToGoogleSheet,
  getStoredWebAppUrl,
  setStoredWebAppUrl,
  getStoredApiKey,
  setStoredApiKey,
} from '../lib/googleSheetsLoader';
import { LevelConfig, generateExpChartDataWithSegments } from '../lib/levelSystem';
import { CharacterConfig } from './CharacterSettings';
import { MonsterTypeStats } from './MonsterTypeDefinition';
import { Skill, SkillSlot, BasicAttackSlot } from '../lib/skillSystem';
import { ItemSlot } from '../lib/itemSystem';
import { CharacterTypeInfo } from '../lib/characterTypes';
import { DataRow } from '../lib/mockData';
import * as XLSX from 'xlsx';

interface SheetConnection {
  id: string;
  name: string;
  url: string;
  spreadsheetId: string;
  gid: string;
  dataType: DataType;
  lastSync?: Date;
}

type DataType =
  | 'player_stats'
  | 'player_levels'
  | 'monster_stats'
  | 'monster_levels'
  | 'monster_types'
  | 'skills'
  | 'items'
  | 'character_types';

interface GoogleSheetManagerProps {
  // Player data
  playerConfig?: CharacterConfig;
  playerLevelConfig?: LevelConfig;
  playerDataset?: DataRow[];
  onPlayerConfigImport?: (config: CharacterConfig) => void;
  onPlayerLevelConfigImport?: (config: LevelConfig) => void;

  // Monster data
  monsterConfig?: CharacterConfig;
  monsterLevelConfig?: LevelConfig;
  monsterDataset?: DataRow[];
  monsterTypeStats?: Record<string, MonsterTypeStats>;
  onMonsterConfigImport?: (config: CharacterConfig) => void;
  onMonsterLevelConfigImport?: (config: LevelConfig) => void;
  onMonsterTypeStatsImport?: (stats: Record<string, MonsterTypeStats>) => void;

  // Skills & Items
  skillConfigs?: Record<string, Skill>;
  skillSlots?: SkillSlot[];
  playerBasicAttack?: BasicAttackSlot;
  monsterBasicAttack?: BasicAttackSlot;
  itemSlots?: ItemSlot[];
  onSkillConfigsImport?: (skills: Record<string, Skill>) => void;
  onSkillSlotsImport?: (slots: SkillSlot[]) => void;
  onItemSlotsImport?: (slots: ItemSlot[]) => void;

  // Character Types
  characterTypes?: CharacterTypeInfo[];
  onCharacterTypesImport?: (types: CharacterTypeInfo[]) => void;
}

const STORAGE_KEY = 'google_sheets_connections_v2';

const DATA_TYPE_LABELS: Record<DataType, string> = {
  player_stats: '플레이어 기본 스탯',
  player_levels: '플레이어 레벨 설정',
  monster_stats: '몬스터 기본 스탯',
  monster_levels: '몬스터 레벨 설정',
  monster_types: '몬스터 타입 정의',
  skills: '스킬 데이터',
  items: '아이템 데이터',
  character_types: '캐릭터 타입',
};

export function GoogleSheetManager(props: GoogleSheetManagerProps) {
  const [connections, setConnections] = useState<SheetConnection[]>([]);
  const [newSheetUrl, setNewSheetUrl] = useState('');
  const [newSheetName, setNewSheetName] = useState('');
  const [newDataType, setNewDataType] = useState<DataType>('player_stats');
  const [isLoading, setIsLoading] = useState(false);
  const [webAppUrl, setWebAppUrl] = useState(getStoredWebAppUrl());
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [isUploading, setIsUploading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // API 키 저장 핸들러
  const handleSaveApiKey = () => {
    setStoredApiKey(apiKey);
    toast.success('✅ API 키가 저장되었습니다');
  };

  // localStorage에서 연결 정보 불러오기
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const restored = parsed.map((conn: any) => ({
          ...conn,
          lastSync: conn.lastSync ? new Date(conn.lastSync) : undefined,
        }));
        setConnections(restored);
      } catch (error) {
        console.error('Error loading connections:', error);
      }
    }
  }, []);

  // localStorage에 연결 정보 저장
  const saveConnections = (conns: SheetConnection[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conns));
    setConnections(conns);
  };

  // Google Sheets URL 파싱
  const parseGoogleSheetUrl = (url: string): { spreadsheetId: string; gid: string } | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const spreadsheetId = pathParts[pathParts.indexOf('d') + 1];

      const gidMatch = url.match(/[#&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';

      if (spreadsheetId) {
        return { spreadsheetId, gid };
      }
      return null;
    } catch {
      return null;
    }
  };

  // 새 시트 연결 추가
  const handleAddConnection = () => {
    if (!newSheetUrl.trim()) {
      toast.error('시트 URL을 입력해주세요');
      return;
    }

    const parsed = parseGoogleSheetUrl(newSheetUrl);
    if (!parsed) {
      toast.error('올바른 Google Sheets URL이 아닙니다');
      return;
    }

    const newConnection: SheetConnection = {
      id: `sheet_${Date.now()}`,
      name:
        newSheetName.trim() ||
        `${DATA_TYPE_LABELS[newDataType]} ${connections.filter((c) => c.dataType === newDataType).length + 1}`,
      url: newSheetUrl,
      spreadsheetId: parsed.spreadsheetId,
      gid: parsed.gid,
      dataType: newDataType,
    };

    const updated = [...connections, newConnection];
    saveConnections(updated);

    setNewSheetUrl('');
    setNewSheetName('');
    toast.success(`✅ ${newConnection.name} 연결이 추가되었습니다`);
  };

  // 연결 삭제
  const handleDeleteConnection = (id: string) => {
    const updated = connections.filter((c) => c.id !== id);
    saveConnections(updated);
    toast.info('🗑️ 연결이 삭제되었습니다');
  };

  // CSV 파싱
  const parseCSV = (csvText: string): Record<string, any>[] => {
    const lines = csvText.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    const data: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, any> = {};

      headers.forEach((header, idx) => {
        const value = values[idx];
        if (!value) return;

        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          row[header] = numValue;
        } else {
          row[header] = value;
        }
      });

      data.push(row);
    }

    return data;
  };

  // 시트에서 데이터 불러오기
  const handleLoadFromSheet = async (connection: SheetConnection) => {
    setIsLoading(true);

    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${connection.spreadsheetId}/export?format=csv&gid=${connection.gid}`;

      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();
      const data = parseCSV(csvText);

      // 마지막 동기화 시간 업데이트
      const updated = connections.map((c) =>
        c.id === connection.id ? { ...c, lastSync: new Date() } : c,
      );
      saveConnections(updated);

      toast.success(`✅ ${connection.name}에서 ${data.length}개 행을 불러왔습니다`);
    } catch (error) {
      console.error('Error loading sheet:', error);
      toast.error(
        `데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 엑셀 다운로드 헬퍼 함수
  const downloadExcel = (
    filename: string,
    sheets: { name: string; headers: string[]; data: any[][] }[],
  ) => {
    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheet) => {
      // 헤더와 데이터를 합쳐서 워크시트 생성
      const wsData = [sheet.headers, ...sheet.data];
      const worksheet = XLSX.utils.aoa_to_sheet(wsData);

      // 시트 이름은 최대 31자까지 가능하고 특수문자 제한이 있음
      const sanitizedName = sheet.name.substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, '_');
      XLSX.utils.book_append_sheet(workbook, worksheet, sanitizedName);
    });

    // 엑셀 파일로 저장
    XLSX.writeFile(workbook, filename);

    toast.success(`✅ ${filename} 다운로드 완료!`);
  };

  // 엑셀 다운로드 - 플레이어 레벨
  const handleDownloadPlayerLevelsExcel = () => {
    if (!props.playerLevelConfig) {
      toast.error('플레이어 레벨 설정이 없습니다');
      return;
    }

    const maxLevel = props.playerLevelConfig.maxLevel || 100;
    const expData = generateExpChartDataWithSegments(
      props.playerLevelConfig.expGrowthConfig || {
        segments: [],
        bezierSegments: [],
        useBezier: true,
      },
      1,
      maxLevel,
    );

    const headers = [
      'level',
      'exp_required',
      'cumulative_exp',
      'hp',
      'sp',
      'attack',
      'defense',
      'speed',
    ];
    const data = expData.map((levelData) => {
      const hp =
        props.playerLevelConfig!.baseHp +
        (levelData.level - 1) * props.playerLevelConfig!.hpPerLevel;
      const sp =
        props.playerLevelConfig!.baseSp +
        (levelData.level - 1) * props.playerLevelConfig!.spPerLevel;
      const attack =
        props.playerLevelConfig!.baseAttack +
        (levelData.level - 1) * props.playerLevelConfig!.attackPerLevel;
      const defense =
        props.playerLevelConfig!.baseDefense +
        (levelData.level - 1) * props.playerLevelConfig!.defensePerLevel;
      const speed =
        props.playerLevelConfig!.baseSpeed +
        (levelData.level - 1) * props.playerLevelConfig!.speedPerLevel;

      return [
        levelData.level,
        levelData.exp,
        levelData.cumulativeExp,
        Math.round(hp),
        Math.round(sp),
        Math.round(attack),
        Math.round(defense),
        Math.round(speed),
      ];
    });

    downloadExcel('player_levels.xlsx', [{ name: 'player_levels', headers, data }]);
  };

  // 엑셀 다운로드 - 몬스터 레벨 (경험치 없이 능력치만)
  const handleDownloadMonsterLevelsExcel = () => {
    if (!props.monsterLevelConfig) {
      toast.error('몬스터 레벨 설정이 없습니다');
      return;
    }

    const maxLevel = props.monsterLevelConfig.maxLevel || 100;

    // 몬스터는 경험치가 필요 없으므로 레벨별 능력치만 계산
    const headers = ['level', 'hp', 'sp', 'attack', 'defense', 'speed'];
    const data = [];

    for (let level = 1; level <= maxLevel; level++) {
      const hp =
        props.monsterLevelConfig.baseHp + (level - 1) * props.monsterLevelConfig.hpPerLevel;
      const sp =
        props.monsterLevelConfig.baseSp + (level - 1) * props.monsterLevelConfig.spPerLevel;
      const attack =
        props.monsterLevelConfig.baseAttack + (level - 1) * props.monsterLevelConfig.attackPerLevel;
      const defense =
        props.monsterLevelConfig.baseDefense +
        (level - 1) * props.monsterLevelConfig.defensePerLevel;
      const speed =
        props.monsterLevelConfig.baseSpeed + (level - 1) * props.monsterLevelConfig.speedPerLevel;

      data.push([
        level,
        Math.round(hp),
        Math.round(sp),
        Math.round(attack),
        Math.round(defense),
        Math.round(speed),
      ]);
    }

    downloadExcel('monster_levels.xlsx', [{ name: 'monster_levels', headers, data }]);
  };

  // 엑셀 다운로드 - 스킬
  const handleDownloadSkillsExcel = () => {
    if (!props.skillConfigs || Object.keys(props.skillConfigs).length === 0) {
      toast.error('스킬 설정이 없습니다');
      return;
    }

    const headers = [
      'id',
      'name',
      'type',
      'damageMultiplier',
      'healAmount',
      'buffDuration',
      'buffStats',
      'spCost',
      'cooldown',
      'castTime',
      'range',
      'width',
      'duration',
      'description',
    ];

    const data = Object.values(props.skillConfigs).map((skill) => {
      let buffStatsStr = '';
      if (skill.buffStats) {
        try {
          buffStatsStr = JSON.stringify(skill.buffStats);
        } catch {
          buffStatsStr = '';
        }
      }

      return [
        skill.id,
        skill.name,
        skill.type,
        skill.damageMultiplier ?? '',
        skill.healAmount ?? '',
        skill.buffDuration ?? '',
        buffStatsStr,
        skill.spCost,
        skill.cooldown,
        skill.castTime,
        skill.range,
        skill.width,
        skill.duration ?? '',
        skill.description || '',
      ];
    });

    downloadExcel('skills.xlsx', [{ name: 'skills', headers, data }]);
  };

  // 엑셀 다운로드 - 아이템
  const handleDownloadItemsExcel = () => {
    if (!props.itemSlots || props.itemSlots.length === 0) {
      toast.error('아이템 설정이 없습니다');
      return;
    }

    const headers = ['id', 'name', 'type', 'stats', 'weight', 'equipped'];

    const data = props.itemSlots.map((item) => {
      let statsStr = '';
      if (item.stats) {
        try {
          statsStr = JSON.stringify(item.stats);
        } catch {
          statsStr = '';
        }
      }

      return [item.id, item.name, item.type, statsStr, item.weight, item.equipped];
    });

    downloadExcel('items.xlsx', [{ name: 'items', headers, data }]);
  };

  // 엑셀 다운로드 - 플레이어 데이터셋
  const handleDownloadPlayerDatasetExcel = () => {
    if (!props.playerDataset || props.playerDataset.length === 0) {
      toast.error('플레이어 데이터셋이 없습니다');
      return;
    }

    const allKeys = new Set<string>();
    props.playerDataset.forEach((row) => {
      Object.keys(row).forEach((key) => allKeys.add(key));
    });
    const headers = Array.from(allKeys).sort();

    const data = props.playerDataset.map((row) => {
      return headers.map((header) => {
        const value = (row as any)[header];
        return value !== undefined ? value : '';
      });
    });

    downloadExcel('player_dataset.xlsx', [{ name: 'player_dataset', headers, data }]);
  };

  // 엑셀 다운로드 - 몬스터 데이터셋
  const handleDownloadMonsterDatasetExcel = () => {
    if (!props.monsterDataset || props.monsterDataset.length === 0) {
      toast.error('몬스터 데이터셋이 없습니다');
      return;
    }

    const allKeys = new Set<string>();
    props.monsterDataset.forEach((row) => {
      Object.keys(row).forEach((key) => allKeys.add(key));
    });
    const headers = Array.from(allKeys).sort();

    const data = props.monsterDataset.map((row) => {
      return headers.map((header) => {
        const value = (row as any)[header];
        return value !== undefined ? value : '';
      });
    });

    downloadExcel('monster_dataset.xlsx', [{ name: 'monster_dataset', headers, data }]);
  };

  // 모든 데이터를 하나의 엑셀 파일로 다운로드 (각 데이터를 별도 시트로)
  const handleDownloadAllExcel = () => {
    const sheets: { name: string; headers: string[]; data: any[][] }[] = [];

    // 플레이어 레벨
    if (props.playerLevelConfig) {
      const maxLevel = props.playerLevelConfig.maxLevel || 100;
      const expData = generateExpChartDataWithSegments(
        props.playerLevelConfig.expGrowthConfig || {
          segments: [],
          bezierSegments: [],
          useBezier: true,
        },
        1,
        maxLevel,
      );
      const headers = [
        'level',
        'exp_required',
        'cumulative_exp',
        'hp',
        'sp',
        'attack',
        'defense',
        'speed',
      ];
      const data = expData.map((levelData) => {
        const hp =
          props.playerLevelConfig!.baseHp +
          (levelData.level - 1) * props.playerLevelConfig!.hpPerLevel;
        const sp =
          props.playerLevelConfig!.baseSp +
          (levelData.level - 1) * props.playerLevelConfig!.spPerLevel;
        const attack =
          props.playerLevelConfig!.baseAttack +
          (levelData.level - 1) * props.playerLevelConfig!.attackPerLevel;
        const defense =
          props.playerLevelConfig!.baseDefense +
          (levelData.level - 1) * props.playerLevelConfig!.defensePerLevel;
        const speed =
          props.playerLevelConfig!.baseSpeed +
          (levelData.level - 1) * props.playerLevelConfig!.speedPerLevel;
        return [
          levelData.level,
          levelData.exp,
          levelData.cumulativeExp,
          Math.round(hp),
          Math.round(sp),
          Math.round(attack),
          Math.round(defense),
          Math.round(speed),
        ];
      });
      sheets.push({ name: 'player_levels', headers, data });
    }

    // 몬스터 레벨 (경험치 없이 능력치만)
    if (props.monsterLevelConfig) {
      const maxLevel = props.monsterLevelConfig.maxLevel || 100;
      const headers = ['level', 'hp', 'sp', 'attack', 'defense', 'speed'];
      const data = [];

      for (let level = 1; level <= maxLevel; level++) {
        const hp =
          props.monsterLevelConfig.baseHp + (level - 1) * props.monsterLevelConfig.hpPerLevel;
        const sp =
          props.monsterLevelConfig.baseSp + (level - 1) * props.monsterLevelConfig.spPerLevel;
        const attack =
          props.monsterLevelConfig.baseAttack +
          (level - 1) * props.monsterLevelConfig.attackPerLevel;
        const defense =
          props.monsterLevelConfig.baseDefense +
          (level - 1) * props.monsterLevelConfig.defensePerLevel;
        const speed =
          props.monsterLevelConfig.baseSpeed + (level - 1) * props.monsterLevelConfig.speedPerLevel;

        data.push([
          level,
          Math.round(hp),
          Math.round(sp),
          Math.round(attack),
          Math.round(defense),
          Math.round(speed),
        ]);
      }

      sheets.push({ name: 'monster_levels', headers, data });
    }

    // 스킬
    if (props.skillConfigs && Object.keys(props.skillConfigs).length > 0) {
      const headers = [
        'id',
        'name',
        'type',
        'damageMultiplier',
        'healAmount',
        'buffDuration',
        'buffStats',
        'spCost',
        'cooldown',
        'castTime',
        'range',
        'width',
        'duration',
        'description',
      ];
      const data = Object.values(props.skillConfigs).map((skill) => {
        let buffStatsStr = '';
        if (skill.buffStats) {
          try {
            buffStatsStr = JSON.stringify(skill.buffStats);
          } catch {
            buffStatsStr = '';
          }
        }
        return [
          skill.id,
          skill.name,
          skill.type,
          skill.damageMultiplier ?? '',
          skill.healAmount ?? '',
          skill.buffDuration ?? '',
          buffStatsStr,
          skill.spCost,
          skill.cooldown,
          skill.castTime,
          skill.range,
          skill.width,
          skill.duration ?? '',
          skill.description || '',
        ];
      });
      sheets.push({ name: 'skills', headers, data });
    }

    // 아이템
    if (props.itemSlots && props.itemSlots.length > 0) {
      const headers = ['id', 'name', 'type', 'stats', 'weight', 'equipped'];
      const data = props.itemSlots.map((item) => {
        let statsStr = '';
        if (item.stats) {
          try {
            statsStr = JSON.stringify(item.stats);
          } catch {
            statsStr = '';
          }
        }
        return [item.id, item.name, item.type, statsStr, item.weight, item.equipped];
      });
      sheets.push({ name: 'items', headers, data });
    }

    // 플레이어 데이터셋
    if (props.playerDataset && props.playerDataset.length > 0) {
      const allKeys = new Set<string>();
      props.playerDataset.forEach((row) => {
        Object.keys(row).forEach((key) => allKeys.add(key));
      });
      const headers = Array.from(allKeys).sort();
      const data = props.playerDataset.map((row) => {
        return headers.map((header) => {
          const value = (row as any)[header];
          return value !== undefined ? value : '';
        });
      });
      sheets.push({ name: 'player_dataset', headers, data });
    }

    // 몬스터 데이터셋
    if (props.monsterDataset && props.monsterDataset.length > 0) {
      const allKeys = new Set<string>();
      props.monsterDataset.forEach((row) => {
        Object.keys(row).forEach((key) => allKeys.add(key));
      });
      const headers = Array.from(allKeys).sort();
      const data = props.monsterDataset.map((row) => {
        return headers.map((header) => {
          const value = (row as any)[header];
          return value !== undefined ? value : '';
        });
      });
      sheets.push({ name: 'monster_dataset', headers, data });
    }

    if (sheets.length === 0) {
      toast.info('다운로드할 데이터가 없습니다');
      return;
    }

    downloadExcel('game_data_all.xlsx', sheets);
    toast.success(`✅ ${sheets.length}개 시트가 포함된 엑셀 파일 다운로드 완료!`);
  };

  // Apps Script 코드 복사
  const handleCopyAppsScript = () => {
    const scriptCode = `// 🔐 보안 설정: 이 API 키를 아래에 설정하세요
// 자동 생성된 키를 사용하거나 원하는 키를 직접 입력하세요
var API_KEY = "YOUR_API_KEY_HERE"; // 예: "abc123xyz789"

// 🎲 랜덤 API 키 생성 함수 (선택사항)
function generateApiKey() {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var key = "";
  for (var i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  Logger.log("생성된 API 키: " + key);
  return key;
}

// 📝 메인 데이터 수신 함수
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheetName = data.sheetName;
    var headers = data.headers;
    var rows = data.data;
    var receivedApiKey = data.apiKey;
    
    // 🔒 API 키 검증
    if (API_KEY !== "YOUR_API_KEY_HERE" && receivedApiKey !== API_KEY) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: '인증 실패: API 키가 일치하지 않습니다'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    // 시트가 없으면 생성
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // 기존 데이터 삭제
    sheet.clear();
    
    // 헤더 작성
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // 데이터 작성
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    
    // 마지막 업데이트 시간 기록
    var configSheet = ss.getSheetByName("_config");
    if (!configSheet) {
      configSheet = ss.insertSheet("_config");
      configSheet.getRange(1, 1, 1, 2).setValues([["시트명", "마지막 업데이트"]]);
    }
    
    var now = new Date();
    var configData = configSheet.getDataRange().getValues();
    var found = false;
    
    for (var i = 1; i < configData.length; i++) {
      if (configData[i][0] === sheetName) {
        configSheet.getRange(i + 1, 2).setValue(now);
        found = true;
        break;
      }
    }
    
    if (!found) {
      configSheet.appendRow([sheetName, now]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data written successfully to ' + sheetName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 🔧 테스트용 함수 (Apps Script 에디터에서 실행)
function testGenerateKey() {
  var key = generateApiKey();
  SpreadsheetApp.getUi().alert("생성된 API 키:\\n" + key + "\\n\\n위 코드의 API_KEY에 붙여넣으세요!");
}`;

    navigator.clipboard.writeText(scriptCode);
    toast.success('✅ API 키 인증 기능이 포함된 Apps Script 코드가 클립보드에 복사되었습니다');
  };

  // Web App URL 저장
  const handleSaveWebAppUrl = () => {
    if (!webAppUrl.trim()) {
      toast.error('Web App URL을 입력해주세요');
      return;
    }
    setStoredWebAppUrl(webAppUrl);
    toast.success('✅ Web App URL이 저장되었습니다');
  };

  // 플레이어 레벨 데이터 업로드
  const handleUploadPlayerLevels = async () => {
    if (!webAppUrl) {
      toast.error('Web App URL을 먼저 설정해주세요');
      return;
    }

    if (!props.playerLevelConfig) {
      toast.error('플레이어 레벨 설정이 없습니다');
      return;
    }

    setIsUploading(true);

    try {
      const maxLevel = props.playerLevelConfig.maxLevel || 100;
      const expData = generateExpChartDataWithSegments(
        props.playerLevelConfig.expGrowthConfig || {
          segments: [],
          bezierSegments: [],
          useBezier: true,
        },
        1,
        maxLevel,
      );

      const headers = [
        'level',
        'exp_required',
        'cumulative_exp',
        'hp',
        'sp',
        'attack',
        'defense',
        'speed',
      ];
      const data = expData.map((levelData) => {
        const hp =
          props.playerLevelConfig!.baseHp +
          (levelData.level - 1) * props.playerLevelConfig!.hpPerLevel;
        const sp =
          props.playerLevelConfig!.baseSp +
          (levelData.level - 1) * props.playerLevelConfig!.spPerLevel;
        const attack =
          props.playerLevelConfig!.baseAttack +
          (levelData.level - 1) * props.playerLevelConfig!.attackPerLevel;
        const defense =
          props.playerLevelConfig!.baseDefense +
          (levelData.level - 1) * props.playerLevelConfig!.defensePerLevel;
        const speed =
          props.playerLevelConfig!.baseSpeed +
          (levelData.level - 1) * props.playerLevelConfig!.speedPerLevel;

        return [
          levelData.level,
          levelData.exp,
          levelData.cumulativeExp,
          Math.round(hp),
          Math.round(sp),
          Math.round(attack),
          Math.round(defense),
          Math.round(speed),
        ];
      });

      const result = await writeToGoogleSheet(webAppUrl, 'player_levels', headers, data, apiKey);

      if (result.success) {
        toast.success(`✅ 플레이어 레벨 데이터 (${data.length}개 레벨) 업로드 완료!`);
      } else {
        toast.error(`업로드 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : '업로드 중 오류 발생');
    } finally {
      setIsUploading(false);
    }
  };

  // 몬스터 레벨 데이터 업로드 (경험치 없이 능력치만)
  const handleUploadMonsterLevels = async () => {
    if (!webAppUrl) {
      toast.error('Web App URL을 먼저 설정해주세요');
      return;
    }

    if (!props.monsterLevelConfig) {
      toast.error('몬스터 레벨 설정이 없습니다');
      return;
    }

    setIsUploading(true);

    try {
      const maxLevel = props.monsterLevelConfig.maxLevel || 100;

      // 몬스터는 경험치가 필요 없으므로 레벨별 능력치만 계산
      const headers = ['level', 'hp', 'sp', 'attack', 'defense', 'speed'];
      const data = [];

      for (let level = 1; level <= maxLevel; level++) {
        const hp =
          props.monsterLevelConfig.baseHp + (level - 1) * props.monsterLevelConfig.hpPerLevel;
        const sp =
          props.monsterLevelConfig.baseSp + (level - 1) * props.monsterLevelConfig.spPerLevel;
        const attack =
          props.monsterLevelConfig.baseAttack +
          (level - 1) * props.monsterLevelConfig.attackPerLevel;
        const defense =
          props.monsterLevelConfig.baseDefense +
          (level - 1) * props.monsterLevelConfig.defensePerLevel;
        const speed =
          props.monsterLevelConfig.baseSpeed + (level - 1) * props.monsterLevelConfig.speedPerLevel;

        data.push([
          level,
          Math.round(hp),
          Math.round(sp),
          Math.round(attack),
          Math.round(defense),
          Math.round(speed),
        ]);
      }

      const result = await writeToGoogleSheet(webAppUrl, 'monster_levels', headers, data, apiKey);

      if (result.success) {
        toast.success(`✅ 몬스터 레벨 데이터 (${data.length}개 레벨) 업로드 완료!`);
      } else {
        toast.error(`업로드 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : '업로드 중 오류 발생');
    } finally {
      setIsUploading(false);
    }
  };

  // 스킬 데이터 업로드
  const handleUploadSkills = async () => {
    if (!webAppUrl) {
      toast.error('Web App URL을 먼저 설정해주세요');
      return;
    }

    if (!props.skillConfigs || Object.keys(props.skillConfigs).length === 0) {
      toast.error('스킬 설정이 없습니다');
      return;
    }

    setIsUploading(true);

    try {
      const headers = [
        'id',
        'name',
        'type',
        'damageMultiplier',
        'healAmount',
        'buffDuration',
        'buffStats',
        'spCost',
        'cooldown',
        'castTime',
        'range',
        'width',
        'duration',
        'description',
      ];

      const data = Object.values(props.skillConfigs).map((skill) => {
        let buffStatsStr = '';
        if (skill.buffStats) {
          try {
            buffStatsStr = JSON.stringify(skill.buffStats);
          } catch {
            buffStatsStr = '';
          }
        }

        return [
          skill.id,
          skill.name,
          skill.type,
          skill.damageMultiplier ?? '',
          skill.healAmount ?? '',
          skill.buffDuration ?? '',
          buffStatsStr,
          skill.spCost,
          skill.cooldown,
          skill.castTime,
          skill.range,
          skill.width,
          skill.duration ?? '',
          skill.description || '',
        ];
      });

      const result = await writeToGoogleSheet(webAppUrl, 'skills', headers, data, apiKey);

      if (result.success) {
        toast.success(`✅ 스킬 데이터 (${data.length}개) 업로드 완료!`);
      } else {
        toast.error(`업로드 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : '업로드 중 오류 발생');
    } finally {
      setIsUploading(false);
    }
  };

  // 아이템 데이터 업로드
  const handleUploadItems = async () => {
    if (!webAppUrl) {
      toast.error('Web App URL을 먼저 설정해주세요');
      return;
    }

    if (!props.itemSlots || props.itemSlots.length === 0) {
      toast.error('아이템 설정이 없습니다');
      return;
    }

    setIsUploading(true);

    try {
      const headers = ['id', 'name', 'type', 'stats', 'weight', 'equipped'];

      const data = props.itemSlots.map((item) => {
        let statsStr = '';
        if (item.stats) {
          try {
            statsStr = JSON.stringify(item.stats);
          } catch {
            statsStr = '';
          }
        }

        return [item.id, item.name, item.type, statsStr, item.weight, item.equipped];
      });

      const result = await writeToGoogleSheet(webAppUrl, 'items', headers, data, apiKey);

      if (result.success) {
        toast.success(`✅ 아이템 데이터 (${data.length}개) 업로드 완료!`);
      } else {
        toast.error(`업로드 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : '업로드 중 오류 발생');
    } finally {
      setIsUploading(false);
    }
  };

  // 플레이어 데이터셋 업로드
  const handleUploadPlayerDataset = async () => {
    if (!webAppUrl) {
      toast.error('Web App URL을 먼저 설정해주세요');
      return;
    }

    if (!props.playerDataset || props.playerDataset.length === 0) {
      toast.error('플레이어 데이터셋이 없습니다');
      return;
    }

    setIsUploading(true);

    try {
      // 데이터셋의 모든 필드를 헤더로 추출
      const allKeys = new Set<string>();
      props.playerDataset.forEach((row) => {
        Object.keys(row).forEach((key) => allKeys.add(key));
      });
      const headers = Array.from(allKeys).sort();

      const data = props.playerDataset.map((row) => {
        return headers.map((header) => {
          const value = (row as any)[header];
          return value !== undefined ? value : '';
        });
      });

      const result = await writeToGoogleSheet(webAppUrl, 'player_dataset', headers, data, apiKey);

      if (result.success) {
        toast.success(`✅ 플레이어 데이터셋 (${data.length}개 행) 업로드 완료!`);
      } else {
        toast.error(`업로드 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : '업로드 중 오류 발생');
    } finally {
      setIsUploading(false);
    }
  };

  // 몬스터 데이터셋 업로드
  const handleUploadMonsterDataset = async () => {
    if (!webAppUrl) {
      toast.error('Web App URL을 먼저 설정해주세요');
      return;
    }

    if (!props.monsterDataset || props.monsterDataset.length === 0) {
      toast.error('몬스터 데이터셋이 없습니다');
      return;
    }

    setIsUploading(true);

    try {
      // 데이터셋의 모든 필드를 헤더로 추출
      const allKeys = new Set<string>();
      props.monsterDataset.forEach((row) => {
        Object.keys(row).forEach((key) => allKeys.add(key));
      });
      const headers = Array.from(allKeys).sort();

      const data = props.monsterDataset.map((row) => {
        return headers.map((header) => {
          const value = (row as any)[header];
          return value !== undefined ? value : '';
        });
      });

      const result = await writeToGoogleSheet(webAppUrl, 'monster_dataset', headers, data, apiKey);

      if (result.success) {
        toast.success(`✅ 몬스터 데이터셋 (${data.length}개 행) 업로드 완료!`);
      } else {
        toast.error(`업로드 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : '업로드 중 오류 발생');
    } finally {
      setIsUploading(false);
    }
  };

  // 모든 데이터 업로드
  const handleUploadAll = async () => {
    if (!webAppUrl) {
      toast.error('Web App URL을 먼저 설정해주세요');
      return;
    }

    let successCount = 0;
    let totalCount = 0;

    setIsUploading(true);

    // 플레이어 레벨
    if (props.playerLevelConfig) {
      totalCount++;
      try {
        await handleUploadPlayerLevels();
        successCount++;
      } catch (error) {
        console.error('Player levels upload failed:', error);
      }
    }

    // 몬스터 레벨
    if (props.monsterLevelConfig) {
      totalCount++;
      try {
        await handleUploadMonsterLevels();
        successCount++;
      } catch (error) {
        console.error('Monster levels upload failed:', error);
      }
    }

    // 스킬
    if (props.skillConfigs && Object.keys(props.skillConfigs).length > 0) {
      totalCount++;
      try {
        await handleUploadSkills();
        successCount++;
      } catch (error) {
        console.error('Skills upload failed:', error);
      }
    }

    // 아이템
    if (props.itemSlots && props.itemSlots.length > 0) {
      totalCount++;
      try {
        await handleUploadItems();
        successCount++;
      } catch (error) {
        console.error('Items upload failed:', error);
      }
    }

    // 플레이어 데이터셋
    if (props.playerDataset && props.playerDataset.length > 0) {
      totalCount++;
      try {
        await handleUploadPlayerDataset();
        successCount++;
      } catch (error) {
        console.error('Player dataset upload failed:', error);
      }
    }

    // 몬스터 데이터셋
    if (props.monsterDataset && props.monsterDataset.length > 0) {
      totalCount++;
      try {
        await handleUploadMonsterDataset();
        successCount++;
      } catch (error) {
        console.error('Monster dataset upload failed:', error);
      }
    }

    setIsUploading(false);

    if (totalCount === 0) {
      toast.info('업로드할 데이터가 없습니다');
    } else if (successCount === totalCount) {
      toast.success(`✅ 모든 데이터 업로드 완료! (${successCount}/${totalCount})`);
    } else {
      toast.warning(`⚠️ 일부 업로드 완료 (${successCount}/${totalCount})`);
    }
  };

  // 데이터 타입별로 연결 그룹화
  const connectionsByType = connections.reduce(
    (acc, conn) => {
      if (!acc[conn.dataType]) {
        acc[conn.dataType] = [];
      }
      acc[conn.dataType].push(conn);
      return acc;
    },
    {} as Record<DataType, SheetConnection[]>,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Google Sheets 연동
            </CardTitle>
            <CardDescription>게임 데이터를 구글 시트로 관리하고 업로드하세요</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Package className="w-3 h-3" />
            {connections.length}개 연결
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 1. 시트 연결 관리 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium">시트 연결 관리</h3>
          </div>

          {/* 새 연결 추가 */}
          <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
            <h4 className="text-sm font-medium">새 시트 연결 추가</h4>

            <div className="space-y-2">
              <Label htmlFor="sheet-type" className="text-xs">
                데이터 타입 *
              </Label>
              <Select value={newDataType} onValueChange={(v) => setNewDataType(v as DataType)}>
                <SelectTrigger id="sheet-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player_stats">플레이어 기본 스탯</SelectItem>
                  <SelectItem value="player_levels">플레이어 레벨 설정</SelectItem>
                  <SelectItem value="monster_stats">몬스터 기본 스탯</SelectItem>
                  <SelectItem value="monster_levels">몬스터 레벨 설정</SelectItem>
                  <SelectItem value="monster_types">몬스터 타입 정의</SelectItem>
                  <SelectItem value="skills">스킬 데이터</SelectItem>
                  <SelectItem value="items">아이템 데이터</SelectItem>
                  <SelectItem value="character_types">캐릭터 타입</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-name" className="text-xs">
                연결 이름 (선택사항)
              </Label>
              <Input
                id="sheet-name"
                placeholder={`예: ${DATA_TYPE_LABELS[newDataType]}`}
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-url" className="text-xs">
                Google Sheets URL *
              </Label>
              <Input
                id="sheet-url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={newSheetUrl}
                onChange={(e) => setNewSheetUrl(e.target.value)}
              />
            </div>

            <Button onClick={handleAddConnection} size="sm" className="w-full">
              <Link2 className="w-4 h-4 mr-2" />
              연결 추가
            </Button>

            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                시트는 "링크가 있는 모든 사용자"에게 공개되어야 합니다.
                <br />
                파일 → 공유 → "링크가 있는 모든 사용자" 선택
              </AlertDescription>
            </Alert>
          </div>

          {/* 연결 목록 */}
          <div className="space-y-4">
            {Object.entries(DATA_TYPE_LABELS).map(([type, label]) => {
              const conns = connectionsByType[type as DataType] || [];
              if (conns.length === 0) return null;

              return (
                <div key={type} className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    {label}
                    <Badge variant="outline" className="text-xs">
                      {conns.length}
                    </Badge>
                  </h4>

                  <div className="space-y-2">
                    {conns.map((conn) => (
                      <div
                        key={conn.id}
                        className="p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">{conn.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                GID: {conn.gid}
                              </Badge>
                            </div>

                            {conn.lastSync && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                마지막 동기화: {conn.lastSync.toLocaleString('ko-KR')}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(conn.url, '_blank')}
                              title="시트 열기"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLoadFromSheet(conn)}
                              disabled={isLoading}
                              title="데이터 불러오기"
                            >
                              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteConnection(conn.id)}
                              title="연결 삭제"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {connections.length === 0 && (
              <Alert>
                <AlertDescription className="text-xs">
                  저장된 시트 연결이 없습니다. 위에서 새 연결을 추가하세요.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <Separator />

        {/* 2. 시트에 데이터 업로드 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-600" />
            <h3 className="font-medium">시트에 데이터 업로드</h3>
          </div>

          {/* Apps Script 설정 */}
          <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Apps Script Web App 설정</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowGuide(!showGuide)}>
                <Code className="w-4 h-4 mr-1" />
                {showGuide ? '가이드 숨기기' : '설정 가이드'}
              </Button>
            </div>

            {showGuide && (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertTitle className="text-sm">Apps Script Web App 설정 방법</AlertTitle>
                <AlertDescription className="text-xs space-y-3">
                  <div>
                    <p className="font-medium mb-1">1단계: Google Sheets 열기</p>
                    <p className="text-muted-foreground">데이터를 저장할 구글 시트를 엽니다.</p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">2단계: Apps Script 에디터 열기</p>
                    <p className="text-muted-foreground">확장 프로그램 → Apps Script 메뉴 선택</p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">3단계: 스크립트 코드 복사</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyAppsScript}
                      className="my-2"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      🔐 API 키 인증 코드 복사
                    </Button>
                    <p className="text-muted-foreground">
                      복사한 코드를 Apps Script 에디터에 붙여넣기
                    </p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">4단계: API 키 생성 및 설정</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>
                        Apps Script 에디터에서{' '}
                        <code className="bg-slate-200 px-1 rounded">testGenerateKey</code> 함수 선택
                      </li>
                      <li>실행 버튼 클릭 (재생 ▶️ 아이콘)</li>
                      <li>생성된 API 키를 복사</li>
                      <li>
                        코드 상단의 <code className="bg-slate-200 px-1 rounded">API_KEY</code> 값에
                        붙여넣기
                      </li>
                      <li>저장 (Ctrl+S 또는 Cmd+S)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">5단계: Web App 배포</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>배포 → 새 배포 선택</li>
                      <li>유형: 웹 앱 선택</li>
                      <li>액세스 권한: "모든 사용자" 선택</li>
                      <li>배포 버튼 클릭</li>
                      <li>생성된 Web App URL 복사</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">6단계: URL과 API 키 입력</p>
                    <p className="text-muted-foreground">
                      복사한 Web App URL과 설정한 API 키를 아래 입력란에 붙여넣고 저장
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-xs">
                🔐 API 키 *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Apps Script에서 설정한 API 키 입력"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSaveApiKey} size="sm" variant="secondary">
                  저장
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Apps Script의{' '}
                <code className="bg-slate-200 px-1 rounded">testGenerateKey()</code> 함수로
                생성하거나 직접 입력
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webapp-url" className="text-xs">
                Web App URL *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="webapp-url"
                  placeholder="https://script.google.com/macros/s/..."
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSaveWebAppUrl} size="sm">
                  저장
                </Button>
              </div>
            </div>

            {webAppUrl && apiKey && (
              <Alert>
                <CheckCircle2 className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  ✅ Web App URL과 API 키가 설정되었습니다. 이제 안전하게 데이터를 업로드할 수
                  있습니다.
                </AlertDescription>
              </Alert>
            )}

            {webAppUrl && !apiKey && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-xs text-yellow-800">
                  ⚠️ API 키를 입력하지 않으면 인증 없이 업로드됩니다. 보안을 위해 API 키 설정을
                  권장합니다.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* 업로드 버튼들 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">개별 데이터 업로드</h4>
              <Badge variant="secondary" className="text-xs">
                {
                  [
                    props.playerLevelConfig,
                    props.monsterLevelConfig,
                    props.skillConfigs && Object.keys(props.skillConfigs).length > 0,
                    props.itemSlots && props.itemSlots.length > 0,
                    props.playerDataset && props.playerDataset.length > 0,
                    props.monsterDataset && props.monsterDataset.length > 0,
                  ].filter(Boolean).length
                }
                개 사용 가능
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* 레벨별 경험치 데이터 */}
              <Button
                onClick={handleUploadPlayerLevels}
                disabled={isUploading || !webAppUrl || !props.playerLevelConfig}
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                size="sm"
              >
                <Upload className="w-4 h-4" />
                <div className="text-xs text-center">
                  <div className="font-medium">플레이어 레벨</div>
                  <div className="text-muted-foreground text-[10px]">
                    {props.playerLevelConfig
                      ? `Lv.1~${props.playerLevelConfig.maxLevel || 100}`
                      : '없음'}
                  </div>
                </div>
              </Button>

              <Button
                onClick={handleUploadMonsterLevels}
                disabled={isUploading || !webAppUrl || !props.monsterLevelConfig}
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                size="sm"
              >
                <Upload className="w-4 h-4" />
                <div className="text-xs text-center">
                  <div className="font-medium">몬스터 레벨</div>
                  <div className="text-muted-foreground text-[10px]">
                    {props.monsterLevelConfig
                      ? `Lv.1~${props.monsterLevelConfig.maxLevel || 100}`
                      : '없음'}
                  </div>
                </div>
              </Button>

              {/* 스킬 효과 데이터 */}
              <Button
                onClick={handleUploadSkills}
                disabled={
                  isUploading ||
                  !webAppUrl ||
                  !props.skillConfigs ||
                  Object.keys(props.skillConfigs).length === 0
                }
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                size="sm"
              >
                <Upload className="w-4 h-4" />
                <div className="text-xs text-center">
                  <div className="font-medium">스킬 효과</div>
                  <div className="text-muted-foreground text-[10px]">
                    {props.skillConfigs ? `${Object.keys(props.skillConfigs).length}개` : '없음'}
                  </div>
                </div>
              </Button>

              {/* 아이템 설정 */}
              <Button
                onClick={handleUploadItems}
                disabled={
                  isUploading || !webAppUrl || !props.itemSlots || props.itemSlots.length === 0
                }
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                size="sm"
              >
                <Upload className="w-4 h-4" />
                <div className="text-xs text-center">
                  <div className="font-medium">아이템 설정</div>
                  <div className="text-muted-foreground text-[10px]">
                    {props.itemSlots ? `${props.itemSlots.length}개` : '없음'}
                  </div>
                </div>
              </Button>

              {/* 플레이어 데이터셋 */}
              <Button
                onClick={handleUploadPlayerDataset}
                disabled={
                  isUploading ||
                  !webAppUrl ||
                  !props.playerDataset ||
                  props.playerDataset.length === 0
                }
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                size="sm"
              >
                <Upload className="w-4 h-4" />
                <div className="text-xs text-center">
                  <div className="font-medium">플레이어 데이터셋</div>
                  <div className="text-muted-foreground text-[10px]">
                    {props.playerDataset ? `${props.playerDataset.length}개 행` : '없음'}
                  </div>
                </div>
              </Button>

              {/* 몬스터 데이터셋 */}
              <Button
                onClick={handleUploadMonsterDataset}
                disabled={
                  isUploading ||
                  !webAppUrl ||
                  !props.monsterDataset ||
                  props.monsterDataset.length === 0
                }
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                size="sm"
              >
                <Upload className="w-4 h-4" />
                <div className="text-xs text-center">
                  <div className="font-medium">몬스터 데이터셋</div>
                  <div className="text-muted-foreground text-[10px]">
                    {props.monsterDataset ? `${props.monsterDataset.length}개 행` : '없음'}
                  </div>
                </div>
              </Button>
            </div>

            {/* 모두 업로드 버튼 */}
            <Button
              onClick={handleUploadAll}
              disabled={isUploading || !webAppUrl}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  모든 데이터 한번에 업로드
                </>
              )}
            </Button>

            {/* 안내 메시지 */}
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                <strong>주의:</strong> 업로드하면 시트의 기존 데이터가 덮어쓰기됩니다.
                <br />각 데이터는 별도의 시트에 저장됩니다: player_levels, monster_levels, skills,
                items, player_dataset, monster_dataset
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <Separator />

        {/* 3. 엑셀 다운로드 (Apps Script 없이 사용 가능) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-green-600" />
            <h3 className="font-medium">엑셀 다운로드 (간편 방식)</h3>
          </div>

          <Alert className="bg-green-50 border-green-200">
            <AlertCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-xs">
              <strong>Apps Script 설정이 어렵나요?</strong>
              <br />
              엑셀 파일(.xlsx)을 다운로드하여 구글 시트에서{' '}
              <strong>"파일 → 가져오기 → 업로드"</strong> 메뉴로 직접 가져올 수 있습니다.
              <br />
              <strong className="text-green-700">
                💡 팁: "모든 데이터 다운로드"하면 하나의 엑셀 파일에 모든 시트가 포함됩니다!
              </strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">개별 파일 다운로드</h4>
              <Badge variant="outline" className="text-xs">
                .xlsx 형식
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* 레벨별 경험치 데이터 */}
              <Button
                onClick={handleDownloadPlayerLevelsExcel}
                disabled={!props.playerLevelConfig}
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                size="sm"
              >
                <Download className="w-4 h-4" />
                <div className="text-xs text-center">
                  <div className="font-medium">플레이어 레벨</div>
                  <div className="text-muted-foreground text-[10px]">
                    {props.playerLevelConfig
                      ? `Lv.1~${props.playerLevelConfig.maxLevel || 100}`
                      : '없음'}
                  </div>
                </div>
              </Button>

              <Button
                onClick={handleDownloadMonsterLevelsExcel}
                disabled={!props.monsterLevelConfig}
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                size="sm"
              >
                <Download className="w-4 h-4" />
                <div className="text-xs text-center">
                  <div className="font-medium">몬스터 레벨</div>
                  <div className="text-muted-foreground text-[10px]">
                    {props.monsterLevelConfig
                      ? `Lv.1~${props.monsterLevelConfig.maxLevel || 100}`
                      : '없음'}
                  </div>
                </div>
              </Button>

              {/* 스킬 효과 데이터 */}
              <Button
                onClick={handleDownloadSkillsExcel}
                disabled={!props.skillConfigs || Object.keys(props.skillConfigs).length === 0}
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                size="sm"
              >
                <Download className="w-4 h-4" />
                <div className="text-xs text-center">
                  <div className="font-medium">스킬 효과</div>
                  <div className="text-muted-foreground text-[10px]">
                    {props.skillConfigs ? `${Object.keys(props.skillConfigs).length}개` : '없음'}
                  </div>
                </div>
              </Button>

              {/* 아이템 설정 */}
              <Button
                onClick={handleDownloadItemsExcel}
                disabled={!props.itemSlots || props.itemSlots.length === 0}
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                size="sm"
              >
                <Download className="w-4 h-4" />
                <div className="text-xs text-center">
                  <div className="font-medium">아이템 설정</div>
                  <div className="text-muted-foreground text-[10px]">
                    {props.itemSlots ? `${props.itemSlots.length}개` : '없음'}
                  </div>
                </div>
              </Button>

              {/* 플레이어 데이터셋 */}
              <Button
                onClick={handleDownloadPlayerDatasetExcel}
                disabled={!props.playerDataset || props.playerDataset.length === 0}
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                size="sm"
              >
                <Download className="w-4 h-4" />
                <div className="text-xs text-center">
                  <div className="font-medium">플레이어 데이터셋</div>
                  <div className="text-muted-foreground text-[10px]">
                    {props.playerDataset ? `${props.playerDataset.length}개 행` : '없음'}
                  </div>
                </div>
              </Button>

              {/* 몬스터 데이터셋 */}
              <Button
                onClick={handleDownloadMonsterDatasetExcel}
                disabled={!props.monsterDataset || props.monsterDataset.length === 0}
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                size="sm"
              >
                <Download className="w-4 h-4" />
                <div className="text-xs text-center">
                  <div className="font-medium">몬스터 데이터셋</div>
                  <div className="text-muted-foreground text-[10px]">
                    {props.monsterDataset ? `${props.monsterDataset.length}개 행` : '없음'}
                  </div>
                </div>
              </Button>
            </div>

            {/* 모두 다운로드 버튼 */}
            <Button
              onClick={handleDownloadAllExcel}
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Download className="w-4 h-4 mr-2" />
              모든 데이터 한 번에 다운로드 (통합 엑셀 파일)
            </Button>

            {/* 사용 방법 안내 */}
            <Alert className="bg-slate-50">
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription className="text-xs space-y-2">
                <div>
                  <strong>엑셀 파일을 구글 시트에 가져오는 방법:</strong>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>구글 시트 열기</li>
                  <li>
                    <strong>파일 → 가져오기</strong> 메뉴 선택
                  </li>
                  <li>
                    <strong>업로드</strong> 탭에서 다운로드한 .xlsx 파일 선택
                  </li>
                  <li>
                    가져오기 위치: <strong>"새 스프레드시트 만들기"</strong> 또는{' '}
                    <strong>"새 시트 삽입"</strong> 선택
                  </li>
                  <li>
                    <strong>데이터 가져오기</strong> 클릭
                  </li>
                </ol>
                <div className="mt-2 text-green-700">
                  <strong>💡 "모든 데이터" 다운로드 시:</strong> 하나의 엑셀 파일에 6개 시트가 모두
                  포함되어 관리가 편리합니다!
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
