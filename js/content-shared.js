(function () {
  "use strict";
  window.VionaContent = {
    lang: function () {
      return localStorage.getItem("viona_lang") || "tr";
    },
    pick: function (row) {
      if (!row || typeof row !== "object") return "";
      var c = window.VionaContent.lang();
      return row[c] || row.en || row.tr || "";
    },
  };
})();
