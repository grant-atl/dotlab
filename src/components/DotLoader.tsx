import { useEffect, useRef, type CSSProperties } from "react";
import { COMPLETE_DURATION, sampleLoaderPoint, type LoaderPoint, type LoaderState } from "../lib/loaders";

export type DotLoaderProps = {
  state?: LoaderState;
  size?: number;
  color?: string;
  speed?: number;
  intensity?: number;
  spacing?: number;
  dotSize?: number;
  depth?: number;
  yaw?: number;
  pitch?: number;
  level?: number;
  paused?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
};

export function DotLoader({
  state = "processing", size = 64, color = "#baff66", speed = 0.7,
  intensity = 0.65, spacing = 1, dotSize = 1, depth = 0.65,
  yaw = -32, pitch = 22, level = 0.5, paused = false, label, className, style,
}: DotLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef({ state, color, speed, intensity, spacing, dotSize, depth, yaw, pitch, level, paused });
  settingsRef.current = { state, color, speed, intensity, spacing, dotSize, depth, yaw, pitch, level, paused };
  const engineRef = useRef({ state, time: 0, morphTime: 0, points: [] as LoaderPoint[], from: null as LoaderPoint[] | null });
  const refreshRef = useRef<(() => void) | null>(null);
  const canvasSize = Number.isFinite(size) ? Math.max(12, Math.min(512, size)) : 64;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const engine = engineRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const bounded = (value: number, fallback: number, min: number, max: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
    let width = 0, height = 0, frame = 0, previous = 0;
    let inView = false;

    function playing() {
      return inView && !document.hidden && !reducedMotion.matches && !settingsRef.current.paused && bounded(settingsRef.current.speed, 0.7, 0, 4) > 0;
    }

    function draw() {
      if (!context || !width || !height) return;
      const settings = settingsRef.current;
      const side = Math.min(width, height);
      const compact = side <= 32;
      const separation = bounded(settings.depth, 0.65, 0, 1);
      const angleY = bounded(settings.yaw, -32, -360, 360) * Math.PI / 180;
      const angleX = bounded(settings.pitch, 22, -89, 89) * Math.PI / 180;
      const cy = Math.cos(angleY), sy = Math.sin(angleY), cx = Math.cos(angleX), sx = Math.sin(angleX);
      const radius = side * (compact ? 0.033 : 0.026) * bounded(settings.dotSize, 1, 0.5, 1.8);
      const projected: (LoaderPoint & { perspective: number; radius: number })[] = [];
      let extentX = 0, extentY = 0, maximumRadius = 0;
      for (let i = 0; i < 27; i++) {
        const target = sampleLoaderPoint(engine.state, i, engine.time, settings.intensity, settings.level);
        const from = engine.from?.[i];
        if (from) {
          const progress = Math.max(0, Math.min(1, (engine.morphTime - i / 26 * 0.08) / 0.52));
          const eased = progress * progress * (3 - 2 * progress);
          for (const key of ["x", "y", "z", "alpha", "scale"] as const) target[key] = from[key] + (target[key] - from[key]) * eased;
        }
        engine.points[i] = target;
        const x = target.x * cy + target.z * sy;
        const z = target.z * cy - target.x * sy;
        const y = target.y * cx - z * sx;
        const distance = target.y * sx + z * cx;
        const perspective = 1 / (1 + separation * distance * (compact ? 0.055 : 0.09));
        const dotRadius = radius * target.scale * perspective;
        projected.push({ ...target, x, y, z: distance, perspective, radius: dotRadius });
        extentX = Math.max(extentX, Math.abs(x * perspective));
        extentY = Math.max(extentY, Math.abs(y * perspective));
        maximumRadius = Math.max(maximumRadius, dotRadius);
      }
      if (engine.morphTime >= 0.6) engine.from = null;
      const margin = side * 0.055 + maximumRadius;
      const scale = Math.min(side * 0.22 * bounded(settings.spacing, 1, 0.6, 1.4), (width / 2 - margin) / Math.max(0.1, extentX), (height / 2 - margin) / Math.max(0.1, extentY));
      context.clearRect(0, 0, width, height);
      context.fillStyle = settings.color;
      projected.sort((a, b) => b.z - a.z);
      for (const point of projected) {
        context.globalAlpha = Math.max(compact ? 0.58 : 0.14, Math.min(1, point.alpha * (1 - separation * (0.3 + point.z * 0.16))));
        context.beginPath();
        context.arc(width / 2 + point.x * point.perspective * scale, height / 2 + point.y * point.perspective * scale, point.radius, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    }

    function reconcile() {
      if (!playing()) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
      } else if (!frame) {
        previous = 0;
        frame = window.requestAnimationFrame(tick);
      }
    }

    function refresh() {
      const settings = settingsRef.current;
      if (settings.state !== engine.state) {
        const animate = !reducedMotion.matches && !settings.paused && bounded(settings.speed, 0.7, 0, 4) > 0;
        engine.from = animate && engine.points.length === 27 ? engine.points.map((point) => ({ ...point })) : null;
        engine.state = settings.state;
        engine.time = animate ? 0 : settings.state === "complete" ? COMPLETE_DURATION : 1.2;
        engine.morphTime = 0;
      }
      if (reducedMotion.matches) {
        engine.from = null;
        engine.time = engine.state === "complete" ? COMPLETE_DURATION : 1.2;
      }
      draw();
      reconcile();
    }

    function tick(now: number) {
      frame = 0;
      if (!playing()) { previous = 0; return; }
      const elapsed = previous ? Math.max(0, Math.min(0.05, (now - previous) / 1000)) : 0;
      previous = now;
      // Finish the entrance morph before the one-shot sequence, even at high speeds.
      if (engine.state !== "complete" || !engine.from) engine.time += elapsed * bounded(settingsRef.current.speed, 0.7, 0, 4);
      if (engine.from) engine.morphTime += elapsed;
      draw();
      frame = window.requestAnimationFrame(tick);
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const displayed = canvas.getBoundingClientRect();
      const magnification = Math.max(1, displayed.width / (width || 1), displayed.height / (height || 1));
      const dpr = Math.min(4, Math.min(window.devicePixelRatio || 1, 2) * magnification);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    });
    const intersectionObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; refresh(); });
    refreshRef.current = refresh;
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    document.addEventListener("visibilitychange", refresh);
    reducedMotion.addEventListener("change", refresh);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", refresh);
      reducedMotion.removeEventListener("change", refresh);
      refreshRef.current = null;
    };
  }, []);

  useEffect(() => { refreshRef.current?.(); }, [state, color, speed, intensity, spacing, dotSize, depth, yaw, pitch, level, paused]);

  return <canvas ref={canvasRef} className={className} style={{ width: canvasSize, height: canvasSize, display: "block", ...style }} role={label ? "img" : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true} />;
}
