const header = document.querySelector("[data-header]");
const navLinks = [...document.querySelectorAll("[data-section-link]")];
const observedSections = [...document.querySelectorAll(".section-observed")];
const revealItems = [...document.querySelectorAll(".reveal")];
const counters = [...document.querySelectorAll("[data-counter]")];
const heroStage = document.querySelector("[data-hero-stage]");
const hero = document.querySelector("#about");
const heroCopy = document.querySelector("[data-hero-copy]");
const heroTitle = document.querySelector(".hero-title");
const heroBadgeText = document.querySelector("[data-hero-badge-text]");
const orb = document.querySelector("[data-orb]");
const pulseLayer = document.querySelector("[data-pulse-layer]");
const heroMarquees = document.querySelector("[data-hero-marquees]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const touchDragQuery = window.matchMedia("(pointer: coarse)");
const mobileLayoutQuery = window.matchMedia("(max-width: 767px)");
const isTouchDragMode = () => touchDragQuery.matches;
const isMobileInteractionMode = () => touchDragQuery.matches || mobileLayoutQuery.matches;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const setActiveNav = (id) => {
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.sectionLink === id);
  });
};

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 35, 180)}ms`;
  revealObserver.observe(item);
});

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setActiveNav(entry.target.dataset.section);
      }
    });
  },
  { threshold: 0.35, rootMargin: "-18% 0px -45% 0px" },
);

observedSections.forEach((section) => sectionObserver.observe(section));

const syncHeroMarquees = () => {
  if (!hero || !heroMarquees) return;
  const progress = -hero.getBoundingClientRect().top;
  heroMarquees.style.setProperty("--marquee-one", `${(progress * 0.34).toFixed(2)}px`);
  heroMarquees.style.setProperty("--marquee-two", `${(progress * -0.24).toFixed(2)}px`);
  heroMarquees.style.setProperty("--marquee-three", `${(progress * 0.16).toFixed(2)}px`);
};

const onScroll = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 8);
  syncHeroMarquees();
};

window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const animateCounter = (node) => {
  if (node.dataset.done === "true") return;
  node.dataset.done = "true";
  const target = Number(node.dataset.counter);
  const duration = 1100;
  const start = performance.now();

  const tick = (time) => {
    const progress = Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.textContent = Math.round(target * eased).toString();
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) animateCounter(entry.target);
    });
  },
  { threshold: 0.6 },
);

counters.forEach((counter) => counterObserver.observe(counter));

const flipCards = [...document.querySelectorAll(".flip-card")];
let mobileFlipFrame = null;

const isFlipLocked = (card) => Number(card.dataset.flipLockUntil || 0) > performance.now();

const syncMobileAutoFlip = () => {
  mobileFlipFrame = null;

  if (!isMobileInteractionMode()) {
    flipCards.forEach((card) => card.classList.remove("is-auto-flipped"));
    return;
  }

  const targetY = window.innerHeight * 0.54;
  let activeCard = null;
  let activeDistance = Infinity;

  flipCards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const visible = rect.bottom > window.innerHeight * 0.16 && rect.top < window.innerHeight * 0.84;

    if (!visible) {
      card.classList.remove("is-auto-flipped");
      return;
    }

    const distance = Math.abs(rect.top + rect.height / 2 - targetY);
    if (distance < activeDistance) {
      activeCard = card;
      activeDistance = distance;
    }
  });

  flipCards.forEach((card) => {
    const shouldAutoFlip =
      card === activeCard &&
      !card.classList.contains("is-flipped") &&
      !isFlipLocked(card);
    card.classList.toggle("is-auto-flipped", shouldAutoFlip);
  });
};

const requestMobileAutoFlip = () => {
  if (mobileFlipFrame) return;
  mobileFlipFrame = requestAnimationFrame(syncMobileAutoFlip);
};

flipCards.forEach((card) => {
  card.addEventListener("click", () => {
    if (!isMobileInteractionMode()) {
      card.classList.toggle("is-flipped");
      return;
    }

    const wasFlipped =
      card.classList.contains("is-flipped") || card.classList.contains("is-auto-flipped");
    card.classList.remove("is-auto-flipped");
    card.classList.toggle("is-flipped", !wasFlipped);
    card.dataset.flipLockUntil = (performance.now() + 1400).toString();
    requestMobileAutoFlip();
  });
});

window.addEventListener("scroll", requestMobileAutoFlip, { passive: true });
window.addEventListener("resize", requestMobileAutoFlip, { passive: true });
requestMobileAutoFlip();

const tiltCards = [...document.querySelectorAll(".tilt-card")];
const tiltState = {
  card: null,
  frame: null,
  x: 0,
  y: 0,
  rx: 0,
  ry: 0,
  z: 0,
  targetX: 0,
  targetY: 0,
  targetRx: 0,
  targetRy: 0,
  targetZ: 0,
};

const touchTiltState = {
  active: false,
  frame: null,
  releaseTimer: null,
  x: 0,
  y: 0,
};

const setTiltStyle = (card, x, y, rx, ry, z) => {
  card.style.setProperty("--tilt-x", `${x.toFixed(2)}px`);
  card.style.setProperty("--tilt-y", `${y.toFixed(2)}px`);
  card.style.setProperty("--tilt-rx", `${rx.toFixed(2)}deg`);
  card.style.setProperty("--tilt-ry", `${ry.toFixed(2)}deg`);
  card.style.setProperty("--tilt-z", `${z.toFixed(2)}px`);
};

const startTiltLoop = () => {
  if (tiltState.frame) return;

  const tick = () => {
    if (!tiltState.card) {
      tiltState.frame = null;
      return;
    }

    const ease = prefersReducedMotion ? 1 : 0.26;
    tiltState.x += (tiltState.targetX - tiltState.x) * ease;
    tiltState.y += (tiltState.targetY - tiltState.y) * ease;
    tiltState.rx += (tiltState.targetRx - tiltState.rx) * ease;
    tiltState.ry += (tiltState.targetRy - tiltState.ry) * ease;
    tiltState.z += (tiltState.targetZ - tiltState.z) * ease;
    setTiltStyle(tiltState.card, tiltState.x, tiltState.y, tiltState.rx, tiltState.ry, tiltState.z);

    const settled =
      Math.abs(tiltState.targetX - tiltState.x) < 0.02 &&
      Math.abs(tiltState.targetY - tiltState.y) < 0.02 &&
      Math.abs(tiltState.targetRx - tiltState.rx) < 0.02 &&
      Math.abs(tiltState.targetRy - tiltState.ry) < 0.02 &&
      Math.abs(tiltState.targetZ - tiltState.z) < 0.02;

    if (!tiltState.card.classList.contains("is-lifted") && settled) {
      setTiltStyle(tiltState.card, 0, 0, 0, 0, 0);
      tiltState.card = null;
      tiltState.frame = null;
      return;
    }

    tiltState.frame = requestAnimationFrame(tick);
  };

  tiltState.frame = requestAnimationFrame(tick);
};

const setTiltTarget = (card, event) => {
  const rect = card.getBoundingClientRect();
  const px = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const py = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  const nx = px - 0.5;
  const ny = py - 0.5;

  tiltState.targetX = nx * 18;
  tiltState.targetY = ny * 12;
  tiltState.targetRx = -ny * 22;
  tiltState.targetRy = nx * 30;
  tiltState.targetZ = 28;
  card.style.setProperty("--glow-x", `${(px * 100).toFixed(2)}%`);
  card.style.setProperty("--glow-y", `${(py * 100).toFixed(2)}%`);
};

const activateTiltCard = (card, event) => {
  if (tiltState.card && tiltState.card !== card) {
    tiltState.card.classList.remove("is-lifted");
    setTiltStyle(tiltState.card, 0, 0, 0, 0, 0);
  }

  if (tiltState.card !== card) {
    tiltState.card = card;
    tiltState.x = 0;
    tiltState.y = 0;
    tiltState.rx = 0;
    tiltState.ry = 0;
    tiltState.z = 0;
  }

  card.classList.add("is-lifted");
  if (!prefersReducedMotion) setTiltTarget(card, event);
  startTiltLoop();
};

const releaseTiltCard = (card) => {
  if (tiltState.card !== card) return;
  card.classList.remove("is-lifted");
  card.style.setProperty("--glow-x", "50%");
  card.style.setProperty("--glow-y", "50%");
  tiltState.targetX = 0;
  tiltState.targetY = 0;
  tiltState.targetRx = 0;
  tiltState.targetRy = 0;
  tiltState.targetZ = 0;
  startTiltLoop();
};

tiltCards.forEach((card) => {
  card.addEventListener("pointerenter", (event) => activateTiltCard(card, event));
  card.addEventListener("pointermove", (event) => {
    activateTiltCard(card, event);
    if (!prefersReducedMotion) setTiltTarget(card, event);
  });
  card.addEventListener("pointerleave", () => releaseTiltCard(card));
});

const findTiltCardAtPoint = (x, y) => {
  const element = document.elementFromPoint(x, y);
  return element?.closest?.(".tilt-card") || null;
};

const updateTouchTiltFromPoint = () => {
  touchTiltState.frame = null;
  if (!isMobileInteractionMode() || !touchTiltState.active) return;

  const card = findTiltCardAtPoint(touchTiltState.x, touchTiltState.y);
  if (card && tiltCards.includes(card)) {
    activateTiltCard(card, { clientX: touchTiltState.x, clientY: touchTiltState.y });
    return;
  }

  if (tiltState.card) releaseTiltCard(tiltState.card);
};

const requestTouchTiltUpdate = () => {
  if (touchTiltState.frame) return;
  touchTiltState.frame = requestAnimationFrame(updateTouchTiltFromPoint);
};

const setTouchTiltPoint = (touch) => {
  if (!isMobileInteractionMode()) return;

  window.clearTimeout(touchTiltState.releaseTimer);
  touchTiltState.active = true;
  touchTiltState.x = touch.clientX;
  touchTiltState.y = touch.clientY;
  requestTouchTiltUpdate();
};

const releaseTouchTilt = () => {
  if (!isMobileInteractionMode()) return;

  touchTiltState.active = false;
  window.clearTimeout(touchTiltState.releaseTimer);
  touchTiltState.releaseTimer = window.setTimeout(() => {
    if (tiltState.card) releaseTiltCard(tiltState.card);
  }, 180);
};

window.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length) setTouchTiltPoint(event.touches[0]);
  },
  { passive: true },
);

window.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length) setTouchTiltPoint(event.touches[0]);
  },
  { passive: true },
);

window.addEventListener("touchend", releaseTouchTilt, { passive: true });
window.addEventListener("touchcancel", releaseTouchTilt, { passive: true });
window.addEventListener("scroll", requestTouchTiltUpdate, { passive: true });

window.addEventListener(
  "pointermove",
  (event) => {
    if (!tiltState.card || !tiltState.card.classList.contains("is-lifted")) return;

    const rect = tiltState.card.getBoundingClientRect();
    const shell = 3;
    const inside =
      event.clientX >= rect.left - shell &&
      event.clientX <= rect.right + shell &&
      event.clientY >= rect.top - shell &&
      event.clientY <= rect.bottom + shell;

    if (!inside) {
      releaseTiltCard(tiltState.card);
      return;
    }

    if (!prefersReducedMotion) setTiltTarget(tiltState.card, event);
  },
  { passive: true },
);

const createPulse = (x, y, className) => {
  const pulse = document.createElement("span");
  pulse.className = className;
  pulse.style.left = `${x}px`;
  pulse.style.top = `${y}px`;
  pulseLayer.appendChild(pulse);
  pulse.addEventListener("animationend", () => pulse.remove(), { once: true });
};

const createSleepMarks = (x, y) => {
  const marks = [
    { dx: -8, dy: -32, size: "1.5rem", delay: 0 },
    { dx: 14, dy: -52, size: "1.125rem", delay: 180 },
    { dx: 28, dy: -76, size: "1rem", delay: 360 },
  ];

  marks.forEach((mark) => {
    const sleep = document.createElement("span");
    sleep.className = "sleep-dot";
    sleep.textContent = "z";
    sleep.style.left = `${x + mark.dx}px`;
    sleep.style.top = `${y + mark.dy}px`;
    sleep.style.fontSize = mark.size;
    sleep.style.animationDelay = `${mark.delay}ms`;
    pulseLayer.appendChild(sleep);
    sleep.addEventListener("animationend", () => sleep.remove(), { once: true });
  });
};

if (heroStage && hero && orb && pulseLayer && heroCopy && heroTitle && heroBadgeText) {
  const orbState = {
    awake: false,
    frame: null,
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    pointerX: 0,
    pointerY: 0,
    hasPointer: false,
  };

  const orbDrag = {
    active: false,
    moved: false,
    pointerId: null,
  };

  const heroTilt = {
    frame: null,
    x: 0,
    y: 0,
    rx: 0,
    ry: 0,
    targetX: 0,
    targetY: 0,
    targetRx: 0,
    targetRy: 0,
  };

  const syncOrbMask = () => {
    const stageRect = heroStage.getBoundingClientRect();
    const titleRect = heroTitle.getBoundingClientRect();
    const orbRect = orb.getBoundingClientRect();

    heroStage.style.setProperty("--stage-w", stageRect.width.toFixed(2));
    heroStage.style.setProperty("--stage-h", stageRect.height.toFixed(2));
    heroStage.style.setProperty("--title-left", (titleRect.left - stageRect.left).toFixed(2));
    heroStage.style.setProperty("--title-top", (titleRect.top - stageRect.top).toFixed(2));
    heroStage.style.setProperty("--title-width", titleRect.width.toFixed(2));
    heroStage.style.setProperty("--orb-x", (orbRect.left - stageRect.left).toFixed(2));
    heroStage.style.setProperty("--orb-y", (orbRect.top - stageRect.top).toFixed(2));
  };

  const setOrbPosition = (left, top) => {
    orb.style.right = "auto";
    orb.style.bottom = "auto";
    orb.style.left = `${left}px`;
    orb.style.top = `${top}px`;
    heroStage.style.setProperty("--orb-x", left.toFixed(2));
    heroStage.style.setProperty("--orb-y", top.toFixed(2));
  };

  const setHeroTiltStyle = () => {
    heroCopy.style.setProperty("--hero-rx", `${heroTilt.rx.toFixed(2)}deg`);
    heroCopy.style.setProperty("--hero-ry", `${heroTilt.ry.toFixed(2)}deg`);
    heroCopy.style.setProperty("--hero-tx", `${heroTilt.x.toFixed(2)}px`);
    heroCopy.style.setProperty("--hero-ty", `${heroTilt.y.toFixed(2)}px`);
  };

  const startHeroTiltLoop = () => {
    if (heroTilt.frame) return;

    const tick = () => {
      const ease = prefersReducedMotion ? 1 : 0.24;
      heroTilt.x += (heroTilt.targetX - heroTilt.x) * ease;
      heroTilt.y += (heroTilt.targetY - heroTilt.y) * ease;
      heroTilt.rx += (heroTilt.targetRx - heroTilt.rx) * ease;
      heroTilt.ry += (heroTilt.targetRy - heroTilt.ry) * ease;
      setHeroTiltStyle();
      syncOrbMask();

      const settled =
        Math.abs(heroTilt.targetX - heroTilt.x) < 0.03 &&
        Math.abs(heroTilt.targetY - heroTilt.y) < 0.03 &&
        Math.abs(heroTilt.targetRx - heroTilt.rx) < 0.03 &&
        Math.abs(heroTilt.targetRy - heroTilt.ry) < 0.03;

      if (settled) {
        heroTilt.frame = null;
        return;
      }

      heroTilt.frame = requestAnimationFrame(tick);
    };

    heroTilt.frame = requestAnimationFrame(tick);
  };

  const setHeroTiltTarget = (event) => {
    const stageRect = heroStage.getBoundingClientRect();
    const nx = clamp((event.clientX - (stageRect.left + stageRect.width / 2)) / (stageRect.width / 2), -1, 1);
    const ny = clamp((event.clientY - (stageRect.top + stageRect.height / 2)) / (stageRect.height / 2), -1, 1);

    heroTilt.targetX = nx * 26;
    heroTilt.targetY = ny * 18;
    heroTilt.targetRx = -ny * 19;
    heroTilt.targetRy = nx * 25;
    startHeroTiltLoop();
  };

  const resetHeroTiltTarget = () => {
    heroTilt.targetX = 0;
    heroTilt.targetY = 0;
    heroTilt.targetRx = 0;
    heroTilt.targetRy = 0;
    startHeroTiltLoop();
  };

  const updateOrbFade = (event, rect, orbSize) => {
    if (!orbState.awake) {
      orb.style.setProperty("--orb-opacity", "1");
      return;
    }

    const fadeBand = Math.max(280, orbSize * 2.2);
    const topFade = clamp((event.clientY - (rect.top - fadeBand)) / fadeBand, 0, 1);
    const bottomFade = clamp((rect.bottom + fadeBand - event.clientY) / fadeBand, 0, 1);
    const rawOpacity = Math.min(topFade, bottomFade);
    const opacity = rawOpacity * rawOpacity * (3 - 2 * rawOpacity);
    orb.style.setProperty("--orb-opacity", opacity.toFixed(3));
  };

  const moveTargetToPointer = (event) => {
    const rect = heroStage.getBoundingClientRect();
    const orbSize = orb.offsetWidth;
    orbState.pointerX = event.clientX;
    orbState.pointerY = event.clientY;
    orbState.hasPointer = true;
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const desiredLeft = pointerX - orbSize / 2;
    const desiredTop = pointerY - orbSize / 2;
    const horizontalBleed = orbSize * 1.25;
    const topGuard = Math.max(8, orbSize * 0.05);
    const bottomGuard = Math.max(6, orbSize * 0.03);
    const minLeft = -horizontalBleed;
    const maxLeft = rect.width - orbSize + horizontalBleed;
    const maxTop = rect.height - orbSize * 0.42 - bottomGuard;

    orbState.tx = clamp(desiredLeft, minLeft, maxLeft);
    orbState.ty = clamp(desiredTop, topGuard, maxTop);
    updateOrbFade(event, rect, orbSize);
    setHeroTiltTarget(event);
    syncOrbMask();
  };

  const followLoop = () => {
    const ease = prefersReducedMotion ? 1 : 0.18;
    orbState.x += (orbState.tx - orbState.x) * ease;
    orbState.y += (orbState.ty - orbState.y) * ease;
    setOrbPosition(orbState.x, orbState.y);

    if (orbState.awake) {
      orbState.frame = requestAnimationFrame(followLoop);
    }
  };

  const wakeOrb = (event) => {
    const rect = heroStage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (!orbState.awake) {
      syncOrbMask();
      const orbRect = orb.getBoundingClientRect();
      orbState.x = orbRect.left - rect.left;
      orbState.y = orbRect.top - rect.top;
      orbState.awake = true;
      hero.classList.add("is-awake");
      orb.classList.add("is-awake");
      heroBadgeText.textContent = isTouchDragMode() ? "已唤醒 · 拖动黑球移动" : "已唤醒 · 回到首页会继续跟随";
      orbState.frame = requestAnimationFrame(followLoop);
    }
    moveTargetToPointer(event);

    createPulse(x, y, "pulse one");
    createPulse(x, y, "pulse two");
    createPulse(x, y, "pulse three");
  };

  const sleepOrb = () => {
    orbState.awake = false;
    cancelAnimationFrame(orbState.frame);
    hero.classList.remove("is-awake");
    orb.classList.remove("is-awake");
    heroBadgeText.textContent = isTouchDragMode() ? "拖动黑球唤醒 · Melbourne" : "点击页面唤醒黑球 · Melbourne";
    resetHeroTiltTarget();
    orb.style.left = "";
    orb.style.top = "";
    orb.style.right = "";
    orb.style.bottom = "";
    orb.style.setProperty("--orb-opacity", "1");
    requestAnimationFrame(syncOrbMask);
  };

  const beginOrbDrag = (event) => {
    if (!isTouchDragMode() || event.pointerType === "mouse") return;

    event.preventDefault();
    orbDrag.active = true;
    orbDrag.moved = false;
    orbDrag.pointerId = event.pointerId;
    orb.classList.add("is-dragging");
    try {
      orb.setPointerCapture?.(event.pointerId);
    } catch {
      // Some synthetic pointer events cannot be captured.
    }
    wakeOrb(event);
  };

  const dragOrb = (event) => {
    if (!orbDrag.active || event.pointerId !== orbDrag.pointerId) return;

    event.preventDefault();
    orbDrag.moved = true;
    moveTargetToPointer(event);
  };

  const endOrbDrag = (event) => {
    if (!orbDrag.active || event.pointerId !== orbDrag.pointerId) return;

    orbDrag.active = false;
    orbDrag.pointerId = null;
    orb.classList.remove("is-dragging");
    try {
      orb.releasePointerCapture?.(event.pointerId);
    } catch {
      // Ignore release failures when the browser already cleared capture.
    }
    window.setTimeout(() => {
      orbDrag.moved = false;
    }, 0);
  };

  if (isTouchDragMode()) {
    heroBadgeText.textContent = "拖动黑球唤醒 · Melbourne";
  }

  heroStage.addEventListener("pointermove", (event) => {
    if (isTouchDragMode() && event.pointerType !== "mouse" && !orbDrag.active) return;
    if (event.pointerType === "mouse" || orbState.awake || orbDrag.active) {
      moveTargetToPointer(event);
    }
  });

  window.addEventListener(
    "pointermove",
    (event) => {
      if (!orbState.awake) return;
      if (isTouchDragMode() && event.pointerType !== "mouse" && !orbDrag.active) return;
      moveTargetToPointer(event);
    },
    { passive: true },
  );

  window.addEventListener(
    "scroll",
    () => {
      if (!orbState.awake || !orbState.hasPointer) return;
      moveTargetToPointer({ clientX: orbState.pointerX, clientY: orbState.pointerY });
    },
    { passive: true },
  );

  heroStage.addEventListener("click", (event) => {
    if (isTouchDragMode() && event.target.closest("[data-orb]")) return;
    if (event.target.closest("a")) return;
    wakeOrb(event);
  });

  orb.addEventListener("pointerdown", beginOrbDrag);
  orb.addEventListener("pointermove", dragOrb);
  orb.addEventListener("pointerup", endOrbDrag);
  orb.addEventListener("pointercancel", endOrbDrag);

  heroStage.addEventListener("contextmenu", (event) => {
    if (!orbState.awake) return;
    event.preventDefault();
    sleepOrb();
  });

  window.addEventListener("resize", syncOrbMask, { passive: true });
  requestAnimationFrame(syncOrbMask);
}

document.querySelectorAll(".copy-button").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.classList.add("is-copied");
      button.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
      window.setTimeout(() => {
        button.classList.remove("is-copied");
        button.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="14" height="14" rx="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>';
      }, 1500);
    } catch {
      button.classList.remove("is-copied");
    }
  });
});
