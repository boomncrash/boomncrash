import { Bounty, Submission, RallyContribution, Notification, EmailPreferences, Dispute, ReferralAttribution, ReferralStats } from "@/lib/types";
import { RALLY_CREATOR_SEED_PERCENT, APP_NAME } from "@/lib/constants";
import { generateId } from "@/lib/utils";

class BountyStore {
  private bounties: Map<string, Bounty> = new Map();
  private submissions: Map<string, Submission> = new Map();
  private rallyContributions: Map<string, RallyContribution> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private emailPreferences: Map<
    string,
    EmailPreferences & {
      verifyToken?: string;
      verifyTokenExpires?: string;
      unsubscribeToken?: string;
    }
  > = new Map();
  private categorySubscriptions: Map<string, Set<string>> = new Map();
  private disputes: Map<string, Dispute> = new Map();
  private referralAttributions: Map<string, ReferralAttribution> = new Map();

  constructor() {
    this.seed();
  }

  private seed() {
    const now = new Date();
    const samples: Bounty[] = [
      {
        id: "bounty-1",
        title: "Quote tweet our product launch thread",
        description:
          `Quote tweet our official launch announcement with your honest take. Must include #${APP_NAME} and tag @boomncrash.`,
        deliverables: "Link to your quote tweet. Minimum 50 characters of original commentary.",
        category: "social",
        chain: "base",
        rewardUsdc: 25,
        status: "open",
        creatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        deadline: new Date(now.getTime() + 7 * 86400000).toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        submissionCount: 3,
      },
      {
        id: "bounty-rally-1",
        title: "Rally: Fund a viral launch video series",
        description:
          `Help us crowdfund a 5-part USDC-paid video series promoting ${APP_NAME} globally. Goes live when fully funded.`,
        deliverables: "N/A until funded — backers contribute USDC to the Rally pool.",
        category: "content",
        chain: "base",
        rewardUsdc: 500,
        status: "funding",
        creatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        deadline: new Date(now.getTime() + 21 * 86400000).toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        submissionCount: 0,
        isRally: true,
        creatorSeed: 100,
        rallyFunded: 220,
        backerCount: 4,
      },
      {
        id: "bounty-2",
        title: "Create a 30-second meme clip for our memecoin",
        description:
          "Make a funny 30-second vertical clip promoting our token launch. Style: crypto Twitter humor.",
        deliverables: "Upload clip to X or YouTube. Submit link + wallet address.",
        category: "content",
        chain: "solana",
        rewardUsdc: 150,
        status: "open",
        creatorAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        deadline: new Date(now.getTime() + 14 * 86400000).toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        submissionCount: 1,
      },
      {
        id: "bounty-3",
        title: "Test our mobile app beta and report bugs",
        description:
          "Download our iOS/Android beta, complete 5 core flows, and submit a structured bug report.",
        deliverables: "TestFlight/Play Store proof + written report with screenshots.",
        category: "product_testing",
        chain: "base",
        rewardUsdc: 50,
        status: "open",
        creatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        deadline: new Date(now.getTime() + 10 * 86400000).toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        submissionCount: 0,
      },
    ];

    for (const bounty of samples) {
      this.bounties.set(bounty.id, bounty);
    }

    const demoSubs: Submission[] = [
      {
        id: "sub-demo-1",
        bountyId: "bounty-1",
        hunterAddress: "0x1234567890123456789012345678901234567890",
        proofUrl: "https://x.com/example/status/1",
        proofDescription: "Quote tweet with commentary",
        status: "paid",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        payoutTxHash: "0xdemo",
      },
      {
        id: "sub-demo-2",
        bountyId: "bounty-2",
        hunterAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        proofUrl: "https://youtube.com/watch?v=demo",
        proofDescription: "30s meme clip submitted",
        status: "paid",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ];
    for (const sub of demoSubs) {
      this.submissions.set(sub.id, sub);
    }
  }

  getAll(filters?: {
    chain?: string;
    category?: string;
    status?: string;
    rally?: boolean;
  }): Bounty[] {
    let results = Array.from(this.bounties.values());
    if (filters?.chain) results = results.filter((b) => b.chain === filters.chain);
    if (filters?.category) results = results.filter((b) => b.category === filters.category);
    if (filters?.status) results = results.filter((b) => b.status === filters.status);
    if (filters?.rally) results = results.filter((b) => b.isRally);
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getById(id: string): Bounty | undefined {
    return this.bounties.get(id);
  }

  create(data: Omit<Bounty, "id" | "createdAt" | "updatedAt" | "status">): Bounty {
    const now = new Date().toISOString();
    const creatorSeed = data.isRally
      ? data.creatorSeed ?? (data.rewardUsdc * RALLY_CREATOR_SEED_PERCENT) / 100
      : undefined;

    const bounty: Bounty = {
      ...data,
      id: generateId(),
      status: data.isRally ? "funding" : "pending_moderation",
      creatorSeed,
      rallyFunded: data.isRally ? creatorSeed : undefined,
      backerCount: data.isRally ? 1 : 0,
      createdAt: now,
      updatedAt: now,
      submissionCount: 0,
    };
    this.bounties.set(bounty.id, bounty);
    return bounty;
  }

  update(id: string, data: Partial<Bounty>): Bounty | undefined {
    const existing = this.bounties.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    this.bounties.set(id, updated);
    return updated;
  }

  contributeToRally(
    bountyId: string,
    data: Omit<RallyContribution, "id" | "createdAt" | "bountyId">
  ): { bounty: Bounty; contribution: RallyContribution } | undefined {
    const bounty = this.bounties.get(bountyId);
    if (!bounty?.isRally || bounty.status !== "funding") return undefined;

    const now = new Date().toISOString();
    const contribution: RallyContribution = {
      id: generateId(),
      bountyId,
      ...data,
      createdAt: now,
    };
    this.rallyContributions.set(contribution.id, contribution);

    const rallyFunded = (bounty.rallyFunded ?? 0) + data.amountUsdc;
    const funded = rallyFunded >= bounty.rewardUsdc;

    const updated: Bounty = {
      ...bounty,
      rallyFunded,
      backerCount: (bounty.backerCount ?? 0) + 1,
      status: funded ? "pending_moderation" : "funding",
      updatedAt: now,
    };
    this.bounties.set(bountyId, updated);

    return { bounty: updated, contribution };
  }

  getRallyContributions(bountyId: string): RallyContribution[] {
    return Array.from(this.rallyContributions.values())
      .filter((c) => c.bountyId === bountyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getRallyContributionsByBacker(backerAddress: string): RallyContribution[] {
    return Array.from(this.rallyContributions.values())
      .filter(
        (c) =>
          c.backerAddress === backerAddress ||
          c.backerAddress.toLowerCase() === backerAddress.toLowerCase()
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAllRallyContributions(): RallyContribution[] {
    return Array.from(this.rallyContributions.values());
  }

  createNotification(
    data: Omit<Notification, "id" | "read" | "createdAt">
  ): Notification {
    const notification: Notification = {
      ...data,
      id: generateId(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  getNotifications(walletAddress: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter(
        (n) =>
          n.walletAddress === walletAddress ||
          n.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markNotificationRead(id: string): Notification | undefined {
    const existing = this.notifications.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, read: true };
    this.notifications.set(id, updated);
    return updated;
  }

  markAllNotificationsRead(walletAddress: string): void {
    for (const [id, n] of this.notifications) {
      if (
        n.walletAddress === walletAddress ||
        n.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      ) {
        this.notifications.set(id, { ...n, read: true });
      }
    }
  }

  getEmailPreferences(walletAddress: string): EmailPreferences | undefined {
    const direct = this.emailPreferences.get(walletAddress);
    if (direct) return direct;
    for (const [key, prefs] of this.emailPreferences) {
      if (key.toLowerCase() === walletAddress.toLowerCase()) return prefs;
    }
    return undefined;
  }

  upsertEmailPreferences(
    data: Omit<EmailPreferences, "updatedAt"> & {
      verifyToken?: string | null;
      verifyTokenExpires?: string | null;
      unsubscribeToken?: string;
    }
  ): EmailPreferences {
    const { verifyToken, verifyTokenExpires, unsubscribeToken, ...prefs } = data;
    const existing = this.emailPreferences.get(data.walletAddress);
    const stored: EmailPreferences & {
      verifyToken?: string;
      verifyTokenExpires?: string;
      unsubscribeToken?: string;
    } = {
      ...prefs,
      updatedAt: new Date().toISOString(),
      unsubscribeToken: unsubscribeToken ?? existing?.unsubscribeToken ?? generateId(),
    };
    if (verifyToken) stored.verifyToken = verifyToken;
    if (verifyTokenExpires) stored.verifyTokenExpires = verifyTokenExpires;
    if (verifyToken === null) delete stored.verifyToken;
    if (verifyTokenExpires === null) delete stored.verifyTokenExpires;
    this.emailPreferences.set(data.walletAddress, stored);
    return { ...prefs, updatedAt: stored.updatedAt };
  }

  getUnsubscribeToken(walletAddress: string): string | undefined {
    const prefs = this.getEmailPreferences(walletAddress) as
      | (EmailPreferences & { unsubscribeToken?: string })
      | undefined;
    return prefs?.unsubscribeToken;
  }

  unsubscribeByToken(token: string): EmailPreferences | undefined {
    for (const [key, prefs] of this.emailPreferences) {
      if (prefs.unsubscribeToken !== token) continue;
      const updated = { ...prefs, enabled: false, updatedAt: new Date().toISOString() };
      this.emailPreferences.set(key, updated);
      return updated;
    }
    return undefined;
  }

  refreshVerificationToken(walletAddress: string): { email: string; token: string } | undefined {
    const prefs = this.emailPreferences.get(walletAddress);
    if (!prefs || prefs.emailVerified) return undefined;
    const token = generateId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    this.emailPreferences.set(walletAddress, {
      ...prefs,
      verifyToken: token,
      verifyTokenExpires: expiresAt,
      updatedAt: new Date().toISOString(),
    });
    return { email: prefs.email, token };
  }

  createDispute(data: Omit<Dispute, "id" | "status" | "createdAt">): Dispute {
    const dispute: Dispute = {
      ...data,
      id: generateId(),
      status: "open",
      createdAt: new Date().toISOString(),
    };
    this.disputes.set(dispute.id, dispute);
    return dispute;
  }

  getDisputeById(id: string): Dispute | undefined {
    return this.disputes.get(id);
  }

  getDisputesByBounty(bountyId: string): Dispute[] {
    return Array.from(this.disputes.values()).filter((d) => d.bountyId === bountyId);
  }

  getOpenDisputes(): Dispute[] {
    return Array.from(this.disputes.values()).filter((d) => d.status === "open");
  }

  updateDispute(id: string, data: Partial<Dispute>): Dispute | undefined {
    const existing = this.disputes.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.disputes.set(id, updated);
    return updated;
  }

  claimReferral(refereeWallet: string, referrerWallet: string): ReferralAttribution | null {
    if (this.addressesMatch(refereeWallet, referrerWallet)) return null;
    for (const attr of this.referralAttributions.values()) {
      if (this.addressesMatch(attr.refereeWallet, refereeWallet)) return attr;
    }

    const attribution: ReferralAttribution = {
      refereeWallet,
      referrerWallet,
      createdAt: new Date().toISOString(),
    };
    this.referralAttributions.set(refereeWallet, attribution);
    return attribution;
  }

  getReferralStats(wallet: string): ReferralStats {
    let referredBy: string | undefined;
    let referralCount = 0;
    for (const attr of this.referralAttributions.values()) {
      if (this.addressesMatch(attr.refereeWallet, wallet)) referredBy = attr.referrerWallet;
      if (this.addressesMatch(attr.referrerWallet, wallet)) referralCount++;
    }
    return { referralCount, referredBy };
  }

  getReferralLeaderboard(limit: number): { referrerWallet: string; referralCount: number }[] {
    const counts = new Map<string, number>();
    for (const attr of this.referralAttributions.values()) {
      counts.set(attr.referrerWallet, (counts.get(attr.referrerWallet) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([referrerWallet, referralCount]) => ({ referrerWallet, referralCount }))
      .sort((a, b) => b.referralCount - a.referralCount)
      .slice(0, limit);
  }

  getTotalReferrals(): number {
    return this.referralAttributions.size;
  }

  private addressesMatch(a: string, b: string): boolean {
    if (a.length > 40 || b.length > 40) return a === b;
    return a.toLowerCase() === b.toLowerCase();
  }

  verifyEmailByToken(token: string): EmailPreferences | undefined {
    for (const [key, prefs] of this.emailPreferences) {
      if (prefs.verifyToken !== token) continue;
      if (prefs.verifyTokenExpires && new Date(prefs.verifyTokenExpires) < new Date()) {
        return undefined;
      }
      const verified: EmailPreferences & { verifyToken?: string; verifyTokenExpires?: string } = {
        ...prefs,
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      };
      delete verified.verifyToken;
      delete verified.verifyTokenExpires;
      this.emailPreferences.set(key, verified);
      return verified;
    }
    return undefined;
  }

  getCategorySubscriptions(walletAddress: string): string[] {
    const direct = this.categorySubscriptions.get(walletAddress);
    if (direct) return [...direct];
    for (const [key, cats] of this.categorySubscriptions) {
      if (key.toLowerCase() === walletAddress.toLowerCase()) return [...cats];
    }
    return [];
  }

  setCategorySubscriptions(walletAddress: string, categories: string[]): string[] {
    this.categorySubscriptions.set(walletAddress, new Set(categories));
    return categories;
  }

  getCategorySubscribers(category: string): string[] {
    const wallets: string[] = [];
    for (const [wallet, cats] of this.categorySubscriptions) {
      if (cats.has(category)) wallets.push(wallet);
    }
    return wallets;
  }

  getSubmissions(bountyId?: string): Submission[] {
    let results = Array.from(this.submissions.values());
    if (bountyId) results = results.filter((s) => s.bountyId === bountyId);
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getSubmissionById(id: string): Submission | undefined {
    return this.submissions.get(id);
  }

  createSubmission(data: Omit<Submission, "id" | "createdAt" | "updatedAt" | "status">): Submission {
    const now = new Date().toISOString();
    const submission: Submission = {
      ...data,
      id: generateId(),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    this.submissions.set(submission.id, submission);

    const bounty = this.bounties.get(data.bountyId);
    if (bounty) {
      this.bounties.set(data.bountyId, {
        ...bounty,
        submissionCount: (bounty.submissionCount ?? 0) + 1,
        status: bounty.status === "open" ? "submitted" : bounty.status,
        updatedAt: now,
      });
    }

    return submission;
  }

  updateSubmission(id: string, data: Partial<Submission>): Submission | undefined {
    const existing = this.submissions.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    this.submissions.set(id, updated);
    return updated;
  }
}

declare global {
  var bountyStore: BountyStore | undefined;
}

export const store = globalThis.bountyStore ?? new BountyStore();

if (process.env.NODE_ENV !== "production") {
  globalThis.bountyStore = store;
}
