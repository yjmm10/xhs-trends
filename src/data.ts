import overviewJson from '../data/derived/overview.json';
import rankingsJson from '../data/derived/rankings.json';
import vibeJson from '../data/derived/vibe.json';
import type { Overview, Rankings, VibeData } from './types';

export const overview = overviewJson as unknown as Overview;
export const rankings = rankingsJson as unknown as Rankings;
export const vibe = vibeJson as unknown as VibeData;
