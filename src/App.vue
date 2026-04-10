<script setup lang="ts">
import { useWeatherSearch } from '@/composables/use-weather-search';

const {
  city,
  isLoading,
  errorMessage,
  locationName,
  isLegacyDataSource,
  currentDisplay,
  dailyRows,
  dailySectionTitle,
  handleSearch,
} = useWeatherSearch();
</script>

<template>
  <main class="page">
    <section class="card">
      <header class="header">
        <h1 class="title">
          <span class="title-badge" aria-hidden="true">天气</span>
          天气查询
        </h1>
        <p class="subtitle">
          输入城市名称：优先 One Call 3.0（8 日）；未订阅时自动使用免费 2.5 接口并按日汇总
        </p>
      </header>

      <form class="form" @submit.prevent="handleSearch">
        <label class="label">
          <span class="label-text">城市</span>
          <input
            v-model="city"
            class="input"
            type="text"
            inputmode="search"
            autocomplete="off"
            placeholder="例如：北京 / Shanghai"
            :disabled="isLoading"
          />
        </label>

        <button class="button" type="submit" :disabled="isLoading">
          <span v-if="!isLoading">搜索</span>
          <span v-else class="loading">
            <span class="spinner" aria-hidden="true" />
            查询中…
          </span>
        </button>
      </form>

      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

      <p v-if="isLegacyDataSource" class="notice" role="status">
        当前为 <strong>2.5 免费接口</strong> 数据（约 5 天、由 3 小时预报聚合）。开通 One Call 后可显示原生 8 日每日预报。
      </p>

      <section v-if="currentDisplay" class="result" aria-live="polite">
        <h2 class="result-title">{{ locationName || city.trim() }}</h2>
        <p class="section-label">当前天气</p>
        <dl class="grid">
          <div class="item">
            <dt class="key">天气</dt>
            <dd class="value">{{ currentDisplay.description }}</dd>
          </div>
          <div class="item">
            <dt class="key">温度</dt>
            <dd class="value">{{ currentDisplay.tempText }}</dd>
          </div>
          <div class="item">
            <dt class="key">湿度</dt>
            <dd class="value">{{ currentDisplay.humidityText }}</dd>
          </div>
          <div class="item">
            <dt class="key">风速</dt>
            <dd class="value">{{ currentDisplay.windSpeedText }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="dailyRows.length > 0" class="forecast" aria-live="polite">
        <p class="section-label">{{ dailySectionTitle }}</p>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">日期</th>
                <th scope="col">天气</th>
                <th scope="col">温度</th>
                <th scope="col">湿度</th>
                <th scope="col">风速</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in dailyRows" :key="row.rowKey">
                <td>{{ row.dateLabel }}</td>
                <td>{{ row.description }}</td>
                <td>{{ row.tempText }}</td>
                <td>{{ row.humidityText }}</td>
                <td>{{ row.windSpeedText }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(900px 500px at 15% 10%, rgba(255, 208, 102, 0.75) 0%, rgba(255, 208, 102, 0) 55%),
    radial-gradient(900px 520px at 85% 18%, rgba(130, 210, 255, 0.85) 0%, rgba(130, 210, 255, 0) 58%),
    radial-gradient(1000px 700px at 40% 90%, rgba(196, 255, 203, 0.8) 0%, rgba(196, 255, 203, 0) 62%),
    linear-gradient(180deg, #eaf7ff 0%, #fff8e8 52%, #f6fffb 100%);
  color: #0b1b2a;
}

.card {
  width: 100%;
  max-width: 720px;
  position: relative;
  background: rgba(255, 255, 255, 0.86);
  border: 3px solid rgba(11, 27, 42, 0.1);
  border-radius: 22px;
  padding: 20px;
  box-shadow:
    0 20px 0 rgba(11, 27, 42, 0.06),
    0 22px 50px rgba(11, 27, 42, 0.18);
  overflow: hidden;
}

.card::before,
.card::after {
  content: '';
  position: absolute;
  inset: -120px -160px auto auto;
  width: 320px;
  height: 320px;
  border-radius: 999px;
  background: radial-gradient(circle at 35% 35%, rgba(255, 208, 102, 0.75), rgba(255, 208, 102, 0));
  pointer-events: none;
}

.card::after {
  inset: auto auto -180px -220px;
  width: 420px;
  height: 420px;
  background: radial-gradient(circle at 40% 40%, rgba(130, 210, 255, 0.55), rgba(130, 210, 255, 0));
}

.header {
  margin-bottom: 14px;
}

.title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  line-height: 1.2;
  margin: 0;
  letter-spacing: 0.2px;
}

.title-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffd066 0%, #ffb703 100%);
  border: 2px solid rgba(11, 27, 42, 0.12);
  box-shadow: 0 6px 0 rgba(11, 27, 42, 0.08);
  font-size: 12px;
  font-weight: 850;
}

.subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgba(11, 27, 42, 0.72);
}

.form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: end;
}

.label-text {
  display: block;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.7);
  margin-bottom: 6px;
}

.input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border-radius: 14px;
  border: 2px solid rgba(11, 27, 42, 0.14);
  background: rgba(255, 255, 255, 0.92);
  outline: none;
  box-shadow: 0 8px 0 rgba(11, 27, 42, 0.06);
}

.input:focus {
  border-color: rgba(0, 153, 255, 0.65);
  box-shadow:
    0 8px 0 rgba(11, 27, 42, 0.06),
    0 0 0 6px rgba(0, 153, 255, 0.14);
}

.button {
  height: 40px;
  padding: 0 14px;
  border-radius: 14px;
  border: 2px solid rgba(11, 27, 42, 0.14);
  background: linear-gradient(180deg, #4cc9f0 0%, #4895ef 55%, #4361ee 100%);
  color: white;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 0 rgba(11, 27, 42, 0.12);
  transform: translateY(0);
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    filter 120ms ease;
}

.button:hover:not(:disabled) {
  filter: brightness(1.02);
}

.button:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 8px 0 rgba(11, 27, 42, 0.12);
}

.button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: rgba(255, 255, 255, 1);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 126, 126, 0.14);
  border: 2px solid rgba(255, 126, 126, 0.35);
  color: rgba(135, 16, 16, 0.96);
  font-size: 13px;
  box-shadow: 0 8px 0 rgba(11, 27, 42, 0.06);
}

.notice {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(130, 210, 255, 0.22);
  border: 2px solid rgba(0, 153, 255, 0.24);
  color: rgba(11, 27, 42, 0.88);
  font-size: 13px;
  line-height: 1.45;
  box-shadow: 0 8px 0 rgba(11, 27, 42, 0.06);
}

.result {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 2px dashed rgba(11, 27, 42, 0.14);
}

.section-label {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 650;
  color: rgba(15, 23, 42, 0.78);
}

.result-title {
  font-size: 16px;
  margin: 0 0 10px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 12px;
  margin: 0;
}

.item {
  padding: 10px 12px;
  border-radius: 16px;
  border: 2px solid rgba(11, 27, 42, 0.1);
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 10px 0 rgba(11, 27, 42, 0.06);
}

.key {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.62);
}

.value {
  margin: 6px 0 0;
  font-size: 14px;
  font-weight: 650;
}

.forecast {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 2px dashed rgba(11, 27, 42, 0.14);
}

.table-wrap {
  overflow-x: auto;
  border-radius: 16px;
  border: 2px solid rgba(11, 27, 42, 0.1);
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 10px 0 rgba(11, 27, 42, 0.06);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table th,
.table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px dashed rgba(11, 27, 42, 0.12);
  white-space: nowrap;
}

.table th {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.62);
  font-weight: 650;
}

.table tr:last-child td {
  border-bottom: none;
}

.table td:nth-child(2) {
  white-space: normal;
  min-width: 120px;
}

@media (max-width: 420px) {
  .form {
    grid-template-columns: 1fr;
  }
  .button {
    width: 100%;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
