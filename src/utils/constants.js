export const STORAGE_KEY = "japanese-vocab-notebook.words";

export const STUDY_STATUSES = [
  { value: "new", label: "未学", tone: "neutral" },
  { value: "learning", label: "学习中", tone: "learning" },
  { value: "mastered", label: "已掌握", tone: "mastered" },
];

export const STATUS_LABELS = Object.fromEntries(
  STUDY_STATUSES.map((status) => [status.value, status.label]),
);

export const PART_OF_SPEECH_OPTIONS = [
  { value: "", label: "未选择" },
  { value: "noun", label: "名词" },
  { value: "verb", label: "动词" },
  { value: "i_adjective", label: "い形容词" },
  { value: "na_adjective", label: "な形容词" },
  { value: "adverb", label: "副词" },
  { value: "particle", label: "助词" },
  { value: "adnominal", label: "连体词" },
  { value: "conjunction", label: "接续词" },
  { value: "interjection", label: "感叹词" },
  { value: "expression", label: "表达" },
  { value: "other", label: "其他" },
];

export const PART_OF_SPEECH_LABELS = Object.fromEntries(
  PART_OF_SPEECH_OPTIONS.map((item) => [item.value, item.label]),
);

export const SORT_OPTIONS = [
  { value: "created_desc", label: "最近添加" },
  { value: "updated_desc", label: "最近编辑" },
  { value: "term_asc", label: "日语单词 A-Z" },
];
