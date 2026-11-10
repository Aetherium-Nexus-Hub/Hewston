import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  email: string;
  nodeRole?: string;
  nodeLoc?: string;
  securityQuestion: string;
  securityAnswerHash: string;
}

export interface Docket {
  id: string;
  title: string;
  status: "ACTIVE" | "RESOLVED" | "CONTAINED";
  timestamp: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  resolvedBy?: string;
}

export interface AiAuditRecord {
  id: string;
  timestamp: string;
  operator: string;
  focus: string;
  divergenceScore: number;
  status: "OPTIMAL" | "ELEVATED_RISK" | "CRITICAL";
  summary: string;
  recommendations: string[];
  mitigationProtocol: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  details: string;
  severity: "INFO" | "WARN" | "CRITICAL";
}

export interface ObservxStoreData {
  users: User[];
  dockets: Docket[];
  aiAudits: AiAuditRecord[];
  auditLogs: AuditLog[];
  systemMetrics: {
    latticeSymmetry: string;
    divergenceScore: number;
    vesselAero: string;
    protocolVersion: string;
    lastAuditTimestamp: string;
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "observx-db.json");

function getDefaultData(): ObservxStoreData {
  return {
    users: [
      {
        id: "user-admin",
        username: "admin",
        passwordHash: bcrypt.hashSync("admin123", 10),
        createdAt: new Date().toISOString(),
        email: "admin@observx.io",
        nodeRole: "System Auditor",
        nodeLoc: "Core Lattice-01",
        securityQuestion: "What is your first terminal?",
        securityAnswerHash: bcrypt.hashSync("termux", 10),
      },
    ],
    dockets: [
      {
        id: "docket-1",
        title: "Termux auto-sync secured validation",
        status: "ACTIVE",
        timestamp: new Date().toISOString(),
        priority: "HIGH",
      },
      {
        id: "docket-2",
        title: "Paralegal protocol locked under token: JWT_HS256",
        status: "ACTIVE",
        timestamp: new Date().toISOString(),
        priority: "NORMAL",
      },
      {
        id: "docket-3",
        title: "Kinetic rule coherence verification",
        status: "ACTIVE",
        timestamp: new Date().toISOString(),
        priority: "NORMAL",
      },
    ],
    aiAudits: [],
    auditLogs: [
      {
        id: "log-init",
        timestamp: new Date().toISOString(),
        operator: "system",
        action: "STORE_INIT",
        details: "ObservX persistent data store initialized with baseline telemetry.",
        severity: "INFO",
      },
    ],
    systemMetrics: {
      latticeSymmetry: "PERFECT",
      divergenceScore: 0.02,
      vesselAero: "ACTIVE_SECURED",
      protocolVersion: "2.5.0-KINETIC",
      lastAuditTimestamp: new Date().toISOString(),
    },
  };
}

class ObservxStore {
  private data: ObservxStoreData;

  constructor() {
    this.data = this.load();
  }

  private load(): ObservxStoreData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(content);
        // Ensure all required fields exist
        const defaults = getDefaultData();
        return {
          users: parsed.users || defaults.users,
          dockets: parsed.dockets || defaults.dockets,
          aiAudits: parsed.aiAudits || defaults.aiAudits,
          auditLogs: parsed.auditLogs || defaults.auditLogs,
          systemMetrics: { ...defaults.systemMetrics, ...(parsed.systemMetrics || {}) },
        };
      }
    } catch (err) {
      console.error("[Store] Failed to read database, initializing default:", err);
    }

    const defaultData = getDefaultData();
    this.persist(defaultData);
    return defaultData;
  }

  private persist(dataToSave: ObservxStoreData = this.data) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), "utf-8");
    } catch (err) {
      console.error("[Store] Failed to write database to disk:", err);
    }
  }

  // User Methods
  public getUsers(): User[] {
    return this.data.users;
  }

  public findUserByUsername(username: string): User | undefined {
    return this.data.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
  }

  public addUser(user: User) {
    this.data.users.push(user);
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      operator: user.username,
      action: "USER_REGISTERED",
      details: `New operator registered under nodeRole: ${user.nodeRole || "Unassigned"}`,
      severity: "INFO",
    });
    this.persist();
  }

  public updateUser(username: string, updates: Partial<User>): User | undefined {
    const user = this.findUserByUsername(username);
    if (!user) return undefined;

    Object.assign(user, updates);
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      operator: username,
      action: "USER_PROFILE_UPDATED",
      details: `Operator node profile updated`,
      severity: "INFO",
    });
    this.persist();
    return user;
  }

  // Dockets Methods
  public getDockets(): Docket[] {
    return this.data.dockets;
  }

  public addDocket(title: string, priority: Docket["priority"] = "NORMAL"): Docket {
    const newDocket: Docket = {
      id: `docket-${Date.now()}`,
      title,
      status: "ACTIVE",
      timestamp: new Date().toISOString(),
      priority,
    };
    this.data.dockets.unshift(newDocket);
    this.persist();
    return newDocket;
  }

  public resolveDocket(id: string, operator: string): Docket | undefined {
    const docket = this.data.dockets.find((d) => d.id === id);
    if (!docket) return undefined;

    docket.status = "RESOLVED";
    docket.resolvedBy = operator;
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      operator,
      action: "DOCKET_RESOLVED",
      details: `Resolved docket: ${docket.title}`,
      severity: "INFO",
    });
    this.persist();
    return docket;
  }

  // AI Audits Methods
  public getAiAudits(): AiAuditRecord[] {
    return this.data.aiAudits;
  }

  public addAiAudit(record: AiAuditRecord) {
    this.data.aiAudits.unshift(record);
    // Keep max 50 audit records
    if (this.data.aiAudits.length > 50) {
      this.data.aiAudits = this.data.aiAudits.slice(0, 50);
    }
    this.data.systemMetrics.lastAuditTimestamp = record.timestamp;
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: record.timestamp,
      operator: record.operator,
      action: "AI_AUDIT_COMPLETED",
      details: `Status: ${record.status} (Divergence: ${record.divergenceScore.toFixed(3)})`,
      severity: record.status === "CRITICAL" ? "CRITICAL" : record.status === "ELEVATED_RISK" ? "WARN" : "INFO",
    });
    this.persist();
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  public addAuditLog(entry: AuditLog) {
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 100) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 100);
    }
  }

  // System Metrics
  public getMetrics() {
    return this.data.systemMetrics;
  }

  public updateDivergenceScore(score: number) {
    this.data.systemMetrics.divergenceScore = Math.max(0.001, Math.min(1.0, score));
    this.persist();
  }
}

export const db = new ObservxStore();
