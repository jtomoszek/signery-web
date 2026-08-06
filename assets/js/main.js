/* Signery — interakce webu. Bez závislostí. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  /* ---------------------------------------------------------------------
     Mobilní menu
     --------------------------------------------------------------------- */
  var toggle = document.querySelector("[data-menu-toggle]");
  var menu = document.querySelector("[data-menu]");

  if (toggle && menu) {
    var setMenu = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      menu.setAttribute("data-open", String(open));
      document.body.setAttribute("data-menu-open", String(open));
      toggle.setAttribute("aria-label", open ? "Zavřít menu" : "Otevřít menu");
    };

    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });

    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  /* ---------------------------------------------------------------------
     Záložky
     --------------------------------------------------------------------- */
  document.querySelectorAll("[data-tabs]").forEach(function (root) {
    var buttons = Array.prototype.slice.call(root.querySelectorAll("[role='tab']"));
    if (!buttons.length) return;

    var select = function (btn) {
      buttons.forEach(function (b) {
        var on = b === btn;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(b.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
    };

    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[role='tab']");
      if (btn) select(btn);
    });

    root.addEventListener("keydown", function (e) {
      var i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      var next = null;
      if (e.key === "ArrowRight") next = buttons[(i + 1) % buttons.length];
      if (e.key === "ArrowLeft") next = buttons[(i - 1 + buttons.length) % buttons.length];
      if (next) {
        e.preventDefault();
        next.focus();
        select(next);
      }
    });
  });

  /* ---------------------------------------------------------------------
     FAQ / rozbalovací sekce
     --------------------------------------------------------------------- */
  document.querySelectorAll("[data-faq] .faq__btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      btn.setAttribute("aria-expanded", String(!open));
      if (panel) panel.setAttribute("data-open", String(!open));
    });
  });

  /* ---------------------------------------------------------------------
     Nekonečný pás — zdvojení obsahu kvůli plynulé smyčce
     --------------------------------------------------------------------- */
  document.querySelectorAll("[data-marquee]").forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });

  /* ---------------------------------------------------------------------
     Odhalení při scrollu
     Vystaveno jako signery.initReveal(root) — jednosouborový náhled
     ho volá znovu při přepnutí stránky.
     --------------------------------------------------------------------- */
  var revealObserver = null;

  function initReveal(root) {
    var targets = (root || document).querySelectorAll("[data-reveal]:not(.is-in)");
    if (!targets.length) return;

    if (reduced || !hasIO) {
      targets.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            var delay = parseInt(el.getAttribute("data-reveal-delay") || "0", 10);
            setTimeout(function () { el.classList.add("is-in"); }, delay);
            revealObserver.unobserve(el);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
      );
    }

    targets.forEach(function (el) { revealObserver.observe(el); });

    /* Pojistka: co je po 3 s stále skryté a přitom v obraze, zobrazíme. */
    setTimeout(function () {
      targets.forEach(function (el) {
        if (el.classList.contains("is-in")) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-in");
      });
    }, 3000);
  }

  /* ---------------------------------------------------------------------
     Počítadla hodnot z energetického průkazu
     --------------------------------------------------------------------- */
  var counterObserver = null;

  function runCounter(el) {
    if (el.dataset.counted === "1") return;
    el.dataset.counted = "1";

    var to = parseFloat(el.getAttribute("data-count-to"));
    var decimals = parseInt(el.getAttribute("data-count-decimals") || "0", 10);
    var suffix = el.getAttribute("data-count-suffix") || "";
    var duration = parseInt(el.getAttribute("data-count-duration") || "1600", 10);

    var format = function (n) {
      return n.toLocaleString("cs-CZ", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }) + suffix;
    };

    if (reduced) { el.textContent = format(to); return; }

    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      el.textContent = format(to);
    };

    var start = null;
    var step = function (ts) {
      if (done) return;
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(to * eased);
      if (p < 1) requestAnimationFrame(step);
      else finish();
    };
    requestAnimationFrame(step);

    /* Pojistka: když prohlížeč přestane volat requestAnimationFrame
       (skrytá karta, úsporný režim), dopočítáme hodnotu natvrdo. */
    setTimeout(finish, duration + 400);
  }

  function initCounters(root) {
    var counters = (root || document).querySelectorAll("[data-count-to]:not([data-counted])");
    if (!counters.length) return;

    if (reduced || !hasIO) {
      counters.forEach(runCounter);
      return;
    }

    if (!counterObserver) {
      counterObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            runCounter(entry.target);
            counterObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.4 }
      );
    }

    counters.forEach(function (el) {
      el.textContent = "0";
      counterObserver.observe(el);
    });
  }

  /* ---------------------------------------------------------------------
     Rok v patičce
     --------------------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  initReveal(document);
  initCounters(document);

  window.signery = { initReveal: initReveal, initCounters: initCounters };
})();
