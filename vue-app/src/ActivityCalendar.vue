<template>
  <main class="activity-page">
    <header class="activity-header">
      <button class="back-button" type="button" @click="$emit('back-to-series')">返回地图系列</button>
      <div class="activity-title">
        <span>ACTIVITY CALENDAR</span>
        <h1>活动日历</h1>
        <p>活动会直接横跨显示在日历中，一眼看清持续时间。</p>
      </div>
      <div class="month-switcher" aria-label="月份切换">
        <button type="button" @click="changeMonth(-1)">上月</button>
        <strong>{{ currentYear }} 年 {{ currentMonth }} 月</strong>
        <button type="button" @click="changeMonth(1)">下月</button>
      </div>
    </header>

    <section class="calendar-shell">
      <div class="calendar-toolbar">
        <div>
          <span>{{ loading ? '正在读取活动...' : `本月 ${events.length} 个活动` }}</span>
          <strong>{{ calendarTitle }}</strong>
        </div>
        <button type="button" :disabled="loading" @click="loadEvents">刷新</button>
      </div>

      <p v-if="errorMessage" class="calendar-error">{{ errorMessage }}</p>

      <div class="weekday-row" aria-hidden="true">
        <span v-for="day in weekdays" :key="day">{{ day }}</span>
      </div>

      <div class="calendar-board">
        <section v-for="week in calendarWeeks" :key="week.key" class="calendar-week">
          <button
            v-for="day in week.days"
            :key="day.key"
            class="calendar-day"
            type="button"
            :class="{
              'is-muted': !day.inMonth,
              'is-today': day.isToday,
              'is-selected': day.key === selectedDateKey,
              'has-events': day.events.length
            }"
            :style="{ gridColumn: day.column }"
            @click="selectDate(day)"
          >
            <span class="calendar-day__number">{{ day.date.getDate() }}</span>
            <em v-if="day.isToday">今</em>
          </button>

          <button
            v-for="bar in week.bars"
            :key="bar.key"
            class="event-duration-bar"
            type="button"
            :class="{ 'is-start': bar.isStart, 'is-end': bar.isEnd }"
            :style="{
              '--event-color': bar.event.color || '#f3c04d',
              gridColumn: `${bar.startColumn} / ${bar.endColumn + 1}`,
              gridRow: bar.row
            }"
            :title="`${bar.event.name} ${formatRange(bar.event)}`"
            @click="selectDateByEvent(bar.event)"
          >
            <img v-if="bar.isStart && bar.event.icon" :src="bar.event.icon" alt="" loading="lazy" />
            <b v-else-if="bar.isStart">{{ bar.event.name.slice(0, 1) }}</b>
            <span>{{ bar.isStart ? bar.event.name : '' }}</span>
          </button>
        </section>
      </div>

      <section class="day-events-panel">
        <div class="day-events-panel__head">
          <div>
            <span>DAY EVENTS</span>
            <strong>{{ selectedDateLabel }}</strong>
          </div>
          <em>{{ selectedDateEvents.length ? `${selectedDateEvents.length} 个活动` : '暂无活动' }}</em>
        </div>

        <div v-if="selectedDateEvents.length" class="event-list">
          <article
            v-for="event in selectedDateEvents"
            :key="event.instanceKey"
            class="event-card"
            :style="{ '--event-color': event.color || '#f3c04d' }"
          >
            <img v-if="event.icon" :src="event.icon" alt="" loading="lazy" />
            <b v-else>{{ event.name.slice(0, 1) }}</b>
            <div>
              <strong>{{ event.name }}</strong>
              <span>{{ formatRange(event) }}</span>
            </div>
          </article>
        </div>
        <p v-else class="empty-events">这一天没有活动，换个有活动横条的日期看看。</p>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';

defineEmits(['back-to-series']);

