import type { OpenWeatherOneCallPayload } from '@/types/open-weather-one-call';

interface Current25Raw {
  name?: string;
  weather?: Array<{ description?: string }>;
  main?: { temp?: number; humidity?: number };
  wind?: { speed?: number };
}

interface Forecast25ListItem {
  dt?: number;
  main?: { temp?: number; temp_min?: number; temp_max?: number; humidity?: number };
  wind?: { speed?: number };
  weather?: Array<{ description?: string }>;
}

interface Forecast25Raw {
  city?: { timezone?: number; name?: string };
  list?: Forecast25ListItem[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readCurrent25(raw: unknown): Current25Raw | null {
  if (!isRecord(raw)) return null;
  return raw as Current25Raw;
}

function readForecast25(raw: unknown): Forecast25Raw | null {
  if (!isRecord(raw)) return null;
  return raw as Forecast25Raw;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 使用城市 timezone 偏移（秒）将 UTC 时间戳映射到当地日历日键 */
function localDayKeyUtc(dtSec: number, tzOffsetSec: number): string {
  const ms = dtSec * 1000 + tzOffsetSec * 1000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function localHourUtc(dtSec: number, tzOffsetSec: number): number {
  const ms = dtSec * 1000 + tzOffsetSec * 1000;
  return new Date(ms).getUTCHours();
}

interface DayAgg {
  items: Forecast25ListItem[];
}

/**
 * 将 2.5 当前天气 + 3 小时预报合并为与 One Call 展示结构兼容的 payload（按日聚合，约 5 天）。
 */
export function mergeOpenWeather25ToOneCallShape(
  currentRaw: unknown,
  forecastRaw: unknown,
  locationFallback: string,
): { locationName: string; payload: OpenWeatherOneCallPayload } {
  const current = readCurrent25(currentRaw);
  const forecast = readForecast25(forecastRaw);

  const tzOffsetSec =
    typeof forecast?.city?.timezone === 'number' && !Number.isNaN(forecast.city.timezone)
      ? forecast.city.timezone
      : 0;

  const locationName =
    (typeof current?.name === 'string' && current.name.length > 0 ? current.name : undefined) ??
    (typeof forecast?.city?.name === 'string' && forecast.city.name.length > 0
      ? forecast.city.name
      : undefined) ??
    locationFallback;

  const oneCallCurrent: OpenWeatherOneCallPayload['current'] = {
    temp: current?.main?.temp,
    humidity: current?.main?.humidity,
    wind_speed: current?.wind?.speed,
    weather: [{ description: current?.weather?.[0]?.description ?? '-' }],
  };

  const list = Array.isArray(forecast?.list) ? forecast.list : [];
  const byDay = new Map<string, DayAgg>();

  for (const item of list) {
    if (typeof item.dt !== 'number') continue;
    const key = localDayKeyUtc(item.dt, tzOffsetSec);
    const bucket = byDay.get(key) ?? { items: [] };
    bucket.items.push(item);
    byDay.set(key, bucket);
  }

  const sortedKeys = Array.from(byDay.keys()).sort();

  const daily: OpenWeatherOneCallPayload['daily'] = sortedKeys.map((key) => {
    const { items } = byDay.get(key) ?? { items: [] };
    let minT = Number.POSITIVE_INFINITY;
    let maxT = Number.NEGATIVE_INFINITY;
    let humSum = 0;
    let humN = 0;
    let windSum = 0;
    let windN = 0;

    let bestItem: Forecast25ListItem | undefined;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const it of items) {
      const m = it.main;
      const tMin = m?.temp_min ?? m?.temp;
      const tMax = m?.temp_max ?? m?.temp;
      if (typeof tMin === 'number' && !Number.isNaN(tMin)) minT = Math.min(minT, tMin);
      if (typeof tMax === 'number' && !Number.isNaN(tMax)) maxT = Math.max(maxT, tMax);
      if (typeof m?.humidity === 'number' && !Number.isNaN(m.humidity)) {
        humSum += m.humidity;
        humN += 1;
      }
      if (typeof it.wind?.speed === 'number' && !Number.isNaN(it.wind.speed)) {
        windSum += it.wind.speed;
        windN += 1;
      }

      if (typeof it.dt === 'number') {
        const h = localHourUtc(it.dt, tzOffsetSec);
        const score = Math.abs(h - 12);
        if (score < bestScore) {
          bestScore = score;
          bestItem = it;
        }
      }
    }

    const rep = bestItem ?? items[0];
    const repDt = typeof rep?.dt === 'number' ? rep.dt : undefined;
    const desc = rep?.weather?.[0]?.description ?? '-';

    const minFinal = Number.isFinite(minT) ? minT : undefined;
    const maxFinal = Number.isFinite(maxT) ? maxT : undefined;

    return {
      dt: repDt,
      temp:
        minFinal !== undefined && maxFinal !== undefined
          ? { min: minFinal, max: maxFinal, day: (minFinal + maxFinal) / 2 }
          : undefined,
      humidity: humN > 0 ? humSum / humN : undefined,
      wind_speed: windN > 0 ? windSum / windN : undefined,
      weather: [{ description: desc }],
    };
  });

  const payload: OpenWeatherOneCallPayload = {
    timezone_offset: tzOffsetSec,
    current: oneCallCurrent,
    daily,
  };

  return { locationName, payload };
}
