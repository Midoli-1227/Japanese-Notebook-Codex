function normalizeSearchText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("ja-JP")
    .trim();
}

function getWordSearchText(word) {
  const exampleText = (word.examples ?? [])
    .flatMap((example) => [example.japanese, example.chinese, example.note])
    .join(" ");

  return [
    word.term,
    word.reading,
    word.meanings,
    word.partOfSpeech,
    word.notes,
    (word.tags ?? []).join(" "),
    exampleText,
  ].join(" ");
}

export function matchesQuery(word, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  return normalizeSearchText(getWordSearchText(word)).includes(normalizedQuery);
}

export function sortWords(words, sortBy) {
  const sorted = [...words];

  if (sortBy === "term_asc") {
    return sorted.sort((a, b) => {
      const termCompare = String(a.term ?? "").localeCompare(String(b.term ?? ""), "ja-JP");
      if (termCompare !== 0) {
        return termCompare;
      }

      return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
    });
  }

  if (sortBy === "updated_desc") {
    return sorted.sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
  }

  return sorted.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
}

export function filterAndSortWords(words, filters) {
  const { query = "", tag = "", status = "all", starred = false, sortBy = "created_desc" } = filters;

  return sortWords(
    words.filter((word) => {
      if (!matchesQuery(word, query)) {
        return false;
      }

      if (tag && !(word.tags ?? []).includes(tag)) {
        return false;
      }

      if (status !== "all" && word.status !== status) {
        return false;
      }

      if (starred && !word.starred) {
        return false;
      }

      return true;
    }),
    sortBy,
  );
}

export function getRecentWords(words, limit = 4) {
  return sortWords(words, "created_desc").slice(0, limit);
}
