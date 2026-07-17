export const ALLIANCE_SETTINGS_STORAGE_KEY = 'benben-alliance-data-settings';
export const POWER_RANKINGS_STORAGE_KEY = 'benben-power-ranking-members';

function getApiBase() {
  if (window.__BENBEN_RANKING_API_BASE__) {
    return String(window.__BENBEN_RANKING_API_BASE__).replace(/\/$/, '');
  }
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return '//localhost:8081/benben-ranking-api';
  }
  return '/benben-ranking-api';
}

export async function fetchServerIds() {
  return requestJson('servers.json');
}

export async function fetchServerRanking(serverId) {
  const normalizedId = Number(serverId);
  if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
    throw new Error('请选择有效区服');
  }
  return requestJson(`${normalizedId}.json`);
}

async function requestJson(path) {
  const response = await fetch(`${getApiBase()}/${path}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`排行榜接口请求失败（HTTP ${response.status}）`);
  return response.json();
}

export function getAllianceOptions(payload) {
  return (payload?.rankings?.['1']?.rows || [])
    .filter(item => item?.entity_type === 'alliance' && Number(item.alliance_id) > 0)
    .map(item => ({
      id: Number(item.alliance_id),
      name: String(item.name || '').trim(),
      abbr: String(item.abbr || '').trim(),
      power: Number(item.score || 0)
    }));
}

export function collectAllianceMembers(payload, allianceId) {
  const targetId = Number(allianceId);
  const members = new Map();

  Object.values(payload?.rankings || {}).forEach(ranking => {
    (ranking?.rows || []).forEach(row => {
      if (row?.entity_type !== 'player' || Number(row.alliance_id) !== targetId || !row.uid) return;
      const uid = String(row.uid);
      const previous = members.get(uid) || {};
      const isPowerRanking = Number(ranking.type) === 3;
      members.set(uid, {
        ...previous,
        uid,
        name: String(row.name || previous.name || `玩家 ${uid}`).trim(),
        power: Math.max(Number(previous.power || 0), Number(row.power || 0), isPowerRanking ? Number(row.score || 0) : 0),
        allianceId: targetId,
        alliance: String(row.alliance_name || previous.alliance || '').trim(),
        allianceAbbr: String(row.alliance_abbr || previous.allianceAbbr || '').trim(),
        townCenterLevel: Math.max(Number(previous.townCenterLevel || 0), Number(row.town_center_level || 0)),
        zoneRank: isPowerRanking ? Number(row.rank || 0) : Number(previous.zoneRank || 0),
        rankingTypes: Array.from(new Set([...(previous.rankingTypes || []), Number(ranking.type)]))
      });
    });
  });

  return [...members.values()]
    .sort((a, b) => (b.power - a.power) || a.name.localeCompare(b.name, 'zh-CN'))
    .map((member, index) => ({
      rank: index + 1,
      name: member.name,
      power: member.power,
      alliance: member.allianceAbbr
        ? `[${member.allianceAbbr}] ${member.alliance}`
        : member.alliance,
      role: member.townCenterLevel ? `城镇中心 Lv.${member.townCenterLevel}` : '',
      uid: member.uid,
      zoneRank: member.zoneRank,
      rankingTypes: member.rankingTypes
    }));
}

export function loadAllianceSettings() {
  try {
    return JSON.parse(localStorage.getItem(ALLIANCE_SETTINGS_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveAllianceSelection(settings, members) {
  localStorage.setItem(ALLIANCE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  localStorage.setItem(POWER_RANKINGS_STORAGE_KEY, JSON.stringify(members));
  window.dispatchEvent(new CustomEvent('alliance-members-change', { detail: { settings, members } }));
}
