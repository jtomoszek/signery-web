/* Signery — varianta B. Bez závislostí. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------
     Pomocné funkce
     ------------------------------------------------------------------ */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* Vrátí 0—1 podle toho, kde mezi a a b leží p. Mimo rozsah ořízne. */
  function phase(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }

  /* Změkčení konců, aby zvětšování nemělo tvrdý start ani dojezd */
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ------------------------------------------------------------------
     Otvírací sekvence — rýsování značky
     Poběží jen jednou; kdykoli se dá přeskočit klávesou, klikem i scrollem.
     ------------------------------------------------------------------ */
  var intro = document.querySelector("[data-intro]");

  if (intro) {
    var DURATION = 3600;          // musí sedět s posledním delayem v CSS
    var SEEN_KEY = "signery-intro-seen";
    var closed = true;
    var timer = null;

    var seen = function () {
      try { return sessionStorage.getItem(SEEN_KEY) === "1"; } catch (e) { return false; }
    };
    var markSeen = function () {
      try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (e) {}
    };

    var closeIntro = function () {
      if (closed) return;
      closed = true;
      window.clearTimeout(timer);
      intro.setAttribute("data-done", "true");
      document.body.removeAttribute("data-intro");
      window.setTimeout(function () { intro.hidden = true; }, 950);
      window.removeEventListener("keydown", onSkipKey);
      window.removeEventListener("wheel", closeIntro);
      window.removeEventListener("touchstart", closeIntro);
    };

    var onSkipKey = function (e) {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") closeIntro();
    };

    var playIntro = function () {
      closed = false;
      markSeen();

      intro.hidden = false;
      intro.removeAttribute("data-done");
      document.body.setAttribute("data-intro", "true");
      /* Scroll na začátek, ať sekvence nezačne uprostřed stránky */
      window.scrollTo(0, 0);

      /* Restart animací */
      intro.classList.remove("is-drawing");
      void intro.offsetWidth;

      window.addEventListener("keydown", onSkipKey);
      window.addEventListener("wheel", closeIntro, { passive: true });
      window.addEventListener("touchstart", closeIntro, { passive: true });

      requestAnimationFrame(function () {
        requestAnimationFrame(function () { intro.classList.add("is-drawing"); });
      });

      timer = window.setTimeout(closeIntro, DURATION);
    };

    var skipBtn = intro.querySelector("[data-intro-skip]");
    if (skipBtn) skipBtn.addEventListener("click", closeIntro);

    /* Přehraje se jednou za návštěvu; v náhledu jde spustit znovu tlačítkem. */
    if (reduced || seen()) {
      intro.hidden = true;
    } else {
      playIntro();
    }

    var replayBtn = document.querySelector("[data-intro-replay]");
    if (replayBtn) replayBtn.addEventListener("click", playIntro);
  }

  /* ------------------------------------------------------------------
     Úvodní scrollovací sekvence
     ------------------------------------------------------------------ */
  var stage = document.querySelector("[data-stage]");
  var nav = document.querySelector("[data-nav]");

  if (stage && !reduced) {
    var sticky = stage.querySelector(".stage__sticky");
    var ticking = false;

    var render = function () {
      ticking = false;

      var rect = stage.getBoundingClientRect();
      var travel = stage.offsetHeight - sticky.offsetHeight;
      var p = clamp(-rect.top / travel, 0, 1);

      /* 1 · snímek roste z karty přes celou plochu */
      var grow = ease(phase(p, 0, 0.38));
      var w = lerp(window.innerWidth < 780 ? 86 : 34, 118, grow);   // ve vw
      var r = lerp(18, 0, phase(p, 0.16, 0.38));
      var imgS = lerp(1.14, 1, grow);

      /* 2 · rozostření a ztmavení.
         Závoj nezačíná na nule — už na začátku drží kontrast titulku nad snímkem. */
      var blur = lerp(0, 18, phase(p, 0.34, 0.60));
      var veil = lerp(0.3, 0.55, phase(p, 0.30, 0.64));

      /* 3 · první titulek mizí, druhý se objevuje */
      var o1 = 1 - phase(p, 0.10, 0.30);
      var y1 = lerp(0, -40, phase(p, 0.10, 0.34));
      var o2 = phase(p, 0.46, 0.66) * (1 - phase(p, 0.84, 0.94));
      var y2 = lerp(44, 0, phase(p, 0.46, 0.70));

      /* 4 · plocha Linen vyjede zdola */
      var sheet = lerp(100, 0, ease(phase(p, 0.80, 1)));

      var s = stage.style;
      s.setProperty("--frame-w", w.toFixed(2) + "vw");
      s.setProperty("--frame-r", r.toFixed(1) + "px");
      s.setProperty("--img-s", imgS.toFixed(3));
      s.setProperty("--blur", blur.toFixed(1) + "px");
      s.setProperty("--veil", veil.toFixed(3));
      s.setProperty("--o1", o1.toFixed(3));
      s.setProperty("--y1", y1.toFixed(1) + "px");
      s.setProperty("--o2", o2.toFixed(3));
      s.setProperty("--y2", y2.toFixed(1) + "px");
      s.setProperty("--sheet", sheet.toFixed(2) + "%");

      /* Navigace se překlopí do světlé, jakmile plocha Linen zakryje snímek */
      if (nav) nav.setAttribute("data-solid", String(p > 0.86));
    };

    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(render);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    render();
  } else if (nav) {
    /* Bez animace je hned pod navigací světlá plocha */
    nav.setAttribute("data-solid", "true");
  }

  /* ------------------------------------------------------------------
     Mobilní menu
     ------------------------------------------------------------------ */
  var toggle = document.querySelector("[data-menu-toggle]");
  var menu = document.querySelector("[data-menu]");

  if (toggle && menu) {
    var setMenu = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      menu.setAttribute("data-open", String(open));
      document.body.setAttribute("data-menu", String(open));
      toggle.setAttribute("aria-label", open ? "Zavřít menu" : "Otevřít menu");
    };
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenu(false); toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------------
     Odhalení při scrollu
     ------------------------------------------------------------------ */
  var targets = document.querySelectorAll("[data-reveal]");

  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute("data-reveal-delay") || "0", 10);
        setTimeout(function () { el.classList.add("is-in"); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    targets.forEach(function (el) { io.observe(el); });

    /* Pojistka, kdyby observer nedoběhl */
    setTimeout(function () {
      targets.forEach(function (el) {
        if (el.classList.contains("is-in")) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-in");
      });
    }, 3000);
  }

  /* ------------------------------------------------------------------
     Přepínač barevné korekce fotografií (jen v náhledu)
     ------------------------------------------------------------------ */
  var photoBtn = document.querySelector("[data-photos-toggle]");
  if (photoBtn) {
    photoBtn.addEventListener("click", function () {
      var root = document.documentElement;
      var orig = root.getAttribute("data-photos") === "original";
      root.setAttribute("data-photos", orig ? "brand" : "original");
      photoBtn.textContent = orig ? "Ukázat originály" : "Zpět do palety";
    });
  }

  /* ------------------------------------------------------------------
     Rok v patičce
     ------------------------------------------------------------------ */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
