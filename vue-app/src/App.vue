<template>
  <MapSeriesHome
    v-if="currentView === 'home'"
    @open-default-map="openDefaultMap"
    @open-sword-map="openSwordMap"
    @open-three-alliance-map="openThreeAllianceMap"
    @open-power-comparison="openPowerComparison"
    @open-info-statistics="openInfoStatistics"
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
  <LayoutPlanner
    v-else
    :initial-template="initialTemplate"
    @back-to-series="backToSeries"
  />
</template>

<script setup>
import { defineAsyncComponent, ref } from 'vue';
import MapSeriesHome from './MapSeriesHome.vue';

const currentView = ref('home');
const initialTemplate = ref('');
const LayoutPlanner = defineAsyncComponent(() => import('./LayoutPlanner.vue'));
const PowerComparison = defineAsyncComponent(() => import('./PowerComparison.vue'));
const InfoStatistics = defineAsyncComponent(() => import('./InfoStatistics.vue'));

function openDefaultMap() {
  initialTemplate.value = '';
  currentView.value = 'planner';
}

function openSwordMap() {
  initialTemplate.value = 'sword-battlefield';
  currentView.value = 'planner';
}

function openThreeAllianceMap() {
  initialTemplate.value = 'three-alliance-battlefield';
  currentView.value = 'planner';
}

function openPowerComparison() {
  currentView.value = 'comparison';
}

function openInfoStatistics() {
  currentView.value = 'info-statistics';
}

function openInfoCastleLayout() {
  initialTemplate.value = 'info-statistics-castle';
  currentView.value = 'planner';
}

function backToSeries() {
  currentView.value = 'home';
  initialTemplate.value = '';
}
</script>

<style>
#vue-root,
#vue-root > * {
  height: 100%;
  min-height: 0;
}
</style>
