import {
  PlaidApi,
  Configuration,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";
import type { Express } from "express";
import { storage } from "./storage";

function getPlaidClient() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const envName = (process.env.PLAID_ENV || "development") as keyof typeof PlaidEnvironments;

  if (!clientId || !secret) return null;

  const config = new Configuration({
    basePath: PlaidEnvironments[envName] ?? PlaidEnvironments.development,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });
  return new PlaidApi(config);
}

// Map Plaid account subtype to McPlanny account type
function mapAccountType(type: string, subtype: string | null | undefined): string {
  const sub = (subtype || "").toLowerCase();
  if (sub === "401k") return "401k";
  if (sub === "roth 401k" || sub === "roth_401k") return "roth_401k";
  if (sub === "403b") return "403b";
  if (sub === "457b") return "457b";
  if (sub === "roth ira" || sub === "roth_ira" || sub === "roth") return "roth_ira";
  if (sub === "ira" || sub === "traditional ira") return "traditional_ira";
  if (sub === "hsa") return "hsa";
  if (sub === "brokerage") return "brokerage";
  if (sub === "checking") return "checking";
  if (sub === "savings") return "savings";
  if (type === "investment") return "brokerage";
  if (type === "depository") return "checking";
  return "brokerage";
}

function requireAuth(req: any, res: any, next: any) {
  if (!(req as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

export function registerPlaidRoutes(app: Express, authMiddleware: any) {
  // Check if Plaid is configured
  app.get("/api/plaid/status", authMiddleware, (_req, res) => {
    const configured = !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
    res.json({ configured, env: process.env.PLAID_ENV || "development" });
  });

  // Create Link Token — initiates the Plaid Link flow in the browser
  app.post("/api/plaid/create-link-token", authMiddleware, async (req, res) => {
    const plaid = getPlaidClient();
    if (!plaid) return res.status(503).json({ error: "Plaid not configured. Add PLAID_CLIENT_ID and PLAID_SECRET." });

    const userId = (req as any).userId;
    try {
      const response = await plaid.linkTokenCreate({
        user: { client_user_id: String(userId) },
        client_name: "McPlanny",
        products: [Products.Investments],
        country_codes: [CountryCode.Us],
        language: "en",
      });
      res.json({ link_token: response.data.link_token });
    } catch (err: any) {
      const msg = err?.response?.data?.error_message || err.message || "Plaid error";
      res.status(500).json({ error: msg });
    }
  });

  // Exchange public token → access token, save connection
  app.post("/api/plaid/exchange-token", authMiddleware, async (req, res) => {
    const plaid = getPlaidClient();
    if (!plaid) return res.status(503).json({ error: "Plaid not configured." });

    const userId = (req as any).userId;
    const { public_token, institution_id, institution_name } = req.body;
    if (!public_token) return res.status(400).json({ error: "public_token required" });

    try {
      const exchangeRes = await plaid.itemPublicTokenExchange({ public_token });
      const { access_token, item_id } = exchangeRes.data;

      const plan = await storage.getPlanByUserId(userId);
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      const conn = await storage.createPlaidConnection({
        planId: plan.id,
        accessToken: access_token,
        itemId: item_id,
        institutionId: institution_id || null,
        institutionName: institution_name || null,
        lastSynced: null,
      });

      res.json(conn);
    } catch (err: any) {
      const msg = err?.response?.data?.error_message || err.message || "Plaid error";
      res.status(500).json({ error: msg });
    }
  });

  // List all connections for the current user's plan
  app.get("/api/plaid/connections", authMiddleware, async (req, res) => {
    const userId = (req as any).userId;
    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.json([]);
    const conns = await storage.getPlaidConnectionsByPlanId(plan.id);
    // Don't expose access tokens to the client
    res.json(conns.map(c => ({
      id: c.id,
      institutionName: c.institutionName,
      institutionId: c.institutionId,
      lastSynced: c.lastSynced,
      createdAt: c.createdAt,
    })));
  });

  // Delete a connection
  app.delete("/api/plaid/connections/:id", authMiddleware, async (req, res) => {
    const plaid = getPlaidClient();
    const connId = parseInt(req.params.id);
    const conn = await storage.getPlaidConnectionById(connId);
    if (!conn) return res.status(404).json({ error: "Connection not found" });

    // Try to remove item from Plaid (best effort)
    if (plaid) {
      try {
        await plaid.itemRemove({ access_token: conn.accessToken });
      } catch (_) {}
    }

    await storage.deletePlaidConnection(connId);
    res.json({ success: true });
  });

  // Sync holdings from a single connection into accounts + positions
  app.post("/api/plaid/sync/:id", authMiddleware, async (req, res) => {
    const plaid = getPlaidClient();
    if (!plaid) return res.status(503).json({ error: "Plaid not configured." });

    const userId = (req as any).userId;
    const connId = parseInt(req.params.id);
    const conn = await storage.getPlaidConnectionById(connId);
    if (!conn) return res.status(404).json({ error: "Connection not found" });

    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    try {
      const holdingsRes = await plaid.investmentsHoldingsGet({ access_token: conn.accessToken });
      const { accounts: plaidAccounts, holdings, securities } = holdingsRes.data;

      const securitiesMap = new Map(securities.map(s => [s.security_id, s]));
      let newPositions = 0;
      let updatedPositions = 0;
      let accountsSynced = 0;

      for (const plaidAcct of plaidAccounts) {
        // Find or create a matching McPlanny account
        let mcAccount = await storage.getAccountByPlaidAccountId(plan.id, plaidAcct.account_id);

        const accountType = mapAccountType(plaidAcct.type, plaidAcct.subtype);
        const accountName = `${conn.institutionName || "Linked"} — ${plaidAcct.name || plaidAcct.official_name || "Account"}`;
        const balance = plaidAcct.balances?.current || 0;

        if (!mcAccount) {
          mcAccount = await storage.createAccount({
            planId: plan.id,
            owner: "primary",
            accountType,
            name: accountName,
            balance,
            rateOfReturn: 6.0,
            assetAllocation: 60,
            annualContribution: 0,
            employerMatch: 0,
            employerMatchLimit: 0,
            plaidAccountId: plaidAcct.account_id,
            plaidItemId: conn.itemId,
          });
          accountsSynced++;
        } else {
          await storage.updateAccount(mcAccount.id, {
            balance,
            plaidItemId: conn.itemId,
          });
        }

        // Get holdings for this account
        const acctHoldings = holdings.filter(h => h.account_id === plaidAcct.account_id);

        // Get existing positions for this account
        const existingPositions = await storage.getPositionsByAccountId(mcAccount.id);
        const existingByTicker = new Map(existingPositions.map(p => [p.ticker.toUpperCase(), p]));

        for (const holding of acctHoldings) {
          const security = securitiesMap.get(holding.security_id);
          if (!security) continue;

          const ticker = (security.ticker_symbol || security.name || "UNKNOWN").toUpperCase();
          const companyName = security.name || undefined;
          const shares = holding.quantity || 0;
          const currentPrice = security.close_price || holding.institution_price || 0;
          const costBasisPerShare = holding.cost_basis != null && shares > 0
            ? holding.cost_basis / shares
            : 0;

          const existing = existingByTicker.get(ticker);
          if (existing) {
            await storage.updatePosition(existing.id, {
              shares,
              currentPrice,
              costBasisPerShare: costBasisPerShare || existing.costBasisPerShare,
              companyName: companyName || existing.companyName,
            });
            updatedPositions++;
          } else {
            await storage.createPosition({
              planId: plan.id,
              accountId: mcAccount.id,
              ticker,
              companyName,
              shares,
              costBasisPerShare,
              currentPrice,
            });
            newPositions++;
          }
        }
      }

      // Update lastSynced timestamp
      await storage.updatePlaidConnection(conn.id, {
        lastSynced: new Date().toISOString(),
      });

      res.json({
        success: true,
        accountsSynced,
        newPositions,
        updatedPositions,
        message: `Synced ${plaidAccounts.length} account(s), ${newPositions} new + ${updatedPositions} updated positions`,
      });
    } catch (err: any) {
      const plaidErr = err?.response?.data;
      const msg = plaidErr?.error_message || plaidErr?.display_message || err.message || "Sync failed";
      const code = plaidErr?.error_code;
      res.status(500).json({ error: msg, code });
    }
  });

  // Sync all connections for the user
  app.post("/api/plaid/sync-all", authMiddleware, async (req, res) => {
    const userId = (req as any).userId;
    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const conns = await storage.getPlaidConnectionsByPlanId(plan.id);
    const results = [];

    for (const conn of conns) {
      try {
        // Forward to sync endpoint logic inline
        const syncReq = { ...req, params: { id: String(conn.id) } };
        results.push({ id: conn.id, institution: conn.institutionName, status: "queued" });
      } catch (_) {
        results.push({ id: conn.id, institution: conn.institutionName, status: "failed" });
      }
    }

    res.json({ connections: conns.length, message: "Use individual sync endpoints per connection." });
  });
}
