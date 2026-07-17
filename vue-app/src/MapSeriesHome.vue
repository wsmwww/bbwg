<template>
  <main class="map-series">
    <img class="map-series__background" :src="mapSeriesBackground" alt="" aria-hidden="true" />
    <section class="map-series__hero">
      <p class="map-series__eyebrow">BENBEN KINGDOM</p>
      <h1>地图系列</h1>
      <p>选择一个地图方案进入编辑。神剑战场会直接展开成员战力榜，并生成已经配置好的基础布局。</p>
      <button class="roster-drawer-button" type="button" @click="showMemberDrawer = true">
        <span>联盟成员</span>
        <strong>{{ memberPreview.length }} 人</strong>
      </button>
    </section>

    <section class="map-section" aria-label="地图入口">
      <div class="section-title">
        <span>MAP TEMPLATES</span>
        <h2>地图方案</h2>
      </div>

      <div class="map-card-grid">
        <button class="map-card map-card--default" type="button" @click="$emit('open-default-map')">
          <span class="map-card__image" aria-hidden="true" :style="{ backgroundImage: `url(${defaultCover})` }"></span>
          <span class="map-card__shade" aria-hidden="true"></span>
          <span class="map-card__badge">默认</span>
          <span class="map-card__title">默认地图</span>
          <span class="map-card__desc">进入空白布局规划，自由编辑旗帜、城市、捕兽夹、建筑点位和联盟区域。</span>
          <span class="map-card__action">进入地图</span>
        </button>

        <button class="map-card map-card--sword" type="button" @click="$emit('open-sword-map')">
          <span class="map-card__image" aria-hidden="true" :style="{ backgroundImage: `url(${swordCover})` }"></span>
          <span class="map-card__shade" aria-hidden="true"></span>
          <span class="map-card__badge">神剑</span>
          <span class="map-card__title">神剑战场</span>
          <span class="map-card__desc">进入后加载神剑战场初始化模板，支持军团报名、任务派遣、首占点位和战术表导出。</span>
          <span class="map-card__action">展开神剑战场</span>
        </button>

        <button class="map-card map-card--three-alliance" type="button" @click="$emit('open-three-alliance-map')">
          <span class="map-card__image" aria-hidden="true" :style="{ backgroundImage: `url(${threeAllianceCover})` }"></span>
          <span class="map-card__shade" aria-hidden="true"></span>
          <span class="map-card__badge">三盟</span>
          <span class="map-card__title">三盟争霸</span>
          <span class="map-card__desc">模拟三方战场点位，包含潮汐神殿、中转枢纽、遗迹、遗迹群、海之柱与上下线路连接。</span>
          <span class="map-card__action">展开三盟争霸</span>
        </button>

        <button class="map-card map-card--comparison" type="button" @click="$emit('open-power-comparison')">
          <span class="map-card__comparison-art" aria-hidden="true"><b>A</b><i>VS</i><b>B</b></span>
          <span class="map-card__shade" aria-hidden="true"></span>
          <span class="map-card__badge">对比</span>
          <span class="map-card__title">实力对比</span>
          <span class="map-card__desc">选择两个区服，按个人、英雄、宠物、秘境等榜单查看左右完整排名。</span>
          <span class="map-card__action">进入实力对比</span>
        </button>

        <button class="map-card map-card--info" type="button" @click="$emit('open-info-statistics')">
          <span class="map-card__info-art" aria-hidden="true">
            <i v-for="item in 36" :key="item"></i>
            <b>王</b>
          </span>
          <span class="map-card__shade" aria-hidden="true"></span>
          <span class="map-card__badge">统计</span>
          <span class="map-card__title">信息统计</span>
          <span class="map-card__desc">登记盟友报名资料、在线时间、语音、钻石、兵力、城堡等级和分工意愿。</span>
          <span class="map-card__action">进入信息统计</span>
        </button>
      </div>
    </section>

    <section class="settings-section" aria-label="联盟设置">
      <section class="settings-card">
        <div class="settings-card__head">
          <div>
            <span>ALLIANCE SETTINGS</span>
            <h2>联盟设置</h2>
          </div>
          <em>战力前 10 自动标记车头</em>
        </div>

        <div class="settings-card__body">
          <div class="ranking-settings">
            <div class="server-range-tabs" aria-label="区服范围">
              <button
                v-for="range in serverRangeOptions"
                :key="range.start"
                type="button"
                :class="{ active: serverRangeStart === range.start }"
                @click="selectServerRange(range.start)"
              >{{ range.label }}</button>
            </div>
            <div class="ranking-settings__fields">
              <label>
                <span>区服</span>
                <select v-model="selectedServer" :disabled="loadingServers || updatingMembers" @change="loadAlliances">
                  <option value="">请选择区服</option>
                  <option v-for="server in filteredServerIds" :key="server" :value="String(server)">{{ server }} 区</option>
                </select>
              </label>
              <label>
                <span>联盟</span>
                <select v-model="selectedAllianceId" :disabled="!allianceOptions.length || updatingMembers" @change="updateAllianceMembers">
                  <option value="">请选择联盟</option>
                  <option v-for="alliance in allianceOptions" :key="alliance.id" :value="String(alliance.id)">
                    {{ alliance.abbr ? `[${alliance.abbr}] ` : '' }}{{ alliance.name }}
                  </option>
                </select>
              </label>
            </div>
            <p class="settings-card__hint">
              从该区全部个人榜单聚合成员并按 UID 去重；数据只覆盖至少进入一个榜单前 100 名的成员，不等同于完整联盟名册。
            </p>
            <p class="ranking-settings__status" :class="{ 'is-error': requestError }">
              {{ requestError || memberStatus || '选择联盟后将自动替换地图成员数据' }}
            </p>
          </div>

        </div>
      </section>
    </section>

    <Teleport to="body">
      <div v-if="showMemberDrawer" class="member-drawer-mask" @click.self="showMemberDrawer = false">
        <aside class="alliance-member-panel member-drawer" aria-label="联盟成员列表">
          <div class="alliance-member-panel__head">
            <div>
              <span>ALLIANCE ROSTER</span>
              <strong>联盟成员</strong>
              <small>按战力从高到低 · 前 10 名自动标记车头</small>
            </div>
            <button type="button" @click="showMemberDrawer = false">关闭</button>
          </div>
          <div v-if="memberPreview.length" class="alliance-member-list">
            <article v-for="member in memberPreview" :key="member.uid" :class="{ 'is-leader': member.rank <= 10 }">
              <b>{{ String(member.rank).padStart(2, '0') }}</b>
              <div>
                <strong>{{ member.name }}</strong>
                <small>UID {{ member.uid }}<template v-if="member.role"> · {{ member.role }}</template></small>
              </div>
              <div class="alliance-member-list__power">
                <em v-if="member.rank <= 10">车头</em>
                <span>{{ formatPower(member.power) }}</span>
              </div>
            </article>
          </div>
          <div v-else class="leader-empty">选择区服和联盟后显示成员</div>
        </aside>
      </div>
    </Teleport>

    <section class="updates-section" aria-label="更新记录">
      <button class="updates-toggle" type="button" :aria-expanded="showUpdates" @click="showUpdates = !showUpdates">
        <span>
          <small>CHANGELOG</small>
          <strong>更新记录</strong>
        </span>
        <em>{{ showUpdates ? '收起' : '展开' }}</em>
      </button>

      <div v-if="showUpdates" class="updates-card">
        <article v-for="record in updateRecords" :key="record.date" class="update-item">
          <time>{{ record.date }}</time>
          <div>
            <h3>{{ record.title }}</h3>
            <ul>
              <li v-for="item in record.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import mapSeriesBackground from './assets/map-series-bg-wide.png';
