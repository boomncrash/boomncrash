import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "../../db";
import { bounties, submissions, rallyContributions, notifications, emailPreferences, categorySubscriptions, disputes, referralAttributions } from "../../db/schema";
import { store } from "@/lib/store";
import { RALLY_CREATOR_SEED_PERCENT } from "@/lib/constants";
import { generateId } from "@/lib/utils";
import type {
  Bounty,
  Submission,
  RallyContribution,
  BountyStatus,
  SubmissionStatus,
  ChainId,
  Notification,
  NotificationType,
  HunterProfile,
  EmailPreferences,
  BountyCategory,
  Dispute,
  DisputeStatus,
  CreateDisputeInput,
  ReferralAttribution,
  ReferralStats,
} from "@/lib/types";
import { computeHunterProfile } from "@/lib/profile";
import { buildLeaderboard } from "@/lib/leaderboard";

function isMissingRelationError(err: unknown): boolean {
  const check = (e: unknown) => {
    const code = (e as { code?: string })?.code;
    const message = e instanceof Error ? e.message : String(e);
    return code === "42P01" || message.includes("does not exist");
  };
  if (check(err)) return true;
  const cause = (err as { cause?: unknown })?.cause;
  return cause ? check(cause) : false;
}

async function withDbRead<T>(fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isMissingRelationError(err)) return fallback;
    throw err;
  }
}

