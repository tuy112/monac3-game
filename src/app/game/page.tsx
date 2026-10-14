"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import styles from "./page.module.css";

type Team = 0 | 1 | 2 | 3;
type Terrain = "grass" | "water" | "bridge";

type Tile = {
      x: number;
      y: number;
      terrain: Terrain;
      tree: boolean;
};

type Castle = {
      team: Team;
      x: number;
      y: number;
      hp: number;
      reserve: number;
};

type Soldier = {
      id: number;
      team: Team;
      target: Team;
      x: number;
      y: number;
      hp: number;
      path: number[];
      cooldown: number;
      delay: number;
};

type World = {
      tiles: Tile[];
      castles: Castle[];
      soldiers: Soldier[];
      running: boolean;
      result: "victory" | "defeat" | null;
      selected: Team;
      hover: Team | null;
      speed: number;
      time: number;
      recruitClock: number;
      aiClock: number;
      nextId: number;
};

type Status = {
      running: boolean;
      result: World["result"];
      speed: number;
      time: number;
      castles: Castle[];
      selected: Team;
      deployed: number;
};

const WIDTH = 1100;
const HEIGHT = 740;
const SIZE = 21;
const TILE_W = 46;
const TILE_H = 23;

const KINGDOMS = [
      { name: "청람", color: "#67a9df", dark: "#345a83" },
      { name: "홍염", color: "#d78066", dark: "#854739" },
      { name: "황금", color: "#d8bd69", dark: "#887341" },
      { name: "녹림", color: "#88b46b", dark: "#4d7042" },
] as const;

function project(x: number, y: number) {
      return {
            x: WIDTH / 2 + (x - y) * TILE_W / 2,
            y: 175 + (x + y) * TILE_H / 2,
      };
}

function makeWorld(): World {
      const tiles: Tile[] = [];
      const positions = [
            [4, 15],
            [5, 5],
            [15, 15],
            [16, 5],
      ];

      for (let y = 0; y < SIZE; y += 1) {
            for (let x = 0; x < SIZE; x += 1) {
                  const west = x >= 2 && x <= 8;
                  const east = x >= 12 && x <= 18;
                  const north = y >= 2 && y <= 8;
                  const south = y >= 12 && y <= 18;
                  const center = x >= 9 && x <= 11 && y >= 9 && y <= 11;

                  const island = (west || east) && (north || south);
                  const bridge =
                        ((y === 5 || y === 15) && x >= 8 && x <= 12) ||
                        ((x === 5 || x === 15) && y >= 8 && y <= 12) ||
                        (x === 10 && y >= 5 && y <= 15) ||
                        (y === 10 && x >= 5 && x <= 15);

                  const terrain: Terrain = island || center
                        ? "grass"
                        : bridge
                              ? "bridge"
                              : "water";

                  const nearCastle = positions.some(
                        ([cx, cy]) => Math.hypot(cx - x, cy - y) < 2.4,
                  );

                  const road = x === 5 || x === 15 || y === 5 || y === 15;

                  tiles.push({
                        x,
                        y,
                        terrain,
                        tree:
                              terrain === "grass" &&
                              !center &&
                              !nearCastle &&
                              !road &&
                              (x * 13 + y * 19) % 7 < 3,
                  });
            }
      }

      return {
            tiles,
            castles: positions.map(([x, y], index) => ({
                  team: index as Team,
                  x,
                  y,
                  hp: 100,
                  reserve: 18,
            })),
            soldiers: [],
            running: false,
            result: null,
            selected: 1,
            hover: null,
            speed: 1,
            time: 0,
            recruitClock: 0,
            aiClock: 0,
            nextId: 1,
      };
}

function snapshot(world: World): Status {
      return {
            running: world.running,
            result: world.result,
            speed: world.speed,
            time: world.time,
            castles: world.castles.map((castle) => ({ ...castle })),
            selected: world.selected,
            deployed: world.soldiers.filter((soldier) => soldier.team === 0).length,
      };
}

