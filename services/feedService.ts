import { WeatherData, DailyWeather, NewsItem } from '../types';

const MELBOURNE_LAT = -37.8136;
const MELBOURNE_LON = 144.9631;

const WEATHER_CACHE_KEY = 'weatherCache';
const NEWS_CACHE_KEY = 'newsCache';
const WEATHER_CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const NEWS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCache<T>(key: string, maxAge: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > maxAge) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable
  }
}

export async function getWeather(): Promise<WeatherData> {
  const cached = getCache<WeatherData>(WEATHER_CACHE_KEY, WEATHER_CACHE_DURATION);
  if (cached) return cached;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${MELBOURNE_LAT}&longitude=${MELBOURNE_LON}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Australia/Melbourne`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Weather fetch failed');

  const json = await response.json();

  // Open-Meteo returns column arrays - transpose to row objects
  const daily: DailyWeather[] = json.daily.time.map((time: string, i: number) => ({
    time,
    weathercode: json.daily.weathercode[i],
    temperature_2m_max: json.daily.temperature_2m_max[i],
    temperature_2m_min: json.daily.temperature_2m_min[i],
    precipitation_sum: json.daily.precipitation_sum[i],
  }));

  const weatherData: WeatherData = { daily };
  setCache(WEATHER_CACHE_KEY, weatherData);
  return weatherData;
}

interface Rss2JsonItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

interface Rss2JsonResponse {
  status: string;
  items: Rss2JsonItem[];
}

async function fetchRssFeed(rssUrl: string, sourceName: string): Promise<NewsItem[]> {
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) return [];
    const data: Rss2JsonResponse = await response.json();
    if (data.status !== 'ok') return [];

    return data.items.map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      source: sourceName,
      description: item.description?.replace(/<[^>]*>/g, '').slice(0, 200) || '',
    }));
  } catch {
    return [];
  }
}

export async function getNews(): Promise<NewsItem[]> {
  const cached = getCache<NewsItem[]>(NEWS_CACHE_KEY, NEWS_CACHE_DURATION);
  if (cached) return cached;

  const feeds = [
    { url: 'https://www.abc.net.au/news/feed/51120/rss.xml', source: 'ABC Melbourne' },
    { url: 'https://www.sbs.com.au/news/topic/latest/feed', source: 'SBS News' },
    { url: 'https://www.cricket.com.au/rss', source: 'Cricket Australia' },
  ];

  const results = await Promise.all(
    feeds.map(feed => fetchRssFeed(feed.url, feed.source))
  );

  const allNews = results
    .flat()
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 20);

  if (allNews.length > 0) {
    setCache(NEWS_CACHE_KEY, allNews);
  }

  return allNews;
}
