export function renderLayout(root) {
  root.innerHTML = `
    <a class="skip-link" href="#route-outlet">본문으로 건너뛰기</a>
    <header class="site-header"><div class="header-inner">
      <a class="brand" href="/" aria-label="뭐할구 홈"><img class="brand__icon" src="/wink-gu-favicon.png" alt="" width="32" height="32"><span class="brand__wordmark">뭐할<span class="brand__gu">구</span><span class="brand__question">?</span></span></a>
      <nav aria-label="주요 메뉴"><a href="/">홈</a><a href="/courses">코스</a><a href="/posts">게시판</a></nav>
    </div></header>
    <main id="route-outlet" tabindex="-1"></main>
    <footer><p>한국관광공사 TourAPI 제공 · 공공누리 제3유형</p></footer>
    <div id="chat-root"></div>`;
  return { outlet: root.querySelector('#route-outlet'), chatRoot: root.querySelector('#chat-root') };
}
