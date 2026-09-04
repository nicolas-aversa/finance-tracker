/**
 * The canonical spend categories and auto-categorization rules.
 *
 * Each user gets their own copy at sign-up and edits it freely from there, so
 * one person renaming a category doesn't move it for everybody. This module is
 * the single source both the seed script and the sign-up flow read from — the
 * lists used to live only inside the script, where the app couldn't reach them.
 */

export type DefaultCategory = { name: string; emoji: string; sort: number };
export type DefaultRule = { pattern: string; category: string; priority: number };

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Supermercado", emoji: "🛒", sort: 10 },
  { name: "Gastronomía", emoji: "🍔", sort: 20 },
  { name: "Transporte público", emoji: "🚌", sort: 30 },
  { name: "Transporte vehículo", emoji: "🚗", sort: 31 },
  { name: "Servicios", emoji: "💡", sort: 40 },
  { name: "Suscripciones", emoji: "📺", sort: 50 },
  { name: "Farmacia", emoji: "💊", sort: 60 },
  { name: "Indumentaria", emoji: "👕", sort: 70 },
  { name: "Hogar", emoji: "🏠", sort: 80 },
  { name: "Tecnología", emoji: "💻", sort: 90 },
  { name: "Librería", emoji: "📚", sort: 92 },
  { name: "Entretenimiento", emoji: "🎬", sort: 95 },
  { name: "Viajes", emoji: "✈️", sort: 100 },
  { name: "Inversiones", emoji: "📈", sort: 105 },
  { name: "Impuestos", emoji: "🧾", sort: 110 },
  { name: "Pagos", emoji: "💵", sort: 120 },
  { name: "Otros", emoji: "🏷️", sort: 130 },
];

export const DEFAULT_RULES: DefaultRule[] = [
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
  // Farmacia — salud y también perfumería/cosmética, que se compran en el mismo lugar
  ...["farmacity", "farmacia", "hospital", "clinica", "sanatorio", "osde", "swiss medical", "galeno", "medife", "medicus", "laboratorio", "optica",
      "perfum", "juleriaque", "fragancia", "essenza", "sephora", "the body shop", "lush", "maquillaje", "cosmetica", "cosmeticos", "isadora", "avon", "natura cosmeticos", "get the look", "unifungi"].map(
    (p) => ({ pattern: p, category: "Farmacia", priority: 10 })
  ),
  // Inversiones — brokers y agentes de bolsa
  ...["ecovalores", "ecovaloressa", "balanz", "iol invertironline", "bull market", "cocos capital"].map(
    (p) => ({ pattern: p, category: "Inversiones", priority: 20 })
  ),
  // Librería
  ...["kel ediciones", "libreria", "cuspide", "yenny", "el ateneo"].map(
    (p) => ({ pattern: p, category: "Librería", priority: 20 })
  ),
  // Indumentaria — "juleriaque" salió de acá: es perfumería, va a Farmacia
  ...["zara", "adidas", "nike", "dexter", "stock center", "cheeky", "mimo", "prune", "montagne", "kevingston", "puma", "pumasports", "calzados", "zapatos"].map(
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
