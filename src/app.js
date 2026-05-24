import { clearStoredWords, loadWords, saveWords } from "./data/storage.js";
import {
  PART_OF_SPEECH_LABELS,
  PART_OF_SPEECH_OPTIONS,
  SORT_OPTIONS,
  STATUS_LABELS,
  STUDY_STATUSES,
} from "./utils/constants.js";
import { formatDateTime, nowIso } from "./utils/date.js";
import { filterAndSortWords, getRecentWords } from "./utils/search.js";
import { formatTags, getTagCounts } from "./utils/tags.js";
import { buildWordPayload, hasValidationErrors, validateWordDraft } from "./utils/validation.js";

const app = document.querySelector("#app");
const initialLoad = loadWords();

const state = {
  words: initialLoad.words,
  selectedId: getRecentWords(initialLoad.words, 1)[0]?.id ?? null,
  mode: initialLoad.words.length > 0 ? "detail" : "empty",
  editingId: null,
  formDraft: null,
  formErrors: {},
  filters: getDefaultFilters(),
  sortBy: "created_desc",
  notice: "",
  storageError: initialLoad.error,
};

let noticeTimer = null;

app.addEventListener("click", handleClick);
app.addEventListener("input", handleInput);
app.addEventListener("change", handleChange);
app.addEventListener("submit", handleSubmit);

render();

function render(options = {}) {
  const filteredWords = filterAndSortWords(state.words, {
    ...state.filters,
    sortBy: state.sortBy,
  });

  if (state.mode !== "form") {
    const selectedIsVisible = filteredWords.some((word) => word.id === state.selectedId);
    if (filteredWords.length > 0 && !selectedIsVisible) {
      state.selectedId = filteredWords[0].id;
      state.mode = "detail";
    } else if (filteredWords.length === 0 && hasActiveFilters()) {
      state.selectedId = null;
    } else if (!state.selectedId && state.words.length > 0) {
      state.selectedId = getRecentWords(state.words, 1)[0]?.id ?? null;
    }
  }

  const selectedWord = state.words.find((word) => word.id === state.selectedId) ?? null;
  const statusCounts = getStatusCounts(state.words);
  const tagCounts = getTagCounts(state.words);
  const recentWords = getRecentWords(state.words, 4);

  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      ${renderStorageBanner()}
      ${renderNotice()}
      <main class="workspace">
        ${renderSidebar(statusCounts, tagCounts, recentWords)}
        ${renderListPane(filteredWords)}
        ${renderDetailPane(selectedWord)}
      </main>
    </div>
  `;

  restoreFocus(options.focusKey, options.selection);
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">日</span>
        <div>
          <h1>日语单词小笔记本</h1>
          <p>${state.words.length} 个单词</p>
        </div>
      </div>

      <label class="search-control">
        <span>搜索</span>
        <input
          id="searchInput"
          data-focus-key="search"
          type="search"
          value="${escapeAttr(state.filters.query)}"
          placeholder="单词、读音、意思、备注、例句或标签"
          autocomplete="off"
        />
      </label>

      <button class="primary-button" type="button" data-action="new-word">
        <span aria-hidden="true">+</span>
        添加单词
      </button>
    </header>
  `;
}

function renderStorageBanner() {
  if (!state.storageError) {
    return "";
  }

  return `
    <div class="storage-banner" role="alert">
      <span>本地数据读取失败，请检查或重置数据。</span>
      <button class="secondary-button" type="button" data-action="reset-storage">重置本地数据</button>
    </div>
  `;
}

function renderNotice() {
  if (!state.notice) {
    return "";
  }

  return `<div class="notice" role="status">${escapeHtml(state.notice)}</div>`;
}

