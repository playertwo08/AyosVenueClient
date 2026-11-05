"use strict";
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const intro = document.querySelector("#club-intro");

  function playIntro() {
    const hero = document.querySelector(".client-hero");
    if (!hero || reduced.matches) return;
    try {
      if (sessionStorage.getItem(DEMO_KEY + ":intro")) return;
      sessionStorage.setItem(DEMO_KEY + ":intro", "seen");
    } catch {
      // Storage can be disabled in some browser contexts.
      return;
    }
    intro.querySelector(".club-intro-name").textContent = VENUE_DATA.venue;
    intro.hidden = false;
    intro.addEventListener("animationend", (event) => {
      if (event.target === intro) intro.hidden = true;
    });
    for (const event of ["keydown", "pointerdown", "hashchange"]) {
      addEventListener(event, () => { intro.hidden = true; }, { once: true });
    }
    setTimeout(() => { intro.hidden = true; }, 900);
  }
  requestAnimationFrame(playIntro);

  const items =
    ".section-head, .court-card, .split > div, .club-visit-info, .home-rental, .ayos-visit, .pass, .page-hero";
  let observer;
  const counted = new WeakSet();
  const countObserver =
    !reduced.matches && "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              countObserver.unobserve(entry.target);
              const target = Number(entry.target.dataset.count);
              const start = performance.now();
              function frame(now) {
                const progress = Math.min(1, (now - start) / 650);
                entry.target.textContent = String(
                  Math.round(target * (1 - Math.pow(1 - progress, 3))),
                ).padStart(2, "0");
                if (progress < 1 && !reduced.matches)
                  requestAnimationFrame(frame);
                else entry.target.textContent = String(target).padStart(2, "0");
              }
              requestAnimationFrame(frame);
            });
          },
          { threshold: 0.8 },
        )
      : null;
  if ("IntersectionObserver" in window && !reduced.matches) {
    document.body.classList.add("motion-ready");
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );
  }
  function prepare() {
    if (countObserver)
      document.querySelectorAll(".intro-strip strong").forEach((item) => {
        if (counted.has(item) || !/^\d+$/.test(item.textContent)) return;
        counted.add(item);
        item.dataset.count = item.textContent;
        countObserver.observe(item);
      });
    if (observer)
      document.querySelectorAll(items).forEach((item, index) => {
        if (item.hasAttribute("data-reveal")) return;
        item.setAttribute("data-reveal", "");
        item.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
        observer.observe(item);
      });
  }
  new MutationObserver(prepare).observe(document.querySelector("main"), {
    childList: true,
    subtree: true,
  });
  prepare();
  let scheduled = false;
  function updateScroll() {
    scheduled = false;
    const scrolled = window.scrollY;
    const hero = document.querySelector(".client-hero");
    if (hero && !reduced.matches && scrolled < hero.offsetHeight + 160) {
      hero.style.setProperty(
        "--parallax-y",
        `${Math.min(innerWidth < 768 ? 10 : 24, scrolled * 0.08)}px`,
      );
    }
    const progress = document.querySelector(".reading-progress");
    if (progress) {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? scrolled / max : 0})`;
    }
    const band = document.querySelector(".kinetic-type");
    if (band && !reduced.matches) {
      const y = band.getBoundingClientRect().top;
      band.style.setProperty(
        "--type-x",
        `${Math.max(-80, Math.min(80, y * -0.08))}px`,
      );
    }
    document
      .querySelector("header")
      .classList.toggle("has-scrolled", scrolled > 40);
  }
  addEventListener(
    "scroll",
    () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(updateScroll);
      }
    },
    { passive: true },
  );
  reduced.addEventListener("change", () => {
    if (reduced.matches) {
      intro.hidden = true;
      document.body.classList.remove("motion-ready");
      const hero = document.querySelector(".client-hero");
      if (hero) hero.style.setProperty("--parallax-y", "0px");
    }
  });
  updateScroll();
})();

