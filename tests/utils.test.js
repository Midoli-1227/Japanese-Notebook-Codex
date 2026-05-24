import assert from "node:assert/strict";
import { filterAndSortWords, matchesQuery } from "../src/utils/search.js";
import { getTagCounts, parseTagInput } from "../src/utils/tags.js";
import { buildWordPayload, hasValidationErrors, validateWordDraft } from "../src/utils/validation.js";

const word = {
  id: "word_1",
  term: "食べる",
  reading: "たべる",
  meanings: "吃",
  partOfSpeech: "verb",
  tags: ["N5", "动词"],
  status: "learning",
  starred: true,
  notes: "常用的一段动词",
  examples: [
    {
      id: "example_1",
      japanese: "朝ご飯を食べます。",
      chinese: "吃早饭。",
      note: "礼貌体。",
      createdAt: "2026-05-24T00:00:00.000Z",
      updatedAt: "2026-05-24T00:00:00.000Z",
    },
  ],
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
};

assert.deepEqual(parseTagInput(" N5、动词, N5\n旅行 "), ["N5", "动词", "旅行"]);
assert.equal(matchesQuery(word, "たべる"), true);
assert.equal(matchesQuery(word, "朝ご飯"), true);
assert.equal(matchesQuery(word, "一段动词"), true);
assert.equal(matchesQuery(word, "不存在"), false);

const filtered = filterAndSortWords([word], {
  query: "吃",
  tag: "N5",
  status: "learning",
  starred: true,
  sortBy: "created_desc",
});
assert.equal(filtered.length, 1);

const tagCounts = getTagCounts([word, { ...word, id: "word_2", tags: ["N5"] }]);
assert.deepEqual(tagCounts[0], { tag: "N5", count: 2 });

const invalidDraft = {
  term: "",
  meanings: "",
  examples: [{ japanese: "", chinese: "只有中文", note: "" }],
};
assert.equal(hasValidationErrors(validateWordDraft(invalidDraft)), true);

const payload = buildWordPayload(
  {
    term: "勉強",
    reading: "べんきょう",
    meanings: "学习",
    partOfSpeech: "noun",
    tags: "N5、学校、N5",
    status: "new",
    starred: false,
    notes: "",
    examples: [{ japanese: "", chinese: "", note: "" }],
  },
  null,
);
assert.equal(payload.term, "勉強");
assert.deepEqual(payload.tags, ["N5", "学校"]);
assert.deepEqual(payload.examples, []);

console.log("工具函数测试通过");