import {
  collectAllianceMembers,
  fetchServerIds,
  fetchServerRanking,
  getAllianceOptions,
  loadAllianceSettings,
  saveAllianceSelection
} from './alliance-member-service';

defineEmits(['open-default-map', 'open-sword-map', 'open-three-alliance-map', 'open-power-comparison', 'open-info-statistics']);

const STORAGE_KEY = 'benben-alliance-leaders';
const showUpdates = ref(false);
const showMemberDrawer = ref(false);
const serverIds = ref([]);
const selectedServer = ref('');
const serverRangeStart = ref(1);
const selectedAllianceId = ref('');
const allianceOptions = ref([]);
const serverPayload = ref(null);
const loadingServers = ref(false);
const updatingMembers = ref(false);
const requestError = ref('');
const memberStatus = ref('');
const memberPreview = ref([]);
const runtimePublicPath = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ || `${window.location.origin}/`;
const defaultCover = `${runtimePublicPath.replace(/\/?$/, '/')}images/bear-pit.png`;
const swordCover = `${runtimePublicPath.replace(/\/?$/, '/')}images/sword-cover.png`;
const threeAllianceCover = `${runtimePublicPath.replace(/\/?$/, '/')}images/three-alliance-cover.png`;

const serverRangeOptions = computed(() => {
  const maxServer = Math.max(...serverIds.value.map(Number), 0);
  const starts = [1];
  for (let start = 100; start <= Math.max(500, maxServer); start += 100) starts.push(start);
  return starts.map((start, index) => ({
    start,
    label: start === 1 ? '1–99' : index === starts.length - 1 ? `${start}+` : `${start}–${start + 99}`
  }));
});
const filteredServerIds = computed(() => serverIds.value.filter(server => {
  const value = Number(server);
  return serverRangeStart.value === 1
    ? value >= 1 && value < 100
    : value >= serverRangeStart.value && value < serverRangeStart.value + 100;
}));

