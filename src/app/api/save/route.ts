import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

const SAVE_FILE = path.join(process.cwd(), ".data", "save.json");

async function ensureDir() {
      const dir = path.dirname(SAVE_FILE);
      await fs.mkdir(dir, { recursive: true });
}

export async function GET() {
      try {
            const raw = await fs.readFile(SAVE_FILE, "utf-8");
            return NextResponse.json(JSON.parse(raw));
      } catch {
            return NextResponse.json(null);
      }
}

export async function POST(req: NextRequest) {
      try {
            const body = await req.json();
            await ensureDir();
            await fs.writeFile(SAVE_FILE, JSON.stringify(body, null, 2), "utf-8");
            return NextResponse.json({ ok: true });
      } catch {
            return NextResponse.json({ ok: false }, { status: 500 });
      }
}