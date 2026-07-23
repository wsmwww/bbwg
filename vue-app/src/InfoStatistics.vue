<template>
  <main class="info-page">
    <header class="info-header">
      <button class="back-button" type="button" @click="$emit('back-to-series')">返回地图系列</button>
      <div>
        <span>INFO STATISTICS</span>
        <h1>信息统计</h1>
        <p>用于统计盟友报名信息、在线时间、语音、钻石储备、兵力和分工意愿。</p>
      </div>
      <button class="primary-fill-button" type="button" @click="openRegistrationForm">
        填写盟友信息
      </button>
    </header>

    <section class="info-layout">
      <aside class="map-preview-card">
        <div class="map-preview-card__head">
          <span>MAP MODE</span>
          <strong>王城网格</strong>
          <small>填写完成后，可进入王城网格布局查看基础地图，不会覆盖地图模块的成员数据。</small>
        </div>
        <div class="castle-map" aria-label="王城网格">
          <i v-for="item in 225" :key="item"></i>
          <div class="castle-building" aria-hidden="true">
            <b></b>
            <span></span>
            <em></em>
          </div>
        </div>
        <div class="stats-strip">
          <article>
            <small>填报人数</small>
            <strong>{{ rows.length }}</strong>
          </article>
          <article>
            <small>可语音</small>
            <strong>{{ voiceCount }}</strong>
          </article>
          <article>
            <small>高钻储备</small>
            <strong>{{ highDiamondCount }}</strong>
          </article>
        </div>
        <button class="map-preview-card__action" type="button" @click="openCastleLayout">
          进入王城布局
        </button>
      </aside>

      <section class="form-card">
        <div class="form-card__head">
          <div>
            <span>REGISTRATION LIST</span>
            <h2>盟友信息列表</h2>
          </div>
          <div class="form-actions">
            <label class="search-box">
              <span>搜索</span>
              <input v-model.trim="keyword" placeholder="输入昵称 / 分工 / 备注" />
            </label>
            <button type="button" @click="openRegistrationForm">填写信息</button>
            <button type="button" @click="saveRows">保存</button>
            <label class="export-box">
              <span>导出</span>
              <select @change="handleExportChange">
                <option value="">选择格式</option>
                <option value="xlsx">Excel 表格</option>
                <option value="word">Word 文档</option>
                <option value="csv">CSV 文件</option>
              </select>
            </label>
            <button type="button" @click="resetRows">清空</button>
          </div>
        </div>

        <div class="summary-grid">
          <article>
            <small>平均城堡</small>
            <strong>{{ averageCastleLevel }}</strong>
          </article>
          <article>
            <small>长期在线</small>
            <strong>{{ longOnlineCount }}</strong>
          </article>
          <article>
            <small>愿意消耗</small>
            <strong>{{ willingCostCount }}</strong>
          </article>
          <article>
            <small>主要车头</small>
            <strong>{{ leaderCount }}</strong>
          </article>
        </div>

        <div v-if="!filteredRows.length" class="empty-state">
          <strong>{{ rows.length ? '没有匹配的成员' : '还没有盟友填写信息' }}</strong>
          <p>{{ rows.length ? '换个关键词试试。' : '点击上方“填写盟友信息”，提交后会自动新增到这里。' }}</p>
          <button v-if="!rows.length" type="button" @click="openRegistrationForm">立即填写</button>
        </div>

        <div v-else class="member-list">
          <article v-for="row in filteredRows" :key="row.id" class="member-card">
            <div class="member-card__rank">{{ getRowIndex(row) }}</div>
            <div class="member-card__main">
              <div class="member-card__title">
                <strong>{{ row.name || '未填写昵称' }}</strong>
                <span>{{ row.voice }}</span>
              </div>
              <div class="member-card__meta">
                <span>在线：{{ row.onlineTime || '-' }}</span>
                <span>城堡：{{ row.castleLevel || '-' }}</span>
                <span>兵力：{{ row.troops || 0 }}</span>
                <span>钻石：{{ row.diamonds || 0 }}</span>
                <span>戈登：{{ row.gordonDefenseLevel || 0 }}级</span>
                <span>琴科：{{ row.qinkeRallyLevel || 0 }}级</span>
              </div>
              <p>{{ row.preference || '暂未填写分工意愿' }}</p>
              <small v-if="row.remark">{{ row.remark }}</small>
            </div>
            <div class="member-card__actions">
              <button type="button" @click="editRow(row)">编辑</button>
              <button class="row-delete" type="button" @click="removeRow(row.id)">删除</button>
            </div>
          </article>
        </div>
      </section>
    </section>

    <div v-if="isFormOpen" class="info-modal" role="dialog" aria-modal="true" aria-labelledby="infoFormTitle">
      <form class="info-modal__panel" @submit.prevent="submitRegistrationForm">
        <div class="info-modal__head">
          <div>
            <span>MEMBER FORM</span>
            <h2 id="infoFormTitle">{{ editingId ? '编辑盟友信息' : '填写盟友信息' }}</h2>
          </div>
          <button type="button" aria-label="关闭" @click="closeRegistrationForm">×</button>
        </div>

        <div class="info-form-grid">
          <label>
            <span>盟友昵称</span>
            <input v-model.trim="formState.name" required placeholder="请输入游戏昵称" />
          </label>
          <label>
            <span>可参战时间</span>
            <input v-model.trim="formState.onlineTime" placeholder="例如：20:00-23:00" />
          </label>
          <label>
            <span>语音情况</span>
            <select v-model="formState.voice">
              <option>可语音</option>
              <option>只听不说</option>
              <option>不可语音</option>
            </select>
          </label>
          <label>
            <span>钻石储备</span>
            <input v-model.number="formState.diamonds" type="number" min="0" placeholder="例如：100000" />
          </label>
          <label>
            <span>愿意消耗</span>
            <select v-model="formState.willingCost">
              <option>愿意</option>
              <option>一般</option>
              <option>不方便</option>
            </select>
          </label>
          <label>
            <span>城堡等级</span>
            <input v-model.number="formState.castleLevel" type="number" min="1" placeholder="例如：35" />
          </label>
          <label>
            <span>兵力</span>
            <input v-model.number="formState.troops" type="number" min="0" placeholder="例如：2000000" />
          </label>
          <label>
            <span>分工意愿</span>
            <input v-model.trim="formState.preference" placeholder="集结 / 驻防 / 铺路 / 补位" />
          </label>
          <label>
            <span>戈登驻防技能等级</span>
            <input v-model.number="formState.gordonDefenseLevel" type="number" min="0" max="10" placeholder="例如：5" />
          </label>
          <label>
            <span>琴科集结技能等级</span>
            <input v-model.number="formState.qinkeRallyLevel" type="number" min="0" max="10" placeholder="例如：5" />
          </label>
          <label class="info-form-grid__wide">
            <span>备注</span>
            <textarea v-model.trim="formState.remark" rows="3" placeholder="技巧、月卡、车头、特殊说明等"></textarea>
          </label>
        </div>

        <div class="info-modal__footer">
          <button type="button" @click="closeRegistrationForm">取消</button>
          <button type="submit">{{ editingId ? '保存修改' : '提交信息' }}</button>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import * as XLSX from 'xlsx';