function renderSidebar(statusCounts, tagCounts, recentWords) {
  const tagContent =
    tagCounts.length > 0
      ? tagCounts
          .map(
            ({ tag, count }) => `
              <button
                class="tag-filter ${state.filters.tag === tag ? "is-active" : ""}"
                type="button"
                data-action="filter-tag"
                data-tag="${escapeAttr(tag)}"
              >
                <span>${escapeHtml(tag)}</span>
                <span>${count}</span>
              </button>
            `,
          )
          .join("")
      : `<p class="quiet-text">暂无标签</p>`;

  const recentContent =
    recentWords.length > 0
      ? recentWords
          .map(
            (word) => `
              <button
                class="recent-word"
                type="button"
                data-action="select-word"
                data-word-id="${escapeAttr(word.id)}"
              >
                <span lang="ja">${escapeHtml(word.term)}</span>
                <small>${escapeHtml(word.reading || word.meanings)}</small>
              </button>
            `,
          )
          .join("")
      : `<p class="quiet-text">暂无单词</p>`;

  return `
    <aside class="sidebar" aria-label="词库概览和筛选">
      <section class="sidebar-section">
        <div class="summary-total">
          <span>总单词</span>
          <strong>${state.words.length}</strong>
        </div>
        <div class="status-stack">
          ${STUDY_STATUSES.map(
            (status) => `
              <button
                class="status-filter ${state.filters.status === status.value ? "is-active" : ""}"
                type="button"
                data-action="filter-status"
                data-status="${status.value}"
              >
                <span>${status.label}</span>
                <strong>${statusCounts[status.value] ?? 0}</strong>
              </button>
            `,
          ).join("")}
          <button
            class="status-filter ${state.filters.starred ? "is-active" : ""}"
            type="button"
            data-action="toggle-star-filter"
          >
            <span>星标</span>
            <strong>${state.words.filter((word) => word.starred).length}</strong>
          </button>
        </div>
      </section>

      <section class="sidebar-section">
        <div class="section-heading">
          <h2>常用标签</h2>
          ${hasActiveFilters() ? `<button type="button" data-action="clear-filters">清除</button>` : ""}
        </div>
        <div class="tag-filter-list">${tagContent}</div>
      </section>

      <section class="sidebar-section">
        <div class="section-heading">
          <h2>最近添加</h2>
        </div>
        <div class="recent-list">${recentContent}</div>
      </section>
    </aside>
  `;
}

function renderListPane(filteredWords) {
  return `
    <section class="list-pane" aria-label="单词列表">
      <div class="list-toolbar">
        <div>
          <h2>单词列表</h2>
          <p>${filteredWords.length} 个结果</p>
        </div>
        <label class="sort-control">
          <span>排序</span>
          <select id="sortSelect">
            ${SORT_OPTIONS.map(
              (option) => `
                <option value="${option.value}" ${state.sortBy === option.value ? "selected" : ""}>
                  ${option.label}
                </option>
              `,
            ).join("")}
          </select>
        </label>
      </div>

      ${renderActiveFilters()}
      <div class="word-list">
        ${renderWordListContent(filteredWords)}
      </div>
    </section>
  `;
}

function renderActiveFilters() {
  const chips = [];

  if (state.filters.query) {
    chips.push(`搜索：${escapeHtml(state.filters.query)}`);
  }

  if (state.filters.tag) {
    chips.push(`标签：${escapeHtml(state.filters.tag)}`);
  }

  if (state.filters.status !== "all") {
    chips.push(`状态：${STATUS_LABELS[state.filters.status]}`);
  }

  if (state.filters.starred) {
    chips.push("星标");
  }

  if (chips.length === 0) {
    return "";
  }

  return `
    <div class="active-filters" aria-label="当前筛选">
      ${chips.map((chip) => `<span>${chip}</span>`).join("")}
      <button class="ghost-button" type="button" data-action="clear-filters">清除筛选</button>
    </div>
  `;
}

function renderWordListContent(filteredWords) {
  if (state.words.length === 0) {
    return `
      <article class="empty-state">
        <h3>还没有记录任何单词。</h3>
        <p>先添加第一个日语单词吧。</p>
        <button class="primary-button" type="button" data-action="new-word">添加单词</button>
      </article>
    `;
  }

  if (filteredWords.length === 0) {
    return `
      <article class="empty-state">
        <h3>${state.filters.tag ? "这个标签下暂时没有单词。" : "没有找到匹配的单词。"}</h3>
        <p>换个关键词，或者清空筛选后再看。</p>
        <button class="secondary-button" type="button" data-action="clear-filters">清空搜索和筛选</button>
      </article>
    `;
  }

  return filteredWords.map(renderWordItem).join("");
}

