<template>
  <main class="power-comparison-page">
    <header class="comparison-page-head">
      <button type="button" @click="$emit('back-to-series')">‹ 返回地图系列</button>
      <div>
        <span>POWER COMPARISON</span>
        <h1>区服实力对比</h1>
        <p>选择两个区服，按榜单查看左右完整排名。</p>
      </div>
    </header>

    <section class="comparison-control-card">
      <label>
        <span>A 区</span>
        <div class="comparison-range-tabs">
          <button v-for="range in serverRangeOptions" :key="`ra-${range.start}`" type="button" :class="{ active: rangeA === range.start }" @click.prevent="selectRange('a', range.start)">{{ range.shortLabel }}</button>
        </div>
        <select v-model="serverA" :disabled="loading" @change="compareIfReady">
          <option value="">请选择第一个区服</option>
          <option v-for="server in filteredServersA" :key="`a-${server}`" :value="String(server)">{{ server }} 区</option>
        </select>
      </label>
      <b>VS</b>
      <label>
        <span>B 区</span>
        <div class="comparison-range-tabs">
          <button v-for="range in serverRangeOptions" :key="`rb-${range.start}`" type="button" :class="{ active: rangeB === range.start }" @click.prevent="selectRange('b', range.start)">{{ range.shortLabel }}</button>
        </div>
        <select v-model="serverB" :disabled="loading" @change="compareIfReady">
          <option value="">请选择第二个区服</option>
          <option v-for="server in filteredServersB" :key="`b-${server}`" :value="String(server)">{{ server }} 区</option>
        </select>
      </label>
      <em>{{ loading ? '正在读取两个区服...' : statusText }}</em>
    </section>

    <section class="manual-upload">
      <button class="manual-upload__toggle" type="button" :aria-expanded="showManualUpload" @click="showManualUpload = !showManualUpload">
        {{ showManualUpload ? '收起手动数据上传' : '手动数据上传' }}
      </button>
      <div v-if="showManualUpload" class="manual-upload__panel">
        <label>
          <span>A 区 JSON</span>
          <input type="file" accept=".json,application/json" @change="readManualFile('a', $event)" />
          <small>{{ manualFileNameA || '尚未选择文件' }}</small>
        </label>
        <label>
          <span>B 区 JSON</span>
          <input type="file" accept=".json,application/json" @change="readManualFile('b', $event)" />
          <small>{{ manualFileNameB || '尚未选择文件' }}</small>
        </label>
        <button type="button" :disabled="!manualPayloadA || !manualPayloadB" @click="applyManualComparison">使用上传数据对比</button>
      </div>
    </section>

    <p v-if="errorMessage" class="comparison-page-error">{{ errorMessage }}</p>

    <template v-if="payloadA && payloadB">
      <nav class="ranking-tabs" aria-label="比对榜单">
        <button
          v-for="item in availableRankingTypes"
          :key="item.type"
          type="button"
          :class="{ active: activeType === item.type }"
          @click="selectRankingType(item.type)"
        >
          {{ item.label }}
        </button>
      </nav>

      <section class="leader-summary">
        <article :class="{ winner: leaderWinner === 'a' }">
          <small>{{ serverA }} 区榜首</small>
          <strong>{{ leaderA.name }}</strong>
          <span>{{ getAllianceText(leaderA) }}</span>
          <b>{{ formatScore(leaderA.score) }}</b>
        </article>
        <div>
          <span>{{ activeRankingLabel }}</span>
          <strong>{{ leaderWinnerText }}</strong>
          <small>榜单完整数据：{{ rowsA.length }} / {{ rowsB.length }} 人</small>
        </div>
        <article :class="{ winner: leaderWinner === 'b' }">
          <small>{{ serverB }} 区榜首</small>
          <strong>{{ leaderB.name }}</strong>
          <span>{{ getAllianceText(leaderB) }}</span>
          <b>{{ formatScore(leaderB.score) }}</b>
        </article>
      </section>

      <section class="comparison-table">
        <header>
          <div><b>A</b><strong>{{ serverA }} 区完整排名</strong><span>{{ rowsA.length }} 人</span></div>
          <div><b>B</b><strong>{{ serverB }} 区完整排名</strong><span>{{ rowsB.length }} 人</span></div>
        </header>
        <div ref="tableRowsRef" class="comparison-table__rows">
          <div v-for="pair in pairedRows" :key="pair.rank" class="comparison-rank-pair">
            <article :class="{ empty: !pair.a }">
              <b>{{ pair.rank }}</b>
              <div>
                <strong>{{ pair.a?.name || '—' }}</strong>
                <small>{{ pair.a ? getAllianceText(pair.a) : '暂无该排名数据' }}</small>
              </div>
              <span>{{ pair.a ? formatScore(pair.a.score) : '—' }}</span>
            </article>
            <article :class="{ empty: !pair.b }">
              <b>{{ pair.rank }}</b>
              <div>
                <strong>{{ pair.b?.name || '—' }}</strong>
                <small>{{ pair.b ? getAllianceText(pair.b) : '暂无该排名数据' }}</small>
              </div>
              <span>{{ pair.b ? formatScore(pair.b.score) : '—' }}</span>
            </article>
          </div>
        </div>
      </section>
    </template>

    <section v-else-if="!loading" class="comparison-page-empty">
      <strong>等待选择两个区服</strong>
      <p>选择 B 区后会自动请求双方完整榜单。</p>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { fetchServerIds, fetchServerRanking } from './alliance-member-service';

