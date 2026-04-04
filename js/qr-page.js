(function () {
  var langBtn = document.getElementById("qr-lang");
  if (!langBtn) return;

  var en = false;
  langBtn.addEventListener("click", function () {
    en = !en;
    langBtn.setAttribute("aria-pressed", en ? "true" : "false");
    langBtn.textContent = en ? "Türkçe" : "English";
    document.getElementById("qr-lead-tr").classList.toggle("hidden", en);
    document.getElementById("qr-lead-tr").hidden = en;
    document.getElementById("qr-lead-en").classList.toggle("hidden", !en);
    document.getElementById("qr-lead-en").hidden = !en;
    document.getElementById("qr-hint-tr").classList.toggle("hidden", en);
    document.getElementById("qr-hint-tr").hidden = en;
    document.getElementById("qr-hint-en").classList.toggle("hidden", !en);
    document.getElementById("qr-hint-en").hidden = !en;
    document.documentElement.lang = en ? "en" : "tr";
  });
})();
