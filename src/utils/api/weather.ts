import { mergeOpenWeather25ToOneCallShape } from '@/utils/merge-open-weather-25-to-one-call';

interface WeatherEnv {
  baseUrl: string;
  apiKey: string;
}

export interface WeatherByCityQuery {
  city: string;
}

export interface WeatherByCoordsQuery {
  lat: number;
  lon: number;
}

export type WeatherQuery = WeatherByCityQuery | WeatherByCoordsQuery;

export interface CurrentWeatherResult {
  /** 原始 API 响应，避免强绑定某一家供应商的字段结构 */
  raw: unknown;
}

export interface ForecastResult {
  /** 原始 API 响应，避免强绑定某一家供应商的字段结构 */
  raw: unknown;
}

export interface WeatherApiErrorDetails {
  url: string;
  status?: number;
  responseText?: string;
  cause?: unknown;
}

export class WeatherApiError extends Error {
  public readonly name = 'WeatherApiError';
  public readonly details: WeatherApiErrorDetails;

  public constructor(message: string, details: WeatherApiErrorDetails) {
    super(message);
    this.details = details;
  }
}

function isWeatherByCityQuery(query: WeatherQuery): query is WeatherByCityQuery {
  return 'city' in query;
}

function assertNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} 不能为空`);
  }
  return value;
}

function getEnvValue(key: string): string | undefined {
  // Vite / 类 Vite 环境
  const importMetaEnv =
    typeof import.meta !== 'undefined' &&
    typeof (import.meta as unknown as { env?: Record<string, unknown> }).env !== 'undefined'
      ? (import.meta as unknown as { env: Record<string, unknown> }).env
      : undefined;

  const fromImportMeta = importMetaEnv?.[key];
  if (typeof fromImportMeta === 'string' && fromImportMeta.trim().length > 0) return fromImportMeta;

  // Node.js 环境
  const maybeProcess = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
  const fromProcess = typeof maybeProcess?.env !== 'undefined' ? maybeProcess.env[key] : undefined;
  if (typeof fromProcess === 'string' && fromProcess.trim().length > 0) return fromProcess;

  return undefined;
}

function getWeatherEnv(): WeatherEnv {
  // 统一支持两套命名：Vite 常用 VITE_*，以及通用的非前缀变量
  const baseUrl =
    getEnvValue('VITE_WEATHER_API_BASE_URL') ?? getEnvValue('WEATHER_API_BASE_URL') ?? 'https://api.openweathermap.org';
  const apiKey = getEnvValue('VITE_WEATHER_API_KEY') ?? getEnvValue('WEATHER_API_KEY');

  return {
    baseUrl: assertNonEmptyString(baseUrl, 'WEATHER_API_BASE_URL'),
    apiKey: assertNonEmptyString(apiKey, 'WEATHER_API_KEY'),
  };
}

function buildQueryParams(query: WeatherQuery): Record<string, string> {
  if (isWeatherByCityQuery(query)) {
    return { q: query.city };
  }
  return { lat: String(query.lat), lon: String(query.lon) };
}

function buildUrl(pathname: string, query: WeatherQuery, extraParams?: Record<string, string>): string {
  const { baseUrl, apiKey } = getWeatherEnv();
  const url = new URL(pathname, baseUrl);

  const params = {
    ...buildQueryParams(query),
    appid: apiKey,
    ...extraParams,
  };

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

/**
 * 构建带查询参数的 URL（用于 Geocoding、One Call 等不沿用 {@link WeatherQuery} 形态的接口）。
 */
function buildSignedUrl(pathname: string, params: Record<string, string>): string {
  const { baseUrl, apiKey } = getWeatherEnv();
  const url = new URL(pathname, baseUrl);
  const merged = { ...params, appid: apiKey };
  for (const [key, value] of Object.entries(merged)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

interface GeocodeDirectItem {
  name?: string;
  lat?: number;
  lon?: number;
  local_names?: Record<string, string>;
}

function isGeocodeDirectItem(value: unknown): value is GeocodeDirectItem {
  return typeof value === 'object' && value !== null;
}

/**
 * 将城市名解析为经纬度（OpenWeather Geocoding API 1.0）。
 *
 * @see https://openweathermap.org/api/geocoding-api
 */
export async function geocodeCity(cityName: string): Promise<{ lat: number; lon: number; displayName: string }> {
  const q = cityName.trim();
  if (!q) {
    throw new Error('城市名称不能为空');
  }

  const url = buildSignedUrl('/geo/1.0/direct', { q, limit: '1' });
  const raw = await fetchJson(url);
  if (!Array.isArray(raw) || raw.length === 0 || !isGeocodeDirectItem(raw[0])) {
    throw new WeatherApiError('找不到该城市', { url });
  }

  const item = raw[0];
  const lat = item.lat;
  const lon = item.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon)) {
    throw new WeatherApiError('找不到该城市', { url });
  }

  const displayName = item.local_names?.zh ?? item.name ?? q;
  return { lat, lon, displayName };
}

async function resolveLatLon(query: WeatherQuery): Promise<{ lat: number; lon: number; displayName: string }> {
  if (isWeatherByCityQuery(query)) {
    return geocodeCity(query.city);
  }
  return {
    lat: query.lat,
    lon: query.lon,
    displayName: `${query.lat}, ${query.lon}`,
  };
}

export interface OneCallWeatherResult {
  /** 用于展示的地点名（城市查询时为 Geocoding 返回的名称） */
  locationName: string;
  /** One Call API 3.0 原始响应（含 current、daily 等字段） */
  raw: unknown;
  /** 实际使用的数据源（未订阅 One Call 时可能为 2.5 聚合） */
  dataSource?: 'onecall' | 'legacy25';
}

/**
 * One Call API 3.0：当前天气 + 分钟/小时/日级预报等。
 * 本函数默认排除 minutely、hourly、alerts，保留 **current** 与 **daily**（官方文档说明 daily 含最多 8 天）。
 *
 * @see https://openweathermap.org/api/one-call-3?collection=one_call_api_3.0
 */
const ONE_CALL_3_DEFAULT_PARAMS = {
  units: 'metric',
  lang: 'zh_cn',
  exclude: 'minutely,hourly,alerts',
} as const;

export async function getOneCallCurrentAndDaily(query: WeatherQuery): Promise<OneCallWeatherResult> {
  const { lat, lon, displayName } = await resolveLatLon(query);
  const url = buildSignedUrl('/data/3.0/onecall', {
    lat: String(lat),
    lon: String(lon),
    ...ONE_CALL_3_DEFAULT_PARAMS,
  });
  const raw = await fetchJson(url);
  return { locationName: displayName, raw };
}

function parseJsonCodField(responseText: string | undefined): number | undefined {
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
 * One Call 3.0 在未单独订阅时多为 401，且文案通常包含 “One Call”。
 * 其它 401（如 Key 无效）不应触发降级。
 */
function isOneCallSubscriptionDenied(err: WeatherApiError): boolean {
  if (err.details.status !== 401) return false;
  const t = (err.details.responseText ?? '').toLowerCase();
  if (t.includes('one call') || t.includes('onecall')) return true;
  const cod = parseJsonCodField(err.details.responseText);
  return cod === 401 && t.includes('subscription');
}

const ONE_CALL_3_PATH = '/data/3.0/onecall';

function isOneCallRequestUrl(url: string | undefined): boolean {
  return typeof url === 'string' && url.includes(ONE_CALL_3_PATH);
}

/**
 * One Call 失败时是否改用 2.5：未订阅常见 401（带说明）或 **404**（官方文档列为一类错误，部分账号实际返回 404 而非 401）。
 */
function shouldFallbackToLegacy25AfterOneCallFailure(err: WeatherApiError): boolean {
  if (!isOneCallRequestUrl(err.details.url)) return false;
  if (err.details.status === 404) return true;
  return isOneCallSubscriptionDenied(err);
}

/**
 * 5 天 / 3 小时步长预报（免费层常用）。
 *
 * @see https://openweathermap.org/forecast5
 */
export async function getForecast25(query: WeatherQuery): Promise<ForecastResult> {
  const url = buildUrl('/data/2.5/forecast', query, { units: 'metric', lang: 'zh_cn' });
  const raw = await fetchJson(url);
  return { raw };
}

/**
 * 优先请求 One Call 3.0；未开通时常见 **401**（订阅说明）或 **404**，均自动降级为 2.5 当前天气 + 预报并按日聚合。
 */
export async function fetchWeatherWithFallback(query: WeatherQuery): Promise<OneCallWeatherResult> {
  try {
    const result = await getOneCallCurrentAndDaily(query);
    return { ...result, dataSource: 'onecall' };
  } catch (cause) {
    if (!(cause instanceof WeatherApiError) || !shouldFallbackToLegacy25AfterOneCallFailure(cause)) {
      throw cause;
    }

    // 2.5 的 q=中文城市名 常返回 404（city not found）；与 Geocoding 一致先解析为 lat/lon 再请求
    const { lat, lon, displayName } = await resolveLatLon(query);
    const coordQuery: WeatherByCoordsQuery = { lat, lon };

    const [currentRes, forecastRes] = await Promise.all([
      getCurrentWeather(coordQuery),
      getForecast25(coordQuery),
    ]);

    const { locationName, payload } = mergeOpenWeather25ToOneCallShape(
      currentRes.raw,
      forecastRes.raw,
      displayName,
    );

    return {
      locationName,
      raw: payload,
      dataSource: 'legacy25',
    };
  }
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const responseText = await res.text().catch(() => undefined);
      throw new WeatherApiError('天气 API 请求失败', { url, status: res.status, responseText });
    }
    return await res.json();
  } catch (cause) {
    if (cause instanceof WeatherApiError) throw cause;
    throw new WeatherApiError('天气 API 请求异常', { url, cause });
  }
}

/**
 * 获取当前天气（支持按城市名或经纬度查询）。
 *
 * 默认适配 OpenWeatherMap 的 `/data/2.5/weather`。
 * 注意：部分中文等非英文城市名用 `q=` 可能返回 404，建议先用 {@link geocodeCity} 再传 `lat`/`lon`。
 *
 * - 城市名：`{ city: "Shanghai" }`
 * - 经纬度：`{ lat: 31.2304, lon: 121.4737 }`
 */
export async function getCurrentWeather(query: WeatherQuery): Promise<CurrentWeatherResult> {
  const url = buildUrl('/data/2.5/weather', query, { units: 'metric', lang: 'zh_cn' });
  const raw = await fetchJson(url);
  return { raw };
}

/**
 * 获取未来天气预报（支持按城市名或经纬度查询）。
 *
 * 优先 **One Call 3.0**；未订阅时自动降级为 **2.5 /forecast**（按日聚合展示）。
 *
 * @see https://openweathermap.org/api/one-call-3?collection=one_call_api_3.0
 */
export async function getForecast(query: WeatherQuery): Promise<ForecastResult> {
  const { raw } = await fetchWeatherWithFallback(query);
  return { raw };
}

