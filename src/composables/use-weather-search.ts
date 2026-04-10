import { computed, ref } from 'vue';

import { OPEN_WEATHER_DAILY_FORECAST_DAYS } from '@/constants/weather';
import {
  isOpenWeatherOneCallPayload,
  type OpenWeatherOneCallPayload,
} from '@/types/open-weather-one-call';
import {
  formatForecastDayLabelFromPayload,
  formatWeatherMetric,
  getOpenWeatherUserMessage,
} from '@/utils/open-weather-format';
import { fetchWeatherWithFallback } from '@/utils/api/weather';

export interface DailyForecastRow {
  rowKey: string;
  dateLabel: string;
  description: string;
  tempText: string;
  humidityText: string;
  windSpeedText: string;
}

/**
 * 城市搜索 → One Call 当前天气 + 多日每日预报的状态与操作。
 */
export function useWeatherSearch() {
  const city = ref('');
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const payload = ref<OpenWeatherOneCallPayload | null>(null);
  const locationName = ref('');
  const dataSource = ref<'onecall' | 'legacy25' | null>(null);

  const currentDisplay = computed(() => {
    const current = payload.value?.current;
    if (!current) return null;

    const description = current.weather?.[0]?.description ?? '-';
    return {
      description,
      tempText:
        current.temp === undefined ? '-' : `${formatWeatherMetric(current.temp)} °C`,
      humidityText:
        current.humidity === undefined ? '-' : `${formatWeatherMetric(current.humidity)} %`,
      windSpeedText:
        current.wind_speed === undefined ? '-' : `${formatWeatherMetric(current.wind_speed)} m/s`,
    };
  });

  const dailyRows = computed((): DailyForecastRow[] => {
    const p = payload.value;
    if (!p) return [];
    const list = p.daily;
    if (!Array.isArray(list)) return [];

    return list.slice(0, OPEN_WEATHER_DAILY_FORECAST_DAYS).map((day, index) => {
      const desc = day.weather?.[0]?.description ?? '-';
      const min = day.temp?.min;
      const max = day.temp?.max;
      let tempText = '-';
      if (min !== undefined && max !== undefined) {
        tempText = `${formatWeatherMetric(min)} / ${formatWeatherMetric(max)} °C`;
      } else if (day.temp?.day !== undefined) {
        tempText = `${formatWeatherMetric(day.temp.day)} °C`;
      }

      return {
        rowKey: typeof day.dt === 'number' ? String(day.dt) : `day-${index}`,
        dateLabel: formatForecastDayLabelFromPayload(day.dt, p),
        description: desc,
        tempText,
        humidityText:
          day.humidity === undefined ? '-' : `${formatWeatherMetric(day.humidity)} %`,
        windSpeedText:
          day.wind_speed === undefined ? '-' : `${formatWeatherMetric(day.wind_speed)} m/s`,
      };
    });
  });

  const dailySectionTitle = computed(() =>
    dataSource.value === 'legacy25' ? '未来约 5 日（2.5 预报按日汇总）' : '未来 8 日（每日）',
  );

  const isLegacyDataSource = computed(() => dataSource.value === 'legacy25');

  async function handleSearch(): Promise<void> {
    const cityName = city.value.trim();
    if (!cityName) {
      errorMessage.value = '请输入城市名称';
      payload.value = null;
      locationName.value = '';
      dataSource.value = null;
      return;
    }

    isLoading.value = true;
    errorMessage.value = null;
    payload.value = null;
    locationName.value = '';
    dataSource.value = null;

    try {
      const { locationName: resolvedName, raw, dataSource: src } = await fetchWeatherWithFallback({
        city: cityName,
      });
      if (!isOpenWeatherOneCallPayload(raw)) {
        errorMessage.value = '天气数据解析失败，请稍后重试';
        return;
      }
      locationName.value = resolvedName;
      payload.value = raw;
      dataSource.value = src ?? 'onecall';
    } catch (err) {
      errorMessage.value = getOpenWeatherUserMessage(err);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    city,
    isLoading,
    errorMessage,
    locationName,
    dataSource,
    isLegacyDataSource,
    currentDisplay,
    dailyRows,
    dailySectionTitle,
    handleSearch,
  };
}