const updateRecords = [
  {
    date: '2026-07-13',
    title: '联盟成员自动同步与地图稳定性修复',
    items: [
      '地图方案新增“实力对比”入口卡片，进入独立页面后可左右查看两个区服的完整排行榜。',
      '区服下拉框新增 1–99、100、200、300、400、500+ 区段按钮，快速缩小区服选择范围。',
      '地图系列首页新增区服与联盟选择，选中联盟后立即请求排行榜、筛选联盟成员并按 UID 去重，无需额外点击更新。',
      '联盟设置右侧完整展示当前联盟的上榜成员，战力前 10 名自动标记为车头并同步到所有地图。',
      '已保存的区服和联盟会在再次进入时自动同步，地图成员榜刷新时也会重新读取当前联盟数据。',
      '移除地图初始化对外部 CDN 的依赖，修复 fflate 加载失败导致地图无法进入的问题。'
    ]
  },
  {
    date: '2026-07-07',
    title: '神剑战场指挥能力完善',
    items: [
      '新增军团1、军团2双战场切换，任务、报名人员和首占点位按军团独立保存。',
      '新增参战人员报名池，左侧盟友列表支持全联盟和当前军团参战人员切换。',
      '新增任务派遣弹窗、任务总览、成员任务视图，并支持导出/导入神剑任务安排 xlsx。'
    ]
  },
  {
    date: '2026-07-07',
    title: '基础地图与坐标校准增强',
    items: [
      '基础地图支持从盟友列表拖拽成员到地图，自动生成城市格子和成员铭牌。',
      '捕兽夹新增坐标校准，输入游戏内捕兽夹坐标后自动对齐周边城市坐标。',
      '成员列表新增名称搜索、战力区间筛选和参战人员视图。'
    ]
  },
  {
    date: '2026-07-07',
    title: '联盟成员数据管理',
    items: [
      '成员战力榜支持 Excel、JSON、CSV、文本导入，也支持手动编辑。',
      '支持导出联盟成员 JSON 和 Excel，导入后的数据会保存到浏览器本地。',
      '车头成员增加动态流光边框和高级标识。'
    ]
  },
  {
    date: '2026-07-06',
    title: '神剑战场模板与地图系列首页',
    items: [
      '地图系列首页新增默认地图和神剑战场两个入口。',
      '神剑战场改为通过固定 lp2 初始化模板加载，避免默认模板被误改。',
      '神剑建筑文字增加暗色底牌、金色描边和阴影，提高可读性。'
    ]
  },
  {
    date: '2026-07-06',
    title: '乾坤项目整合与部署修复',
    items: [
      '将地图系列加入乾坤子项目，并修复子项目资源加载路径。',
      '生产构建移除 localhost 资源地址，解决线上 ChunkLoadError。',
      '保留纯前端部署方式，dist 可直接上传到静态托管平台。'
    ]
  }
];

function formatPower(value) {
  return Number(value || 0).toLocaleString('zh-CN');
}

function getServerRangeStart(serverId) {
  const value = Number(serverId);
  return value < 100 ? 1 : Math.floor(value / 100) * 100;
}

function selectServerRange(start) {
  if (serverRangeStart.value === start) return;
  serverRangeStart.value = start;
  selectedServer.value = '';
  selectedAllianceId.value = '';
  allianceOptions.value = [];
  memberPreview.value = [];
  memberStatus.value = '';
  requestError.value = '';
}

async function loadAlliances({ restoreAllianceId = '' } = {}) {
  requestError.value = '';
  memberStatus.value = '';
  selectedAllianceId.value = '';
  allianceOptions.value = [];
  serverPayload.value = null;
  if (!selectedServer.value) return;

  updatingMembers.value = true;
  try {
    serverPayload.value = await fetchServerRanking(selectedServer.value);
    allianceOptions.value = getAllianceOptions(serverPayload.value);
    if (restoreAllianceId && allianceOptions.value.some(item => String(item.id) === String(restoreAllianceId))) {
      selectedAllianceId.value = String(restoreAllianceId);
    }
    memberStatus.value = `已读取 ${selectedServer.value} 区，共 ${allianceOptions.value.length} 个上榜联盟`;
  } catch (error) {
    requestError.value = error?.message || '区服数据读取失败';
  } finally {
    updatingMembers.value = false;
  }
}

