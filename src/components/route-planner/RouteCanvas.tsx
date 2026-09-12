"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { clampScale, fitViewport, screenToWorld, worldToScreen, type ScreenPoint, type Viewport } from "@/lib/minecraft/coordinates";
import type { RoutePlanResult } from "@/lib/minecraft/route";

export interface RouteCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  centerRoute: () => void;
}

interface RouteCanvasProps {
  result: RoutePlanResult;
}

const COLORS = {
  background: "#0f1115",
  gridMinor: "#1c2028",
  gridMajor: "#262b35",
  axisLine: "#3a4150",
  axisText: "#8b93a3",
  hubStroke: "#f59e0b",
  hubFill: "rgba(245, 158, 11, 0.08)",
  idealLine: "#38bdf8",
  corridorFill: "rgba(16, 185, 129, 0.35)",
  centerlineStroke: "#34d399",
  origin: "#f8fafc",
  destination: "#fb7185",
  hubExit: "#f59e0b",
} as const;

function niceStep(scale: number, targetPx = 90): number {
  const rawBlocks = targetPx / scale;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawBlocks)));
  const residual = rawBlocks / magnitude;
  let niceResidual: number;
  if (residual >= 5) niceResidual = 10;
  else if (residual >= 2) niceResidual = 5;
  else if (residual >= 1) niceResidual = 2;
  else niceResidual = 1;
  return Math.max(1, niceResidual * magnitude);
}

function panViewportByScreenDelta(viewport: Viewport, dxPx: number, dyPx: number): Viewport {
  // Screen Z is drawn increasing downward (see coordinates.ts), so both
  // axes shift the center in the same sign relative to their screen delta.
  return {
    scale: viewport.scale,
    center: {
      x: viewport.center.x - dxPx / viewport.scale,
      z: viewport.center.z - dyPx / viewport.scale,
    },
  };
}

