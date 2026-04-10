export interface OpenWeatherConditionSlice {
  description?: string;
}

export interface OpenWeatherOneCallCurrent {
  temp?: number;
  humidity?: number;
  wind_speed?: number;
  weather?: OpenWeatherConditionSlice[];
}

export interface OpenWeatherOneCallDailyItem {
  dt?: number;
  humidity?: number;
  wind_speed?: number;
  weather?: OpenWeatherConditionSlice[];
  temp?: { min?: number; max?: number; day?: number };
}

export interface OpenWeatherOneCallPayload {
  /** One Call 返回的 IANA 时区名 */
  timezone?: string;
  /** 2.5 预报中的城市相对 UTC 偏移（秒），用于降级模式下按当地日历聚合 */
  timezone_offset?: number;
  current?: OpenWeatherOneCallCurrent;
  daily?: OpenWeatherOneCallDailyItem[];
}

export function isOpenWeatherOneCallPayload(value: unknown): value is OpenWeatherOneCallPayload {
  return typeof value === 'object' && value !== null;
}
