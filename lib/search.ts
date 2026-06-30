import Fuse from "fuse.js";
import { careers } from "./seed-careers";
import type { Career } from "@/types";

export interface SearchResultCareer extends Career {
  matchType: "exact" | "prefix" | "alias" | "skill" | "fuzzy";
  adjustedScore: number;
}

const SEARCH_ALIASES: Record<string, string> = {
  "frontend": "frontend developer",
  "react": "frontend developer",
  "ml": "ai engineer",
  "ai": "ai engineer",
  "python": "backend developer",
  "pyhton": "backend developer",
  "docker": "devops engineer",
  "aws": "devops engineer"
};

export function normalizeQuery(query: string): string {
  if (!query) return "";
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\-]/g, "")
    .replace(/[\s\-_]+/g, " ");
}

export function searchCareers(query: string): SearchResultCareer[] {
  if (!query || !query.trim()) {
    return [...careers]
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((c) => ({
        ...c,
        matchType: "fuzzy",
        adjustedScore: 1.0,
      }));
  }

  const normalized = normalizeQuery(query);

  let isAliasMatch = false;
  let matchedTarget = "";

  for (const [key, value] of Object.entries(SEARCH_ALIASES)) {
    if (normalized === key || normalized.includes(key)) {
      matchedTarget = value;
      isAliasMatch = true;
      break;
    }
  }

  const options = {
    keys: [
      { name: "title", weight: 0.5 },
      { name: "aliases", weight: 0.4 },
      { name: "skillsRequired", weight: 0.3 },
      { name: "description", weight: 0.1 },
    ],
    threshold: 0.5,
    includeScore: true,
  };

  const fuse = new Fuse(careers, options);
  const fuseResults = fuse.search(isAliasMatch ? matchedTarget : normalized);

  const results: SearchResultCareer[] = fuseResults.map((res) => {
    const item = res.item;
    const score = res.score ?? 1.0;
    
    let matchType: "exact" | "prefix" | "alias" | "skill" | "fuzzy" = "fuzzy";
    let scoreMultiplier = 1.0;

    const lowerTitle = item.title.toLowerCase();
    const lowerSlug = item.slug.toLowerCase();

    if (lowerTitle === normalized || lowerSlug === normalized) {
      matchType = "exact";
      scoreMultiplier = 0.01;
    } 
    else if (lowerTitle.startsWith(normalized) || lowerSlug.startsWith(normalized)) {
      matchType = "prefix";
      scoreMultiplier = 0.1;
    }
    else if (isAliasMatch && lowerTitle === matchedTarget) {
      matchType = "alias";
      scoreMultiplier = 0.05;
    }
    else if (item.skillsRequired.some(skill => skill.toLowerCase() === normalized)) {
      matchType = "skill";
      scoreMultiplier = 0.2;
    }

    return {
      ...item,
      matchType,
      adjustedScore: score * scoreMultiplier,
    };
  });

  return results.sort((a, b) => a.adjustedScore - b.adjustedScore);
}
