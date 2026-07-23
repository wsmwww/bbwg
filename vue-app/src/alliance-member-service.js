export const ALLIANCE_SETTINGS_STORAGE_KEY = 'benben-alliance-data-settings';
export const POWER_RANKINGS_STORAGE_KEY = 'benben-power-ranking-members';
export const RANKING_SOURCE_STORAGE_KEY = 'bbwg-ranking-source';

export const RANKING_SOURCES = {
  current: { id: 'current', label: '当前接口（t2s）' },
  legacy: { id: 'legacy', label: '旧版接口（benbenkshen）' }
};

const RANKING_BATCH_ID = 10;
const RANKING_PAGE_SIZE = 50;

export function getRankingSource() {
  return localStorage.getItem(RANKING_SOURCE_STORAGE_KEY) === 'legacy' ? 'legacy' : 'current';
}

export function setRankingSource(source) {
  const normalized = source === 'legacy' ? 'legacy' : 'current';
  localStorage.setItem(RANKING_SOURCE_STORAGE_KEY, normalized);
  window.dispatchEvent(new CustomEvent('ranking-source-change', { detail: normalized }));
  return normalized;
}

function getApiBase(source = getRankingSource()) {
  if (source === 'legacy') {
    if (window.__BENBEN_LEGACY_RANKING_API_BASE__) {
      return String(window.__BENBEN_LEGACY_RANKING_API_BASE__).replace(/\/$/, '');
    }
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      return '//localhost:8081/legacy-ranking-api';
    }
    return '/legacy-ranking-api';
  }
  if (window.__BENBEN_RANKING_API_BASE__) {
    return String(window.__BENBEN_RANKING_API_BASE__).replace(/\/$/, '');
  }
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return '//localhost:8081/ranking-api';
  }
  return '/ranking-api';
}

async function requestLegacyJson(file) {
  const response = await fetch(`${getApiBase('legacy')}/${file}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`旧版排行榜请求失败（HTTP ${response.status}）`);
  return response.json();
}

async function requestRanking(path, params = {}) {
  const query = new URLSearchParams({ batch_id: String(RANKING_BATCH_ID), ...params });
  const response = await fetch(`${getApiBase('current')}/${path}?${query}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`排行榜接口请求失败（HTTP ${response.status}）`);
  const result = await response.json();
  if (Number(result?.code) !== 0) throw new Error(result?.message || '排行榜接口返回异常');
  return result.data || {};
}

export async function fetchServerIds() {
  if (getRankingSource() === 'legacy') {
    const data = await requestLegacyJson('servers.json');
    return (Array.isArray(data) ? data : data?.servers || [])
      .map(Number)
      .filter(Number.isInteger)
      .sort((a, b) => a - b);
  }
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
    mode: 'server', sort: 'hero_power', order: 'desc', size: String(RANKING_PAGE_SIZE), servers: String(normalizedId)
  };
  if (keyword) commonParams.keyword = keyword;
  const firstPage = await requestRanking('players', { ...commonParams, page: '1' });
  const rows = [...(firstPage.list || [])];
  const pageCount = Math.ceil(Number(firstPage.total || rows.length) / Number(firstPage.size || RANKING_PAGE_SIZE));
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
    kid: Number(serverId), batch_id: RANKING_BATCH_ID, fetched_at: new Date().toISOString(), players,
    rankings: {
      '8': { type: 8, label: '英雄总实力', rows: createRankingRows(players, 'hero_power') },
      '16': { type: 16, label: '宠物总实力', rows: createRankingRows(players, 'pet_power') },
      '20': { type: 20, label: '秘境试炼', rows: createRankingRows(players, 'secret_level') }
    }
  };
}

export async function fetchServerRanking(serverId) {
  if (getRankingSource() === 'legacy') {
    const normalizedId = Number(serverId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) throw new Error('请选择有效区服');
    return requestLegacyJson(`${normalizedId}.json`);
  }
  return buildRankingPayload(serverId, await fetchAllPlayers(serverId));
}

export async function fetchAllianceRanking(serverId, keyword) {
  const alliance = String(keyword || '').trim();
  if (!alliance) throw new Error('请选择联盟');
  if (getRankingSource() === 'legacy') return fetchServerRanking(serverId);
  const players = await fetchAllPlayers(serverId, alliance);
  const exactPlayers = players.filter(player => String(player.alliance || '').trim().toLocaleLowerCase() === alliance.toLocaleLowerCase());
  return buildRankingPayload(serverId, exactPlayers);
}

export function getAllianceOptions(payload) {
  const legacyRows = payload?.rankings?.['1']?.rows;
  if (Array.isArray(legacyRows)) {
    return legacyRows.map(row => ({
      id: String(row.alliance_id ?? row.key ?? row.abbr ?? ''),
      name: String(row.name || row.abbr || '').trim(),
      abbr: String(row.abbr || '').trim(),
      power: Number(row.score || row.power || 0),
      memberCount: Number(row.member_count || 0)
    })).filter(item => item.id).sort((a, b) => (b.power - a.power) || a.abbr.localeCompare(b.abbr));
  }
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
  if (!Array.isArray(payload?.players) && payload?.rankings) {
    const members = new Map();
    Object.values(payload.rankings).forEach(ranking => {
      (ranking?.rows || []).forEach(row => {
        if (row?.entity_type !== 'player') return;
        const id = String(row.alliance_id ?? '').trim().toLocaleLowerCase();
        const abbr = String(row.alliance_abbr || '').trim().toLocaleLowerCase();
        if (id !== target && abbr !== target) return;
        const uid = String(row.uid ?? row.key ?? '');
        if (!uid) return;
        const previous = members.get(uid) || {
          name: String(row.name || `玩家 ${uid}`).trim(), power: 0,
          alliance: String(row.alliance_abbr || row.alliance_name || '').trim(), role: '', uid,
          zoneRank: Number(row.rank || 0), rankingTypes: []
        };
        previous.power = Math.max(previous.power, Number(row.power || 0), Number(ranking.type) === 8 ? Number(row.score || 0) : 0);
        previous.rankingTypes.push(Number(ranking.type));
        members.set(uid, previous);
      });
    });
    return [...members.values()]
      .sort((a, b) => (b.power - a.power) || a.name.localeCompare(b.name, 'zh-CN'))
      .map((member, index) => ({ ...member, rank: index + 1, rankingTypes: [...new Set(member.rankingTypes)] }));
  }
  return (payload?.players || [])
    .filter(player => String(player.alliance || '').trim().toLocaleLowerCase() === target)
    .sort((a, b) => Number(b.hero_power || 0) - Number(a.hero_power || 0))
    .map((player, index) => ({
      rank: index + 1, name: String(player.nickname || `玩家 ${player.id}`).trim(), power: Number(player.hero_power || 0),
      alliance: String(player.alliance || '').trim(), role: player.secret_level ? `秘境 ${Number(player.secret_level)}` : '',
      uid: String(player.id), zoneRank: Number(player.seq_no || 0), rankingTypes: [8, 16, 20]
    }));
}

export function loadAllianceSettings() {
  try { return JSON.parse(localStorage.getItem(ALLIANCE_SETTINGS_STORAGE_KEY) || 'null'); } catch { return null; }
}

export function saveAllianceSelection(settings, members) {
  localStorage.setItem(ALLIANCE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  localStorage.setItem(POWER_RANKINGS_STORAGE_KEY, JSON.stringify(members));
  window.dispatchEvent(new CustomEvent('alliance-members-change', { detail: { settings, members } }));
}
