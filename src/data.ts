import overviewJson from '../data/derived/overview.json';
import rankingsJson from '../data/derived/rankings.json';
import type { Overview, Rankings } from './types';

export const overview = overviewJson as unknown as Overview;
export const rankings = rankingsJson as unknown as Rankings;