function renderWordItem(word) {
  const isSelected = state.selectedId === word.id && state.mode !== "form";

  return `
    <article
      class="word-item ${isSelected ? "is-selected" : ""}"
      data-action="select-word"
      data-word-id="${escapeAttr(word.id)}"
      tabindex="0"
    >
      <button
        class="star-button ${word.starred ? "is-starred" : ""}"
        type="button"
        aria-label="${word.starred ? "取消星标" : "设为星标"}"
        data-action="toggle-star"
        data-word-id="${escapeAttr(word.id)}"
      >
        ${word.starred ? "★" : "☆"}
      </button>
      <div class="word-item-main">
        <div class="word-title-row">
          <h3 lang="ja">${escapeHtml(word.term)}</h3>
          <span class="status-pill status-${word.status}">${STATUS_LABELS[word.status] ?? "未学"}</span>
        </div>
        ${word.reading ? `<p class="reading" lang="ja">${escapeHtml(word.reading)}</p>` : ""}
        <p class="meaning">${escapeHtml(word.meanings)}</p>
        <div class="word-meta">
          ${word.partOfSpeech ? `<span>${PART_OF_SPEECH_LABELS[word.partOfSpeech] ?? "其他"}</span>` : ""}
          ${renderTagButtons(word.tags)}
        </div>
      </div>
    </article>
  `;
}

function renderDetailPane(selectedWord) {
  if (state.mode === "form") {
    return `<section class="detail-pane" aria-label="单词表单">${renderWordForm()}</section>`;
  }

  return `
    <section class="detail-pane" aria-label="单词详情">
      ${selectedWord ? renderWordDetail(selectedWord) : renderEmptyDetail()}
    </section>
  `;
}

function renderEmptyDetail() {
  return `
    <article class="empty-detail">
      <h2>选择一个单词查看详情</h2>
      <p>也可以直接添加第一个词条。</p>
      <button class="primary-button" type="button" data-action="new-word">添加单词</button>
    </article>
  `;
}

function renderWordDetail(word) {
  const examples =
    word.examples.length > 0
      ? word.examples.map((example, index) => renderExampleDetail(example, index, word.id)).join("")
      : `<p class="quiet-text">暂无例句</p>`;

  return `
    <article class="detail-view">
      <header class="detail-header">
        <div>
          <p class="eyebrow">词条详情</p>
          <h2 lang="ja">${escapeHtml(word.term)}</h2>
          ${word.reading ? `<p class="detail-reading" lang="ja">${escapeHtml(word.reading)}</p>` : ""}
        </div>
        <button
          class="star-button detail-star ${word.starred ? "is-starred" : ""}"
          type="button"
          aria-label="${word.starred ? "取消星标" : "设为星标"}"
          data-action="toggle-star"
          data-word-id="${escapeAttr(word.id)}"
        >
          ${word.starred ? "★" : "☆"}
        </button>
      </header>

      <div class="detail-section">
        <span class="section-label">中文意思</span>
        <p class="detail-meaning">${escapeHtml(word.meanings)}</p>
      </div>

      <div class="detail-grid">
        <div class="detail-section">
          <span class="section-label">词性</span>
          <p>${escapeHtml(PART_OF_SPEECH_LABELS[word.partOfSpeech] ?? "未选择")}</p>
        </div>
        <div class="detail-section">
          <span class="section-label">学习状态</span>
          <div class="status-actions">
            ${STUDY_STATUSES.map(
              (status) => `
                <button
                  class="status-choice ${word.status === status.value ? "is-active" : ""}"
                  type="button"
                  data-action="set-word-status"
                  data-word-id="${escapeAttr(word.id)}"
                  data-status="${status.value}"
                >
                  ${status.label}
                </button>
              `,
            ).join("")}
          </div>
        </div>
      </div>

      <div class="detail-section">
        <span class="section-label">标签</span>
        <div class="detail-tags">
          ${word.tags.length > 0 ? renderTagButtons(word.tags) : `<p class="quiet-text">暂无标签</p>`}
        </div>
      </div>

      <div class="detail-section">
        <span class="section-label">备注</span>
        ${word.notes ? `<p class="notes-text">${escapeMultiline(word.notes)}</p>` : `<p class="quiet-text">暂无备注</p>`}
      </div>

      <div class="detail-section">
        <div class="section-heading inline-heading">
          <span class="section-label">例句</span>
          <button class="ghost-button" type="button" data-action="add-example-to-word" data-word-id="${escapeAttr(word.id)}">
            新增例句
          </button>
        </div>
        <div class="example-list">${examples}</div>
      </div>

      <div class="timestamp-grid">
        <span>创建：${formatDateTime(word.createdAt)}</span>
        <span>更新：${formatDateTime(word.updatedAt)}</span>
      </div>

      <footer class="detail-actions">
        <button class="secondary-button" type="button" data-action="edit-word" data-word-id="${escapeAttr(word.id)}">编辑</button>
        <button class="danger-button" type="button" data-action="delete-word" data-word-id="${escapeAttr(word.id)}">删除</button>
      </footer>
    </article>
  `;
}

