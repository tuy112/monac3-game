export type Terrain = "plain" | "forest" | "water" | "bridge" | "mountain";
export type FactionId = "player" | "enemy";

export interface TileState {
    x: number;
    y: number;
    terrain: Terrain;
    owner: FactionId | null;
    isCastle?: FactionId;
}

export interface TroopGroup {
    id: string;
    faction: FactionId;
    isKing: boolean;
    count: number;
    x: number;
    y: number;
    targetX: number | null;
    targetY: number | null;
    moveProgress: number;
    inCombat: boolean;
}

export interface KingdomState {
    id: FactionId;
    castleX: number;
    castleY: number;
    gold: number;
    taxRate: number;
    wallHp: number;
    maxWallHp: number;
    defeated: boolean;
}

export interface GameState {
    tick: number;
    gridWidth: number;
    gridHeight: number;
    tiles: TileState[];
    troops: TroopGroup[];
    kingdoms: Record<FactionId, KingdomState>;
    status: "playing" | "victory" | "defeat";
    log: string[];
}