function findPath(world: World, from: Castle, to: Castle): number[] {
      const start = from.y * SIZE + from.x;
      const goal = to.y * SIZE + to.x;
      const previous = new Array<number>(SIZE * SIZE).fill(-1);
      const queue = [start];

      previous[start] = start;

      for (let index = 0; index < queue.length; index += 1) {
            const id = queue[index];

            if (id === goal) break;

            const x = id % SIZE;
            const y = Math.floor(id / SIZE);

            const neighbors = [
                  x > 0 ? id - 1 : -1,
                  x < SIZE - 1 ? id + 1 : -1,
                  y > 0 ? id - SIZE : -1,
                  y < SIZE - 1 ? id + SIZE : -1,
            ];

            for (const next of neighbors) {
                  if (
                        next < 0 ||
                        previous[next] !== -1 ||
                        world.tiles[next].terrain === "water" ||
                        world.tiles[next].tree
                  ) {
                        continue;
                  }

                  previous[next] = id;
                  queue.push(next);
            }
      }

      if (previous[goal] === -1) return [];

      const path: number[] = [];
      let current = goal;

      while (current !== start) {
            path.push(current);
            current = previous[current];
      }

      return path.reverse();
}

function dispatch(world: World, team: Team, target: Team): boolean {
      const from = world.castles[team];
      const to = world.castles[target];

      if (
            !world.running ||
            world.result ||
            team === target ||
            from.hp <= 0 ||
            to.hp <= 0 ||
            from.reserve < 1
      ) {
            return false;
      }

      const path = findPath(world, from, to);

      if (!path.length) return false;

      const count = Math.min(6, from.reserve);

      from.reserve -= count;

      for (let index = 0; index < count; index += 1) {
            world.soldiers.push({
                  id: world.nextId++,
                  team,
                  target,
                  x: from.x,
                  y: from.y,
                  hp: 3,
                  path: [...path],
                  cooldown: 0,
                  delay: index * 0.22,
            });
      }

      return true;
}

function updateWorld(world: World, dt: number) {
      world.time += dt;
      world.recruitClock += dt;
      world.aiClock += dt;

      if (world.recruitClock >= 2.5) {
            world.recruitClock -= 2.5;

            for (const castle of world.castles) {
                  if (castle.hp > 0) {
                        castle.reserve = Math.min(36, castle.reserve + 1);
                  }
            }
      }

      if (world.aiClock >= 8) {
            world.aiClock -= 8;

            for (const team of [1, 2, 3] as const) {
                  const targets = world.castles.filter(
                        (castle) => castle.team !== team && castle.hp > 0,
                  );

                  if (!targets.length) continue;

                  const targetIndex =
                        (Math.floor(world.time / 8) + team) % targets.length;

                  dispatch(world, team, targets[targetIndex].team);
            }
      }

      for (const soldier of world.soldiers) {
            if (soldier.hp <= 0) continue;

            if (world.castles[soldier.team].hp <= 0) {
                  soldier.hp = 0;
                  continue;
            }

            if (soldier.delay > 0) {
                  soldier.delay = Math.max(0, soldier.delay - dt);
                  continue;
            }

            soldier.cooldown = Math.max(0, soldier.cooldown - dt);

            const target = world.castles[soldier.target];

            if (target.hp <= 0) {
                  const remaining = world.castles
                        .filter((castle) => castle.team !== soldier.team && castle.hp > 0)
                        .sort(
                              (a, b) =>
                                    Math.hypot(a.x - soldier.x, a.y - soldier.y) -
                                    Math.hypot(b.x - soldier.x, b.y - soldier.y),
                        );

                  const nextTarget = remaining[0];

                  if (!nextTarget) {
                        soldier.hp = 0;
                        continue;
                  }

                  // 다음 타일에 도착한 뒤 새 목적지로 경로를 계산합니다.
                  if (soldier.path.length === 0) {
                        const newPath = findPath(
                              world,
                              {
                                    ...world.castles[soldier.team],
                                    x: Math.round(soldier.x),
                                    y: Math.round(soldier.y),
                              },
                              nextTarget,
                        );

                        if (!newPath.length) {
                              soldier.hp = 0;
                              continue;
                        }

                        soldier.target = nextTarget.team;
                        soldier.path = newPath;
                  }
            }

            const enemy = world.soldiers.find(
                  (other) =>
                        other.hp > 0 &&
                        other.delay <= 0 &&
                        world.castles[other.team].hp > 0 &&
                        other.team !== soldier.team &&
                        Math.hypot(other.x - soldier.x, other.y - soldier.y) < 0.6,
            );

            if (enemy) {
                  if (soldier.cooldown === 0) {
                        enemy.hp -= 1;
                        soldier.cooldown = 0.7;
                  }

                  continue;
            }

            const next = soldier.path[0];

            if (next !== undefined) {
                  const tx = next % SIZE;
                  const ty = Math.floor(next / SIZE);
                  const dx = tx - soldier.x;
                  const dy = ty - soldier.y;
                  const distance = Math.hypot(dx, dy);
                  const step = dt * 1.65;

                  if (distance <= step) {
                        soldier.x = tx;
                        soldier.y = ty;
                        soldier.path.shift();
                  } else {
                        soldier.x += dx / distance * step;
                        soldier.y += dy / distance * step;
                  }

                  continue;
            }

            const currentTarget = world.castles[soldier.target];

            if (currentTarget.hp > 0 && soldier.cooldown === 0) {
                  currentTarget.hp = Math.max(0, currentTarget.hp - 5);
                  soldier.hp -= 1;
                  soldier.cooldown = 0.8;
            }
      }

      world.soldiers = world.soldiers.filter(
            (soldier) => soldier.hp > 0 && world.castles[soldier.team].hp > 0,
      );

      if (world.castles[0].hp <= 0) {
            world.result = "defeat";
            world.running = false;
      } else if (world.castles.slice(1).every((castle) => castle.hp <= 0)) {
            world.result = "victory";
            world.running = false;
      }
}

