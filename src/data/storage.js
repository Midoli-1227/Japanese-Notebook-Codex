import { STORAGE_KEY, STUDY_STATUSES } from "../utils/constants.js";
import { nowIso } from "../utils/date.js";
import { parseTagInput } from "../utils/tags.js";
import { createId, normalizeExamples } from "../utils/validation.js";

const validStatusValues = new Set(STUDY_STATUSES.map((status) => status.value));

function migrateWord(rawWord) {
  const now = nowIso();
  const createdAt = rawWord.createdAt || now;

  return {
    id: rawWord.id || createId("word"),
    term: String(rawWord.term ?? "").trim(),
    reading: String(rawWord.reading ?? "").trim(),
    meanings: String(rawWord.meanings ?? "").trim(),
    partOfSpeech: String(rawWord.partOfSpeech ?? "").trim(),
    tags: parseTagInput(rawWord.tags ?? []),
    status: validStatusValues.has(rawWord.status) ? rawWord.status : "new",
    starred: Boolean(rawWord.starred),
    notes: String(rawWord.notes ?? "").trim(),
    examples: normalizeExamples(rawWord.examples ?? [], now),
    createdAt,
    updatedAt: rawWord.updatedAt || createdAt,
  };
}

export function loadWords() {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return { words: [], error: null };
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      throw new Error("Stored words value is not an array.");
    }

    return { words: parsedValue.map(migrateWord), error: null };
  } catch (error) {
    console.error("本地数据读取失败", error);
    return { words: [], error };
  }
}

export function saveWords(words) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

export function clearStoredWords() {
  localStorage.removeItem(STORAGE_KEY);
}
