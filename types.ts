
export enum Page {
  Home,
  PhotoPriceCheck,
  Tools,
  News,
  Health,
  Chat,
  Info,
}

export interface INRLog {
  id: number;
  date: string; // ISO string
  value: number;
  notes?: string;
}

export interface DailyWeather {
  time: string;
  weathercode: number;
  temperature_2m_max: number;
  temperature_2m_min: number;
  precipitation_sum: number;
}

export interface WeatherData {
  daily: DailyWeather[];
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
}

export interface QueuedImage {
  id: string;
  dataUrl: string;
  fileName: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
