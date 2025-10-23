import { DataRow } from './mockData';
import { CharacterStats, MonsterStats, LevelData } from './gameData';

// Default spreadsheet ID (for backward compatibility)
const DEFAULT_SPREADSHEET_ID = '1wtyQMEQn8daGbvmiRikS6n8ChcJzLucFwJ2zAez4w44';

// Sheet GIDs - These need to match your actual sheet structure
// To find GID: Open sheet tab, look at URL: ...#gid=XXXXXX
// Default GID '0' will fetch the first sheet
const SHEET_GIDS = {
  levelExp: '0',
  characterStats: '0',
  monsterStats: '0',
};

// Get spreadsheet ID from localStorage or use default
export function getStoredSpreadsheetId(): string {
  return localStorage.getItem('default_spreadsheet_id') || DEFAULT_SPREADSHEET_ID;
}

// Set default spreadsheet ID
export function setStoredSpreadsheetId(id: string): void {
  localStorage.setItem('default_spreadsheet_id', id);
}

// Helper to try multiple GIDs
async function tryFetchSheet(spreadsheetId: string, gids: string[]): Promise<string | null> {
  for (const gid of gids) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
      const response = await fetch(csvUrl);
      if (response.ok) {
        const text = await response.text();
        if (text.trim()) return text;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

export async function loadGoogleSheetData(
  sheetGid: string = '0',
  spreadsheetId?: string
): Promise<DataRow[]> {
  try {
    const id = spreadsheetId || getStoredSpreadsheetId();
    // Google Sheets CSV export URL
    const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${sheetGid}`;
    
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Error loading Google Sheet:', error);
    throw error;
  }
}

function parseCSV(csvText: string): DataRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV has no data rows');
  }
  
  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Find column indices
  const getIndex = (names: string[]) => {
    for (const name of names) {
      const idx = header.indexOf(name);
      if (idx !== -1) return idx;
    }
    return -1;
  };
  
  const indices = {
    t: getIndex(['t', 'time', '시간']),
    x: getIndex(['x', 'pos_x', 'position_x']),
    y: getIndex(['y', 'pos_y', 'position_y']),
    speed: getIndex(['speed', 'velocity', '속도']),
    dir: getIndex(['dir', 'direction', 'angle', '방향']),
    atk_range: getIndex(['atk_range', 'attack_range', 'attackrange', '공격범위']),
    skill_range: getIndex(['skill_range', 'skillrange', '스킬범위']),
    is_attack: getIndex(['is_attack', 'attack', 'isattack', '공격']),
    is_miss: getIndex(['is_miss', 'miss', 'ismiss', '회피']),
    is_crit: getIndex(['is_crit', 'crit', 'iscrit', 'critical', '크리티컬']),
  };
  
  // Parse data rows
  const data: DataRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    // Skip empty rows
    if (values.every(v => !v)) continue;
    
    const row: DataRow = {
      t: parseFloat(values[indices.t] || '0') || 0,
      x: parseFloat(values[indices.x] || '0') || 0,
      y: parseFloat(values[indices.y] || '0') || 0,
      speed: parseFloat(values[indices.speed] || '0') || 0,
      dir: parseFloat(values[indices.dir] || '0') || 0,
      atk_range: parseFloat(values[indices.atk_range] || '0') || 0,
      skill_range: parseFloat(values[indices.skill_range] || '0') || 0,
      is_attack: parseInt(values[indices.is_attack] || '0') || 0,
      is_miss: parseInt(values[indices.is_miss] || '0') || 0,
      is_crit: parseInt(values[indices.is_crit] || '0') || 0,
    };
    
    data.push(row);
  }
  
  return data;
}

export function getSpreadsheetUrl(spreadsheetId?: string): string {
  const id = spreadsheetId || getStoredSpreadsheetId();
  return `https://docs.google.com/spreadsheets/d/${id}/edit`;
}

export async function loadLevelExpData(spreadsheetId?: string): Promise<LevelData[]> {
  try {
    const id = spreadsheetId || getStoredSpreadsheetId();
    const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${SHEET_GIDS.levelExp}`;
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error('Failed to fetch level data');
    
    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) return [];
    
    const data: LevelData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 2) {
        data.push({
          level: parseInt(values[0]) || 1,
          expRequired: parseInt(values[1]) || 100,
        });
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error loading level data:', error);
    return [];
  }
}

export async function loadCharacterStats(spreadsheetId?: string): Promise<Partial<CharacterStats> | null> {
  try {
    const id = spreadsheetId || getStoredSpreadsheetId();
    // Try multiple GIDs in case the character stats are on different sheets
    const csvText = await tryFetchSheet(id, ['0', '1', '2', '3']);
    
    if (!csvText) {
      console.warn('Could not fetch any sheet data');
      return null;
    }
    
    console.log('Character stats CSV (first 300 chars):\n', csvText.substring(0, 300));
    
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      console.warn('Sheet has insufficient data (need at least 2 rows)');
      return null;
    }
    
    // Try to find character stats in any row
    for (let rowIdx = 0; rowIdx < Math.min(lines.length, 10); rowIdx++) {
      const header = lines[rowIdx].split(',').map(h => h.trim().toLowerCase());
      
      // Check if this looks like a character stats header
      const hasCharFields = header.some(h => 
        ['hp', 'health', '체력', 'atk', 'attack', '공격', 'def', 'defense', '방어'].some(f => h.includes(f))
      );
      
      if (!hasCharFields) continue;
      
      // Found a potential header row, try next row for data
      if (rowIdx + 1 >= lines.length) continue;
      
      const values = lines[rowIdx + 1].split(',').map(v => v.trim());
      
      console.log(`Row ${rowIdx} - Header:`, header);
      console.log(`Row ${rowIdx + 1} - Values:`, values);
      
      const getVal = (names: string[]) => {
        for (const name of names) {
          for (let i = 0; i < header.length; i++) {
            if (names.some(n => header[i].includes(n))) {
              const val = parseFloat(values[i]);
              if (!isNaN(val) && val > 0) return val;
            }
          }
        }
        return null;
      };
      
      const stats = {
        hp: getVal(['hp', 'health', '체력']),
        maxHp: getVal(['max_hp', 'maxhp', 'max', '최대']),
        atk: getVal(['atk', 'attack', '공격']),
        def: getVal(['def', 'defense', '방어']),
      };
      
      const hasData = Object.values(stats).some(v => v !== null);
      if (hasData) {
        console.log('✓ Found character stats:', stats);
        return stats as Partial<CharacterStats>;
      }
    }
    
    console.info('ℹ️ No character stats found in sheet - using default values');
    return null;
  } catch (error) {
    console.warn('Error loading character stats:', error);
    return null;
  }
}

export async function loadMonsterStats(spreadsheetId?: string): Promise<Partial<MonsterStats> | null> {
  try {
    const id = spreadsheetId || getStoredSpreadsheetId();
    // Try multiple GIDs in case the monster stats are on different sheets
    const csvText = await tryFetchSheet(id, ['0', '1', '2', '3']);
    
    if (!csvText) {
      console.warn('Could not fetch any sheet data');
      return null;
    }
    
    console.log('Monster stats CSV (first 300 chars):\n', csvText.substring(0, 300));
    
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      console.warn('Sheet has insufficient data (need at least 2 rows)');
      return null;
    }
    
    // Try to find monster stats in any row
    for (let rowIdx = 0; rowIdx < Math.min(lines.length, 10); rowIdx++) {
      const header = lines[rowIdx].split(',').map(h => h.trim().toLowerCase());
      
      // Check if this looks like a monster stats header
      const hasMonsterFields = header.some(h => 
        ['monster', '몬스터', 'mob', 'enemy', '적'].some(f => h.includes(f)) ||
        ['hp', 'atk', 'exp', '경험치'].filter(f => header.some(hh => hh.includes(f))).length >= 2
      );
      
      if (!hasMonsterFields) continue;
      
      // Found a potential header row, try next row for data
      if (rowIdx + 1 >= lines.length) continue;
      
      const values = lines[rowIdx + 1].split(',').map(v => v.trim());
      
      console.log(`Row ${rowIdx} - Header:`, header);
      console.log(`Row ${rowIdx + 1} - Values:`, values);
      
      const getVal = (names: string[]) => {
        for (let i = 0; i < header.length; i++) {
          if (names.some(n => header[i].includes(n))) {
            const val = parseFloat(values[i]);
            if (!isNaN(val) && val > 0) return val;
          }
        }
        return null;
      };
      
      const getStr = (names: string[]) => {
        for (let i = 0; i < header.length; i++) {
          if (names.some(n => header[i].includes(n))) {
            if (values[i] && values[i].length > 0) return values[i];
          }
        }
        return null;
      };
      
      const stats = {
        name: getStr(['name', 'monster', '이름', '몬스터', 'mob']),
        hp: getVal(['hp', 'health', '체력']),
        maxHp: getVal(['max_hp', 'maxhp', 'max', '최대']),
        atk: getVal(['atk', 'attack', '공격']),
        def: getVal(['def', 'defense', '방어']),
        expReward: getVal(['exp', 'experience', '경험', 'reward']),
      };
      
      const hasData = Object.values(stats).some(v => v !== null);
      if (hasData) {
        console.log('✓ Found monster stats:', stats);
        return stats as Partial<MonsterStats>;
      }
    }
    
    console.info('ℹ️ No monster stats found in sheet - using default values');
    return null;
  } catch (error) {
    console.warn('Error loading monster stats:', error);
    return null;
  }
}

// 구글 시트에 데이터 작성하기 (Apps Script Web App 사용 - API 키 인증 포함)
export async function writeToGoogleSheet(
  webAppUrl: string,
  sheetName: string,
  headers: string[],
  data: any[][],
  apiKey?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'no-cors', // CORS 우회
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sheetName,
        headers,
        data,
        apiKey, // API 키 포함
      }),
    });

    // no-cors 모드에서는 응답을 읽을 수 없으므로 성공으로 간주
    return {
      success: true,
      message: '데이터가 전송되었습니다. 시트를 확인해주세요.',
    };
  } catch (error) {
    console.error('Error writing to sheet:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

// API 키 저장/불러오기
export function getStoredApiKey(): string {
  return localStorage.getItem('google_sheets_api_key') || '';
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem('google_sheets_api_key', key);
}

// 구글 시트 Web App URL 저장/불러오기
export function getStoredWebAppUrl(): string {
  return localStorage.getItem('google_sheets_webapp_url') || '';
}

export function setStoredWebAppUrl(url: string): void {
  localStorage.setItem('google_sheets_webapp_url', url);
}
