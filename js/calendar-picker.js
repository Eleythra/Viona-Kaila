/**
 * Ay görünümlü tek günlük tarih seçici (talep formları için).
 * min: YYYY-MM-DD; minMonth: YYYY-MM (önceki aylara geçişi kapatır).
 */
(function () {
  "use strict";

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function parseISODate(iso) {
    var p = iso.split("-");
    return {
      y: parseInt(p[0], 10),
      m: parseInt(p[1], 10) - 1,
      d: parseInt(p[2], 10),
    };
  }

  function startOfDayFromISO(iso) {
    var p = parseISODate(iso);
    return new Date(p.y, p.m, p.d);
  }

  function monthKeyFromParts(y, m0) {
    return y + "-" + pad(m0 + 1);
  }

  function CalendarPicker(container, opts) {
    opts = opts || {};
    this.container = container;
    this.value = opts.value || "";
    this.min = opts.min || "";
    this.minMonth = opts.minMonth || (this.min ? this.min.slice(0, 7) : "");
    this.onChange = opts.onChange || function () {};
    this._view = new Date();
    if (this.min) {
      var mp = parseISODate(this.min);
      this._view = new Date(mp.y, mp.m, 1);
    }
    if (this.value) {
      var vp = parseISODate(this.value);
      this._view = new Date(vp.y, vp.m, 1);
    }
    this._render();
  }

  CalendarPicker.prototype._render = function () {
    var self = this;
    this.container.innerHTML = "";
    this.container.className = "cal-picker";

    var y = this._view.getFullYear();
    var m = this._view.getMonth();

    var minD = null;
    if (self.min) {
      minD = startOfDayFromISO(self.min);
    }

    var minMonthKey = self.minMonth || "";
    var minYM = -1;
    if (minMonthKey) {
      var mparts = minMonthKey.split("-");
      minYM = parseInt(mparts[0], 10) * 12 + parseInt(mparts[1], 10) - 1;
    }

    var head = document.createElement("div");
    head.className = "cal-picker__head";
    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "cal-picker__nav";
    prev.setAttribute("aria-label", "prev");
    prev.textContent = "‹";
    var title = document.createElement("span");
    title.className = "cal-picker__title";
    title.textContent = y + " · " + pad(m + 1);
    var next = document.createElement("button");
    next.type = "button";
    next.className = "cal-picker__nav";
    next.setAttribute("aria-label", "next");
    next.textContent = "›";

    var viewYM = y * 12 + m;
    if (minYM >= 0 && viewYM <= minYM) {
      prev.disabled = true;
      prev.classList.add("cal-picker__nav--disabled");
    }

    prev.addEventListener("click", function () {
      if (prev.disabled) return;
      self._view.setMonth(m - 1);
      self._render();
    });
    next.addEventListener("click", function () {
      self._view.setMonth(m + 1);
      self._render();
    });
    head.appendChild(prev);
    head.appendChild(title);
    head.appendChild(next);

    var grid = document.createElement("div");
    grid.className = "cal-picker__grid";

    var first = new Date(y, m, 1);
    var startPad = (first.getDay() + 6) % 7;
    var daysInMonth = new Date(y, m + 1, 0).getDate();

    var i;
    for (i = 0; i < startPad; i++) {
      var e = document.createElement("span");
      e.className = "cal-picker__cell cal-picker__cell--empty";
      grid.appendChild(e);
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var iso = y + "-" + pad(m + 1) + "-" + pad(d);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal-picker__cell";
      btn.textContent = String(d);
      var cellDate = new Date(y, m, d);
      if (minD && cellDate < minD) {
        btn.disabled = true;
        btn.classList.add("cal-picker__cell--disabled");
      }
      if (self.value === iso) btn.classList.add("cal-picker__cell--selected");
      (function (dateIso) {
        btn.addEventListener("click", function () {
          if (btn.disabled) return;
          self.value = dateIso;
          self.onChange(dateIso);
          self._render();
        });
      })(iso);
      grid.appendChild(btn);
    }

    this.container.appendChild(head);
    this.container.appendChild(grid);
  };

  window.CalendarPicker = CalendarPicker;
})();
