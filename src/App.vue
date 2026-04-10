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
        <h1 class="title">天气查询</h1>
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
  background: radial-gradient(1200px 700px at 20% 10%, #e8f3ff 0%, #f7f8fb 45%, #f7f8fb 100%);
  color: #0f172a;
}

.card {
  width: 100%;
  max-width: 720px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.header {
  margin-bottom: 14px;
}

.title {
  font-size: 20px;
  line-height: 1.2;
  margin: 0;
}

.subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgba(15, 23, 42, 0.7);
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
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.18);
  background: white;
  outline: none;
}

.input:focus {
  border-color: rgba(37, 99, 235, 0.7);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.button {
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(37, 99, 235, 0.22);
  background: #2563eb;
  color: white;
  font-weight: 600;
  cursor: pointer;
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
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.18);
  color: #b91c1c;
  font-size: 13px;
}

.notice {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.2);
  color: #1e3a8a;
  font-size: 13px;
  line-height: 1.45;
}

.result {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
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
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.65);
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
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.table-wrap {
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.55);
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
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
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