defineEmits(['back-to-series']);

const rankingTypes = [
  { type: 3, label: '个人总实力' },
  { type: 7, label: '单英雄实力' },
  { type: 8, label: '英雄总实力' },
  { type: 16, label: '宠物总实力' },
  { type: 5, label: '城镇中心' },
  { type: 6, label: '讨伐叛军' },
  { type: 18, label: '海岛繁荣度' },
  { type: 20, label: '秘境试炼' }
];

const serverIds = ref([]);
const serverA = ref('406');
const serverB = ref('398');
const rangeA = ref(400);
const rangeB = ref(300);
const payloadA = ref(null);
const payloadB = ref(null);
const activeType = ref(8);
const loading = ref(false);
const errorMessage = ref('');
const showManualUpload = ref(false);
const manualPayloadA = ref(null);
const manualPayloadB = ref(null);
const manualFileNameA = ref('');
const manualFileNameB = ref('');
const tableRowsRef = ref(null);

const rowsA = computed(() => payloadA.value?.rankings?.[String(activeType.value)]?.rows || []);
const rowsB = computed(() => payloadB.value?.rankings?.[String(activeType.value)]?.rows || []);
const leaderA = computed(() => rowsA.value[0] || { name: '暂无数据', score: 0 });
const leaderB = computed(() => rowsB.value[0] || { name: '暂无数据', score: 0 });
const activeRankingLabel = computed(() => rankingTypes.find(item => item.type === activeType.value)?.label || '排行榜');
const availableRankingTypes = computed(() => rankingTypes.filter(item => (
  payloadA.value?.rankings?.[String(item.type)] && payloadB.value?.rankings?.[String(item.type)]
)));
const leaderWinner = computed(() => {
  const a = Number(leaderA.value.score || 0);
  const b = Number(leaderB.value.score || 0);
  return a === b ? 'tie' : a > b ? 'a' : 'b';
});
const leaderWinnerText = computed(() => leaderWinner.value === 'tie'
  ? '双方榜首持平'
  : `${leaderWinner.value === 'a' ? serverA.value : serverB.value} 区榜首领先`);
const pairedRows = computed(() => Array.from(
  { length: Math.max(rowsA.value.length, rowsB.value.length) },
  (_, index) => ({ rank: index + 1, a: rowsA.value[index], b: rowsB.value[index] })
));
const statusText = computed(() => payloadA.value && payloadB.value
  ? `${serverA.value} 区 vs ${serverB.value} 区`
  : '选择第二个区服后自动比对');
const serverRangeOptions = computed(() => {
  const maxServer = Math.max(...serverIds.value.map(Number), 0);
  const starts = [1];
  for (let start = 100; start <= Math.max(500, maxServer); start += 100) starts.push(start);
  return starts.map((start, index) => ({
    start,
    shortLabel: start === 1 ? '1–99' : index === starts.length - 1 ? `${start}+` : `${start}`
  }));
});
const filteredServersA = computed(() => filterServersByRange(rangeA.value));
const filteredServersB = computed(() => filterServersByRange(rangeB.value));

function getAllianceText(row) {
  if (!row?.alliance_name) return '暂无联盟';
  if (row.alliance_abbr && row.alliance_abbr === row.alliance_name) return `[${row.alliance_abbr}]`;
  return `${row.alliance_abbr ? `[${row.alliance_abbr}] ` : ''}${row.alliance_name}`;
}

function formatScore(value) {
  const score = Number(value || 0);
  if (activeType.value === 5) return `Lv.${score}`;
  return score.toLocaleString('zh-CN');
}

