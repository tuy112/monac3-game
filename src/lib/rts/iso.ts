export const TILE_W = 72;
export const TILE_H = 36;

export function isoLeft(x: number, y: number, gridHeight: number): number {
      // gridHeight-1 만큼 우측으로 밀어서 좌표가 음수로 안 나가게 함
      return (x - y + (gridHeight - 1)) * (TILE_W / 2);
}

export function isoTop(x: number, y: number): number {
      return (x + y) * (TILE_H / 2);
}

export function boardPixelSize(gridWidth: number, gridHeight: number) {
      return {
            width: (gridWidth + gridHeight - 1) * (TILE_W / 2),
            height: (gridWidth + gridHeight - 1) * (TILE_H / 2) + TILE_H,
      };
}

/** 화면(월드 스페이스) 좌표 -> 가장 가까운 타일 좌표 역변환 */
export function screenToTile(px: number, py: number, gridWidth: number, gridHeight: number) {
      const adjLeft = px - (gridHeight - 1) * (TILE_W / 2);
      const a = adjLeft / (TILE_W / 2); // x - y
      const b = py / (TILE_H / 2); // x + y
      const x = Math.round((a + b) / 2);
      const y = Math.round((b - a) / 2);
      return {
            x: Math.min(gridWidth - 1, Math.max(0, x)),
            y: Math.min(gridHeight - 1, Math.max(0, y)),
      };
}