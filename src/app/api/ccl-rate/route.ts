import { NextResponse } from "next/server";
import { getLiveCclRate } from "@/lib/prices/ccl-live";
import { getHistoricalCclRate } from "@/lib/prices/ccl-historical";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Parámetro 'date' inválido (esperado YYYY-MM-DD)." }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    const rate = date === today ? await getLiveCclRate() : await getHistoricalCclRate(date);
    return NextResponse.json({ rate });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
