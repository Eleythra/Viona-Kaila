(function () {
  "use strict";
  window.VionaContent = {
    lang: function () {
      return localStorage.getItem("viona_lang") || "tr";
    },
    pick: function (row) {
      if (!row || typeof row !== "object") return "";
      var c = window.VionaContent.lang();
      function pickNonEmpty(v) {
        if (v == null) return "";
        var s = String(v).trim();
        return s !== "" ? s : "";
      }
      var v = pickNonEmpty(row[c]);
      if (v) return v;
      v = pickNonEmpty(row.en);
      if (v) return v;
      v = pickNonEmpty(row.de);
      if (v) return v;
      v = pickNonEmpty(row.pl);
      if (v) return v;
      v = pickNonEmpty(row.tr);
      return v || "";
    },
  };
})();
