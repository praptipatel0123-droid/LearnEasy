import { useEffect, useRef, useState } from 'react';
import type { ProblemData } from '../lib/schema';

interface Props { data: ProblemData; lang?: 'EN' | 'HI'; }

const W = 800, FPS = 60, SPEED_SCALE = 0.4;

// Shared control refs accessible by all draw functions
const sharedPaused = { current: false };
const sharedSpeed = { current: 1 };
const sharedTick = { current: 0 };

// ── MOTION ────────────────────────────────────────────────────────────────────
function drawMotion(canvas: HTMLCanvasElement, data: ProblemData) {
  const ctx = canvas.getContext('2d')!;
  const H = 120, OBJ = 36;
  canvas.height = H;

  const positions = data.objects.map(o => ({ x: (o.startPosition / 100) * W }));
  let frame = 0; sharedTick.current = 0;

  const draw = () => {
    if (sharedPaused.current) { frame = requestAnimationFrame(draw); return; }
    sharedTick.current += sharedSpeed.current;
    const tick = sharedTick.current;
    ctx.clearRect(0, 0, W, H);

    // Track
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath(); ctx.roundRect(0, H / 2 - 14, W, 28, 8); ctx.fill();
    ctx.setLineDash([16, 12]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.setLineDash([]);

    data.objects.forEach((obj, i) => {
      if (tick > (obj.startTime ?? 0) * FPS) {
        const spd = (obj.speed ?? 0) * SPEED_SCALE;
        positions[i].x += obj.direction === 'right' ? spd / FPS : -(spd / FPS);
        positions[i].x = Math.max(0, Math.min(W - OBJ, positions[i].x));
      }
      const x = positions[i].x, y = H / 2 - OBJ / 2;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      ctx.beginPath(); ctx.ellipse(x + OBJ / 2, y + OBJ + 5, OBJ / 2, 5, 0, 0, Math.PI * 2); ctx.fill();

      // Block
      ctx.fillStyle = obj.color;
      ctx.beginPath(); ctx.roundRect(x, y, OBJ, OBJ, 10); ctx.fill();

      // Label
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(obj.label.slice(0, 5), x + OBJ / 2, y + OBJ / 2);

      // Speed badge
      if (obj.speed !== null) {
        ctx.fillStyle = obj.color; ctx.globalAlpha = 0.15;
        ctx.beginPath(); ctx.roundRect(x - 4, y - 22, 56, 18, 6); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = obj.color;
        ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
        ctx.fillText(`${obj.speed} ${obj.speedUnit ?? ''}`, x + OBJ / 2, y - 13);
      }
    });

    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

// ── GRAPH ─────────────────────────────────────────────────────────────────────
function drawGraph(canvas: HTMLCanvasElement, data: ProblemData) {
  const ctx = canvas.getContext('2d')!;
  const H = 300, PAD = 50;
  canvas.height = H;

  const knowns = data.extractedData?.knowns ?? [];
  const points: { x: number; y: number }[] = [];

  // Try to build points from knowns or use objects
  if (knowns.length >= 2) {
    const vals = knowns.map(k => Number(k.value)).filter(v => !isNaN(v));
    vals.forEach((v, i) => points.push({ x: i, y: v }));
  } else {
    data.objects.forEach((o, i) => points.push({ x: i, y: o.speed ?? 0 }));
  }

  if (points.length < 2) { points.push({ x: 0, y: 0 }, { x: 1, y: 1 }); }

  const maxY = Math.max(...points.map(p => p.y), 1);
  const maxX = Math.max(...points.map(p => p.x), 1);

  const toCanvas = (p: { x: number; y: number }) => ({
    cx: PAD + (p.x / maxX) * (W - PAD * 2),
    cy: H - PAD - (p.y / maxY) * (H - PAD * 2),
  });

  let progress = 0, frame = 0;
  const draw = () => {
    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = PAD + (i / 5) * (H - PAD * 2);
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PAD, PAD); ctx.lineTo(PAD, H - PAD); ctx.lineTo(W - PAD, H - PAD); ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#6b7280'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    points.forEach(p => {
      const { cx } = toCanvas(p);
      ctx.fillText(String(p.x), cx, H - PAD + 18);
    });
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = ((maxY * (4 - i)) / 4).toFixed(1);
      const y = PAD + (i / 4) * (H - PAD * 2);
      ctx.fillText(val, PAD - 8, y + 4);
    }

    // Animated line
    const drawn = Math.min(Math.floor(progress * (points.length - 1)), points.length - 2);
    const frac = (progress * (points.length - 1)) - drawn;

    ctx.strokeStyle = data.objects[0]?.color ?? '#3b82f6';
    ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= drawn; i++) {
      const { cx, cy } = toCanvas(points[i]);
      i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    }
    if (drawn < points.length - 1) {
      const a = toCanvas(points[drawn]), b = toCanvas(points[drawn + 1]);
      ctx.lineTo(a.cx + (b.cx - a.cx) * frac, a.cy + (b.cy - a.cy) * frac);
    }
    ctx.stroke();

    // Dots
    for (let i = 0; i <= drawn; i++) {
      const { cx, cy } = toCanvas(points[i]);
      ctx.fillStyle = data.objects[0]?.color ?? '#3b82f6';
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    if (progress < 1) { if (!sharedPaused.current) progress = Math.min(1, progress + 0.008 * sharedSpeed.current); frame = requestAnimationFrame(draw); }
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

// ── GEOMETRY ──────────────────────────────────────────────────────────────────
function drawGeometry(canvas: HTMLCanvasElement, data: ProblemData) {
  const ctx = canvas.getContext('2d')!;
  const H = 300;
  canvas.height = H;

  const knowns = data.extractedData?.knowns ?? [];
  const nums = knowns.map(k => Number(k.value)).filter(v => !isNaN(v) && v > 0);
  const color = data.objects[0]?.color ?? '#3b82f6';

  let scale = 1, frame = 0, progress = 0;

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    scale = 0.8 + 0.2 * Math.sin(Date.now() / 1200);

    const cx = W / 2, cy = H / 2;

    if (nums.length >= 2) {
      // Rectangle / right triangle
      const a = Math.min(nums[0], 200) * scale, b = Math.min(nums[1], 200) * scale;
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.fillStyle = color + '22';
      ctx.beginPath();
      ctx.rect(cx - a / 2, cy - b / 2, a, b);
      ctx.fill(); ctx.stroke();

      // Dimension labels
      ctx.fillStyle = '#374151'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${nums[0]}`, cx, cy - b / 2 - 10);
      ctx.fillText(`${nums[1]}`, cx + a / 2 + 20, cy);
    } else {
      // Circle
      const r = Math.min(nums[0] ?? 80, 100) * scale;
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.fillStyle = color + '22';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2 * progress); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#374151'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`r = ${nums[0] ?? '?'}`, cx, cy + r + 20);
    }

    if (progress < 1) if (!sharedPaused.current) progress = Math.min(1, progress + 0.02 * sharedSpeed.current);
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

// ── CHEMICAL REACTION ─────────────────────────────────────────────────────────
function drawChemical(canvas: HTMLCanvasElement, data: ProblemData) {
  const ctx = canvas.getContext('2d')!;
  const H = 200;
  canvas.height = H;

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
  const labels = data.objects.length > 0
    ? data.objects.map(o => o.label)
    : ['Reactant A', 'Reactant B', 'Product'];

  let frame = 0; sharedTick.current = 0;

  const draw = () => {
    if (sharedPaused.current) { frame = requestAnimationFrame(draw); return; }
    sharedTick.current += sharedSpeed.current;
    const tick = sharedTick.current;
    ctx.clearRect(0, 0, W, H);

    const reacting = tick > 60;
    const cx = W / 2, cy = H / 2;

    if (!reacting) {
      // Reactants moving toward center
      labels.slice(0, 2).forEach((label, i) => {
        const dir = i === 0 ? -1 : 1;
        const x = cx + dir * Math.max(20, 200 - tick * 1.5);
        ctx.fillStyle = colors[i];
        ctx.beginPath(); ctx.arc(x, cy, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label.slice(0, 4), x, cy);
      });

      // Arrow
      ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 15, cy); ctx.lineTo(cx + 15, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 10, cy - 5); ctx.lineTo(cx + 15, cy); ctx.lineTo(cx + 10, cy + 5); ctx.stroke();
    } else {
      // Products appear
      const boom = Math.min((tick - 60) / 30, 1);
      labels.slice(2).forEach((label, i) => {
        const angle = (i / Math.max(labels.slice(2).length, 1)) * Math.PI * 2;
        const r = 80 * boom;
        const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
        ctx.globalAlpha = boom;
        ctx.fillStyle = colors[i + 2] ?? colors[0];
        ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label.slice(0, 4), x, y);
        ctx.globalAlpha = 1;
      });

      // Flash
      if (tick < 80) {
        ctx.fillStyle = `rgba(255,255,200,${(80 - tick) / 80 * 0.5})`;
        ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.fill();
      }
    }

    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

// ── MONKEY HUNTER ────────────────────────────────────────────────────────────
function drawRainUmbrella(canvas: HTMLCanvasElement, data: ProblemData) {
  const ctx = canvas.getContext('2d')!;
  const H = 400;
  canvas.height = H;

  const knowns = data.extractedData?.knowns ?? [];
  const getVal = (keys: string[]) => {
    for (const k of keys) {
      const found = knowns.find(kn => kn.label.toLowerCase().includes(k));
      if (found) return Number(found.value);
    }
    return null;
  };

  const rainSpeed = getVal(['rain', 'vertical', 'rainfall']) ?? 3;
  const walkSpeed = getVal(['walk', 'horizontal', 'person', 'man']) ?? 1.5;
  const angle = Math.atan2(walkSpeed, rainSpeed);
  const angleDeg = (angle * 180 / Math.PI).toFixed(1);
  const groundY = H - 60;
  let frame = 0; sharedTick.current = 0;
  const SHOW_ANGLE_TICK = 120;

  const rainDrops: { x: number; y: number; len: number }[] = [];
  for (let i = 0; i < 80; i++)
    rainDrops.push({ x: Math.random() * W, y: Math.random() * groundY, len: 8 + Math.random() * 8 });

  const drawPerson = (x: number, umbAngle: number) => {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath(); ctx.ellipse(x, groundY, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
    const swing = Math.sin(sharedTick.current * 0.15) * 12;
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, groundY - 20); ctx.lineTo(x - 10 + swing, groundY + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, groundY - 20); ctx.lineTo(x + 10 - swing, groundY + 10); ctx.stroke();
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x, groundY - 20); ctx.lineTo(x, groundY - 55); ctx.stroke();
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, groundY - 45); ctx.lineTo(x - 14, groundY - 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, groundY - 45); ctx.lineTo(x + 14, groundY - 55); ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(x, groundY - 65, 12, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(x + 14, groundY - 55);
    ctx.rotate(-umbAngle);
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -50); ctx.stroke();
    ctx.fillStyle = '#3b82f6'; ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(-45, -50); ctx.quadraticCurveTo(-22, -85, 0, -80); ctx.quadraticCurveTo(22, -85, 45, -50);
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-45, -50); ctx.quadraticCurveTo(-22, -85, 0, -80); ctx.quadraticCurveTo(22, -85, 45, -50);
    ctx.stroke();
    ctx.restore();
  };

  const draw = () => {
    if (sharedPaused.current) { frame = requestAnimationFrame(draw); return; }
    sharedTick.current += sharedSpeed.current;
    const tick = sharedTick.current;
    ctx.clearRect(0, 0, W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#1e3a5f'); sky.addColorStop(1, '#374151');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, groundY);
    ctx.fillStyle = '#4b5563'; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#6b7280'; ctx.fillRect(0, groundY, W, 3);
    const rainVx = walkSpeed * 4, rainVy = rainSpeed * 4;
    const mag = Math.sqrt(rainVx ** 2 + rainVy ** 2);
    ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7;
    rainDrops.forEach(drop => {
      drop.x += rainVx * 0.3; drop.y += rainVy * 0.3;
      if (drop.y > groundY) { drop.y = -10; drop.x = Math.random() * W; }
      if (drop.x > W) drop.x = 0;
      const dx = (rainVx / mag) * drop.len, dy = (rainVy / mag) * drop.len;
      ctx.beginPath(); ctx.moveTo(drop.x, drop.y); ctx.lineTo(drop.x + dx, drop.y + dy); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    const personX = 80 + (tick * 0.8) % (W - 200);
    const currentAngle = tick < SHOW_ANGLE_TICK ? 0 : Math.min(angle, (tick - SHOW_ANGLE_TICK) * 0.015);
    drawPerson(personX, currentAngle);
    if (tick > SHOW_ANGLE_TICK + 60) {
      const vx = personX + 80, vy = groundY - 160;
      ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx, vy + 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(vx - 5, vy + 44); ctx.lineTo(vx, vy + 50); ctx.lineTo(vx + 5, vy + 44); ctx.stroke();
      ctx.fillStyle = '#93c5fd'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${rainSpeed} m/s`, vx + 8, vy + 28);
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(vx, vy + 50); ctx.lineTo(vx + 40, vy + 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(vx + 34, vy + 45); ctx.lineTo(vx + 40, vy + 50); ctx.lineTo(vx + 34, vy + 55); ctx.stroke();
      ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${walkSpeed} m/s`, vx + 8, vy + 64);
      ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx + 40, vy + 50); ctx.stroke();
      ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(vx, vy, 20, Math.PI / 2, Math.PI / 2 + angle); ctx.stroke();
      ctx.fillStyle = '#f87171'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`θ=${angleDeg}°`, vx + 24, vy + 18);
    }
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

function drawMonkeyHunter(canvas: HTMLCanvasElement, data: ProblemData) {
  const ctx = canvas.getContext('2d')!;
  const H = 400;
  canvas.height = H;

  const knowns = data.extractedData?.knowns ?? [];
  const getVal = (keys: string[]) => {
    for (const k of keys) {
      const found = knowns.find(kn => kn.label.toLowerCase().includes(k));
      if (found) return Number(found.value);
    }
    return null;
  };

  const distance = getVal(['distance', 'horizontal', 'range']) ?? 50;
  const bulletSpeed = getVal(['speed', 'velocity', 'bullet']) ?? data.objects[0]?.speed ?? 200;
  const g = 9.8;

  // Scene constants
  const groundY = H - 60;
  const treeX = W - 120;
  const treeH = 200;
  const monkeyStartY = groundY - treeH;
  const hunterX = 80;
  const scale = (treeX - hunterX) / distance;
  const totalTime = distance / bulletSpeed;
  const bulletDropAtHit = 0.5 * g * totalTime * totalTime;
  const hitY = monkeyStartY + bulletDropAtHit * scale * 0.8;

  let frame = 0; sharedTick.current = 0;
  const FIRE_TICK = 80; // pause before firing

  const drawTree = () => {
    // Trunk
    ctx.fillStyle = '#92400e';
    ctx.fillRect(treeX - 10, groundY - treeH, 20, treeH);
    // Leaves
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.arc(treeX, groundY - treeH - 20, 45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(treeX - 25, groundY - treeH + 10, 32, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(treeX + 25, groundY - treeH + 10, 32, 0, Math.PI * 2); ctx.fill();
  };

  const drawGround = () => {
    ctx.fillStyle = '#d1fae5';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, groundY, W, 2);
    // Distance label
    ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(hunterX, groundY + 20); ctx.lineTo(treeX, groundY + 20); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#6b7280'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${distance} m`, (hunterX + treeX) / 2, groundY + 36);
  };

  const drawHunter = () => {
    // Body
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(hunterX - 10, groundY - 50, 20, 35);
    // Head
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(hunterX, groundY - 58, 12, 0, Math.PI * 2); ctx.fill();
    // Hat
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(hunterX - 14, groundY - 72, 28, 6);
    ctx.fillRect(hunterX - 8, groundY - 84, 16, 14);
    // Gun barrel pointing right
    ctx.fillStyle = '#374151';
    ctx.fillRect(hunterX + 10, groundY - 56, 30, 5);
  };

  const drawMonkey = (y: number, grabbed: boolean) => {
    if (grabbed) {
      // Monkey falling - arms up
      ctx.fillStyle = '#92400e';
      ctx.beginPath(); ctx.arc(treeX, y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(treeX, y - 4, 9, 0, Math.PI * 2); ctx.fill();
      // Arms up
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(treeX - 10, y); ctx.lineTo(treeX - 22, y - 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(treeX + 10, y); ctx.lineTo(treeX + 22, y - 14); ctx.stroke();
      // Eyes
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.arc(treeX - 3, y - 5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(treeX + 3, y - 5, 2, 0, Math.PI * 2); ctx.fill();
    } else {
      // Monkey sitting on branch
      ctx.fillStyle = '#92400e';
      ctx.beginPath(); ctx.arc(treeX, y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(treeX, y - 4, 9, 0, Math.PI * 2); ctx.fill();
      // Arms holding branch
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(treeX - 10, y); ctx.lineTo(treeX - 20, y + 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(treeX + 10, y); ctx.lineTo(treeX + 20, y + 10); ctx.stroke();
      // Eyes
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.arc(treeX - 3, y - 5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(treeX + 3, y - 5, 2, 0, Math.PI * 2); ctx.fill();
      // Tail
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(treeX + 14, y + 5);
      ctx.quadraticCurveTo(treeX + 35, y + 5, treeX + 30, y - 10); ctx.stroke();
    }
  };

  const draw = () => {
    if (sharedPaused.current) { frame = requestAnimationFrame(draw); return; }
    sharedTick.current += sharedSpeed.current;
    const tick = sharedTick.current;
    ctx.clearRect(0, 0, W, H);

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#e0f2fe'); sky.addColorStop(1, '#f0fdf4');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, groundY);

    drawGround();
    drawTree();
    drawHunter();

    if (tick < FIRE_TICK) {
      // Phase 1: Static scene — monkey sitting
      drawMonkey(monkeyStartY, false);

      // "Ready..." label
      ctx.fillStyle = '#6b7280'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(tick > 40 ? '🔫 Fire!' : '🐒 Monkey sitting...', W / 2, 30);

    } else {
      // Phase 2: Bullet fired, monkey drops
      const elapsed = (tick - FIRE_TICK) / 60;
      const bulletProgress = Math.min(elapsed / totalTime, 1);

      // Bullet position (horizontal)
      const bx = hunterX + 40 + bulletProgress * (treeX - hunterX - 40);
      const bulletDrop = 0.5 * g * elapsed * elapsed * scale * 0.8;
      const by = (groundY - treeH) - bulletDrop;

      // Monkey drop (same gravity)
      const monkeyY = monkeyStartY + bulletDrop;

      const hit = bulletProgress >= 1;

      if (!hit) {
        // Draw bullet trail
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.globalAlpha = 0.4;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(hunterX + 40, groundY - treeH); ctx.lineTo(bx, by); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;

        // Bullet
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.ellipse(bx, by, 8, 4, 0, 0, Math.PI * 2); ctx.fill();

        // Monkey falling
        drawMonkey(monkeyY, true);

        // Drop lines
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(treeX, monkeyStartY); ctx.lineTo(treeX, monkeyY); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;

      } else {
        // HIT! Flash effect
        const flashAlpha = Math.max(0, 1 - (tick - FIRE_TICK - 60) / 30);
        ctx.fillStyle = `rgba(251,191,36,${flashAlpha * 0.6})`;
        ctx.beginPath(); ctx.arc(treeX, hitY, 40, 0, Math.PI * 2); ctx.fill();

        drawMonkey(hitY, true);

        ctx.fillStyle = '#dc2626'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('💥 Bullet hits monkey!', W / 2, 30);

        // Height label
        ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(treeX + 30, groundY); ctx.lineTo(treeX + 30, hitY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#374151'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(`h ≈ ${(treeH - bulletDropAtHit).toFixed(1)} m`, treeX + 36, (groundY + hitY) / 2);
      }
    }

    frame = requestAnimationFrame(draw);
  };

  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

// ── PROJECTILE ───────────────────────────────────────────────────────────────
function drawProjectile(canvas: HTMLCanvasElement, data: ProblemData) {
  const ctx = canvas.getContext('2d')!;
  const H = 300, PAD = 50;
  canvas.height = H;

  const knowns = data.extractedData?.knowns ?? [];
  const getVal = (keys: string[]) => {
    for (const k of keys) {
      const found = knowns.find(kn => kn.label.toLowerCase().includes(k));
      if (found) return Number(found.value);
    }
    return null;
  };

  const u = getVal(['initial velocity', 'velocity', 'speed', 'u']) ?? data.objects[0]?.speed ?? 20;
  const angleDeg = getVal(['angle', 'theta']) ?? 45;
  const g = 9.8;
  const angle = (angleDeg * Math.PI) / 180;
  const vx = u * Math.cos(angle);
  const vy = u * Math.sin(angle);
  const totalTime = (2 * vy) / g;
  const maxX = vx * totalTime;
  const maxY = (vy * vy) / (2 * g);

  const toCanvas = (x: number, y: number) => ({
    cx: PAD + (x / maxX) * (W - PAD * 2),
    cy: H - PAD - (y / maxY) * (H - PAD * 2) * 0.85,
  });

  const color = data.objects[0]?.color ?? '#3b82f6';
  let progress = 0, frame = 0;

  const draw = () => {
    ctx.clearRect(0, 0, W, H);

    // Ground
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(PAD, H - PAD, W - PAD * 2, 4);

    // Axes
    ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PAD, PAD); ctx.lineTo(PAD, H - PAD); ctx.lineTo(W - PAD, H - PAD); ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#9ca3af'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`Range: ${maxX.toFixed(1)} m`, W / 2, H - 10);
    ctx.save(); ctx.translate(14, H / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(`Height: ${maxY.toFixed(1)} m`, 0, 0); ctx.restore();

    // Trajectory path (dotted)
    ctx.setLineDash([4, 6]); ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let t = 0; t <= totalTime; t += totalTime / 60) {
      const x = vx * t, y = vy * t - 0.5 * g * t * t;
      const { cx, cy } = toCanvas(x, y);
      t === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    }
    ctx.stroke(); ctx.setLineDash([]);

    // Animated trajectory fill
    const currentT = progress * totalTime;
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let t = 0; t <= currentT; t += totalTime / 120) {
      const x = vx * t, y = vy * t - 0.5 * g * t * t;
      const { cx, cy } = toCanvas(x, y);
      t === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Ball
    const bx = vx * currentT, by = vy * currentT - 0.5 * g * currentT * currentT;
    const { cx: bcx, cy: bcy } = toCanvas(bx, Math.max(0, by));
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(bcx, bcy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(bcx, bcy, 3, 0, Math.PI * 2); ctx.fill();

    // Max height marker
    if (progress > 0.4) {
      const { cx: mx, cy: my } = toCanvas(maxX / 2, maxY);
      ctx.fillStyle = '#6b7280'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`H = ${maxY.toFixed(1)} m`, mx, my - 12);
    }

    // Angle arc
    ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(PAD, H - PAD, 30, -angle, 0); ctx.stroke();
    ctx.fillStyle = '#6b7280'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${angleDeg}°`, PAD + 34, H - PAD - 8);

    if (progress < 1) { if (!sharedPaused.current) progress = Math.min(1, progress + 0.006 * sharedSpeed.current); frame = requestAnimationFrame(draw); }
    else frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

// ── ELECTRICITY ──────────────────────────────────────────────────────────────
function drawElectricity(canvas: HTMLCanvasElement, data: ProblemData) {
  const ctx = canvas.getContext('2d')!;
  const H = 320;
  canvas.height = H;
  const knowns = data.extractedData?.knowns ?? [];
  const getVal = (keys: string[]) => {
    for (const k of keys) {
      const found = knowns.find(kn => kn.label.toLowerCase().includes(k));
      if (found) return Number(found.value);
    }
    return null;
  };
  const V = getVal(['voltage', 'volt', 'emf', 'v']) ?? 12;
  const R = getVal(['resistance', 'ohm', 'r']) ?? 4;
  const I = getVal(['current', 'ampere', 'i']) ?? (V / R);
  let frame = 0; sharedTick.current = 0;
  const particles: { pos: number; speed: number }[] = [];
  for (let i = 0; i < 12; i++) particles.push({ pos: i / 12, speed: 0.003 + Math.random() * 0.002 });

  const cx = W / 2, cy = H / 2;
  const bw = 180, bh = 100;
  // Circuit path: top-left, top-right, bottom-right, bottom-left
  const getPosOnPath = (t: number) => {
    const perim = 2 * (2 * bw + 2 * bh);
    const d = ((t % 1) * perim + perim) % perim;
    const top = 2 * bw, right = 2 * bh, bottom = 2 * bw;
    if (d < top) return { x: cx - bw + d, y: cy - bh };
    if (d < top + right) return { x: cx + bw, y: cy - bh + (d - top) };
    if (d < top + right + bottom) return { x: cx + bw - (d - top - right), y: cy + bh };
    return { x: cx - bw, y: cy + bh - (d - top - right - bottom) };
  };

  const draw = () => {
    if (sharedPaused.current) { frame = requestAnimationFrame(draw); return; }
    sharedTick.current += sharedSpeed.current;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);

    // Circuit wires
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - bw, cy - bh); ctx.lineTo(cx + bw, cy - bh);
    ctx.lineTo(cx + bw, cy + bh); ctx.lineTo(cx - bw, cy + bh);
    ctx.lineTo(cx - bw, cy - bh); ctx.stroke();

    // Battery (left side)
    ctx.fillStyle = '#1f2937'; ctx.fillRect(cx - bw - 6, cy - 30, 12, 60);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(cx - bw - 4, cy - 30, 8, 28);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(cx - bw - 4, cy + 2, 8, 28);
    ctx.fillStyle = '#374151'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('+', cx - bw - 18, cy - 14);
    ctx.fillText('-', cx - bw - 18, cy + 18);
    ctx.fillText(`${V}V`, cx - bw - 18, cy + 40);

    // Resistor (top side)
    const rx = cx, ry = cy - bh;
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(rx - 30, ry - 10, 60, 20);
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2;
    ctx.strokeRect(rx - 30, ry - 10, 60, 20);
    ctx.fillStyle = '#374151'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${R}Ω`, rx, ry + 4);

    // Animated electrons
    particles.forEach(p => {
      p.pos = (p.pos + p.speed) % 1;
      const { x, y } = getPosOnPath(p.pos);
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('e⁻', x, y);
    });
    ctx.textBaseline = 'alphabetic';

    // Labels
    ctx.fillStyle = '#374151'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`I = ${I.toFixed(2)} A`, cx + bw + 60, cy);
    ctx.fillText(`V = ${V} V`, cx, cy + bh + 30);
    ctx.fillText(`R = ${R} Ω`, cx, cy - bh - 20);

    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

// ── WORK ENERGY ───────────────────────────────────────────────────────────────
function drawWorkEnergy(canvas: HTMLCanvasElement, data: ProblemData) {
  const ctx = canvas.getContext('2d')!;
  const H = 320;
  canvas.height = H;
  const knowns = data.extractedData?.knowns ?? [];
  const getVal = (keys: string[]) => {
    for (const k of keys) {
      const found = knowns.find(kn => kn.label.toLowerCase().includes(k));
      if (found) return Number(found.value);
    }
    return null;
  };
  const mass = getVal(['mass', 'kg', 'm']) ?? 5;
  const velocity = getVal(['velocity', 'speed', 'v']) ?? 10;
  const height = getVal(['height', 'h']) ?? 20;
  const KE = 0.5 * mass * velocity * velocity;
  const PE = mass * 9.8 * height;
  const groundY = H - 60;
  let frame = 0; sharedTick.current = 0;
  let objY = 60;
  let falling = false;

  const draw = () => {
    if (sharedPaused.current) { frame = requestAnimationFrame(draw); return; }
    sharedTick.current += sharedSpeed.current;
    const tick = sharedTick.current;
    ctx.clearRect(0, 0, W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#e0f2fe'); sky.addColorStop(1, '#f0fdf4');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, groundY);
    ctx.fillStyle = '#86efac'; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#374151'; ctx.fillRect(0, groundY, W, 3);

    if (tick > 60) falling = true;
    if (falling && objY < groundY - 30) objY += 2;

    const cx = W / 2;
    // Object
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath(); ctx.roundRect(cx - 20, objY - 20, 40, 40, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${mass}kg`, cx, objY);
    ctx.textBaseline = 'alphabetic';

    // Height arrow
    const curH = ((groundY - objY) / (groundY - 60) * height).toFixed(1);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + 40, objY); ctx.lineTo(cx + 40, groundY); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`h=${curH}m`, cx + 46, (objY + groundY) / 2);

    // Energy bars
    const barX = 60, barW = 120;
    const peRatio = Math.max(0, (groundY - objY) / (groundY - 60));
    const keRatio = 1 - peRatio;

    ctx.fillStyle = '#f1f5f9'; ctx.fillRect(barX, 60, barW, groundY - 60);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(barX, groundY - (groundY - 60) * keRatio, barW, (groundY - 60) * keRatio);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(barX + barW + 10, 60, barW, (groundY - 60) * peRatio);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(barX + barW + 10, 60 + (groundY - 60) * peRatio, barW, (groundY - 60) * (1 - peRatio));
    ctx.fillStyle = '#f59e0b'; ctx.globalAlpha = 0.3;
    ctx.fillRect(barX + barW + 10, 60, barW, (groundY - 60));
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(barX + barW + 10, 60, barW, (groundY - 60) * peRatio);

    ctx.fillStyle = '#374151'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('KE', barX + barW / 2, groundY + 20);
    ctx.fillText(`${(KE * keRatio).toFixed(0)}J`, barX + barW / 2, groundY + 36);
    ctx.fillText('PE', barX + barW + 10 + barW / 2, groundY + 20);
    ctx.fillText(`${(PE * peRatio).toFixed(0)}J`, barX + barW + 10 + barW / 2, groundY + 36);

    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

// ── ALGEBRA ───────────────────────────────────────────────────────────────────
function drawAlgebra(canvas: HTMLCanvasElement, data: ProblemData) {
  const ctx = canvas.getContext('2d')!;
  const H = 320;
  canvas.height = H;
  const steps = data.steps ?? [];
  let frame = 0; sharedTick.current = 0;
  const visibleSteps = { count: 0 };

  const draw = () => {
    if (sharedPaused.current) { frame = requestAnimationFrame(draw); return; }
    sharedTick.current += sharedSpeed.current;
    const tick = sharedTick.current;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);

    // Reveal one step every 90 ticks
    visibleSteps.count = Math.min(steps.length, Math.floor(tick / 90) + 1);

    const startY = 40;
    const stepH = Math.min(60, (H - 80) / Math.max(steps.length, 1));

    steps.slice(0, visibleSteps.count).forEach((s, i) => {
      const y = startY + i * stepH;
      const alpha = i === visibleSteps.count - 1 ? Math.min(1, (tick % 90) / 30) : 1;
      ctx.globalAlpha = alpha;

      // Step bubble
      ctx.fillStyle = i === visibleSteps.count - 1 ? '#1f2937' : '#f1f5f9';
      ctx.beginPath(); ctx.roundRect(40, y, W - 80, stepH - 8, 12); ctx.fill();

      // Step number
      ctx.fillStyle = i === visibleSteps.count - 1 ? '#fff' : '#6b7280';
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`Step ${s.step}`, 60, y + (stepH - 8) / 2 - 8);

      // Equation
      ctx.fillStyle = i === visibleSteps.count - 1 ? '#93c5fd' : '#374151';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(s.equation ?? s.description, 60, y + (stepH - 8) / 2 + 10);

      ctx.globalAlpha = 1;
    });

    // Final answer highlight
    if (visibleSteps.count >= steps.length && data.answer.value !== null) {
      const y = startY + steps.length * stepH + 10;
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.roundRect(40, y, W - 80, 50, 12); ctx.fill();
      ctx.fillStyle = '#34d399'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`Answer: ${data.answer.value} ${data.answer.unit}`, W / 2, y + 25);
    }

    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

// ── HORIZONTAL PROJECTILE ────────────────────────────────────────────────────────────
function drawHorizontalProjectile(canvas: HTMLCanvasElement, data: ProblemData) {
  const ctx = canvas.getContext('2d')!;
  const H = 380, PAD = 60;
  canvas.height = H;

  const knowns = data.extractedData?.knowns ?? [];
  const getVal = (keys: string[]) => {
    for (const k of keys) {
      const found = knowns.find(kn => kn.label.toLowerCase().includes(k));
      if (found) return Number(found.value);
    }
    return null;
  };

  const h = getVal(['height', 'building', 'tower', 'cliff', 'initial height']) ?? 100;
  const vx = getVal(['horizontal velocity', 'initial horizontal velocity', 'initial velocity', 'velocity', 'speed', 'u']) ?? data.objects[0]?.speed ?? 20;
  const g = getVal(['gravity', 'acceleration due to gravity', 'g']) ?? 10;
  const totalTime = Math.sqrt(2 * h / g);
  const range = vx * totalTime;
  const vy_final = g * totalTime;
  const v_final = Math.sqrt(vx * vx + vy_final * vy_final);
  const angle = Math.atan2(vy_final, vx) * 180 / Math.PI;
  const color = data.objects[0]?.color ?? '#3b82f6';

  const groundY = H - PAD;
  const buildingX = PAD + 40;
  const buildingH = (h / (h + 20)) * (groundY - PAD);
  const buildingTop = groundY - buildingH;

  const toCanvas = (x: number, y: number) => ({
    cx: buildingX + (x / range) * (W - buildingX - PAD),
    cy: buildingTop + (y / h) * buildingH,
  });

  let frame = 0;

  const draw = () => {
    if (sharedPaused.current) { frame = requestAnimationFrame(draw); return; }
    sharedTick.current += sharedSpeed.current;
    const tick = sharedTick.current;
    const progress = Math.min(tick / 300, 1);
    ctx.clearRect(0, 0, W, H);

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#e0f2fe'); sky.addColorStop(1, '#f0fdf4');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, groundY);

    // Ground
    ctx.fillStyle = '#86efac'; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#374151'; ctx.fillRect(0, groundY, W, 2);

    // Building
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(PAD, buildingTop, 80, buildingH);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(PAD, buildingTop - 8, 80, 8);
    // Windows
    ctx.fillStyle = '#bfdbfe';
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 2; col++) {
        ctx.fillRect(PAD + 12 + col * 32, buildingTop + 16 + row * 30, 18, 18);
      }
    }
    // Height label
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(PAD - 15, buildingTop); ctx.lineTo(PAD - 15, groundY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${h}m`, PAD - 28, (buildingTop + groundY) / 2);

    // Dotted full path
    ctx.setLineDash([4, 6]); ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let t = 0; t <= totalTime; t += totalTime / 60) {
      const x = vx * t;
      const y = 0.5 * g * t * t;
      const { cx, cy } = toCanvas(x, y);
      t === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    }
    ctx.stroke(); ctx.setLineDash([]);

    // Animated path
    const currentT = progress * totalTime;
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let t = 0; t <= currentT; t += totalTime / 120) {
      const x = vx * t, y = 0.5 * g * t * t;
      const { cx, cy } = toCanvas(x, y);
      t === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Ball
    const bx = vx * currentT, by = 0.5 * g * currentT * currentT;
    const { cx: bcx, cy: bcy } = toCanvas(bx, Math.min(by, h));
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(bcx, bcy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(bcx, bcy, 3, 0, Math.PI * 2); ctx.fill();

    // Velocity arrow at ball
    if (progress > 0.05 && progress < 1) {
      const vy_now = g * currentT;
      const angle = Math.atan2(vy_now, vx);
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bcx, bcy);
      ctx.lineTo(bcx + Math.cos(angle) * 30, bcy + Math.sin(angle) * 30); ctx.stroke();
    }

    // Range label
    if (progress > 0.5) {
      ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(buildingX, groundY + 18); ctx.lineTo(buildingX + (W - buildingX - PAD), groundY + 18); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#6b7280'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`Range: ${range.toFixed(1)}m`, buildingX + (W - buildingX - PAD) / 2, groundY + 34);
    }

    // vx label
    ctx.fillStyle = '#3b82f6'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`vx = ${vx} m/s →`, buildingX + 8, buildingTop - 16);

    // Info panel top right
    if (progress > 0.3) {
      const infoX = W - 180, infoY = 20;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.roundRect(infoX, infoY, 170, 90, 8); ctx.fill();
      ctx.fillStyle = '#374151'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`t = ${totalTime.toFixed(2)} s`, infoX + 10, infoY + 18);
      ctx.fillText(`Range = ${range.toFixed(2)} m`, infoX + 10, infoY + 36);
      ctx.fillText(`v_final = ${v_final.toFixed(2)} m/s`, infoX + 10, infoY + 54);
      ctx.fillText(`θ = ${angle.toFixed(1)}° below horizontal`, infoX + 10, infoY + 72);
    }

    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

// ── ABSTRACT ──────────────────────────────────────────────────────────────────
function drawAbstract(canvas: HTMLCanvasElement, data: ProblemData) {
  const ctx = canvas.getContext('2d')!;
  const H = 200;
  canvas.height = H;

  const knowns = data.extractedData?.knowns ?? [];
  const total = knowns.length || 1;
  let frame = 0, progress = 0;

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    const barH = 36, gap = 14, startY = (H - (total * (barH + gap))) / 2;

    knowns.forEach((k, i) => {
      const val = Math.min(Number(k.value) / 100, 1) || (i + 1) / total;
      const maxW = W - 200;
      const y = startY + i * (barH + gap);

      // Background bar
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath(); ctx.roundRect(160, y, maxW, barH, 8); ctx.fill();

      // Animated fill
      ctx.fillStyle = data.objects[i % data.objects.length]?.color ?? '#3b82f6';
      ctx.beginPath(); ctx.roundRect(160, y, maxW * Math.min(progress, val), barH, 8); ctx.fill();

      // Label
      ctx.fillStyle = '#374151'; ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(k.label.slice(0, 14), 150, y + barH / 2);

      // Value
      ctx.textAlign = 'left';
      ctx.fillText(`${k.value} ${k.unit ?? ''}`, 160 + maxW + 10, y + barH / 2);
    });

    if (progress < 1) { if (!sharedPaused.current) progress = Math.min(1, progress + 0.012 * sharedSpeed.current); frame = requestAnimationFrame(draw); }
    else frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function Visualizer({ data, lang = 'EN' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [key, setKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(false);
  const speedRef = useRef(1);
  const progressRef = useRef(0);
  const totalTicksRef = useRef(300);
  const tickRef = useRef(0);

  useEffect(() => { pausedRef.current = paused; sharedPaused.current = paused; }, [paused]);
  useEffect(() => { speedRef.current = speed; sharedSpeed.current = speed; }, [speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPaused(false);
    setProgress(0);
    pausedRef.current = false;
    sharedPaused.current = false;
    sharedSpeed.current = speed;
    tickRef.current = 0;
    sharedTick.current = 0;
    progressRef.current = 0;

    const type = data.problemType;
    let cleanup: (() => void) | undefined;
    const isMonkeyHunter = data.question.toLowerCase().includes('monkey') || data.title.toLowerCase().includes('monkey');
    const isRainUmbrella = data.question.toLowerCase().includes('rain') || data.question.toLowerCase().includes('umbrella') || data.title.toLowerCase().includes('rain');
    const isHorizontalProjectile = data.question.toLowerCase().includes('building') || data.question.toLowerCase().includes('tower') || data.question.toLowerCase().includes('cliff') || data.question.toLowerCase().includes('horizontal velocity');

    if (type === 'motion') cleanup = drawMotion(canvas, data);
    else if (type === 'graph') cleanup = drawGraph(canvas, data);
    else if (type === 'geometry') cleanup = drawGeometry(canvas, data);
    else if (type === 'chemical_reaction') cleanup = drawChemical(canvas, data);
    else if (type === 'electricity') cleanup = drawElectricity(canvas, data);
    else if (type === 'work_energy') cleanup = drawWorkEnergy(canvas, data);
    else if (type === 'algebra') cleanup = drawAlgebra(canvas, data);
    else if (isRainUmbrella) cleanup = drawRainUmbrella(canvas, data);
    else if (type === 'projectile' && isMonkeyHunter) cleanup = drawMonkeyHunter(canvas, data);
    else if (type === 'projectile' && isHorizontalProjectile) cleanup = drawHorizontalProjectile(canvas, data);
    else if (type === 'projectile') cleanup = drawProjectile(canvas, data);
    else cleanup = drawAbstract(canvas, data);

    // Progress tracker
    let progressFrame = 0;
    const trackProgress = () => {
      if (!sharedPaused.current) {
        sharedTick.current += sharedSpeed.current;
        tickRef.current = sharedTick.current;
      }
      progressRef.current = Math.min(sharedTick.current / totalTicksRef.current, 1);
      setProgress(progressRef.current);
      progressFrame = requestAnimationFrame(trackProgress);
    };
    progressFrame = requestAnimationFrame(trackProgress);

    return () => {
      if (cleanup) cleanup();
      cancelAnimationFrame(progressFrame);
    };
  }, [data, key]);

  const SPEEDS = [0.5, 1, 1.5, 2];

  const typeLabel: Record<string, string> = {
    motion: lang === 'HI' ? 'गति' : 'Motion',
    graph: lang === 'HI' ? 'ग्राफ' : 'Graph',
    geometry: lang === 'HI' ? 'ज्यामिति' : 'Geometry',
    chemical_reaction: lang === 'HI' ? 'रासायनिक अभिक्रिया' : 'Chemical Reaction',
    projectile: lang === 'HI' ? 'प्रक्षेपास्त्र' : 'Projectile',
    electricity: lang === 'HI' ? 'विद्युत' : 'Electricity',
    work_energy: lang === 'HI' ? 'कार्य और उर्जा' : 'Work & Energy',
    algebra: lang === 'HI' ? 'बीजगणित' : 'Algebra',
    abstract: lang === 'HI' ? 'अमूर्त' : 'Abstract',
  };

  const formatTime = (p: number) => {
    const total = Math.round(totalTicksRef.current / 60);
    const cur = Math.round(p * total);
    return `${cur}s / ${total}s`;
  };

  return (
    <div className="space-y-2">
      {/* Header: type badge */}
      <div className="flex items-center justify-between">
        <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest">
          {typeLabel[data.problemType] ?? data.problemType}
        </span>
      </div>

      {/* Canvas */}
      <div className="overflow-x-auto rounded-2xl bg-gray-50 border border-gray-100">
        <canvas ref={canvasRef} width={W} className="rounded-2xl w-full" />
      </div>

      {/* Video controls */}
      <div className="space-y-2 px-1">
        {/* Progress bar */}
        <div className="relative h-1.5 bg-gray-200 rounded-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const p = (e.clientX - rect.left) / rect.width;
            tickRef.current = Math.round(p * totalTicksRef.current);
            setProgress(p);
          }}>
          <div className="h-full bg-gray-800 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-800 rounded-full shadow" style={{ left: `calc(${progress * 100}% - 6px)` }} />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button onClick={() => setPaused(p => !p)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
              {paused ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              )}
            </button>

            {/* Replay */}
            <button onClick={() => { setKey(k => k + 1); setProgress(0); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>

            {/* Time */}
            <span className="text-xs font-mono text-gray-500">{formatTime(progress)}</span>
          </div>

          {/* Speed controls */}
          <div className="flex items-center gap-1">
            {SPEEDS.map(s => (
              <button key={s} onClick={() => { setSpeed(s); speedRef.current = s; }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                  speed === s ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Caption */}
      {data.animationDescription && (
        <p className="text-xs text-gray-400 italic px-1">{data.animationDescription}</p>
      )}
    </div>
  );
}