function resetRankingScroll() {
  nextTick(() => {
    if (tableRowsRef.value) tableRowsRef.value.scrollTop = 0;
  });
}

function selectRankingType(type) {
  activeType.value = type;
  resetRankingScroll();
}

function filterServersByRange(start) {
  return serverIds.value.filter(server => {
    const value = Number(server);
    return start === 1 ? value >= 1 && value < 100 : value >= start && value < start + 100;
  });
}

function selectRange(side, start) {
  if (side === 'a') {
    rangeA.value = start;
    serverA.value = '';
  } else {
    rangeB.value = start;
    serverB.value = '';
  }
  payloadA.value = null;
  payloadB.value = null;
  errorMessage.value = '';
}

async function compareIfReady() {
  errorMessage.value = '';
  if (!serverA.value || !serverB.value) return;
  if (serverA.value === serverB.value) {
    errorMessage.value = '请选择两个不同的区服';
    return;
  }
  loading.value = true;
  try {
    [payloadA.value, payloadB.value] = await Promise.all([
      fetchServerRanking(serverA.value),
      fetchServerRanking(serverB.value)
    ]);
    activeType.value = availableRankingTypes.value[0]?.type || 8;
    resetRankingScroll();
  } catch (error) {
    payloadA.value = null;
    payloadB.value = null;
    errorMessage.value = error?.message || '区服排行榜读取失败';
  } finally {
    loading.value = false;
  }
}

async function readManualFile(side, event) {
  const file = event.target.files?.[0];
  if (!file) return;
  errorMessage.value = '';
  try {
    const payload = JSON.parse(await file.text());
    if (!payload?.rankings || typeof payload.rankings !== 'object') throw new Error('JSON 中缺少 rankings 榜单数据');
    if (side === 'a') {
      manualPayloadA.value = payload;
      manualFileNameA.value = file.name;
    } else {
      manualPayloadB.value = payload;
      manualFileNameB.value = file.name;
    }
  } catch (error) {
    errorMessage.value = `${side.toUpperCase()} 区文件读取失败：${error?.message || 'JSON 格式错误'}`;
  }
}

function applyManualComparison() {
  if (!manualPayloadA.value || !manualPayloadB.value) return;
  payloadA.value = manualPayloadA.value;
  payloadB.value = manualPayloadB.value;
  serverA.value = String(manualPayloadA.value.kid || 'A');
  serverB.value = String(manualPayloadB.value.kid || 'B');
  activeType.value = availableRankingTypes.value[0]?.type || 3;
  resetRankingScroll();
  showManualUpload.value = false;
  errorMessage.value = '';
}

onMounted(async () => {
  loading.value = true;
  try {
    serverIds.value = await fetchServerIds();
    if (!serverIds.value.includes(406) || !serverIds.value.includes(398)) {
      serverA.value = String(serverIds.value[0] || '');
      serverB.value = String(serverIds.value[1] || '');
      rangeA.value = Number(serverA.value) < 100 ? 1 : Math.floor(Number(serverA.value) / 100) * 100;
      rangeB.value = Number(serverB.value) < 100 ? 1 : Math.floor(Number(serverB.value) / 100) * 100;
    }
    await compareIfReady();
  } catch (error) {
    errorMessage.value = error?.message || '区服目录读取失败';
    loading.value = false;
  }
});
</script>

