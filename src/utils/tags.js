const TAG_SEPARATOR = /[、,，;\n]+/u;

export function normalizeTags(tags) {
  const normalized = [];
  const seen = new Set();

  for (const rawTag of tags) {
    const tag = String(rawTag ?? "").trim().replace(/\s+/gu, " ");
    const key = tag.toLocaleLowerCase("zh-CN");

    if (!tag || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(tag);
  }

  return normalized;
}

export function parseTagInput(input) {
  if (Array.isArray(input)) {
    return normalizeTags(input);
  }

  return normalizeTags(String(input ?? "").split(TAG_SEPARATOR));
}

export function formatTags(tags) {
  return normalizeTags(tags).join("、");
}

export function getTagCounts(words) {
  const counts = new Map();

  for (const word of words) {
    for (const tag of normalizeTags(word.tags ?? [])) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    return a.tag.localeCompare(b.tag, "zh-CN");
  });
}