import {
  clearInfoRegistrations,
  createInfoRegistration,
  deleteInfoRegistration,
  getInfoRegistrations,
  replaceInfoRegistrations,
  updateInfoRegistration
} from './info-statistics-service';

const emit = defineEmits(['back-to-series', 'open-castle-layout']);

const STORAGE_KEY = 'benben-info-statistics-rows';
const rows = ref([]);
const keyword = ref('');
const isFormOpen = ref(false);
const editingId = ref('');
const formState = ref(createRow());
const isApiOnline = ref(false);

function createRow(member = {}) {
  return {
    id: member.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: member.name || '',
    onlineTime: member.onlineTime || '',
    voice: member.voice || '可语音',
    diamonds: member.diamonds ?? '',
    willingCost: member.willingCost || '愿意',
    castleLevel: member.castleLevel ?? '',
    troops: member.troops ?? '',
    preference: member.preference || '',
    gordonDefenseLevel: member.gordonDefenseLevel ?? '',
    qinkeRallyLevel: member.qinkeRallyLevel ?? '',
    remark: member.remark || ''
  };
}

function loadLocalRows() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    rows.value = Array.isArray(saved) ? saved : [];
  } catch {
    rows.value = [];
  }
}

async function loadRows() {
  try {
    const data = await getInfoRegistrations();
    rows.value = Array.isArray(data) ? data : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.value));
    isApiOnline.value = true;
  } catch (error) {
    console.warn('信息统计接口不可用，已使用本地缓存。', error);
    isApiOnline.value = false;
    loadLocalRows();
  }
}

