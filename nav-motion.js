(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function getLocalRect(nav, item) {
    const navRect = nav.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    return {
      left: itemRect.left - navRect.left + nav.scrollLeft,
      top: itemRect.top - navRect.top + nav.scrollTop,
      width: itemRect.width,
      height: itemRect.height
    };
  }

  function moveIndicator(nav, item, immediate = false) {
    const indicator = nav.querySelector(".topnav-indicator");
    if (!indicator || !item) return;
    const rect = getLocalRect(nav, item);
    indicator.style.setProperty("--nav-x", `${rect.left}px`);
    indicator.style.setProperty("--nav-y", `${rect.top}px`);
    indicator.style.setProperty("--nav-w", `${rect.width}px`);
    indicator.style.setProperty("--nav-h", `${rect.height}px`);
    indicator.classList.toggle("is-immediate", immediate || reduceMotion);
  }

  function getSectionForLink(link) {
    const href = link.getAttribute("href") || "";
    if (!href.startsWith("#") || href.length < 2) return null;
    return document.querySelector(href);
  }

  function pulseContent() {
    if (reduceMotion) return;
    document.body.classList.remove("is-channel-switching");
    window.requestAnimationFrame(() => {
      document.body.classList.add("is-channel-switching");
      window.setTimeout(() => document.body.classList.remove("is-channel-switching"), 260);
    });
  }

  function initTopnav(nav) {
    const links = Array.from(nav.querySelectorAll("a"));
    if (!links.length || nav.querySelector(".topnav-indicator")) return;

    const indicator = document.createElement("span");
    indicator.className = "topnav-indicator";
    indicator.setAttribute("aria-hidden", "true");
    nav.appendChild(indicator);

    let active = nav.querySelector('a[aria-current="page"]') || links[0];
    let hoverTarget = null;
    let suppressSpyUntil = 0;
    const sectionLinks = links.filter(getSectionForLink);

    const setActive = (link, immediate = false) => {
      if (!link) return;
      active = link;
      if (sectionLinks.length) {
        links.forEach((item) => {
          if (item === link) item.setAttribute("aria-current", "page");
          else if (item.getAttribute("href")?.startsWith("#")) item.removeAttribute("aria-current");
        });
      }
      moveIndicator(nav, hoverTarget || active, immediate);
    };

    links.forEach((link) => {
      link.addEventListener("pointerenter", () => {
        hoverTarget = link;
        moveIndicator(nav, link);
      });
      link.addEventListener("focus", () => {
        hoverTarget = link;
        moveIndicator(nav, link);
      });
      link.addEventListener("pointerleave", () => {
        hoverTarget = null;
        moveIndicator(nav, active);
      });
      link.addEventListener("blur", () => {
        hoverTarget = null;
        moveIndicator(nav, active);
      });
      link.addEventListener("click", (event) => {
        const section = getSectionForLink(link);
        if (!section) return;
        event.preventDefault();
        suppressSpyUntil = Date.now() + 900;
        setActive(link);
        pulseContent();
        section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        history.pushState(null, "", link.getAttribute("href"));
      });
    });

    if (sectionLinks.length) {
      const hashLink = sectionLinks.find((link) => link.getAttribute("href") === window.location.hash);
      if (hashLink) {
        suppressSpyUntil = Date.now() + 900;
        setActive(hashLink, true);
        window.requestAnimationFrame(() => {
          const section = getSectionForLink(hashLink);
          if (section) section.scrollIntoView({ behavior: "auto", block: "start" });
        });
      }

      const observer = new IntersectionObserver((entries) => {
        if (Date.now() < suppressSpyUntil) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const next = sectionLinks.find((link) => getSectionForLink(link) === visible.target);
        if (next && !hoverTarget) setActive(next);
      }, {
        rootMargin: "-28% 0px -58% 0px",
        threshold: [0.15, 0.35, 0.6]
      });

      sectionLinks.forEach((link) => observer.observe(getSectionForLink(link)));
    }

    window.addEventListener("resize", () => moveIndicator(nav, hoverTarget || active, true));
    window.addEventListener("hashchange", () => {
      const next = sectionLinks.find((link) => link.getAttribute("href") === window.location.hash);
      if (next) {
        suppressSpyUntil = Date.now() + 900;
        setActive(next, true);
      }
    });

    moveIndicator(nav, active, true);
    nav.classList.add("is-motion-ready");
  }

  document.querySelectorAll(".topnav").forEach(initTopnav);
})();
