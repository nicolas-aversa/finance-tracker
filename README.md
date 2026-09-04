# CEDEAR Tracker

App personal de finanzas, en dos secciones:

- **Inversiones** — cartera de CEDEARs: posiciones, resultado realizado y no realizado, TWR, XIRR, comparativa contra el S&P 500 y distribución por ticker. Precios y CCL en vivo, con caché en base y overrides manuales.
- **Gastos** — se suben los PDF de los resúmenes de tarjeta y se parsean automáticamente. Resumen por mes, categorización, cuotas activas, filtros y orden sobre los movimientos, detalle por categoría y presupuestos mensuales.

Mobile-first y multi-usuario: cada persona tiene su cuenta y ve solo sus datos.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Drizzle ORM · Postgres (Supabase) · Vitest · desplegada en Vercel.

## Setup

```bash
npm install
cp .env.example .env.local   # completar las 4 variables
npm run db:migrate           # crea el schema
npm run seed                 # opcional: categorías y reglas por defecto
npm run dev
```

### Variables de entorno

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Postgres de Supabase vía **transaction pooler** (puerto 6543). Lo usa la app en runtime. |
| `DIRECT_URL` | Conexión **directa** (puerto 5432). Solo para migraciones y el seed. |
| `INVITE_CODE` | Código que hay que poner para crear una cuenta. Sin él, el registro está cerrado. |
| `AUTH_SECRET` | Secreto de 32+ bytes para firmar la cookie de sesión. Generar con:<br>`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

Si el proyecto está linkeado a Vercel, `npx vercel env pull .env.local` las trae. **Ojo**: hoy solo existen en el environment *Production*, así que eso baja credenciales de la base real — para desarrollo conviene una branch de Supabase.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Tests (Vitest) — funciones puras de dominio |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run db:generate` | Genera una migración a partir de los cambios en `schema.ts` |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run seed -- --user <email>` | Carga transacciones de ejemplo para ese usuario |
| `npm run seed:categories -- --user <email>` | Carga categorías y reglas de categorización |
| `npm run user:set-password -- --email <email> --password "..."` | Fija o resetea la contraseña de una cuenta |
| `npm run check-prices` | Chequeo manual de las fuentes de precios |

## Estructura

```
src/
  app/(app)/          páginas autenticadas (dashboard, gastos) + server actions
  app/login/          login por email
  app/signup/         alta con codigo de invitacion
  components/         UI; components/expenses/ es la sección de gastos
  lib/domain/         matemática de cartera: posiciones, TWR, XIRR, benchmark
  lib/expenses/       dominio de gastos: agregación, filtros, presupuestos, parsers
  lib/db/             schema de Drizzle y repositorios
  lib/prices/         precios de CEDEARs, acciones y CCL, con caché
drizzle/              migraciones SQL versionadas
samples/              PDFs reales de ejemplo, usados por los tests de parsers
```

### Conceptos que conviene conocer

- **Mes de facturación** (`billingMonth`): los resúmenes cierran en días distintos según el emisor, así que todo se agrupa por *(fecha de cierre − 15 días)*. Eso alinea Galicia, Amex, Naranja y MercadoPago sobre el mismo eje mensual. Una cuota comprada en 2025 pero facturada en julio 2026 cuenta en julio.
- **Pagos ≠ gastos**: los movimientos con `kind === "payment"` (pagar el resumen) se excluyen de todo total de gasto — es la regla que centraliza `isSpend`.
- **Todo en ARS-equivalente**: los consumos en dólares se convierten al CCL para poder sumarlos y compararlos. Los totales muestran ambas monedas por separado.
- **Filtros en la URL**: la sección de gastos no usa estado de cliente. Los filtros viven en el querystring, se parsean en el server con `parseExpenseFilters` y se aplican con funciones puras. Cada vista es compartible y funciona sin JS.
- **Presupuestos recurrentes**: un límite mensual por categoría, que se repite todos los meses (no hay override por mes).
- **Un usuario por cuenta**: todas las tablas de datos llevan `user_id` y toda consulta filtra por él. Ese filtro es el límite de privacidad de la app, y `src/lib/db/__tests__/user-scoping.test.ts` verifica mecánicamente que ninguna función se lo olvide. Las cachés de precios y el histórico de CCL son datos de mercado y quedan compartidos.
- **Sin recuperación de contraseña**: no hay servicio de mail. Si alguien la olvida, se resetea con `npm run user:set-password`.

## Deploy

Conectado a GitHub: cada push a `main` dispara un deploy en Vercel. Región `gru1` (São Paulo), por cercanía a Supabase en `sa-east-1`.
