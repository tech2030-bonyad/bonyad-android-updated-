/**
 * Smart Search Utility — Three-layer search with scoring, fuzzy matching, and highlighting.
 *
 * Layer 1: Substring/partial matching (case-insensitive)
 * Layer 2: Fuzzy matching with Damerau-Levenshtein (dynamic tolerance)
 * Layer 3: Scoring and ranking (exact 100, starts-with 80, substring 65, fuzzy 1-edit 50, fuzzy 2+ 30)
 *
 * Reusable from anywhere in the app.
 */

import damerauLevenshtein from 'damerau-levenshtein';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HighlightPart {
  text: string;
  highlight: boolean;
}

export type MatchType = 'exact' | 'startsWith' | 'substring' | 'fuzzy';

export interface ScoredMatch<T> {
  item: T;
  score: number;
  matchType: MatchType;
  /** Highlight parts for the best-matching text field */
  highlightParts: HighlightPart[];
  /** Which field matched (for multi-field items) */
  matchedField?: string;
}

export interface SmartSearchOptions<T> {
  /** Items to search */
  items: T[];
  /** Query string */
  query: string;
  /** Extract searchable strings from each item. Return array of strings to search (e.g. [nameEn, nameAr]) */
  getSearchableStrings: (item: T) => string[];
  /** Optional: max results per type. Default 20 */
  maxResults?: number;
  /** Min query length to run search. Default 1 */
  minQueryLength?: number;
}

// ─── Scoring constants ─────────────────────────────────────────────────────────

const SCORE_EXACT = 100;
const SCORE_STARTS_WITH = 80;
const SCORE_SUBSTRING = 65;
const SCORE_FUZZY_1 = 50;
const SCORE_FUZZY_2_PLUS = 30;

// ─── Damerau-Levenshtein (via damerau-levenshtein package) ─────────────────────

/**
 * Get edit tolerance by query length.
 * Kept strict to avoid false positives (e.g. "eslam" matching "Design" via "esig").
 * - <= 6 chars: 1 edit
 * - 7–9 chars: 2 edits
 * - > 9 chars: 3 edits
 */
export function getEditTolerance(queryLength: number): number {
  if (queryLength <= 3) return 0;
  if (queryLength <= 6) return 1;
  if (queryLength <= 9) return 2;
  return 3;
}

/** Wrapper for damerau-levenshtein package (returns .steps) */
function dlDistance(a: string, b: string): number {
  const result = damerauLevenshtein(a, b);
  return typeof result === 'object' && result?.steps != null ? result.steps : Number(result);
}

/**
 * Find the best fuzzy match: sliding window over text to find substring with min distance.
 * Returns { distance, startIndex, matchedLength } or null if no match within tolerance.
 */
function findBestFuzzyMatch(
  text: string,
  query: string,
  tolerance: number
): { distance: number; startIndex: number; matchedLength: number } | null {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const qLen = queryLower.length;
  const tLen = textLower.length;

  if (tLen === 0) return null;

  let best = { distance: Infinity, startIndex: 0, matchedLength: qLen };

  // When text is shorter than query, compare full text to query
  const minLen = Math.max(1, Math.min(qLen, tLen) - tolerance);
  const maxLen = Math.min(tLen, qLen + tolerance);
  const queryHasSpace = queryLower.includes(' ');

  // Sliding window: try each possible substring length
  for (let len = minLen; len <= maxLen; len++) {
    for (let start = 0; start <= tLen - len; start++) {
      const sub = textLower.slice(start, start + len);

      // Prevent short single-word queries from matching across spaces
      if (!queryHasSpace && sub.includes(' ') && qLen <= 5) {
        continue;
      }

      const dist = dlDistance(queryLower, sub);
      const maxLenForRatio = Math.max(qLen, len);
      const errorRatio = dist / maxLenForRatio;
      // Reject matches with >33% character error to avoid false positives (e.g. "eslam"→"esig")
      if (dist <= tolerance && dist < best.distance && errorRatio <= 0.33) {
        best = { distance: dist, startIndex: start, matchedLength: len };
      }
    }
  }

  return best.distance <= tolerance ? best : null;
}

// ─── Match evaluation ──────────────────────────────────────────────────────────

function evaluateSingleMatch(
  text: string,
  query: string,
  tolerance: number
): { score: number; matchType: MatchType; startIndex: number; endIndex: number } | null {
  if (!text || !query) return null;

  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const idx = textLower.indexOf(queryLower);

  // Exact full match
  if (textLower === queryLower) {
    return { score: SCORE_EXACT, matchType: 'exact', startIndex: 0, endIndex: query.length };
  }

  // Starts-with match
  if (idx === 0) {
    return { score: SCORE_STARTS_WITH, matchType: 'startsWith', startIndex: 0, endIndex: query.length };
  }

  // Substring match
  if (idx >= 0) {
    return { score: SCORE_SUBSTRING, matchType: 'substring', startIndex: idx, endIndex: idx + query.length };
  }

  // Fuzzy match
  const fuzzy = findBestFuzzyMatch(text, query, tolerance);
  if (fuzzy) {
    const score = fuzzy.distance === 1 ? SCORE_FUZZY_1 : SCORE_FUZZY_2_PLUS;
    return {
      score,
      matchType: 'fuzzy',
      startIndex: fuzzy.startIndex,
      endIndex: fuzzy.startIndex + fuzzy.matchedLength,
    };
  }

  return null;
}

