import { config } from "dotenv";
config({ path: ".env.local" });

// Dynamic imports below are deliberate: these modules read process.env at
// module-load time (via src/lib/db/client.ts), and static `import` statements
// are hoisted above the `config()` call above, which would read the env vars
// too early otherwise.

const SAMPLE_TICKERS = ["META", "MELI", "AMZN"];

async function main() {
  const { getLiveCclRate } = await import("../src/lib/prices/ccl-live");
  const { getHistoricalCclRate } = await import("../src/lib/prices/ccl-historical");
  const { getAllCedearPricesArs } = await import("../src/lib/prices/cedear-price");
  const { getUsStockPriceUsd } = await import("../src/lib/prices/stock-price");

  console.log("1) CCL en vivo (dolarapi.com)...");
  console.log("   ->", await getLiveCclRate());

  console.log("2) CCL histórico (argentinadatos.com, hace 30 días)...");
  const past = new Date();
  past.setDate(past.getDate() - 30);
  const isoDate = past.toISOString().slice(0, 10);
  console.log(`   -> (${isoDate})`, await getHistoricalCclRate(isoDate));

  console.log("3) Precios de CEDEARs en ARS (data912.com)...");
  const cedears = await getAllCedearPricesArs();
  for (const ticker of SAMPLE_TICKERS) {
    console.log(`   -> ${ticker}:`, cedears[ticker]);
  }

  console.log("4) Precio de la acción real en USD (Yahoo Finance)...");
  for (const ticker of SAMPLE_TICKERS) {
    console.log(`   -> ${ticker}:`, await getUsStockPriceUsd(ticker));
  }

  console.log("5) Confirmando que Yahoo Finance rechaza sin User-Agent de navegador...");
  const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/META", { cache: "no-store" });
  console.log(`   -> status sin User-Agent: ${res.status} (se espera 429)`);

  console.log("\nTodo OK.");
}

main().catch((err) => {
  console.error("Falló el chequeo:", err);
  process.exit(1);
});