function renderExampleDetail(example, index, wordId) {
  return `
    <article class="example-item">
      <div class="example-heading">
        <strong>例句 ${index + 1}</strong>
        <div>
          <button
            class="ghost-button"
            type="button"
            data-action="edit-example"
            data-word-id="${escapeAttr(wordId)}"
            data-example-id="${escapeAttr(example.id)}"
          >
            编辑
          </button>
          <button
            class="ghost-button danger-text"
            type="button"
            data-action="delete-example"
            data-word-id="${escapeAttr(wordId)}"
            data-example-id="${escapeAttr(example.id)}"
          >
            删除
          </button>
        </div>
      </div>
      <p class="example-japanese" lang="ja">${escapeHtml(example.japanese)}</p>
      ${example.chinese ? `<p class="example-chinese">${escapeHtml(example.chinese)}</p>` : ""}
      ${example.note ? `<p class="example-note">${escapeHtml(example.note)}</p>` : ""}
    </article>
  `;
}

function renderWordForm() {
  const draft = state.formDraft ?? createBlankDraft();
  const errors = state.formErrors ?? {};
  const isEditing = Boolean(state.editingId);

  return `
    <form class="word-form" id="wordForm" novalidate>
      <header class="form-header">
        <div>
          <p class="eyebrow">${isEditing ? "编辑词条" : "新增词条"}</p>
          <h2>${isEditing ? "编辑单词" : "添加单词"}</h2>
        </div>
        <button class="ghost-button" type="button" data-action="cancel-form">取消</button>
      </header>

      <div class="field-grid">
        <label class="field ${errors.term ? "has-error" : ""}">
          <span>日语单词 <b>*</b></span>
          <input name="term" data-focus-key="term" value="${escapeAttr(draft.term)}" placeholder="勉強、食べる、きれい" />
          ${renderFieldError(errors.term)}
        </label>

        <label class="field">
          <span>假名读音</span>
          <input name="reading" value="${escapeAttr(draft.reading)}" placeholder="べんきょう、たべる" />
        </label>
      </div>

      <label class="field ${errors.meanings ? "has-error" : ""}">
        <span>中文意思 <b>*</b></span>
        <textarea name="meanings" data-focus-key="meanings" rows="3" placeholder="学习；吃；漂亮、干净">${escapeHtml(draft.meanings)}</textarea>
        ${renderFieldError(errors.meanings)}
      </label>

      <div class="field-grid">
        <label class="field">
          <span>词性</span>
          <select name="partOfSpeech">
            ${PART_OF_SPEECH_OPTIONS.map(
              (option) => `
                <option value="${option.value}" ${draft.partOfSpeech === option.value ? "selected" : ""}>
                  ${option.label}
                </option>
              `,
            ).join("")}
          </select>
        </label>

        <label class="field">
          <span>学习状态</span>
          <select name="status">
            ${STUDY_STATUSES.map(
              (status) => `
                <option value="${status.value}" ${draft.status === status.value ? "selected" : ""}>
                  ${status.label}
                </option>
              `,
            ).join("")}
          </select>
        </label>
      </div>

      <label class="field">
        <span>标签</span>
        <input name="tags" value="${escapeAttr(draft.tags)}" placeholder="N5、课本第1课、旅行" />
      </label>

      <label class="checkbox-field">
        <input name="starred" type="checkbox" ${draft.starred ? "checked" : ""} />
        <span>星标重点词</span>
      </label>

      <label class="field">
        <span>备注</span>
        <textarea name="notes" rows="4" placeholder="自己的理解、易错点、使用场景">${escapeHtml(draft.notes)}</textarea>
      </label>

      <section class="form-section">
        <div class="section-heading inline-heading">
          <h3>例句</h3>
          <button class="ghost-button" type="button" data-action="add-example">添加例句</button>
        </div>
        <div class="example-editor-list">
          ${draft.examples.map((example, index) => renderExampleEditor(example, index, errors.examples?.[index])).join("")}
        </div>
      </section>

      <footer class="form-actions">
        <button class="secondary-button" type="button" data-action="cancel-form">取消</button>
        <button class="primary-button" type="submit">${isEditing ? "保存修改" : "保存单词"}</button>
      </footer>
    </form>
  `;
}

