import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Matter from "matter-js";

export type PhysicsPillsHandle = { replay: () => void };

export type PhysicsPill = {
  label: string;
  variant: number;
  level?: number;
};

type Props = {
  pills: PhysicsPill[];
  height?: number;
};

// Kitsys-style 12-variant palette (background / foreground)
const PALETTE: Array<{ bg: string; fg: string; bgTop: string; bgBottom: string }> = [
  { bg: "#0F1B4C", fg: "#FFFFFF", bgTop: "#1A2A66", bgBottom: "#08123A" },
  { bg: "#2747D8", fg: "#FFFFFF", bgTop: "#4664EE", bgBottom: "#1A35B8" },
  { bg: "#C9DAF8", fg: "#0B2A4A", bgTop: "#E0EBFC", bgBottom: "#A9C2EF" },
  { bg: "#1E3A8A", fg: "#FFFFFF", bgTop: "#2E50AC", bgBottom: "#142868" },
  { bg: "#B7B9F2", fg: "#1E2A6B", bgTop: "#CFD0F8", bgBottom: "#9B9DE5" },
  { bg: "#0F172A", fg: "#FFFFFF", bgTop: "#1E2942", bgBottom: "#070C1A" },
  { bg: "#DCE7FA", fg: "#0B2A4A", bgTop: "#EEF4FE", bgBottom: "#BFD2F2" },
  { bg: "#3B5BDB", fg: "#FFFFFF", bgTop: "#5878EE", bgBottom: "#2944B8" },
  { bg: "#1E40AF", fg: "#FFFFFF", bgTop: "#3056C8", bgBottom: "#142E88" },
  { bg: "#93C5FD", fg: "#0B2A4A", bgTop: "#B4D7FE", bgBottom: "#6FAEF6" },
  { bg: "#BFD7F2", fg: "#0B2A4A", bgTop: "#D6E5F8", bgBottom: "#9CBFE5" },
  { bg: "#1F2937", fg: "#FFFFFF", bgTop: "#324153", bgBottom: "#111722" },
];

type DragState =
  | { kind: "idle" }
  | {
      kind: "pending-drag";
      pointerId: number;
      body: Matter.Body;
      localOffset: { x: number; y: number };
      startClient: { x: number; y: number };
      startWorld: { x: number; y: number };
    }
  | {
      kind: "dragging";
      pointerId: number;
      body: Matter.Body;
      constraint: Matter.Constraint;
      localOffset: { x: number; y: number };
      samples: Array<{ t: number; x: number; y: number }>;
    };

type ExtBody = Matter.Body & {
  __label: string;
  __level?: number;
  __palette: (typeof PALETTE)[number];
  __w: number;
  __h: number;
  __spawnAt: number;
  __flashUntil?: number;
  /** Depth factor (0.4 = far/back, 1.4 = near/front). Drives sensor parallax magnitude. */
  __depth: number;
};

const WALL_T = 80;
// Extra drawable area ABOVE the visual section. Pills can rise into this
// zone (e.g. when the user tilts the phone backward or flicks them up) and
// remain visible — only the dark band at the very top of the page (outside
// this overflow) hides them. The canvas extends upward by this many CSS
// pixels via a negative `top` on its absolute positioning.
const OVERFLOW_TOP = 280;

