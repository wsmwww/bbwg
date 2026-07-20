export const ALLIANCE_SETTINGS_STORAGE_KEY = 'benben-alliance-data-settings';
export const POWER_RANKINGS_STORAGE_KEY = 'benben-power-ranking-members';

const RANKING_BATCH_ID = 10;
const RANKING_PAGE_SIZE = 50;

function getApiBase() {
  if (window.__BENBEN_RANKING_API_BASE__) {
    return String(window.__BENBEN_RANKING_API_BASE__).replace(/\/$/, '');
  }
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return '//localhost:8081/ranking-api';
  }
  return '/ranking-api';
}

async function requestRanking(path, params = {}) {
  const query = new URLSearchParams({ batch_id: String(RANKING_BATCH_ID), ...params });
  const response = await fetch(`${getApiBase()}/${path}?${query}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`排行榜接口请求失败（HTTP ${response.status}）`);
  const result = await response.json();
  if (Number(result?.code) !== 0) throw new Error(result?.message || '排行榜接口返回异常');
  return result.data || {};
}

export async function fetchServerIds() {
  const data = await requestRanking('servers');
  return (data.servers || [])
    .map(item => Number(item.server_no))
    .filter(Number.isInteger)
    .sort((a, b) => a - b);
}

async function fetchAllPlayers(serverId, keyword = '') {
  const normalizedId = Number(serverId);
  if (!Number.isInteger(normalizedId) || normalizedId <= 0) throw new Error('请选择有效区服');

  const commonParams = {
    mode: 'server',
    sort: 'hero_power',
    order: 'desc',
    size: String(RANKING_PAGE_SIZE),
    servers: String(normalizedId)
  };
  if (keyword) commonParams.keyword = keyword;

  const firstPage = await requestRanking('players', { ...commonParams, page: '1' });
  const rows = [...(firstPage.list || [])];
  const total = Number(firstPage.total || rows.length);
  const responsePageSize = Number(firstPage.size || RANKING_PAGE_SIZE);
  const pageCount = Math.ceil(total / responsePageSize);
  if (pageCount > 1) {
    const rest = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => (
      requestRanking('players', { ...commonParams, page: String(index + 2) })
    )));
    rest.forEach(page => rows.push(...(page.list || [])));
  }
  return rows;
}

function createRankingRows(players, field) {
  return players
    .filter(player => Number.isFinite(Number(player[field])))
    .slice()
    .sort((a, b) => Number(b[field]) - Number(a[field]))
    .map((player, index) => ({
      rank: index + 1,
      score: Number(player[field] || 0),
      entity_type: 'player',
      uid: String(player.id),
      name: String(player.nickname || `玩家 ${player.id}`).trim(),
      alliance_abbr: String(player.alliance || '').trim(),
      alliance_name: String(player.alliance || '').trim(),
      server_no: Number(player.server_no),
      hero_power: Number(player.hero_power || 0),
      pet_power: Number(player.pet_power || 0),
      secret_level: Number(player.secret_level || 0)
    }));
}

function buildRankingPayload(serverId, players) {
  return {
    kid: Number(serverId),
    batch_id: RANKING_BATCH_ID,
    fetched_at: new Date().toISOString(),
    players,
    rankings: {
      '8': { type: 8, label: '英雄总实力', rows: createRankingRows(players, 'hero_power') },
      '16': { type: 16, label: '宠物总实力', rows: createRankingRows(players, 'pet_power') },
      '20': { type: 20, label: '秘境试炼', rows: createRankingRows(players, 'secret_level') }
    }
  };
}

export async function fetchServerRanking(serverId) {
  return buildRankingPayload(serverId, await fetchAllPlayers(serverId));
}

export async function fetchAllianceRanking(serverId, keyword) {
  const alliance = String(keyword || '').trim();
  if (!alliance) throw new Error('请选择联盟');
  const players = await fetchAllPlayers(serverId, alliance);
  const exactPlayers = players.filter(player => (
    String(player.alliance || '').trim().toLocaleLowerCase() === alliance.toLocaleLowerCase()
  ));
  return buildRankingPayload(serverId, exactPlayers);
}

export function getAllianceOptions(payload) {
  const alliances = new Map();
  (payload?.players || []).forEach(player => {
    const abbr = String(player.alliance || '').trim();
    if (!abbr) return;
    const key = abbr.toLocaleLowerCase();
    const previous = alliances.get(key) || { id: abbr, name: abbr, abbr, power: 0, memberCount: 0 };
    previous.power += Number(player.hero_power || 0);
    previous.memberCount += 1;
    alliances.set(key, previous);
  });
  return [...alliances.values()].sort((a, b) => (b.power - a.power) || a.abbr.localeCompare(b.abbr));
}

export function collectAllianceMembers(payload, allianceId) {
  const target = String(allianceId || '').trim().toLocaleLowerCase();
  return (payload?.players || [])
    .filter(player => String(player.alliance || '').trim().toLocaleLowerCase() === target)
    .sort((a, b) => Number(b.hero_power || 0) - Number(a.hero_power || 0))
    .map((player, index) => ({
      rank: index + 1,
      name: String(player.nickname || `玩家 ${player.id}`).trim(),
      power: Number(player.hero_power || 0),
      alliance: String(player.alliance || '').trim(),
      role: player.secret_level ? `秘境 ${Number(player.secret_level)}` : '',
      uid: String(player.id),
      zoneRank: Number(player.seq_no || 0),
      rankingTypes: [8, 16, 20]
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