function evaluateMatch(
  text: string,
  query: string,
  totalTolerance: number
): { score: number; matchType: MatchType; highlights: { start: number; end: number }[] } | null {
  if (!text || !query) return null;

  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // 1. Try single, monolithic match first
  const singleMatch = evaluateSingleMatch(textLower, queryLower, totalTolerance);

  if (singleMatch && singleMatch.score >= SCORE_SUBSTRING) {
    return {
      score: singleMatch.score,
      matchType: singleMatch.matchType,
      highlights: [{ start: singleMatch.startIndex, end: singleMatch.endIndex }],
    };
  }

  // 2. Try multi-word tokenized match
  const tokens = queryLower.trim().split(/\s+/);
  if (tokens.length > 1) {
    const highlights: { start: number; end: number }[] = [];
    let totalScore = 0;
    let tempTextLower = textLower;
    let allTokensMatched = true;

    for (const token of tokens) {
      if (!token) continue;
      const tokenTol = getEditTolerance(token.length);
      const match = evaluateSingleMatch(tempTextLower, token, tokenTol);

      if (match) {
        totalScore += match.score;
        highlights.push({ start: match.startIndex, end: match.endIndex });

        // Mask out the matched part with spaces to avoid reusing it
        tempTextLower =
          tempTextLower.substring(0, match.startIndex) +
          " ".repeat(match.endIndex - match.startIndex) +
          tempTextLower.substring(match.endIndex);
      } else {
        allTokensMatched = false;
        break;
      }
    }

    if (allTokensMatched) {
      const avgScore = totalScore / tokens.length;
      const finalScore = Math.max(0, avgScore - 5);

      if (!singleMatch || finalScore > singleMatch.score) {
        return {
          score: finalScore,
          matchType: 'substring',
          highlights,
        };
      }
    }
  }

  // 3. Fallback to monolithic fuzzy
  if (singleMatch) {
    return {
      score: singleMatch.score,
      matchType: singleMatch.matchType,
      highlights: [{ start: singleMatch.startIndex, end: singleMatch.endIndex }],
    };
  }

  return null;
}

/**
 * Build highlight parts from match result.
 */
function buildHighlightParts(text: string, highlights: { start: number; end: number }[]): HighlightPart[] {
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];

  for (const h of sorted) {
    if (merged.length === 0) {
      merged.push({ ...h });
    } else {
      const last = merged[merged.length - 1];
      if (h.start <= last.end) {
        last.end = Math.max(last.end, h.end);
      } else {
        merged.push({ ...h });
      }
    }
  }

  const parts: HighlightPart[] = [];
  let currentIndex = 0;

  for (const m of merged) {
    if (m.start > currentIndex) {
      parts.push({ text: text.slice(currentIndex, m.start), highlight: false });
    }
    if (m.end > m.start) {
      parts.push({ text: text.slice(Math.max(currentIndex, m.start), m.end), highlight: true });
    }
    currentIndex = Math.max(currentIndex, m.end);
  }

  if (currentIndex < text.length) {
    parts.push({ text: text.slice(currentIndex), highlight: false });
  }

  return parts.filter(p => p.text.length > 0);
}

// ─── Main API ──────────────────────────────────────────────────────────────────

/**
 * Run smart search on a list of items.
 * Returns scored, ranked results with highlight parts.
 */
export function smartSearch<T>(options: SmartSearchOptions<T>): ScoredMatch<T>[] {
  const {
    items,
    query,
    getSearchableStrings,
    maxResults = 20,
    minQueryLength = 1,
  } = options;

  const q = query.trim();
  if (q.length < minQueryLength) return [];

  const tolerance = getEditTolerance(q.length);
  const results: ScoredMatch<T>[] = [];

  for (const item of items) {
    const strings = getSearchableStrings(item);
    let bestScore = 0;
    let bestMatchType: MatchType = 'substring';

    for (const text of strings) {
      if (!text) continue;
      const match = evaluateMatch(text, q, tolerance);
      if (match && match.score > bestScore) {
        bestScore = match.score;
        bestMatchType = match.matchType;
      }
    }

    if (bestScore > 0) {
      // ALWAYS generate highlights for the primary text (the title)
      // This prevents the title from morphing into a secondary matched field.
      const primaryText = strings[0] || '';
      const primaryMatch = evaluateMatch(primaryText, q, tolerance);

      results.push({
        item,
        score: bestScore,
        matchType: bestMatchType,
        highlightParts: primaryMatch
          ? buildHighlightParts(primaryText, primaryMatch.highlights)
          : [{ text: primaryText, highlight: false }],
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}

/**
 * Debounce delay for search input (ms).
 */
export const SEARCH_DEBOUNCE_MS = 250;
