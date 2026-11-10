import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Rocket, 
  Server, 
  Layout, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  FileCode,
  Settings,
  Terminal as TerminalIcon,
  Activity,
  Lock,
  Unlock,
  User,
  LogOut,
  Key,
  ShieldCheck,
  HelpCircle,
  Mail,
  MapPin,
  Check,
  Sparkles,
  Radio,
  Database,
  ListTodo,
  Copy,
  Layers
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface StatusData {
  message: string;
  timestamp: string;
  status: string;
  dbStatus?: string;
}

interface UserData {
  username: string;
  token: string;
}

interface LiveStreamPacket {
  type: string;
  timestamp: string;
  latticeSymmetry: string;
  divergenceScore: number;
  vesselAero: string;
  activeDocketsCount: number;
  clusterThroughput: number;
  quantumEntropy: number;
  persistenceOnline: boolean;
  protocolVersion: string;
  activeOperators: number;
}

interface Docket {
  id: string;
  title: string;
  status: "ACTIVE" | "RESOLVED" | "CONTAINED";
  timestamp: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  resolvedBy?: string;
}

interface AiAuditRecord {
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

interface AuditLog {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  details: string;
  severity: "INFO" | "WARN" | "CRITICAL";
}

export default function App() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState<"ledger" | "ai-audit" | "dockets" | "profile">("ledger");

  // Authentication States
  const [user, setUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem("observx_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authNodeRole, setAuthNodeRole] = useState("");
  const [authNodeLoc, setAuthNodeLoc] = useState("");
  const [authSecurityQuestion, setAuthSecurityQuestion] = useState("What is your first terminal?");
  const [authSecurityAnswer, setAuthSecurityAnswer] = useState("");

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Recovery states
  const [recoveryUsername, setRecoveryUsername] = useState("");
  const [recoveryQuestion, setRecoveryQuestion] = useState("");
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);

  // Secure Telemetry Snapshot
  const [telemetry, setTelemetry] = useState<any | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  // Real-Time SSE Stream State
  const [streamConnected, setStreamConnected] = useState(false);
  const [liveStream, setLiveStream] = useState<LiveStreamPacket | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Profile Management States
  const [profile, setProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editNodeRole, setEditNodeRole] = useState("");
  const [editNodeLoc, setEditNodeLoc] = useState("");
  const [editSecurityQuestion, setEditSecurityQuestion] = useState("What is your first terminal?");
  const [editSecurityAnswer, setEditSecurityAnswer] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newProfilePassword, setNewProfilePassword] = useState("");

  // Latency Monitoring States
  const [latencyHistory, setLatencyHistory] = useState<{ time: string; latency: number }[]>([]);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [pingTarget, setPingTarget] = useState<"telemetry" | "hello">("telemetry");
  const [isPinging, setIsPinging] = useState(false);

  // Gemini AI Audit States
  const [aiAuditLoading, setAiAuditLoading] = useState(false);
  const [aiAuditError, setAiAuditError] = useState<string | null>(null);
  const [latestAiAudit, setLatestAiAudit] = useState<AiAuditRecord | null>(null);
  const [aiAuditHistory, setAiAuditHistory] = useState<AiAuditRecord[]>([]);
  const [aiFocusPreset, setAiFocusPreset] = useState("Full Lattice & Cosmic Telemetry Assessment");
  const [customAiPrompt, setCustomAiPrompt] = useState("");
  const [copiedProtocol, setCopiedProtocol] = useState(false);