async function updateAllianceMembers() {
  if (!selectedServer.value || !selectedAllianceId.value) return;
  requestError.value = '';
  updatingMembers.value = true;
  try {
    const payload = await fetchServerRanking(selectedServer.value);
    serverPayload.value = payload;
    allianceOptions.value = getAllianceOptions(payload);
    const alliance = allianceOptions.value.find(item => String(item.id) === selectedAllianceId.value);
    const members = collectAllianceMembers(payload, selectedAllianceId.value);
    if (!members.length) throw new Error('没有在当前排行榜数据中找到该联盟成员');
    const settings = {
      serverId: Number(selectedServer.value),
      allianceId: Number(selectedAllianceId.value),
      allianceName: alliance?.name || '',
      allianceAbbr: alliance?.abbr || '',
      updatedAt: new Date().toISOString(),
      fetchedAt: payload.fetched_at || null
    };
    saveAllianceSelection(settings, members);
    memberPreview.value = members;
    const leaderNames = members.slice(0, 10).map(member => member.name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderNames));
    window.dispatchEvent(new CustomEvent('alliance-leaders-change', { detail: leaderNames }));
    memberStatus.value = `已更新${alliance?.name ? `「${alliance.name}」` : '联盟'}：${members.length} 名上榜成员`;
  } catch (error) {
    requestError.value = error?.message || '联盟成员更新失败';
  } finally {
    updatingMembers.value = false;
  }
}

onMounted(async () => {
  loadingServers.value = true;
  try {
    serverIds.value = await fetchServerIds();
    const saved = loadAllianceSettings();
    if (saved?.serverId) {
      serverRangeStart.value = getServerRangeStart(saved.serverId);
      selectedServer.value = String(saved.serverId);
      await loadAlliances({ restoreAllianceId: saved.allianceId });
      if (selectedAllianceId.value) await updateAllianceMembers();
    }
  } catch (error) {
    requestError.value = error?.message || '区服目录读取失败';
  } finally {
    loadingServers.value = false;
  }
});
</script>

<style scoped>
.map-series {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto auto auto;
  align-content: start;
  min-height: 100%;
  height: 100%;
  overflow: auto;
  padding: 48px clamp(20px, 5vw, 72px);
  color: #2f3a2a;
  background: #fff8ee;
}

.map-series::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255, 250, 240, 0.26), rgba(255, 250, 240, 0.08) 46%, rgba(255, 250, 240, 0)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0));
}

.map-series__background {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  opacity: 0.94;
  pointer-events: none;
  user-select: none;
}

.map-series > :not(.map-series__background) {
  position: relative;
  z-index: 2;
}

.map-series__hero {
  grid-column: 1;
  grid-row: 1;
  width: min(100%, 1280px);
  max-width: 1280px;
  margin-bottom: 30px;
}

.map-series__eyebrow,
.section-title span,
.settings-card__head span {
  display: block;
  margin: 0 0 8px;
  color: #6f7f4f;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.map-series h1 {
  margin: 0;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 1;
}

.map-series__hero p:last-child {
  max-width: 680px;
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.7;
  color: rgba(47, 58, 42, 0.78);
}

.roster-drawer-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  border: 1px solid rgba(96, 112, 68, 0.28);
  border-radius: 999px;
  padding: 9px 14px;
  color: #2f3a2a;
  background: rgba(255, 251, 242, 0.88);
  box-shadow: 0 12px 28px rgba(35, 45, 28, 0.12);
  cursor: pointer;
}

.roster-drawer-button span,
.roster-drawer-button strong {
  font-size: 13px;
  font-weight: 900;
}

.roster-drawer-button strong {
  border-radius: 999px;
  padding: 4px 9px;
  color: #4b3b17;
  background: #f3c04d;
}

.map-section,
.settings-section,
.updates-section {
  grid-column: 1;
  width: min(100%, 1280px);
  max-width: 1280px;
}

.map-section {
  grid-row: 2;
}

.settings-section {
  grid-row: 3;
}

.updates-section {
  grid-row: 4;
}


.section-title {
  margin-bottom: 14px;
}

.section-title h2,
.settings-card__head h2 {
  margin: 0;
  font-size: 24px;
}

.map-card-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.map-card,
.settings-card,
.updates-card {
  border: 1px solid rgba(67, 80, 58, 0.18);
  border-radius: 8px;
  color: inherit;
  background: rgba(255, 251, 242, 0.92);
  box-shadow: 0 18px 42px rgba(35, 45, 28, 0.16);
}

