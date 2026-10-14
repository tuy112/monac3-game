"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import styles from "./page.module.css";

type Team = 0 | 1 | 2 | 3;
type Terrain = "water" | "grass" | "bridge";

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
      x: number;
      y: number;
      hp: number;
      target: Team;
      path: number[];
      cooldown: number;
};

type World = {
      tiles: Tile[];
      castles: Castle[];
      soldiers: Soldier[];
      time: number;
      recruitClock: number;
      aiClock: number;
      nextId: number;
      running: boolean;
      selected: Team;
};

type Status = {
      time: number;
      running: boolean;
      selected: Team;
      castles: Castle[];
};

const SIZE = 21;
const WIDTH = 1100;
const HEIGHT = 700;
const TILE_W = 46;
const TILE_H = 23;
const ORIGIN_X = WIDTH / 2;
const ORIGIN_Y = 105;

const KINGDOMS = [
      { name: "청람 왕국", color: "#588ee7", dark: "#294a8d" },
      { name: "홍염 왕국", color: "#df6758", dark: "#8d382f" },
      { name: "황금 왕국", color: "#e0bd5b", dark: "#927333" },
      { name: "녹림 왕국", color: "#78b36b", dark: "#41683a" },
] as const;

function project(x: number, y: number) {
      return {
            x: ORIGIN_X + (x - y) * TILE_W / 2,
            y: ORIGIN_Y + (x + y) * TILE_H / 2,
      };
}

function makeWorld(): World {
      const tiles: Tile[] = [];

      for (let y = 0; y < SIZE; y += 1) {
            for (let x = 0; x < SIZE; x += 1) {
                  const west = x >= 2 && x <= 7;
                  const east = x >= 13 && x <= 18;
                  const north = y >= 2 && y <= 7;
                  const south = y >= 13 && y <= 18;

                  const island = (west || east) && (north || south);
                  const center = x >= 9 && x <= 11 && y >= 9 && y <= 11;

                  const horizontal =
                        (y === 5 || y === 15) && x >= 5 && x <= 15;

                  const vertical =
                        (x === 5 || x === 15) && y >= 5 && y <= 15;

                  const middle =
                        (y === 10 && x >= 5 && x <= 15) ||
                        (x === 10 && y >= 5 && y <= 15);

                  const terrain: Terrain =
                        island || center
                              ? "grass"
                              : horizontal || vertical || middle
                                    ? "bridge"
                                    : "water";

                  const nearCastle = [
                        [4, 4],
                        [16, 4],
                        [4, 16],
                        [16, 16],
                  ].some(([cx, cy]) => Math.abs(cx - x) + Math.abs(cy - y) <= 2);

                  tiles.push({
                        x,
                        y,
                        terrain,
                        tree:
                              terrain === "grass" &&
                              !nearCastle &&
                              x !== 5 &&
                              x !== 15 &&
                              y !== 5 &&
                              y !== 15 &&
                              (x * 17 + y * 29) % 5 < 2,
                  });
            }
      }

      const castles: Castle[] = [
            { team: 0, x: 4, y: 4, hp: 100, reserve: 12 },
            { team: 1, x: 16, y: 4, hp: 100, reserve: 12 },
            { team: 2, x: 4, y: 16, hp: 100, reserve: 12 },
            { team: 3, x: 16, y: 16, hp: 100, reserve: 12 },
      ];

      return {
            tiles,
            castles,
            soldiers: [],
            time: 0,
            recruitClock: 0,
            aiClock: 0,
            nextId: 0,
            running: false,
            selected: 1,
      };
}