async function saveRows() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.value));
  try {
    const data = await replaceInfoRegistrations(rows.value);
    rows.value = Array.isArray(data) ? data : rows.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.value));
    isApiOnline.value = true;
  } catch (error) {
    console.warn('保存到接口失败，已保留本地缓存。', error);
    isApiOnline.value = false;
  }
}

function openRegistrationForm() {
  editingId.value = '';
  formState.value = createRow();
  isFormOpen.value = true;
}

function editRow(row) {
  editingId.value = row.id;
  formState.value = createRow({ ...row });
  isFormOpen.value = true;
}

function closeRegistrationForm() {
  isFormOpen.value = false;
  editingId.value = '';
}

async function submitRegistrationForm() {
  const payload = createRow({
    ...formState.value,
    id: editingId.value || formState.value.id
  });

  try {
    const saved = editingId.value
      ? await updateInfoRegistration(editingId.value, payload)
      : await createInfoRegistration(payload);

    if (editingId.value) {
      rows.value = rows.value.map(row => (row.id === editingId.value ? saved : row));
    } else {
      rows.value = [saved, ...rows.value];
    }
    isApiOnline.value = true;
  } catch (error) {
    console.warn('提交到接口失败，已保存到本地缓存。', error);
    if (editingId.value) {
      rows.value = rows.value.map(row => (row.id === editingId.value ? payload : row));
    } else {
      rows.value = [payload, ...rows.value];
    }
    isApiOnline.value = false;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.value));
  closeRegistrationForm();
}

async function removeRow(id) {
  const previousRows = rows.value;
  rows.value = rows.value.filter(row => row.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.value));
  try {
    await deleteInfoRegistration(id);
    isApiOnline.value = true;
  } catch (error) {
    console.warn('接口删除失败，当前仅删除了本地缓存。', error);
    isApiOnline.value = false;
    rows.value = rows.value.length === previousRows.length ? rows.value : rows.value;
  }
}

async function resetRows() {
  if (!window.confirm('确定清空当前填写的盟友信息吗？')) return;
  rows.value = [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.value));
  try {
    await clearInfoRegistrations();
    isApiOnline.value = true;
  } catch (error) {
    console.warn('接口清空失败，当前仅清空了本地缓存。', error);
    isApiOnline.value = false;
  }
}