function polygon(
      ctx: CanvasRenderingContext2D,
      points: number[][],
      color: string,
) {
      ctx.fillStyle = color;
      ctx.beginPath();

      points.forEach(([x, y], index) => {
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
      });

      ctx.closePath();
      ctx.fill();
}

function diamond(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      color: string,
) {
      polygon(ctx, [
            [x, y],
            [x + 23, y + 11.5],
            [x, y + 23],
            [x - 23, y + 11.5],
      ], color);
}

function createBackdrop(): HTMLCanvasElement {
      const canvas = document.createElement("canvas");

      canvas.width = WIDTH;
      canvas.height = HEIGHT;

      const ctx = canvas.getContext("2d");

      if (!ctx) return canvas;

      const sky = ctx.createLinearGradient(0, 0, 0, 350);

      sky.addColorStop(0, "#e3ece4");
      sky.addColorStop(0.3, "#acbeb4");
      sky.addColorStop(1, "#354e43");

      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (let layer = 0; layer < 3; layer += 1) {
            const base = 230 + layer * 60;

            for (let index = -1; index < 12; index += 1) {
                  const x = index * 125 + layer * 43;
                  const peak = 48 + layer * 43 + Math.sin(index * 4.8) * 28;

                  polygon(ctx, [
                        [x - 100, base + 100],
                        [x - 45, peak + 47],
                        [x - 19, peak + 39],
                        [x, peak],
                        [x + 30, peak + 12],
                        [x + 47, peak + 74],
                        [x + 120, base + 100],
                  ], ["#7d9185", "#5c7566", "#3b5447"][layer]);

                  polygon(ctx, [
                        [x - 100, base + 100],
                        [x - 45, peak + 47],
                        [x - 19, peak + 39],
                        [x, peak],
                        [x - 9, peak + 78],
                        [x - 43, peak + 107],
                        [x - 35, base + 65],
                  ], ["#d1d3be", "#b8baa2", "#999e85"][layer]);

                  for (let ridge = 0; ridge < 5; ridge += 1) {
                        const rx = x - 37 + ridge * 14;

                        polygon(ctx, [
                              [rx, peak + 54 + ridge * 9],
                              [rx - 17, base + 54],
                              [rx + 4, base + 19],
                        ], layer === 2 ? "#66745d" : "#92a18d");
                  }
            }
      }

      const shadow = ctx.createLinearGradient(0, 285, 0, 545);

      shadow.addColorStop(0, "rgba(0, 0, 0, 0)");
      shadow.addColorStop(1, "#000");

      ctx.fillStyle = shadow;
      ctx.fillRect(0, 285, WIDTH, HEIGHT - 285);

      return canvas;
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
      ctx.fillStyle = "#473c29";
      ctx.fillRect(x - 2, y - 10, 4, 15);

      for (let layer = 0; layer < 3; layer += 1) {
            const half = 13 - layer * 3;
            const bottom = y - layer * 9;

            polygon(ctx, [
                  [x, bottom - 23],
                  [x + half, bottom],
                  [x - half, bottom],
            ], "#263d2b");

            polygon(ctx, [
                  [x, bottom - 23],
                  [x, bottom - 2],
                  [x - half, bottom],
            ], "#526743");
      }
}

