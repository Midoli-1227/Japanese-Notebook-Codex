# Japanese Notebook Codex

## English

Japanese Notebook Codex is a lightweight **vibe coding** web project for keeping a personal Japanese vocabulary notebook.

It is built as a simple browser-based app with no build step. The first version focuses on fast manual entry, clean review, local persistence, tags, notes, and example sentences.

### Features

- Add, view, edit, and delete Japanese vocabulary entries.
- Save Japanese terms, kana readings, Chinese meanings, part of speech, tags, study status, starred words, notes, and multiple example sentences.
- Search by term, reading, meaning, tags, notes, and example sentence content.
- Filter by tag, study status, and starred words.
- Sort by recently added, recently edited, or Japanese term.
- Store data locally in the browser with `localStorage`.
- Responsive layout for desktop and mobile use.

### Run Locally

```bash
python3 -m http.server 5173 --bind 127.0.0.1
```

Then open:

```txt
http://127.0.0.1:5173
```

If `npm` is available, you can also run:

```bash
npm run serve
```

### Test

```bash
node tests/utils.test.js
```

If `npm` is available:

```bash
npm test
```

## 中文

Japanese Notebook Codex 是一个轻量级的 **vibe coding** 网页项目，用来记录个人日语单词笔记。

它是一个无需构建步骤的浏览器应用。第一版重点放在快速手动录入、清晰回看、本地保存、标签、备注和例句管理上。

### 功能

- 新增、查看、编辑、删除日语单词词条。
- 保存日语单词、假名读音、中文意思、词性、标签、学习状态、星标、备注和多条例句。
- 支持按单词、读音、中文意思、标签、备注和例句内容搜索。
- 支持按标签、学习状态和星标筛选。
- 支持按最近添加、最近编辑、日语单词排序。
- 使用浏览器 `localStorage` 本地保存数据。
- 支持桌面端和移动端响应式布局。

### 本地运行

```bash
python3 -m http.server 5173 --bind 127.0.0.1
```

然后打开：

```txt
http://127.0.0.1:5173
```

如果本机有 `npm`，也可以运行：

```bash
npm run serve
```

### 测试

```bash
node tests/utils.test.js
```

如果本机有 `npm`，也可以运行：

```bash
npm test
```