<style scoped>
.power-comparison-page { box-sizing: border-box; min-height: 100%; height: 100%; overflow: auto; padding: 28px clamp(20px, 4vw, 64px) 48px; color: #263321; background: linear-gradient(145deg, #f9f1e5, #eef4e9 50%, #edf1f8); }
.comparison-page-head { display: flex; align-items: center; gap: 22px; }
.comparison-page-head button { border: 1px solid rgba(67,80,58,.2); border-radius: 999px; padding: 9px 14px; color: #33402e; background: rgba(255,250,240,.9); font-weight: 900; cursor: pointer; }
.comparison-page-head span { color: #96701e; font-size: 11px; font-weight: 900; letter-spacing: .14em; }
.comparison-page-head h1 { margin: 4px 0 0; font-size: 34px; }
.comparison-page-head p { margin: 6px 0 0; color: rgba(38,51,33,.62); font-size: 13px; }
.comparison-control-card { display: grid; grid-template-columns: minmax(220px,1fr) auto minmax(220px,1fr) auto; gap: 16px; align-items: end; margin-top: 22px; border: 1px solid rgba(67,80,58,.16); border-radius: 12px; padding: 16px; background: rgba(255,253,248,.9); box-shadow: 0 14px 34px rgba(35,45,28,.1); }
.comparison-control-card label span { display: block; margin-bottom: 7px; color: #5a654a; font-size: 12px; font-weight: 900; }
.comparison-range-tabs { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
.comparison-range-tabs button { border: 1px solid rgba(67,80,58,.16); border-radius: 999px; padding: 4px 8px; color: #657050; background: #f1e9d8; font-size: 10px; font-weight: 900; cursor: pointer; }
.comparison-range-tabs button.active { border-color: #697b4d; color: #fff; background: #697b4d; }
.comparison-control-card select { box-sizing: border-box; width: 100%; height: 42px; border: 1px solid rgba(67,80,58,.24); border-radius: 8px; padding: 0 11px; color: #263321; background: #fffdf8; }
.comparison-control-card > b { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 50%; color: #fff8df; background: #973a32; font-size: 11px; }
.comparison-control-card > em { align-self: center; color: #657450; font-size: 12px; font-style: normal; font-weight: 900; white-space: nowrap; }
.manual-upload { display: grid; justify-items: end; margin-top: 12px; }
.manual-upload__toggle { border: 1px solid rgba(150,112,30,.25); border-radius: 9px; padding: 9px 14px; color: #5f4919; background: #fff4d3; font-weight: 900; cursor: pointer; }
.manual-upload__panel { box-sizing: border-box; display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: end; width: 100%; margin-top: 10px; border: 1px solid rgba(150,112,30,.18); border-radius: 12px; padding: 14px; background: rgba(255,253,248,.9); }
.manual-upload__panel label { display: grid; gap: 6px; min-width: 0; }
.manual-upload__panel label > span { color: #5a654a; font-size: 12px; font-weight: 900; }
.manual-upload__panel input { width: 100%; }
.manual-upload__panel small { overflow: hidden; color: rgba(38,51,33,.58); text-overflow: ellipsis; white-space: nowrap; }
.manual-upload__panel > button { height: 38px; border: 0; border-radius: 9px; padding: 0 15px; color: #2b230d; background: linear-gradient(135deg, #ffe487, #e5a51e); font-weight: 900; cursor: pointer; }
.manual-upload__panel > button:disabled { cursor: not-allowed; opacity: .45; }
.comparison-page-error { border-radius: 8px; padding: 14px; color: #9f1d1d; background: #ffe6df; text-align: center; }
.ranking-tabs { display: flex; min-height: 36px; justify-content: center; align-items: center; gap: 8px; margin-top: 18px; overflow: visible; padding: 2px 0; }
.ranking-tabs button { flex: 0 0 auto; border: 1px solid rgba(67,80,58,.16); border-radius: 999px; padding: 8px 13px; color: #566249; background: rgba(255,253,248,.82); font-size: 12px; font-weight: 900; cursor: pointer; }
.ranking-tabs button.active { border-color: #697b4d; color: #fff; background: #697b4d; }
.leader-summary { display: grid; grid-template-columns: 1fr minmax(180px,.55fr) 1fr; gap: 14px; margin-top: 14px; }
.leader-summary article, .leader-summary > div { display: grid; gap: 4px; border: 1px solid rgba(67,80,58,.14); border-radius: 10px; padding: 14px; background: rgba(255,253,248,.84); }
.leader-summary article:last-child { text-align: right; }
.leader-summary article.winner { border-color: rgba(177,55,45,.35); background: linear-gradient(135deg,#fff0e9,#fff9e9); }
.leader-summary small, .leader-summary span { color: rgba(38,51,33,.58); font-size: 10px; }
.leader-summary article > strong { font-size: 15px; }
.leader-summary article > b { color: #956b1c; font-size: 18px; }
.leader-summary > div { place-content: center; text-align: center; background: rgba(235,228,211,.75); }
.leader-summary > div > span { color: #96701e; font-weight: 900; }
.comparison-table { margin-top: 14px; overflow: hidden; border: 1px solid rgba(67,80,58,.16); border-radius: 12px; background: rgba(255,253,248,.9); box-shadow: 0 18px 44px rgba(35,45,28,.12); }
.comparison-table > header { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px; background: #ece5d6; }
.comparison-table > header div { display: grid; grid-template-columns: 30px 1fr auto; gap: 9px; align-items: center; }
.comparison-table > header div:last-child { grid-template-columns: auto minmax(0,1fr) 30px; text-align: right; }
.comparison-table > header div:last-child > span { order: 1; }
.comparison-table > header div:last-child > strong { order: 2; }
.comparison-table > header b { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 7px; color: white; background: #3477a1; }
.comparison-table > header div:last-child b { order: 3; background: #b65c3c; }
.comparison-table > header span { color: rgba(38,51,33,.58); font-size: 11px; }
.comparison-table__rows { max-height: calc(100vh - 390px); min-height: 340px; overflow-y: auto; padding: 8px; }
.comparison-rank-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.comparison-rank-pair article { display: grid; grid-template-columns: 34px minmax(0,1fr) auto; gap: 9px; align-items: center; min-height: 48px; border-bottom: 1px solid rgba(67,80,58,.09); padding: 7px 9px; }
.comparison-rank-pair article:nth-child(2) { grid-template-columns: auto minmax(0,1fr) 34px; text-align: right; }
.comparison-rank-pair article:nth-child(2) > b { order: 3; }
.comparison-rank-pair article > b { color: #657450; font-size: 11px; text-align: center; }
.comparison-rank-pair article > div { display: grid; min-width: 0; gap: 2px; }
.comparison-rank-pair article strong, .comparison-rank-pair article small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.comparison-rank-pair article strong { font-size: 12px; }
.comparison-rank-pair article small { color: rgba(38,51,33,.52); font-size: 9px; }
.comparison-rank-pair article > span { color: #8b671d; font-size: 12px; font-weight: 900; font-variant-numeric: tabular-nums; }
.comparison-rank-pair article.empty { opacity: .42; }
.comparison-page-empty { display: grid; min-height: 360px; place-content: center; margin-top: 18px; border: 1px dashed rgba(67,80,58,.25); border-radius: 12px; color: rgba(38,51,33,.55); text-align: center; }
.comparison-page-empty strong { font-size: 20px; }
.comparison-page-empty p { margin: 8px 0 0; }
@media (max-width: 760px) {
  .power-comparison-page { padding: 16px 10px 30px; }
  .comparison-page-head { align-items: flex-start; gap: 10px; }
  .comparison-page-head button { flex: 0 0 auto; padding: 7px 10px; font-size: 11px; }
  .comparison-page-head h1 { font-size: 25px; }
  .comparison-page-head p { font-size: 11px; }
  .comparison-control-card { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 14px; padding: 10px; }
  .comparison-control-card > label { min-width: 0; }
  .comparison-control-card select { min-width: 0; padding: 0 7px; }
  .comparison-range-tabs { gap: 3px; }
  .comparison-range-tabs button { padding: 4px 6px; font-size: 9px; }
  .comparison-control-card > b { display: none; }
  .comparison-control-card > em { grid-column: 1 / -1; text-align: center; white-space: normal; }
  .manual-upload__panel { grid-template-columns: 1fr; }
  .manual-upload__panel > button { width: 100%; }
  .ranking-tabs { margin-top: 12px; }
  .ranking-tabs { justify-content: flex-start; overflow-x: auto; overflow-y: hidden; }
  .ranking-tabs button { padding: 7px 10px; font-size: 11px; }
  .leader-summary { display: none; }
  .comparison-table { margin-top: 10px; border-radius: 9px; }
  .comparison-table > header { gap: 6px; padding: 9px 7px; }
  .comparison-table > header div {
    grid-template-columns: 26px minmax(0, 1fr);
    gap: 3px 7px;
    text-align: left;
  }
  .comparison-table > header div:last-child {
    grid-template-columns: minmax(0, 1fr) 26px;
    text-align: right;
  }
  .comparison-table > header div:last-child b { order: 2; }
  .comparison-table > header div:last-child strong { order: 1; }
  .comparison-table > header b { width: 26px; height: 26px; }
  .comparison-table > header strong {
    min-width: 0;
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .comparison-table > header span {
    grid-column: 2;
    font-size: 9px;
  }
  .comparison-table > header div:last-child span {
    grid-column: 1;
    order: 3;
  }
  .comparison-table__rows { min-height: 300px; max-height: calc(100vh - 330px); padding: 4px; }
  .comparison-rank-pair { gap: 3px; }
  .comparison-rank-pair article { grid-template-columns: 24px minmax(0,1fr); gap: 4px; min-height: 52px; padding: 6px 4px; }
  .comparison-rank-pair article > span { grid-column: 2; font-size: 10px; }
  .comparison-rank-pair article:nth-child(2) { grid-template-columns: minmax(0,1fr) 24px; }
  .comparison-rank-pair article:nth-child(2) > span { grid-column: 1; }
  .comparison-rank-pair article strong { font-size: 11px; }
  .comparison-rank-pair article small { font-size: 8px; }
}
</style>