function drawCastle(
      ctx: CanvasRenderingContext2D,
      castle: Castle,
      selected: boolean,
      time: number,
) {
      const p = project(castle.x, castle.y);
      const x = p.x;
      const y = p.y + 13;
      const kingdom = KINGDOMS[castle.team];

      ctx.fillStyle = "#00000045";
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 35, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      if (castle.hp <= 0) {
            ctx.fillStyle = "#626758";
            ctx.fillRect(x - 22, y - 3, 43, 10);
            ctx.fillStyle = "#969681";
            ctx.fillRect(x - 16, y - 12, 11, 11);
            ctx.fillRect(x + 5, y - 8, 14, 9);
            return;
      }

      if (selected) {
            ctx.strokeStyle = "#e7d18a";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x, y + 9, 40, 19, 0, 0, Math.PI * 2);
            ctx.stroke();
      }

      polygon(ctx, [
            [x - 30, y - 8],
            [x, y - 25],
            [x + 30, y - 8],
            [x, y + 10],
      ], "#c0c1a2");

      polygon(ctx, [
            [x - 30, y - 8],
            [x, y + 10],
            [x, y + 24],
            [x - 30, y + 6],
      ], "#6f7967");

      polygon(ctx, [
            [x, y + 10],
            [x + 30, y - 8],
            [x + 30, y + 6],
            [x, y + 24],
      ], "#9caa8c");

      ctx.fillStyle = "#b6bda1";
      ctx.fillRect(x - 12, y - 40, 24, 39);
      ctx.fillStyle = "#758573";
      ctx.fillRect(x + 5, y - 40, 7, 39);

      polygon(ctx, [
            [x - 17, y - 38],
            [x, y - 57],
            [x + 17, y - 38],
      ], kingdom.color);

      polygon(ctx, [
            [x, y - 57],
            [x + 17, y - 38],
            [x, y - 38],
      ], kingdom.dark);

      for (const offset of [-28, 18]) {
            ctx.fillStyle = "#aab598";
            ctx.fillRect(x + offset, y - 24, 11, 28);

            ctx.fillStyle = "#d0cfb1";

            for (let index = 0; index < 3; index += 1) {
                  ctx.fillRect(x + offset + index * 4, y - 28, 3, 8);
            }

            ctx.fillStyle = "#596952";
            ctx.fillRect(x + offset + 4, y - 15, 3, 7);
      }

      ctx.fillStyle = "#354335";
      ctx.fillRect(x - 4, y + 5, 9, 15);
      ctx.fillRect(x - 3, y - 30, 5, 8);

      ctx.fillStyle = "#d2c398";
      ctx.fillRect(x + 9, y - 75, 2, 35);

      const wave = Math.sin(time * 4 + castle.team) * 2;

      polygon(ctx, [
            [x + 11, y - 75],
            [x + 32, y - 71 + wave],
            [x + 11, y - 62],
      ], kingdom.color);

      ctx.fillStyle = "#1e271b";
      ctx.fillRect(x - 26, y + 31, 52, 5);
      ctx.fillStyle = kingdom.color;
      ctx.fillRect(x - 25, y + 32, castle.hp / 2, 3);

      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff0c6";
      ctx.fillText(`${kingdom.name} ${castle.reserve}`, x, y + 49);
}

