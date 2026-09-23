import { useEffect, useRef, type CSSProperties } from "react";
import { samplePoint, type PatternId, type Point } from "../lib/patterns";

export type DotFieldProps = {
  pattern?: PatternId;
  color?: string;
  speed?: number;
  paused?: boolean;
  density?: number;
  morph?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function DotField({
  pattern = "sphere",
  color = "#baff66",
  speed = 1,
  paused = false,
  density = 1,
  morph = false,
  className,
  style,
}: DotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const shapeRef = useRef({
    pattern,
    points: [] as Point[],
    from: null as Point[] | null,
    elapsed: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const count = Math.round(
      Math.max(
        160,
        Math.min(2200, 1150 * (Number.isFinite(density) ? density : 1)),
      ),
    );
    const clockSpeed = Number.isFinite(speed)
      ? Math.max(0, Math.min(5, speed))
      : 1;
    const shape = shapeRef.current;
    if (shape.pattern !== pattern) {
      shape.from =
        morph && !paused && !reducedMotion.matches && clockSpeed > 0 && shape.points.length === count
          ? shape.points.map((point) => ({ ...point }))
          : null;
      shape.elapsed = 0;
      shape.pattern = pattern;
    }
    if (!morph || shape.points.length !== count) shape.from = null;
    let width = 0;
    let height = 0;
    let frame = 0;
    let previous = 0;
    let inView = false;

    function draw() {
      if (!context || !width || !height) return;
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;
      const t = timeRef.current;
      const flat = ["wave", "ripple", "galaxy", "terrain"].includes(pattern);
      const rotateY = flat ? 0.12 : t * 0.11 + 0.35;
      const rotateX = flat ? 0.65 : -0.15;
      const cy = Math.cos(rotateY);
      const sy = Math.sin(rotateY);
      const cx = Math.cos(rotateX);
      const sx = Math.sin(rotateX);
      const scale = Math.min(width * 0.285, height * 0.36);
      const dotSize = Math.max(0.65, Math.min(1.8, width / 480));
      if (reducedMotion.matches || shape.elapsed >= 1.4) shape.from = null;

      for (let i = 0; i < count; i++) {
        const p = samplePoint(pattern, i, count, t);
        let x = p.x * cy + p.z * sy;
        const z = p.z * cy - p.x * sy;
        let y = p.y * cx - z * sx;
        let depth = p.y * sx + z * cx;
        const from = shape.from?.[i];
        if (from) {
          const progress = Math.max(
            0,
            Math.min(1, (shape.elapsed - (i / count) * 0.12) / 1.28),
          );
          const eased = progress * progress * (3 - 2 * progress);
          const bend = Math.sin(progress * Math.PI) * 0.08;
          x = from.x + (x - from.x) * eased + Math.sin(i * 2.39996) * bend;
          y = from.y + (y - from.y) * eased + Math.cos(i * 2.39996) * bend;
          depth = from.z + (depth - from.z) * eased;
        }
        if (morph) {
          const current = shape.points[i] ?? (shape.points[i] = { x: 0, y: 0, z: 0 });
          current.x = x;
          current.y = y;
          current.z = depth;
        }
        const perspective = 4 / (4 + depth);
        const alpha = Math.max(0.13, Math.min(0.95, 0.57 - depth * 0.28));
        const radius = dotSize * Math.max(0.55, Math.min(1.4, perspective));
        context.globalAlpha = alpha;
        context.beginPath();
        context.arc(
          width * 0.5 + x * scale * perspective,
          height * 0.5 + y * scale * perspective,
          radius,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      shape.points.length = morph ? count : 0;
      context.globalAlpha = 1;
    }

    function tick(now: number) {
      frame = 0;
      if (previous) {
        const elapsed = Math.min((now - previous) / 1000, 0.05);
        timeRef.current += elapsed * clockSpeed;
        if (shape.from) shape.elapsed += elapsed;
      }
      previous = now;
      draw();
      frame = window.requestAnimationFrame(tick);
    }

    function sync() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      draw();
      if (
        inView &&
        !document.hidden &&
        !paused &&
        !reducedMotion.matches &&
        clockSpeed > 0
      ) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    });
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });

    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reducedMotion.removeEventListener("change", sync);
    };
  }, [pattern, color, speed, paused, density, morph]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block", ...style }}
      aria-hidden="true"
    />
  );
}