  // Dockets and Persistent Database States
  const [docketsList, setDocketsList] = useState<Docket[]>([]);
  const [docketsLoading, setDocketsLoading] = useState(false);
  const [newDocketTitle, setNewDocketTitle] = useState("");
  const [newDocketPriority, setNewDocketPriority] = useState<Docket["priority"]>("NORMAL");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Real-Time SSE EventSource listener
  useEffect(() => {
    const es = new EventSource("/api/telemetry/stream");
    eventSourceRef.current = es;

    es.onopen = () => {
      setStreamConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "TELEMETRY_PULSE") {
          setLiveStream(parsed);
          setStreamConnected(true);
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    es.onerror = () => {
      setStreamConnected(false);
    };

    return () => {
      es.close();
    };
  }, []);

  // Fetch Public Status
  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/hello");
      if (!response.ok) throw new Error("Failed to connect to server");
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "System unreachable");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Protected Telemetry
  const fetchTelemetry = async (tokenOverride?: string) => {
    const activeToken = tokenOverride || user?.token;
    if (!activeToken) return;

    setTelemetryLoading(true);
    setTelemetryError(null);
    try {
      const response = await fetch("/api/telemetry", {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        throw new Error("Session expired. Please log in again.");
      }
      if (!response.ok) {
        throw new Error("Failed to authenticate or retrieve telemetry packet.");
      }

      const json = await response.json();
      setTelemetry(json);
    } catch (err) {
      setTelemetryError(err instanceof Error ? err.message : "Telemetry downlink failure.");
    } finally {
      setTelemetryLoading(false);
    }
  };

  // Fetch Profile
  const fetchProfile = async (tokenOverride?: string) => {
    const activeToken = tokenOverride || user?.token;
    if (!activeToken) return;

    setProfileLoading(true);
    try {
      const response = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (!response.ok) throw new Error("Could not retrieve node profile details");
      const dataJson = await response.json();
      setProfile(dataJson);
      setEditEmail(dataJson.email || "");
      setEditNodeRole(dataJson.nodeRole || "");
      setEditNodeLoc(dataJson.nodeLoc || "");
      setEditSecurityQuestion(dataJson.securityQuestion || "What is your first terminal?");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Profile context download failure");
    } finally {
      setProfileLoading(false);
    }
  };

  // Fetch Dockets
  const fetchDockets = async (tokenOverride?: string) => {
    const activeToken = tokenOverride || user?.token;
    if (!activeToken) return;

    setDocketsLoading(true);
    try {
      const response = await fetch("/api/dockets", {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (response.ok) {
        const json = await response.json();
        setDocketsList(json.dockets || []);
      }
    } catch (err) {
      console.error("Failed to fetch dockets:", err);
    } finally {
      setDocketsLoading(false);
    }
  };

  // Fetch AI Audit History
  const fetchAiAudits = async (tokenOverride?: string) => {
    const activeToken = tokenOverride || user?.token;
    if (!activeToken) return;

    try {
      const response = await fetch("/api/telemetry/ai-audits", {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (response.ok) {
        const json = await response.json();
        setAiAuditHistory(json.audits || []);
        if (json.audits && json.audits.length > 0 && !latestAiAudit) {
          setLatestAiAudit(json.audits[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch AI audits:", err);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async (tokenOverride?: string) => {
    const activeToken = tokenOverride || user?.token;
    if (!activeToken) return;

    try {
      const response = await fetch("/api/audit-logs", {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (response.ok) {
        const json = await response.json();
        setAuditLogs(json.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    }
  };

  // Trigger Gemini AI Audit
  const handleTriggerAiAudit = async () => {
    if (!user?.token) return;
    setAiAuditLoading(true);
    setAiAuditError(null);
    try {
      const response = await fetch("/api/telemetry/ai-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          focus: aiFocusPreset,
          customDirectives: customAiPrompt || undefined,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to complete AI diagnostic audit");
      }

      const json = await response.json();
      setLatestAiAudit(json.audit);
      setAiAuditHistory((prev) => [json.audit, ...prev.filter((a) => a.id !== json.audit.id)]);
      fetchTelemetry();
      fetchAuditLogs();
    } catch (err) {
      setAiAuditError(err instanceof Error ? err.message : "AI audit diagnostic failed");
    } finally {
      setAiAuditLoading(false);
    }
  };

  // Add New Docket
  const handleCreateDocket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token || !newDocketTitle.trim()) return;

    try {
      const response = await fetch("/api/dockets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          title: newDocketTitle.trim(),
          priority: newDocketPriority,
        }),
      });

      if (response.ok) {
        setNewDocketTitle("");
        fetchDockets();
        fetchTelemetry();
      }
    } catch (err) {
      console.error("Failed to create docket:", err);
    }
  };

  // Resolve Docket
  const handleResolveDocket = async (id: string) => {
    if (!user?.token) return;
    try {
      const response = await fetch(`/api/dockets/${id}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (response.ok) {
        fetchDockets();
        fetchTelemetry();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error("Failed to resolve docket:", err);
    }
  };

  // Record latency measurement
  const recordLatency = (latencyMs: number) => {
    setLastLatency(latencyMs);
    const newHistoryItem = {
      time: new Date().toLocaleTimeString(),
      latency: latencyMs,
    };
    setLatencyHistory((prev) => {
      const updated = [...prev, newHistoryItem];
      return updated.length > 15 ? updated.slice(updated.length - 15) : updated;
    });
  };

  const handleManualPing = async () => {
    setIsPinging(true);
    const targetUrl = pingTarget === "telemetry" ? "/api/telemetry" : "/api/hello";
    const startTime = performance.now();
    try {
      const headers: HeadersInit = {};
      if (pingTarget === "telemetry" && user?.token) {
        headers["Authorization"] = `Bearer ${user.token}`;
      }
      const response = await fetch(targetUrl, { headers });
      const latencyMs = Math.round(performance.now() - startTime);
      recordLatency(latencyMs);
    } catch (e) {
      console.error("Ping error:", e);
    } finally {
      setIsPinging(false);
    }
  };

  // Profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          email: editEmail,
          nodeRole: editNodeRole,
          nodeLoc: editNodeLoc,
          securityQuestion: editSecurityQuestion,
          securityAnswer: editSecurityAnswer || undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed profile update.");
      setProfile(json.profile);
      setProfileSuccess(json.message || "Profile successfully updated.");
      setEditSecurityAnswer("");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Profile update failing");
    } finally {
      setProfileLoading(false);
    }
  };

  // Password rotation
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword: newProfilePassword,
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Password change failed");
      setProfileSuccess(json.message || "Password changed successfully.");
      setCurrentPassword("");
      setNewProfilePassword("");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Password alteration failing");
    } finally {
      setProfileLoading(false);
    }
  };

  // Password Recovery - Step 1
  const handleRecoveryQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const response = await fetch("/api/forgot-password-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: recoveryUsername }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "User search failed.");
      setRecoveryQuestion(json.securityQuestion);
      setRecoveryStep(2);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Challenge lookup failure");
    } finally {
      setAuthLoading(false);
    }
  };

  // Password Recovery - Step 2
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: recoveryUsername,
          securityAnswer: recoveryAnswer,
          newPassword: recoveryNewPassword,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Password reset failed.");
      setAuthSuccess("Password has been re-attested. Please login.");
      setAuthMode("login");
      setRecoveryStep(1);
      setRecoveryAnswer("");
      setRecoveryNewPassword("");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Verification failure");
    } finally {
      setAuthLoading(false);
    }
  };

  // User Logout
  const handleLogout = () => {
    localStorage.removeItem("observx_user");
    setUser(null);
    setTelemetry(null);
    setProfile(null);
    setActiveTab("ledger");
    fetch("/api/logout", { method: "POST" }).catch(() => {});
  };

  // Auth Submit (Login / Register)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    const endpoint = authMode === "login" ? "/api/login" : "/api/register";
    const payload =
      authMode === "login"
        ? { username: authUsername, password: authPassword }
        : {
            username: authUsername,
            password: authPassword,
            email: authEmail,
            nodeRole: authNodeRole,
            nodeLoc: authNodeLoc,
            securityQuestion: authSecurityQuestion,
            securityAnswer: authSecurityAnswer,
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Authentication failed.");
      }

      if (json.token && json.user) {
        const sessionUser = { username: json.user.username, token: json.token };
        localStorage.setItem("observx_user", JSON.stringify(sessionUser));
        setUser(sessionUser);
        setAuthSuccess(json.message || "Connected successfully.");
        setAuthUsername("");
        setAuthPassword("");
        setAuthEmail("");
        setAuthNodeRole("");
        setAuthNodeLoc("");
        setAuthSecurityAnswer("");
        fetchTelemetry(json.token);
        fetchProfile(json.token);
        fetchDockets(json.token);
        fetchAiAudits(json.token);
        fetchAuditLogs(json.token);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    if (user) {
      fetchTelemetry();
      fetchProfile();
      fetchDockets();
      fetchAiAudits();
      fetchAuditLogs();
    }
  }, [user?.token]);

  // Copy protocol command
  const handleCopyProtocol = (cmd: string) => {
    navigator.clipboard?.writeText(cmd);
    setCopiedProtocol(true);
    setTimeout(() => setCopiedProtocol(false), 2000);
  };

  // Display divergence score: prefer live stream if available
  const currentDivergence = liveStream?.divergenceScore ?? (telemetry?.kernelDiagnostics?.divergenceScore ?? 0.02);

  return (
    <div className="flex h-[100dvh] w-full bg-[#030308] text-foreground font-sans overflow-hidden relative">
      {/* Background Subtle Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/20 blur-[130px] rounded-full animate-pulse" />
        <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] bg-accent/10 blur-[120px] rounded-full" />
      </div>

      {/* Left Sidebar: Desktop Only */}
      <aside className="w-64 border-r border-border flex flex-col bg-[#050510]/90 backdrop-blur-xl shrink-0 hidden lg:flex z-10">
        <div className="h-12 flex items-center px-4 border-b border-border text-[10px] font-bold tracking-[0.3em] uppercase text-primary/90 gap-2 font-mono">
          <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span>ObservX Core Grid</span>
        </div>
        <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 px-3 py-1 text-[10px] text-muted-foreground font-bold tracking-wider uppercase opacity-60 font-mono">
            Lattice Nodes
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-primary/10 rounded text-foreground border border-primary/20 font-mono">
            <FileCode className="w-3.5 h-3.5 text-primary" /> ObservX-Core
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs opacity-60 font-mono">
            <FileCode className="w-3.5 h-3.5" /> The-Paralegal-
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs opacity-60 font-mono">
            <FileCode className="w-3.5 h-3.5" /> Hewston
          </div>

          <div className="flex items-center gap-2 px-3 py-1 text-[10px] text-muted-foreground mt-4 font-bold tracking-wider uppercase opacity-60 font-mono">
            Kinetic Rules
          </div>
          <div className="px-3 py-1 text-[11px] opacity-75 leading-tight text-white/90 font-mono">1. Maintain the Lattice</div>
          <div className="px-3 py-1 text-[11px] opacity-75 leading-tight text-white/90 font-mono">2. Clear Bottlenecks</div>
          <div className="px-3 py-1 text-[11px] opacity-75 leading-tight text-white/90 font-mono">3. No Narrative Bleed</div>

          <div className="pt-4 mt-4 border-t border-border/40 px-3 space-y-2">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider opacity-60 font-mono">Storage Architecture</div>
            <div className="flex items-center gap-2 text-[11px] text-[#10b981] font-mono bg-[#10b981]/5 px-2 py-1 rounded border border-[#10b981]/20">
              <Database className="w-3 h-3" />
              <span>observx-db.json</span>
            </div>
            <div className="text-[9px] text-muted-foreground leading-tight">
              State & dockets persist across server restarts.
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-card/20">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-accent tracking-widest font-mono">
            <span>Audit Protocol</span>
            <span className="flex items-center gap-1">v2.5 <Activity className="w-2.5 h-2.5" /></span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top Header: Desktop Tabs & Mobile Brand Bar */}
        <header className="h-12 border-b border-border flex items-center justify-between bg-[#080815]/95 backdrop-blur-md shrink-0 px-3 sm:px-4 z-20">
          {/* Brand & Mobile Title */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-white font-mono">
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
              <span>ObservX</span>
            </div>

            {/* Desktop Tabs */}
            <nav className="hidden sm:flex items-center gap-1 ml-4 h-full">
              <button 
                onClick={() => setActiveTab("ledger")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "ledger" ? "bg-primary/15 text-white border border-primary/30" : "text-muted-foreground hover:text-white"
                }`}
              >
                <Layout className="h-3.5 w-3.5" /> Ledger
              </button>

              <button 
                onClick={() => setActiveTab("ai-audit")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "ai-audit" ? "bg-primary/15 text-white border border-primary/30" : "text-muted-foreground hover:text-white"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" /> AI Audit
              </button>

              <button 
                onClick={() => setActiveTab("dockets")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "dockets" ? "bg-primary/15 text-white border border-primary/30" : "text-muted-foreground hover:text-white"
                }`}
              >
                <ListTodo className="h-3.5 w-3.5 text-yellow-400" /> Dockets
              </button>
              
              {user && (
                <button 
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === "profile" ? "bg-primary/15 text-white border border-primary/30" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" /> Profile
                </button>
              )}
            </nav>
          </div>
          
          {/* Right Header Status / User Action */}
          <div className="flex items-center gap-2">
            {/* Live SSE Stream Pulse Beacon */}
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider font-mono border ${
              streamConnected 
                ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30" 
                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
            }`}>
              <Radio className={`w-2.5 h-2.5 ${streamConnected ? "animate-pulse" : ""}`} />
              <span className="hidden xs:inline">{streamConnected ? "Live SSE" : "Reconnecting"}</span>
              <span className="xs:hidden">{streamConnected ? "LIVE" : "OFF"}</span>
            </div>

            {user ? (
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setActiveTab("profile")}
                  className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer transition-colors"
                >
                  <User className="w-2.5 h-2.5" />
                  <span className="max-w-[70px] truncate">{user.username}</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-1 sm:px-2 sm:py-0.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-3 h-3 text-red-400" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setActiveTab("ledger"); setAuthMode("login"); }}
                className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/25 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer"
              >
                <Lock className="w-2.5 h-2.5 animate-pulse" />
                <span>Attest</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Metric Gauges Bar: Compact, Responsive, Never Broken */}
        <section className="bg-[#050512] border-b border-border/60 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-mono overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-max">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground uppercase font-bold text-[9px] sm:text-[10px]">Divergence:</span>
              <span className={`font-bold px-1.5 py-0.2 rounded ${
                currentDivergence < 0.05 ? "bg-[#10b981]/15 text-[#10b981]" :
                currentDivergence < 0.10 ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"
              }`}>
                {currentDivergence.toFixed(4)}
              </span>
            </div>

            <div className="h-2.5 w-px bg-white/10" />

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground uppercase font-bold text-[9px] sm:text-[10px]">Lattice:</span>
              <span className="text-primary font-bold">{liveStream?.latticeSymmetry || "PERFECT"}</span>
            </div>

            <div className="h-2.5 w-px bg-white/10" />

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground uppercase font-bold text-[9px] sm:text-[10px]">Throughput:</span>
              <span className="text-accent font-semibold">{liveStream?.clusterThroughput ? `${liveStream.clusterThroughput} GB/s` : "14.8 GB/s"}</span>
            </div>

            <div className="h-2.5 w-px bg-white/10" />

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground uppercase font-bold text-[9px] sm:text-[10px]">Entropy:</span>
              <span className="text-foreground">{liveStream?.quantumEntropy ? `${liveStream.quantumEntropy}%` : "98.4%"}</span>
            </div>

            <div className="h-2.5 w-px bg-white/10" />

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground uppercase font-bold text-[9px] sm:text-[10px]">Dockets:</span>
              <span className="text-yellow-400 font-bold">{liveStream?.activeDocketsCount ?? (docketsList.filter(d => d.status === "ACTIVE").length || 3)}</span>
            </div>

            <div className="ml-auto flex items-center gap-1.5 text-muted-foreground text-[9px] sm:text-[10px]">
              <Database className="w-2.5 h-2.5 text-[#10b981]" />
              <span>Store: OK</span>
            </div>
          </div>
        </section>

        {/* Main Scrollable View with Mobile Bottom Padding */}
        <section className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gradient-to-br from-[#030308] to-[#050515] relative">
          <div className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto border-r border-border custom-scrollbar pb-24 sm:pb-8">
            <div className="max-w-4xl mx-auto">
              
              {/* TAB 1: INFRASTRUCTURE LEDGER */}
              {activeTab === "ledger" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                  <div className="mb-4 sm:mb-8">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-2 sm:mb-3 border border-accent/20">
                      <Activity className="w-2.5 h-2.5" /> Master Ledger
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-primary">
                      ObservX <br className="sm:hidden" />
                      <span className="italic font-normal opacity-90 font-serif">Infrastructure Notebook</span>
                    </h1>
                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-xl">
                      Centralized command shell for Android Termux pipelines and remote foundation management. 
                      Streamlined real-time audits with persistent local ledger.
                    </p>
                  </div>

                  {/* Responsive Status Cards: Compact 3-Column Mobile Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8">
                    <StatusCard 
                      title="Stability Scope"
                      status={telemetry ? "success" : "loading"}
                      icon={<Zap className="w-3.5 h-3.5 text-primary" />}
                      onRefresh={() => { if (user) fetchTelemetry(); }}
                      description={`Coherence: ${(1 - currentDivergence).toFixed(2)}`}
                    />
                    <StatusCard 
                      title="Audit Lead"
                      status={user ? "success" : "loading"}
                      icon={user ? <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" /> : <Activity className="w-3.5 h-3.5 text-accent animate-pulse" />}
                      onRefresh={() => {}}
                      description={user ? `Node: ${user.username}` : "Unattested"}
                    />
                    <StatusCard 
                      title="Foundation"
                      status={loading ? "loading" : error ? "error" : "success"}
                      icon={<Server className="w-3.5 h-3.5" />}
                      onRefresh={fetchStatus}
                      description="ObservX-Core"
                    />
                  </div>

                  {/* Telemetry / Auth Panel Area */}
                  <div className="rounded-xl border bg-[#0A0A1F]/40 backdrop-blur-sm p-3.5 sm:p-5 border-primary/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative overflow-hidden group mb-4 sm:mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4">
                      <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2 font-mono">
                        {user ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-primary animate-pulse" /> SECURED TELEMETRY LINK &mdash; {user.username.toUpperCase()}
                          </>
                        ) : authMode === "forgot" ? (
                          <>
                            <HelpCircle className="w-3.5 h-3.5 text-yellow-500 animate-pulse" /> IDENTITY RECOVERY PROTOCOL
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-yellow-500 animate-pulse" /> ATTESTATION REQUIRED
                          </>
                        )}
                      </h3>
                      {user && (
                        <button
                          onClick={() => setActiveTab("ai-audit")}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Run AI Audit</span>
                        </button>
                      )}
                    </div>

                    {!user ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center">
                        <div className="space-y-3">
                          {authMode === "forgot" ? (
                            <div className="p-3 sm:p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/15 text-xs font-mono space-y-2">
                              <div className="text-yellow-500 font-bold flex items-center gap-2">
                                <Key className="w-4 h-4" /> CRYPTO_KEY_MUTATION
                              </div>
                              <p className="text-muted-foreground leading-relaxed text-[11px]">
                                Answer the security challenge question registered to your node to instantly reset access credentials.
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 sm:p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/15 text-xs font-mono space-y-2">
                              <div className="text-yellow-500 font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> ACCESS_DENIED_SECURE_CHANNEL
                              </div>
                              <p className="text-muted-foreground leading-relaxed text-[11px]">
                                This endpoint requires JWT credentials. Passwords are encrypted with bcrypt and stored in the persistent database.
                              </p>
                              <div className="pt-2 border-t border-white/5 text-[10px] text-muted-foreground">
                                <span className="text-accent font-semibold uppercase">Default Node:</span> username <strong className="text-white font-mono font-bold">admin</strong> / password <strong className="text-white font-mono font-bold">admin123</strong>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-3.5 sm:p-4 shadow-inner">
                          <div className="flex gap-4 mb-3 border-b border-white/5 pb-2 justify-between items-center">
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => { setAuthMode("login"); setAuthError(null); setAuthSuccess(null); }}
                                className={`text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer ${authMode === "login" ? "text-primary border-b border-primary" : "text-muted-foreground hover:text-white"}`}
                              >
                                Attest Node
                              </button>
                              <button
                                type="button"
                                onClick={() => { setAuthMode("register"); setAuthError(null); setAuthSuccess(null); }}
                                className={`text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer ${authMode === "register" ? "text-primary border-b border-primary" : "text-muted-foreground hover:text-white"}`}
                              >
                                Register Node
                              </button>
                            </div>
                            {authMode !== "forgot" && (
                              <button
                                type="button"
                                onClick={() => { setAuthMode("forgot"); setAuthError(null); setAuthSuccess(null); setRecoveryStep(1); }}
                                className="text-[9px] text-yellow-500/80 hover:text-yellow-500 font-mono tracking-tight cursor-pointer"
                              >
                                Lost Key?
                              </button>
                            )}
                          </div>

                          {authMode === "login" && (
                            <form onSubmit={handleAuthSubmit} className="space-y-3">
                              <div>
                                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Username</label>
                                <input
                                  type="text"
                                  value={authUsername}
                                  onChange={(e) => setAuthUsername(e.target.value)}
                                  placeholder="admin"
                                  className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                  required
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Access Password</label>
                                <input
                                  type="password"
                                  value={authPassword}
                                  onChange={(e) => setAuthPassword(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                  required
                                />
                              </div>

                              {authError && (
                                <div className="text-[10px] text-red-400 font-semibold bg-red-400/5 px-2 py-1 rounded border border-red-400/10 flex items-center gap-1.5 font-mono">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>{authError}</span>
                                </div>
                              )}

                              <button
                                type="submit"
                                disabled={authLoading}
                                className="w-full min-h-[42px] bg-primary hover:bg-primary/80 disabled:opacity-50 text-primary-foreground py-2 px-3 rounded text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                {authLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                                <span>Attest Credentials</span>
                              </button>
                            </form>
                          )}

                          {authMode === "register" && (
                            <form onSubmit={handleAuthSubmit} className="space-y-2.5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Username</label>
                                  <input
                                    type="text"
                                    value={authUsername}
                                    onChange={(e) => setAuthUsername(e.target.value)}
                                    placeholder="operator"
                                    className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Password (6+)</label>
                                  <input
                                    type="password"
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                                    required
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Email</label>
                                <input
                                  type="email"
                                  value={authEmail}
                                  onChange={(e) => setAuthEmail(e.target.value)}
                                  placeholder="node@observx.io"
                                  className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                                  required
                                />
                              </div>

                              <div>
                                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Security Question</label>
                                <select
                                  value={authSecurityQuestion}
                                  onChange={(e) => setAuthSecurityQuestion(e.target.value)}
                                  className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                                >
                                  <option value="What is your first terminal?">What is your first terminal?</option>
                                  <option value="What is the name of your first spacecraft?">What is the name of your first spacecraft?</option>
                                  <option value="What is your secret kinetic keycode?">What is your secret kinetic keycode?</option>
                                  <option value="What is your favorite Linux flavor?">What is your favorite Linux flavor?</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Answer Code</label>
                                <input
                                  type="text"
                                  value={authSecurityAnswer}
                                  onChange={(e) => setAuthSecurityAnswer(e.target.value)}
                                  placeholder="Recovery secret"
                                  className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                                  required
                                />
                              </div>

                              {authError && (
                                <div className="text-[10px] text-red-400 font-semibold bg-red-400/5 px-2 py-1 rounded border border-red-400/10 flex items-center gap-1.5 font-mono">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>{authError}</span>
                                </div>
                              )}

                              <button
                                type="submit"
                                disabled={authLoading}
                                className="w-full min-h-[42px] bg-primary hover:bg-primary/80 disabled:opacity-50 text-primary-foreground py-2 px-3 rounded text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                {authLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                                <span>Register Node Configuration</span>
                              </button>
                            </form>
                          )}

                          {authMode === "forgot" && (
                            <div>
                              {recoveryStep === 1 ? (
                                <form onSubmit={handleRecoveryQuery} className="space-y-3">
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Username</label>
                                    <input
                                      type="text"
                                      value={recoveryUsername}
                                      onChange={(e) => setRecoveryUsername(e.target.value)}
                                      placeholder="admin"
                                      className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                                      required
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full min-h-[42px] bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-500 py-2 px-3 rounded text-xs font-bold uppercase cursor-pointer font-mono"
                                  >
                                    {authLoading ? "Querying..." : "Get Verification Challenge"}
                                  </button>
                                </form>
                              ) : (
                                <form onSubmit={handleRecoverySubmit} className="space-y-2.5">
                                  <div className="p-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded font-mono text-[10px]">
                                    <span className="text-yellow-500 font-bold block">Challenge:</span>
                                    <span>{recoveryQuestion}</span>
                                  </div>
                                  <input
                                    type="text"
                                    value={recoveryAnswer}
                                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                                    placeholder="Answer"
                                    className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground font-mono"
                                    required
                                  />
                                  <input
                                    type="password"
                                    value={recoveryNewPassword}
                                    onChange={(e) => setRecoveryNewPassword(e.target.value)}
                                    placeholder="New Password (6+)"
                                    className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground font-mono"
                                    required
                                  />
                                  <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full min-h-[42px] bg-[#10b981] hover:bg-[#10b981]/80 text-white rounded py-2 text-xs font-bold uppercase cursor-pointer"
                                  >
                                    Re-attest Identity
                                  </button>
                                </form>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Authenticated Ledger View */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-3 sm:space-y-4">
                          <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-3 sm:p-4 font-mono text-xs shadow-inner">
                            <div className="text-accent/60 mb-2 border-b border-white/5 pb-1 uppercase tracking-tighter text-[9px] font-bold flex justify-between">
                              <span>Node Specifications</span>
                              <span className="text-[#10b981] font-bold">JWT (24h)</span>
                            </div>
                            <div className="text-primary/90 flex justify-between mb-1">
                              <span>Node Identity:</span>
                              <span className="text-foreground">{telemetry?.nodeId || "user-active"}</span>
                            </div>
                            <div className="text-primary/90 flex justify-between mb-1">
                              <span>Authed User:</span>
                              <span className="text-foreground font-semibold">{telemetry?.authUsername || user.username}</span>
                            </div>
                            <div className="text-primary/90 flex justify-between">
                              <span>Sync Pulse:</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(liveStream?.timestamp || Date.now()).toLocaleTimeString()}</span>
                            </div>
                          </div>

                          {/* Latency Diagnostics */}
                          <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-3 sm:p-4 font-mono text-xs shadow-inner space-y-2.5">
                            <div className="text-accent/60 mb-1 border-b border-white/5 pb-1 uppercase tracking-tighter text-[9px] font-bold flex justify-between items-center">
                              <span className="flex items-center gap-1.5 text-primary">
                                <Activity className="w-3.5 h-3.5 text-primary animate-pulse" /> LATENCY DIAGNOSTICS
                              </span>
                              <span className="text-[#10b981] font-bold">REAL-TIME</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground text-[10px] uppercase block">Target</span>
                                <span className="text-foreground font-semibold">/api/{pingTarget}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-muted-foreground text-[10px] uppercase block">RTT</span>
                                <span className={`font-bold text-sm tracking-tight ${
                                  lastLatency === null ? "text-muted-foreground" :
                                  lastLatency < 50 ? "text-[#10b981]" :
                                  lastLatency < 120 ? "text-yellow-400" : "text-rose-400"
                                }`}>
                                  {lastLatency !== null ? `${lastLatency} ms` : "--- ms"}
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleManualPing}
                                disabled={isPinging}
                                className="flex-1 min-h-[36px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 py-1 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Zap className="w-3 h-3 text-primary" />
                                <span>{isPinging ? "pinging..." : "ping server"}</span>
                              </button>
                              <select
                                value={pingTarget}
                                onChange={(e: any) => setPingTarget(e.target.value)}
                                className="bg-background border border-border/50 text-foreground text-[10px] uppercase font-bold rounded-md px-2 py-1 font-mono"
                              >
                                <option value="telemetry">Secured</option>
                                <option value="hello">Public</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Dynamic Divergence Chart */}
                        <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-3.5 sm:p-4 font-mono text-xs shadow-inner flex flex-col justify-between">
                          <div>
                            <div className="text-accent/60 mb-1 border-b border-white/5 pb-1 uppercase tracking-tighter text-[9px] font-bold w-full text-center">
                              Live Lattice Stability
                            </div>
                            <div className="text-3xl sm:text-4xl font-extrabold text-[#10b981] tracking-tighter text-center my-1.5">
                              {(1 - currentDivergence).toFixed(2)}
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#10b981] transition-all duration-500" 
                                style={{ width: `${Math.min(100, Math.max(10, (1 - currentDivergence) * 100))}%` }}
                              />
                            </div>
                          </div>

                          <div className="w-full mt-3 pt-2.5 border-t border-white/5 flex flex-col items-start">
                            <div className="text-[10px] text-accent font-bold uppercase tracking-wider mb-1">Divergence Trend</div>
                            <div className="h-24 sm:h-28 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                  data={[
                                    { epoch: "04:00", score: 0.08 },
                                    { epoch: "08:00", score: 0.06 },
                                    { epoch: "12:00", score: 0.04 },
                                    { epoch: "16:00", score: 0.03 },
                                    { epoch: "20:00", score: 0.025 },
                                    { epoch: "Live", score: currentDivergence }
                                  ]}
                                  margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                                >
                                  <defs>
                                    <linearGradient id="divergenceColor" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <XAxis dataKey="epoch" stroke="#4b5563" fontSize={8} tickLine={false} axisLine={false} />
                                  <YAxis stroke="#4b5563" fontSize={8} domain={[0, 0.15]} tickLine={false} axisLine={false} />
                                  <Tooltip
                                    contentStyle={{ 
                                      backgroundColor: '#0a0a24', 
                                      borderColor: '#10b981',
                                      borderRadius: '6px',
                                      color: '#fff',
                                      fontSize: '9px',
                                      fontFamily: 'monospace'
                                    }}
                                  />
                                  <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={1.5} fill="url(#divergenceColor)" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 2: GEMINI AI KINETIC AUDIT */}
              {activeTab === "ai-audit" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-4 sm:space-y-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-2 border border-accent/20">
                      <Sparkles className="w-3 h-3 text-accent animate-pulse" /> Gemini AI Diagnostics Engine
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">Cosmic Telemetry AI Audit</h2>
                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-xl">
                      Powered by the server-side <code className="text-primary font-mono font-bold">@google/genai</code> SDK (<span className="text-white font-mono">gemini-3.8-flash</span>). 
                      Evaluates live kernel diagnostics and divergence against kinetic governance rules.
                    </p>
                  </div>

                  {!user ? (
                    <div className="p-5 sm:p-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 font-mono text-xs text-center space-y-3">
                      <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mx-auto animate-pulse" />
                      <div className="text-yellow-400 font-bold uppercase tracking-wider">Operator Attestation Required</div>
                      <p className="text-muted-foreground max-w-md mx-auto text-[11px]">
                        AI Security Audits access protected kernel diagnostics. Please sign in or attest your node identity in the Ledger tab first.
                      </p>
                      <button
                        onClick={() => setActiveTab("ledger")}
                        className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded text-xs uppercase tracking-wider cursor-pointer"
                      >
                        Go to Sign In
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Audit Trigger Controls */}
                      <div className="bg-[#0A0A20]/60 border border-primary/20 rounded-xl p-3.5 sm:p-5 space-y-3 sm:space-y-4">
                        <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-mono">
                            <Layers className="w-3.5 h-3.5 text-primary" /> Parameters
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">gemini-3.8-flash</span>
                        </div>

                        <div>
                          <label className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground block mb-1.5 font-mono">
                            Focus Directive Preset:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                            {[
                              "Full Lattice & Cosmic Telemetry Assessment",
                              "Termux Node Bottlenecks & Ingress Coherence",
                              "Token Security Policy & Threat Mitigation",
                            ].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setAiFocusPreset(preset)}
                                className={`p-2 sm:p-2.5 rounded-lg border text-[10px] sm:text-[11px] text-left transition-all cursor-pointer font-mono ${
                                  aiFocusPreset === preset
                                    ? "bg-primary/20 border-primary text-white font-semibold shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground block mb-1 font-mono">
                            Custom Operator Directives (Optional):
                          </label>
                          <input
                            type="text"
                            value={customAiPrompt}
                            onChange={(e) => setCustomAiPrompt(e.target.value)}
                            placeholder="e.g. Audit Termux packet dropouts..."
                            className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                          />
                        </div>

                        {aiAuditError && (
                          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-mono text-red-400 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{aiAuditError}</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleTriggerAiAudit}
                          disabled={aiAuditLoading}
                          className="w-full min-h-[44px] bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                        >
                          {aiAuditLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Executing Gemini Deep Audit...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Run Cosmic AI Diagnostic Audit</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Latest Audit Result Display */}
                      {latestAiAudit && (
                        <div className="bg-[#050515]/90 border border-primary/30 rounded-xl p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-xl">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase font-mono tracking-wider ${
                                latestAiAudit.status === "OPTIMAL"
                                  ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30"
                                  : latestAiAudit.status === "ELEVATED_RISK"
                                  ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                                  : "bg-red-500/15 text-red-400 border border-red-500/30"
                              }`}>
                                {latestAiAudit.status}
                              </span>
                              <span className="text-xs font-bold text-white font-mono">{latestAiAudit.focus}</span>
                            </div>
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">
                              {new Date(latestAiAudit.timestamp).toLocaleTimeString()}
                            </span>
                          </div>

                          <div>
                            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground mb-1 font-mono">Executive Diagnostic:</div>
                            <p className="text-xs text-foreground/90 leading-relaxed font-sans bg-white/5 p-2.5 sm:p-3 rounded-lg border border-white/5">
                              {latestAiAudit.summary}
                            </p>
                          </div>

                          <div>
                            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-accent mb-1.5 font-mono flex items-center gap-1.5">
                              <ShieldCheck className="w-3 h-3" /> Directives ({latestAiAudit.recommendations.length})
                            </div>
                            <div className="space-y-1.5">
                              {latestAiAudit.recommendations.map((rec, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs font-mono bg-primary/5 p-2 rounded border border-primary/10">
                                  <span className="text-primary font-bold">0{i + 1}.</span>
                                  <span className="text-foreground">{rec}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Mitigation Protocol */}
                          <div className="bg-[#020208] border border-white/10 rounded-lg p-2.5 sm:p-3 space-y-2">
                            <div className="flex items-center justify-between text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground font-mono">
                              <span className="flex items-center gap-1">
                                <TerminalIcon className="w-3 h-3 text-primary" /> Mitigation Protocol
                              </span>
                              <button
                                onClick={() => handleCopyProtocol(latestAiAudit.mitigationProtocol)}
                                className="flex items-center gap-1 text-primary hover:text-white transition-colors cursor-pointer"
                              >
                                {copiedProtocol ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedProtocol ? "Copied" : "Copy"}</span>
                              </button>
                            </div>
                            <div className="font-mono text-xs text-[#10b981] bg-black/40 p-2 rounded overflow-x-auto select-all">
                              $ {latestAiAudit.mitigationProtocol}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* TAB 3: DOCKETS & PERSISTENT STORAGE */}
              {activeTab === "dockets" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-4 sm:space-y-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-2 border border-yellow-500/20">
                      <Database className="w-3 h-3 text-yellow-400" /> Persistent Storage Ledger
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">Active Dockets & Audit Trail</h2>
                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-xl">
                      Backed by the persistent local JSON database <code className="text-primary font-mono font-bold">/data/observx-db.json</code>.
                    </p>
                  </div>

                  {!user ? (
                    <div className="p-5 sm:p-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 font-mono text-xs text-center space-y-3">
                      <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mx-auto animate-pulse" />
                      <div className="text-yellow-400 font-bold uppercase tracking-wider">Authentication Required</div>
                      <p className="text-muted-foreground max-w-md mx-auto text-[11px]">
                        Please authenticate in the Ledger tab to manage dockets and commit persistent updates.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Create Docket Form */}
                      <form onSubmit={handleCreateDocket} className="bg-[#0A0A20]/60 border border-primary/20 rounded-xl p-3.5 sm:p-4 space-y-2.5">
                        <div className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <ListTodo className="w-3.5 h-3.5 text-primary" /> Create Security Docket
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={newDocketTitle}
                            onChange={(e) => setNewDocketTitle(e.target.value)}
                            placeholder="Docket description..."
                            className="flex-1 bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                            required
                          />
                          <select
                            value={newDocketPriority}
                            onChange={(e: any) => setNewDocketPriority(e.target.value)}
                            className="bg-background border border-border/50 text-foreground text-xs rounded-lg px-2.5 py-2 font-mono"
                          >
                            <option value="NORMAL">Normal Priority</option>
                            <option value="HIGH">High Priority</option>
                            <option value="CRITICAL">Critical Priority</option>
                            <option value="LOW">Low Priority</option>
                          </select>
                          <button
                            type="submit"
                            className="min-h-[40px] bg-primary hover:bg-primary/80 text-primary-foreground font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                          >
                            Add Docket
                          </button>
                        </div>
                      </form>

                      {/* Dockets List */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                          <span className="uppercase font-bold tracking-wider">
                            Registered Dockets ({docketsList.length})
                          </span>
                          <button onClick={() => fetchDockets()} className="hover:text-white cursor-pointer flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" /> Refresh
                          </button>
                        </div>

                        <div className="space-y-2">
                          {docketsList.map((docket) => (
                            <div
                              key={docket.id}
                              className={`p-2.5 sm:p-3 rounded-lg border flex items-center justify-between gap-2.5 font-mono text-xs ${
                                docket.status === "ACTIVE"
                                  ? "bg-white/5 border-white/10"
                                  : "bg-black/40 border-white/5 opacity-60"
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                    docket.priority === "CRITICAL" ? "bg-red-500/20 text-red-400" :
                                    docket.priority === "HIGH" ? "bg-yellow-500/20 text-yellow-400" : "bg-primary/20 text-primary"
                                  }`}>
                                    {docket.priority}
                                  </span>
                                  <span className={docket.status === "RESOLVED" ? "line-through text-muted-foreground text-xs" : "text-white text-xs"}>
                                    {docket.title}
                                  </span>
                                </div>
                                <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                                  {docket.status === "RESOLVED"
                                    ? `Resolved by ${docket.resolvedBy || "operator"}`
                                    : `Logged at ${new Date(docket.timestamp).toLocaleTimeString()}`}
                                </div>
                              </div>

                              {docket.status === "ACTIVE" && (
                                <button
                                  onClick={() => handleResolveDocket(docket.id)}
                                  className="px-2.5 py-1 bg-[#10b981]/15 hover:bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/30 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors shrink-0"
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Audit Log Trail */}
                      <div className="pt-3 border-t border-white/10 space-y-2 font-mono">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Audit Ledger
                        </div>
                        <div className="bg-[#030308] border border-white/10 rounded-lg p-2.5 sm:p-3 max-h-48 overflow-y-auto space-y-1 text-[10px] sm:text-[11px] custom-scrollbar">
                          {auditLogs.length > 0 ? (
                            auditLogs.map((log) => (
                              <div key={log.id} className="flex items-start gap-1.5 text-muted-foreground hover:text-white transition-colors">
                                <span className="opacity-60 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className="text-primary font-bold shrink-0">{log.action}:</span>
                                <span className="truncate">{log.details}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-muted-foreground italic">No audit trail events yet.</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* TAB 4: NODE PROFILE */}
              {activeTab === "profile" && user && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-4 sm:space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">Node Profile Parameters</h2>
                    <p className="text-xs text-muted-foreground font-mono">
                      Operator identity: <span className="text-primary font-bold">{user.username}</span> (Secured & Persisted)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
                    <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-4 sm:p-5 shadow-inner">
                      <div className="text-primary/80 mb-3 border-b border-white/5 pb-2 uppercase tracking-wide text-xs font-bold flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" /> Profile Parameters</span>
                        {profile?.createdAt && (
                          <span className="text-[10px] text-muted-foreground font-mono">Active {new Date(profile.createdAt).toLocaleDateString()}</span>
                        )}
                      </div>

                      <form onSubmit={handleUpdateProfile} className="space-y-3">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Username (Immutable)</label>
                          <input
                            type="text"
                            value={profile?.username || user?.username || ""}
                            className="w-full bg-white/5 border border-white/5 rounded px-3 py-2 text-sm text-muted-foreground font-mono"
                            disabled
                          />
                        </div>

                        <div>
                          <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Email Address</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Role</label>
                            <input
                              type="text"
                              value={editNodeRole}
                              onChange={(e) => setEditNodeRole(e.target.value)}
                              className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Station Location</label>
                            <input
                              type="text"
                              value={editNodeLoc}
                              onChange={(e) => setEditNodeLoc(e.target.value)}
                              className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                            />
                          </div>
                        </div>

                        {profileSuccess && (
                          <div className="text-[10px] text-[#10b981] font-semibold bg-[#10b981]/5 px-2 py-1 rounded border border-[#10b981]/10 flex items-center gap-1.5 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{profileSuccess}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={profileLoading}
                          className="w-full min-h-[42px] bg-primary hover:bg-primary/80 disabled:opacity-50 text-primary-foreground py-2 px-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {profileLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Save Node Parameters</span>
                        </button>
                      </form>
                    </div>

                    <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-4 sm:p-5 shadow-inner">
                      <div className="text-primary/80 mb-3 border-b border-white/5 pb-2 uppercase tracking-wide text-xs font-bold flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-primary" /> Credentials Rotation
                      </div>

                      <form onSubmit={handleChangePassword} className="space-y-3">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Current Password</label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">New Access Password</label>
                          <input
                            type="password"
                            value={newProfilePassword}
                            onChange={(e) => setNewProfilePassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={profileLoading}
                          className="w-full min-h-[42px] bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/20 text-[#10b981] py-2 px-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Rotate Access Key</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </motion.div>
              )}

            </div>
          </div>

          {/* Right Panel: Desktop only */}
          <aside className="w-72 bg-[#080815]/85 backdrop-blur-xl shrink-0 hidden md:flex flex-col border-t md:border-t-0 p-6 z-10">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-4 font-mono">
              Repository Registry
            </h3>
            
            <div className="space-y-3">
              <RegistryItem name="Hewston" role="Gemini Starter" status="ACTIVE" />
              <RegistryItem name="The-Paralegal-" role="Controller" status="ACTIVE" />
              <RegistryItem name="ObservX-Core" role="Foundation" status="ACTIVE" />
              
              <div className="pt-4 border-t border-border/50 mt-4">
                <label className="text-[10px] text-muted-foreground uppercase font-bold mb-2 block tracking-widest font-mono">
                  Environment Metrics
                </label>
                <div className="space-y-1.5">
                  <ConfigItem label="Platform" value="Termux / Local" />
                  <ConfigItem label="Storage" value="Persistent JSON" isProxy />
                  <ConfigItem label="Gemini SDK" value="@google/genai" isProxy />
                  <ConfigItem label="Protocol" value="v2.5.0-KINETIC" />
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-border/50">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/15">
                  <Server className="w-4 h-4 text-primary shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.4)]" />
                  <div className="text-[10px] leading-tight">
                    <div className="font-bold text-foreground">GitHub Synchronized</div>
                    <div className="text-muted-foreground font-mono text-[9px]">Aetherium-Nexus-Hub/Hewston</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* Bottom Mobile Tab Bar: Easy 1-Thumb Touch Navigation */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080816]/95 backdrop-blur-xl border-t border-border/80 h-16 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold tracking-tight transition-all cursor-pointer ${
              activeTab === "ledger" ? "text-primary" : "text-muted-foreground hover:text-white"
            }`}
          >
            <Layout className={`w-4 h-4 mb-1 ${activeTab === "ledger" ? "text-primary" : "text-muted-foreground"}`} />
            <span>Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab("ai-audit")}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold tracking-tight transition-all cursor-pointer ${
              activeTab === "ai-audit" ? "text-accent font-bold" : "text-muted-foreground hover:text-white"
            }`}
          >
            <Sparkles className={`w-4 h-4 mb-1 ${activeTab === "ai-audit" ? "text-accent animate-pulse" : "text-muted-foreground"}`} />
            <span>AI Audit</span>
          </button>

          <button
            onClick={() => setActiveTab("dockets")}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold tracking-tight transition-all cursor-pointer ${
              activeTab === "dockets" ? "text-yellow-400" : "text-muted-foreground hover:text-white"
            }`}
          >
            <ListTodo className={`w-4 h-4 mb-1 ${activeTab === "dockets" ? "text-yellow-400" : "text-muted-foreground"}`} />
            <span>Dockets</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold tracking-tight transition-all cursor-pointer ${
              activeTab === "profile" ? "text-primary" : "text-muted-foreground hover:text-white"
            }`}
          >
            <Settings className={`w-4 h-4 mb-1 ${activeTab === "profile" ? "text-primary" : "text-muted-foreground"}`} />
            <span>Profile</span>
          </button>
        </nav>

        {/* Bottom Terminal Trace Section (Desktop Only) */}
        <footer className="h-28 border-t border-border bg-[#050510] p-3 relative overflow-hidden shrink-0 hidden lg:block">
          <div className="flex items-center gap-6 mb-1.5 border-b border-border pb-1 text-[10px] uppercase tracking-[0.2em] font-bold">
            <span className="text-primary border-b border-primary pb-0.5 flex items-center gap-2">
              <TerminalIcon className="w-3 h-3 text-primary" /> Operational Trace
            </span>
            <span className="opacity-40">Live SSE Stream</span>
          </div>
          <div className="font-mono text-[11px] space-y-0.5 overflow-y-auto h-14 custom-scrollbar pr-2">
            <div className="text-primary opacity-70">[audit] ObservX Master Infrastructure active.</div>
            <div className="text-accent opacity-70">[stream] Server-Sent Events connected to /api/telemetry/stream.</div>
            <div className="text-[#10b981] opacity-70">[store] Persistent database /data/observx-db.json mounted and synchronizing.</div>
            <div className="text-primary/90">
              {streamConnected 
                ? `> PULSE_ACK (200) - Divergence: ${currentDivergence.toFixed(4)} | Throughput: ${liveStream?.clusterThroughput ?? 14.8} GB/s`
                : "> SYNC_PENDING"}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function StatusCard({
  title,
  status,
  icon,
  onRefresh,
  description,
}: {
  title: string;
  status: "loading" | "success" | "error";
  icon: React.ReactNode;
  onRefresh: () => void;
  description?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4 hover:border-primary/50 transition-colors group">
      <div className="flex justify-between items-start mb-2 sm:mb-3">
        <div className="p-1.5 sm:p-2 rounded bg-secondary text-foreground group-hover:text-primary transition-colors">
          {icon}
        </div>
        <button onClick={onRefresh} className="p-1 hover:bg-secondary rounded transition-colors text-muted-foreground cursor-pointer">
          <RefreshCw className={`w-3 h-3 ${status === "loading" ? "animate-spin" : ""}`} />
        </button>
      </div>
      <h3 className="text-xs sm:text-sm font-bold mb-0.5 tracking-tight">{title}</h3>
      <div className="text-[9px] sm:text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1.5 font-mono">
        {description}
      </div>
      <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/20">
        <div className={`w-1.5 h-1.5 rounded-full ${status === "success" ? "bg-green-500" : status === "error" ? "bg-destructive" : "bg-yellow-500"}`} />
        <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-muted-foreground tracking-widest font-mono">
          {status === "success" ? "Stable" : status === "error" ? "Divergent" : "Syncing"}
        </span>
      </div>
    </div>
  );
}

function RegistryItem({ name, role, status }: { name: string; role: string; status: "ACTIVE" | "PENDING" | "DIVERGENT" }) {
  return (
    <div className="p-2.5 rounded-lg bg-background/50 border border-border/50 hover:bg-primary/5 transition-colors">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[11px] font-bold text-foreground font-mono">{name}</span>
        <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded font-mono ${status === "ACTIVE" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
          {status}
        </span>
      </div>
      <div className="text-[10px] text-muted-foreground italic">{role}</div>
    </div>
  );
}

function ConfigItem({ label, value, isProxy }: { label: string; value: string; isProxy?: boolean }) {
  return (
    <div className="flex justify-between items-center bg-background/50 border border-border/50 rounded px-2 py-1">
      <span className="text-[9px] font-medium text-muted-foreground">{label}</span>
      <span className={`font-mono text-[10px] ${isProxy ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
