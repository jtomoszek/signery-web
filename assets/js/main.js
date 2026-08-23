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

  /* ---------------------------------------------------------------------
     Úvodní scéna — video
     Video drží 80 % šířky, scrollem povyroste do plné plochy (roste do středu),
     pak se rozostří a ustoupí ploše Linen.
     --------------------------------------------------------------------- */
  var clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var phase = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

  var stage = document.querySelector("[data-stage]");
  var nav = document.querySelector(".nav-outer");

  /* Titulek na ploše Linen rozdělíme na písmena, aby se dal psát postupně.
     Text zůstává čitelný pro odečítače — obal dostane aria-label. */
  var claim = document.querySelector(".claim");
  if (claim) {
    var title = claim.querySelector(".claim__title");
    if (title) {
      title.setAttribute("aria-label", title.textContent.replace(/\s+/g, " ").trim());
      var n = 0;
      title.querySelectorAll(".lines__row i").forEach(function (line) {
        var text = line.textContent;
        line.textContent = "";
        line.setAttribute("aria-hidden", "true");
        text.split("").forEach(function (ch) {
          var sp = document.createElement("span");
          sp.className = "ltr";
          sp.textContent = ch;
          sp.style.setProperty("--i", n++);
          line.appendChild(sp);
        });
      });
    }
  }

  if (stage && !reduced) {
    var sticky = stage.querySelector(".stage__sticky");
    var stageTicking = false;

    var renderStage = function () {
      stageTicking = false;

      var rect = stage.getBoundingClientRect();
      var travel = stage.offsetHeight - sticky.offsetHeight;

      /* Než proběhne layout, jsou výšky nulové — dělením nulou by vznikly
         NaN a scéna by se rozsypala. V tu chvíli platí výchozí hodnoty z CSS. */
      if (!(travel > 0)) return;

      var p = clamp(-rect.top / travel, 0, 1);

      var narrow = window.innerWidth < 780;

      /* 1 · video povyroste — jen o ten kousek, ze středu.
         Roste zároveň na šířku i na výšku, aby na konci vyplnilo celou plochu. */
      var grow = ease(phase(p, 0, 0.30));

      var startW = narrow ? 92 : 80;                       // ve vw
      var ratio = narrow ? 4 / 3 : 9 / 16;                 // výška ku šířce
      var startHpx = Math.min(
        window.innerWidth * startW / 100 * ratio,
        window.innerHeight * (narrow ? 0.72 : 0.80)
      );
      var startH = startHpx / window.innerHeight * 100;    // ve vh

      var w = lerp(startW, 100, grow);
      var h = lerp(startH, 100, grow);
      var r = lerp(20, 0, phase(p, 0.14, 0.30));
      var imgS = lerp(1.06, 1, grow);

      /* 2 · rozostření a ztmavení */
      var blur = lerp(0, 20, phase(p, 0.28, 0.48));
      var veil = lerp(0.32, 0.58, phase(p, 0.26, 0.52));

      /* 3 · první titulek mizí, druhý přichází a včas zase odchází,
         aby ho plocha Linen nepřekryla uprostřed přechodu */
      var o1 = 1 - phase(p, 0.06, 0.22);
      var y1 = lerp(0, -40, phase(p, 0.06, 0.26));
      var o2 = phase(p, 0.36, 0.52) * (1 - phase(p, 0.62, 0.72));
      var y2 = lerp(44, 0, phase(p, 0.36, 0.56));

      /* 4 · plocha Linen vyjede zdola a nese na sobě tvrzení.
         Titulek se odhaluje spolu s ní, aby mezi videem a textem
         nezůstala prázdná obrazovka, a pak se drží. */
      var sheetP = ease(phase(p, 0.66, 0.82));
      var sheet = lerp(100, 0, sheetP);

      var claimP = ease(phase(p, 0.70, 0.86));
      var claimO = claimP;
      var claimY = lerp(30, 0, claimP);
      var claimS = lerp(0.96, 1, claimP);

      var st = stage.style;
      st.setProperty("--frame-w", w.toFixed(2) + "vw");
      st.setProperty("--frame-h", h.toFixed(2) + "vh");
      st.setProperty("--frame-r", r.toFixed(1) + "px");
      st.setProperty("--img-s", imgS.toFixed(3));
      st.setProperty("--blur", blur.toFixed(1) + "px");
      st.setProperty("--veil", veil.toFixed(3));
      st.setProperty("--o1", o1.toFixed(3));
      st.setProperty("--y1", y1.toFixed(1) + "px");
      st.setProperty("--o2", o2.toFixed(3));
      st.setProperty("--y2", y2.toFixed(1) + "px");
      st.setProperty("--sheet", sheet.toFixed(2) + "%");
      st.setProperty("--claim-o", claimO.toFixed(3));
      st.setProperty("--claim-y", claimY.toFixed(1) + "px");
      st.setProperty("--claim-s", claimS.toFixed(3));

      /* Jakmile plocha dojede, titulek se začne psát. Píše se jednou. */
      if (claim) claim.classList.toggle("is-writing", p > 0.74);

      if (nav) nav.setAttribute("data-over-stage", String(p < 0.78));
    };

    var onStageScroll = function () {
      if (stageTicking) return;
      stageTicking = true;
      requestAnimationFrame(renderStage);
    };

    window.addEventListener("scroll", onStageScroll, { passive: true });
    window.addEventListener("resize", onStageScroll);
    /* Až load máme jisté rozměry — písma i video mohou layout ještě posunout. */
    window.addEventListener("load", onStageScroll);
    renderStage();

    /* Autoplay bývá zablokovaný, dokud uživatel se stránkou neinteraguje */
    var vid = stage.querySelector("video");
    if (vid) {
      /* Zdroj volíme v JS — atribut media u <source> prohlížeče vyhodnotí
         jen jednou při načtení a po změně šířky okna ho nepřepočítají. */
      var wide = window.matchMedia("(min-width: 900px)").matches;
      var pick = vid.getAttribute(wide ? "data-src-lg" : "data-src-sm");
      if (pick && vid.getAttribute("src") !== pick) vid.setAttribute("src", pick);

      var tryPlay = function () {
        var pr = vid.play();
        if (pr && pr.catch) pr.catch(function () {});
      };
      tryPlay();
      window.addEventListener("pointerdown", tryPlay, { once: true });
      window.addEventListener("scroll", tryPlay, { once: true, passive: true });
    }
  }

  /* Bez animací (nebo bez scény) musí být tvrzení rovnou vidět
     a navigace ve světlé podobě. */
  if (!stage || reduced) {
    if (nav) nav.removeAttribute("data-over-stage");
    if (stage) {
      var sst = stage.style;
      sst.setProperty("--claim-o", "1");
      sst.setProperty("--claim-y", "0px");
      sst.setProperty("--claim-s", "1");
      sst.setProperty("--sheet", "0%");
      if (claim) claim.classList.add("is-writing");
    }
  }


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

  /* ---------------------------------------------------------------------
     Osa procesu — kreslení linky a postupné ztmavování kroků
     Na širokých obrazovkách se sekce zastaví a linka se kreslí scrollem.
     Na úzkých je osa svislá a odhalí se najednou, aby se nescrollovalo naprázdno.
     --------------------------------------------------------------------- */
  var railScenes = document.querySelectorAll("[data-rail-scene]");

  railScenes.forEach(function (scene) {
    var rail = scene.querySelector("[data-rail]");
    if (!rail) return;

    var line = rail.querySelector(".rail__line");
    var steps = Array.prototype.slice.call(rail.querySelectorAll(".rail__step"));
    if (!steps.length) return;

    var wide = window.matchMedia("(min-width: 960px)");
    var ticking = false;

    var paint = function (p) {
      if (line) line.style.setProperty("--rail-p", p.toFixed(3));
      steps.forEach(function (st, i) {
        /* Krok „dohání" linku — rozsvítí se, jakmile k němu doputuje. */
        var sp = clamp(p * steps.length - i, 0, 1);
        st.style.setProperty("--sp", sp.toFixed(3));
        st.classList.toggle("is-on", sp > 0.3);
      });
    };

    var render = function () {
      ticking = false;

      if (reduced || !wide.matches) { paint(1); return; }

      var sticky = scene.querySelector(".rail-scene__sticky");
      var travel = scene.offsetHeight - sticky.offsetHeight;
      if (!(travel > 0)) { paint(1); return; }

      var top = scene.getBoundingClientRect().top;
      /* Prvních 12 % je klidové zastavení, pak se teprve kreslí. */
      paint(clamp((-top / travel - 0.12) / 0.76, 0, 1));
    };

    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(render);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", onScroll);
    render();
  });

  initReveal(document);
  initCounters(document);

  window.signery = { initReveal: initReveal, initCounters: initCounters };
})();
