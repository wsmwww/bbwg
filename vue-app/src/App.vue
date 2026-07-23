<template>
  <MapSeriesHome
    v-if="currentView === 'home'"
    @open-default-map="openDefaultMap"
    @open-sword-map="openSwordMap"
    @open-three-alliance-map="openThreeAllianceMap"
    @open-power-comparison="openPowerComparison"
    @open-info-statistics="openInfoStatistics"
    @open-activity-calendar="openActivityCalendar"
  />
  <PowerComparison
    v-else-if="currentView === 'comparison'"
    @back-to-series="backToSeries"
  />
  <InfoStatistics
    v-else-if="currentView === 'info-statistics'"
    @back-to-series="backToSeries"
    @open-castle-layout="openInfoCastleLayout"
  />
  <ActivityCalendar
    v-else-if="currentView === 'activity-calendar'"
    @back-to-series="backToSeries"
  />
  <LayoutPlanner
    v-else
    :key="initialTemplate || 'default-map'"
    :initial-template="initialTemplate"
    @back-to-series="backToSeries"
  />
</template>

<script setup>
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import MapSeriesHome from './MapSeriesHome.vue';

const ROUTES = {
  home: '#/bbwg',
  comparison: '#/bbwg/comparison',
  infoStatistics: '#/bbwg/info-statistics',
  activityCalendar: '#/bbwg/activity-calendar',
  defaultMap: '#/bbwg/map/default',
  swordMap: '#/bbwg/map/sword',
  threeAllianceMap: '#/bbwg/map/three-alliance',
  infoCastleMap: '#/bbwg/map/info-castle'
};

const currentView = ref('home');
const initialTemplate = ref('');
const LayoutPlanner = defineAsyncComponent(() => import('./LayoutPlanner.vue'));
const PowerComparison = defineAsyncComponent(() => import('./PowerComparison.vue'));
const InfoStatistics = defineAsyncComponent(() => import('./InfoStatistics.vue'));
const ActivityCalendar = defineAsyncComponent(() => import('./ActivityCalendar.vue'));

function applyHashRoute() {
  const path = window.location.hash.split('?')[0];
  if (path === ROUTES.comparison) {
    currentView.value = 'comparison';
    initialTemplate.value = '';
  } else if (path === ROUTES.infoStatistics) {
    currentView.value = 'info-statistics';
    initialTemplate.value = '';
  } else if (path === ROUTES.activityCalendar) {
    currentView.value = 'activity-calendar';
    initialTemplate.value = '';
  } else if (path === ROUTES.swordMap) {
    currentView.value = 'planner';
    initialTemplate.value = 'sword-battlefield';
  } else if (path === ROUTES.threeAllianceMap) {
    currentView.value = 'planner';
    initialTemplate.value = 'three-alliance-battlefield';
  } else if (path === ROUTES.infoCastleMap) {
    currentView.value = 'planner';
    initialTemplate.value = 'info-statistics-castle';
  } else if (path === ROUTES.defaultMap) {
    currentView.value = 'planner';
    initialTemplate.value = '';
  } else {
    currentView.value = 'home';
    initialTemplate.value = '';
  }
}

function navigate(hash) {
  if (window.location.hash === hash) applyHashRoute();
  else window.location.hash = hash;
}

function openDefaultMap() {
  initialTemplate.value = '';
  navigate(ROUTES.defaultMap);
}

function openSwordMap() {
  initialTemplate.value = 'sword-battlefield';
  navigate(ROUTES.swordMap);
}

function openThreeAllianceMap() {
  initialTemplate.value = 'three-alliance-battlefield';
  navigate(ROUTES.threeAllianceMap);
}

function openPowerComparison() {
  navigate(ROUTES.comparison);
}

function openInfoStatistics() {
  navigate(ROUTES.infoStatistics);
}

function openActivityCalendar() {
  navigate(ROUTES.activityCalendar);
}

function openInfoCastleLayout() {
  initialTemplate.value = 'info-statistics-castle';
  navigate(ROUTES.infoCastleMap);
}

function backToSeries() {
  navigate(ROUTES.home);
}

onMounted(() => {
  applyHashRoute();
  window.addEventListener('hashchange', applyHashRoute);
});

onBeforeUnmount(() => window.removeEventListener('hashchange', applyHashRoute));
</script>

<style>
#vue-root,
#vue-root > * {
  height: 100%;
  min-height: 0;
}
</style>
