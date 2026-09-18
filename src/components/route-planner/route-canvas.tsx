"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { clampScale, fitViewport, screenToWorld, worldToScreen, type ScreenPoint, type Viewport } from "@/lib/minecraft/coordinates";
import { rasterizeCircle } from "@/lib/minecraft/line-rasterization";
import { distributePortalsOnHub } from "@/lib/minecraft/portals";
import type { Point, RoutePlanResult } from "@/lib/minecraft/route";

export interface RouteCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  centerRoute: () => void;
}

interface NamedRoute {
  readonly id: string;
  readonly title: string;
  readonly result: RoutePlanResult;
}

interface RouteCanvasProps {
  /** Hub center + radius are drawn once, independent of any path (see AGENTS.md's hub/paths mental model). */
  hubOrigin: Point;
  hubRadius: number;
  /**
   * Optional hub-level portal capacity: how many portal slots the hub is
   * built for and how wide each one is. Both must be set (and positive)
   * for anything to be painted — independent of the paths list; see
   * `distributePortalsOnHub`.
   */
  portalCount?: number;
  portalWidth?: number;
  /** The selected path, if any: drawn in full color, on top, with the fixed "Portal" label. */
  primary: NamedRoute | null;
  /** Every other visible saved path, drawn muted underneath the primary one. */
  otherRoutes: readonly NamedRoute[];
}

