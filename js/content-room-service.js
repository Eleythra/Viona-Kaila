(function () {
  "use strict";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null && text !== "") n.textContent = text;
    return n;
  }

  function renderRoomServiceModule(container, t) {
    var root = el("div", "room-service-mod viona-mod viona-mod--room-service");
    var panel = el("div", "room-service-mod__panel");
    panel.appendChild(el("h2", "room-service-mod__title", t("modRoomService")));
    panel.appendChild(el("p", "room-service-mod__lead", t("roomServiceLead")));
    panel.appendChild(el("p", "room-service-mod__hint", t("roomServiceHint")));
    root.appendChild(panel);
    container.appendChild(root);
  }

  window.renderRoomServiceModule = renderRoomServiceModule;
})();