function drawSoldier(
      ctx: CanvasRenderingContext2D,
      soldier: Soldier,
      time: number,
) {
      if (soldier.delay > 0) return;

      const p = project(soldier.x, soldier.y);
      const x = p.x + (soldier.id % 3 - 1) * 4;
      const y = p.y + 12;
      const kingdom = KINGDOMS[soldier.team];
      const walk = soldier.path.length > 0
            ? Math.sin(time * 15 + soldier.id) * 2
            : 0;

      ctx.fillStyle = "#00000045";
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#3a3429";
      ctx.fillRect(x - 4, y - 3, 3, 5 + walk);
      ctx.fillRect(x + 1, y - 3, 3, 5 - walk);

      ctx.fillStyle = kingdom.dark;
      ctx.fillRect(x - 5, y - 13, 10, 11);
      ctx.fillStyle = kingdom.color;
      ctx.fillRect(x - 5, y - 13, 6, 8);

      ctx.fillStyle = "#d7bc8d";
      ctx.fillRect(x - 3, y - 20, 6, 7);
      ctx.fillStyle = "#b7c5bc";
      ctx.fillRect(x - 4, y - 23, 8, 5);
      ctx.fillStyle = "#63776b";
      ctx.fillRect(x + 2, y - 22, 2, 8);

      ctx.fillStyle = "#d5ddd0";
      ctx.fillRect(x + 7, y - 20, 2, 13);
      ctx.fillStyle = "#735535";
      ctx.fillRect(x + 6, y - 8, 4, 2);
}

function render(
      ctx: CanvasRenderingContext2D,
      world: World,
      backdrop: HTMLCanvasElement,
) {
      ctx.drawImage(backdrop, 0, 0);

      for (let depth = 0; depth <= (SIZE - 1) * 2; depth += 1) {
            for (const tile of world.tiles) {
                  if (tile.x + tile.y !== depth) continue;

                  const p = project(tile.x, tile.y);
                  const noise = (tile.x * 17 + tile.y * 11) % 4;

                  if (tile.terrain === "water") {
                        diamond(ctx, p.x, p.y + 9, [
                              "#356d83",
                              "#32687c",
                              "#3d788c",
                              "#397287",
                        ][noise]);

                        ctx.strokeStyle = "#add0cb66";
                        ctx.lineWidth = 1;

                        const wave = Math.sin(world.time * 2 + tile.x + tile.y) * 2;

                        ctx.beginPath();
                        ctx.moveTo(p.x - 15 + wave, p.y + 20);
                        ctx.lineTo(p.x - 7 + wave, p.y + 23);
                        ctx.lineTo(p.x - 2 + wave, p.y + 21);
                        ctx.moveTo(p.x + 4 - wave, p.y + 25);
                        ctx.lineTo(p.x + 12 - wave, p.y + 22);
                        ctx.stroke();

                        continue;
                  }

                  if (tile.terrain === "grass") {
                        polygon(ctx, [
                              [p.x - 23, p.y + 11.5],
                              [p.x, p.y + 23],
                              [p.x, p.y + 35],
                              [p.x - 23, p.y + 23.5],
                        ], "#81774c");

                        polygon(ctx, [
                              [p.x, p.y + 23],
                              [p.x + 23, p.y + 11.5],
                              [p.x + 23, p.y + 23.5],
                              [p.x, p.y + 35],
                        ], "#b0a371");

                        diamond(ctx, p.x, p.y, [
                              "#839459",
                              "#899961",
                              "#7d8d52",
                              "#91a069",
                        ][noise]);

                        ctx.fillStyle = "#bdbe7c80";
                        ctx.fillRect(p.x - 9 + noise, p.y + 9, 5, 2);
                        ctx.fillStyle = "#51673e70";
                        ctx.fillRect(p.x + 7, p.y + 13, 3, 2);

                        continue;
                  }

                  diamond(ctx, p.x, p.y + 4, "#5e4a30");
                  diamond(ctx, p.x, p.y, "#b29861");

                  ctx.strokeStyle = "#725b37";
                  ctx.lineWidth = 1;

                  for (let index = 1; index < 6; index += 1) {
                        const offset = index / 6;

                        ctx.beginPath();
                        ctx.moveTo(
                              p.x - 23 + offset * 23,
                              p.y + 11.5 - offset * 11.5,
                        );
                        ctx.lineTo(
                              p.x + offset * 23,
                              p.y + 23 - offset * 11.5,
                        );
                        ctx.stroke();
                  }

                  ctx.fillStyle = "#685234";
                  ctx.fillRect(p.x - 21, p.y + 6, 3, 10);
                  ctx.fillRect(p.x + 18, p.y + 6, 3, 10);
            }
      }

      const objects: { depth: number; draw: () => void }[] = [];

      for (const tile of world.tiles) {
            if (!tile.tree) continue;

            const p = project(tile.x, tile.y);

            objects.push({
                  depth: tile.x + tile.y,
                  draw: () => drawTree(ctx, p.x, p.y + 14),
            });
      }

      for (const castle of world.castles) {
            objects.push({
                  depth: castle.x + castle.y,
                  draw: () => drawCastle(
                        ctx,
                        castle,
                        castle.team === world.selected || castle.team === world.hover,
                        world.time,
                  ),
            });
      }

      for (const soldier of world.soldiers) {
            objects.push({
                  depth: soldier.x + soldier.y + 0.1,
                  draw: () => drawSoldier(ctx, soldier, world.time),
            });
      }

      objects.sort((a, b) => a.depth - b.depth);
      objects.forEach((object) => object.draw());
}

