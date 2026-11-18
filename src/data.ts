import overviewJson from '../data/derived/overview.json';
import rankingsJson from '../data/derived/rankings.json';
import categoriesJson from '../data/derived/categories.json';
import keywordsJson from '../data/derived/keywords.json';
import minitoolsJson from '../data/derived/minitools.json';
import type { Overview, Rankings, Categories, Keywords, Minitools } from './types';

export const overview = overviewJson as unknown as Overview;
export const rankings = rankingsJson as unknown as Rankings;
export const categories = categoriesJson as unknown as Categories;
export const keywords = keywordsJson as unknown as Keywords;
export const minitools = minitoolsJson as unknown as Minitools;