export const PhysicsPills = forwardRef<PhysicsPillsHandle, Props>(function PhysicsPills(
  { pills, height = 720 },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const tagBarRef = useRef<HTMLDivElement>(null);

  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const wallsRef = useRef<Matter.Body[]>([]);
  const bodiesRef = useRef<ExtBody[]>([]);
  const dragRef = useRef<DragState>({ kind: "idle" });
  const visibleRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: height });
  const spawnTimersRef = useRef<number[]>([]);
  const reducedMotionRef = useRef(false);
  const hoveredRef = useRef<ExtBody | null>(null);
  const tagLockedRef = useRef<ExtBody | null>(null);
  const tagAutoHideRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const spawnAllRef = useRef<() => void>(() => {});
  const hasSpawnedRef = useRef(false);

  const [showHint, setShowHint] = useState(false);
  // iOS 13+ requires a user gesture to grant access to motion/orientation
  // sensors. We show a small "Enable motion" button only when (a) the API
  // requires a permission request AND (b) we haven't been granted yet.
  const [needsMotionPermission, setNeedsMotionPermission] = useState(false);
  const [motionDenied, setMotionDenied] = useState(false);
  const requestMotionRef = useRef<(() => Promise<void>) | null>(null);

  const pillData = useMemo(
    () =>
      pills.map((p) => ({
        ...p,
        palette: PALETTE[p.variant % PALETTE.length] ?? PALETTE[0],
      })),
    [pills],
  );

  useImperativeHandle(ref, () => ({
    replay: () => spawnAllRef.current(),
  }));

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mql.matches;

    const engine = Matter.Engine.create({
      // Stronger downward gravity — pills should fall in a straight line,
      // not drift sideways. scale bumped from 0.0011 → 0.0014.
      gravity: { x: 0, y: reducedMotionRef.current ? 0 : 1, scale: 0.0014 },
      positionIterations: 10,
      velocityIterations: 8,
      constraintIterations: 3,
    });
    engineRef.current = engine;

    // isFixed avoids time-debt accumulation when the tab is backgrounded or
    // the section is scrolled out of view. Without it, Matter tries to "catch
    // up" on resume and hits runner.maxUpdates, freezing the simulation.
    const runner = Matter.Runner.create({ delta: 1000 / 60, isFixed: true } as Matter.IRunnerOptions);
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    // Pause/resume helpers — used by IntersectionObserver and visibilitychange
    // to keep the engine idle when nobody is looking. This prevents the
    // "runner reached runner.maxUpdates" warning and the resulting stutter.
    const pauseEngine = () => {
      if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
    };
    const resumeEngine = () => {
      if (runnerRef.current && engineRef.current) {
        Matter.Runner.run(runnerRef.current, engineRef.current);
      }
    };

    Matter.Events.on(engine, "collisionStart", (ev) => {
      const now = performance.now();
      for (const pair of ev.pairs) {
        const va = pair.bodyA.velocity;
        const vb = pair.bodyB.velocity;
        const rel = Math.hypot(va.x - vb.x, va.y - vb.y);
        if (rel > 6) {
          (pair.bodyA as ExtBody).__flashUntil = now + 120;
          (pair.bodyB as ExtBody).__flashUntil = now + 120;
        }
      }
    });

    const measurePill = (label: string) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return { w: 120, h: 44 };
      ctx.save();
      ctx.font = "600 16px Inter, system-ui, sans-serif";
      const w = Math.ceil(ctx.measureText(label).width) + 36;
      ctx.restore();
      return { w: Math.max(72, w), h: 44 };
    };

    const createPillBody = (
      label: string,
      level: number | undefined,
      palette: (typeof PALETTE)[number],
      w: number,
      h: number,
      x: number,
      y: number,
      angle: number,
    ): ExtBody => {
      const body = Matter.Bodies.rectangle(x, y, w, h, {
        chamfer: { radius: h / 2 },
        // Bouncier + airier — pills feel like light foam rather than weighted chips.
        restitution: 0.5,
        friction: 0.08,
        frictionStatic: 0.25,
        frictionAir: 0.032,
        // Much lighter density so tilt/gravity moves them easily.
        density: 0.0004,
        slop: 0.03,
        angle,
      }) as ExtBody;
      body.__label = label;
      body.__level = level;
      body.__palette = palette;
      body.__w = w;
      body.__h = h;
      body.__spawnAt = performance.now();
      // Pseudo-3D depth: front pills (depth > 1) react more to tilt/shake,
      // back pills (depth < 1) react less. Distribution favours mid range
      // so the field feels layered without any pill being inert.
      body.__depth = 0.5 + Math.random() * 0.95;
      return body;
    };

    const clearSpawnTimers = () => {
      for (const t of spawnTimersRef.current) clearTimeout(t);
      spawnTimersRef.current = [];
    };

    const spawnAll = () => {
      const eng = engineRef.current;
      if (!eng) return;
      for (const b of bodiesRef.current) Matter.World.remove(eng.world, b);
      bodiesRef.current = [];
      clearSpawnTimers();

      const { w } = sizeRef.current;
      if (w === 0) return;

      if (reducedMotionRef.current) {
        const cols = Math.max(2, Math.floor(w / 140));
        const gap = 12;
        pillData.forEach((p, i) => {
          const dim = measurePill(p.label);
          const cellW = w / cols;
          const cx = (i % cols) * cellW + cellW / 2;
          const cy = 60 + Math.floor(i / cols) * (dim.h + gap) + dim.h / 2;
          const body = createPillBody(p.label, p.level, p.palette, dim.w, dim.h, cx, cy, 0);
          Matter.World.add(eng.world, body);
          bodiesRef.current.push(body);
        });
        return;
      }

      const phi = 0.6180339887;
      pillData.forEach((p, i) => {
        const dim = measurePill(p.label);
        const xFrac = ((i + 1) * phi) % 1;
        const x = dim.w / 2 + 12 + xFrac * (w - dim.w - 24);
        const y = -dim.h * (2 + (i % 6));
        const angle = (Math.random() - 0.5) * 1.0;
        const delay = i * (90 + Math.random() * 50);
        const t = window.setTimeout(() => {
          if (!engineRef.current) return;
          const body = createPillBody(p.label, p.level, p.palette, dim.w, dim.h, x, y, angle);
          Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08);
          Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 2, y: 0 });
          Matter.World.add(engineRef.current.world, body);
          bodiesRef.current.push(body);
        }, delay);
        spawnTimersRef.current.push(t);
      });
    };
    spawnAllRef.current = spawnAll;

    const buildWalls = (w: number, h: number) => {
      for (const wallBody of wallsRef.current) Matter.World.remove(engine.world, wallBody);
      const opts = {
        isStatic: true,
        friction: 0.4,
        restitution: 0.1,
        render: { visible: false },
      };
      const floor = Matter.Bodies.rectangle(w / 2, h + WALL_T / 2, w * 2, WALL_T, opts);
      // Ceiling sits ABOVE the overflow zone so pills are free to enter the
      // dark area visually but still bounded by the page chrome.
      const ceil = Matter.Bodies.rectangle(
        w / 2,
        -OVERFLOW_TOP - WALL_T * 4 - WALL_T / 2,
        w * 2,
        WALL_T,
        opts,
      );
      const left = Matter.Bodies.rectangle(-WALL_T / 2, h / 2, WALL_T, h * 4, opts);
      const right = Matter.Bodies.rectangle(w + WALL_T / 2, h / 2, WALL_T, h * 4, opts);
      wallsRef.current = [floor, ceil, left, right];
      Matter.World.add(engine.world, wallsRef.current);
    };

    const setSize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = height;
      sizeRef.current = { w, h };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // The canvas extends ABOVE the wrap by OVERFLOW_TOP px so pills can
      // visually rise into the section above. The drawing origin is shifted
      // down by OVERFLOW_TOP so world coords y=0 still equals the top of the
      // visible section (matching the wall layout).
      const totalH = h + OVERFLOW_TOP;
      canvas.width = w * dpr;
      canvas.height = totalH * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${totalH}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(0, OVERFLOW_TOP);
      }
      buildWalls(w, h);
    };
    setSize();
    // Defer spawn until the section actually scrolls into view (handled by
    // the IntersectionObserver below). This ensures pills "fall" right when
    // the user reaches the heading — no wasted entrance off-screen.

    const onMql = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      engine.gravity.y = e.matches ? 0 : 1;
      spawnAll();
    };
    mql.addEventListener?.("change", onMql);

    // Debounce resize so a continuous drag (devtools, browser chrome) doesn't
    // re-spawn dozens of times per second — that was a source of stutter.
    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        setSize();
        spawnAll();
      }, 120);
    });
    ro.observe(wrap);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          visibleRef.current = e.isIntersecting;
          if (e.isIntersecting) {
            // First time → spawn pills. Subsequent times → just resume the
            // engine so it doesn't accumulate time-debt while off-screen.
            if (!hasSpawnedRef.current) {
              hasSpawnedRef.current = true;
              spawnAll();
            }
            resumeEngine();
          } else {
            pauseEngine();
          }
        }
      },
      { threshold: 0.18 },
    );
    io.observe(wrap);

    // Pause when the tab is hidden (battery + prevents catch-up freeze).
    const onVisibility = () => {
      if (document.hidden) pauseEngine();
      else if (visibleRef.current) resumeEngine();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      if (!visibleRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { w, h } = sizeRef.current;
      // Clear includes the OVERFLOW_TOP zone above the section so pills
      // that rose into it get repainted cleanly each frame.
      ctx.clearRect(0, -OVERFLOW_TOP, w, h + OVERFLOW_TOP);

      const now = performance.now();
      for (const b of bodiesRef.current) {
        const dy = h - (b.position.y + b.__h / 2);
        if (dy >= 0 && dy < 30) {
          const alpha = (1 - dy / 30) * 0.18;
          ctx.save();
          ctx.fillStyle = `rgba(8, 18, 58, ${alpha})`;
          ctx.beginPath();
          ctx.ellipse(b.position.x, h - 4, b.__w * 0.45, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      for (const b of bodiesRef.current) {
        const { __w: w0, __h: h0, __palette: pal, __label } = b;
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);

        const grad = ctx.createLinearGradient(0, -h0 / 2, 0, h0 / 2);
        const flash = b.__flashUntil && now < b.__flashUntil;
        grad.addColorStop(0, flash ? lighten(pal.bgTop, 0.06) : pal.bgTop);
        grad.addColorStop(0.5, flash ? lighten(pal.bg, 0.06) : pal.bg);
        grad.addColorStop(1, pal.bgBottom);

        const r = h0 / 2;
        ctx.beginPath();
        roundRect(ctx, -w0 / 2, -h0 / 2, w0, h0, r);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        roundRect(ctx, -w0 / 2 + 1, -h0 / 2 + 1, w0 - 2, h0 / 2, r - 1);
        const hl = ctx.createLinearGradient(0, -h0 / 2, 0, 0);
        hl.addColorStop(0, "rgba(255,255,255,0.18)");
        hl.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = hl;
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = pal.fg;
        ctx.font = "600 16px Inter, system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(__label, 0, 1);

        ctx.restore();
      }

      const target = tagLockedRef.current ?? hoveredRef.current;
      const tag = tagRef.current;
      if (tag) {
        if (target && bodiesRef.current.includes(target)) {
          const x = target.position.x;
          const y = target.position.y - target.__h / 2 - 12;
          tag.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
          tag.style.opacity = "1";
        } else {
          tag.style.opacity = "0";
        }
      }
    };
    rafRef.current = requestAnimationFrame(render);

    const getLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      // Subtract OVERFLOW_TOP so the world-coord origin (y=0) maps to the
      // top of the visible section, matching where the walls are placed.
      return { x: clientX - rect.left, y: clientY - rect.top - OVERFLOW_TOP };
    };

    const findPillAt = (x: number, y: number): ExtBody | null => {
      const hits = Matter.Query.point(bodiesRef.current, { x, y }) as ExtBody[];
      return hits[0] ?? null;
    };

    const showTagFor = (body: ExtBody) => {
      const tag = tagRef.current;
      const bar = tagBarRef.current;
      if (!tag) return;
      const labelEl = tag.querySelector("[data-label]") as HTMLElement | null;
      const pctEl = tag.querySelector("[data-pct]") as HTMLElement | null;
      if (labelEl) labelEl.textContent = body.__label;
      const lvl = Math.max(0, Math.min(100, Math.round(body.__level ?? 0)));
      if (pctEl) pctEl.textContent = `${lvl}%`;
      if (bar) {
        bar.style.width = `${lvl}%`;
        bar.style.background = `linear-gradient(90deg, ${body.__palette.bg}, ${body.__palette.bgTop})`;
      }
      if (tagAutoHideRef.current) clearTimeout(tagAutoHideRef.current);
      tagAutoHideRef.current = window.setTimeout(() => {
        tagLockedRef.current = null;
        hoveredRef.current = null;
      }, 2500);
    };

    const onPointerDown = (e: PointerEvent) => {
      const { x, y } = getLocal(e.clientX, e.clientY);
      const hit = findPillAt(x, y);
      if (!hit) {
        if (tagLockedRef.current) {
          tagLockedRef.current = null;
          hoveredRef.current = null;
        }
        return;
      }
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
      const dx = x - hit.position.x;
      const dy = y - hit.position.y;
      const cos = Math.cos(-hit.angle);
      const sin = Math.sin(-hit.angle);
      const localBody = { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
      dragRef.current = {
        kind: "pending-drag",
        pointerId: e.pointerId,
        body: hit,
        localOffset: localBody,
        startClient: { x: e.clientX, y: e.clientY },
        startWorld: { x, y },
      };

      if (e.pointerType !== "mouse") {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = window.setTimeout(() => {
          const cur = dragRef.current;
          if (cur.kind === "pending-drag" && cur.body === hit) {
            tagLockedRef.current = hit;
            showTagFor(hit);
          }
        }, 200);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const { x, y } = getLocal(e.clientX, e.clientY);
      const state = dragRef.current;

      if (state.kind === "idle") {
        if (e.pointerType === "mouse") {
          const hit = findPillAt(x, y);
          hoveredRef.current = hit;
          if (hit) showTagFor(hit);
          canvas.style.cursor = hit ? "grab" : "default";
        }
        return;
      }

      if (state.kind === "pending-drag") {
        const dx = e.clientX - state.startClient.x;
        const dy = e.clientY - state.startClient.y;
        const total = Math.hypot(dx, dy);
        if (total < 6) return;
        if (e.pointerType !== "mouse" && Math.abs(dy) > Math.abs(dx) * 1.4) {
          try {
            canvas.releasePointerCapture(state.pointerId);
          } catch {}
          if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
          }
          dragRef.current = { kind: "idle" };
          return;
        }
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        const stiffness = e.pointerType === "mouse" ? 0.22 : 0.32;
        const constraint = Matter.Constraint.create({
          pointA: { x, y },
          bodyB: state.body,
          pointB: state.localOffset,
          stiffness,
          damping: 0.08,
          length: 0,
        });
        Matter.World.add(engine.world, constraint);
        canvas.style.cursor = "grabbing";
        dragRef.current = {
          kind: "dragging",
          pointerId: state.pointerId,
          body: state.body,
          constraint,
          localOffset: state.localOffset,
          samples: [{ t: performance.now(), x, y }],
        };
        return;
      }

      if (state.kind === "dragging") {
        state.constraint.pointA = { x, y };
        const v = state.body.velocity;
        const sp = Math.hypot(v.x, v.y);
        if (sp > 28) {
          Matter.Body.setVelocity(state.body, { x: (v.x / sp) * 28, y: (v.y / sp) * 28 });
        }
        const t = performance.now();
        state.samples.push({ t, x, y });
        while (state.samples.length > 1 && t - state.samples[0].t > 80) state.samples.shift();
      }
    };

    const finishPointer = (e: PointerEvent) => {
      const state = dragRef.current;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (state.kind === "dragging" && state.pointerId === e.pointerId) {
        const samples = state.samples;
        if (samples.length >= 2) {
          const a = samples[0];
          const b = samples[samples.length - 1];
          const dt = Math.max(1, b.t - a.t);
          let vx = ((b.x - a.x) / dt) * 16;
          let vy = ((b.y - a.y) / dt) * 16;
          const sp = Math.hypot(vx, vy);
          if (sp > 24) {
            vx = (vx / sp) * 24;
            vy = (vy / sp) * 24;
          }
          Matter.Body.setVelocity(state.body, { x: vx, y: vy });
        }
        Matter.World.remove(engine.world, state.constraint);
        try {
          canvas.releasePointerCapture(state.pointerId);
        } catch {}
        canvas.style.cursor = "default";
      } else if (state.kind === "pending-drag" && state.pointerId === e.pointerId) {
        try {
          canvas.releasePointerCapture(state.pointerId);
        } catch {}
      }
      dragRef.current = { kind: "idle" };
    };

    const onPointerLeave = () => {
      if (dragRef.current.kind === "idle") {
        hoveredRef.current = null;
        canvas.style.cursor = "default";
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerup", finishPointer);
    canvas.addEventListener("pointercancel", finishPointer);
    canvas.addEventListener("pointerleave", onPointerLeave);

    // ============================================================
    // Scroll-driven physics — the pills behave like real objects
    // sitting in a moving container. Newton's 1st law: when the page
    // (their container) accelerates, they lag behind and FEEL the
    // pseudo-force in the opposite direction. This works on every
    // input device (wheel, trackpad, touch flick).
    //
    // We feed two channels into the engine:
    //   1) An instantaneous translational impulse on every body whose
    //      magnitude is proportional to scroll velocity.
    //   2) A short-lived gravity bias proportional to scroll
    //      acceleration — fast flicks momentarily change "down".
    // Both decay smoothly so the field settles after the user stops.
    // ============================================================
    let lastScrollY = window.scrollY;
    let lastScrollT = performance.now();
    let smoothedVy = 0; // px/ms, smoothed scroll velocity
    let prevSmoothedVy = 0; // for acceleration estimate
    let scrollGravityBias = 0; // current gravity offset from scroll
    const baseGravityYInitial = engine.gravity.y;
    let scrollRaf = 0;

    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const now = performance.now();
        const dy = window.scrollY - lastScrollY;
        const dt = Math.max(1, now - lastScrollT);
        lastScrollY = window.scrollY;
        lastScrollT = now;
        if (!visibleRef.current || reducedMotionRef.current) return;

        // Instantaneous scroll velocity in px/ms.
        const inst = dy / dt;
        prevSmoothedVy = smoothedVy;
        // Faster smoothing — react quickly to flicks but still stable.
        smoothedVy = smoothedVy * 0.35 + inst * 0.65;

        // Acceleration (jerk) of the scroll — used for gravity bias kick.
        const accel = (smoothedVy - prevSmoothedVy) / dt; // px/ms²

        // ---- Channel 1: pseudo-force on every body (inertial reaction) ----
        // Toned down significantly so fast scrolls don't fling pills into
        // weird stuck positions. Smooth nudge instead of hard kick.
        const inertiaForce = -smoothedVy * 0.006;
        const clampedForce = Math.max(-0.022, Math.min(0.022, inertiaForce));

        // ---- Channel 2: temporary gravity bias from scroll acceleration ----
        // The bias itself is applied inside `onSensorTick` so it composes
        // smoothly with the tilt-driven gravity vector (instead of fighting it).
        scrollGravityBias = Math.max(
          -0.6,
          Math.min(0.6, scrollGravityBias * 0.55 + accel * -160),
        );

        if (Math.abs(clampedForce) < 0.00008) return;
        for (const b of bodiesRef.current) {
          // Lateral jitter — much smaller so pills don't drift sideways.
          const jitter = (Math.random() - 0.5) * Math.abs(clampedForce) * 0.35;
          // Slight torque for natural tumble, but reduced.
          const torque = (Math.random() - 0.5) * Math.abs(clampedForce) * 2;
          Matter.Body.applyForce(b, b.position, { x: jitter, y: clampedForce });
          b.torque += torque;
          // Safety cap on linear velocity — lower so things settle quickly.
          const v = b.velocity;
          const sp = Math.hypot(v.x, v.y);
          if (sp > 16)
            Matter.Body.setVelocity(b, { x: (v.x / sp) * 16, y: (v.y / sp) * 16 });
          // Cap angular velocity too — prevent dizzy spins.
          if (Math.abs(b.angularVelocity) > 0.3)
            Matter.Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * 0.3);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Continuous decay of the scroll-induced gravity bias so it settles
    // back to base when the user stops scrolling. Runs at ~60Hz via the
    // engine tick — guarantees no stuck tilt.
    const onBeforeUpdate = () => {
      if (reducedMotionRef.current) return;
      // Faster decay so pills settle quickly after a scroll burst.
      smoothedVy *= 0.82;
      scrollGravityBias *= 0.78;
      // NOTE: gravity is now driven by `onSensorTick` which folds in
      // `scrollGravityBias` on top of the tilt-derived vector. We avoid
      // touching engine.gravity here so the two systems don't fight.
    };
    Matter.Events.on(engine, "beforeUpdate", onBeforeUpdate);

    // ============================================================
    // Device sensors — DeviceOrientation (tilt) + DeviceMotion (shake)
    // ------------------------------------------------------------
    // Implementation rules (per UX spec):
    //   • Apply per-body force scaled by each pill's __depth (parallax).
    //   • DO NOT mutate global gravity from tilt — that would override
    //     the straight-down fall and the scroll-driven gravity bias.
    //   • Smooth raw sensor values with EMA so motion is fluid, not jittery.
    //   • Cap forces so pills never escape the canvas.
    //   • iOS 13+ requires explicit permission via a user gesture.
    //   • If sensors are unsupported / denied, fall back to mouse parallax
    //     on the wrap element (works for desktop and any non-sensor device).
    //   • Sensors only run when `visibleRef.current` to save battery.
    // ============================================================
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const isSecure =
      typeof window !== "undefined" &&
      (window.isSecureContext || location.hostname === "localhost");
    const supportsOrientation =
      typeof window !== "undefined" && "DeviceOrientationEvent" in window;
    const supportsMotion =
      typeof window !== "undefined" && "DeviceMotionEvent" in window;
    type AnyOrientationCtor = { requestPermission?: () => Promise<"granted" | "denied"> };
    type AnyMotionCtor = { requestPermission?: () => Promise<"granted" | "denied"> };
    const needsIosPermission =
      isSecure &&
      ((supportsOrientation &&
        typeof (DeviceOrientationEvent as unknown as AnyOrientationCtor).requestPermission ===
          "function") ||
        (supportsMotion &&
          typeof (DeviceMotionEvent as unknown as AnyMotionCtor).requestPermission ===
            "function"));

    // Smoothed sensor state (module-scoped to this effect).
    let tiltX = 0; // gamma in deg, smoothed (left/right tilt) — drives gravity.x
    let tiltY = 0; // beta in deg, smoothed (front/back tilt) — drives gravity.y
    let lastShakeMag = 0;
    let shakeAt = 0;
    let pointerParallaxX = 0;
    let pointerParallaxY = 0;

    // Read screen orientation so we remap sensor axes when the user rotates
    // the phone to landscape / upside-down. Without this, gravity stays glued
    // to portrait and the pills never "fall" toward the new bottom edge.
    const getScreenAngle = (): number => {
      const so = (screen as Screen & { orientation?: { angle?: number } }).orientation;
      if (so && typeof so.angle === "number") return so.angle;
      const wo = (window as Window & { orientation?: number }).orientation;
      return typeof wo === "number" ? wo : 0;
    };

    const onOrient = (e: DeviceOrientationEvent) => {
      if (!visibleRef.current || reducedMotionRef.current) return;
      const gammaRaw = typeof e.gamma === "number" ? e.gamma : 0; // -90..90 (left/right)
      const betaRaw = typeof e.beta === "number" ? e.beta : 45; // -180..180 (front/back)

      // Remap axes for the current screen orientation so "down" always
      // matches the visible bottom of the canvas.
      const angle = getScreenAngle();
      let gx = gammaRaw;
      let gy = betaRaw;
      if (angle === 90) {
        gx = betaRaw;
        gy = -gammaRaw;
      } else if (angle === -90 || angle === 270) {
        gx = -betaRaw;
        gy = gammaRaw;
      } else if (angle === 180) {
        gx = -gammaRaw;
        gy = -betaRaw;
      }

      // Clamp to a comfortable hold range. We DON'T re-center beta around 45°
      // anymore — the user wants gravity to truly follow the phone, including
      // when it's lying flat or upside-down.
      const rawX = Math.max(-45, Math.min(45, gx));
      const rawY = Math.max(-45, Math.min(45, gy));
      // Strong EMA — tilt feels physical, not jittery.
      tiltX = tiltX * 0.82 + rawX * 0.18;
      tiltY = tiltY * 0.82 + rawY * 0.18;
    };

    const onMotion = (e: DeviceMotionEvent) => {
      if (!visibleRef.current || reducedMotionRef.current) return;
      const a = e.accelerationIncludingGravity ?? e.acceleration;
      if (!a) return;
      const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      // Detect a "shake": rapid jump in acceleration magnitude.
      const jolt = Math.abs(mag - lastShakeMag);
      lastShakeMag = mag;
      const now = performance.now();
      // Throttle shake impulses — at most one every 140ms — and require a
      // meaningful jolt so a steady walk doesn't trigger it.
      if (jolt > 6 && now - shakeAt > 140) {
        shakeAt = now;
        const dirX = (a.x ?? 0) > 0 ? -1 : 1; // opposite of accel direction
        const dirY = (a.y ?? 0) > 0 ? -1 : 1;
        // Scale impulse by jolt magnitude, capped so it never throws pills
        // out of the canvas in one frame.
        const impulse = Math.min(0.022, jolt * 0.0014);
        for (const b of bodiesRef.current) {
          const k = b.__depth;
          Matter.Body.applyForce(b, b.position, {
            x: dirX * impulse * k * (0.6 + Math.random() * 0.8),
            y: dirY * impulse * k * (0.4 + Math.random() * 0.6),
          });
          b.torque += (Math.random() - 0.5) * impulse * 12 * k;
        }
      }
    };

    // Mouse-parallax fallback for devices without (or that deny) sensors.
    const onWrapMouseMove = (e: MouseEvent) => {
      if (reducedMotionRef.current) return;
      const rect = wrap.getBoundingClientRect();
      // Range -1..1 around centre.
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      pointerParallaxX = pointerParallaxX * 0.78 + nx * 22 * 0.22;
      pointerParallaxY = pointerParallaxY * 0.78 + ny * 22 * 0.22;
    };

    // Continuously inject the smoothed sensor / pointer values. Tilt drives
    // the actual gravity vector so when the phone is rotated (portrait →
    // landscape → upside-down) the pills truly fall toward the new "down".
    // Pointer parallax keeps adding a gentle depth-scaled nudge for desktop.
    const baseGravityMag = baseGravityYInitial; // ~1
    const onSensorTick = () => {
      if (!visibleRef.current || reducedMotionRef.current) return;
      const list = bodiesRef.current;
      if (list.length === 0) return;

      // Map tilt (deg) to a gravity vector. sin() is signed so tilting
      // forward pulls down, backward pulls up, left/right pulls sideways —
      // gravity truly follows the phone in every direction.
      const radX = (tiltX * Math.PI) / 180;
      const radY = (tiltY * Math.PI) / 180;
      const targetGx = Math.sin(radX) * baseGravityMag;
      const targetGy = Math.sin(radY) * baseGravityMag;

      // Smooth blend so the field doesn't snap when orientation flips.
      engine.gravity.x = engine.gravity.x * 0.86 + targetGx * 0.14;
      // Preserve any active scroll-induced bias by adding it on top of the
      // tilt-driven base. scrollGravityBias decays naturally each frame.
      engine.gravity.y =
        engine.gravity.y * 0.86 + (targetGy + scrollGravityBias) * 0.14;

      // Keep the pointer-parallax depth-scaled nudge for desktop visitors.
      const fxBase = pointerParallaxX * 0.0000048;
      const fyBase = pointerParallaxY * 0.0000028;
      if (Math.abs(fxBase) < 1e-7 && Math.abs(fyBase) < 1e-7) return;
      for (const b of list) {
        const k = b.__depth;
        Matter.Body.applyForce(b, b.position, { x: fxBase * k, y: fyBase * k });
      }
    };
    Matter.Events.on(engine, "beforeUpdate", onSensorTick);

    // Always wire up the mouse fallback — it costs nothing and helps when
    // sensors are absent or never granted (e.g. desktop visitors).
    wrap.addEventListener("mousemove", onWrapMouseMove);

    const attachSensors = () => {
      if (!isSecure) return;
      if (supportsOrientation) window.addEventListener("deviceorientation", onOrient);
      if (supportsMotion) window.addEventListener("devicemotion", onMotion);
    };

    // Function the iOS permission button will call. Async so the click
    // handler can `await` user choice before attaching listeners.
    const requestMotion = async () => {
      if (!isSecure) {
        setMotionDenied(true);
        return;
      }
      try {
        const OE = DeviceOrientationEvent as unknown as AnyOrientationCtor;
        const ME = DeviceMotionEvent as unknown as AnyMotionCtor;
        const promises: Promise<"granted" | "denied">[] = [];
        if (typeof OE.requestPermission === "function") promises.push(OE.requestPermission());
        if (typeof ME.requestPermission === "function") promises.push(ME.requestPermission());
        const results = await Promise.all(promises);
        const granted = results.length === 0 || results.every((r) => r === "granted");
        if (granted) {
          attachSensors();
          setNeedsMotionPermission(false);
        } else {
          setMotionDenied(true);
        }
      } catch {
        setMotionDenied(true);
      }
    };
    requestMotionRef.current = requestMotion;

    if (needsIosPermission) {
      // Wait for the user gesture — rendered as a button in the JSX below.
      setNeedsMotionPermission(true);
    } else if ((supportsOrientation || supportsMotion) && isCoarsePointer && isSecure) {
      // Auto-attach on Android / non-iOS phones where no permission is needed.
      attachSensors();
    }

    try {
      if (!sessionStorage.getItem("pp:hint:v1")) {
        setShowHint(true);
        sessionStorage.setItem("pp:hint:v1", "1");
        setTimeout(() => setShowHint(false), 4500);
      }
    } catch {}

    return () => {
      mql.removeEventListener?.("change", onMql);
      ro.disconnect();
      io.disconnect();
      if (resizeTimer) window.clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearSpawnTimers();
      window.removeEventListener("scroll", onScroll);
      // Detach device sensors (always safe to remove — no-op if not added)
      // and the pointer fallback.
      if (supportsOrientation) window.removeEventListener("deviceorientation", onOrient);
      if (supportsMotion) window.removeEventListener("devicemotion", onMotion);
      wrap.removeEventListener("mousemove", onWrapMouseMove);
      requestMotionRef.current = null;
      Matter.Events.off(engine, "beforeUpdate", onSensorTick);
      Matter.Events.off(engine, "beforeUpdate", onBeforeUpdate);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", finishPointer);
      canvas.removeEventListener("pointercancel", finishPointer);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      Matter.Runner.stop(runner);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      engineRef.current = null;
      runnerRef.current = null;
      bodiesRef.current = [];
      wallsRef.current = [];
    };
  }, [height, pillData]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ height, touchAction: "pan-y", overflow: "visible" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute left-0 right-0 block"
        style={{
          touchAction: "pan-y",
          top: -OVERFLOW_TOP,
          // Ensure the overflow zone never intercepts pointer events from
          // the section above (e.g. the dark band's UI).
          pointerEvents: "auto",
        }}
      />
      <div
        ref={tagRef}
        className="pointer-events-none absolute left-0 top-0 z-10 transition-opacity duration-150"
        style={{ opacity: 0, willChange: "transform, opacity" }}
      >
        <div className="relative inline-flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-background/95 px-3 py-2 shadow-lg backdrop-blur min-w-[140px]">
          <div className="flex items-center justify-between gap-3 text-xs font-medium">
            <span data-label className="text-foreground" />
            <span data-pct className="tabular-nums text-muted-foreground" />
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              ref={tagBarRef}
              className="h-full rounded-full transition-[width] duration-200"
              style={{ width: "0%" }}
            />
          </div>
          <div className="absolute left-1/2 -bottom-1.5 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-border/60 bg-background/95" />
        </div>
      </div>
      {showHint && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
          <span dir="auto">
            Hover or hold a pill to see its level · مرّر فوق العنصر أو اضغط مطولًا
          </span>
        </div>
      )}
      {needsMotionPermission && !motionDenied && (
        <button
          type="button"
          onClick={() => requestMotionRef.current?.()}
          className="absolute right-3 top-3 z-10 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm backdrop-blur transition hover:bg-accent"
        >
          <span dir="auto">Enable motion · تفعيل الحركة</span>
        </button>
      )}
      {motionDenied && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
          <span dir="auto">Motion unavailable · الحساسات غير متاحة</span>
        </div>
      )}
    </div>
  );
});

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

function lighten(hex: string, amount: number) {
  const m = hex.replace("#", "");
  const num = parseInt(m, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.min(255, Math.round(r + 255 * amount));
  g = Math.min(255, Math.round(g + 255 * amount));
  b = Math.min(255, Math.round(b + 255 * amount));
  return `rgb(${r}, ${g}, ${b})`;
}