const API_BASE = 'https://t2s.awzh.cn/api/auth/activity-events';
const today = new Date();
const currentYear = ref(today.getFullYear());
const currentMonth = ref(today.getMonth() + 1);
const selectedDateKey = ref(toDateKey(today));
const events = ref([]);
const loading = ref(false);
const errorMessage = ref('');
const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

const calendarTitle = computed(() => `${currentYear.value} 年 ${String(currentMonth.value).padStart(2, '0')} 月`);

const sortedEvents = computed(() => (
  [...events.value].sort((a, b) => a.startDate - b.startDate || a.endDate - b.endDate || a.name.localeCompare(b.name, 'zh-CN'))
));

const selectedDate = computed(() => parseDate(selectedDateKey.value));

const selectedDateLabel = computed(() => {
  const date = selectedDate.value;
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekday}`;
});

const selectedDateEvents = computed(() => {
  const date = selectedDate.value;
  return sortedEvents.value.filter(event => isDateInRange(date, event.startDate, event.endDate));
});

const calendarDays = computed(() => {
  const first = new Date(currentYear.value, currentMonth.value - 1, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dayEvents = sortedEvents.value.filter(event => isDateInRange(date, event.startDate, event.endDate));
    return {
      key: toDateKey(date),
      date,
      column: (index % 7) + 1,
      events: dayEvents,
      inMonth: date.getMonth() === currentMonth.value - 1,
      isToday: toDateKey(date) === toDateKey(today)
    };
  });
});

const calendarWeeks = computed(() => {
  const days = calendarDays.value;
  return Array.from({ length: 6 }, (_, weekIndex) => {
    const weekDays = days.slice(weekIndex * 7, weekIndex * 7 + 7);
    const weekStart = weekDays[0].date;
    const weekEnd = weekDays[6].date;
    const bars = sortedEvents.value
      .filter(event => event.endDate >= weekStart && event.startDate <= weekEnd)
      .map((event, index) => {
        const startColumn = Math.max(1, getMondayColumn(event.startDate));
        const endColumn = Math.min(7, getMondayColumn(event.endDate));
        const visibleStart = event.startDate >= weekStart ? startColumn : 1;
        const visibleEnd = event.endDate <= weekEnd ? endColumn : 7;
        return {
          event,
          key: `${weekIndex}-${event.instanceKey}`,
          startColumn: visibleStart,
          endColumn: visibleEnd,
          row: index + 2,
          isStart: event.startDate >= weekStart,
          isEnd: event.endDate <= weekEnd
        };
      });

    return {
      key: `week-${weekIndex}`,
      days: weekDays,
      bars
    };
  });
});

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getMondayColumn(date) {
  return ((date.getDay() + 6) % 7) + 1;
}

function isDateInRange(date, startDate, endDate) {
  const key = toDateKey(date);
  return key >= toDateKey(startDate) && key <= toDateKey(endDate);
}

function normalizeEvent(raw, index) {
  const startDate = parseDate(raw.start_date);
  const endDate = parseDate(raw.end_date || raw.start_date);
  return {
    id: raw.id ?? index,
    name: String(raw.name || '未命名活动').trim(),
    color: raw.color || '#f3c04d',
    icon: raw.icon_url_display || raw.icon_url || '',
    startDate,
    endDate,
    instanceKey: `${raw.id ?? index}-${raw.start_date}-${raw.end_date}-${index}`
  };
}

function formatRange(event) {
  const start = `${event.startDate.getMonth() + 1}/${event.startDate.getDate()}`;
  const end = `${event.endDate.getMonth() + 1}/${event.endDate.getDate()}`;
  return start === end ? start : `${start} - ${end}`;
}

function selectDate(day) {
  selectedDateKey.value = day.key;
}

function selectDateByEvent(event) {
  selectedDateKey.value = toDateKey(event.startDate);
}

function ensureSelectedDateInMonth() {
  const selected = parseDate(selectedDateKey.value);
  if (selected.getFullYear() !== currentYear.value || selected.getMonth() + 1 !== currentMonth.value) {
    selectedDateKey.value = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-01`;
  }
}