function findPath(world: World, from: Castle, to: Castle): number[] {
      const start = from.y * SIZE + from.x;
      const goal = to.y * SIZE + to.x;
      const previous = new Int32Array(SIZE * SIZE).fill(-1);
      const queue = [start];

      previous[start] = start;

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const id = queue[cursor];

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
                        world.tiles[next].terrain === "water"
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

      if (team === target || from.hp <= 0 || to.hp <= 0 || from.reserve < 1) {
            return false;
      }

      const path = findPath(world, from, to);

      if (!path.length) return false;

      const count = Math.min(6, from.reserve);

      from.reserve -= count;

      for (let i = 0; i < count; i += 1) {
            world.soldiers.push({
                  id: world.nextId++,
                  team,
                  x: from.x,
                  y: from.y,
                  hp: 3,
                  target,
                  path: [...path],
                  cooldown: i * 0.14,
            });
      }

      return true;
}

function updateWorld(world: World, dt: number) {
      world.time += dt;
      world.recruitClock += dt;
      world.aiClock += dt;

      if (world.recruitClock >= 3) {
            world.recruitClock -= 3;

            for (const castle of world.castles) {
                  if (castle.hp > 0) {
                        castle.reserve = Math.min(30, castle.reserve + 1);
                  }
            }
      }

      if (world.aiClock >= 9) {
            world.aiClock = 0;

            for (const team of [1, 2, 3] as const) {
                  const targets = world.castles.filter(
                        (castle) => castle.team !== team && castle.hp > 0,
                  );

                  if (!targets.length) continue;

                  const index = Math.floor(world.time / 9 + team) % targets.length;

                  dispatch(world, team, targets[index].team);
            }
      }

      for (const soldier of world.soldiers) {
            if (soldier.hp <= 0) continue;

            soldier.cooldown = Math.max(0, soldier.cooldown - dt);

            const enemy = world.soldiers.find(
                  (other) =>
                        other.hp > 0 &&
                        other.team !== soldier.team &&
                        Math.hypot(other.x - soldier.x, other.y - soldier.y) < 0.65,
            );

            if (enemy) {
                  if (soldier.cooldown === 0) {
                        enemy.hp -= 1;
                        soldier.cooldown = 0.8;
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
                  const step = dt * (1.15 + soldier.id % 3 * 0.08);

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

            const target = world.castles[soldier.target];

            if (target.hp <= 0) {
                  soldier.hp = 0;
                  continue;
            }

            if (soldier.cooldown === 0) {
                  target.hp = Math.max(0, target.hp - 2);
                  soldier.hp -= 1;
                  soldier.cooldown = 1;
            }
      }

      world.soldiers = world.soldiers.filter(
            (soldier) => soldier.hp > 0 && world.castles[soldier.team].hp > 0,
      );

      if (world.castles.filter((castle) => castle.hp > 0).length <= 1) {
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
            [x + TILE_W / 2, y + TILE_H / 2],
            [x, y + TILE_H],
            [x - TILE_W / 2, y + TILE_H / 2],
      ], color);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number) {
      const height = 23 + seed % 3 * 5;

      ctx.fillStyle = "rgba(20, 31, 17, .25)";
      ctx.beginPath();
      ctx.ellipse(x + 3, y + 2, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#695031";
      ctx.fillRect(x - 2, y - 11, 4, 13);

      for (let layer = 0; layer < 3; layer += 1) {
            const bottom = y - 5 - layer * 7;
            const half = 12 - layer * 2;

            polygon(ctx, [
                  [x, y - height - layer * 2],
                  [x + half, bottom],
                  [x - half, bottom],
            ], layer % 2 ? "#3b6038" : "#2c4c30");

            polygon(ctx, [
                  [x, y - height - layer * 2],
                  [x, bottom - 2],
                  [x - half, bottom],
            ], "#537246");
      }
}

function drawCastle(ctx: CanvasRenderingContext2D, castle: Castle, selected: boolean) {
      const p = project(castle.x, castle.y);
      const { color, dark } = KINGDOMS[castle.team];
      const x = p.x;
      const y = p.y + 10;

      ctx.fillStyle = "rgba(17, 26, 19, .35)";
      ctx.beginPath();
      ctx.ellipse(x, y + 8, 34, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      if (selected) {
            ctx.strokeStyle = "#ffdd87";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x, y + 7, 39, 17, 0, 0, Math.PI * 2);
            ctx.stroke();
      }

      if (castle.hp <= 0) {
            ctx.fillStyle = "#777767";
            ctx.fillRect(x - 21, y - 7, 42, 12);
            ctx.fillStyle = "#52584c";
            ctx.fillRect(x - 13, y - 15, 12, 10);
            return;
      }

      polygon(ctx, [
            [x - 29, y - 10],
            [x, y - 25],
            [x + 29, y - 10],
            [x, y + 6],
      ], "#b3b6a0");

      polygon(ctx, [
            [x - 29, y - 10],
            [x, y + 6],
            [x, y + 20],
            [x - 29, y + 4],
      ], "#6b7667");

      polygon(ctx, [
            [x, y + 6],
            [x + 29, y - 10],
            [x + 29, y + 4],
            [x, y + 20],
      ], "#909782");

      ctx.fillStyle = "#a5ad98";
      ctx.fillRect(x - 13, y - 38, 26, 35);
      ctx.fillStyle = "#6e7c6d";
      ctx.fillRect(x + 5, y - 38, 8, 35);

      polygon(ctx, [
            [x - 18, y - 36],
            [x, y - 54],
            [x + 18, y - 36],
      ], color);

      polygon(ctx, [
            [x, y - 54],
            [x + 18, y - 36],
            [x, y - 36],
      ], dark);

      for (const offset of [-26, 18]) {
            ctx.fillStyle = "#a8ae98";
            ctx.fillRect(x + offset, y - 22, 10, 27);
            ctx.fillStyle = "#c0c3ab";

            for (let i = 0; i < 3; i += 1) {
                  ctx.fillRect(x + offset + i * 4, y - 26, 3, 7);
            }
      }

      ctx.fillStyle = "#343f36";
      ctx.fillRect(x - 4, y - 3, 9, 17);
      ctx.fillRect(x - 3, y - 29, 5, 8);

      ctx.fillStyle = "#d5c799";
      ctx.fillRect(x + 10, y - 67, 2, 28);

      polygon(ctx, [
            [x + 12, y - 67],
            [x + 32, y - 63],
            [x + 12, y - 55],
      ], color);

      ctx.fillStyle = "#25332c";
      ctx.fillRect(x - 25, y + 28, 50, 5);
      ctx.fillStyle = color;
      ctx.fillRect(x - 25, y + 28, castle.hp / 2, 5);
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff3cd";
      ctx.fillText(`${castle.reserve}`, x, y + 47);
}

function drawSoldier(ctx: CanvasRenderingContext2D, soldier: Soldier, time: number) {
      const p = project(soldier.x, soldier.y);
      const offset = (soldier.id % 3 - 1) * 4;
      const x = p.x + offset;
      const y = p.y + 10;
      const walk = soldier.path.length ? Math.sin(time * 12 + soldier.id) * 2 : 0;

      ctx.fillStyle = "rgba(20, 30, 19, .3)";
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#302f27";
      ctx.fillRect(x - 4, y - 3, 3, 5 + walk);
      ctx.fillRect(x + 1, y - 3, 3, 5 - walk);

      ctx.fillStyle = KINGDOMS[soldier.team].dark;
      ctx.fillRect(x - 5, y - 13, 10, 11);
      ctx.fillStyle = KINGDOMS[soldier.team].color;
      ctx.fillRect(x - 5, y - 13, 6, 8);

      ctx.fillStyle = "#d7bb8d";
      ctx.fillRect(x - 3, y - 19, 6, 6);
      ctx.fillStyle = "#c9cfbe";
      ctx.fillRect(x - 4, y - 21, 8, 4);
      ctx.fillStyle = "#68796c";
      ctx.fillRect(x + 2, y - 21, 2, 6);

      ctx.fillStyle = "#c8cfc5";
      ctx.fillRect(x + 7, y - 20, 2, 13);
      ctx.fillStyle = "#715534";
      ctx.fillRect(x + 6, y - 8, 4, 2);
}

function render(ctx: CanvasRenderingContext2D, world: World) {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, "#9dad9d");
      sky.addColorStop(0.35, "#465e53");
      sky.addColorStop(0.7, "#1a2c29");
      sky.addColorStop(1, "#101b1c");

      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (let layer = 0; layer < 3; layer += 1) {
            const points = [[0, 400]];

            for (let x = 0; x <= WIDTH + 60; x += 55) {
                  const y =
                        100 + layer * 53 +
                        Math.sin(x * 0.015 + layer * 4) * 32 +
                        Math.cos(x * 0.039 + layer) * 29;

                  points.push([x, y]);
            }

            points.push([WIDTH, 440]);

            polygon(ctx, points, ["#7c9080", "#61786a", "#3b574b"][layer]);
      }

      ctx.fillStyle = "rgba(0, 0, 0, .28)";
      ctx.beginPath();
      ctx.ellipse(550, 570, 430, 62, 0, 0, Math.PI * 2);
      ctx.fill();

      for (let sum = 0; sum <= (SIZE - 1) * 2; sum += 1) {
            for (const tile of world.tiles) {
                  if (tile.x + tile.y !== sum) continue;

                  const p = project(tile.x, tile.y);
                  const noise = (tile.x * 13 + tile.y * 7) % 4;

                  if (tile.terrain === "water") {
                        diamond(ctx, p.x, p.y + 9, [
                              "#2c6778",
                              "#2c6c7b",
                              "#326f7c",
                              "#306979",
                        ][noise]);

                        ctx.strokeStyle = "rgba(148, 204, 194, .25)";
                        ctx.lineWidth = 1;
                        const wave = Math.sin(world.time * 2 + tile.x + tile.y) * 3;

                        ctx.beginPath();
                        ctx.moveTo(p.x - 10 + wave, p.y + 20);
                        ctx.lineTo(p.x - 3 + wave, p.y + 23);
                        ctx.moveTo(p.x + 5 - wave, p.y + 17);
                        ctx.lineTo(p.x + 11 - wave, p.y + 19);
                        ctx.stroke();

                        continue;
                  }

                  if (tile.terrain === "grass") {
                        polygon(ctx, [
                              [p.x - 23, p.y + 11.5],
                              [p.x, p.y + 23],
                              [p.x, p.y + 35],
                              [p.x - 23, p.y + 23.5],
                        ], "#817a51");

                        polygon(ctx, [
                              [p.x, p.y + 23],
                              [p.x + 23, p.y + 11.5],
                              [p.x + 23, p.y + 23.5],
                              [p.x, p.y + 35],
                        ], "#a39b6b");

                        diamond(ctx, p.x, p.y, [
                              "#829452",
                              "#889956",
                              "#7b8d4b",
                              "#8b9a58",
                        ][noise]);

                        ctx.fillStyle = "#a1ad65";
                        ctx.fillRect(p.x - 5 + noise, p.y + 9, 3, 2);
                        ctx.fillStyle = "#697e42";
                        ctx.fillRect(p.x + 6, p.y + 13, 3, 2);

                        continue;
                  }

                  diamond(ctx, p.x, p.y + 3, "#635034");
                  diamond(ctx, p.x, p.y, "#ab8c57");

                  ctx.strokeStyle = "#6e5635";
                  ctx.lineWidth = 1;

                  for (let i = 1; i < 5; i += 1) {
                        ctx.beginPath();
                        ctx.moveTo(p.x - 23 + i * 9.2, p.y + 11.5 - i * 2.3);
                        ctx.lineTo(p.x + i * 9.2, p.y + 23 - i * 2.3);
                        ctx.stroke();
                  }

                  ctx.fillStyle = "#584831";
                  ctx.fillRect(p.x - 21, p.y + 5, 3, 10);
                  ctx.fillRect(p.x + 18, p.y + 5, 3, 10);
            }
      }

      const objects: { depth: number; draw: () => void }[] = [];

      for (const tile of world.tiles) {
            if (!tile.tree) continue;

            const p = project(tile.x, tile.y);

            objects.push({
                  depth: tile.x + tile.y,
                  draw: () => drawTree(ctx, p.x, p.y + 13, tile.x + tile.y),
            });
      }

      for (const castle of world.castles) {
            objects.push({
                  depth: castle.x + castle.y,
                  draw: () => drawCastle(ctx, castle, castle.team === world.selected),
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

      const center = project(10, 10);

      ctx.fillStyle = "#d0c4a0";
      ctx.fillRect(center.x - 3, center.y - 23, 6, 36);
      ctx.fillStyle = "#a6936a";
      ctx.fillRect(center.x - 10, center.y + 10, 20, 6);
      ctx.fillStyle = "#e5d4a1";
      ctx.fillRect(center.x - 6, center.y - 28, 12, 8);
}

export default function GamePage() {
      const canvasRef = useRef<HTMLCanvasElement>(null);
      const worldRef = useRef<World | null>(null);

      const [status, setStatus] = useState<Status>({
            time: 0,
            running: false,
            selected: 1,
            castles: [],
      });

      const [message, setMessage] = useState(
            "네 왕국이 다리로 연결되어 있습니다. 전투 시작을 눌러주세요.",
      );

      function syncStatus(world: World) {
            setStatus({
                  time: world.time,
                  running: world.running,
                  selected: world.selected,
                  castles: world.castles.map((castle) => ({ ...castle })),
            });
      }

      useEffect(() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");

            if (!canvas || !ctx) return;

            const world = makeWorld();
            worldRef.current = world;

            let frame = 0;
            let previous = 0;
            let hudClock = 0;

            function animate(now: number) {
                  if (!ctx) return;

                  const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
                  previous = now;

                  const current = worldRef.current;

                  if (!current) return;

                  if (current.running) updateWorld(current, dt);

                  render(ctx, current);

                  hudClock += dt;

                  if (hudClock >= 0.2) {
                        syncStatus(current);
                        hudClock = 0;
                  }

                  frame = requestAnimationFrame(animate);
            }

            syncStatus(world);
            frame = requestAnimationFrame(animate);

            return () => {
                  cancelAnimationFrame(frame);
                  worldRef.current = null;
            };
      }, []);

      function toggleRunning() {
            const world = worldRef.current;

            if (!world) return;

            const alive = world.castles.filter((castle) => castle.hp > 0);

            if (alive.length <= 1) {
                  setMessage("전투가 끝났습니다. 맵 초기화로 다시 시작하세요.");
                  return;
            }

            world.running = !world.running;
            syncStatus(world);
            setMessage(
                  world.running
                        ? "적 성을 클릭하면 파란 왕국의 병사 최대 6명이 출격합니다."
                        : "일시정지했습니다. 맵과 왕국 배치를 살펴보세요.",
            );
      }

      function attack(target: Team) {
            const world = worldRef.current;

            if (!world) return;

            world.selected = target;

            if (target === 0) {
                  setMessage("청람 왕국이 내 왕국입니다. 다른 왕국의 성을 선택하세요.");
            } else if (!world.running) {
                  setMessage(`${KINGDOMS[target].name} 선택. 전투 시작 후 출격할 수 있습니다.`);
            } else if (dispatch(world, 0, target)) {
                  setMessage(`${KINGDOMS[target].name}으로 병력을 보냈습니다.`);
            } else {
                  setMessage("출격할 병력이 없거나 성이 이미 함락되었습니다.");
            }

            syncStatus(world);
      }

      function restart() {
            const world = makeWorld();

            worldRef.current = world;
            syncStatus(world);
            setMessage("맵을 초기화했습니다. 전투 시작을 눌러주세요.");
      }

      const selectedCastle = status.castles[status.selected];

      return (
            <main className={styles.page}>
                  <header className={styles.topbar}>
                        <div className={styles.title}>
                              <span className={styles.stage}>MAP 01</span>
                              <strong>네 왕국의 교차로</strong>
                              <span className={styles.subtitle}>MONARCH · FIELD TEST</span>
                        </div>

                        <Link href="/" className={styles.back}>
                              메인으로
                        </Link>
                  </header>

                  <section className={styles.battlefield}>
                        <div className={styles.mapLabel}>
                              <span className={styles.liveDot} />
                              {status.running ? "전투 진행 중" : "일시정지"}
                              <span className={styles.time}>
                                    {Math.floor(status.time / 60).toString().padStart(2, "0")}
                                    :
                                    {Math.floor(status.time % 60).toString().padStart(2, "0")}
                              </span>
                        </div>

                        <canvas
                              ref={canvasRef}
                              width={WIDTH}
                              height={HEIGHT}
                              className={styles.canvas}
                              aria-label="물길과 다리로 연결된 네 왕국의 전장. 아래 왕국 버튼으로도 공격 대상을 선택할 수 있습니다."
                              onClick={(event) => {
                                    const rect = event.currentTarget.getBoundingClientRect();
                                    const x = (event.clientX - rect.left) / rect.width * WIDTH;
                                    const y = (event.clientY - rect.top) / rect.height * HEIGHT;
                                    const world = worldRef.current;

                                    if (!world) return;

                                    const castle = world.castles.find((item) => {
                                          const p = project(item.x, item.y);

                                          return (
                                                Math.abs(p.x - x) < 42 &&
                                                y > p.y - 65 &&
                                                y < p.y + 55
                                          );
                                    });

                                    if (castle) attack(castle.team);
                              }}
                        />

                        <div className={styles.mapCaption}>
                              <strong>THE FOUR KINGDOMS</strong>
                              <span>성 4개 · 연결 교량 · 중앙 섬</span>
                        </div>
                  </section>

                  <section className={styles.controlPanel}>
                        <div className={styles.kingdoms}>
                              {KINGDOMS.map((kingdom, index) => {
                                    const team = index as Team;
                                    const castle = status.castles[team];

                                    return (
                                          <button
                                                key={kingdom.name}
                                                type="button"
                                                className={[
                                                      styles.kingdom,
                                                      status.selected === team ? styles.selected : "",
                                                ].join(" ")}
                                                onClick={() => attack(team)}
                                                aria-pressed={status.selected === team}
                                          >
                                                <span
                                                      className={styles.banner}
                                                      style={{ backgroundColor: kingdom.color }}
                                                />
                                                <span className={styles.kingdomInfo}>
                                                      <strong>
                                                            {kingdom.name}
                                                            {team === 0 ? " · 나" : ""}
                                                      </strong>
                                                      <small>
                                                            {castle && castle.hp <= 0
                                                                  ? "함락"
                                                                  : `성 ${castle?.hp ?? 100} · 대기 ${castle?.reserve ?? 12}`}
                                                      </small>
                                                </span>
                                          </button>
                                    );
                              })}
                        </div>

                        <div className={styles.commandRow}>
                              <div className={styles.message}>
                                    <strong>
                                          선택 대상 · {KINGDOMS[status.selected].name}
                                          {selectedCastle?.hp === 0 ? " / 함락" : ""}
                                    </strong>
                                    <p aria-live="polite">{message}</p>
                              </div>

                              <div className={styles.buttons}>
                                    <button
                                          type="button"
                                          className={styles.resetButton}
                                          onClick={restart}
                                    >
                                          맵 초기화
                                    </button>
                                    <button
                                          type="button"
                                          className={styles.playButton}
                                          onClick={toggleRunning}
                                    >
                                          {status.running ? "Ⅱ 일시정지" : "▶ 전투 시작"}
                                    </button>
                              </div>
                        </div>
                  </section>
            </main>
      );
}