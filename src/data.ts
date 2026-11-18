import overviewJson from '../data/derived/overview.json';
import rankingsJson from '../data/derived/rankings.json';
import minitoolsJson from '../data/derived/minitools.json';
import type { Overview, Rankings, Minitools } from './types';

export const overview = overviewJson as unknown as Overview;
export const rankings = rankingsJson as unknown as Rankings;
export const minitools = minitoolsJson as unknown as Minitools;
