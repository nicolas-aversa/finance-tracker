import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * One account per person. Everything else in this file that holds personal
 * data hangs off this table by `userId`, and every query scopes by it — that
 * filter is the privacy boundary of the whole app.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  /** Always stored lower-cased, so logging in isn't case-sensitive. */
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;

/** The owning-user column every personal table carries. */
const ownerId = () => uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" });

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: ownerId(),
    ticker: text("ticker").notNull(),
    type: text("type", { enum: ["BUY", "SELL"] }).notNull(),
    tradeDate: date("trade_date", { mode: "string" }).notNull(),
    cclRate: numeric("ccl_rate", { precision: 12, scale: 4 }).notNull(),
    arsPrice: numeric("ars_price", { precision: 14, scale: 4 }).notNull(),
    qty: numeric("qty", { precision: 14, scale: 6 }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("transactions_user_idx").on(table.userId),
    index("transactions_ticker_idx").on(table.ticker),
    index("transactions_trade_date_idx").on(table.tradeDate),
  ]
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export const livePriceCache = pgTable("live_price_cache", {
  cacheKey: text("cache_key").primaryKey(),
  value: jsonb("value").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
});

export const cclRateHistory = pgTable("ccl_rate_history", {
  rateDate: date("rate_date", { mode: "string" }).primaryKey(),
  rate: numeric("rate", { precision: 12, scale: 4 }).notNull(),
  source: text("source").notNull().default("argentinadatos"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

// A manual price is a correction to *market data* — "the feed doesn't carry
// this ticker, use this number" — so it is the same for everyone and stays
// global. Scoping it would mean threading a userId through the whole prices
// layer to fix a quote that isn't personal in the first place.
export const priceOverrides = pgTable("price_overrides", {
  ticker: text("ticker").primaryKey(),
  manualArsPrice: numeric("manual_ars_price", { precision: 14, scale: 4 }),
  manualUsdPrice: numeric("manual_usd_price", { precision: 14, scale: 4 }),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per login identity (the email), tracking failed attempts so a
// password can't be brute-forced over the public internet. Per-identity and
// not global: otherwise one person's typos would lock everyone else out.
export const loginAttempts = pgTable("login_attempts", {
  id: text("id").primaryKey(),
  failedCount: integer("failed_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

// ─── Expenses (credit-card statement tracking) ───────────────────────────────

export const EXPENSE_SOURCES = ["mercadopago", "visa_galicia", "amex_galicia", "naranja", "manual"] as const;
export type ExpenseSource = (typeof EXPENSE_SOURCES)[number];

export const EXPENSE_KINDS = ["purchase", "payment", "tax", "fee", "refund", "interest"] as const;
export type ExpenseKind = (typeof EXPENSE_KINDS)[number];

/** One uploaded statement. Unique per (source, period) so re-uploading replaces it. */
export const expenseImports = pgTable(
  "expense_imports",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: ownerId(),
    source: text("source", { enum: EXPENSE_SOURCES }).notNull(),
    statementPeriod: date("statement_period", { mode: "string" }).notNull(),
    fileName: text("file_name"),
    statementTotalArs: numeric("statement_total_ars", { precision: 16, scale: 2 }),
    statementTotalUsd: numeric("statement_total_usd", { precision: 16, scale: 2 }),
    dueDate: date("due_date", { mode: "string" }),
    minPaymentArs: numeric("min_payment_ars", { precision: 16, scale: 2 }),
    rawMeta: jsonb("raw_meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("expense_imports_source_period_uq").on(table.userId, table.source, table.statementPeriod)]
);

export type ExpenseImport = typeof expenseImports.$inferSelect;
export type NewExpenseImport = typeof expenseImports.$inferInsert;

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: ownerId(),
    importId: uuid("import_id").references(() => expenseImports.id, { onDelete: "cascade" }),
    source: text("source", { enum: EXPENSE_SOURCES }).notNull(),
    txDate: date("tx_date", { mode: "string" }).notNull(),
    /** Statement month the charge was billed in ("yyyy-mm"); the axis the UI groups by. */
    billingMonth: text("billing_month"),
    description: text("description").notNull(),
    merchant: text("merchant").notNull(),
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    currency: text("currency", { enum: ["ARS", "USD"] }).notNull(),
    category: text("category").notNull(),
    installmentCurrent: integer("installment_current"),
    installmentTotal: integer("installment_total"),
    kind: text("kind", { enum: EXPENSE_KINDS }).notNull().default("purchase"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("expenses_user_idx").on(table.userId),
    index("expenses_tx_date_idx").on(table.txDate),
    index("expenses_category_idx").on(table.category),
    index("expenses_source_idx").on(table.source),
    index("expenses_import_idx").on(table.importId),
  ]
);

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

/** Editable list of spend categories (seeded with defaults). */
export const expenseCategories = pgTable(
  "expense_categories",
  {
    userId: ownerId(),
    name: text("name").notNull(),
    emoji: text("emoji").notNull().default("🏷️"),
    sort: integer("sort").notNull().default(100),
  },
  (table) => [primaryKey({ columns: [table.userId, table.name] })]
);

export type ExpenseCategory = typeof expenseCategories.$inferSelect;

/**
 * Monthly spending limit per category. One row per category — the budget
 * recurs every month rather than being set per-month, which is what a
 * single-user tracker needs and keeps the key a plain string.
 */
export const expenseBudgets = pgTable(
  "expense_budgets",
  {
    userId: ownerId(),
    category: text("category").notNull(),
    amountArs: numeric("amount_ars", { precision: 16, scale: 2 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.category] })]
);

export type ExpenseBudget = typeof expenseBudgets.$inferSelect;
export type NewExpenseBudget = typeof expenseBudgets.$inferInsert;

/**
 * What came in each month ("yyyy-mm"), to measure spend against. Per month
 * rather than a single recurring figure, because income actually moves.
 */
export const monthlyIncome = pgTable(
  "monthly_income",
  {
    userId: ownerId(),
    month: text("month").notNull(),
    amountArs: numeric("amount_ars", { precision: 16, scale: 2 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.month] })]
);

export type MonthlyIncome = typeof monthlyIncome.$inferSelect;

/** Keyword → category rules for auto-categorization at import time. */
export const categoryRules = pgTable(
  "category_rules",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: ownerId(),
    pattern: text("pattern").notNull(),
    category: text("category").notNull(),
    priority: integer("priority").notNull().default(0),
  },
  (table) => [
    index("category_rules_user_idx").on(table.userId),
    index("category_rules_priority_idx").on(table.priority),
  ]
);

export type CategoryRule = typeof categoryRules.$inferSelect;
