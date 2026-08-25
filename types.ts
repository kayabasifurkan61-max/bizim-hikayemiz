export interface CoupleNames {
  first: string;
  second: string;
}

export interface BirthdayInfo {
  day: number;
  month: number; // 1-12
  year: number;
  label: string;
  name: string;
}

export interface SiteConfig {
  coupleNames: CoupleNames;
  meetingDate: string; // ISO format e.g. "2026-08-23T00:00:00"
  relationshipDate: string; // ISO format e.g. "2026-08-24T00:00:00"
  relationshipStartDate?: string; // backwards compatibility alias
  myBirthday: BirthdayInfo;
  partnerBirthday: BirthdayInfo;
  heroTitle: string;
  heroSubtitle: string;
  specialMessage: string;
  specialMessageAuthor: string;
  timezone: string;
}

export interface PoemItem {
  id: number;
  number: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  author?: string;
  dedication?: string;
  category?: string;
  tags?: string[];
  likes?: number;
  readTime?: string;
}

export interface PhotoItem {
  id: number;
  image: string;
  title: string;
  date: string;
  description: string;
  location: string;
  aspectRatio?: 'tall' | 'wide' | 'square';
}

export interface TimelineItem {
  id: number;
  stepNumber: string;
  date: string;
  title: string;
  description: string;
  image: string;
  location?: string;
}

export interface SharedTrait {
  id: number;
  iconName: string;
  title: string;
  description: string;
}

export interface LoveNote {
  id: number;
  date: string;
  content: string;
  sender?: string;
  accent?: string;
}

export interface MusicTrack {
  id: number;
  title: string;
  artist: string;
  src: string;
  cover: string;
  durationSeconds?: number;
  ambientColor?: string;
  sourceType?: 'audio' | 'youtube';
  youtubeId?: string;
}

export interface CustomCodeConfig {
  css?: string;
  js?: string;
  html?: string;
}

export interface SiteData {
  general: SiteConfig;
  poems: PoemItem[];
  music: MusicTrack[];
  photos: PhotoItem[];
  timeline: TimelineItem[];
  traits: SharedTrait[];
  loveNotes: LoveNote[];
  customCode: CustomCodeConfig;
}

export interface TimeBreakdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

