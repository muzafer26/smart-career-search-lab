"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { searchCareers, normalizeQuery } from "../lib/search";
import { careers } from "../lib/seed-careers";
import Fuse from "fuse.js";
import CosmicDust from "@/components/lightswind/cosmic-dust";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";

const ALIASES: Record<string, string> = {
  "frontend": "frontend developer", "react": "frontend developer",
  "ml": "ai engineer", "ai": "ai engineer",
  "python": "backend developer", "pyhton": "backend developer",
  "docker": "devops engineer", "aws": "devops engineer"
};

const FOOTER_QUOTES = [
  "Crafted with 💛 for curious developers. Break it. Rebuild it. Understand it.",
  "May your queries be lightning-fast and your fuzzy matching lenient.",
  "Designed for developers who don't just use search—they perfect it.",
  "Index everything. Ignore nothing. Keep on building.",
  "Powered by smart algorithms, perfected by your code patches.",
  "The best way to learn is to teach."
];

type ApplyRecord = {
  id: string;
  title: string;
  aliases: string[];
  skillsRequired: string[];
  description: string;
};

type ApplyMatchType = "exact" | "prefix" | "alias" | "skill" | "fuzzy";

type ApplyResult = ApplyRecord & {
  matchType: ApplyMatchType;
  adjustedScore: number;
};

const APPLY_DATASETS: Record<string, ApplyRecord[]> = {
  Movies: [
    { id: "1", title: "The Matrix", aliases: ["red pill", "neo movie"], skillsRequired: ["sci-fi", "action", "cyberpunk"], description: "A hacker learns about the true nature of his reality." },
    { id: "2", title: "Inception", aliases: ["dream movie"], skillsRequired: ["sci-fi", "thriller", "nolan"], description: "A thief steals corporate secrets through dream-sharing." },
    { id: "3", title: "Interstellar", aliases: ["space movie"], skillsRequired: ["sci-fi", "drama", "space"], description: "Explorers travel through a wormhole in space." }
  ],
  Anime: [
    { id: "1", title: "Attack on Titan", aliases: ["aot", "snk"], skillsRequired: ["action", "dark fantasy"], description: "Humanity fights for survival against titans." },
    { id: "2", title: "Death Note", aliases: ["dn"], skillsRequired: ["thriller", "psychological"], description: "A high school student discovers a supernatural notebook." },
    { id: "3", title: "Naruto", aliases: [], skillsRequired: ["ninja", "action", "shounen"], description: "A ninja strives to become the village leader." }
  ],
  Games: [
    { id: "1", title: "The Witcher 3", aliases: ["tw3", "geralt game"], skillsRequired: ["rpg", "open world", "fantasy"], description: "Geralt searches for his missing adopted daughter." },
    { id: "2", title: "Minecraft", aliases: ["mc"], skillsRequired: ["sandbox", "survival", "building"], description: "Explore blocky, procedurally generated 3D worlds." },
    { id: "3", title: "Hades", aliases: [], skillsRequired: ["roguelike", "action", "indie"], description: "Defy the god of the dead to escape the Underworld." }
  ],
  Music: [
    { id: "1", title: "Bohemian Rhapsody", aliases: ["bohrap", "queen anthem"], skillsRequired: ["rock", "queen", "classic"], description: "A legendary song by Queen." },
    { id: "2", title: "Blinding Lights", aliases: [], skillsRequired: ["synthwave", "pop", "the weeknd"], description: "A retro-styled hit song." },
    { id: "3", title: "Shape of You", aliases: [], skillsRequired: ["pop", "ed sheeran"], description: "A popular upbeat track." }
  ],
  Recipes: [
    { id: "1", title: "Spaghetti Carbonara", aliases: ["roman pasta", "bacon egg pasta"], skillsRequired: ["pasta", "italian", "dinner"], description: "Classic Italian pasta dish." },
    { id: "2", title: "Chicken Tikka Masala", aliases: ["tikka masala"], skillsRequired: ["indian", "curry", "chicken"], description: "Roasted marinated chicken in spiced curry." },
    { id: "3", title: "Chocolate Chip Cookies", aliases: ["cookies"], skillsRequired: ["dessert", "baking", "sweet"], description: "Classic homemade cookies." }
  ],
  Books: [
    { id: "1", title: "1984", aliases: ["nineteen eighty-four"], skillsRequired: ["dystopian", "political", "orwell"], description: "A chilling vision of a totalitarian future." },
    { id: "2", title: "The Hobbit", aliases: [], skillsRequired: ["fantasy", "tolkien", "adventure"], description: "Bilbo Baggins' journey." },
    { id: "3", title: "Dune", aliases: [], skillsRequired: ["sci-fi", "desert planet", "herbert"], description: "A science fiction epic." }
  ],
  Careers: [
    { id: "1", title: "Frontend Developer", aliases: ["react dev", "ui developer"], skillsRequired: ["javascript", "react", "css"], description: "Build web application user interfaces." },
    { id: "2", title: "AI Engineer", aliases: ["ml engineer"], skillsRequired: ["python", "machine learning", "pytorch"], description: "Develop artificial intelligence models." },
    { id: "3", title: "DevOps Engineer", aliases: ["sre"], skillsRequired: ["docker", "kubernetes", "aws"], description: "Manage infrastructure and deployment pipelines." }
  ],
  Custom: []
};

const CONCEPTS = [
  {
    id: "lemma",
    name: "Lemmatization",
    level: "Level 1",
    labelBg: "#f59e0b",
    bg: "#fef3c7",
    textColor: "#78350f",
    titleColor: "#92400e",
    what: "Simplifies words down to their root dictionary form. It recognizes that grammatical variations (like \"ran,\" \"runs,\" and \"running\") all point back to the base word \"run.\"",
    example: (
      <>
        <code style={{ fontSize: "11px", fontWeight: "bold", color: "#92400e" }}>developers</code>
        <span style={{ fontSize: "11px", color: "#92400e" }}>to</span>
        <code style={{ fontSize: "11px", fontWeight: "bold", color: "#92400e" }}>developer</code>
      </>
    ),
    why: "Ensures searches for plural or verb forms still match base career titles, preventing missed results.",
    usedIn: ["Google Search", "Job Portals", "Resume Search"],
    learnNext: "Stemming and morphological analysis."
  },
  {
    id: "ngrams",
    name: "N-Grams",
    level: "Level 1",
    labelBg: "#f59e0b",
    bg: "#fef3c7",
    textColor: "#78350f",
    titleColor: "#92400e",
    what: "Breaks text into overlapping slices of N consecutive characters or words. This lets computers analyze text fragments instead of just entire words.",
    example: (
      <>
        <code style={{ fontSize: "11px", fontWeight: "bold", color: "#92400e" }}>react</code>
        <span style={{ fontSize: "11px", color: "#92400e" }}>to</span>
        <code style={{ fontSize: "11px", fontWeight: "bold", color: "#92400e" }}>rea, eac, act</code>
      </>
    ),
    why: "Powers search autocompletion as you type, and allows search engines to find partial matches or handle typos.",
    usedIn: ["GitHub", "Documentation Search", "Google Autocomplete"],
    learnNext: "Suffix trees and fuzzy autocomplete indices."
  },
  {
    id: "tfidf",
    name: "TF-IDF (Term Frequency-Inverse Document Frequency)",
    level: "Level 2",
    labelBg: "var(--primary)",
    bg: "#fee2e2",
    textColor: "#7f1d1d",
    titleColor: "#991b1b",
    what: "Ranks documents by measuring how unique a search word is. It weights rare terms (like \"Docker\") heavily while ignoring common, generic terms (like \"the\").",
    example: (
      <>
        <code style={{ fontSize: "11px", fontWeight: "bold", color: "#991b1b" }}>the Python developer</code>
        <span style={{ fontSize: "11px", color: "#991b1b" }}>to</span>
        <span style={{ fontSize: "11px", fontWeight: "bold", color: "#991b1b" }}>Python (High Weight)</span>
      </>
    ),
    why: "Prevents generic terms from dominating search results, making sure the most specific matches rank at the top.",
    usedIn: ["Enterprise Search", "Job Portals", "Resume Search"],
    learnNext: "BM25, a ranking algorithm widely used in production search engines."
  },
  {
    id: "ner",
    name: "Named Entity Recognition (NER)",
    level: "Level 2",
    labelBg: "var(--primary)",
    bg: "#fee2e2",
    textColor: "#7f1d1d",
    titleColor: "#991b1b",
    what: "Scans unstructured queries to automatically identify and classify key categories, labelling words as skills, locations, companies, or job titles.",
    example: (
      <>
        <code style={{ fontSize: "11px", fontWeight: "bold", color: "#991b1b" }}>React developer in Paris</code>
        <span style={{ fontSize: "11px", color: "#991b1b" }}>to</span>
        <span style={{ fontSize: "11px", fontWeight: "bold", color: "#991b1b" }}>React (Skill), Paris (Location)</span>
      </>
    ),
    why: "Allows search engines to understand search intent and apply smart context-aware filters automatically.",
    usedIn: ["LinkedIn", "Resume Search", "Job Portals"],
    learnNext: "Entity extraction using NLP libraries like spaCy or Hugging Face."
  },
  {
    id: "embed",
    name: "Word Embeddings",
    level: "Level 3",
    labelBg: "var(--secondary)",
    bg: "#e0f2fe",
    textColor: "#0c4a6e",
    titleColor: "#0369a1",
    what: "Converts words into mathematical vectors. Words with similar meanings or contexts are placed close together in a multi-dimensional space.",
    example: (
      <>
        <code style={{ fontSize: "11px", fontWeight: "bold", color: "#0369a1" }}>developer</code>
        <span style={{ fontSize: "11px", color: "#0369a1" }}>~</span>
        <code style={{ fontSize: "11px", fontWeight: "bold", color: "#0369a1" }}>engineer</code>
      </>
    ),
    why: "Solves the synonym problem. It understands that a search for \"coder\" should return jobs looking for a \"programmer.\"",
    usedIn: ["Semantic Search", "LinkedIn Job Matching", "Google Search"],
    learnNext: "Vector databases and high-dimensional similarity search."
  },
  {
    id: "transformers",
    name: "Sentence Transformers",
    level: "Level 3",
    labelBg: "var(--secondary)",
    bg: "#e0f2fe",
    textColor: "#0c4a6e",
    titleColor: "#0369a1",
    what: "Converts entire sentences or paragraphs into mathematical vectors. This captures the complete context and overall meaning of a query rather than analyzing individual words.",
    example: (
      <>
        <span style={{ fontSize: "10px", fontWeight: "bold", color: "#0369a1", lineHeight: 1.1 }}>\"building web interfaces with React\"</span>
        <span style={{ fontSize: "11px", color: "#0369a1" }}>~</span>
        <span style={{ fontSize: "10px", fontWeight: "bold", color: "#0369a1", lineHeight: 1.1 }}>\"frontend UI developer\"</span>
      </>
    ),
    why: "Enables semantic search where users can search using conversational descriptions, matching concepts even if no exact words overlap.",
    usedIn: ["Semantic Search", "AI Resume Matchers", "Google Search"],
    learnNext: "Implementing semantic search using Retrieval-Augmented Generation (RAG)."
  }
];


