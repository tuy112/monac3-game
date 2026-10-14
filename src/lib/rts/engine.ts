import { GameState, TroopGroup, FactionId, Terrain } from "@/src/types/kingdom";

const COMBAT_K = 0.11;
const CAPTURE_COST = 0.6;
const TILE_PRODUCTION_INTERVAL = 18;
const TILE_PRODUCTION_AMOUNT = 2;
const TILE_PRODUCTION_CHANCE = 0.55;
const CASTLE_PRODUCTION_INTERVAL = 10;
const CASTLE_PRODUCTION_AMOUNT = 6;
const WALL_REGEN = 0.4;
const WALL_DAMAGE_PER_TROOP = 0.05;
const AI_ORDER_INTERVAL = 12;
const GRAVITY_RADIUS = 3;
const ASSAULT_MARGIN = 1.4;
const EARLY_GAME_TICKS = 50;
const EARLY_GAME_RADIUS = 3;

function dist(ax: number, ay: number, bx: number, by: number) {
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function tileAt(state: GameState, x: number, y: number) {
    return state.tiles[y * state.gridWidth + x];
}

function terrainCost(terrain: Terrain): number {
    return terrain === "forest" ? 2 : 1;
}

function isBlockedTerrain(terrain: Terrain): boolean {
    return terrain === "water" || terrain === "mountain";
}

function opponent(f: FactionId): FactionId {
    return f === "player" ? "enemy" : "player";
}

function hashSeed(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
}

function stepGroupToward(
    state: GameState,
    g: TroopGroup,
    tx: number,
    ty: number,
    blockedBy: (x: number, y: number) => boolean
): TroopGroup {
    if (g.x === tx && g.y === ty) return g;
    const dx = tx - g.x;
    const dy = ty - g.y;
    const tryOrder: [number, number][] =
        Math.abs(dx) >= Math.abs(dy)
            ? [[Math.sign(dx), 0], [0, Math.sign(dy)]]
            : [[0, Math.sign(dy)], [Math.sign(dx), 0]];

    let progress = g.moveProgress + 1;
    let nx = g.x;
    let ny = g.y;

    for (const [mx, my] of tryOrder) {
        if (mx === 0 && my === 0) continue;
        const cx = g.x + mx;
        const cy = g.y + my;
        if (cx < 0 || cy < 0 || cx >= state.gridWidth || cy >= state.gridHeight) continue;
        const tile = tileAt(state, cx, cy);
        if (isBlockedTerrain(tile.terrain)) continue;
        if (blockedBy(cx, cy)) continue;
        const cost = terrainCost(tile.terrain);
        if (progress >= cost) {
            nx = cx;
            ny = cy;
            progress = 0;
        }
        break;
    }

    return { ...g, x: nx, y: ny, moveProgress: progress };
}

function resolveMovement(state: GameState, troops: TroopGroup[]): TroopGroup[] {
    return troops.map((g) => {
        if (g.isKing || g.targetX === null || g.targetY === null) return g;
        if (g.x === g.targetX && g.y === g.targetY) {
            return { ...g, targetX: null, targetY: null, moveProgress: 0 };
        }
        const blockedBy = (x: number, y: number) =>
            troops.some(
                (o) => o.id !== g.id && o.faction !== g.faction && !o.isKing && o.count > 0 && o.x === x && o.y === y
            );
        return stepGroupToward(state, g, g.targetX, g.targetY, blockedBy);
    });
}

/**
 * 자기 세력이 아닌 가까운 타일들(중립 우선) 중에서 유닛마다 다른 후보를 골라 분산시킨다.
 * 성벽보다 확실히 강할 때만 성 자체를 노림.
 */
function decideExpansionTarget(
    state: GameState,
    faction: FactionId,
    fromX: number,
    fromY: number,
    count: number,
    seedKey: string
) {
    const oppo = opponent(faction);
    const oppKingdom = state.kingdoms[oppo];
    const isEarly = state.tick < EARLY_GAME_TICKS;

    const strongEnough = !isEarly && count >= oppKingdom.wallHp * ASSAULT_MARGIN + 12;
    if (strongEnough) {
        return { x: oppKingdom.castleX, y: oppKingdom.castleY };
    }

    const maxRadius = isEarly ? EARLY_GAME_RADIUS : Infinity;
    const candidates: { x: number; y: number; d: number }[] = [];
    for (const t of state.tiles) {
        if (isBlockedTerrain(t.terrain) || t.owner === faction) continue;
        if (t.isCastle) continue;
        const d = dist(fromX, fromY, t.x, t.y);
        if (d > maxRadius) continue;
        candidates.push({ x: t.x, y: t.y, d });
    }
    if (candidates.length === 0 && isEarly) {
        for (const t of state.tiles) {
            if (isBlockedTerrain(t.terrain) || t.owner === faction || t.isCastle) continue;
            candidates.push({ x: t.x, y: t.y, d: dist(fromX, fromY, t.x, t.y) });
        }
    }
    if (candidates.length === 0) {
        return { x: oppKingdom.castleX, y: oppKingdom.castleY };
    }

    candidates.sort((a, b) => a.d - b.d);
    const pool = candidates.slice(0, Math.min(6, candidates.length));
    const pick = pool[hashSeed(seedKey) % pool.length];
    return { x: pick.x, y: pick.y };
}

function applyGravity(state: GameState, troops: TroopGroup[]): TroopGroup[] {
    return troops.map((g) => {
        if (g.isKing || g.count <= 0 || g.targetX !== null) return g;

        const blockedBy = (x: number, y: number) =>
            troops.some(
                (o) => o.id !== g.id && o.faction !== g.faction && !o.isKing && o.count > 0 && o.x === x && o.y === y
            );

        let best: TroopGroup | null = null;
        for (const o of troops) {
            if (o.id === g.id || o.faction !== g.faction || o.isKing || o.count <= 0) continue;
            if (o.count <= g.count) continue;
            const d = dist(g.x, g.y, o.x, o.y);
            if (d === 0 || d > GRAVITY_RADIUS) continue;
            if (!best || o.count > best.count) best = o;
        }
        if (best) return stepGroupToward(state, g, best.x, best.y, blockedBy);

        const frontier = decideExpansionTarget(state, g.faction, g.x, g.y, g.count, g.id);
        if (frontier.x === g.x && frontier.y === g.y) return g;
        return stepGroupToward(state, g, frontier.x, frontier.y, blockedBy);
    });
}

function resolveCombat(state: GameState): { troops: TroopGroup[]; log: string[] } {
    const logs: string[] = [];
    const troops = state.troops.map((t) => ({ ...t, inCombat: false }));
    const damage = new Map<string, number>();

    for (const g of troops) {
        if (g.count <= 0 || g.isKing) continue;
        const enemies = troops.filter(
            (o) => o.faction !== g.faction && o.count > 0 && !o.isKing && dist(g.x, g.y, o.x, o.y) <= 1
        );
        if (enemies.length === 0) continue;
        g.inCombat = true;
        const enemyTotal = enemies.reduce((sum, e) => sum + e.count, 0);
        damage.set(g.id, (damage.get(g.id) ?? 0) + COMBAT_K * enemyTotal);
        for (const e of enemies) {
            e.inCombat = true;
            const share = e.count / enemyTotal;
            damage.set(e.id, (damage.get(e.id) ?? 0) + COMBAT_K * g.count * share);
        }
    }

    if (damage.size > 0) logs.push("교전 발생!");

    const survivors = troops
        .map((g) => {
            const loss = damage.get(g.id) ?? 0;
            return { ...g, count: g.isKing ? g.count : Math.max(0, Math.round(g.count - loss)) };
        })
        .filter((g) => g.count > 0);

    return { troops: survivors, log: logs };
}

function mergeGroups(troops: TroopGroup[]): TroopGroup[] {
    const result: TroopGroup[] = [];
    const seen = new Map<string, TroopGroup>();
    for (const g of troops) {
        if (g.isKing) {
            result.push(g);
            continue;
        }
        const moveKey = g.targetX === null ? "idle" : `to:${g.targetX},${g.targetY}`;
        const key = `${g.faction}-${g.x}-${g.y}-${moveKey}`;
        const existing = seen.get(key);
        if (existing) {
            existing.count += g.count;
            existing.inCombat = existing.inCombat || g.inCombat;
        } else {
            const copy = { ...g };
            seen.set(key, copy);
            result.push(copy);
        }
    }
    return result;
}

function spawnOrGrow(troops: TroopGroup[], faction: FactionId, x: number, y: number, amount: number): TroopGroup[] {
    const idx = troops.findIndex(
        (t) => t.faction === faction && !t.isKing && t.x === x && t.y === y && t.targetX === null
    );
    if (idx >= 0) {
        const copy = [...troops];
        copy[idx] = { ...copy[idx], count: copy[idx].count + amount };
        return copy;
    }
    return [
        ...troops,
        {
            id: `${faction}-t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            faction,
            isKing: false,
            count: amount,
            x,
            y,
            targetX: null,
            targetY: null,
            moveProgress: 0,
            inCombat: false,
        },
    ];
}

function productionStep(state: GameState, troops: TroopGroup[]) {
    let next = [...troops];
    const kingdoms = {
        player: { ...state.kingdoms.player },
        enemy: { ...state.kingdoms.enemy },
    };

    for (const faction of ["player", "enemy"] as FactionId[]) {
        const k = kingdoms[faction];
        if (k.defeated) continue;

        if (state.tick % CASTLE_PRODUCTION_INTERVAL === 0) {
            next = spawnOrGrow(next, faction, k.castleX, k.castleY, CASTLE_PRODUCTION_AMOUNT);
        }

        if (state.tick % TILE_PRODUCTION_INTERVAL === 0) {
            const ownedVillages = state.tiles.filter(
                (t) => t.owner === faction && !t.isCastle && !isBlockedTerrain(t.terrain)
            );
            for (const t of ownedVillages) {
                if (Math.random() < TILE_PRODUCTION_CHANCE) {
                    next = spawnOrGrow(next, faction, t.x, t.y, TILE_PRODUCTION_AMOUNT);
                }
            }
        }

        const ownedCount = state.tiles.filter((t) => t.owner === faction).length;
        k.gold += (ownedCount * k.taxRate) / 300;
    }

    return { troops: next, kingdoms };
}

function wallStep(kingdoms: GameState["kingdoms"], troops: TroopGroup[]): GameState["kingdoms"] {
    const next = {
        player: { ...kingdoms.player },
        enemy: { ...kingdoms.enemy },
    };
    for (const faction of ["player", "enemy"] as FactionId[]) {
        const k = next[faction];
        if (k.defeated) continue;
        const besiegers = troops.filter(
            (t) => t.faction !== faction && t.count > 0 && t.x === k.castleX && t.y === k.castleY
        );
        if (besiegers.length > 0) {
            const total = besiegers.reduce((s, t) => s + t.count, 0);
            k.wallHp = Math.max(0, k.wallHp - total * WALL_DAMAGE_PER_TROOP);
        } else {
            k.wallHp = Math.min(k.maxWallHp, k.wallHp + WALL_REGEN);
        }
    }
    return next;
}

function captureTiles(state: GameState, troops: TroopGroup[]): GameState {
    const tiles = state.tiles.map((t) => ({ ...t }));
    let status = state.status;
    const kingdoms = {
        player: { ...state.kingdoms.player },
        enemy: { ...state.kingdoms.enemy },
    };
    const logs: string[] = [];
    const troopMap = new Map(troops.map((t) => [t.id, { ...t }]));

    for (const g of troops) {
        if (g.count <= 0) continue;
        const tile = tiles[g.y * state.gridWidth + g.x];
        const enemyHere = troops.some(
            (o) => o.faction !== g.faction && !o.isKing && o.count > 0 && o.x === g.x && o.y === g.y
        );
        if (enemyHere) continue;
        if (tile.owner === g.faction) continue;

        if (tile.isCastle && tile.isCastle !== g.faction) {
            const defenderFaction = tile.isCastle;
            if (kingdoms[defenderFaction].wallHp > 0) continue;
            tile.owner = g.faction;
            kingdoms[defenderFaction].defeated = true;
            status = g.faction === "player" ? "victory" : "defeat";
            logs.push(
                g.faction === "player" ? "성벽이 무너지고 적왕이 항복했다!" : "우리 성벽이 무너지고 말았다..."
            );
            continue;
        }

        tile.owner = g.faction;
        if (!g.isKing) {
            const unit = troopMap.get(g.id);
            if (unit) unit.count = Math.max(0, unit.count - CAPTURE_COST);
        }
    }

    const updatedTroops = Array.from(troopMap.values()).filter((t) => t.count > 0);
    return { ...state, tiles, kingdoms, status, troops: updatedTroops, log: [...logs, ...state.log].slice(0, 6) };
}

function runAi(state: GameState, troops: TroopGroup[]): TroopGroup[] {
    if (state.tick % AI_ORDER_INTERVAL !== 0) return troops;
    return troops.map((g) => {
        if (g.faction !== "enemy" || g.isKing || g.targetX !== null) return g;
        const target = decideExpansionTarget(state, "enemy", g.x, g.y, g.count, g.id);
        return { ...g, targetX: target.x, targetY: target.y };
    });
}

export function tickEngine(state: GameState): GameState {
    if (state.status !== "playing") return state;

    let troops = resolveMovement(state, state.troops);
    troops = applyGravity(state, troops);

    const combatResult = resolveCombat({ ...state, troops });
    troops = mergeGroups(combatResult.troops);
    troops = runAi(state, troops);

    const production = productionStep(state, troops);
    troops = production.troops;
    const kingdomsAfterWall = wallStep(production.kingdoms, troops);

    let next: GameState = {
        ...state,
        tick: state.tick + 1,
        troops,
        kingdoms: kingdomsAfterWall,
        log: combatResult.log.length > 0 ? [...combatResult.log, ...state.log].slice(0, 6) : state.log,
    };

    next = captureTiles(next, troops);
    return next;
}

export function issueOrder(state: GameState, groupId: string, x: number, y: number): GameState {
    return {
        ...state,
        troops: state.troops.map((g) => (g.isKing ? g : g.id === groupId ? { ...g, targetX: x, targetY: y } : g)),
    };
}

export function setTaxRate(state: GameState, faction: FactionId, rate: number): GameState {
    return {
        ...state,
        kingdoms: { ...state.kingdoms, [faction]: { ...state.kingdoms[faction], taxRate: rate } },
    };
}