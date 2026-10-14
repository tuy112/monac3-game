import { Stage } from "@/src/types/stage";

export interface SaveData {
      stages: Stage[];
      updatedAt: number;
}

const STORAGE_KEY = "monarch-save-v1";

export function hasLocalSave(): boolean {
      if (typeof window === "undefined") {
            return false;
      }
      return localStorage.getItem(STORAGE_KEY) !== null;
}

export function saveToLocal(stages: Stage[]): void {
      if (typeof window === "undefined") {
            return;
      }

      const data: SaveData = { stages, updatedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadFromLocal(): SaveData | null {
      if (typeof window === "undefined") {
            return null;
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
            return null;
      }
      try {
            return JSON.parse(raw) as SaveData;
      } catch {
            return null;
      }
}

export function clearLocal(): void {
      if (typeof window === "undefined") {
            return;
      }
      localStorage.removeItem(STORAGE_KEY);
}

export async function saveToServer(stages: Stage[]): Promise<boolean> {
      try {
            const res = await fetch("/api/save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ stages, updatedAt: Date.now() }),
            });
            return res.ok;
      } catch {
            return false;
      }
}

export async function loadFromServer(): Promise<SaveData | null> {
      try {
            const res = await fetch("/api/save");
            if (!res.ok) {
                  return null;
            }
            return (await res.json()) as SaveData | null;
      } catch {
            return null;
      }
}