.map-card {
  position: relative;
  display: flex;
  min-height: 230px;
  overflow: hidden;
  flex-direction: column;
  align-items: flex-start;
  padding: 22px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.map-card:not(.map-card--sword):not(.map-card--default):not(.map-card--three-alliance)::after {
  content: "";
  position: absolute;
  right: -54px;
  bottom: -58px;
  width: 168px;
  height: 168px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(243, 192, 77, 0.34), transparent 68%);
  pointer-events: none;
}

.map-card:hover {
  transform: translateY(-3px);
  border-color: rgba(111, 127, 79, 0.42);
  box-shadow: 0 24px 52px rgba(35, 45, 28, 0.22);
}

.map-card--default,
.map-card--sword,
.map-card--three-alliance,
.map-card--comparison,
.map-card--info {
  min-height: 280px;
  justify-content: flex-end;
  color: #fff8df;
}

.map-card--default {
  border-color: rgba(112, 146, 78, 0.46);
  background: #25321f;
}

.map-card--sword {
  border-color: rgba(185, 137, 35, 0.42);
  background: #2f2518;
}

.map-card--three-alliance {
  border-color: rgba(49, 127, 154, 0.42);
  background: #2a1f17;
}

.map-card--comparison {
  border-color: rgba(117, 77, 153, 0.46);
  background: linear-gradient(145deg, #1c2940, #51305f);
}

.map-card--info {
  border-color: rgba(92, 132, 76, 0.46);
  background: linear-gradient(145deg, #24351f, #6f8758);
}

.map-card__comparison-art {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background:
    radial-gradient(circle at 28% 35%, rgba(88, 177, 255, 0.4), transparent 28%),
    radial-gradient(circle at 72% 35%, rgba(255, 153, 74, 0.38), transparent 28%);
  transform: translateY(-18px);
}

.map-card__info-art {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  padding: 18px;
  background:
    linear-gradient(45deg, rgba(255, 255, 255, 0.3) 25%, transparent 25% 75%, rgba(255, 255, 255, 0.3) 75%),
    linear-gradient(45deg, rgba(255, 255, 255, 0.25) 25%, transparent 25% 75%, rgba(255, 255, 255, 0.25) 75%),
    linear-gradient(135deg, #8ca974, #5d7347);
  background-position: 0 0, 10px 10px, 0 0;
  background-size: 20px 20px, 20px 20px, auto;
  transform: scale(1);
  transition: transform 0.45s ease;
}

.map-card__info-art i {
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.06);
}

.map-card__info-art b {
  position: absolute;
  left: 50%;
  top: 42%;
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border: 3px solid rgba(255, 224, 130, 0.94);
  border-radius: 16px;
  color: #fff7d5;
  background: linear-gradient(135deg, #80502b, #c28a38);
  box-shadow: 0 18px 32px rgba(32, 42, 24, 0.36);
  font-size: 26px;
  transform: translate(-50%, -50%) rotate(45deg);
}

.map-card__info-art b::after {
  content: "王";
  transform: rotate(-45deg);
}

.map-card__info-art b {
  font-size: 0;
}

.map-card__comparison-art b {
  display: grid;
  width: 62px;
  height: 78px;
  place-items: center;
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  color: #fff;
  background: rgba(35, 87, 135, 0.76);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.32);
  font-size: 30px;
}

.map-card__comparison-art b:last-child {
  background: rgba(151, 66, 48, 0.78);
}

.map-card__comparison-art i {
  color: #ffd980;
  font-size: 15px;
  font-style: normal;
  font-weight: 1000;
}

.map-card--three-alliance::before {
  content: "";
  position: absolute;
  inset: 18px;
  border: 1px solid rgba(111, 207, 240, 0.26);
  border-radius: 8px;
  background:
    radial-gradient(circle at 50% 48%, rgba(241, 214, 132, 0.34), transparent 0 6%, rgba(53, 139, 171, 0.24) 7%, transparent 8%),
    linear-gradient(28deg, transparent 0 16%, rgba(53, 139, 171, 0.55) 16% 17%, transparent 17% 100%),
    linear-gradient(-28deg, transparent 0 16%, rgba(53, 139, 171, 0.55) 16% 17%, transparent 17% 100%);
  transform: scale(1);
  transition: transform 0.45s ease;
  pointer-events: none;
}

.map-card__image,
.map-card__shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.map-card__image {
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  transform: scale(1);
  transition: transform 0.45s ease;
}

.map-card__shade {
  background:
    linear-gradient(180deg, rgba(22, 16, 9, 0.08) 0%, rgba(22, 16, 9, 0.32) 45%, rgba(19, 13, 8, 0.82) 100%),
    linear-gradient(90deg, rgba(22, 16, 9, 0.72) 0%, transparent 52%);
}

.map-card--default .map-card__shade {
  background:
    linear-gradient(180deg, rgba(11, 26, 22, 0.04) 0%, rgba(11, 26, 22, 0.28) 42%, rgba(9, 18, 14, 0.82) 100%),
    linear-gradient(90deg, rgba(18, 32, 23, 0.72) 0%, rgba(18, 32, 23, 0.2) 58%, transparent 100%);
}

.map-card--default:hover .map-card__image,
.map-card--sword:hover .map-card__image,
.map-card--three-alliance:hover .map-card__image,
.map-card--three-alliance:hover::before,
.map-card--comparison:hover .map-card__comparison-art,
.map-card--info:hover .map-card__info-art {
  transform: scale(1.055);
}

.map-card__badge {
  position: relative;
  z-index: 1;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 900;
  color: #4b3b17;
  background: #f3c04d;
}

.map-card--default .map-card__badge {
  color: #17321f;
  background: linear-gradient(135deg, #e7c66d, #89b667);
  box-shadow: 0 8px 18px rgba(12, 31, 19, 0.26);
}

.map-card--sword .map-card__badge {
  color: #fff7ed;
  background: linear-gradient(135deg, #9f1d1d, #d89a1e);
  box-shadow: 0 8px 18px rgba(36, 18, 8, 0.24);
}

.map-card--three-alliance .map-card__badge {
  color: #fff7ed;
  background: linear-gradient(135deg, #1f799d, #d2a83b);
  box-shadow: 0 8px 18px rgba(14, 40, 50, 0.28);
}

.map-card--comparison .map-card__badge {
  color: #fff7ed;
  background: linear-gradient(135deg, #2878a8, #a24c74);
}

.map-card--info .map-card__badge {
  color: #17321f;
  background: linear-gradient(135deg, #e7c66d, #89b667);
}

.map-card__title,
.map-card__desc,
.map-card__action {
  position: relative;
  z-index: 1;
}

.map-card__title {
  margin-top: 18px;
  font-size: 24px;
  font-weight: 900;
}

.map-card__desc {
  margin-top: 9px;
  max-width: 430px;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(47, 58, 42, 0.72);
}

.map-card__action {
  margin-top: auto;
  color: #607044;
  font-size: 13px;
  font-weight: 900;
}

.map-card--default .map-card__action,
.map-card--sword .map-card__action,
.map-card--three-alliance .map-card__action,
.map-card--comparison .map-card__action,
.map-card--info .map-card__action {
  color: #ffd980;
}

.map-card--default .map-card__title,
.map-card--sword .map-card__title,
.map-card--three-alliance .map-card__title,
.map-card--comparison .map-card__title,
.map-card--info .map-card__title {
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
}

.map-card--default .map-card__desc,
.map-card--sword .map-card__desc,
.map-card--three-alliance .map-card__desc,
.map-card--comparison .map-card__desc,
.map-card--info .map-card__desc {
  color: rgba(255, 248, 223, 0.86);
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.38);
}

.settings-section,
.updates-section {
  margin-top: 26px;
}

.updates-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: 1px solid rgba(67, 80, 58, 0.18);
  border-radius: 8px;
  padding: 18px 20px;
  color: #2f3a2a;
  background: rgba(255, 251, 242, 0.92);
  box-shadow: 0 18px 42px rgba(35, 45, 28, 0.16);
  cursor: pointer;
}

.updates-toggle span {
  display: grid;
  gap: 4px;
  text-align: left;
}

.updates-toggle small {
  color: #b98923;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.updates-toggle strong {
  font-size: 22px;
}

.updates-toggle em {
  border-radius: 999px;
  padding: 6px 12px;
  color: #4b3b17;
  background: #f3c04d;
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
}

.settings-card,
.updates-card {
  padding: 20px;
}

.updates-card {
  margin-top: 12px;
}

.settings-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.settings-card__head span {
  color: #b98923;
}

.settings-card__head em {
  border-radius: 999px;
  padding: 7px 12px;
  color: #8f251f;
  background: #ffe2dc;
  font-size: 13px;
  font-style: normal;
  font-weight: 900;
}

.settings-card__body {
  display: block;
}

.ranking-settings {
  border: 1px solid rgba(67, 80, 58, 0.14);
  border-radius: 8px;
  padding: 16px;
  background: rgba(255, 253, 248, 0.68);
}

.server-range-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.server-range-tabs button {
  border: 1px solid rgba(67, 80, 58, 0.18);
  border-radius: 999px;
  padding: 6px 10px;
  color: #5c684d;
  background: #f2ead9;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
}

.server-range-tabs button.active {
  border-color: #66784b;
  color: #fff;
  background: #66784b;
  box-shadow: 0 4px 10px rgba(48, 59, 37, 0.18);
}

.ranking-settings__fields {
  display: grid;
  grid-template-columns: minmax(150px, 0.7fr) minmax(240px, 1.3fr);
  gap: 12px;
  align-items: end;
}

.ranking-settings__fields label span {
  display: block;
  margin-bottom: 8px;
}

.ranking-settings__fields select {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  border: 1px solid rgba(67, 80, 58, 0.24);
  border-radius: 8px;
  padding: 0 10px;
  color: #2f3a2a;
  background: rgba(255, 253, 248, 0.96);
}

.ranking-settings__fields select:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}

.ranking-settings__status {
  margin: 10px 0 0;
  color: #607044;
  font-size: 13px;
  font-weight: 800;
}

.ranking-settings__status.is-error {
  color: #a12626;
}

.settings-card label {
  display: block;
  margin-bottom: 8px;
  color: #5a654a;
  font-size: 13px;
  font-weight: 900;
}

.settings-card__hint {
  margin: 10px 0 0;
  color: rgba(47, 58, 42, 0.68);
  font-size: 12px;
  line-height: 1.6;
}

.alliance-member-panel {
  grid-column: 2;
  grid-row: 2 / 5;
  align-self: start;
  display: flex;
  min-height: 520px;
  max-height: calc(100vh - 180px);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(67, 80, 58, 0.14);
  border-radius: 8px;
  background: rgba(255, 253, 248, 0.9);
  box-shadow: 0 18px 42px rgba(35, 45, 28, 0.16);
}

.comparison-card {
  border: 1px solid rgba(67, 80, 58, 0.18);
  border-radius: 8px;
  padding: 20px;
  background: rgba(255, 251, 242, 0.92);
  box-shadow: 0 18px 42px rgba(35, 45, 28, 0.16);
}

.comparison-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.comparison-card__head span {
  color: #b98923;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.comparison-card__head h2 {
  margin: 5px 0 0;
  font-size: 24px;
}

.comparison-card__head p {
  margin: 7px 0 0;
  color: rgba(47, 58, 42, 0.66);
  font-size: 12px;
}

.comparison-card__head em {
  border-radius: 999px;
  padding: 6px 11px;
  color: #fff8df;
  background: #607044;
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
}

.comparison-selectors {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 14px;
  align-items: end;
  margin-top: 18px;
}

.comparison-selectors label span {
  display: block;
  margin-bottom: 7px;
  color: #5a654a;
  font-size: 12px;
  font-weight: 900;
}

.comparison-selectors select {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  border: 1px solid rgba(67, 80, 58, 0.24);
  border-radius: 8px;
  padding: 0 10px;
  color: #2f3a2a;
  background: rgba(255, 253, 248, 0.96);
}

.comparison-selectors > b {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 50%;
  color: #fff8df;
  background: #9f3328;
  font-size: 11px;
}

.comparison-error,
.comparison-empty {
  margin: 16px 0 0;
  border-radius: 8px;
  padding: 18px;
  color: rgba(47, 58, 42, 0.6);
  background: rgba(239, 229, 209, 0.46);
  text-align: center;
}

.comparison-error {
  color: #9f1d1d;
  background: rgba(255, 226, 220, 0.72);
}

.comparison-results {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.comparison-item {
  border: 1px solid rgba(67, 80, 58, 0.14);
  border-radius: 8px;
  padding: 12px;
  background: rgba(255, 253, 248, 0.72);
}

.comparison-item header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.comparison-item header > strong {
  font-size: 13px;
}

.comparison-item header > span {
  border-radius: 999px;
  padding: 3px 7px;
  color: #5e684e;
  background: #eee5d3;
  font-size: 10px;
  font-weight: 900;
}

.comparison-item header > span.winner-a,
.comparison-item header > span.winner-b {
  color: #8f251f;
  background: #ffe2dc;
}

.comparison-item__sides {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.comparison-item__sides > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.comparison-item__sides > div:last-child {
  text-align: right;
}

.comparison-item__sides small,
.comparison-item__sides span {
  overflow: hidden;
  color: rgba(47, 58, 42, 0.58);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comparison-item__sides strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comparison-item__sides b {
  color: #8a681f;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.comparison-item__sides > div.is-winner strong,
.comparison-item__sides > div.is-winner b {
  color: #a12626;
}

.comparison-item__sides > i {
  color: rgba(47, 58, 42, 0.36);
  font-size: 9px;
  font-style: normal;
  font-weight: 900;
}

.comparison-bars {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin-top: 9px;
}

.comparison-bars > span {
  display: flex;
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: #eee5d3;
}

.comparison-bars > span:first-child {
  justify-content: flex-end;
}

.comparison-bars i {
  display: block;
  border-radius: 999px;
  background: #798b59;
}

.comparison-bars > span:last-child i {
  background: #c4873a;
}

.alliance-member-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(67, 80, 58, 0.12);
  background: rgba(243, 231, 207, 0.72);
}

.alliance-member-panel__head div {
  display: grid;
  gap: 3px;
}

.alliance-member-panel__head div > span {
  color: #b98923;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.alliance-member-panel__head div > strong {
  font-size: 22px;
}

.alliance-member-panel__head small {
  color: rgba(47, 58, 42, 0.62);
  font-size: 11px;
}

.alliance-member-panel__head > span {
  border-radius: 999px;
  padding: 5px 10px;
  color: #4b3b17;
  background: #f3c04d;
  font-size: 12px;
  font-weight: 900;
}

.alliance-member-list {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.alliance-member-list article {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid rgba(67, 80, 58, 0.09);
  padding: 9px 8px;
}

.alliance-member-list article.is-leader {
  border: 1px solid rgba(190, 40, 36, 0.2);
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(255, 226, 220, 0.78), rgba(255, 249, 235, 0.68));
}

.alliance-member-list article > b {
  color: #75825f;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.alliance-member-list article.is-leader > b {
  color: #a12626;
}

.alliance-member-list article > div:nth-child(2) {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.alliance-member-list article > div:nth-child(2) strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.alliance-member-list article > div:nth-child(2) small {
  overflow: hidden;
  color: rgba(47, 58, 42, 0.56);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alliance-member-list__power {
  display: grid;
  justify-items: end;
  gap: 4px;
}

.alliance-member-list__power em {
  border-radius: 999px;
  padding: 2px 7px;
  color: #fff8ed;
  background: linear-gradient(135deg, #a11f1f, #dc6b29);
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
}

.alliance-member-list__power span {
  color: #8a681f;
  font-size: 12px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.leader-empty {
  margin: 16px;
  border-radius: 8px;
  padding: 18px;
  color: rgba(47, 58, 42, 0.58);
  background: rgba(239, 229, 209, 0.46);
  font-size: 13px;
  text-align: center;
}

.member-drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  justify-content: flex-end;
  background: rgba(14, 21, 16, 0.36);
  backdrop-filter: blur(3px);
}

.member-drawer {
  grid-column: auto;
  grid-row: auto;
  width: min(460px, calc(100vw - 24px));
  max-width: none;
  height: 100%;
  max-height: none;
  margin: 0;
  border-radius: 0;
  animation: memberDrawerIn 0.18s ease-out;
}

.alliance-member-panel__head button {
  border: 1px solid rgba(67, 80, 58, 0.18);
  border-radius: 999px;
  padding: 6px 11px;
  color: #4b3b17;
  background: #f3c04d;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

@keyframes memberDrawerIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@media (max-width: 1280px) {
  .map-series {
    grid-template-columns: 1fr;
  }

  .map-series__hero,
  .map-section,
  .settings-section,
  .updates-section {
    grid-column: 1;
    grid-row: auto;
    max-width: 1060px;
  }
}

.updates-card {
  display: grid;
  gap: 0;
}

.update-item {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 18px;
  padding: 18px 0;
  border-top: 1px solid rgba(67, 80, 58, 0.12);
}

.update-item:first-child {
  padding-top: 0;
  border-top: 0;
}

.update-item:last-child {
  padding-bottom: 0;
}

.update-item time {
  align-self: start;
  border-radius: 999px;
  padding: 7px 10px;
  color: #4b3b17;
  background: #f3e7cf;
  font-size: 12px;
  font-weight: 900;
  text-align: center;
}

.update-item h3 {
  margin: 0 0 8px;
  color: #293523;
  font-size: 17px;
}

.update-item ul {
  margin: 0;
  padding-left: 18px;
  color: rgba(47, 58, 42, 0.76);
  font-size: 13px;
  line-height: 1.7;
}

.update-item li + li {
  margin-top: 4px;
}

@media (max-width: 860px) {
  .map-card-grid,
  .settings-card__body,
  .ranking-settings__fields,
  .update-item {
    grid-template-columns: 1fr;
  }

  .update-item {
    gap: 10px;
  }

  .update-item time {
    justify-self: start;
  }

}
</style>