const COLORS = {
  background: "#0f1115",
  gridMinor: "#1c2028",
  gridMajor: "#262b35",
  axisLine: "#3a4150",
  axisText: "#8b93a3",
  hubStroke: "#f59e0b",
  hubFill: "rgba(245, 158, 11, 0.08)",
  portalSlot: "#22d3ee",
  accent: "#38bdf8",
  corridorFill: "rgba(16, 185, 129, 0.35)",
  centerlineStroke: "#34d399",
  origin: "#f8fafc",
  destination: "#fb7185",
  hubExit: "#f59e0b",
  pathLabelBg: "rgba(15, 17, 21, 0.9)",
  pathLabelText: "#f8fafc",
  // Other visible saved paths are drawn muted, so the selected path stays
  // the visually dominant one.
  otherAccent: "#a78bfa",
  otherCorridorFill: "rgba(167, 139, 250, 0.18)",
  otherCenterlineStroke: "rgba(167, 139, 250, 0.55)",
  otherDestination: "#a78bfa",
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
  { hubOrigin, hubRadius, portalCount, portalWidth, primary, otherRoutes },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<Viewport>({ center: { x: 0, z: 0 }, scale: 4 });

  const dragState = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);

  const fitPoints = useMemo(() => {
    const points = [hubOrigin];
    if (primary) points.push(primary.result.destination);
    for (const other of otherRoutes) points.push(other.result.destination);
    if (hubRadius > 0) {
      points.push(
        { x: hubOrigin.x - hubRadius, z: hubOrigin.z },
        { x: hubOrigin.x + hubRadius, z: hubOrigin.z },
        { x: hubOrigin.x, z: hubOrigin.z - hubRadius },
        { x: hubOrigin.x, z: hubOrigin.z + hubRadius },
      );
    }
    return points;
  }, [hubOrigin, hubRadius, primary, otherRoutes]);

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

  // Auto-fit whenever the hub or the selected path's destination changes
  // (not e.g. tunnel width, and not other paths — that's what the manual
  // "center" control, which fits every visible path, is for).
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return;
    setViewport(fitViewport(fitPoints, size.width, size.height));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hubOrigin.x,
    hubOrigin.z,
    hubRadius,
    primary?.result.destination.x,
    primary?.result.destination.z,
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

    const blockPx = Math.max(1, viewport.scale);

    // Hub circle (shared by every path, drawn once), rasterized into the
    // same block grid as every route below (see `rasterizeCircle`) instead
    // of a smooth curve — it represents the actual pixelated ring of blocks
    // a player would place in Minecraft, at a true 1:1 block/pixel size at
    // any zoom level.
    if (hubRadius > 0) {
      const center = w2s(hubOrigin);
      const radiusPx = hubRadius * viewport.scale;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.hubFill;
      ctx.fill();

      ctx.fillStyle = COLORS.hubStroke;
      for (const block of rasterizeCircle(hubOrigin, hubRadius)) {
        const s = w2s(block);
        ctx.fillRect(s.x - blockPx / 2, s.y - blockPx / 2, blockPx, blockPx);
      }

      // Portal capacity slots (optional, hub-level, independent of the
      // paths list — see AGENTS.md/`distributePortalsOnHub`): painted on
      // top of the plain perimeter blocks above, in their own color.
      if (portalCount && portalWidth) {
        ctx.fillStyle = COLORS.portalSlot;
        for (const slot of distributePortalsOnHub(hubOrigin, hubRadius, portalCount, portalWidth)) {
          for (const block of slot.blocks) {
            const s = w2s(block);
            ctx.fillRect(s.x - blockPx / 2, s.y - blockPx / 2, blockPx, blockPx);
          }
        }
      }
    }

    // Draws one path's corridor/centerline/title/markers. Shared between
    // the selected path (`isPrimary`, full color, fixed "Portal" label)
    // and every other visible saved path (muted color, no fixed label —
    // its title pill is the only label it needs).
    const drawRoute = (route: NamedRoute, isPrimary: boolean) => {
      const routeResult = route.result;
      const corridorFill = isPrimary ? COLORS.corridorFill : COLORS.otherCorridorFill;
      const centerlineStroke = isPrimary ? COLORS.centerlineStroke : COLORS.otherCenterlineStroke;
      const accent = isPrimary ? COLORS.accent : COLORS.otherAccent;
      const destinationColor = isPrimary ? COLORS.destination : COLORS.otherDestination;

      ctx.fillStyle = corridorFill;
      for (const block of routeResult.tunnel.corridorBlocks) {
        const s = w2s(block);
        ctx.fillRect(s.x - blockPx / 2, s.y - blockPx / 2, blockPx, blockPx);
      }

      // Centerline blocks (exact discrete trajectory) drawn as a brighter spine.
      if (viewport.scale >= 3) {
        ctx.strokeStyle = centerlineStroke;
        ctx.lineWidth = 1;
        for (const block of routeResult.tunnel.centerline) {
          const s = w2s(block);
          ctx.strokeRect(s.x - blockPx / 2 + 0.5, s.y - blockPx / 2 + 0.5, blockPx - 1, blockPx - 1);
        }
      }

      // Path title label (like a street name on a map app), placed at the
      // midpoint of the actual built path (the centerline the user chose —
      // diagonal or orthogonal). Unlike a real street label, it never
      // rotates to follow the line's angle — always horizontal and
      // upright, per the app's own "standard readable position".
      if (route.title.trim() !== "" && routeResult.tunnel.centerline.length > 0) {
        const midBlock = routeResult.tunnel.centerline[Math.floor(routeResult.tunnel.centerline.length / 2)];
        const mid = w2s(midBlock);
        ctx.font = "bold 13px ui-sans-serif, system-ui, sans-serif";
        const paddingX = 8;
        const paddingY = 4;
        const textWidth = ctx.measureText(route.title).width;
        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = 13 + paddingY * 2;
        const boxX = mid.x - boxWidth / 2;
        const boxY = mid.y - boxHeight / 2;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 5);
        ctx.fillStyle = COLORS.pathLabelBg;
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = COLORS.pathLabelText;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(route.title, mid.x, mid.y + 1);
      }

      // Hub exit marker.
      if (routeResult.hub.radius > 0 && !routeResult.hub.withinHub && !routeResult.isSamePoint) {
        const exit = w2s(routeResult.hub.exitPoint);
        ctx.beginPath();
        ctx.arc(exit.x, exit.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.hubExit;
        ctx.fill();
      }

      // Destination marker.
      const destScreen = w2s(routeResult.destination);
      ctx.beginPath();
      ctx.arc(destScreen.x, destScreen.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = destinationColor;
      ctx.fill();
      if (isPrimary) {
        ctx.fillStyle = COLORS.axisText;
        ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Portal", destScreen.x, destScreen.y - 20);
      }
    };

    // Other visible saved paths drawn first (muted), so the selected path
    // renders on top and stays visually dominant.
    for (const other of otherRoutes) {
      drawRoute(other, false);
    }
    if (primary) {
      drawRoute(primary, true);
    }

    // Origin marker (hub center is shared by every path drawn above).
    const originScreen = w2s(hubOrigin);
    ctx.beginPath();
    ctx.arc(originScreen.x, originScreen.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.origin;
    ctx.fill();
    ctx.fillStyle = COLORS.axisText;
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Centro", originScreen.x, originScreen.y - 20);

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
  }, [hubOrigin, hubRadius, portalCount, portalWidth, primary, otherRoutes, viewport, size]);

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