async function openCastleLayout() {
  await saveRows();
  emit('open-castle-layout');
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

const exportHeaders = ['盟友', '参战时间', '语音', '钻石', '愿意消耗', '城堡', '兵力', '分工意愿', '戈登驻防技能等级', '琴科集结技能等级', '备注'];

function getExportRows() {
  return filteredRows.value.map(row => [
    row.name,
    row.onlineTime,
    row.voice,
    row.diamonds,
    row.willingCost,
    row.castleLevel,
    row.troops,
    row.preference,
    row.gordonDefenseLevel,
    row.qinkeRallyLevel,
    row.remark
  ]);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const body = getExportRows().map(row => row.map(csvCell).join(','));
  const csv = `\ufeff${exportHeaders.map(csvCell).join(',')}\n${body.join('\n')}`;
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `信息统计-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportXlsx() {
  const worksheet = XLSX.utils.aoa_to_sheet([exportHeaders, ...getExportRows()]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '信息统计');
  XLSX.writeFile(workbook, `信息统计-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportWord() {
  const rowsHtml = getExportRows()
    .map(row => `<tr>${row.map(value => `<td>${String(value ?? '').replace(/[<>&]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char]))}</td>`).join('')}</tr>`)
    .join('');
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: "Microsoft YaHei", Arial, sans-serif; }
          h1 { color: #263420; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d8c8a8; padding: 8px; font-size: 12px; }
          th { background: #f1dfb8; }
        </style>
      </head>
      <body>
        <h1>信息统计</h1>
        <table>
          <thead><tr>${exportHeaders.map(header => `<th>${header}</th>`).join('')}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `;
  downloadBlob(new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8;' }), `信息统计-${new Date().toISOString().slice(0, 10)}.doc`);
}

function handleExportChange(event) {
  const type = event.target.value;
  if (type === 'csv') exportCsv();
  if (type === 'xlsx') exportXlsx();
  if (type === 'word') exportWord();
  event.target.value = '';
}

function getRowIndex(row) {
  return String(rows.value.findIndex(item => item.id === row.id) + 1).padStart(2, '0');
}

const filteredRows = computed(() => {
  const q = keyword.value.toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter(row => [
    row.name,
    row.onlineTime,
    row.voice,
    row.willingCost,
    row.preference,
    row.gordonDefenseLevel,
    row.qinkeRallyLevel,
    row.remark
  ].some(value => String(value || '').toLowerCase().includes(q)));
});

const voiceCount = computed(() => rows.value.filter(row => row.voice === '可语音').length);
const highDiamondCount = computed(() => rows.value.filter(row => Number(row.diamonds) >= 100000).length);
const longOnlineCount = computed(() => rows.value.filter(row => String(row.onlineTime).includes('-')).length);
const willingCostCount = computed(() => rows.value.filter(row => row.willingCost === '愿意').length);
const leaderCount = computed(() => rows.value.filter(row => String(row.remark).includes('车头')).length);
const averageCastleLevel = computed(() => {
  const levels = rows.value.map(row => Number(row.castleLevel)).filter(Boolean);
  if (!levels.length) return '-';
  return Math.round(levels.reduce((sum, item) => sum + item, 0) / levels.length);
});

onMounted(loadRows);
</script>

<style scoped>
.info-page {
  min-height: 100%;
  overflow: auto;
  padding: 28px clamp(18px, 4vw, 54px);
  color: #293523;
  background:
    radial-gradient(circle at 82% 8%, rgba(243, 192, 77, 0.22), transparent 30%),
    radial-gradient(circle at 12% 92%, rgba(120, 145, 94, 0.18), transparent 34%),
    linear-gradient(135deg, #fff8ed, #eef3e8);
}

.info-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  margin-bottom: 22px;
}

.back-button,
.form-actions button,
.row-delete,
.primary-fill-button,
.empty-state button,
.info-modal__footer button,
.member-card__actions button {
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  color: #4b3b17;
  background: linear-gradient(135deg, #ffe58e, #e2a11d);
  font-weight: 900;
  cursor: pointer;
}

.primary-fill-button {
  min-width: 180px;
  padding: 14px 22px;
  color: #fff9df;
  background: linear-gradient(135deg, #d89a19, #9b5e0f);
  box-shadow: 0 16px 32px rgba(140, 84, 16, 0.28);
  font-size: 16px;
}

.primary-fill-button:hover,
.map-preview-card__action:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 34px rgba(169, 112, 23, 0.3);
}

.info-header span,
.form-card__head span,
.map-preview-card__head span,
.info-modal__head span {
  color: #b98923;
  font-size: 11px;
  font-weight: 1000;
  letter-spacing: 0.12em;
}

.info-header h1,
.form-card__head h2,
.info-modal__head h2 {
  margin: 4px 0;
  font-size: 34px;
}

.info-header p,
.map-preview-card__head small {
  margin: 0;
  color: rgba(41, 53, 35, 0.68);
}

.info-layout {
  display: grid;
  grid-template-columns: minmax(310px, 390px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.map-preview-card,
.form-card {
  border: 1px solid rgba(67, 80, 58, 0.14);
  border-radius: 8px;
  background: rgba(255, 251, 242, 0.92);
  box-shadow: 0 18px 42px rgba(35, 45, 28, 0.14);
}

.map-preview-card,
.form-card {
  padding: 18px;
}

.map-preview-card__head {
  display: grid;
  gap: 5px;
  margin-bottom: 14px;
}

.map-preview-card__head strong {
  font-size: 24px;
}

.castle-map {
  position: relative;
  display: grid;
  grid-template-columns: repeat(15, 1fr);
  gap: 2px;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 8px;
  padding: 12px;
  background:
    linear-gradient(45deg, rgba(255, 255, 255, 0.45) 25%, transparent 25% 75%, rgba(255, 255, 255, 0.45) 75%),
    linear-gradient(45deg, rgba(255, 255, 255, 0.35) 25%, transparent 25% 75%, rgba(255, 255, 255, 0.35) 75%),
    linear-gradient(135deg, #8da773, #627b4d);
  background-position: 0 0, 8px 8px, 0 0;
  background-size: 16px 16px, 16px 16px, auto;
}

.castle-map i {
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.04);
}

.castle-building {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 92px;
  height: 92px;
  transform: translate(-50%, -50%) rotate(45deg);
  filter: drop-shadow(0 18px 24px rgba(43, 34, 18, 0.36));
}

.castle-building b,
.castle-building span,
.castle-building em {
  position: absolute;
  display: block;
  border: 3px solid #f7d76f;
  background: linear-gradient(135deg, #83542a, #c88d34);
}

.castle-building b {
  inset: 12px;
  border-radius: 16px;
}

.castle-building span {
  left: 50%;
  top: 0;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  transform: translateX(-50%);
}

.castle-building em {
  left: 50%;
  bottom: 0;
  width: 34px;
  height: 22px;
  border-radius: 8px;
  transform: translateX(-50%);
}

.castle-building::after {
  content: "王";
  position: absolute;
  left: 50%;
  top: 50%;
  color: #fff7d5;
  font-size: 28px;
  font-style: normal;
  font-weight: 1000;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.32);
  transform: translate(-50%, -50%) rotate(-45deg);
}

.stats-strip,
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 14px;
}

.summary-grid {
  grid-template-columns: repeat(4, 1fr);
  margin: 0 0 16px;
}

.stats-strip article,
.summary-grid article {
  border-radius: 8px;
  padding: 12px;
  background: rgba(239, 229, 209, 0.5);
}

.stats-strip small,
.summary-grid small {
  display: block;
  color: rgba(41, 53, 35, 0.58);
  font-size: 11px;
  font-weight: 900;
}

.stats-strip strong,
.summary-grid strong {
  display: block;
  margin-top: 5px;
  color: #8a681f;
  font-size: 24px;
}

.map-preview-card__action {
  width: 100%;
  margin-top: 14px;
  border: 0;
  border-radius: 8px;
  padding: 13px 16px;
  color: #49370f;
  background: linear-gradient(135deg, #ffe897, #e6a321);
  box-shadow: 0 12px 24px rgba(169, 112, 23, 0.22);
  font-weight: 1000;
  cursor: pointer;
}

.form-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
  border: 1px solid rgba(185, 137, 35, 0.16);
  border-radius: 8px;
  padding: 8px;
  background: linear-gradient(135deg, rgba(255, 252, 244, 0.92), rgba(244, 232, 204, 0.54));
}

.search-box,
.export-box {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 330px;
  height: 42px;
  border: 1px solid rgba(185, 137, 35, 0.22);
  border-radius: 8px;
  padding: 0 12px;
  background: rgba(255, 253, 248, 0.94);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.export-box {
  min-width: 158px;
}

.search-box span,
.export-box span {
  color: #7b6427;
  font-size: 12px;
  font-weight: 1000;
  white-space: nowrap;
}

input,
select,
textarea {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid rgba(67, 80, 58, 0.18);
  border-radius: 7px;
  padding: 0 9px;
  color: #293523;
  background: #fffdf8;
  font: inherit;
}

input,
select {
  height: 36px;
}

textarea {
  padding: 10px;
  resize: vertical;
}

.search-box input,
.export-box select {
  border: 0;
  padding: 0;
  background: transparent;
}

.export-box select {
  height: 100%;
  color: #4b3b17;
  font-weight: 900;
  cursor: pointer;
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 280px;
  border: 1px dashed rgba(185, 137, 35, 0.36);
  border-radius: 8px;
  background: rgba(255, 253, 248, 0.76);
  text-align: center;
}

.empty-state strong {
  font-size: 20px;
}

.empty-state p {
  margin: 8px 0 16px;
  color: rgba(41, 53, 35, 0.62);
}

.member-list {
  display: grid;
  gap: 12px;
  max-height: 62vh;
  overflow: auto;
  padding-right: 4px;
}

.member-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border: 1px solid rgba(185, 137, 35, 0.22);
  border-radius: 8px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(255, 251, 242, 0.94), rgba(255, 245, 223, 0.72));
}

.member-card__rank {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  color: #fff6d7;
  background: linear-gradient(135deg, #c58a1b, #7d4c12);
  font-weight: 1000;
}

.member-card__title,
.member-card__meta,
.member-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.member-card__title strong {
  font-size: 18px;
}

.member-card__title span,
.member-card__meta span,
.member-card small {
  border-radius: 999px;
  padding: 4px 9px;
  background: rgba(239, 229, 209, 0.76);
  color: #5f4a21;
  font-size: 12px;
  font-weight: 800;
}

.member-card p {
  margin: 7px 0 0;
  color: rgba(41, 53, 35, 0.72);
}

.row-delete {
  color: #fff7ed;
  background: #9f4138;
}

.info-modal {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(14, 18, 12, 0.54);
  backdrop-filter: blur(8px);
}

.info-modal__panel {
  width: min(760px, 100%);
  max-height: 92vh;
  overflow: auto;
  border: 1px solid rgba(255, 220, 139, 0.45);
  border-radius: 8px;
  padding: 22px;
  background:
    radial-gradient(circle at 85% 8%, rgba(246, 193, 72, 0.2), transparent 30%),
    linear-gradient(135deg, #fffaf0, #f4ead5);
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.36);
}

.info-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.info-modal__head button {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  color: #4b3b17;
  background: #efe0bd;
  font-size: 24px;
  font-weight: 900;
  cursor: pointer;
}

.info-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.info-form-grid label {
  display: grid;
  gap: 7px;
  color: #536044;
  font-size: 13px;
  font-weight: 900;
}

.info-form-grid__wide {
  grid-column: 1 / -1;
}

.info-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.info-modal__footer button:first-child {
  background: #efe0bd;
}

@media (max-width: 1100px) {
  .info-layout,
  .summary-grid,
  .info-header {
    grid-template-columns: 1fr;
  }

  .info-header,
  .form-card__head {
    align-items: stretch;
    flex-direction: column;
  }

  .form-actions {
    justify-content: flex-start;
  }

  .member-card {
    grid-template-columns: 1fr;
  }

  .info-form-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .map-preview-card {
    display: none;
  }
}
</style>