function renderExampleEditor(example, index, error) {
  return `
    <article
      class="example-editor ${error ? "has-error" : ""}"
      data-example-row
      data-example-id="${escapeAttr(example.id)}"
      data-example-created-at="${escapeAttr(example.createdAt)}"
    >
      <div class="example-editor-heading">
        <strong>例句 ${index + 1}</strong>
        <button class="ghost-button danger-text" type="button" data-action="remove-example" data-index="${index}">删除</button>
      </div>
      <label class="field">
        <span>日语例句</span>
        <textarea name="exampleJapanese" data-focus-key="example-japanese-${index}" rows="2" placeholder="毎日日本語を勉強しています。">${escapeHtml(example.japanese)}</textarea>
      </label>
      <label class="field">
        <span>中文翻译</span>
        <textarea name="exampleChinese" rows="2" placeholder="我每天都在学习日语。">${escapeHtml(example.chinese)}</textarea>
      </label>
      <label class="field">
        <span>例句备注</span>
        <input name="exampleNote" value="${escapeAttr(example.note)}" placeholder="使用场景或语法点" />
      </label>
      ${renderFieldError(error)}
    </article>
  `;
}

function renderFieldError(message) {
  return message ? `<small class="field-error">${escapeHtml(message)}</small>` : "";
}

function renderTagButtons(tags) {
  if (!tags?.length) {
    return "";
  }

  return tags
    .map(
      (tag) => `
        <button
          class="tag-chip ${state.filters.tag === tag ? "is-active" : ""}"
          type="button"
          data-action="filter-tag"
          data-tag="${escapeAttr(tag)}"
        >
          ${escapeHtml(tag)}
        </button>
      `,
    )
    .join("");
}

function handleClick(event) {
  const actionElement = event.target.closest("[data-action]");
  if (!actionElement || !app.contains(actionElement)) {
    return;
  }

  const { action } = actionElement.dataset;

  if (action !== "select-word") {
    event.stopPropagation();
  }

  if (action === "new-word") {
    startNewWord();
    return;
  }

  if (action === "select-word") {
    selectWord(actionElement.dataset.wordId);
    return;
  }

  if (action === "edit-word") {
    const word = findWord(actionElement.dataset.wordId);
    if (word) {
      startEditWord(word);
    }
    return;
  }

  if (action === "delete-word") {
    deleteWord(actionElement.dataset.wordId);
    return;
  }

  if (action === "toggle-star") {
    toggleStar(actionElement.dataset.wordId);
    return;
  }

  if (action === "set-word-status") {
    setWordStatus(actionElement.dataset.wordId, actionElement.dataset.status);
    return;
  }

  if (action === "filter-status") {
    state.filters.status = state.filters.status === actionElement.dataset.status ? "all" : actionElement.dataset.status;
    render();
    return;
  }

  if (action === "filter-tag") {
    state.filters.tag = state.filters.tag === actionElement.dataset.tag ? "" : actionElement.dataset.tag;
    render();
    return;
  }

  if (action === "toggle-star-filter") {
    state.filters.starred = !state.filters.starred;
    render();
    return;
  }

  if (action === "clear-filters") {
    state.filters = getDefaultFilters();
    render({ focusKey: "search" });
    return;
  }

  if (action === "cancel-form") {
    cancelForm();
    return;
  }

  if (action === "add-example") {
    addExampleToCurrentForm();
    return;
  }

  if (action === "remove-example") {
    removeExampleFromCurrentForm(Number(actionElement.dataset.index));
    return;
  }

  if (action === "add-example-to-word") {
    const word = findWord(actionElement.dataset.wordId);
    if (word) {
      startEditWord(word, { addExample: true });
    }
    return;
  }

  if (action === "edit-example") {
    const word = findWord(actionElement.dataset.wordId);
    const exampleIndex = word?.examples.findIndex((example) => example.id === actionElement.dataset.exampleId) ?? -1;
    if (word) {
      startEditWord(word, { focusExampleIndex: exampleIndex >= 0 ? exampleIndex : 0 });
    }
    return;
  }

  if (action === "delete-example") {
    deleteExample(actionElement.dataset.wordId, actionElement.dataset.exampleId);
    return;
  }

  if (action === "reset-storage") {
    resetStorage();
  }
}