export default function GamePage() {
      const canvasRef = useRef<HTMLCanvasElement>(null);
      const worldRef = useRef<World | null>(null);

      const [status, setStatus] = useState<Status>({
            running: false,
            result: null,
            speed: 1,
            time: 0,
            castles: [],
            selected: 1,
            deployed: 0,
      });

      const [showKingdoms, setShowKingdoms] = useState(false);
      const [showGuide, setShowGuide] = useState(false);
      const [message, setMessage] = useState("▶ 버튼을 눌러 전투를 시작하세요.");

      useEffect(() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");

            if (!canvas || !ctx) return;

            ctx.imageSmoothingEnabled = false;

            const backdrop = createBackdrop();
            const world = makeWorld();

            worldRef.current = world;
            setStatus(snapshot(world));

            let frame = 0;
            let previous: number | null = null;
            let hudClock = 0;

            function animate(now: number) {
                  const current = worldRef.current;

                  if (!current || !ctx) return;

                  const elapsed = previous === null
                        ? 0
                        : Math.min((now - previous) / 1000, 0.05);

                  previous = now;

                  if (current.running) {
                        updateWorld(current, elapsed * current.speed);
                  }

                  render(ctx, current, backdrop);

                  hudClock += elapsed;

                  if (hudClock >= 0.15) {
                        setStatus(snapshot(current));
                        hudClock = 0;
                  }

                  frame = requestAnimationFrame(animate);
            }

            frame = requestAnimationFrame(animate);

            return () => {
                  cancelAnimationFrame(frame);
                  worldRef.current = null;
            };
      }, []);

      function toggleRunning() {
            const world = worldRef.current;

            if (!world || world.result) return;

            world.running = !world.running;

            setStatus(snapshot(world));
            setMessage(
                  world.running
                        ? "적 성을 누르면 청람 병사 최대 6명이 출격합니다."
                        : "일시정지 중입니다.",
            );
      }

      function changeSpeed() {
            const world = worldRef.current;

            if (!world) return;

            world.speed = world.speed === 1 ? 2 : 1;
            setStatus(snapshot(world));
      }

      function restart() {
            const world = makeWorld();

            worldRef.current = world;
            setStatus(snapshot(world));
            setMessage("전장을 초기화했습니다. ▶ 버튼으로 시작하세요.");
      }

      function attack(team: Team) {
            const world = worldRef.current;

            if (!world || world.result) return;

            world.selected = team;

            if (team === 0) {
                  setMessage("청람은 내 왕국입니다. 공격할 적 성을 선택하세요.");
            } else if (world.castles[team].hp <= 0) {
                  setMessage("이미 함락된 성입니다.");
            } else if (!world.running) {
                  setMessage(`${KINGDOMS[team].name} 선택 · 전투 시작 후 출격할 수 있습니다.`);
            } else if (dispatch(world, 0, team)) {
                  setMessage(`${KINGDOMS[team].name} 왕국으로 병력을 보냈습니다.`);
            } else {
                  setMessage("출격 가능한 병력이 없습니다.");
            }

            setStatus(snapshot(world));
      }

      function hitCastle(
            canvas: HTMLCanvasElement,
            clientX: number,
            clientY: number,
      ): Team | null {
            const world = worldRef.current;

            if (!world) return null;

            const rect = canvas.getBoundingClientRect();
            const x = (clientX - rect.left) / rect.width * WIDTH;
            const y = (clientY - rect.top) / rect.height * HEIGHT;

            const castle = [...world.castles]
                  .sort((a, b) => b.x + b.y - a.x - a.y)
                  .find((item) => {
                        const p = project(item.x, item.y);

                        return (
                              Math.abs(p.x - x) < 39 &&
                              y > p.y - 65 &&
                              y < p.y + 59
                        );
                  });

            return castle?.team ?? null;
      }

      const own = status.castles[0];
      const minutes = Math.floor(status.time / 60).toString().padStart(2, "0");
      const seconds = Math.floor(status.time % 60).toString().padStart(2, "0");

      return (
            <main className={styles.page}>
                  <section className={styles.game} aria-label="네 왕국의 교차로">
                        <canvas
                              ref={canvasRef}
                              width={WIDTH}
                              height={HEIGHT}
                              className={styles.canvas}
                              aria-label="네 왕국의 전장. 왕국 현황 메뉴에서도 공격 대상을 선택할 수 있습니다."
                              onClick={(event) => {
                                    const team = hitCastle(
                                          event.currentTarget,
                                          event.clientX,
                                          event.clientY,
                                    );

                                    if (team !== null) attack(team);
                              }}
                              onPointerMove={(event) => {
                                    const world = worldRef.current;

                                    if (!world) return;

                                    const team = hitCastle(
                                          event.currentTarget,
                                          event.clientX,
                                          event.clientY,
                                    );

                                    world.hover = team;
                                    event.currentTarget.style.cursor =
                                          team === null ? "default" : "pointer";
                              }}
                              onPointerLeave={() => {
                                    if (worldRef.current) {
                                          worldRef.current.hover = null;
                                    }
                              }}
                        />

                        <div className={styles.stageLabel}>
                              <span>STAGE 1</span>
                              네 왕국의 교차로
                        </div>

                        <nav className={styles.toolbar} aria-label="전장 메뉴">
                              <button
                                    type="button"
                                    className={styles.tool}
                                    onClick={toggleRunning}
                                    disabled={status.result !== null}
                                    title={status.running ? "일시정지" : "전투 시작"}
                                    aria-label={status.running ? "일시정지" : "전투 시작"}
                              >
                                    {status.running ? "Ⅱ" : "▶"}
                              </button>

                              <button
                                    type="button"
                                    className={styles.tool}
                                    onClick={changeSpeed}
                                    title="진행 속도 변경"
                                    aria-label={`현재 ${status.speed}배속. 클릭하여 변경`}
                              >
                                    <span className={styles.speed}>{status.speed}×</span>
                              </button>

                              <button
                                    type="button"
                                    className={styles.tool}
                                    onClick={() => setShowKingdoms((value) => !value)}
                                    title="왕국 현황"
                                    aria-label="왕국 현황"
                                    aria-expanded={showKingdoms}
                              >
                                    ⚑
                              </button>

                              <button
                                    type="button"
                                    className={styles.tool}
                                    onClick={() => setShowGuide((value) => !value)}
                                    title="조작 방법"
                                    aria-label="조작 방법"
                                    aria-expanded={showGuide}
                              >
                                    ?
                              </button>

                              <button
                                    type="button"
                                    className={styles.tool}
                                    onClick={restart}
                                    title="전장 초기화"
                                    aria-label="전장 초기화"
                              >
                                    ↻
                              </button>

                              <Link
                                    href="/world"
                                    className={styles.tool}
                                    title="월드로 돌아가기"
                                    aria-label="월드로 돌아가기"
                              >
                                    ↶
                              </Link>
                        </nav>

                        <div className={styles.status}>
                              <span className={styles.ownName}>⚑ 청람</span>
                              <span>성 {own?.hp ?? 100}</span>
                              <span>대기 {own?.reserve ?? 18}</span>
                              <span>출격 {status.deployed}</span>
                              <time>{minutes}:{seconds}</time>
                        </div>

                        {showKingdoms && (
                              <section className={styles.kingdomPanel}>
                                    <header className={styles.panelHeader}>
                                          <strong>왕국 현황</strong>

                                          <button
                                                type="button"
                                                onClick={() => setShowKingdoms(false)}
                                                aria-label="왕국 현황 닫기"
                                          >
                                                ×
                                          </button>
                                    </header>

                                    {KINGDOMS.map((kingdom, index) => {
                                          const team = index as Team;
                                          const castle = status.castles[team];

                                          return (
                                                <button
                                                      key={kingdom.name}
                                                      type="button"
                                                      className={styles.kingdomRow}
                                                      onClick={() => attack(team)}
                                                      aria-pressed={status.selected === team}
                                                      disabled={status.result !== null}
                                                >
                                                      <span style={{ color: kingdom.color }}>
                                                            ⚑ {kingdom.name}
                                                            {team === 0 ? " · 나" : ""}
                                                      </span>

                                                      <small>
                                                            {castle?.hp === 0
                                                                  ? "함락"
                                                                  : `${castle?.hp ?? 100} / ${castle?.reserve ?? 18}`}
                                                      </small>
                                                </button>
                                          );
                                    })}
                              </section>
                        )}

                        {showGuide && (
                              <section className={styles.guide}>
                                    <header className={styles.panelHeader}>
                                          <strong>조작 방법</strong>

                                          <button
                                                type="button"
                                                onClick={() => setShowGuide(false)}
                                                aria-label="조작 방법 닫기"
                                          >
                                                ×
                                          </button>
                                    </header>

                                    <p>▶ 전투 시작 / 일시정지</p>
                                    <p>적 성 클릭 : 최대 6명 출격</p>
                                    <p>2.5초마다 대기 병력 1명 보충</p>
                                    <p>적 성을 모두 함락하면 승리합니다.</p>
                              </section>
                        )}

                        {!status.running && !status.result && (
                              <button
                                    type="button"
                                    className={styles.pause}
                                    onClick={toggleRunning}
                              >
                                    {status.time === 0 ? "▶ 전투 시작" : "Ⅱ 일시정지"}
                              </button>
                        )}

                        <div className={styles.message} role="status">
                              {message}
                        </div>

                        {status.result && (
                              <div className={styles.resultBackdrop}>
                                    <section
                                          className={styles.result}
                                          role="dialog"
                                          aria-modal="true"
                                          aria-labelledby="battle-result"
                                    >
                                          <span>STAGE 1</span>

                                          <h1 id="battle-result">
                                                {status.result === "victory"
                                                      ? "원정 성공"
                                                      : "왕국 함락"}
                                          </h1>

                                          <p>
                                                {status.result === "victory"
                                                      ? "모든 적 왕국의 성을 함락했습니다."
                                                      : "청람 왕국의 성이 함락되었습니다."}
                                          </p>

                                          <div className={styles.resultActions}>
                                                <button type="button" onClick={restart}>
                                                      다시 시작
                                                </button>

                                                <Link href="/world">
                                                      월드로
                                                </Link>
                                          </div>
                                    </section>
                              </div>
                        )}
                  </section>
            </main>
      );
}