import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { notInArray, sql } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const RESET = process.argv.includes("--reset");

if (!process.env.DIRECT_URL) throw new Error("DIRECT_URL is not set");
const client = postgres(process.env.DIRECT_URL);
const db = drizzle(client, { schema });

const CATEGORIES: { name: string; emoji: string; sort: number }[] = [
  { name: "Supermercado", emoji: "🛒", sort: 10 },
  { name: "Gastronomía", emoji: "🍔", sort: 20 },
  { name: "Transporte público", emoji: "🚌", sort: 30 },
  { name: "Transporte vehículo", emoji: "🚗", sort: 31 },
  { name: "Servicios", emoji: "💡", sort: 40 },
  { name: "Suscripciones", emoji: "📺", sort: 50 },
  { name: "Salud", emoji: "💊", sort: 60 },
  { name: "Indumentaria", emoji: "👕", sort: 70 },
  { name: "Hogar", emoji: "🏠", sort: 80 },
  { name: "Tecnología", emoji: "💻", sort: 90 },
  { name: "Entretenimiento", emoji: "🎬", sort: 95 },
  { name: "Viajes", emoji: "✈️", sort: 100 },
  { name: "Impuestos", emoji: "🧾", sort: 110 },
  { name: "Pagos", emoji: "💵", sort: 120 },
  { name: "Otros", emoji: "🏷️", sort: 130 },
];

const RULES: { pattern: string; category: string; priority: number }[] = [
  // Supermercado
  ...["coto", "carrefour", "jumbo", "disco", "vea ", "la anonima", "walmart", "makro", "dinosaurio", "supermercado", "chango mas", "dia%"].map(
    (p) => ({ pattern: p, category: "Supermercado", priority: 10 })
  ),
  // Gastronomía
  ...["rappi", "pedidosya", "pedidos ya", "mcdonald", "mc donald", "burger king", "mostaza", "starbucks", "havanna", "restaurant", "resto", "cerveceria", "heladeria", "grido", "kentucky", "cafe ", "confiteria",
      "trattoria", "grill", "parrilla", "pizza", "rustica",
      // comercios reales del usuario
      "fauno", "cascara", "cottacafe", "otaku", "sushi", "big pons", "el buen libro", "rapanui", "comida por peso", "lima 1", "independencia 2"].map(
    (p) => ({ pattern: p, category: "Gastronomía", priority: 10 })
  ),
  // Transporte público (masivo: subte, colectivo, tren, SUBE)
  ...["sube", "subte", "emova", "colectivo", "tren", "metrovias", "trenes argentinos", "ferrocarril", "premetro"].map(
    (p) => ({ pattern: p, category: "Transporte público", priority: 10 })
  ),
  // Transporte vehículo (auto propio / apps: ride-hailing, combustible, peajes, estacionamiento)
  ...["uber", "cabify", "didi", "ypf", "shell", "axion", "gulf", "peaje", "ausa", "aubasa", "estacion de servicio", "estacionamiento", "cochera", "parking", "playa de estac"].map(
    (p) => ({ pattern: p, category: "Transporte vehículo", priority: 10 })
  ),
  { pattern: "puma energy", category: "Transporte vehículo", priority: 25 }, // combustible; beats the "puma"→Indumentaria rule
  // Servicios
  ...["edenor", "edesur", "metrogas", "aysa", "naturgy", "telecom", "movistar", "personal ", "claro", "flow", "telecentro", "fibertel", "directv", "supercanal"].map(
    (p) => ({ pattern: p, category: "Servicios", priority: 10 })
  ),
  // Suscripciones
  ...["netflix", "spotify", "disney", "hbo", "youtube", "prime video", "apple.com/bill", "icloud", "openai", "chatgpt", "canva", "notion", "google one", "google storage",
      "anthropic", "claude", "crunchyroll", "linkedin"].map(
    (p) => ({ pattern: p, category: "Suscripciones", priority: 20 })
  ),
  // Salud
  ...["farmacity", "farmacia", "hospital", "clinica", "sanatorio", "osde", "swiss medical", "galeno", "medife", "medicus", "laboratorio", "optica"].map(
    (p) => ({ pattern: p, category: "Salud", priority: 10 })
  ),
  // Indumentaria
  ...["zara", "adidas", "nike", "dexter", "stock center", "cheeky", "mimo", "prune", "montagne", "kevingston", "puma", "pumasports", "juleriaque", "calzados", "zapatos"].map(
    (p) => ({ pattern: p, category: "Indumentaria", priority: 10 })
  ),
  // Entretenimiento
  ...["hillside", "cinemaposters", "passline", "cinema", "cinepolis", "showcase", "teatro", "ticketek", "movistar arena"].map(
    (p) => ({ pattern: p, category: "Entretenimiento", priority: 12 })
  ),
  // Hogar
  ...["easy ", "sodimac", "hipertehuelche", "ferreteria", "sanitarios", "sofa"].map((p) => ({ pattern: p, category: "Hogar", priority: 10 })),
  // Tecnología
  ...["mercado libre", "mercadolibre", "fravega", "garbarino", "musimundo", "compumundo", "apple store", "samsung", "steam", "playstation"].map(
    (p) => ({ pattern: p, category: "Tecnología", priority: 10 })
  ),
  // Viajes
  ...["despegar", "booking", "airbnb", "latam", "aerolineas", "flybondi", "jetsmart", "hotel", "turismo"].map(
    (p) => ({ pattern: p, category: "Viajes", priority: 15 })
  ),
  // Impuestos / comisiones / seguros (kind usually catches these, but merchant hints help)
  ...["percepcion", "impuesto", "seguro", "ley 27", "iibb", "sellos", "derecho emision", "comision", "mantenimiento", "iva rg"].map(
    (p) => ({ pattern: p, category: "Impuestos", priority: 5 })
  ),
];

async function main() {
  for (const c of CATEGORIES) {
    await db
      .insert(schema.expenseCategories)
      .values(c)
      .onConflictDoUpdate({ target: schema.expenseCategories.name, set: { emoji: c.emoji, sort: c.sort } });
  }
  if (RESET) {
    // Drop categories no longer in the canonical list (e.g. the old "Transporte"
    // after splitting it into público/vehículo). No FK on expenses.category, so
    // this is safe once the statements are reloaded onto the new names.
    await db.delete(schema.expenseCategories).where(notInArray(schema.expenseCategories.name, CATEGORIES.map((c) => c.name)));
  }
  console.log(`Categorías: ${CATEGORIES.length} aseguradas.`);

  const existingRules = await db.select({ id: schema.categoryRules.id }).from(schema.categoryRules).limit(1);
  if (existingRules.length > 0 && !RESET) {
    console.log("Reglas ya existen (usá --reset para reemplazar).");
  } else {
    if (RESET) await db.execute(sql`TRUNCATE TABLE ${schema.categoryRules}`);
    await db.insert(schema.categoryRules).values(RULES);
    console.log(`Reglas: ${RULES.length} insertadas.`);
  }

  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