export default function Home() {
  const [activeTab, setActiveTab] = useState<"explore" | "understand" | "build" | "apply">("explore");
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const confettiRef = useRef<ConfettiRef>(null);
  const [isIndexOpen, setIsIndexOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<string>("lemma");
  const [footerQuote, setFooterQuote] = useState("");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * FOOTER_QUOTES.length);
    setFooterQuote(FOOTER_QUOTES[randomIndex]);
  }, []);

  useEffect(() => {
    if (activeTab === "explore" && searchInputRef.current) searchInputRef.current.focus();
  }, [activeTab]);

  const [normInputA, setNormInputA] = useState("Frontend");
  const [normInputB, setNormInputB] = useState(" FRONTEND!!! ");
  const [normPrediction, setNormPrediction] = useState<"match" | "mismatch" | null>(null);
  const [aliasInput, setAliasInput] = useState("ml");
  const [aliasPrediction, setAliasPrediction] = useState<"match" | "mismatch" | null>(null);
  const [fuzzyInput, setFuzzyInput] = useState("frontnd");
  const [fuzzyPrediction, setFuzzyPrediction] = useState<"match" | "mismatch" | null>(null);
  const [rankingPrediction, setRankingPrediction] = useState<string | null>(null);
  const [buildStep, setBuildStep] = useState(0);
  const [selectedDbCareers, setSelectedDbCareers] = useState<string[]>([]);
  const [buildCleanInput, setBuildCleanInput] = useState("");
  const [buildAliasInput, setBuildAliasInput] = useState("");
  const [buildFuzzyInput, setBuildFuzzyInput] = useState("");
  const [buildRankInput, setBuildRankInput] = useState("");
  const [unlockedParts, setUnlockedParts] = useState<Record<string, boolean>>({});

  const [applyDataset, setApplyDataset] = useState<string>("Movies");
  const [applyRecords, setApplyRecords] = useState<ApplyRecord[]>(APPLY_DATASETS["Movies"]);
  const [applySearch, setApplySearch] = useState("");
  const [applyConfig, setApplyConfig] = useState({ normalization: false, aliasExpansion: false, fuzzyMatching: false, ranking: false });
  const [isEditingDataset, setIsEditingDataset] = useState(false);

  const switchApplyDataset = (dataset: string) => {
    setApplyDataset(dataset);
    setApplyRecords([...APPLY_DATASETS[dataset]]);
    setApplySearch("");
    setIsEditingDataset(false);
  };

  const applySafeTitle = applyRecords[0]?.title || "Title";
  const applyBugNorm = applySafeTitle.toUpperCase() + "!!!";
  const applyBugAlias = applyRecords[0]?.aliases?.[0] || "alias";
  const applyBugFuzzy = applySafeTitle.replace(/[aeiouAEIOU]/, "") === applySafeTitle ? applySafeTitle.slice(0, -1) : applySafeTitle.replace(/[aeiouAEIOU]/, "");
  const applyBugRank = applyRecords[0]?.skillsRequired?.[0] || "keyword";

  const applyResults = useMemo(() => {
    if (!applySearch.trim()) {
      return applyRecords.map<ApplyResult>((r) => ({ ...r, matchType: "exact", adjustedScore: 1.0 }));
    }

    let processedQuery = applySearch;
    if (applyConfig.normalization) {
      processedQuery = processedQuery.toLowerCase().trim().replace(/[^\w\s\-]/g, "").replace(/[\s\-_]+/g, " ");
    }

    let matchedTarget = processedQuery;
    let isAliasMatch = false;

    if (applyConfig.aliasExpansion) {
      for (const record of applyRecords) {
        if (record.aliases && record.aliases.some((a: string) => a.trim().toLowerCase() === processedQuery.toLowerCase())) {
          matchedTarget = record.title.toLowerCase();
          isAliasMatch = true;
          break;
        }
      }
    }

    const queryToSearch = isAliasMatch ? matchedTarget : processedQuery;

    const options = {
      keys: [
        { name: "title", weight: 0.5 },
        ...(applyConfig.aliasExpansion ? [{ name: "aliases", weight: 0.4 }] : []),
        ...(applyConfig.ranking ? [
          { name: "skillsRequired", weight: 0.3 },
          { name: "description", weight: 0.1 }
        ] : [])
      ],
      threshold: (applyConfig.fuzzyMatching && (applyConfig.normalization || !/[^\w\s\-]/.test(applySearch))) ? 0.5 : 0.0,
      includeScore: true
    };

    const fuse = new Fuse(applyRecords, options);
    const fuseResults = fuse.search(queryToSearch);

    const results = fuseResults.map<ApplyResult>(res => {
      const item = res.item;
      const score = res.score ?? 1.0;
      let matchType: ApplyMatchType = "fuzzy";
      let scoreMultiplier = 1.0;

      const lowerTitle = item.title.toLowerCase();

      const normalizedQuery = processedQuery.trim().toLowerCase();

      // 1. Identify Match Type (for UI badges)
      if (lowerTitle === normalizedQuery) {
        matchType = "exact";
      } else if (lowerTitle.startsWith(normalizedQuery)) {
        matchType = "prefix";
      } else if (isAliasMatch && lowerTitle === matchedTarget) {
        matchType = "alias";
      } else if (item.skillsRequired && item.skillsRequired.some((skill: string) => skill.trim().toLowerCase() === normalizedQuery)) {
        matchType = "skill";
      } else {
        matchType = "fuzzy";
      }

      // 2. Apply Ranking Multipliers (only if enabled)
      if (applyConfig.ranking) {
        if (matchType === "exact") scoreMultiplier = 0.01;
        else if (matchType === "prefix") scoreMultiplier = 0.1;
        else if (matchType === "alias") scoreMultiplier = 0.05;
        else if (matchType === "skill") scoreMultiplier = 0.2;
      } else {
        scoreMultiplier = 1.0;
      }

      return { ...item, matchType, adjustedScore: score * scoreMultiplier };
    });

    return results.sort((a, b) => a.adjustedScore - b.adjustedScore);
  }, [applySearch, applyRecords, applyConfig]);

  const triggerUnlock = (part: string) => {
    if (!unlockedParts[part]) {
      setUnlockedParts(prev => ({ ...prev, [part]: true }));
      setTimeout(() => {
        confettiRef.current?.fire({ particleCount: 80, spread: 60 });
      }, 50);
    }
  };

  const results = useMemo(() => searchCareers(query), [query]);
  const normalized = useMemo(() => normalizeQuery(query), [query]);

  const aliasExpansion = (() => {
    if (!normalized) return { matched: false, target: "" };
    for (const [k, v] of Object.entries(ALIASES)) {
      if (normalized === k || normalized.includes(k)) return { matched: true, target: v };
    }
    return { matched: false, target: "" };
  })();

  const topResult = useMemo(() =>
    results.length > 0 && query.trim() ? results[0] : null,
    [results, query]);

  const secondaryResults = useMemo(() =>
    results.length > 1 && query.trim() ? results.slice(1) : [],
    [results, query]);

  const normDetailsA = useMemo(() => normalizeQuery(normInputA), [normInputA]);
  const normDetailsB = useMemo(() => normalizeQuery(normInputB), [normInputB]);
  const doesNormMatch = normDetailsA === normDetailsB && normDetailsA !== "";

  const aliasDetails = useMemo(() => {
    const term = normalizeQuery(aliasInput);
    return { term, matchedVal: ALIASES[term] || null };
  }, [aliasInput]);

  const fuzzyIntuition = useMemo(() => {
    const target = "frontend";
    const s1 = fuzzyInput.toLowerCase().trim();
    if (!s1) return { distance: target.length, analysis: "Input is empty." };
    const track = Array(target.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i++) track[0][i] = i;
    for (let j = 0; j <= target.length; j++) track[j][0] = j;
    for (let j = 1; j <= target.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const ind = s1[i - 1] === target[j - 1] ? 0 : 1;
        track[j][i] = Math.min(track[j][i - 1] + 1, track[j - 1][i] + 1, track[j - 1][i - 1] + ind);
      }
    }
    const dist = track[target.length][s1.length];
    const analysis = dist === 0 ? "Perfect match - identical strings."
      : dist === 1 ? "1 edit - minor typo, easy to resolve."
      : dist === 2 ? "2 edits - still within tolerance."
      : dist <= 4 ? `${dist} edits - match may be weak.`
      : `${dist} edits - too different to match.`;
    return { distance: dist, analysis };
  }, [fuzzyInput]);

  const fuzzyVisualDiff = useMemo(() => {
    const target = "frontend";
    const s = fuzzyInput.toLowerCase().trim();
    if (!s) return { targetAlign: target.split(""), inputAlign: Array(target.length).fill("-") };
    const n = target.length, m = s.length;
    const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
    for (let i = 0; i <= n; i++) dp[i][0] = i;
    for (let j = 0; j <= m; j++) dp[0][j] = j;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        dp[i][j] = target[i - 1] === s[j - 1] ? dp[i - 1][j - 1]
          : Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
      }
    }
    let i = n, j = m;
    const ta: string[] = [], ia: string[] = [];
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && target[i - 1] === s[j - 1]) { ta.unshift(target[i - 1]); ia.unshift(s[j - 1]); i--; j--; }
      else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { ta.unshift(target[i - 1]); ia.unshift(s[j - 1]); i--; j--; }
      else if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + 1)) { ta.unshift(target[i - 1]); ia.unshift("-"); i--; }
      else { ta.unshift("-"); ia.unshift(s[j - 1]); j--; }
    }
    return { targetAlign: ta, inputAlign: ia };
  }, [fuzzyInput]);

  const buildStepOutput = useMemo(() => {
    if (buildStep === 0) {
      return selectedDbCareers.length > 0
        ? `Career records created:\n[\n${selectedDbCareers.map(c => `  "${c}"`).join(",\n")}\n]`
        : "No career records created yet. Select a career above to instantiate records.";
    }
    if (buildStep === 1) {
      const term = buildCleanInput || "FRONTEND!!!";
      return `normalizeQuery("${term}") => "${normalizeQuery(term)}"`;
    }
    if (buildStep === 2) {
      const term = buildAliasInput.trim().toLowerCase() || "ml";
      const expanded = ALIASES[term] || term;
      return `"${term}" => expanded to: "${expanded}"`;
    }
    if (buildStep === 3) {
      const term = buildFuzzyInput.trim().toLowerCase() || "frontnd";
      const target = "frontend";
      const n = target.length, m = term.length;
      const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
      for (let i = 0; i <= n; i++) dp[i][0] = i;
      for (let j = 0; j <= m; j++) dp[0][j] = j;
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          dp[i][j] = target[i - 1] === term[j - 1] ? dp[i - 1][j - 1]
            : Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
        }
      }
      const dist = dp[n][m];
      return `levenshteinDistance("${term}", "frontend") => ${dist} (${dist <= 2 ? "Match! Distance <= 2" : "Too many edits"})`;
    }
    if (buildStep === 4) {
      const term = buildRankInput.trim().toLowerCase() || "frontend";
      const results = searchCareers(term);
      return results.length === 0 ? "[]" : `[\n` + results.slice(0, 3).map((x) => `  {\n    title: "${x.title}",\n    matchType: "${x.matchType}",\n    score: ${x.adjustedScore.toFixed(4)}\n  }`).join(",\n") + `\n]`;
    }
    return "";
  }, [buildStep, selectedDbCareers, buildCleanInput, buildAliasInput, buildFuzzyInput, buildRankInput]);

  const getMatchReason = (t: string) => ({
    exact: "Exact match: You typed the name of this career exactly.",
    fuzzy: "Typo correction: You made a small spelling mistake, but we figured out the word you meant.",
    alias: "Synonym / Alias translation: You typed a shortcut or acronym, which we expanded to its full career title.",
    prefix: "Prefix match: We matched the beginning of your query to this career.",
    skill: "Skill match: We matched the tool or technology you entered to a career that requires it.",
  }[t] ?? "This result matches your search.");

  const mono = { fontFamily: "\"JetBrains Mono\",monospace", fontSize: 14 } as React.CSSProperties;

  return (
    <div className="layout-wrapper" style={{ overflow: "hidden" }}>
      <CosmicDust />

      {/* -- HEADER -- */}
      <header className="nav-wrapper">
        <div className="nav-inner">
          <button
            className="nav-brand"
            onClick={() => {
              setActiveTab("explore");
              setQuery("");
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: "rotate(-3deg)", filter: "drop-shadow(2px 2px 0px #000)" }}>
              <rect x="6" y="6" width="88" height="88" rx="16" fill="#ffffff" stroke="#000000" strokeWidth="4.5" />
              <circle cx="40" cy="24" r="4.5" fill="#f59e0b" stroke="#000000" strokeWidth="3" />
              <circle cx="58" cy="20" r="3.5" fill="#f59e0b" stroke="#000000" strokeWidth="2.5" />
              <path d="M 49 14 L 49 9 M 51.5 11.5 L 46.5 11.5" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
              <path d="M 37 56 L 63 56 L 71 68 C 72 70 70 72 68 72 L 32 72 C 30 72 28 70 29 68 Z" fill="#e11d48" />
              <path d="M 44 28 L 56 28 M 44 28 L 44 42 L 28 66 C 26 69 28 72 32 72 L 68 72 C 72 72 74 69 72 66 L 56 42 L 56 28" stroke="#000000" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx="50" cy="50" r="28" stroke="#000000" strokeWidth="5" fill="none" />
              <path d="M 70 70 L 86 86" stroke="#000000" strokeWidth="8" strokeLinecap="round" />
              <path d="M 70 70 L 86 86" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div>
              <span className="nav-title" style={{ display: "block" }}>Search Lab</span>
              <span style={{ fontSize: "11px", color: "var(--dark)", fontWeight: "bold", display: "block", marginTop: "-3px" }}>
                Break Search - Understand Search - Build Search
              </span>
            </div>
          </button>
          <nav className="tab-nav">
            {(["explore", "understand", "build", "apply"] as const).map(t => (
              <button key={t} className={`tab-link${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>
                {{ explore: "Diagnose", understand: "Experiment", build: "Repair", apply: "Apply" }[t]}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>

        {/* -- EXPLORE -- */}
        {activeTab === "explore" && (
          <div className="page-column animate-fadeIn">

            <div className="explore-hero">
              <span className="build-label blue" style={{ marginBottom: 20 }}>Phase 1: Diagnose</span>
              <h2 className="explore-hero-question">
                System Alert: Career Search Engine is Broken!
              </h2>
              <p className="explore-hero-sub">
                The current career directory engine fails when users make typos, shorthand search keys, or messy punctuation. Type messy input queries below to diagnose where the search pipeline breaks.
              </p>
            </div>

            <div style={{ position: "relative", marginBottom: 10 }}>
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Try '  FRONTEND!!!  ', 'frontnd', 'ml', or 'docker'"
                className="search-input"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--dark)", fontSize: 24, fontWeight: "bold", lineHeight: 1 }}
                >x</button>
              )}
            </div>

            <div className="explore-suggestions" style={{ marginBottom: 24 }}>
              <span style={{ marginRight: 6 }}>Try diagnostic queries:</span>
              {["  FRONTEND!!!  ", "frontnd", "ml", "docker"].map((s, i) => (
                <span key={s}>
                  <button onClick={() => setQuery(s)}>{s}</button>
                  {i < 3 && <span style={{ margin: "0 5px", color: "var(--dark)", fontWeight: "bold" }}>-</span>}
                </span>
              ))}
            </div>

            {/* -- CAREER UNIVERSE (SEARCH INDEX) -- */}
            <div style={{
              margin: "24px 0",
              padding: 24,
              background: "#fff",
              border: "4px solid #000",
              borderRadius: 20,
              boxShadow: "var(--comic-shadow)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                <span className="build-label green" style={{ fontSize: 11, marginBottom: 0 }}>SEARCH INDEX</span>
                <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 14, color: "var(--dark)" }}>
                   {careers.length} Careers Indexed
                </span>
              </div>
              
              <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: "var(--dark)", margin: "0 0 12px 0" }}>
                Career Universe
              </h3>
              
              <p className="build-prose" style={{ marginBottom: 16, fontSize: 14, color: "#334155" }}>
                Before you can search, the system needs an index to search through. These are the careers currently stored inside our laboratory database:
              </p>

              {/* Preview List of first 5 careers */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {careers.slice(0, 5).map(c => (
                  <span key={c.id} style={{
                    fontSize: 13,
                    fontWeight: "bold",
                    background: "#f1f5f9",
                    border: "2px solid #000",
                    borderRadius: 8,
                    padding: "6px 12px",
                    boxShadow: "1.5px 1.5px 0 #000",
                    color: "var(--dark)"
                  }}>
                    {c.title}
                  </span>
                ))}
                {careers.length > 5 && (
                  <span style={{
                    fontSize: 13,
                    fontWeight: "bold",
                    background: "var(--accent-tint)",
                    border: "2px dashed #000",
                    borderRadius: 8,
                    padding: "6px 12px",
                    color: "var(--dark)"
                  }}>
                    +{careers.length - 5} more careers
                  </span>
                )}
              </div>

              <button
                className="predict-btn"
                onClick={() => setIsIndexOpen(true)}
                style={{ width: "auto", display: "inline-block", fontSize: 13, padding: "8px 16px" }}
              >
                View Full Index to
              </button>
            </div>

            {query.trim() && (
              <div className="pipeline-story animate-fadeIn">
                <div className="pipeline-step">
                  <span className="pipeline-step-label">What you typed</span>
                  <span className="pipeline-step-value">"{query}"</span>
                </div>
                <div className="pipeline-connector" />
                <div className="pipeline-step">
                  <span className="pipeline-step-label">How we cleaned it</span>
                  <span className="pipeline-step-value">"{normalized}"</span>
                </div>
                <div className="pipeline-connector" />
                <div className="pipeline-step">
                  <span className="pipeline-step-label">What we translated it to</span>
                  {aliasExpansion.matched
                    ? <span className="pipeline-step-value" style={{ color: "var(--purple)" }}>"{aliasExpansion.target}"</span>
                    : <span className="pipeline-step-value is-muted">no shortcut found</span>}
                </div>
                <div className="pipeline-connector" />
                <div className="pipeline-step">
                  <span className="pipeline-step-label">The final career we found</span>
                  {topResult
                    ? <span className="pipeline-step-value is-primary">{topResult.title}</span>
                    : <span className="pipeline-step-value is-muted">nothing matched</span>}
                </div>
              </div>
            )}

            {topResult && (
              <div className="result-card animate-fadeIn">
                <div className="result-eyebrow">
                  Best match found <span className="match-badge">{topResult.matchType}</span>
                </div>
                <h3 className="result-title">{topResult.title}</h3>
                <p className="result-reason">{getMatchReason(topResult.matchType)}</p>
                <div className="skill-tags">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Required skills for this career</p>
                  <div className="flex flex-wrap gap-2 w-full">
                    {topResult.skillsRequired.map(sk => (
                      <span key={sk} className={`skill-tag${normalized && sk.toLowerCase() === normalized ? " matched" : ""}`}>{sk}</span>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Estimated salaries</p>
                  <p className="result-salary">{topResult.avgSalaryGlobal} - {topResult.avgSalaryIndia}</p>
                </div>
              </div>
            )}

            {secondaryResults.length > 0 && (
              <div className="secondary-results animate-fadeIn" style={{ marginBottom: 24 }}>
                <p className="secondary-eyebrow">Additional matching options</p>
                {secondaryResults.map(sec => (
                  <div key={sec.id} className="secondary-result-row">
                    <span className="secondary-result-title">{sec.title}</span>
                    <span className="secondary-result-type">{sec.matchType}</span>
                  </div>
                ))}
              </div>
            )}

            {query.trim() && !topResult && (
              <div style={{ paddingTop: 48, textAlign: "center" }} className="animate-fadeIn">
                <p className="comic-title" style={{ fontSize: 24, marginBottom: 12, color: "var(--primary)" }}>We couldn't find a career for that! </p>
                <p style={{ fontSize: 18, color: "var(--dark)", fontStyle: "italic" }}>
                  Try typing another word, or choose one of the suggestions above.
                </p>
              </div>
            )}

            <div style={{ marginTop: 40, padding: 24, background: "#fff", border: "4px solid #000", borderRadius: 20, boxShadow: "var(--comic-shadow)", textAlign: "center" }}>
              <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, marginBottom: 8 }}>Ready to fix the system?</p>
              <p style={{ fontSize: 15, color: "#555", marginBottom: 16 }}>Diagnosis complete. Let's analyze the failures and plan our code fixes on the Understand tab.</p>
              <button className="predict-btn" onClick={() => setActiveTab("understand")}>Analyze Diagnosis & Plan Fixes to</button>
            </div>

            <div style={{ height: 80 }} />
          </div>
        )}

        {/* -- UNDERSTAND -- */}
        {activeTab === "understand" && (
          <div className="page-column animate-fadeIn">
            <div className="understand-intro">
              Diagnosis Complete. Let's run interactive experiments to see how NLP logic corrects messy queries before we write the code.
            </div>

            {/* CH 01 - Normalization */}
            <div style={{ paddingTop: 56 }}>
              <p className="chapter-number">01</p>
              <h3 className="chapter-question">The Picky Computer</h3>
              <p className="chapter-premise">
                <strong>Problem:</strong> Computers are incredibly literal. If you search for &ldquo; FRONTEND!!! &rdquo;, the computer searches for that exact sequence of letters, spaces, and exclamation marks. If your database only has &ldquo;Frontend Developer&rdquo;, it fails.
              </p>
              <p className="chapter-premise" style={{ marginTop: -10, marginBottom: 16 }}>
                <strong>Prediction:</strong> Should the search engine treat &ldquo; FRONTEND!!! &rdquo; and &ldquo;frontend&rdquo; as the exact same search term?
              </p>
              <div className="predict-group">
                <button className={`predict-btn${normPrediction === "match" ? " selected-yes" : ""}`} onClick={() => setNormPrediction("match")}>Hypothesis: They should match</button>
                <button className={`predict-btn${normPrediction === "mismatch" ? " selected-no" : ""}`} onClick={() => setNormPrediction("mismatch")}>Hypothesis: They should fail</button>
              </div>
              {normPrediction && (
                <div className="animate-fadeIn">
                  <div className="experiment-grid">
                    <div>
                      <p className="experiment-label">Query A</p>
                      <input className="experiment-input" value={normInputA} onChange={e => setNormInputA(e.target.value)} />
                      <p style={{ fontSize: 13, color: "var(--secondary)", marginTop: 6 }}>
                        to <code style={mono}>&ldquo;{normDetailsA}&rdquo;</code>
                      </p>
                    </div>
                    <div>
                      <p className="experiment-label">Query B</p>
                      <input className="experiment-input" value={normInputB} onChange={e => setNormInputB(e.target.value)} />
                      <p style={{ fontSize: 13, color: "var(--secondary)", marginTop: 6 }}>
                        to <code style={mono}>&ldquo;{normDetailsB}&rdquo;</code>
                      </p>
                    </div>
                  </div>
                  <div className="observation-block">
                    {doesNormMatch ? (
                      <>
                        <p className="observation-result success">✓ Observation: Same result - they match</p>
                        <p className="observation-note">Both normalize to the identical string, so the search engine treats them as one query.</p>
                      </>
                    ) : (
                      <>
                        <p className="observation-result failure">✗ Observation: Still different</p>
                        <p className="observation-note">The strings differ after cleaning. Try making them closer.</p>
                      </>
                    )}
                  </div>
                  <div className="explanation-block">
                    <p className="explanation-label">Explanation</p>
                    <p className="explanation-what">What happened</p>
                    <p className="explanation-prose">
                      We run every search query through a vacuum cleaner before looking it up. We make all letters lowercase, strip trailing spaces, and erase punctuation. That way, &ldquo; FRONTEND!!! &rdquo; and &ldquo;frontend&rdquo; look identical to the computer.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="chapter-separator" />

            {/* CH 02 - Alias Expansion */}
            <div>
              <p className="chapter-number">02</p>
              <h3 className="chapter-question">Speaking in Code</h3>
              <p className="chapter-premise">
                <strong>Problem:</strong> People search using shortcuts. Nobody types out &ldquo;Artificial Intelligence Engineer&rdquo; when they can just type &ldquo;ml&rdquo; or &ldquo;ai&rdquo;. But if &ldquo;ml&rdquo; doesn't appear in the job title, how does the computer find it?
              </p>
              <p className="chapter-premise" style={{ marginTop: -10, marginBottom: 16 }}>
                <strong>Prediction:</strong> Can a two-letter shortcut successfully lead you to a full career profile?
              </p>
              <div className="predict-group">
                <button className={`predict-btn${aliasPrediction === "match" ? " selected-yes" : ""}`} onClick={() => setAliasPrediction("match")}>Hypothesis: ml finds AI Engineer</button>
                <button className={`predict-btn${aliasPrediction === "mismatch" ? " selected-no" : ""}`} onClick={() => setAliasPrediction("mismatch")}>Hypothesis: ml finds nothing</button>
              </div>
              {aliasPrediction && (
                <div className="animate-fadeIn">
                  <div className="experiment-single">
                    <p className="experiment-label">Type a shortcut (ml, react, aws, docker)</p>
                    <input className="experiment-input" value={aliasInput} onChange={e => setAliasInput(e.target.value)} placeholder="ml" />
                  </div>
                  <div className="observation-block">
                    {aliasDetails.matchedVal ? (
                      <>
                        <p className="observation-result success">✓ Observation: Alias found</p>
                        <p className="observation-note">
                          <code style={mono}>&ldquo;{aliasInput}&rdquo;</code> maps to{" "}
                          <code style={{ ...mono, color: "var(--purple)" }}>&ldquo;{aliasDetails.matchedVal}&rdquo;</code> - the engine searches that instead.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="observation-result failure">✗ Observation: No alias found</p>
                        <p className="observation-note">Not in the dictionary. Try ml, react, aws, or docker.</p>
                      </>
                    )}
                  </div>
                  <div className="explanation-block">
                    <p className="explanation-label">Explanation</p>
                    <p className="explanation-what">What happened</p>
                    <p className="explanation-prose">
                      We keep a secret translator dictionary behind the scenes. When you type &ldquo;ml&rdquo;, the engine looks it up, finds &ldquo;ai engineer&rdquo;, and silently performs the search using the full title instead of your abbreviation.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="chapter-separator" />

            {/* CH 03 - Fuzzy Matching */}
            <div>
              <p className="chapter-number">03</p>
              <h3 className="chapter-question">The Human Element</h3>
              <p className="chapter-premise">
                <strong>Problem:</strong> We all make typos. Typing &ldquo;frontnd&rdquo; instead of &ldquo;frontend&rdquo; usually results in &ldquo;0 results found&rdquo; in basic systems because a single missing letter breaks a perfect string match.
              </p>
              <p className="chapter-premise" style={{ marginTop: -10, marginBottom: 16 }}>
                <strong>Prediction:</strong> Can a computer count the difference between two words and still guess the right one?
              </p>
              <div className="predict-group">
                <button className={`predict-btn${fuzzyPrediction === "match" ? " selected-yes" : ""}`} onClick={() => setFuzzyPrediction("match")}>Hypothesis: Typo should match</button>
                <button className={`predict-btn${fuzzyPrediction === "mismatch" ? " selected-no" : ""}`} onClick={() => setFuzzyPrediction("mismatch")}>Hypothesis: Typo should fail</button>
              </div>
              {fuzzyPrediction && (
                <div className="animate-fadeIn">
                  <div className="experiment-single">
                    <p className="experiment-label">Type a typo (target: &ldquo;frontend&rdquo;)</p>
                    <input className="experiment-input" value={fuzzyInput} onChange={e => setFuzzyInput(e.target.value)} placeholder="frontnd" />
                  </div>
                  <div className="observation-block">
                    <div className="char-grid-row">
                      <span className="char-grid-label">Target</span>
                      <div className="char-grid-cells">
                        {fuzzyVisualDiff.targetAlign.map((ch, i) => (
                          <span key={i} className={`char-cell ${ch === "-" ? "missing" : ch === fuzzyVisualDiff.inputAlign[i] ? "match" : "diff"}`}>
                            {ch === "-" ? "-" : ch}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="char-grid-row" style={{ marginBottom: 16 }}>
                      <span className="char-grid-label">You typed</span>
                      <div className="char-grid-cells">
                        {fuzzyVisualDiff.inputAlign.map((ch, i) => (
                          <span key={i} className={`char-cell ${ch === "-" ? "extra" : ch === fuzzyVisualDiff.targetAlign[i] ? "match" : "diff"}`}>
                            {ch === "-" ? "-" : ch}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--secondary)" }}>
                      Observation: {fuzzyIntuition.distance} edit{fuzzyIntuition.distance !== 1 ? "s" : ""}{" "}
                      <span style={{ fontWeight: 400, color: "var(--dark)" }}>- {fuzzyIntuition.analysis}</span>
                    </p>
                  </div>
                  <div className="explanation-block">
                    <p className="explanation-label">Explanation</p>
                    <p className="explanation-what">What happened</p>
                    <p className="explanation-prose">
                      The search engine measures the &ldquo;distance&rdquo; between what you typed and our career list by counting the insertions, deletions, or substitutions needed. If the difference is small enough, the computer declares it a match.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="chapter-separator" />

            {/* CH 04 - Ranking */}
            <div>
              <p className="chapter-number">04</p>
              <h3 className="chapter-question">The Battle for First Place</h3>
              <p className="chapter-premise">
                <strong>Problem:</strong> If a user searches for &ldquo;frontend&rdquo;, several careers might match: &ldquo;Frontend Developer&rdquo; (exact title match), &ldquo;AI Engineer&rdquo; (mentions &ldquo;frontend&rdquo; in its skills list), and &ldquo;Backend Developer&rdquo; (fuzzy match for typos). Which one should be shown first?
              </p>
              <p className="chapter-premise" style={{ marginTop: -10, marginBottom: 16 }}>
                <strong>Prediction:</strong> Which match type is the most relevant and deserves the top spot?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { k: "exact", label: "Exact title match - \"Frontend Developer\"" },
                  { k: "skill", label: "Skill tag - a career lists \"frontend\" as a required skill" },
                  { k: "fuzzy", label: "Fuzzy match - typo \"frontnd\" corrected to the title" },
                ].map(o => (
                  <button key={o.k} onClick={() => setRankingPrediction(o.k)}
                    className={`predict-btn${rankingPrediction === o.k ? (o.k === "exact" ? " selected-yes" : " selected-no") : ""}`}
                    style={{ textAlign: "left" }}>
                    {o.label}
                  </button>
                ))}
              </div>
              {rankingPrediction && (
                <div className="animate-fadeIn" style={{ marginTop: 16 }}>
                  <div className="observation-block">
                    {rankingPrediction === "exact" ? (
                      <>
                        <p className="observation-result success">✓ Observation: Exact match wins</p>
                        <p className="observation-note">Exact title matches represent perfect intent and must always sort to position one.</p>
                      </>
                    ) : (
                      <>
                        <p className="observation-result failure">✗ Observation: Not quite</p>
                        <p className="observation-note">Exact title matches always outrank skill tags and fuzzy corrections. Users expect the career they named to appear first.</p>
                      </>
                    )}
                    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Visual Priority Sorting (Top to Bottom):</p>
                      
                      <div className="ranking-priority-row" style={{ background: "#f0fdf4" }}>
                        <div>
                          <span style={{ fontWeight: "bold", fontSize: 15, color: "#166534" }}>Frontend Developer</span>
                          <span style={{ display: "block", fontSize: 12, color: "#16a34a" }}>Match Type: Exact Title Match</span>
                        </div>
                        <span style={{ fontWeight: "bold", color: "#166534", fontSize: 13 }}>↑ Moves to Top</span>
                      </div>
 
                      <div className="ranking-priority-row" style={{ background: "#fff" }}>
                        <div>
                          <span style={{ fontWeight: "bold", fontSize: 15, color: "#334155" }}>Fullstack Engineer</span>
                          <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>Match Type: Skill Tag Match</span>
                        </div>
                        <span style={{ fontWeight: "bold", color: "#64748b", fontSize: 13 }}>v Lower Priority</span>
                      </div>
 
                      <div className="ranking-priority-row" style={{ background: "#fff", opacity: 0.7 }}>
                        <div>
                          <span style={{ fontWeight: "bold", fontSize: 15, color: "#334155" }}>Backend Developer</span>
                          <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>Match Type: Fuzzy Typo Match</span>
                        </div>
                        <span style={{ fontWeight: "bold", color: "#94a3b8", fontSize: 13 }}>v Moves Lower</span>
                      </div>
                    </div>
                  </div>
                  <div className="explanation-block">
                    <p className="explanation-label">Explanation</p>
                    <p className="explanation-what">What happened?</p>
                    <p className="explanation-prose" style={{ marginBottom: 12 }}>
                      When a user searches "frontend", the engine retrieves multiple careers but groups and sorts them based on match categories rather than raw typo scores.
                    </p>
                    <p className="explanation-what">Why did it happen?</p>
                    <p className="explanation-prose" style={{ marginBottom: 12 }}>
                      The system assigns relevance weights to different match areas: exact title matches are weighted highest, followed by synonyms/aliases, sub-skills, and finally distant typo matches.
                    </p>
                    <p className="explanation-what">Why does it matter?</p>
                    <p className="explanation-prose">
                      This ensures high-intent matches (like an exact title match for "Frontend Developer") are never buried under accidental skill mentions or corrected typos, giving users the most logical results first.
                    </p>
                  </div>
                </div>
              )}

            </div>
            <div style={{ height: 80 }} />
          </div>
        )}

        {/* -- BUILD -- */}
        {activeTab === "build" && (
          <div className="page-column animate-fadeIn">
            <div className="build-hero">
              <span className="build-label blue" style={{ marginBottom: 20 }}>Phase 3: Repair</span>
              <h2 className="build-hero-title">Repair the Search Pipeline</h2>
              <p className="build-hero-sub">Apply code fixes for all 5 pipeline failures you diagnosed to unlock the final production search engine.</p>
            </div>

            <div className="part-tabs" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 32 }}>
              {[
                { i: 0, l: "Part A - Career Data" },
                { i: 1, l: "Part B - Normalize Query" },
                { i: 2, l: "Part C - Expand Aliases" },
                { i: 3, l: "Part D - Fuzzy Matching" },
                { i: 4, l: "Part E - Ranking Engine" },
                ...((unlockedParts["E"] || buildStep === 5) ? [{ i: 5, l: " Lab Complete" }] : [])
              ].map(p => (
                <button
                  key={p.i}
                  className={`part-tab${buildStep === p.i ? " active" : ""}`}
                  onClick={() => setBuildStep(p.i)}
                  style={{ flex: "1 1 auto", minWidth: 100 }}
                >
                  {p.l}
                </button>
              ))}
            </div>

            {/* PART A: CREATE CAREER DATA */}
            {buildStep === 0 && (
              <div className="animate-fadeIn">
                <span className="build-label blue">Problem</span>
                <p className="build-prose">Search engines cannot return results if there is nothing to search. As seen in Challenge #04 (Battle for First Place), a database must exist before we can weigh its components.</p>

                <span className="build-label gray" style={{ marginTop: 24 }}>Mission</span>
                <p className="build-prose">Select careers below to initialize the database.</p>

                <span className="build-try-label">Try it</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  {["Frontend Engineer", "AI Engineer", "Backend Developer", "DevOps Engineer"].map(c => {
                    const isSelected = selectedDbCareers.includes(c);
                    return (
                      <button
                        key={c}
                        onClick={() => {
                          const next = selectedDbCareers.includes(c)
                            ? selectedDbCareers.filter(t => t !== c)
                            : [...selectedDbCareers, c];
                          setSelectedDbCareers(next);
                          if (next.length > 0) triggerUnlock("A");
                        }}
                        style={{
                          padding: "10px 16px",
                          borderRadius: 8,
                          fontWeight: "bold",
                          border: "3px solid #000",
                          background: isSelected ? "var(--accent)" : "#fff",
                          color: "#000",
                          boxShadow: isSelected ? "2px 2px 0px #000" : "4px 4px 0px #000",
                          transform: isSelected ? "translate(2px, 2px)" : "none",
                          transition: "all 0.1s ease",
                          cursor: "pointer"
                        }}
                      >
                        {isSelected ? "✓ " : "+ "} {c}
                      </button>
                    );
                  })}
                </div>

                <span className="build-try-label">Output Console</span>
                <pre
                  className="build-output-console"
                  style={{
                    background: "#1e293b",
                    color: "#38bdf8",
                    padding: 16,
                    borderRadius: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    border: "2px solid #000",
                    boxShadow: "2px 2px 0 #000",
                    marginBottom: 24,
                    overflowX: "auto"
                  }}
                >
                  {buildStepOutput}
                </pre>

                <div className="build-breaks">
                  <span className="build-label red">What breaks if removed?</span>
                  <p className="build-breaks-text">Search always returns empty results.</p>
                </div>

                {/* CODE REWARD */}
                {selectedDbCareers.length > 0 ? (
                  <div className="animate-fadeIn" style={{ marginTop: 24 }}>
                    <span className="build-label green"> Reward: Real Code Unlocked!</span>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#64748b', fontWeight: 'bold', margin: '8px 0' }}>File: lib/seed-careers.ts</div>
                    <pre style={{
                      background: "#0f172a",
                      color: "#fff",
                      padding: 16,
                      borderRadius: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      border: "2px solid #000",
                      boxShadow: "2px 2px 0 #000",
                      marginTop: 8,
                      overflowX: "auto"
                    }}>
{`export interface Career {
  id: string;
  title: string;
  slug: string;
  field: string;
  subfield: string;
  description: string;
  shortDescription: string;
  skillsRequired: string[];
  aliases: string[];
}

export const careers: Career[] = [
  {
    id: "career-1",
    title: "Frontend Developer",
    slug: "frontend-developer",
    field: "Technology",
    subfield: "Web Development",
    description: "Build web applications using React, HTML, CSS, and modern web standards.",
    shortDescription: "Build frontend web applications.",
    skillsRequired: ["react", "javascript", "html", "css", "typescript"],
    aliases: ["frontend developer", "frontend engineer", "react developer", "ui developer"]
  }
];`}
                    </pre>

                    <div className="observation-block" style={{ background: "#f0fff4", borderColor: "var(--green)", marginTop: 20 }}>
                      <p className="observation-result success">✓ Database Seeded!</p>
                      <p className="observation-note" style={{ color: "#000" }}>Database created. The engine now has information to search.</p>
                    </div>
                    <button 
                      className="predict-btn" 
                      onClick={() => {
                        setBuildStep(1);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      style={{ marginTop: 16 }}
                    >
                      Continue to Part B to
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: 24,
                    border: "2px dashed #000",
                    borderRadius: 12,
                    textAlign: "center",
                    color: "#64748b",
                    fontWeight: "bold",
                    marginTop: 24
                  }}>
                     Initialize the database above to verify your code patch!
                  </div>
                )}
              </div>
            )}

            {/* PART B: NORMALIZE QUERY */}
            {buildStep === 1 && (
              <div className="animate-fadeIn">
                <span className="build-label blue">Problem</span>
                <p className="build-prose">Remember Challenge #01 (The Picky Computer)? You saw how punctuation like &quot;!!!&quot; breaks naive matching. Let&apos;s build the cleaning step.</p>

                <span className="build-label gray" style={{ marginTop: 24 }}>Mission</span>
                <p className="build-prose">Implement a string cleaning function to remove formatting noise.</p>

                <span className="build-try-label">Try it</span>
                <input
                  className="build-input"
                  value={buildCleanInput}
                  onChange={e => {
                    setBuildCleanInput(e.target.value);
                    if (e.target.value.trim()) triggerUnlock("B");
                  }}
                  placeholder="Type messy search (e.g. FRONTEND!!!)"
                  style={{ marginBottom: 16 }}
                />

                <span className="build-try-label">Output Console</span>
                <pre
                  className="build-output-console"
                  style={{
                    background: "#1e293b",
                    color: "#38bdf8",
                    padding: 16,
                    borderRadius: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    border: "2px solid #000",
                    boxShadow: "2px 2px 0 #000",
                    marginBottom: 24,
                    overflowX: "auto"
                  }}
                >
                  {buildStepOutput}
                </pre>

                <div className="build-breaks">
                  <span className="build-label red">What breaks if removed?</span>
                  <p className="build-breaks-text">Spaces, Capitalization, and Punctuation all create unnecessary failures.</p>
                </div>

                {/* CODE REWARD */}
                {buildCleanInput.trim() ? (
                  <div className="animate-fadeIn" style={{ marginTop: 24 }}>
                    <span className="build-label green"> Reward: Real Code Unlocked!</span>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#64748b', fontWeight: 'bold', margin: '8px 0' }}>File: lib/search.ts</div>
                    <pre style={{
                      background: "#0f172a",
                      color: "#fff",
                      padding: 16,
                      borderRadius: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      border: "2px solid #000",
                      boxShadow: "2px 2px 0 #000",
                      marginTop: 8,
                      overflowX: "auto"
                    }}>
{`export function normalizeQuery(query: string): string {
  if (!query) return "";
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\\w\\s\\-]/g, "")
    .replace(/[\\s\\-_]+/g, " ");
}`}
                    </pre>

                    <div className="observation-block" style={{ background: "#f0fff4", borderColor: "var(--green)", marginTop: 20 }}>
                      <p className="observation-result success">✓ Normalizer Active!</p>
                      <p className="observation-note" style={{ color: "#000" }}>Query normalized. The engine now understands formatting noise.</p>
                    </div>
                    <button 
                      className="predict-btn" 
                      onClick={() => {
                        setBuildStep(2);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      style={{ marginTop: 16 }}
                    >
                      Continue to Part C to
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: 24,
                    border: "2px dashed #000",
                    borderRadius: 12,
                    textAlign: "center",
                    color: "#64748b",
                    fontWeight: "bold",
                    marginTop: 24
                  }}>
                     Input a test query in the Console to verify your code patch!
                  </div>
                )}
              </div>
            )}

            {/* PART C: EXPAND ALIASES */}
            {buildStep === 2 && (
              <div className="animate-fadeIn">
                <span className="build-label blue">Problem</span>
                <p className="build-prose">Remember Challenge #02 (Speaking in Code)? You predicted that a user typing slang like &quot;ml&quot; still wants to see an AI Engineer profile. Here is how we map those tags.</p>

                <span className="build-label gray" style={{ marginTop: 24 }}>Mission</span>
                <p className="build-prose">Set up alias mapping to handle synonyms and shortcuts.</p>

                <span className="build-try-label">Try it</span>
                <input
                  className="build-input"
                  value={buildAliasInput}
                  onChange={e => {
                    setBuildAliasInput(e.target.value);
                    if (e.target.value.trim()) triggerUnlock("C");
                  }}
                  placeholder="Type an alias shortcut (e.g. ml)"
                  style={{ marginBottom: 16 }}
                />

                <span className="build-try-label">Output Console</span>
                <pre
                  className="build-output-console"
                  style={{
                    background: "#1e293b",
                    color: "#38bdf8",
                    padding: 16,
                    borderRadius: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    border: "2px solid #000",
                    boxShadow: "2px 2px 0 #000",
                    marginBottom: 24,
                    overflowX: "auto"
                  }}
                >
                  {buildStepOutput}
                </pre>

                <div className="build-breaks">
                  <span className="build-label red">What breaks if removed?</span>
                  <p className="build-breaks-text">Users must know exact titles. Shortcuts fail.</p>
                </div>

                {/* CODE REWARD */}
                {buildAliasInput.trim() ? (
                  <div className="animate-fadeIn" style={{ marginTop: 24 }}>
                    <span className="build-label green"> Reward: Real Code Unlocked!</span>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#64748b', fontWeight: 'bold', margin: '8px 0' }}>File: lib/search.ts</div>
                    <pre style={{
                      background: "#0f172a",
                      color: "#fff",
                      padding: 16,
                      borderRadius: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      border: "2px solid #000",
                      boxShadow: "2px 2px 0 #000",
                      marginTop: 8,
                      overflowX: "auto"
                    }}>
{`import Fuse from "fuse.js";
import { careers } from "./seed-careers";

export const SEARCH_ALIASES: Record<string, string> = {
  "frontend": "frontend developer",
  "react": "frontend developer",
  "ml": "ai engineer",
  "ai": "ai engineer",
  "python": "backend developer",
  "pyhton": "backend developer",
  "docker": "devops engineer",
  "aws": "devops engineer"
};

const options = {
  keys: [
    { name: "title", weight: 0.5 },
    { name: "aliases", weight: 0.4 },
    { name: "skillsRequired", weight: 0.3 },
    { name: "description", weight: 0.1 }
  ],
  threshold: 0.5,
  includeScore: true
};

export const searchEngine = new Fuse(careers, options);`}
                    </pre>

                    <div className="observation-block" style={{ background: "#f0fff4", borderColor: "var(--green)", marginTop: 20 }}>
                      <p className="observation-result success">✓ Alias Expansion Operational!</p>
                      <p className="observation-note" style={{ color: "#000" }}>Alias system activated. The engine now understands shorthand language.</p>
                    </div>
                    <button 
                      className="predict-btn" 
                      onClick={() => {
                        setBuildStep(3);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      style={{ marginTop: 16 }}
                    >
                      Continue to Part D to
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: 24,
                    border: "2px dashed #000",
                    borderRadius: 12,
                    textAlign: "center",
                    color: "#64748b",
                    fontWeight: "bold",
                    marginTop: 24
                  }}>
                     Input a test query in the Console to verify your code patch!
                  </div>
                )}
              </div>
            )}

            {/* PART D: FUZZY MATCHING */}
            {buildStep === 3 && (
              <div className="animate-fadeIn">
                <span className="build-label blue">Problem</span>
                <p className="build-prose">Remember Challenge #03 (The Human Element)? You discovered how typo tolerance shields the system from spelling slips like &quot;frontnd&quot;. Let&apos;s tune that flexibility dial.</p>

                <span className="build-label gray" style={{ marginTop: 24 }}>Mission</span>
                <p className="build-prose">Configure typo tolerance by adjusting the match threshold.</p>

                <span className="build-try-label">Try it</span>
                <input
                  className="build-input"
                  value={buildFuzzyInput}
                  onChange={e => {
                    setBuildFuzzyInput(e.target.value);
                    if (e.target.value.trim()) triggerUnlock("D");
                  }}
                  placeholder="Type a spelling mistake (e.g. frontnd)"
                  style={{ marginBottom: 16 }}
                />

                <span className="build-try-label">Output Console</span>
                <pre
                  className="build-output-console"
                  style={{
                    background: "#1e293b",
                    color: "#38bdf8",
                    padding: 16,
                    borderRadius: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    border: "2px solid #000",
                    boxShadow: "2px 2px 0 #000",
                    marginBottom: 24,
                    overflowX: "auto"
                  }}
                >
                  {buildStepOutput}
                </pre>

                <div className="build-breaks">
                  <span className="build-label red">What breaks if removed?</span>
                  <p className="build-breaks-text">Every typo becomes zero results.</p>
                </div>

                {/* CODE REWARD */}
                {buildFuzzyInput.trim() ? (
                  <div className="animate-fadeIn" style={{ marginTop: 24 }}>
                    <span className="build-label green"> Reward: Real Code Unlocked!</span>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#64748b', fontWeight: 'bold', margin: '8px 0' }}>File: lib/search.ts (Updated)</div>
                    <p style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>Update the configuration in the existing search file to increase typo sensitivity:</p>
                    <pre style={{
                      background: "#0f172a",
                      color: "#fff",
                      padding: 16,
                      borderRadius: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      border: "2px solid #000",
                      boxShadow: "2px 2px 0 #000",
                      marginTop: 8,
                      overflowX: "auto"
                    }}>
{`const options = {
  keys: [
    { name: "title", weight: 0.5 },
    { name: "aliases", weight: 0.4 },
    { name: "skillsRequired", weight: 0.3 },
    { name: "description", weight: 0.1 },
  ],
  threshold: 0.3, // Authentic production-level typo sensitivity (0 = exact, 1 = matches anything)
  includeScore: true,
};

export const searchEngine = new Fuse(careers, options);`}
                    </pre>

                    <div className="observation-block" style={{ background: "#f0fff4", borderColor: "var(--green)", marginTop: 20 }}>
                      <p className="observation-result success">✓ Fuzzy Matching Calibrated!</p>
                      <p className="observation-note" style={{ color: "#000" }}>Fuzzy matching enabled. The engine now forgives human mistakes.</p>
                    </div>
                    <button 
                      className="predict-btn" 
                      onClick={() => {
                        setBuildStep(4);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      style={{ marginTop: 16 }}
                    >
                      Continue to Part E to
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: 24,
                    border: "2px dashed #000",
                    borderRadius: 12,
                    textAlign: "center",
                    color: "#64748b",
                    fontWeight: "bold",
                    marginTop: 24
                  }}>
                     Input a test query in the Console to verify your code patch!
                  </div>
                )}
              </div>
            )}

            {/* PART E: RANKING ENGINE */}
            {buildStep === 4 && (
              <div className="animate-fadeIn">
                <span className="build-label blue">Problem</span>
                <p className="build-prose">Remember Challenge #04 (Battle for First Place)? You deduced that exact matches in the job title must rank higher than deep keyword tags. Let&apos;s set the mathematical weights.</p>

                <span className="build-label gray" style={{ marginTop: 24 }}>Mission</span>
                <p className="build-prose">Adjust weights and multipliers to ensure the most relevant career ranks first.</p>

                <span className="build-try-label">Try it</span>
                <input
                  className="build-input"
                  value={buildRankInput}
                  onChange={e => {
                    setBuildRankInput(e.target.value);
                    if (e.target.value.trim()) triggerUnlock("E");
                  }}
                  placeholder="Type a term to rank results (e.g. frontend)"
                  style={{ marginBottom: 16 }}
                />

                <span className="build-try-label">Output Console</span>
                <pre
                  className="build-output-console"
                  style={{
                    background: "#1e293b",
                    color: "#38bdf8",
                    padding: 16,
                    borderRadius: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    border: "2px solid #000",
                    boxShadow: "2px 2px 0 #000",
                    marginBottom: 24,
                    overflowX: "auto"
                  }}
                >
                  {buildStepOutput}
                </pre>

                <div className="build-breaks">
                  <span className="build-label red">What breaks if removed?</span>
                  <p className="build-breaks-text">Weak matches may outrank exact matches. Results feel random.</p>
                </div>

                {/* CODE REWARD */}
                {buildRankInput.trim() ? (
                  <div className="animate-fadeIn" style={{ marginTop: 24 }}>
                    <span className="build-label green"> Reward: Real Code Unlocked!</span>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#64748b', fontWeight: 'bold', margin: '8px 0' }}>File: lib/search.ts (Final)</div>
                    <p style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>The complete searchCareers function - normalizes, expands aliases, runs Fuse, then ranks by match type:</p>
                    <pre style={{
                      background: "#0f172a",
                      color: "#fff",
                      padding: 16,
                      borderRadius: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      border: "2px solid #000",
                      boxShadow: "2px 2px 0 #000",
                      marginTop: 8,
                      overflowX: "auto"
                    }}>
{`export function searchCareers(query: string): SearchResultCareer[] {
  const normalized = normalizeQuery(query);

  // Alias expansion
  let expandedQuery = normalized;
  let isAliasMatch = false;
  let matchedTarget = "";

  for (const [key, value] of Object.entries(SEARCH_ALIASES)) {
    if (normalized === key || normalized.includes(key)) {
      matchedTarget = value;
      isAliasMatch = true;
      break;
    }
  }

  // Run Fuse.js fuzzy search
  const fuse = new Fuse(careers, options);
  const fuseResults = fuse.search(isAliasMatch ? matchedTarget : normalized);

  // Classify match type and apply score multiplier
  const results = fuseResults.map((res) => {
    const item = res.item;
    const score = res.score ?? 1.0;
    let matchType = "fuzzy";
    let scoreMultiplier = 1.0;

    const lowerTitle = item.title.toLowerCase();
    const lowerSlug = item.slug.toLowerCase();

    // 1. Exact Match to strongest boost
    if (lowerTitle === normalized || lowerSlug === normalized) {
      matchType = "exact";
      scoreMultiplier = 0.01;
    }
    // 2. Prefix Match
    else if (lowerTitle.startsWith(normalized) || lowerSlug.startsWith(normalized)) {
      matchType = "prefix";
      scoreMultiplier = 0.1;
    }
    // 3. Alias Match
    else if (isAliasMatch && lowerTitle === matchedTarget) {
      matchType = "alias";
      scoreMultiplier = 0.05;
    }
    // 4. Skill Match
    else if (item.skillsRequired.some(skill => skill.toLowerCase() === normalized)) {
      matchType = "skill";
      scoreMultiplier = 0.2;
    }

    return { ...item, matchType, adjustedScore: score * scoreMultiplier };
  });

  // Sort by adjusted score (lower = more relevant)
  return results.sort((a, b) => a.adjustedScore - b.adjustedScore);
}`}
                    </pre>

                    <div className="observation-block" style={{ background: "#f0fff4", borderColor: "var(--green)", marginTop: 20 }}>
                      <p className="observation-result success">✓ Ranking Engine Active!</p>
                      <p className="observation-note" style={{ color: "#000" }}>Ranking activated. The most relevant result now appears first.</p>
                    </div>
                    <button 
                      className="predict-btn" 
                      onClick={() => {
                        setBuildStep(5);
                        confettiRef.current?.fire({ particleCount: 150, spread: 80 });
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      style={{ marginTop: 16 }}
                    >
                      Complete Lab to
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: 24,
                    border: "2px dashed #000",
                    borderRadius: 12,
                    textAlign: "center",
                    color: "#64748b",
                    fontWeight: "bold",
                    marginTop: 24
                  }}>
                     Input a test query in the Console to verify your code patch!
                  </div>
                )}
              </div>
            )}
            {buildStep === 5 && (
              <div className="animate-fadeIn">
                {/*  SUCCESS / COMPLETION PANEL */}
                <div style={{
                  background: "#fff",
                  border: "4px solid #000",
                  borderRadius: 20,
                  padding: 32,
                  boxShadow: "var(--comic-shadow-lg)",
                  textAlign: "center",
                  marginBottom: 32
                }}>
                  <span className="build-label green" style={{ fontSize: 13, marginBottom: 16 }}>COMPLETED</span>
                  <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 36, color: "var(--dark)", textShadow: "2px 2px 0 var(--accent)", marginBottom: 12 }}>
                     Lab Complete
                  </h2>
                  <p style={{ fontFamily: "'Comic Neue', cursive", fontSize: 18, fontWeight: "bold", color: "#334155", marginBottom: 24 }}>
                    You successfully rebuilt a search engine.
                  </p>

                  <div style={{
                    background: "#f8fafc",
                    border: "3px solid #000",
                    borderRadius: 16,
                    padding: 20,
                    maxWidth: 400,
                    margin: "0 auto 24px",
                    boxShadow: "4px 4px 0 #000",
                    textAlign: "left"
                  }}>
                    <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, color: "var(--dark)", marginBottom: 12, borderBottom: "2px dashed #000", paddingBottom: 6 }}>
                      Core concepts mastered:
                    </p>
                    <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
                      <li style={{ fontSize: 15, fontWeight: "bold", display: "flex", alignItems: "center", gap: 8, color: "var(--green)" }}>
                        ✓ <span style={{ color: "var(--dark)" }}>Normalization</span>
                      </li>
                      <li style={{ fontSize: 15, fontWeight: "bold", display: "flex", alignItems: "center", gap: 8, color: "var(--green)" }}>
                        ✓ <span style={{ color: "var(--dark)" }}>Alias Expansion</span>
                      </li>
                      <li style={{ fontSize: 15, fontWeight: "bold", display: "flex", alignItems: "center", gap: 8, color: "var(--green)" }}>
                        ✓ <span style={{ color: "var(--dark)" }}>Fuzzy Matching</span>
                      </li>
                      <li style={{ fontSize: 15, fontWeight: "bold", display: "flex", alignItems: "center", gap: 8, color: "var(--green)" }}>
                        ✓ <span style={{ color: "var(--dark)" }}>Ranking</span>
                      </li>
                    </ul>
                  </div>

                  <div style={{ display: "inline-block", background: "var(--accent-tint)", border: "2px solid #000", padding: "10px 20px", borderRadius: 10, fontWeight: "bold", fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
                    Human Language to Structured Understanding System
                  </div>
                </div>

                {/*  BEYOND THIS LAB (ADVANCED CONCEPT CARDS) */}
                <div style={{
                  background: "#fff",
                  border: "4px solid #000",
                  borderRadius: 20,
                  padding: 28,
                  boxShadow: "var(--comic-shadow)",
                  marginBottom: 32
                }}>
                  <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 24, color: "var(--dark)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                     Beyond This Lab
                  </h3>
                  <p style={{ fontFamily: "'Comic Neue', cursive", fontSize: 15, fontWeight: "bold", color: "#64748b", marginBottom: 24 }}>
                    Ready to take your search engine further? Here are the advanced NLP concepts production systems use:
                  </p>

                  {/* Concept Selector */}
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginBottom: "24px"
                  }}>
                    {CONCEPTS.map(c => {
                      const isActive = selectedConcept === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedConcept(c.id)}
                          style={{
                            flex: "1 1 calc(33.33% - 8px)",
                            minWidth: "140px",
                            fontFamily: "'Fredoka One', cursive",
                            fontSize: "13px",
                            padding: "10px 14px",
                            border: "3px solid #000",
                            borderRadius: "12px",
                            background: isActive ? c.bg : "#fff",
                            color: isActive ? c.titleColor : "var(--dark)",
                            boxShadow: isActive ? "2px 2px 0 #000" : "4px 4px 0 #000",
                            transform: isActive ? "translate(2px, 2px)" : "none",
                            transition: "all 0.1s ease",
                            cursor: "pointer",
                            textAlign: "center"
                          }}
                        >
                          <span style={{ display: "block", fontSize: "9px", textTransform: "uppercase", color: isActive ? c.titleColor : "#888", marginBottom: "2px" }}>
                            {c.level}
                          </span>
                          {c.id === "ner" ? "NER" : c.id === "tfidf" ? "TF-IDF" : c.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Card */}
                  {(() => {
                    const c = CONCEPTS.find(x => x.id === selectedConcept);
                    if (!c) return null;
                    return (
                      <div
                        className="animate-fadeIn"
                        style={{
                          background: c.bg,
                          border: "3px solid #000",
                          borderRadius: 16,
                          padding: 24,
                          boxShadow: "4px 4px 0 #000",
                          display: "flex",
                          flexDirection: "column",
                          gap: 16
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                          <span className="build-label gray" style={{ fontSize: 10, margin: 0, width: "fit-content", background: c.labelBg, color: "#fff" }}>
                            {c.level}
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: "bold", color: c.titleColor }}>
                            Advanced NLP Concept
                          </span>
                        </div>

                        <div>
                          <h4 style={{ fontFamily: "'Fredoka One', cursive", fontSize: "20px", color: c.titleColor, margin: "0 0 8px 0" }}>
                            {c.name}
                          </h4>
                          
                          <p style={{ fontSize: "14px", color: c.textColor, lineHeight: "1.5", margin: "0 0 16px 0" }}>
                            {c.what}
                          </p>

                          {/* Example Box */}
                          <div style={{ marginBottom: "16px" }}>
                            <p style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: "bold", color: c.titleColor, letterSpacing: "0.04em", marginBottom: "6px" }}>
                              Example:
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255, 255, 255, 0.4)", border: "1.5px solid #000", borderRadius: "8px", padding: "6px 12px", width: "fit-content" }}>
                              {c.example}
                            </div>
                          </div>

                          {/* Why it matters */}
                          <div style={{ marginBottom: "16px" }}>
                            <p style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: "bold", color: c.titleColor, letterSpacing: "0.04em", marginBottom: "4px" }}>
                              Why does it matter?
                            </p>
                            <p style={{ fontSize: "13px", color: c.textColor, lineHeight: "1.5", margin: 0 }}>
                              {c.why}
                            </p>
                          </div>

                          {/* Where is it used */}
                          <div style={{ marginBottom: "16px" }}>
                            <p style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: "bold", color: c.titleColor, letterSpacing: "0.04em", marginBottom: "6px" }}>
                              Where is it used?
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {c.usedIn.map(app => (
                                <span key={app} style={{ fontSize: "10px", fontWeight: "bold", background: "#fff", border: "1.5px solid #000", borderRadius: "6px", padding: "3px 8px", boxShadow: "1.5px 1.5px 0 #000", color: c.textColor }}>
                                  {app}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Learn Next */}
                          <div style={{ borderTop: "2px dashed rgba(0, 0, 0, 0.1)", paddingTop: "12px", marginTop: "16px" }}>
                            <p style={{ fontSize: "12.5px", fontStyle: "italic", color: c.titleColor, margin: 0 }}>
                              <strong>Learn next:</strong> {c.learnNext}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            <div style={{ height: 80 }} />
          </div>
        )}

        {/* -- APPLY -- */}
        {activeTab === "apply" && (
          <div className="page-column animate-fadeIn">
            <div className="build-hero">
              <span className="build-label blue" style={{ marginBottom: 20 }}>Phase 4: Apply</span>
              <h2 className="build-hero-title">Apply — Build Your Own Search Experience</h2>
              <p className="build-hero-sub">Create your own tiny search engine using everything you've learned.</p>
            </div>

            <div style={{ background: "#fff", border: "4px solid #000", borderRadius: 20, padding: 24, boxShadow: "var(--comic-shadow)", marginBottom: 32 }}>
              <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, marginBottom: 16 }}>1. Choose a dataset</h3>
              {/* Desktop Button Grid */}
              <div className="hidden md:flex flex-wrap" style={{ gap: 10 }}>
                {Object.keys(APPLY_DATASETS).map(ds => {
                  const emojis: Record<string, string> = { Movies: "", Anime: "", Games: "", Music: "", Recipes: "", Books: "", Careers: "", Custom: "✨" };
                  return (
                    <button key={ds} onClick={() => switchApplyDataset(ds)} className={`predict-btn${applyDataset === ds ? " selected-yes" : ""}`} style={{ padding: "8px 16px", minWidth: "100px", fontSize: 14, border: applyDataset === ds ? "4px solid #000" : "2px solid #000", boxShadow: applyDataset === ds ? "4px 4px 0 #000" : "2px 2px 0 #000", transform: applyDataset === ds ? "scale(1.03)" : "none", transition: "all 0.15s ease" }}>
                      {emojis[ds]} {ds}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Dropdown */}
              <div className="block md:hidden mt-3">
                <select
                  value={applyDataset}
                  onChange={e => switchApplyDataset(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 16,
                    fontWeight: "bold",
                    background: "var(--accent)",
                    color: "var(--dark)",
                    border: "4px solid #000",
                    borderRadius: 12,
                    boxShadow: "4px 4px 0 #000",
                    cursor: "pointer",
                    outline: "none"
                  }}
                >
                  {Object.keys(APPLY_DATASETS).map(ds => {
                    const emojis: Record<string, string> = { Movies: "", Anime: "", Games: "", Music: "", Recipes: "", Books: "", Careers: "", Custom: "✨" };
                    return (
                      <option key={ds} value={ds} style={{ background: "#fff", color: "#000", fontWeight: "bold" }}>
                        {emojis[ds]} {ds}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>



            <div style={{ display: "flex", flexWrap: "wrap", gap: 32, marginBottom: 32, alignItems: "flex-start" }}>
              
              {/* Left Panel - Sticky Bug Reports & Pipeline */}
              <div style={{ flex: "1 1 350px", position: "sticky", top: "100px" }}>
                <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, marginBottom: 16 }}>2. Bug Reports & Fixes</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Normalization */}
                  <div style={{ background: applyConfig.normalization ? "#f0fdf4" : "#fff", border: "3px solid #000", borderRadius: 12, padding: "12px 14px", boxShadow: "2px 2px 0 #000" }}>
                    {!applyConfig.normalization ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "#991b1b" }}>🚨 Bug #1: Normalization</span>
                          <button onClick={() => setApplySearch(applyBugNorm)} style={{ background: "var(--accent)", color: "var(--dark)", border: "2px solid #000", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: "bold", cursor: "pointer", boxShadow: "2px 2px 0 #000" }}>Try This: {applyBugNorm}</button>
                        </div>
                        <p style={{ fontSize: 13, color: "#334155", margin: 0, lineHeight: 1.3 }}>
                          Searching uncleaned input fails. Can your engine clean noise?
                        </p>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: "bold", fontSize: 13, background: "#fee2e2", padding: "6px 10px", borderRadius: "6px", border: "2px solid #000", marginTop: 2 }}>
                          <input type="checkbox" checked={applyConfig.normalization} onChange={e => setApplyConfig({...applyConfig, normalization: e.target.checked})} style={{ width: 16, height: 16 }} />
                          Enable Normalization
                        </label>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "#166534" }}>✓ Fixed: Normalization</span>
                          <span style={{ display: "block", fontSize: 12, color: "#166534", opacity: 0.8 }}>{applyBugNorm} ➔ Match Found</span>
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: "bold", fontSize: 12, background: "#d1fae5", padding: "4px 8px", borderRadius: "6px", border: "2px solid #000" }}>
                          <input type="checkbox" checked={applyConfig.normalization} onChange={e => setApplyConfig({...applyConfig, normalization: e.target.checked})} style={{ width: 15, height: 15 }} />
                          ON
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Alias Expansion */}
                  <div style={{ background: applyConfig.aliasExpansion ? "#f0fdf4" : "#fff", border: "3px solid #000", borderRadius: 12, padding: "12px 14px", boxShadow: "2px 2px 0 #000" }}>
                    {!applyConfig.aliasExpansion ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "#991b1b" }}>🚨 Bug #2: Alias Expansion</span>
                          <button onClick={() => setApplySearch(applyBugAlias)} style={{ background: "var(--accent)", color: "var(--dark)", border: "2px solid #000", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: "bold", cursor: "pointer", boxShadow: "2px 2px 0 #000" }}>Try This: {applyBugAlias}</button>
                        </div>
                        <p style={{ fontSize: 13, color: "#334155", margin: 0, lineHeight: 1.3 }}>
                          Exact abbreviations fail. Can your engine translate shortcuts?
                        </p>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: "bold", fontSize: 13, background: "#fee2e2", padding: "6px 10px", borderRadius: "6px", border: "2px solid #000", marginTop: 2 }}>
                          <input type="checkbox" checked={applyConfig.aliasExpansion} onChange={e => setApplyConfig({...applyConfig, aliasExpansion: e.target.checked})} style={{ width: 16, height: 16 }} />
                          Enable Alias Expansion
                        </label>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "#166534" }}>✓ Fixed: Alias Expansion</span>
                          <span style={{ display: "block", fontSize: 12, color: "#166534", opacity: 0.8 }}>{applyBugAlias} ➔ Match Found</span>
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: "bold", fontSize: 12, background: "#d1fae5", padding: "4px 8px", borderRadius: "6px", border: "2px solid #000" }}>
                          <input type="checkbox" checked={applyConfig.aliasExpansion} onChange={e => setApplyConfig({...applyConfig, aliasExpansion: e.target.checked})} style={{ width: 15, height: 15 }} />
                          ON
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Fuzzy Matching */}
                  <div style={{ background: applyConfig.fuzzyMatching ? "#f0fdf4" : "#fff", border: "3px solid #000", borderRadius: 12, padding: "12px 14px", boxShadow: "2px 2px 0 #000" }}>
                    {!applyConfig.fuzzyMatching ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "#991b1b" }}>🚨 Bug #3: Fuzzy Matching</span>
                          <button onClick={() => setApplySearch(applyBugFuzzy)} style={{ background: "var(--accent)", color: "var(--dark)", border: "2px solid #000", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: "bold", cursor: "pointer", boxShadow: "2px 2px 0 #000" }}>Try This: {applyBugFuzzy}</button>
                        </div>
                        <p style={{ fontSize: 13, color: "#334155", margin: 0, lineHeight: 1.3 }}>
                          Spelling mistakes return 0 results. Can your engine tolerate typos?
                        </p>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: "bold", fontSize: 13, background: "#fee2e2", padding: "6px 10px", borderRadius: "6px", border: "2px solid #000", marginTop: 2 }}>
                          <input type="checkbox" checked={applyConfig.fuzzyMatching} onChange={e => setApplyConfig({...applyConfig, fuzzyMatching: e.target.checked})} style={{ width: 16, height: 16 }} />
                          Enable Fuzzy Matching
                        </label>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "#166534" }}>✓ Fixed: Fuzzy Matching</span>
                          <span style={{ display: "block", fontSize: 12, color: "#166534", opacity: 0.8 }}>{applyBugFuzzy} ➔ Match Found</span>
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: "bold", fontSize: 12, background: "#d1fae5", padding: "4px 8px", borderRadius: "6px", border: "2px solid #000" }}>
                          <input type="checkbox" checked={applyConfig.fuzzyMatching} onChange={e => setApplyConfig({...applyConfig, fuzzyMatching: e.target.checked})} style={{ width: 15, height: 15 }} />
                          ON
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Ranking */}
                  <div style={{ background: applyConfig.ranking ? "#f0fdf4" : "#fff", border: "3px solid #000", borderRadius: 12, padding: "12px 14px", boxShadow: "2px 2px 0 #000" }}>
                    {!applyConfig.ranking ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "#991b1b" }}>🚨 Bug #4: Relevance Ranking</span>
                          <button onClick={() => setApplySearch(applyBugRank)} style={{ background: "var(--accent)", color: "var(--dark)", border: "2px solid #000", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: "bold", cursor: "pointer", boxShadow: "2px 2px 0 #000" }}>Try This: {applyBugRank}</button>
                        </div>
                        <p style={{ fontSize: 13, color: "#334155", margin: 0, lineHeight: 1.3 }}>
                          Keywords return unranked results. Can your engine prioritize relevance?
                        </p>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: "bold", fontSize: 13, background: "#fee2e2", padding: "6px 10px", borderRadius: "6px", border: "2px solid #000", marginTop: 2 }}>
                          <input type="checkbox" checked={applyConfig.ranking} onChange={e => setApplyConfig({...applyConfig, ranking: e.target.checked})} style={{ width: 16, height: 16 }} />
                          Enable Ranking
                        </label>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "#166534" }}>✓ Fixed: Relevance Ranking</span>
                          <span style={{ display: "block", fontSize: 12, color: "#166534", opacity: 0.8 }}>Keyword Unindexed ➔ Smart TF-IDF Weighting</span>
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: "bold", fontSize: 12, background: "#d1fae5", padding: "4px 8px", borderRadius: "6px", border: "2px solid #000" }}>
                          <input type="checkbox" checked={applyConfig.ranking} onChange={e => setApplyConfig({...applyConfig, ranking: e.target.checked})} style={{ width: 15, height: 15 }} />
                          ON
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel - Sticky Search + Results */}
              <div style={{ flex: "1 1 400px", minWidth: "300px" }}>
                <div style={{ position: "sticky", top: "100px", background: "var(--bg)", zIndex: 10, paddingBottom: 16 }}>
                  <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, marginBottom: 16 }}>3. Search & Observe</h3>
                  <input 
                    value={applySearch} 
                    onChange={e => setApplySearch(e.target.value)} 
                    placeholder="Test your search engine..." 
                    className="search-input" 
                  />
                </div>
                
                {applySearch.trim() && (
                  <div className="animate-fadeIn" style={{ background: "#0f172a", color: "#38bdf8", padding: "8px 12px", borderRadius: 8, border: "2px solid #000", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", boxShadow: "2px 2px 0 #000" }}>
                    <span style={{ color: "#facc15", fontWeight: "bold" }}>⚡ Pipeline Running:</span>
                    <span style={{ color: applyConfig.normalization ? "#4ade80" : "#ef4444" }}>Norm {applyConfig.normalization ? "✓" : "✗"}</span>
                    <span style={{ color: applyConfig.aliasExpansion ? "#4ade80" : "#ef4444" }}>Alias {applyConfig.aliasExpansion ? "✓" : "✗"}</span>
                    <span style={{ color: applyConfig.fuzzyMatching ? "#4ade80" : "#ef4444" }}>Fuzzy {applyConfig.fuzzyMatching ? "✓" : "✗"}</span>
                    <span style={{ color: applyConfig.ranking ? "#4ade80" : "#ef4444" }}>Rank {applyConfig.ranking ? "✓" : "✗"}</span>
                  </div>
                )}
                
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {applyResults.map(r => {
                    const matchIconMap: Record<string, string> = {
                      exact: "📄 Title",
                      alias: "🏷 Alias",
                      fuzzy: "⚡ Fuzzy",
                      skill: applyDataset === "Careers" ? "🔑 Skill" : applyDataset === "Recipes" ? "🔑 Ingredient" : "🔑 Keyword"
                    };
                    return (
                      <div key={r.id} className="result-card" style={{ padding: 16, marginBottom: 0 }}>
                         {applySearch.trim() ? (
                           <div className="result-eyebrow" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                             <span>Matched via <span className="match-badge">✓ {matchIconMap[r.matchType] || r.matchType}</span></span>
                             <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: applyConfig.ranking ? "#d1fae5" : "#f1f5f9", color: applyConfig.ranking ? "#166534" : "#64748b", border: "1px solid #cbd5e1", fontWeight: "bold" }}>
                               {applyConfig.ranking ? "⚡ Ranked Priority" : "Raw Order"}
                             </span>
                           </div>
                         ) : null}
                         <h3 className="result-title" style={{ fontSize: 18, marginBottom: 4 }}>{r.title}</h3>
                         <div className="skill-tags">
                           <div className="flex flex-wrap gap-2 w-full">
                             {(r.skillsRequired || []).map((sk: string) => (
                               <span key={sk} className="skill-tag">{sk}</span>
                             ))}
                           </div>
                         </div>
                      </div>
                    );
                  })}
                  {applyResults.length === 0 && (
                    <div style={{ padding: 20, textAlign: "center", color: "#64748b", fontWeight: "bold", background: "#fff", border: "4px solid #000", borderRadius: 16, boxShadow: "4px 4px 0 #000" }}>
                      {applyRecords.length === 0 
                        ? "This dataset has no records yet! Click 'Customize Dataset' below to add one."
                        : `No results found for "${applySearch}"`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Completion Emotional Payoff Panel */}
            {applyConfig.normalization && applyConfig.aliasExpansion && applyConfig.fuzzyMatching && applyConfig.ranking && (
              <div className="animate-fadeIn" style={{ background: "#f0fdf4", border: "4px solid #000", borderRadius: 20, padding: 24, boxShadow: "var(--comic-shadow)", marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>🎉</span>
                  <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: "#166534", margin: 0 }}>
                    You just built the core of a modern search engine!
                  </h3>
                </div>
                <p style={{ fontSize: 15, color: "#14532d", lineHeight: 1.5, marginBottom: 16 }}>
                  By fixing all four pipeline failures, you implemented:
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20 }}>
                  <div style={{ background: "#fff", padding: "10px 14px", borderRadius: 10, border: "2px solid #000", fontWeight: "bold", fontSize: 14, color: "#166534" }}>✅ Query Normalization</div>
                  <div style={{ background: "#fff", padding: "10px 14px", borderRadius: 10, border: "2px solid #000", fontWeight: "bold", fontSize: 14, color: "#166534" }}>✅ Alias Expansion</div>
                  <div style={{ background: "#fff", padding: "10px 14px", borderRadius: 10, border: "2px solid #000", fontWeight: "bold", fontSize: 14, color: "#166534" }}>✅ Fuzzy Matching</div>
                  <div style={{ background: "#fff", padding: "10px 14px", borderRadius: 10, border: "2px solid #000", fontWeight: "bold", fontSize: 14, color: "#166534" }}>✅ Relevance Ranking</div>
                </div>
                <p style={{ fontSize: 14, color: "#334155", fontWeight: "bold", marginBottom: 16 }}>
                  These exact same ideas power search in: <span style={{ color: "#000" }}>🎬 Netflix • 🎵 Spotify • 💻 VS Code • 🛒 Amazon • 🔎 Google</span>
                </p>
                <div style={{ background: "var(--accent-tint)", padding: "12px 16px", borderRadius: 12, border: "2px solid #000", fontWeight: "bold", color: "#000", fontSize: 14 }}>
                  🚀 Now try creating your own custom dataset below to test your completed search engine on anything you want!
                </div>
              </div>
            )}

            <div style={{ background: "#fff", border: "4px solid #000", borderRadius: 20, padding: 24, boxShadow: "var(--comic-shadow)", marginBottom: 32 }}>
              <button 
                onClick={() => setIsEditingDataset(!isEditingDataset)}
                style={{ width: "100%", background: "none", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              >
                <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, margin: 0, color: "var(--dark)" }}>
                  {isEditingDataset ? "v Hide Dataset Manager" : "> Customize Dataset (Optional)"}
                </h3>
              </button>
              
              {isEditingDataset && (
                <>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, marginTop: 16 }}>
                    <button 
                      onClick={() => setApplyRecords([...applyRecords, { id: Date.now().toString(), title: "New Record", aliases: [], skillsRequired: [], description: "" }])}
                      style={{ background: "var(--green)", color: "#fff", border: "2px solid #000", borderRadius: 8, padding: "6px 12px", fontWeight: "bold", cursor: "pointer", boxShadow: "2px 2px 0 #000" }}
                    >+ Add Record</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {applyRecords.map((r, idx) => (
                      <div key={r.id} style={{ border: "2px solid #000", borderRadius: 12, padding: 12, background: "#f8fafc", display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 200px" }}>
                          <label style={{ fontSize: 12, fontWeight: "bold" }}>Title</label>
                          <input value={r.title} onChange={e => { const newRecs = [...applyRecords]; newRecs[idx].title = e.target.value; setApplyRecords(newRecs); }} style={{ width: "100%", border: "2px solid #000", borderRadius: 6, padding: 6 }} />
                        </div>
                        <div style={{ flex: "1 1 150px" }}>
                          <label style={{ fontSize: 12, fontWeight: "bold" }}>Aliases (comma separated)</label>
                          <input value={r.aliases.join(",")} onChange={e => { const newRecs = [...applyRecords]; newRecs[idx].aliases = e.target.value.split(","); setApplyRecords(newRecs); }} style={{ width: "100%", border: "2px solid #000", borderRadius: 6, padding: 6 }} />
                        </div>
                        <div style={{ flex: "1 1 150px" }}>
                          <label style={{ fontSize: 12, fontWeight: "bold" }}>Keywords/Skills (comma separated)</label>
                          <input value={(r.skillsRequired || []).join(",")} onChange={e => { const newRecs = [...applyRecords]; newRecs[idx].skillsRequired = e.target.value.split(","); setApplyRecords(newRecs); }} style={{ width: "100%", border: "2px solid #000", borderRadius: 6, padding: 6 }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-end" }}>
                          <button onClick={() => setApplyRecords(applyRecords.filter(x => x.id !== r.id))} style={{ background: "#fff", color: "var(--primary)", border: "2px solid #000", borderRadius: 8, padding: "6px 12px", fontWeight: "bold", cursor: "pointer", boxShadow: "2px 2px 0 #000" }}>Delete</button>
                        </div>
                      </div>
                    ))}
                    {applyRecords.length === 0 && <p style={{ fontStyle: "italic", color: "#64748b" }}>No records. Add one to start.</p>}
                  </div>
                </>
              )}
            </div>

            {Object.values(applyConfig).every(Boolean) && (
              <div style={{ background: "var(--accent-tint)", border: "4px solid #000", borderRadius: 20, padding: 32, boxShadow: "var(--comic-shadow)", textAlign: "center", marginBottom: 32 }}>
                <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 28, margin: "0 0 16px 0", color: "var(--dark)" }}></h3>
                <p style={{ fontSize: 16, fontWeight: "bold", color: "#334155", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
                  You fixed every issue. You created a searchable dataset and improved it using normalization, aliases, fuzzy matching, and ranking. These same ideas work whether you're searching careers, movies, books, recipes, games, or music.<br/><br/>Now try creating your own dataset!
                </p>
              </div>
            )}

            <div style={{ height: 80 }} />
          </div>
        )}

      </main>
      <Confetti ref={confettiRef} className="absolute inset-0 z-50 pointer-events-none" />
      
      {isIndexOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 20
        }} onClick={() => setIsIndexOpen(false)}>
          <div style={{
            maxHeight: "80vh",
            width: "100%",
            maxWidth: 550,
            background: "#fff",
            border: "4px solid #000",
            borderRadius: 20,
            boxShadow: "var(--comic-shadow)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              borderBottom: "4px solid #000",
              padding: "16px 20px",
              background: "var(--accent-tint)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, margin: 0, color: "var(--dark)" }}>
                 Search Engine Database Index
              </h3>
              <button
                onClick={() => setIsIndexOpen(false)}
                style={{
                  background: "#fff",
                  border: "2px solid #000",
                  cursor: "pointer",
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: "bold",
                  padding: "4px 10px",
                  boxShadow: "2px 2px 0 #000"
                }}
              >
                X
              </button>
            </div>
            
            <div style={{ padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
              <p className="build-prose" style={{ fontSize: 13, color: "#64748b", margin: "0 0 4px 0" }}>
                These records are indexed in the engine. Try searching their names or unique skills to test normalization, alias mapping, and fuzzy logic.
              </p>
              {careers.map(c => (
                <div key={c.id} style={{ border: "2px solid #000", borderRadius: 12, padding: 14, background: "#f8fafc", boxShadow: "2px 2px 0 #000" }}>
                  <h4 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 15, margin: "0 0 8px 0", color: "var(--dark)" }}>
                    {c.title}
                  </h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {c.skillsRequired.map(skill => (
                      <span key={skill} style={{
                        fontSize: 11,
                        background: "var(--purple-tint)",
                        border: "1.5px solid #000",
                        borderRadius: 6,
                        padding: "2px 8px",
                        fontWeight: "bold",
                        textTransform: "capitalize",
                        color: "var(--dark)"
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="border-t-[4px] border-black bg-white text-slate-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4 w-full" style={{ fontFamily: "var(--font-sans)" }}>
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: "rotate(-3deg)", filter: "drop-shadow(1.5px 1.5px 0px #000)" }}>
            <rect x="6" y="6" width="88" height="88" rx="16" fill="#ffffff" stroke="#000000" strokeWidth="4.5" />
            <circle cx="40" cy="24" r="4.5" fill="#f59e0b" stroke="#000000" strokeWidth="3" />
            <circle cx="58" cy="20" r="3.5" fill="#f59e0b" stroke="#000000" strokeWidth="2.5" />
            <path d="M 49 14 L 49 9 M 51.5 11.5 L 46.5 11.5" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
            <path d="M 37 56 L 63 56 L 71 68 C 72 70 70 72 68 72 L 32 72 C 30 72 28 70 29 68 Z" fill="#e11d48" />
            <path d="M 44 28 L 56 28 M 44 28 L 44 42 L 28 66 C 26 69 28 72 32 72 L 68 72 C 72 72 74 69 72 66 L 56 42 L 56 28" stroke="#000000" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx="50" cy="50" r="28" stroke="#000000" strokeWidth="5" fill="none" />
            <path d="M 70 70 L 86 86" stroke="#000000" strokeWidth="8" strokeLinecap="round" />
            <path d="M 70 70 L 86 86" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div>
            <strong style={{ fontSize: 14, fontFamily: "'Fredoka One', cursive" }}>Search Lab</strong>
            <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "#64748b", fontWeight: "bold" }}>
              {footerQuote || "Loading search pipeline..."}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center">
          <span style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#64748b" }}>Social Connect</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <a href="https://github.com/muzafer26/smart-career-search-lab" target="_blank" rel="noreferrer" style={{ background: "var(--accent)", border: "2px solid #000", borderRadius: 6, padding: 6, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "1.5px 1.5px 0 #000", transition: "all 0.1s ease" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </a>
            <a href="https://www.codedex.io/@Muzafer" target="_blank" rel="noreferrer" style={{ background: "#fef08a", border: "2px solid #000", borderRadius: 6, padding: 6, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "1.5px 1.5px 0 #000", transition: "all 0.1s ease" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#facc15" stroke="#000000" strokeWidth="2.5" />
                <path d="M15 8H10.5C9.67 8 9 8.67 9 9.5V14.5C9 15.33 9.67 16 10.5 16H15" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