function handleInput(event) {
  if (event.target.id !== "searchInput") {
    return;
  }

  state.filters.query = event.target.value;
  render({
    focusKey: "search",
    selection: {
      start: event.target.selectionStart,
      end: event.target.selectionEnd,
    },
  });
}

function handleChange(event) {
  if (event.target.id !== "sortSelect") {
    return;
  }

  state.sortBy = event.target.value;
  render();
}

function handleSubmit(event) {
  if (event.target.id !== "wordForm") {
    return;
  }

  event.preventDefault();
  saveCurrentForm();
}

function startNewWord() {
  state.mode = "form";
  state.editingId = null;
  state.formDraft = createBlankDraft();
  state.formErrors = {};
  render({ focusKey: "term" });
}

function startEditWord(word, options = {}) {
  state.mode = "form";
  state.selectedId = word.id;
  state.editingId = word.id;
  state.formDraft = wordToDraft(word);
  state.formErrors = {};

  if (options.addExample) {
    state.formDraft.examples.push(createBlankExample());
    render({ focusKey: `example-japanese-${state.formDraft.examples.length - 1}` });
    return;
  }

  render({ focusKey: options.focusExampleIndex >= 0 ? `example-japanese-${options.focusExampleIndex}` : "term" });
}

function selectWord(wordId) {
  if (!wordId) {
    return;
  }

  state.selectedId = wordId;
  state.mode = "detail";
  state.editingId = null;
  state.formDraft = null;
  state.formErrors = {};
  render();
}

function cancelForm() {
  const hasWords = state.words.length > 0;
  state.mode = hasWords ? "detail" : "empty";
  state.editingId = null;
  state.formDraft = null;
  state.formErrors = {};
  render();
}

function saveCurrentForm() {
  const draft = collectDraftFromForm();
  const errors = validateWordDraft(draft);

  if (hasValidationErrors(errors)) {
    state.formDraft = draft;
    state.formErrors = errors;
    render({ focusKey: getFirstErrorFocusKey(errors) });
    return;
  }

  const existingWord = state.editingId ? findWord(state.editingId) : null;
  const wordPayload = buildWordPayload(draft, existingWord);

  if (existingWord) {
    state.words = state.words.map((word) => (word.id === existingWord.id ? wordPayload : word));
  } else {
    state.words = [wordPayload, ...state.words];
    state.filters = getDefaultFilters();
  }

  state.selectedId = wordPayload.id;
  state.mode = "detail";
  state.editingId = null;
  state.formDraft = null;
  state.formErrors = {};

  persistAndRender(existingWord ? "已更新。" : "已保存。");
}

function addExampleToCurrentForm() {
  state.formDraft = collectDraftFromForm();
  state.formDraft.examples.push(createBlankExample());
  state.formErrors = {};
  render({ focusKey: `example-japanese-${state.formDraft.examples.length - 1}` });
}

function removeExampleFromCurrentForm(index) {
  state.formDraft = collectDraftFromForm();
  state.formDraft.examples.splice(index, 1);

  if (state.formDraft.examples.length === 0) {
    state.formDraft.examples.push(createBlankExample());
  }

  state.formErrors = {};
  render();
}

function deleteWord(wordId) {
  const word = findWord(wordId);
  if (!word) {
    return;
  }

  const confirmed = window.confirm("确定要删除这个单词吗？删除后无法恢复。");
  if (!confirmed) {
    return;
  }

  state.words = state.words.filter((item) => item.id !== wordId);
  state.selectedId = getRecentWords(state.words, 1)[0]?.id ?? null;
  state.mode = state.words.length > 0 ? "detail" : "empty";
  state.editingId = null;
  state.formDraft = null;
  persistAndRender("已删除。");
}

function deleteExample(wordId, exampleId) {
  const word = findWord(wordId);
  if (!word) {
    return;
  }

  state.words = state.words.map((item) => {
    if (item.id !== wordId) {
      return item;
    }

    return {
      ...item,
      examples: item.examples.filter((example) => example.id !== exampleId),
      updatedAt: nowIso(),
    };
  });

  persistAndRender("已删除例句。");
}

