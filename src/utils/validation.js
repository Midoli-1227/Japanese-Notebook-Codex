import { STUDY_STATUSES } from "./constants.js";
import { nowIso } from "./date.js";
import { parseTagInput } from "./tags.js";

const validStatusValues = new Set(STUDY_STATUSES.map((status) => status.value));

export function createId(prefix = "id") {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

export function normalizeExamples(examples, now = nowIso()) {
  return (examples ?? [])
    .map((example) => {
      const japanese = cleanText(example.japanese);
      const chinese = cleanText(example.chinese);
      const note = cleanText(example.note);

      if (!japanese) {
        return null;
      }

      return {
        id: example.id || createId("example"),
        japanese,
        chinese,
        note,
        createdAt: example.createdAt || now,
        updatedAt: now,
      };
    })
    .filter(Boolean);
}

export function validateWordDraft(draft) {
  const errors = {};

  if (!cleanText(draft.term)) {
    errors.term = "请输入日语单词。";
  }

  if (!cleanText(draft.meanings)) {
    errors.meanings = "请输入中文意思。";
  }

  const exampleErrors = [];
  for (const [index, example] of (draft.examples ?? []).entries()) {
    const japanese = cleanText(example.japanese);
    const chinese = cleanText(example.chinese);
    const note = cleanText(example.note);

    if (!japanese && (chinese || note)) {
      exampleErrors[index] = "这条例句缺少日语原句。";
    }
  }

  if (exampleErrors.length > 0) {
    errors.examples = exampleErrors;
  }

  return errors;
}

export function hasValidationErrors(errors) {
  return Object.values(errors).some((value) => {
    if (Array.isArray(value)) {
      return value.some(Boolean);
    }

    return Boolean(value);
  });
}

export function buildWordPayload(draft, existingWord) {
  const now = nowIso();
  const status = validStatusValues.has(draft.status) ? draft.status : "new";

  return {
    id: existingWord?.id || createId("word"),
    term: cleanText(draft.term),
    reading: cleanText(draft.reading),
    meanings: cleanText(draft.meanings),
    partOfSpeech: cleanText(draft.partOfSpeech),
    tags: parseTagInput(draft.tags),
    status,
    starred: Boolean(draft.starred),
    notes: cleanText(draft.notes),
    examples: normalizeExamples(draft.examples, now),
    createdAt: existingWord?.createdAt || now,
    updatedAt: now,
  };
}
