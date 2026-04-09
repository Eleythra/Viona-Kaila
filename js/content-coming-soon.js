/**
 * Yakında Ne Var? — şimdilik boş / hazırlanıyor mesajı (çok dilli).
 */
(function () {
  "use strict";

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function renderComingSoonModule(container, t) {
    var root = el("div", "viona-mod viona-mod--coming-soon");
    var wrap = el("div", "coming-soon-card glass-block glass-block--accent");

    var ico = el("div", "coming-soon-card__ico");
    ico.setAttribute("aria-hidden", "true");
    ico.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
    wrap.appendChild(ico);

    var p = el("p", "coming-soon-card__text");
    p.textContent = t("comingSoonPlaceholder");
    wrap.appendChild(p);

    root.appendChild(wrap);
    container.appendChild(root);
  }

  window.renderComingSoonModule = renderComingSoonModule;
})();