function toggleStar(wordId) {
  updateWord(wordId, (word) => ({ ...word, starred: !word.starred }), "已更新星标。");
}

function setWordStatus(wordId, status) {
  updateWord(wordId, (word) => ({ ...word, status }), "已更新状态。");
}

function updateWord(wordId, updater, message) {
  state.words = state.words.map((word) => {
    if (word.id !== wordId) {
      return word;
    }

    return {
      ...updater(word),
      updatedAt: nowIso(),
    };
  });

  persistAndRender(message);
}

function resetStorage() {
  const confirmed = window.confirm("确定要清空本地保存的数据吗？");
  if (!confirmed) {
    return;
  }

  clearStoredWords();
  state.words = [];
  state.selectedId = null;
  state.mode = "empty";
  state.storageError = null;
  state.filters = getDefaultFilters();
  flashNotice("本地数据已重置。");
  render();
}

function collectDraftFromForm() {
  const form = app.querySelector("#wordForm");
  const exampleRows = Array.from(form.querySelectorAll("[data-example-row]"));

  return {
    term: form.elements.term.value,
    reading: form.elements.reading.value,
    meanings: form.elements.meanings.value,
    partOfSpeech: form.elements.partOfSpeech.value,
    tags: form.elements.tags.value,
    status: form.elements.status.value,
    starred: form.elements.starred.checked,
    notes: form.elements.notes.value,
    examples: exampleRows.map((row) => ({
      id: row.dataset.exampleId,
      createdAt: row.dataset.exampleCreatedAt,
      japanese: row.querySelector('[name="exampleJapanese"]').value,
      chinese: row.querySelector('[name="exampleChinese"]').value,
      note: row.querySelector('[name="exampleNote"]').value,
    })),
  };
}

function persistAndRender(message) {
  try {
    saveWords(state.words);
    state.storageError = null;
    flashNotice(message);
  } catch (error) {
    console.error("本地数据保存失败", error);
    flashNotice("保存失败，请检查浏览器本地存储。");
  }

  render();
}

function flashNotice(message) {
  state.notice = message;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => {
    state.notice = "";
    render();
  }, 2200);
}

function findWord(wordId) {
  return state.words.find((word) => word.id === wordId) ?? null;
}

function getStatusCounts(words) {
  return STUDY_STATUSES.reduce((counts, status) => {
    counts[status.value] = words.filter((word) => word.status === status.value).length;
    return counts;
  }, {});
}

function getDefaultFilters() {
  return {
    query: "",
    tag: "",
    status: "all",
    starred: false,
  };
}

function hasActiveFilters() {
  return Boolean(state.filters.query || state.filters.tag || state.filters.status !== "all" || state.filters.starred);
}

function createBlankDraft() {
  return {
    term: "",
    reading: "",
    meanings: "",
    partOfSpeech: "",
    tags: "",
    status: "new",
    starred: false,
    notes: "",
    examples: [createBlankExample()],
  };
}

function createBlankExample() {
  return {
    id: "",
    japanese: "",
    chinese: "",
    note: "",
    createdAt: "",
  };
}

function wordToDraft(word) {
  return {
    term: word.term,
    reading: word.reading,
    meanings: word.meanings,
    partOfSpeech: word.partOfSpeech,
    tags: formatTags(word.tags),
    status: word.status,
    starred: word.starred,
    notes: word.notes,
    examples:
      word.examples.length > 0
        ? word.examples.map((example) => ({
            id: example.id,
            japanese: example.japanese,
            chinese: example.chinese,
            note: example.note,
            createdAt: example.createdAt,
          }))
        : [createBlankExample()],
  };
}

function getFirstErrorFocusKey(errors) {
  if (errors.term) {
    return "term";
  }

  if (errors.meanings) {
    return "meanings";
  }

  const exampleIndex = errors.examples?.findIndex(Boolean) ?? -1;
  if (exampleIndex >= 0) {
    return `example-japanese-${exampleIndex}`;
  }

  return "term";
}

function restoreFocus(focusKey, selection) {
  if (!focusKey) {
    return;
  }

  const element = app.querySelector(`[data-focus-key="${focusKey}"]`);
  if (!element) {
    return;
  }

  element.focus();

  if (selection && typeof element.setSelectionRange === "function") {
    element.setSelectionRange(selection.start, selection.end);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function escapeMultiline(value) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}
