import type { OpenWeatherOneCallPayload } from '@/types/open-weather-one-call';
import { WeatherApiError } from '@/utils/api/weather';

/**
 * 将数值格式化为一位小数的展示字符串；无效时返回 "-"。
 */
export function formatWeatherMetric(value: unknown): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return String(Math.round(value * 10) / 10);
}

export function parseOpenWeatherCod(responseText: string | undefined): number | undefined {
  if (!responseText) return undefined;
  try {
    const parsed = JSON.parse(responseText) as { cod?: number | string };
    const cod = parsed.cod;
    if (typeof cod === 'number' && !Number.isNaN(cod)) return cod;
    if (typeof cod === 'string') {
      const n = Number(cod);
      return Number.isNaN(n) ? undefined : n;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * 将 OpenWeather API 错误映射为用户可见文案。
 */
export function getOpenWeatherUserMessage(error: unknown): string {
  if (error instanceof WeatherApiError) {
    if (error.message === '找不到该城市') return '找不到该城市';
    const cod = parseOpenWeatherCod(error.details.responseText);
    if (cod === 401) {
      return '未授权：请检查 API Key，并确认账号已开通 One Call API 3.0';
    }
    if (error.details.status === 404) return '找不到该地点的天气数据';
  }
  return '查询失败，请稍后重试';
}

const dayFormatterZh = new Intl.DateTimeFormat('zh-CN', {
  weekday: 'short',
  month: 'numeric',
  day: 'numeric',
});

/**
 * 按接口返回的 IANA 时区格式化预报日标签；无效时回退到本地时区。
 */
export function formatForecastDayLabel(unixSeconds: number | undefined, timeZone: string | undefined): string {
  if (typeof unixSeconds !== 'number') return '-';
  const tz = timeZone && timeZone.length > 0 ? timeZone : 'UTC';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz,
      weekday: 'short',
      month: 'numeric',
      day: 'numeric',
    }).format(new Date(unixSeconds * 1000));
  } catch {
    return dayFormatterZh.format(new Date(unixSeconds * 1000));
  }
}

/**
 * 优先使用 IANA `timezone`；降级数据仅有 `timezone_offset`（秒）时用偏移换算日期标签。
 */
export function formatForecastDayLabelFromPayload(
  unixSeconds: number | undefined,
  payload: Pick<OpenWeatherOneCallPayload, 'timezone' | 'timezone_offset'>,
): string {
  if (typeof unixSeconds !== 'number') return '-';
  if (payload.timezone && payload.timezone.length > 0) {
    return formatForecastDayLabel(unixSeconds, payload.timezone);
  }
  if (typeof payload.timezone_offset === 'number' && !Number.isNaN(payload.timezone_offset)) {
    const localMs = unixSeconds * 1000 + payload.timezone_offset * 1000;
    return dayFormatterZh.format(new Date(localMs));
  }
  return formatForecastDayLabel(unixSeconds, undefined);
}