export const RouteCanvas = forwardRef<RouteCanvasHandle, RouteCanvasProps>(function RouteCanvas(
  { result },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<Viewport>({ center: { x: 0, z: 0 }, scale: 4 });

  const dragState = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);

  const fitPoints = useMemo(() => {
    const points = [result.origin, result.destination];
    if (result.hub.radius > 0) {
      points.push(
        { x: result.origin.x - result.hub.radius, z: result.origin.z },
        { x: result.origin.x + result.hub.radius, z: result.origin.z },
        { x: result.origin.x, z: result.origin.z - result.hub.radius },
        { x: result.origin.x, z: result.origin.z + result.hub.radius },
      );
    }
    return points;
  }, [result.origin, result.destination, result.hub.radius]);

  const centerRoute = useCallback(() => {
    if (size.width === 0 || size.height === 0) return;
    setViewport(fitViewport(fitPoints, size.width, size.height));
  }, [fitPoints, size.width, size.height]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => setViewport((v) => ({ ...v, scale: clampScale(v.scale * 1.4) })),
      zoomOut: () => setViewport((v) => ({ ...v, scale: clampScale(v.scale / 1.4) })),
      centerRoute,
    }),
    [centerRoute],
  );

  // Track container size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-fit whenever the route's key geometry (not e.g. tunnel width) changes.
  // Keyed on primitive values rather than `fitPoints` itself, since a new
  // planRoute() result creates a fresh array on every render regardless of
  // whether origin/destination/hubRadius actually changed.
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return;
    setViewport(fitViewport(fitPoints, size.width, size.height));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    result.origin.x,
    result.origin.z,
    result.destination.x,
    result.destination.z,
    result.hub.radius,
    size.width,
    size.height,
  ]);

  // Wheel-to-zoom, attached natively so we can preventDefault (avoid page scroll).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pointerScreen: ScreenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      setViewport((oldViewport) => {
        const worldUnderCursor = screenToWorld(pointerScreen, oldViewport, size.width, size.height);
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const newScale = clampScale(oldViewport.scale * factor);
        const guess: Viewport = { center: oldViewport.center, scale: newScale };
        const screenAtGuess = worldToScreen(worldUnderCursor, guess, size.width, size.height);
        return panViewportByScreenDelta(guess, pointerScreen.x - screenAtGuess.x, pointerScreen.y - screenAtGuess.y);
      });
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [size.width, size.height]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    dragState.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dxPx = e.clientX - drag.lastX;
    const dyPx = e.clientY - drag.lastY;
    dragState.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
    setViewport((v) => panViewportByScreenDelta(v, dxPx, dyPx));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragState.current?.pointerId === e.pointerId) dragState.current = null;
  };

  // Draw.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w2s = (p: { x: number; z: number }) => worldToScreen(p, viewport, size.width, size.height);

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, size.width, size.height);

    const topLeftWorld = screenToWorld({ x: 0, y: 0 }, viewport, size.width, size.height);
    const bottomRightWorld = screenToWorld({ x: size.width, y: size.height }, viewport, size.width, size.height);
    const minX = Math.min(topLeftWorld.x, bottomRightWorld.x);
    const maxX = Math.max(topLeftWorld.x, bottomRightWorld.x);
    const minZ = Math.min(topLeftWorld.z, bottomRightWorld.z);
    const maxZ = Math.max(topLeftWorld.z, bottomRightWorld.z);

    // Individual block grid, only when zoomed in enough to be legible/cheap.
    if (viewport.scale >= 8) {
      ctx.strokeStyle = COLORS.gridMinor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
        const sx = w2s({ x, z: 0 }).x;
        ctx.moveTo(sx + 0.5, 0);
        ctx.lineTo(sx + 0.5, size.height);
      }
      for (let z = Math.floor(minZ); z <= Math.ceil(maxZ); z++) {
        const sy = w2s({ x: 0, z }).y;
        ctx.moveTo(0, sy + 0.5);
        ctx.lineTo(size.width, sy + 0.5);
      }
      ctx.stroke();
    }

    // Major grid + axis labels.
    const step = niceStep(viewport.scale);
    ctx.strokeStyle = COLORS.gridMajor;
    ctx.lineWidth = 1;
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = COLORS.axisText;

    const firstX = Math.floor(minX / step) * step;
    ctx.beginPath();
    for (let x = firstX; x <= maxX; x += step) {
      const sx = w2s({ x, z: 0 }).x;
      ctx.moveTo(sx + 0.5, 0);
      ctx.lineTo(sx + 0.5, size.height);
    }
    const firstZ = Math.floor(minZ / step) * step;
    for (let z = firstZ; z <= maxZ; z += step) {
      const sy = w2s({ x: 0, z }).y;
      ctx.moveTo(0, sy + 0.5);
      ctx.lineTo(size.width, sy + 0.5);
    }
    ctx.stroke();

    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    for (let x = firstX; x <= maxX; x += step) {
      const sx = w2s({ x, z: 0 }).x;
      ctx.fillText(String(Math.round(x)), sx + 3, 3);
    }
    ctx.textAlign = "left";
    for (let z = firstZ; z <= maxZ; z += step) {
      const sy = w2s({ x: 0, z }).y;
      ctx.fillText(String(Math.round(z)), 3, sy + 3);
    }

    // World axes (X=0 / Z=0), when visible.
    ctx.strokeStyle = COLORS.axisLine;
    ctx.lineWidth = 1.5;
    if (minX <= 0 && 0 <= maxX) {
      const sx = w2s({ x: 0, z: 0 }).x;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, size.height);
      ctx.stroke();
    }
    if (minZ <= 0 && 0 <= maxZ) {
      const sy = w2s({ x: 0, z: 0 }).y;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(size.width, sy);
      ctx.stroke();
    }

    // Hub circle.
    if (result.hub.radius > 0) {
      const center = w2s(result.origin);
      const radiusPx = result.hub.radius * viewport.scale;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.hubFill;
      ctx.fill();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = COLORS.hubStroke;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Tunnel corridor blocks (the actual construction area).
    const blockPx = Math.max(1, viewport.scale);
    ctx.fillStyle = COLORS.corridorFill;
    for (const block of result.tunnel.corridorBlocks) {
      const s = w2s(block);
      ctx.fillRect(s.x - blockPx / 2, s.y - blockPx / 2, blockPx, blockPx);
    }

    // Centerline blocks (exact discrete trajectory) drawn as a brighter spine.
    if (viewport.scale >= 3) {
      ctx.strokeStyle = COLORS.centerlineStroke;
      ctx.lineWidth = 1;
      for (const block of result.tunnel.centerline) {
        const s = w2s(block);
        ctx.strokeRect(s.x - blockPx / 2 + 0.5, s.y - blockPx / 2 + 0.5, blockPx - 1, blockPx - 1);
      }
    }

    // Ideal straight line (origin -> destination), full route.
    if (!result.isSamePoint) {
      const from = w2s(result.origin);
      const to = w2s(result.destination);
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = COLORS.idealLine;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Hub exit marker.
    if (result.hub.radius > 0 && !result.hub.withinHub && !result.isSamePoint) {
      const exit = w2s(result.hub.exitPoint);
      ctx.beginPath();
      ctx.arc(exit.x, exit.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.hubExit;
      ctx.fill();
    }

    // Origin marker.
    const originScreen = w2s(result.origin);
    ctx.beginPath();
    ctx.arc(originScreen.x, originScreen.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.origin;
    ctx.fill();
    ctx.fillStyle = COLORS.axisText;
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Centro", originScreen.x, originScreen.y - 20);

    // Destination marker.
    const destScreen = w2s(result.destination);
    ctx.beginPath();
    ctx.arc(destScreen.x, destScreen.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.destination;
    ctx.fill();
    ctx.fillText("Portal", destScreen.x, destScreen.y - 20);

    // Compass rose (fixed to the canvas, not the world): screen-up is North.
    const compassX = 28;
    const compassY = size.height - 28;
    ctx.beginPath();
    ctx.arc(compassX, compassY, 16, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 17, 21, 0.85)";
    ctx.fill();
    ctx.strokeStyle = COLORS.axisLine;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(compassX, compassY - 11);
    ctx.lineTo(compassX - 4, compassY + 2);
    ctx.lineTo(compassX + 4, compassY + 2);
    ctx.closePath();
    ctx.fillStyle = COLORS.destination;
    ctx.fill();
    ctx.fillStyle = COLORS.axisText;
    ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("N", compassX, compassY + 5);
  }, [result, viewport, size]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-lg border border-neutral-800">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
      />
    </div>
  );
});
