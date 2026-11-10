import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import { db, User, Docket, AiAuditRecord } from "./server-store";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "observx-kinetic-secret-2026";

// Initialize Gemini client according to the modern @google/genai SDK guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// JWT Authentication Middleware
const authenticateToken = (req: any, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired access token" });
    }
    req.user = decoded;
    next();
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Authentication Routes (Backed by persistent db) ---

  // User Registration
  app.post("/api/register", (req, res) => {
    const { username, password, email, securityQuestion, securityAnswer, nodeRole, nodeLoc } = req.body;

    if (!username || !password || !email || !securityQuestion || !securityAnswer) {
      return res.status(400).json({ error: "Username, password, email, security question, and answer are required" });
    }

    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: "Username must be >= 3 chars, password >= 6 chars" });
    }

    const existingUser = db.findUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: "Username already exists" });
    }

    try {
      const passwordHash = bcrypt.hashSync(password, 10);
      const securityAnswerHash = bcrypt.hashSync(securityAnswer.toLowerCase().trim(), 10);
      const newUser: User = {
        id: `user-${Date.now()}`,
        username,
        passwordHash,
        createdAt: new Date().toISOString(),
        email,
        nodeRole: nodeRole || "Infrastructure Officer",
        nodeLoc: nodeLoc || "Remote Ingress",
        securityQuestion,
        securityAnswerHash,
      };

      db.addUser(newUser);

      const token = jwt.sign(
        { id: newUser.id, username: newUser.username },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.status(201).json({
        success: true,
        message: "User registered and persisted to ObservX database",
        token,
        user: { username: newUser.username },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to securely register user" });
    }
  });

  // User Login
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    try {
      const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        success: true,
        message: "Authentication successful",
        token,
        user: { username: user.username },
      });
    } catch (error) {
      res.status(500).json({ error: "Authentication processing failed" });
    }
  });

  // Check Username recovery question
  app.post("/api/forgot-password-check", (req, res) => {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    const user = db.findUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: "Username not registered in the grid" });
    }
    res.json({
      username: user.username,
      securityQuestion: user.securityQuestion,
    });
  });

  // Reset Password using Recovery Question
  app.post("/api/reset-password", (req, res) => {
    const { username, securityAnswer, newPassword } = req.body;
    if (!username || !securityAnswer || !newPassword) {
      return res.status(400).json({ error: "All recovery parameters are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be >= 6 characters" });
    }
    const user = db.findUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: "Username not found" });
    }
    try {
      const isAnswerValid = bcrypt.compareSync(securityAnswer.toLowerCase().trim(), user.securityAnswerHash);
      if (!isAnswerValid) {
        return res.status(401).json({ error: "Incorrect security recovery answer" });
      }
      db.updateUser(username, {
        passwordHash: bcrypt.hashSync(newPassword, 10),
      });
      res.json({
        success: true,
        message: "Password reset completed successfully. Please login.",
      });
    } catch (error) {
      res.status(500).json({ error: "Reset cryptographic validation failed" });
    }
  });

  // GET User Profile details
  app.get("/api/profile", authenticateToken, (req: any, res) => {
    const user = db.findUserByUsername(req.user.username);
    if (!user) {
      return res.status(404).json({ error: "User profile not found" });
    }
    res.json({
      username: user.username,
      email: user.email,
      nodeRole: user.nodeRole,
      nodeLoc: user.nodeLoc,
      createdAt: user.createdAt,
      securityQuestion: user.securityQuestion,
    });
  });

  // PUT Update User Profile details
  app.put("/api/profile", authenticateToken, (req: any, res) => {
    const { email, nodeRole, nodeLoc, securityQuestion, securityAnswer } = req.body;
    const user = db.findUserByUsername(req.user.username);
    if (!user) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const updates: Partial<User> = {};
    if (email) updates.email = email;
    if (nodeRole) updates.nodeRole = nodeRole;
    if (nodeLoc) updates.nodeLoc = nodeLoc;
    if (securityQuestion && securityAnswer) {
      updates.securityQuestion = securityQuestion;
      updates.securityAnswerHash = bcrypt.hashSync(securityAnswer.toLowerCase().trim(), 10);
    }

    const updatedUser = db.updateUser(req.user.username, updates);

    res.json({
      success: true,
      message: "Node profile updated and persisted",
      profile: {
        username: updatedUser?.username,
        email: updatedUser?.email,
        nodeRole: updatedUser?.nodeRole,
        nodeLoc: updatedUser?.nodeLoc,
        createdAt: updatedUser?.createdAt,
        securityQuestion: updatedUser?.securityQuestion,
      },
    });
  });

  // POST Change Password
  app.post("/api/profile/change-password", authenticateToken, (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new passwords are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be >= 6 characters" });
    }

    const user = db.findUserByUsername(req.user.username);
    if (!user) {
      return res.status(404).json({ error: "User profile not found" });
    }

    try {
      const isPasswordValid = bcrypt.compareSync(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Incorrect current password" });
      }

      db.updateUser(req.user.username, {
        passwordHash: bcrypt.hashSync(newPassword, 10),
      });

      res.json({
        success: true,
        message: "Password changed and persisted successfully",
      });
    } catch (error) {
      res.status(500).json({ error: "Cryptographic state transition error" });
    }
  });

  // User Logout
  app.post("/api/logout", (req, res) => {
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  });

  // Public Endpoint
  app.get("/api/hello", (req, res) => {
    res.json({
      message: "Hello from the ObservX public server!",
      timestamp: new Date().toISOString(),
      status: "success",
      dbStatus: "PERSISTENT_ONLINE",
    });
  });

  // Telemetry Snapshot Endpoint
  app.get("/api/telemetry", authenticateToken, (req: any, res) => {
    const metrics = db.getMetrics();
    const dockets = db.getDockets();
    const activeDockets = dockets.filter((d) => d.status === "ACTIVE").map((d) => d.title);

    res.json({
      status: "SECURE",
      authUsername: req.user.username,
      nodeId: req.user.id,
      timestamp: new Date().toISOString(),
      kernelDiagnostics: {
        latticeSymmetry: metrics.latticeSymmetry,
        divergenceScore: metrics.divergenceScore,
        vesselAero: metrics.vesselAero,
        securedLogCount: db.getAuditLogs().length,
        protocolVersion: metrics.protocolVersion,
      },
      activeDockets,
      persistence: "DATA_STORE_ACTIVE",
    });
  });

  // --- Real-Time Telemetry Streaming via Server-Sent Events (SSE) ---
  app.get("/api/telemetry/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const sendTelemetryUpdate = () => {
      const metrics = db.getMetrics();
      const activeCount = db.getDockets().filter((d) => d.status === "ACTIVE").length;

      // Subtle organic quantum variation on the divergence score for live dynamics
      const microJitter = (Math.random() - 0.5) * 0.004;
      const liveDivergence = Math.max(0.005, Number((metrics.divergenceScore + microJitter).toFixed(4)));
      const clusterThroughput = Number((14.2 + (Math.random() * 1.8)).toFixed(2));
      const quantumEntropy = Number((98.2 + (Math.random() * 1.5)).toFixed(2));

      const payload = {
        type: "TELEMETRY_PULSE",
        timestamp: new Date().toISOString(),
        latticeSymmetry: metrics.latticeSymmetry,
        divergenceScore: liveDivergence,
        vesselAero: metrics.vesselAero,
        activeDocketsCount: activeCount,
        clusterThroughput,
        quantumEntropy,
        persistenceOnline: true,
        protocolVersion: metrics.protocolVersion,
        activeOperators: db.getUsers().length,
      };

      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    sendTelemetryUpdate();
    const intervalId = setInterval(sendTelemetryUpdate, 2000);

    req.on("close", () => {
      clearInterval(intervalId);
      res.end();
    });
  });

  // --- Docket Operations (Persistent) ---
  app.get("/api/dockets", authenticateToken, (req, res) => {
    res.json({
      success: true,
      dockets: db.getDockets(),
    });
  });

  app.post("/api/dockets", authenticateToken, (req: any, res) => {
    const { title, priority } = req.body;
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "Docket title is required" });
    }
    const newDocket = db.addDocket(title.trim(), priority || "NORMAL");
    res.status(201).json({
      success: true,
      docket: newDocket,
    });
  });

  app.post("/api/dockets/:id/resolve", authenticateToken, (req: any, res) => {
    const docket = db.resolveDocket(req.params.id, req.user.username);
    if (!docket) {
      return res.status(404).json({ error: "Docket not found" });
    }
    res.json({
      success: true,
      docket,
    });
  });

  // --- Gemini AI Telemetry Audit Endpoint ---
  app.get("/api/telemetry/ai-audits", authenticateToken, (req, res) => {
    res.json({
      success: true,
      audits: db.getAiAudits(),
    });
  });

  app.post("/api/telemetry/ai-audit", authenticateToken, async (req: any, res) => {
    const { focus, customDirectives } = req.body;
    const metrics = db.getMetrics();
    const dockets = db.getDockets();
    const activeDockets = dockets.filter((d) => d.status === "ACTIVE");

    const auditContext = {
      timestamp: new Date().toISOString(),
      operator: req.user.username,
      focus: focus || "Full Lattice & Cosmic Telemetry Assessment",
      metrics,
      activeDocketsCount: activeDockets.length,
      activeDocketsList: activeDockets.map((d) => `${d.title} (Priority: ${d.priority})`),
      totalRegisteredNodes: db.getUsers().length,
    };

    let auditResult: {
      status: "OPTIMAL" | "ELEVATED_RISK" | "CRITICAL";
      summary: string;
      divergenceScore: number;
      recommendations: string[];
      mitigationProtocol: string;
      source: "gemini-3.8-flash" | "heuristic_engine";
    };

    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are the ObservX Infrastructure AI Auditor. Analyze the following cosmic telemetry snapshot and security context:
${JSON.stringify(auditContext, null, 2)}

User Custom Directives: ${customDirectives || "None provided. Run full baseline kinetic rule evaluation."}

Return a valid JSON object strictly matching this schema:
{
  "status": "OPTIMAL" | "ELEVATED_RISK" | "CRITICAL",
  "summary": "Concise 2-3 sentence analysis of lattice symmetry, divergence scores, and docket bottlenecks.",
  "divergenceScore": <number between 0.01 and 0.25>,
  "recommendations": [
    "Directive 1: Concrete action to maintain lattice coherence",
    "Directive 2: Mitigation or synchronization protocol",
    "Directive 3: Security hygiene or token policy instruction"
  ],
  "mitigationProtocol": "Single terminal-style kinetic protocol command (e.g. 'observx-lattice-realign --sync-all --strict-mode')"
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        const text = response.text || "{}";
        const parsed = JSON.parse(text);

        auditResult = {
          status: ["OPTIMAL", "ELEVATED_RISK", "CRITICAL"].includes(parsed.status)
            ? parsed.status
            : "OPTIMAL",
          summary: parsed.summary || "Lattice coherence is stable across all Termux ingress nodes.",
          divergenceScore: typeof parsed.divergenceScore === "number" ? parsed.divergenceScore : metrics.divergenceScore,
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [
            "Maintain current token TTL window (24h)",
            "Automate periodic sync pulses for Termux node ingress",
            "Monitor active docket resolution velocity",
          ],
          mitigationProtocol: parsed.mitigationProtocol || "observx-lattice-sync --kinetic-enforce",
          source: "gemini-3.8-flash",
        };
      } catch (geminiError: any) {
        console.error("[Gemini Audit] API execution error, falling back to heuristic engine:", geminiError);
        auditResult = createHeuristicAudit(auditContext, metrics);
      }
    } else {
      auditResult = createHeuristicAudit(auditContext, metrics);
    }

    // Persist new AI audit record
    const record: AiAuditRecord = {
      id: `ai-audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      operator: req.user.username,
      focus: focus || "Cosmic Telemetry Assessment",
      divergenceScore: auditResult.divergenceScore,
      status: auditResult.status,
      summary: auditResult.summary,
      recommendations: auditResult.recommendations,
      mitigationProtocol: auditResult.mitigationProtocol,
    };

    db.addAiAudit(record);
    db.updateDivergenceScore(auditResult.divergenceScore);

    res.json({
      success: true,
      audit: record,
      source: auditResult.source,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Audit Logs endpoint
  app.get("/api/audit-logs", authenticateToken, (req, res) => {
    res.json({
      success: true,
      logs: db.getAuditLogs(),
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

function createHeuristicAudit(context: any, metrics: any) {
  const isHighRisk = metrics.divergenceScore > 0.08 || context.activeDocketsCount > 4;
  return {
    status: isHighRisk ? ("ELEVATED_RISK" as const) : ("OPTIMAL" as const),
    summary: `Kinetic audit evaluated ${context.activeDocketsCount} active dockets across ${context.totalRegisteredNodes} lattice nodes. Divergence score remains within acceptable operational tolerances.`,
    divergenceScore: Math.max(0.012, Number((metrics.divergenceScore + (Math.random() - 0.5) * 0.005).toFixed(4))),
    recommendations: [
      "Rule 1: Maintain the Lattice — verify Termux mobile endpoints every 6 hours",
      "Rule 2: Clear Bottlenecks — resolve outstanding validation dockets",
      "Rule 3: No Narrative Bleed — preserve cryptographic tokens without state leakage",
    ],
    mitigationProtocol: "observx-kinetic-audit --verify-symmetry --enforce-rules",
    source: "heuristic_engine" as const,
  };
}

startServer();