function changeMonth(offset) {
  const date = new Date(currentYear.value, currentMonth.value - 1 + offset, 1);
  currentYear.value = date.getFullYear();
  currentMonth.value = date.getMonth() + 1;
  ensureSelectedDateInMonth();
}

async function loadEvents() {
  loading.value = true;
  errorMessage.value = '';
  ensureSelectedDateInMonth();
  try {
    const url = `${API_BASE}?year=${currentYear.value}&month=${currentMonth.value}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (Number(payload?.code) !== 0) throw new Error(payload?.message || '活动接口返回异常');
    events.value = (payload?.data?.events || []).map(normalizeEvent);
  } catch (error) {
    console.warn('Failed to load activity events', error);
    events.value = [];
    errorMessage.value = '活动日历读取失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
}

watch([currentYear, currentMonth], loadEvents);
onMounted(loadEvents);
</script>

<style scoped>
.activity-page {
  min-height: 100%;
  height: 100%;
  overflow: auto;
  padding: 34px clamp(14px, 4vw, 48px);
  color: #263323;
  background:
    radial-gradient(circle at top right, rgba(243, 192, 77, 0.2), transparent 34%),
    linear-gradient(135deg, #fff8ee 0%, #e9f0dc 52%, #d6e1c4 100%);
}

.activity-header,
.calendar-shell {
  border: 1px solid rgba(67, 80, 58, 0.16);
  border-radius: 16px;
  background: rgba(255, 251, 242, 0.94);
  box-shadow: 0 18px 42px rgba(35, 45, 28, 0.14);
  backdrop-filter: blur(12px);
}

.activity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
  padding: 18px;
}

.activity-title {
  flex: 1;
}

.back-button,
.month-switcher button,
.calendar-toolbar button {
  border: 0;
  border-radius: 999px;
  padding: 9px 13px;
  color: #4b3b17;
  background: #f3c04d;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.calendar-toolbar button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.activity-header span,
.calendar-toolbar span,
.day-events-panel__head span {
  display: block;
  margin-bottom: 4px;
  color: #8f681a;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.activity-header h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 44px);
}

.activity-header p {
  margin: 8px 0 0;
  color: rgba(38, 51, 35, 0.7);
}

.month-switcher {
  display: flex;
  align-items: center;
  gap: 10px;
}

.month-switcher strong {
  min-width: 118px;
  text-align: center;
}

.calendar-shell {
  max-width: 1160px;
  margin: 0 auto;
  padding: 18px;
}

.calendar-toolbar,
.day-events-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.calendar-toolbar {
  margin-bottom: 14px;
}

.calendar-toolbar strong,
.day-events-panel__head strong {
  font-size: 20px;
}

.calendar-error {
  border-radius: 10px;
  padding: 10px 12px;
  color: #8a2d22;
  background: rgba(255, 218, 177, 0.82);
  font-weight: 800;
}

.weekday-row,
.calendar-week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.weekday-row {
  margin-bottom: 8px;
}

.weekday-row span {
  color: #6f7f4f;
  text-align: center;
  font-size: 12px;
  font-weight: 900;
}

.calendar-board {
  display: grid;
  gap: 8px;
}

.calendar-week {
  grid-template-rows: 68px;
  grid-auto-rows: 22px;
  min-height: auto;
}

.calendar-day {
  position: relative;
  grid-row: 1;
  min-height: 100%;
  border: 1px solid rgba(67, 80, 58, 0.14);
  border-radius: 13px;
  padding: 10px;
  color: #263323;
  text-align: left;
  background: rgba(255, 255, 255, 0.64);
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.calendar-day:hover {
  transform: translateY(-1px);
  border-color: rgba(185, 137, 35, 0.55);
}

.calendar-day.is-muted {
  opacity: 0.38;
}

.calendar-day.is-today {
  box-shadow: inset 0 0 0 2px rgba(243, 192, 77, 0.3);
}

.calendar-day.is-selected {
  border-color: #d5991e;
  background: linear-gradient(180deg, #fff8d9, #ffffff);
  box-shadow: 0 8px 18px rgba(167, 118, 26, 0.18), inset 0 0 0 2px rgba(243, 192, 77, 0.28);
}

.calendar-day__number {
  font-size: 18px;
  font-weight: 950;
}

.calendar-day em {
  position: absolute;
  top: 9px;
  right: 8px;
  border-radius: 999px;
  padding: 2px 6px;
  color: #4b3b17;
  background: #f3c04d;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
}

.event-duration-bar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 5px;
  align-self: center;
  min-width: 0;
  height: 18px;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  padding: 0 6px;
  color: #24321d;
  background: linear-gradient(90deg, var(--event-color), rgba(255, 255, 255, 0.72));
  box-shadow: inset 0 0 0 1px var(--event-color), 0 4px 10px rgba(34, 44, 28, 0.12);
  cursor: pointer;
}

.event-duration-bar.is-start {
  border-top-left-radius: 999px;
  border-bottom-left-radius: 999px;
}

.event-duration-bar.is-end {
  border-top-right-radius: 999px;
  border-bottom-right-radius: 999px;
}

.event-duration-bar img,
.event-duration-bar b {
  flex: none;
  width: 15px;
  height: 15px;
  border-radius: 5px;
  object-fit: cover;
  background: var(--event-color);
}

.event-duration-bar b {
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 9px;
}

.event-duration-bar span {
  overflow: hidden;
  font-size: 10px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-events-panel {
  margin-top: 18px;
  border-radius: 15px;
  padding: 16px;
  background: rgba(250, 244, 226, 0.88);
}

.day-events-panel__head {
  margin-bottom: 12px;
}

.day-events-panel__head em {
  border-radius: 999px;
  padding: 5px 10px;
  color: #5a4616;
  background: rgba(243, 192, 77, 0.28);
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
}

.event-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.event-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  border: 1px solid var(--event-color);
  border-radius: 14px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: inset 5px 0 0 var(--event-color);
}

.event-card img,
.event-card b {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  object-fit: cover;
  background: var(--event-color);
}

.event-card b {
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 18px;
}

.event-card div {
  display: grid;
  min-width: 0;
}

.event-card strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-card span {
  color: rgba(38, 51, 35, 0.66);
  font-size: 12px;
  font-weight: 800;
}

.empty-events {
  margin: 0;
  border-radius: 12px;
  padding: 18px;
  color: rgba(38, 51, 35, 0.66);
  background: rgba(255, 255, 255, 0.58);
  font-weight: 800;
  text-align: center;
}

@media (max-width: 760px) {
  .activity-page {
    padding: 12px;
  }

  .activity-header {
    align-items: stretch;
    flex-direction: column;
  }

  .month-switcher {
    justify-content: space-between;
  }

  .calendar-shell {
    padding: 12px;
  }

  .weekday-row,
  .calendar-week {
    gap: 4px;
  }

  .calendar-week {
    grid-template-rows: 52px;
    grid-auto-rows: 19px;
    min-height: auto;
  }

  .calendar-day {
    border-radius: 10px;
    padding: 7px;
  }

  .calendar-day__number {
    font-size: 15px;
  }

  .calendar-day em {
    display: none;
  }

  .event-duration-bar {
    height: 17px;
    padding: 0 3px;
  }

  .event-duration-bar img,
  .event-duration-bar b {
    width: 13px;
    height: 13px;
    border-radius: 4px;
  }

  .event-duration-bar span {
    font-size: 9px;
  }

  .day-events-panel {
    padding: 12px;
  }

  .day-events-panel__head {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 430px) {
  .weekday-row span {
    font-size: 11px;
  }

  .calendar-week {
    grid-template-rows: 46px;
    grid-auto-rows: 17px;
    min-height: auto;
  }

  .calendar-day {
    padding: 5px;
  }

  .event-duration-bar span {
    display: none;
  }
}
</style>
