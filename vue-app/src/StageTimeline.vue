<template>
  <section class="stage-page">
    <div class="stage-card">
      <header class="stage-header">
        <div>
          <p class="eyebrow">PROJECT STAGES</p>
          <h1>项目阶段配置</h1>
        </div>
        <button class="header-add" type="button" @click="addStage(stages.length - 1)">
          新增阶段
        </button>
      </header>

      <div class="timeline" aria-label="项目阶段时间线">
        <div
          v-for="(stage, index) in stages"
          :key="stage.id"
          class="timeline-row"
          :class="{ 'is-first': index === 0, 'is-last': index === stages.length - 1 }"
        >
          <div class="line-cell">
            <button
              v-if="canDelete(index)"
              class="delete-btn"
              type="button"
              title="删除阶段"
              @click="removeStage(index)"
            >
              -
            </button>
            <span v-else class="delete-placeholder" aria-hidden="true"></span>

            <div class="node-wrap">
              <span class="node">{{ index + 1 }}</span>
              <button
                v-if="index < stages.length - 1"
                class="add-btn"
                type="button"
                title="在下方新增阶段"
                @click="addStage(index)"
              >
                +
              </button>
            </div>
          </div>

          <label class="stage-name">
            <input v-model.trim="stage.name" type="text" />
          </label>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';

const stages = ref([
  createStage('立项阶段'),
  createStage('项目计划阶段'),
  createStage('设计开发阶段'),
  createStage('测试验证阶段'),
  createStage('试生产阶段'),
  createStage('量产阶段')
]);

function createStage(name = '新增阶段') {
  return {
    id: crypto.randomUUID(),
    name
  };
}

function canDelete(index) {
  return index > 0 && index < stages.value.length - 1;
}

function addStage(index) {
  stages.value.splice(index + 1, 0, createStage());
}

function removeStage(index) {
  if (!canDelete(index)) return;
  stages.value.splice(index, 1);
}
</script>

<style scoped>
.stage-page {
  min-height: 100vh;
  padding: 32px;
  color: #1c2633;
  background: linear-gradient(180deg, #f6f9fc 0%, #edf3f8 100%);
}

.stage-card {
  width: min(620px, 100%);
  min-height: 680px;
  padding: 28px 30px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 20px 55px rgba(25, 41, 61, 0.1);
}

.stage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #1589e6;
  font-size: 12px;
  font-weight: 700;
}

h1 {
  margin: 0;
  color: #172033;
  font-size: 24px;
  line-height: 1.25;
}

.header-add {
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 6px;
  color: #ffffff;
  background: #138ee9;
  cursor: pointer;
  font-weight: 700;
}

.timeline {
  display: grid;
  gap: 0;
}

.timeline-row {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  min-height: 94px;
}

.line-cell {
  display: grid;
  grid-template-columns: 18px 42px;
  gap: 7px;
  align-items: start;
}

.delete-btn,
.delete-placeholder {
  width: 14px;
  height: 14px;
  margin-top: 30px;
}

.delete-btn {
  display: grid;
  place-items: center;
  border: 1px solid #d6dde6;
  border-radius: 50%;
  color: #a7b2bf;
  background: #ffffff;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}

.delete-btn:hover {
  color: #e25353;
  border-color: #f0b3b3;
}

.node-wrap {
  position: relative;
  display: grid;
  justify-items: center;
  min-height: 94px;
}

.node-wrap::before {
  content: "";
  position: absolute;
  top: 42px;
  bottom: 0;
  width: 1px;
  background: #e8edf3;
}

.is-last .node-wrap::before {
  display: none;
}

.node {
  position: relative;
  z-index: 1;
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid #e4e9ef;
  border-radius: 50%;
  color: #9aa6b4;
  background: #ffffff;
  font-size: 15px;
}

.is-first .node {
  border-color: #1589e6;
  color: #ffffff;
  background: #1589e6;
  box-shadow: 0 8px 18px rgba(21, 137, 230, 0.28);
}

.add-btn {
  position: relative;
  z-index: 1;
  display: grid;
  width: 16px;
  height: 16px;
  margin-top: 22px;
  place-items: center;
  border: 1px solid #e3ebf4;
  border-radius: 50%;
  color: #1589e6;
  background: #ffffff;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.add-btn:hover {
  border-color: #1589e6;
  background: #eff8ff;
}

.stage-name {
  display: flex;
  align-items: start;
  padding-top: 8px;
}

.stage-name input {
  width: 100%;
  min-height: 38px;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0 10px;
  color: #1f2937;
  outline: none;
  background: transparent;
  font-size: 16px;
}

.stage-name input:hover,
.stage-name input:focus {
  border-color: #d8e5f2;
  background: #f8fbff;
}

@media (max-width: 640px) {
  .stage-page {
    padding: 16px;
  }

  .stage-card {
    padding: 22px 18px;
  }

  .stage-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .timeline-row {
    grid-template-columns: 70px minmax(0, 1fr);
  }
}
</style>
