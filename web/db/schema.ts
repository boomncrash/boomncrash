import {
  boolean,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const bounties = pgTable("bounties", {
  id: varchar("id", { length: 64 }).primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  deliverables: text("deliverables").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  chain: varchar("chain", { length: 20 }).notNull(),
  rewardUsdc: numeric("reward_usdc", { precision: 18, scale: 6 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending_moderation"),
  creatorAddress: varchar("creator_address", { length: 100 }).notNull(),
  escrowAddress: varchar("escrow_address", { length: 100 }),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  txHash: varchar("tx_hash", { length: 100 }),
  submissionCount: integer("submission_count").notNull().default(0),
  isRally: boolean("is_rally").notNull().default(false),
  rallyFunded: numeric("rally_funded", { precision: 18, scale: 6 }).default("0"),
  creatorSeed: numeric("creator_seed", { precision: 18, scale: 6 }),
  backerCount: integer("backer_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const submissions = pgTable("submissions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  bountyId: varchar("bounty_id", { length: 64 })
    .notNull()
    .references(() => bounties.id),
  hunterAddress: varchar("hunter_address", { length: 100 }).notNull(),
  proofUrl: text("proof_url").notNull(),
  proofDescription: text("proof_description"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  reviewNotes: text("review_notes"),
  payoutTxHash: varchar("payout_tx_hash", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rallyContributions = pgTable("rally_contributions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  bountyId: varchar("bounty_id", { length: 64 })
    .notNull()
    .references(() => bounties.id),
  backerAddress: varchar("backer_address", { length: 100 }).notNull(),
  amountUsdc: numeric("amount_usdc", { precision: 18, scale: 6 }).notNull(),
  chain: varchar("chain", { length: 20 }).notNull(),
  txHash: varchar("tx_hash", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id", { length: 64 }).primaryKey(),
  walletAddress: varchar("wallet_address", { length: 100 }).notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 300 }),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailPreferences = pgTable("email_preferences", {
  walletAddress: varchar("wallet_address", { length: 100 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  verifyToken: varchar("verify_token", { length: 64 }),
  verifyTokenExpires: timestamp("verify_token_expires", { withTimezone: true }),
  notifySubmissions: boolean("notify_submissions").notNull().default(true),
  notifyReviews: boolean("notify_reviews").notNull().default(true),
  notifyPayouts: boolean("notify_payouts").notNull().default(true),
  notifyRally: boolean("notify_rally").notNull().default(true),
  notifyNewBounties: boolean("notify_new_bounties").notNull().default(true),
  unsubscribeToken: varchar("unsubscribe_token", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const categorySubscriptions = pgTable(
  "category_subscriptions",
  {
    walletAddress: varchar("wallet_address", { length: 100 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.walletAddress, table.category] })]
);

export const disputes = pgTable("disputes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  bountyId: varchar("bounty_id", { length: 64 })
    .notNull()
    .references(() => bounties.id),
  submissionId: varchar("submission_id", { length: 64 }).notNull(),
  filerAddress: varchar("filer_address", { length: 100 }).notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const referralAttributions = pgTable("referral_attributions", {
  refereeWallet: varchar("referee_wallet", { length: 100 }).primaryKey(),
  referrerWallet: varchar("referrer_wallet", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DbBounty = typeof bounties.$inferSelect;
export type DbSubmission = typeof submissions.$inferSelect;
export type DbRallyContribution = typeof rallyContributions.$inferSelect;
export type DbNotification = typeof notifications.$inferSelect;
export type DbEmailPreferences = typeof emailPreferences.$inferSelect;
