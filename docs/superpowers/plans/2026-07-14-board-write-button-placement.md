# Board Write Button Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the board write action from the page heading to the right side of the search controls while preserving responsive behavior and navigation.

**Architecture:** Keep the existing board page and routing structure. Change only the board list markup and board-specific responsive CSS, with a DOM structure regression test protecting the placement.

**Tech Stack:** Vanilla JavaScript, CSS, Vitest, jsdom, Vite

## Global Constraints

- Keep the write destination exactly `/posts/new`.
- Keep the action as a labeled link styled with the existing `.button` class.
- Preserve the deployed backend proxy configuration.
- Do not modify ranking or map features.

---

### Task 1: Move the board write action into the search controls

**Files:**
- Modify: `tests/unit/board/board-desktop-layout.test.js`
- Modify: `src/features/board/board-list-page.js`
- Modify: `src/features/board/board.css`

**Interfaces:**
- Consumes: `mountBoardListPage({ outlet, query, signal, navigate })`
- Produces: `.search-form > a.button[href="/posts/new"]` and a heading without the write action

- [ ] **Step 1: Write the failing placement test**

Add these assertions after mounting the page:

```js
const writeLink = outlet.querySelector('a.button[href="/posts/new"]');
expect(writeLink).not.toBeNull();
expect(writeLink.closest('.search-form')).not.toBeNull();
expect(writeLink.closest('.section-head')).toBeNull();
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm.cmd test -- tests/unit/board/board-desktop-layout.test.js
```

Expected: FAIL because the write link is still inside `.section-head`.

- [ ] **Step 3: Move the link in the page markup**

Remove the link from `.section-head` and place it immediately after the search button:

```html
<form class="search-form">
  <label class="visually-hidden" for="post-search">게시글 검색</label>
  <input id="post-search" name="q" value="">
  <button>검색</button>
  <a class="button" href="/posts/new">글쓰기</a>
</form>
```

- [ ] **Step 4: Update responsive board styles**

Use three columns on desktop and a full-width input with a two-button action row on narrow screens:

```css
@media(min-width:900px){
  .search-form{grid-template-columns:minmax(0,1fr) auto auto}
  .search-form .button{display:grid;place-items:center;min-width:5.5rem}
}
@media(max-width:600px){
  .search-form{grid-template-columns:1fr 1fr}
  .search-form input{grid-column:1/-1}
  .search-form .button{display:grid;place-items:center;text-align:center}
}
```

- [ ] **Step 5: Run focused and full verification**

Run:

```powershell
npm.cmd test -- tests/unit/board/board-desktop-layout.test.js
npm.cmd test
npm.cmd run build
```

Expected: focused test passes, all unit tests pass with zero failures, and Vite build exits with code 0.

- [ ] **Step 6: Commit the implementation**

```powershell
git add src/features/board/board-list-page.js src/features/board/board.css tests/unit/board/board-desktop-layout.test.js
git commit -m "feat: move board write action into toolbar"
```