function rowToBounty(row: typeof bounties.$inferSelect): Bounty {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    deliverables: row.deliverables,
    category: row.category as Bounty["category"],
    chain: row.chain as Bounty["chain"],
    rewardUsdc: Number(row.rewardUsdc),
    status: row.status as BountyStatus,
    creatorAddress: row.creatorAddress,
    escrowAddress: row.escrowAddress ?? undefined,
    deadline: row.deadline.toISOString(),
    txHash: row.txHash ?? undefined,
    submissionCount: row.submissionCount,
    isRally: row.isRally ?? false,
    rallyFunded: row.rallyFunded ? Number(row.rallyFunded) : undefined,
    creatorSeed: row.creatorSeed ? Number(row.creatorSeed) : undefined,
    backerCount: row.backerCount ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function rowToRallyContribution(row: typeof rallyContributions.$inferSelect): RallyContribution {
  return {
    id: row.id,
    bountyId: row.bountyId,
    backerAddress: row.backerAddress,
    amountUsdc: Number(row.amountUsdc),
    chain: row.chain as ChainId,
    txHash: row.txHash ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function rowToSubmission(row: typeof submissions.$inferSelect): Submission {
  return {
    id: row.id,
    bountyId: row.bountyId,
    hunterAddress: row.hunterAddress,
    proofUrl: row.proofUrl,
    proofDescription: row.proofDescription ?? "",
    status: row.status as SubmissionStatus,
    reviewNotes: row.reviewNotes ?? undefined,
    payoutTxHash: row.payoutTxHash ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function seedDatabaseIfEmpty() {
  try {
    const db = getDb();
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bounties);

    if (count > 0) return;

    const samples = store.getAll();
    for (const b of samples) {
      await db.insert(bounties).values({
      id: b.id,
      title: b.title,
      description: b.description,
      deliverables: b.deliverables,
      category: b.category,
      chain: b.chain,
      rewardUsdc: String(b.rewardUsdc),
      status: b.status,
      creatorAddress: b.creatorAddress,
      escrowAddress: b.escrowAddress,
      deadline: new Date(b.deadline),
      txHash: b.txHash,
      submissionCount: b.submissionCount ?? 0,
      isRally: b.isRally ?? false,
      rallyFunded: b.rallyFunded != null ? String(b.rallyFunded) : "0",
      creatorSeed: b.creatorSeed != null ? String(b.creatorSeed) : null,
      backerCount: b.backerCount ?? 0,
      createdAt: new Date(b.createdAt),
      updatedAt: new Date(b.updatedAt),
    });
    }
  } catch (err) {
    if (!isMissingRelationError(err)) throw err;
  }
}

export async function getBounties(filters?: {
  chain?: string;
  category?: string;
  status?: string;
  rally?: boolean;
}): Promise<Bounty[]> {
  if (!isDatabaseConfigured()) {
    return store.getAll(filters);
  }

  return withDbRead([], async () => {
    await seedDatabaseIfEmpty();

    const db = getDb();
    const conditions = [];
    if (filters?.chain) conditions.push(eq(bounties.chain, filters.chain));
    if (filters?.category) conditions.push(eq(bounties.category, filters.category));
    if (filters?.status) conditions.push(eq(bounties.status, filters.status));
    if (filters?.rally) conditions.push(eq(bounties.isRally, true));

    const rows = await db
      .select()
      .from(bounties)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(bounties.createdAt));

    return rows.map(rowToBounty);
  });
}

export async function getBountyById(id: string): Promise<Bounty | undefined> {
  if (!isDatabaseConfigured()) {
    return store.getById(id);
  }

  await seedDatabaseIfEmpty();

  const db = getDb();
  const [row] = await db.select().from(bounties).where(eq(bounties.id, id)).limit(1);
  return row ? rowToBounty(row) : undefined;
}

export async function createBounty(
  data: Omit<Bounty, "id" | "createdAt" | "updatedAt" | "status">
): Promise<Bounty> {
  if (!isDatabaseConfigured()) {
    return store.create(data);
  }

  const now = new Date();
  const id = generateId();
  const db = getDb();

  const creatorSeed = data.isRally
    ? data.creatorSeed ?? (data.rewardUsdc * RALLY_CREATOR_SEED_PERCENT) / 100
    : undefined;
  const status = data.isRally ? "funding" : "pending_moderation";

  const [row] = await db
    .insert(bounties)
    .values({
      id,
      title: data.title,
      description: data.description,
      deliverables: data.deliverables,
      category: data.category,
      chain: data.chain,
      rewardUsdc: String(data.rewardUsdc),
      status,
      creatorAddress: data.creatorAddress,
      escrowAddress: data.escrowAddress,
      deadline: new Date(data.deadline),
      txHash: data.txHash,
      submissionCount: 0,
      isRally: data.isRally ?? false,
      rallyFunded: data.isRally ? String(creatorSeed) : "0",
      creatorSeed: creatorSeed != null ? String(creatorSeed) : null,
      backerCount: data.isRally ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return rowToBounty(row);
}

export async function updateBounty(
  id: string,
  data: Partial<Bounty>
): Promise<Bounty | undefined> {
  if (!isDatabaseConfigured()) {
    return store.update(id, data);
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) patch.title = data.title;
  if (data.description !== undefined) patch.description = data.description;
  if (data.deliverables !== undefined) patch.deliverables = data.deliverables;
  if (data.category !== undefined) patch.category = data.category;
  if (data.chain !== undefined) patch.chain = data.chain;
  if (data.rewardUsdc !== undefined) patch.rewardUsdc = String(data.rewardUsdc);
  if (data.status !== undefined) patch.status = data.status;
  if (data.creatorAddress !== undefined) patch.creatorAddress = data.creatorAddress;
  if (data.escrowAddress !== undefined) patch.escrowAddress = data.escrowAddress;
  if (data.deadline !== undefined) patch.deadline = new Date(data.deadline);
  if (data.txHash !== undefined) patch.txHash = data.txHash;
  if (data.submissionCount !== undefined) patch.submissionCount = data.submissionCount;
  if (data.isRally !== undefined) patch.isRally = data.isRally;
  if (data.rallyFunded !== undefined) patch.rallyFunded = String(data.rallyFunded);
  if (data.creatorSeed !== undefined) patch.creatorSeed = String(data.creatorSeed);
  if (data.backerCount !== undefined) patch.backerCount = data.backerCount;

  const db = getDb();
  const [row] = await db
    .update(bounties)
    .set(patch)
    .where(eq(bounties.id, id))
    .returning();

  return row ? rowToBounty(row) : undefined;
}

export async function getSubmissions(bountyId?: string): Promise<Submission[]> {
  if (!isDatabaseConfigured()) {
    return store.getSubmissions(bountyId);
  }

  return withDbRead([], async () => {
    const db = getDb();
    const rows = bountyId
      ? await db
          .select()
          .from(submissions)
          .where(eq(submissions.bountyId, bountyId))
          .orderBy(desc(submissions.createdAt))
      : await db.select().from(submissions).orderBy(desc(submissions.createdAt));

    return rows.map(rowToSubmission);
  });
}

export async function getSubmissionById(id: string): Promise<Submission | undefined> {
  if (!isDatabaseConfigured()) {
    return store.getSubmissionById(id);
  }

  const db = getDb();
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  return row ? rowToSubmission(row) : undefined;
}

export async function createSubmission(
  data: Omit<Submission, "id" | "createdAt" | "updatedAt" | "status">
): Promise<Submission> {
  if (!isDatabaseConfigured()) {
    return store.createSubmission(data);
  }

  const now = new Date();
  const id = generateId();
  const db = getDb();

  const [row] = await db
    .insert(submissions)
    .values({
      id,
      bountyId: data.bountyId,
      hunterAddress: data.hunterAddress,
      proofUrl: data.proofUrl,
      proofDescription: data.proofDescription,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const bounty = await getBountyById(data.bountyId);
  if (bounty) {
    await updateBounty(data.bountyId, {
      submissionCount: (bounty.submissionCount ?? 0) + 1,
      status: bounty.status === "open" ? "submitted" : bounty.status,
    });
  }

  return rowToSubmission(row);
}

export async function updateSubmission(
  id: string,
  data: Partial<Submission>
): Promise<Submission | undefined> {
  if (!isDatabaseConfigured()) {
    return store.updateSubmission(id, data);
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.status !== undefined) patch.status = data.status;
  if (data.reviewNotes !== undefined) patch.reviewNotes = data.reviewNotes;
  if (data.payoutTxHash !== undefined) patch.payoutTxHash = data.payoutTxHash;
  if (data.proofUrl !== undefined) patch.proofUrl = data.proofUrl;
  if (data.proofDescription !== undefined) patch.proofDescription = data.proofDescription;

  const db = getDb();
  const [row] = await db
    .update(submissions)
    .set(patch)
    .where(eq(submissions.id, id))
    .returning();

  return row ? rowToSubmission(row) : undefined;
}

export async function getRallyContributions(bountyId: string): Promise<RallyContribution[]> {
  if (!isDatabaseConfigured()) {
    return store.getRallyContributions(bountyId);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(rallyContributions)
    .where(eq(rallyContributions.bountyId, bountyId))
    .orderBy(desc(rallyContributions.createdAt));

  return rows.map(rowToRallyContribution);
}

export async function contributeToRally(
  bountyId: string,
  data: Omit<RallyContribution, "id" | "createdAt" | "bountyId">
): Promise<{ bounty: Bounty; contribution: RallyContribution } | null> {
  if (!isDatabaseConfigured()) {
    return store.contributeToRally(bountyId, data) ?? null;
  }

  const bounty = await getBountyById(bountyId);
  if (!bounty?.isRally || bounty.status !== "funding") return null;

  const remaining = bounty.rewardUsdc - (bounty.rallyFunded ?? 0);
  if (data.amountUsdc <= 0 || data.amountUsdc > remaining) return null;

  const now = new Date();
  const id = generateId();
  const db = getDb();

  const [contributionRow] = await db
    .insert(rallyContributions)
    .values({
      id,
      bountyId,
      backerAddress: data.backerAddress,
      amountUsdc: String(data.amountUsdc),
      chain: data.chain,
      txHash: data.txHash,
      createdAt: now,
    })
    .returning();

  const rallyFunded = (bounty.rallyFunded ?? 0) + data.amountUsdc;
  const funded = rallyFunded >= bounty.rewardUsdc;

  const [bountyRow] = await db
    .update(bounties)
    .set({
      rallyFunded: String(rallyFunded),
      backerCount: (bounty.backerCount ?? 0) + 1,
      status: funded ? "pending_moderation" : "funding",
      updatedAt: now,
    })
    .where(eq(bounties.id, bountyId))
    .returning();

  return {
    bounty: rowToBounty(bountyRow),
    contribution: rowToRallyContribution(contributionRow),
  };
}

function rowToNotification(row: typeof notifications.$inferSelect): Notification {
  return {
    id: row.id,
    walletAddress: row.walletAddress,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    link: row.link ?? undefined,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createNotification(
  data: Omit<Notification, "id" | "read" | "createdAt">
): Promise<Notification> {
  if (!isDatabaseConfigured()) {
    return store.createNotification(data);
  }

  const now = new Date();
  const id = generateId();
  const db = getDb();

  const [row] = await db
    .insert(notifications)
    .values({
      id,
      walletAddress: data.walletAddress,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      read: false,
      createdAt: now,
    })
    .returning();

  return rowToNotification(row);
}

export async function getNotifications(walletAddress: string): Promise<Notification[]> {
  if (!isDatabaseConfigured()) {
    return store.getNotifications(walletAddress);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.walletAddress, walletAddress))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return rows.map(rowToNotification);
}

export async function markNotificationRead(id: string): Promise<Notification | undefined> {
  if (!isDatabaseConfigured()) {
    return store.markNotificationRead(id);
  }

  const db = getDb();
  const [row] = await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, id))
    .returning();

  return row ? rowToNotification(row) : undefined;
}

export async function markAllNotificationsRead(walletAddress: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    store.markAllNotificationsRead(walletAddress);
    return;
  }

  const db = getDb();
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.walletAddress, walletAddress));
}

export async function getRallyContributionsByBacker(
  backerAddress: string
): Promise<RallyContribution[]> {
  if (!isDatabaseConfigured()) {
    return store.getRallyContributionsByBacker(backerAddress);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(rallyContributions)
    .where(eq(rallyContributions.backerAddress, backerAddress))
    .orderBy(desc(rallyContributions.createdAt));

  return rows.map(rowToRallyContribution);
}

export async function getHunterProfile(address: string): Promise<HunterProfile> {
  const [allBounties, allSubmissions, backed] = await Promise.all([
    getBounties(),
    getSubmissions(),
    getRallyContributionsByBacker(address),
  ]);

  return computeHunterProfile(address, allBounties, allSubmissions, backed);
}

export async function getAllRallyContributions(): Promise<RallyContribution[]> {
  if (!isDatabaseConfigured()) {
    return store.getAllRallyContributions();
  }

  return withDbRead([], async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(rallyContributions)
      .orderBy(desc(rallyContributions.createdAt));
    return rows.map(rowToRallyContribution);
  });
}

export async function getLeaderboard(limit = 50): Promise<HunterProfile[]> {
  const [allBounties, allSubmissions, allContributions] = await Promise.all([
    getBounties(),
    getSubmissions(),
    getAllRallyContributions(),
  ]);

  return buildLeaderboard(allBounties, allSubmissions, allContributions, limit);
}

function rowToEmailPreferences(row: typeof emailPreferences.$inferSelect): EmailPreferences {
  return {
    walletAddress: row.walletAddress,
    email: row.email,
    enabled: row.enabled,
    emailVerified: row.emailVerified,
    notifySubmissions: row.notifySubmissions,
    notifyReviews: row.notifyReviews,
    notifyPayouts: row.notifyPayouts,
    notifyRally: row.notifyRally,
    notifyNewBounties: row.notifyNewBounties,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getEmailPreferences(
  walletAddress: string
): Promise<EmailPreferences | undefined> {
  if (!isDatabaseConfigured()) {
    return store.getEmailPreferences(walletAddress);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.walletAddress, walletAddress))
    .limit(1);

  if (rows[0]) return rowToEmailPreferences(rows[0]);

  const all = await db.select().from(emailPreferences);
  const match = all.find(
    (r) => r.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
  return match ? rowToEmailPreferences(match) : undefined;
}

export async function upsertEmailPreferences(
  data: Omit<EmailPreferences, "updatedAt"> & {
    verifyToken?: string | null;
    verifyTokenExpires?: string | null;
  }
): Promise<EmailPreferences> {
  if (!isDatabaseConfigured()) {
    return store.upsertEmailPreferences(data);
  }

  const db = getDb();
  const now = new Date();
  const existing = await getEmailPreferences(data.walletAddress);
  const verifyExpires = data.verifyTokenExpires
    ? new Date(data.verifyTokenExpires)
    : null;

  const values = {
    email: data.email,
    enabled: data.enabled,
    emailVerified: data.emailVerified,
    verifyToken: data.verifyToken ?? null,
    verifyTokenExpires: verifyExpires,
    notifySubmissions: data.notifySubmissions,
    notifyReviews: data.notifyReviews,
    notifyPayouts: data.notifyPayouts,
    notifyRally: data.notifyRally,
    notifyNewBounties: data.notifyNewBounties,
    updatedAt: now,
  };

  if (existing) {
    const existingRow = await db
      .select()
      .from(emailPreferences)
      .where(eq(emailPreferences.walletAddress, existing.walletAddress))
      .limit(1);
    const unsubscribeToken =
      existingRow[0]?.unsubscribeToken ?? generateId();

    const [row] = await db
      .update(emailPreferences)
      .set({ ...values, unsubscribeToken })
      .where(eq(emailPreferences.walletAddress, existing.walletAddress))
      .returning();

    return rowToEmailPreferences(row);
  }

  const [row] = await db
    .insert(emailPreferences)
    .values({
      walletAddress: data.walletAddress,
      ...values,
      unsubscribeToken: generateId(),
      createdAt: now,
    })
    .returning();

  return rowToEmailPreferences(row);
}

export async function verifyEmailByToken(token: string): Promise<EmailPreferences | undefined> {
  if (!isDatabaseConfigured()) {
    return store.verifyEmailByToken(token);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.verifyToken, token))
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;
  if (row.verifyTokenExpires && row.verifyTokenExpires < new Date()) return undefined;

  const [updated] = await db
    .update(emailPreferences)
    .set({
      emailVerified: true,
      verifyToken: null,
      verifyTokenExpires: null,
      updatedAt: new Date(),
    })
    .where(eq(emailPreferences.walletAddress, row.walletAddress))
    .returning();

  return updated ? rowToEmailPreferences(updated) : undefined;
}

export async function getCategorySubscriptions(walletAddress: string): Promise<BountyCategory[]> {
  if (!isDatabaseConfigured()) {
    return store.getCategorySubscriptions(walletAddress) as BountyCategory[];
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(categorySubscriptions)
    .where(eq(categorySubscriptions.walletAddress, walletAddress));

  if (rows.length > 0) {
    return rows.map((r) => r.category as BountyCategory);
  }

  const all = await db.select().from(categorySubscriptions);
  return all
    .filter((r) => r.walletAddress.toLowerCase() === walletAddress.toLowerCase())
    .map((r) => r.category as BountyCategory);
}

export async function setCategorySubscriptions(
  walletAddress: string,
  categories: BountyCategory[]
): Promise<BountyCategory[]> {
  if (!isDatabaseConfigured()) {
    return store.setCategorySubscriptions(walletAddress, categories) as BountyCategory[];
  }

  const db = getDb();
  await db
    .delete(categorySubscriptions)
    .where(eq(categorySubscriptions.walletAddress, walletAddress));

  if (categories.length > 0) {
    await db.insert(categorySubscriptions).values(
      categories.map((category) => ({
        walletAddress,
        category,
        createdAt: new Date(),
      }))
    );
  }

  return categories;
}

export async function getCategorySubscribers(category: BountyCategory): Promise<string[]> {
  if (!isDatabaseConfigured()) {
    return store.getCategorySubscribers(category);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(categorySubscriptions)
    .where(eq(categorySubscriptions.category, category));

  return rows.map((r) => r.walletAddress);
}

export async function getUnsubscribeToken(walletAddress: string): Promise<string | null> {
  if (!isDatabaseConfigured()) {
    return store.getUnsubscribeToken(walletAddress) ?? null;
  }

  const db = getDb();
  const rows = await db
    .select({ token: emailPreferences.unsubscribeToken })
    .from(emailPreferences)
    .where(eq(emailPreferences.walletAddress, walletAddress))
    .limit(1);

  if (rows[0]?.token) return rows[0].token;

  const prefs = await getEmailPreferences(walletAddress);
  if (!prefs) return null;

  const token = generateId();
  await db
    .update(emailPreferences)
    .set({ unsubscribeToken: token, updatedAt: new Date() })
    .where(eq(emailPreferences.walletAddress, walletAddress));

  return token;
}

export async function unsubscribeByToken(token: string): Promise<EmailPreferences | undefined> {
  if (!isDatabaseConfigured()) {
    return store.unsubscribeByToken(token);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.unsubscribeToken, token))
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;

  const [updated] = await db
    .update(emailPreferences)
    .set({ enabled: false, updatedAt: new Date() })
    .where(eq(emailPreferences.walletAddress, row.walletAddress))
    .returning();

  return updated ? rowToEmailPreferences(updated) : undefined;
}

export async function refreshVerificationToken(
  walletAddress: string
): Promise<{ email: string; token: string } | undefined> {
  if (!isDatabaseConfigured()) {
    return store.refreshVerificationToken(walletAddress);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.walletAddress, walletAddress))
    .limit(1);

  let row: (typeof rows)[number] | undefined = rows[0];
  if (!row) {
    const all = await db.select().from(emailPreferences);
    row = all.find((r) => r.walletAddress.toLowerCase() === walletAddress.toLowerCase());
  }
  if (!row || row.emailVerified) return undefined;

  const token = generateId();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db
    .update(emailPreferences)
    .set({
      verifyToken: token,
      verifyTokenExpires: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(emailPreferences.walletAddress, row.walletAddress));

  return { email: row.email, token };
}

function rowToDispute(row: typeof disputes.$inferSelect): Dispute {
  return {
    id: row.id,
    bountyId: row.bountyId,
    submissionId: row.submissionId,
    filerAddress: row.filerAddress,
    reason: row.reason,
    status: row.status as DisputeStatus,
    resolutionNotes: row.resolutionNotes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString(),
  };
}

export async function createDispute(input: CreateDisputeInput): Promise<Dispute> {
  if (!isDatabaseConfigured()) {
    return store.createDispute(input);
  }

  const db = getDb();
  const id = generateId();
  const now = new Date();
  const [row] = await db
    .insert(disputes)
    .values({
      id,
      bountyId: input.bountyId,
      submissionId: input.submissionId,
      filerAddress: input.filerAddress,
      reason: input.reason,
      status: "open",
      createdAt: now,
    })
    .returning();

  return rowToDispute(row);
}

export async function getDisputeById(id: string): Promise<Dispute | undefined> {
  if (!isDatabaseConfigured()) {
    return store.getDisputeById(id);
  }

  const db = getDb();
  const rows = await db.select().from(disputes).where(eq(disputes.id, id)).limit(1);
  return rows[0] ? rowToDispute(rows[0]) : undefined;
}

export async function getDisputesByBounty(bountyId: string): Promise<Dispute[]> {
  if (!isDatabaseConfigured()) {
    return store.getDisputesByBounty(bountyId);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(disputes)
    .where(eq(disputes.bountyId, bountyId))
    .orderBy(desc(disputes.createdAt));

  return rows.map(rowToDispute);
}

export async function getOpenDisputes(): Promise<Dispute[]> {
  if (!isDatabaseConfigured()) {
    return store.getOpenDisputes();
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(disputes)
    .where(eq(disputes.status, "open"))
    .orderBy(desc(disputes.createdAt));

  return rows.map(rowToDispute);
}

export async function resolveDispute(
  id: string,
  status: "resolved" | "dismissed",
  resolutionNotes?: string
): Promise<Dispute | undefined> {
  if (!isDatabaseConfigured()) {
    return store.updateDispute(id, {
      status,
      resolutionNotes,
      resolvedAt: new Date().toISOString(),
    });
  }

  const db = getDb();
  const now = new Date();
  const [row] = await db
    .update(disputes)
    .set({
      status,
      resolutionNotes: resolutionNotes ?? null,
      resolvedAt: now,
    })
    .where(eq(disputes.id, id))
    .returning();

  return row ? rowToDispute(row) : undefined;
}

function rowToReferral(row: typeof referralAttributions.$inferSelect): ReferralAttribution {
  return {
    refereeWallet: row.refereeWallet,
    referrerWallet: row.referrerWallet,
    createdAt: row.createdAt.toISOString(),
  };
}

function walletsMatch(a: string, b: string): boolean {
  if (a.length > 40 || b.length > 40) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

export async function claimReferral(
  refereeWallet: string,
  referrerWallet: string
): Promise<ReferralAttribution | null> {
  if (walletsMatch(refereeWallet, referrerWallet)) return null;

  if (!isDatabaseConfigured()) {
    return store.claimReferral(refereeWallet, referrerWallet);
  }

  const db = getDb();
  const existing = await db.select().from(referralAttributions);
  const prior = existing.find((row) => walletsMatch(row.refereeWallet, refereeWallet));
  if (prior) return rowToReferral(prior);

  const [row] = await db
    .insert(referralAttributions)
    .values({
      refereeWallet,
      referrerWallet,
      createdAt: new Date(),
    })
    .returning();

  return row ? rowToReferral(row) : null;
}

export async function getReferralStats(wallet: string): Promise<ReferralStats> {
  if (!isDatabaseConfigured()) {
    return store.getReferralStats(wallet);
  }

  const db = getDb();
  const rows = await db.select().from(referralAttributions);
  const referred = rows.find((row) => walletsMatch(row.refereeWallet, wallet));

  return {
    referralCount: rows.filter((row) => walletsMatch(row.referrerWallet, wallet)).length,
    referredBy: referred?.referrerWallet,
  };
}

export async function getReferralLeaderboard(limit = 20): Promise<
  { referrerWallet: string; referralCount: number }[]
> {
  if (!isDatabaseConfigured()) {
    return store.getReferralLeaderboard(limit);
  }

  const db = getDb();
  const rows = await db.select().from(referralAttributions);
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = row.referrerWallet;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([referrerWallet, referralCount]) => ({ referrerWallet, referralCount }))
    .sort((a, b) => b.referralCount - a.referralCount)
    .slice(0, limit);
}

export async function getTotalReferrals(): Promise<number> {
  if (!isDatabaseConfigured()) {
    return store.getTotalReferrals();
  }

  const db = getDb();
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(referralAttributions);
  return result?.count ?? 0;
}
