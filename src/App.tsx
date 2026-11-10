import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Rocket, 
  Server, 
  Layout, 
  Code, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Github,
  Zap,
  FileCode,
  Folder,
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
  Check
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface StatusData {
  message: string;
  timestamp: string;
  status: string;
}

interface UserData {
  username: string;
  token: string;
}

export default function App() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Secure Telemetry Data
  const [telemetry, setTelemetry] = useState<any | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  // Profile Management States
  const [showProfile, setShowProfile] = useState(false);
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

  // Helper to record a latency measurement
  const recordLatency = (latencyMs: number) => {
    setLastLatency(latencyMs);
    const newHistoryItem = {
      time: new Date().toLocaleTimeString(),
      latency: latencyMs
    };
    setLatencyHistory(prev => {
      const updated = [...prev, newHistoryItem];
      if (updated.length > 15) {
        return updated.slice(updated.length - 15);
      }
      return updated;
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
      if (response.ok) {
        recordLatency(latencyMs);
      } else {
        recordLatency(latencyMs);
      }
    } catch (e) {
      console.error("Ping error:", e);
    } finally {
      setIsPinging(false);
    }
  };

  const fetchStatus = async () => {
    setLoading(true);
    const startTime = performance.now();
    try {
      const response = await fetch("/api/hello");
      if (!response.ok) throw new Error("Failed to connect to server");
      const latencyMs = Math.round(performance.now() - startTime);
      recordLatency(latencyMs);
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fetchTelemetry = async (tokenOverride?: string) => {
    const activeToken = tokenOverride || user?.token;
    if (!activeToken) {
      setTelemetry(null);
      return;
    }
    setTelemetryLoading(true);
    const startTime = performance.now();
    try {
      const response = await fetch("/api/telemetry", {
        headers: {
          "Authorization": `Bearer ${activeToken}`
        }
      });
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        throw new Error("Session expired. Please log in again.");
      }
      if (!response.ok) {
        throw new Error("Failed to authenticate or retrieve telemetry packet.");
      }
      const latencyMs = Math.round(performance.now() - startTime);
      recordLatency(latencyMs);
      const json = await response.json();
      setTelemetry(json);
      setTelemetryError(null);
    } catch (err) {
      setTelemetryError(err instanceof Error ? err.message : "Symmetry Link Loss");
      setTelemetry(null);
    } finally {
      setTelemetryLoading(false);
    }
  };

  const fetchProfile = async (tokenOverride?: string) => {
    const activeToken = tokenOverride || user?.token;
    if (!activeToken) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const response = await fetch("/api/profile", {
        headers: {
          "Authorization": `Bearer ${activeToken}`
        }
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const bodyParams: any = {
        email: editEmail,
        nodeRole: editNodeRole,
        nodeLoc: editNodeLoc
      };
      if (editSecurityAnswer) {
        bodyParams.securityQuestion = editSecurityQuestion;
        bodyParams.securityAnswer = editSecurityAnswer;
      }
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify(bodyParams)
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed profile update.");
      setProfile(json.profile);
      setProfileSuccess(json.message || "Profile configuration updated.");
      setEditSecurityAnswer("");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Profile update failing");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;
    if (!currentPassword || !newProfilePassword) {
      setProfileError("Current and new passwords cannot be blank.");
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify({ currentPassword, newPassword: newProfilePassword })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Password change failed");
      setProfileSuccess(json.message || "Access key changed successfully.");
      setCurrentPassword("");
      setNewProfilePassword("");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Password alteration failing");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRecoveryQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryUsername) {
      setAuthError("Please specify username.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const response = await fetch("/api/forgot-password-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: recoveryUsername })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Log search failed.");
      setRecoveryQuestion(json.securityQuestion);
      setRecoveryStep(2);
      setAuthSuccess("Challenge question retrieved.");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Username not verified on ledger");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryUsername || !recoveryAnswer || !recoveryNewPassword) {
      setAuthError("All recovery parameters are required.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: recoveryUsername,
          securityAnswer: recoveryAnswer,
          newPassword: recoveryNewPassword
        })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Access restore failed.");
      setAuthSuccess(json.message || "Key recovered! Please log in.");
      setAuthMode("login");
      setRecoveryStep(1);
      setRecoveryAnswer("");
      setRecoveryNewPassword("");
      setRecoveryUsername("");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Recovery block rejection");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (user?.token) {
      try {
        await fetch("/api/logout", { method: "POST" });
      } catch (e) {
        // ignore network error on logout
      }
    }
    localStorage.removeItem("observx_user");
    setUser(null);
    setTelemetry(null);
    setTelemetryError(null);
    setAuthSuccess(null);
    setShowProfile(false);
    setProfile(null);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername || !authPassword) {
      setAuthError("Please input username and password credentials.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    const endpoint = authMode === "login" ? "/api/login" : "/api/register";
    const body: any = { username: authUsername, password: authPassword };
    if (authMode === "register") {
      body.email = authEmail;
      body.securityQuestion = authSecurityQuestion;
      body.securityAnswer = authSecurityAnswer;
      body.nodeRole = authNodeRole;
      body.nodeLoc = authNodeLoc;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
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
        // Automatically fetch secured telemetry and profile upon success
        fetchTelemetry(json.token);
        fetchProfile(json.token);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "An unexpected authentication error occurred.");
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    if (user) {
      fetchTelemetry();
      fetchProfile();
    }
  }, [user?.token]);

  return (
    <div className="flex h-screen w-full bg-[#030308] text-foreground font-sans overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] bg-accent/10 blur-[100px] rounded-full" />
      </div>

      {/* Left Sidebar: File Explorer Pattern */}
      <aside className="w-64 border-r border-border flex flex-col bg-[#050510]/80 backdrop-blur-xl shrink-0 hidden md:flex z-10">
        <div className="h-12 flex items-center px-4 border-b border-border text-[10px] font-bold tracking-[0.3em] uppercase text-primary/80">
          ObservX Core
        </div>
        <div className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground font-bold tracking-tight uppercase opacity-50">Lattice Nodes</div>
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-primary/10 rounded text-foreground border border-primary/20"><FileCode className="w-4 h-4 text-primary" /> ObservX-Core</div>
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs opacity-60"><FileCode className="w-4 h-4" /> The-Paralegal-</div>
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs opacity-60"><FileCode className="w-4 h-4" /> Hewston</div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground mt-4 font-bold tracking-tight uppercase opacity-50">Kinetic Rules</div>
          <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] opacity-60 leading-tight">1. Maintain the Lattice</div>
          <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] opacity-60 leading-tight">2. Clear Bottlenecks</div>
          <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] opacity-60 leading-tight">3. No Narrative Bleed</div>
        </div>
        <div className="p-4 border-t border-border bg-card/10">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-accent tracking-widest">
            <span>Audit Protocol</span>
            <span className="flex items-center gap-1">v1.0 <Activity className="w-2.5 h-2.5" /></span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top Navigation Bar: Tab Pattern */}
        <nav className="h-12 border-b border-border flex items-center bg-[#080815]/90 backdrop-blur-md shrink-0 px-4 gap-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setShowProfile(false)}
            className={`flex items-center gap-2 h-full px-4 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border-b-2 ${!showProfile ? "border-primary text-foreground bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Layout className="h-3 w-3" /> Infrastructure Ledger
          </button>
          
          {user && (
            <button 
              onClick={() => setShowProfile(true)}
              className={`flex items-center gap-2 h-full px-4 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border-b-2 ${showProfile ? "border-primary text-foreground bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Settings className="h-3 w-3" /> Node Profile
            </button>
          )}
          
          <div className="ml-auto flex items-center gap-3 pl-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-bold uppercase tracking-[0.1em]">
              <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.6)] ${loading ? "bg-yellow-500 animate-pulse" : "bg-[#10b981]"}`}></span>
              {loading ? "Auditing" : "System Live"}
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer uppercase tracking-tight transition-colors ${showProfile ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 text-muted-foreground border-white/10 hover:border-white/20"}`}
                  title="Configure node details"
                >
                  <Settings className="w-2.5 h-2.5" />
                  <span>Profile</span>
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/15 text-primary border border-primary/30 rounded-full text-[10px] font-bold uppercase tracking-[0.1em]">
                  <User className="w-3 h-3 text-primary" />
                  <span>{user.username}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] flex items-center gap-1 transition-all cursor-pointer"
                >
                  <LogOut className="w-3 h-3 text-red-400" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/25 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] shadow-[0_0_10px_rgba(234,179,8,0.05)]">
                <Lock className="w-2.5 h-2.5 text-yellow-500 animate-pulse" />
                <span>Encrypted Mode</span>
              </div>
            )}
          </div>
        </nav>

        {/* Content View */}
        <section className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gradient-to-br from-[#030308] to-[#050515]">
          <div className="flex-1 p-6 sm:p-10 overflow-y-auto border-r border-border custom-scrollbar">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-[0.2em] mb-6 border border-accent/20">
                  <Activity className="w-3 h-3" /> Master Ledger
                </div>
                <h1 className="text-4xl font-extrabold tracking-[-0.04em] mb-4 text-balance sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-primary">
                  ObservX <br />
                  <span className="italic font-normal opacity-90 font-serif">Infrastructure Notebook</span>
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                  Centralized command shell for Android Termux pipelines and remote foundation management. 
                  Maintaining focus coherence across the ObservX lattice.
                </p>
              </motion.div>

              <div className="grid gap-6 sm:grid-cols-3 mb-12">
                <StatusCard 
                  title="Stability Scope"
                  status={telemetry ? "success" : "loading"}
                  icon={<Zap className="w-5 h-5 text-primary" />}
                  onRefresh={() => { if (user) fetchTelemetry(); }}
                  description={telemetry ? `Coherence: ${(1 - telemetry.kernelDiagnostics.divergenceScore).toFixed(2)}` : "Coherence: 0.50"}
                />
                <StatusCard 
                  title="Audit Lead"
                  status={user ? "success" : "loading"}
                  icon={user ? <ShieldCheck className="w-5 h-5 text-[#10b981]" /> : <Activity className="w-5 h-5 text-accent animate-pulse" />}
                  onRefresh={() => {}}
                  description={user ? `Node: ${user.username}` : "Unattested Node"}
                />
                <StatusCard 
                    title="Foundation"
                    status={loading ? "loading" : error ? "error" : "success"}
                    icon={<Server className="w-5 h-5 font-serif" />}
                    onRefresh={fetchStatus}
                    description="ObservX-Core"
                />
              </div>

              {/* Telemetry Packet Area */}
              <div className="rounded-2xl border bg-[#0A0A1F]/40 backdrop-blur-sm p-6 border-primary/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative overflow-hidden group mb-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
                <div className="flex items-center justify-between mb-6">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.h3
                      key={user ? (showProfile ? "profile-header" : "ledger-header") : authMode}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary flex items-center gap-2"
                    >
                      {user ? (
                        showProfile ? (
                          <>
                            <Settings className="w-4 h-4 text-primary animate-spin" /> NODE PROFILE CONFIGURATION &mdash; {user.username.toUpperCase()}
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-primary animate-pulse" /> SECURED TELEMETRY LINK &mdash; {user.username.toUpperCase()}
                          </>
                        )
                      ) : (
                        authMode === "forgot" ? (
                          <>
                            <HelpCircle className="w-4 h-4 text-yellow-500 animate-pulse" /> IDENTITY RECOVERY PROTOCOL
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-yellow-500 animate-pulse" /> TELEMETRY INTERCEPT (ATTESTATION REQUIRED)
                          </>
                        )
                      )}
                    </motion.h3>
                  </AnimatePresence>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  {!user ? (
                    <motion.div
                      key={authMode}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
                    >
                      <div className="space-y-4">
                        {authMode === "forgot" ? (
                          <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/15 text-xs font-mono space-y-3">
                            <div className="text-yellow-500 font-bold flex items-center gap-2">
                              <Key className="w-4 h-4" /> CRYPTO_KEY_MUTATION
                            </div>
                            <p className="text-muted-foreground leading-relaxed text-[11px]">
                              Initiating out-of-band security answer validation. Providing the correct registered cryptographic answer will permit changing node access credentials instantly.
                            </p>
                            <div className="pt-2 border-t border-white/5 text-[10px] text-muted-foreground leading-tight">
                              <span className="text-accent font-semibold uppercase">Failsafe Alert:</span> If answer keys are lost, please contact standard system administration or provision a fresh identity block.
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/15 text-xs font-mono space-y-3">
                            <div className="text-yellow-500 font-bold flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" /> ACCESS_DENIED_SECURE_CHANNEL
                            </div>
                            <p className="text-muted-foreground leading-relaxed text-[11px]">
                              This endpoint requires custom verified JSON Web Token (JWT) credentials. Secure routing filters are currently safeguarding unauthenticated telemetry queries.
                            </p>
                            <div className="pt-2 border-t border-white/5 text-[10px] text-muted-foreground leading-tight">
                              <span className="text-accent font-semibold uppercase">Audit Hint:</span> Input standard credentials username <strong className="text-white font-mono font-bold">admin</strong> and password <strong className="text-white font-mono font-bold">admin123</strong>, or register a new identity credentials instantly.
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-5 shadow-inner">
                        <div className="flex gap-4 mb-4 border-b border-white/5 pb-2 justify-between items-center">
                          <div className="flex gap-4">
                            <button
                              type="button"
                              onClick={() => { setAuthMode("login"); setAuthError(null); setAuthSuccess(null); }}
                              className={`text-xs uppercase font-extrabold tracking-wider pb-1 transition-all cursor-pointer ${authMode === "login" ? "text-primary border-b border-primary" : "text-muted-foreground hover:text-white"}`}
                            >
                              Sign In
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAuthMode("register"); setAuthError(null); setAuthSuccess(null); }}
                              className={`text-xs uppercase font-extrabold tracking-wider pb-1 transition-all cursor-pointer ${authMode === "register" ? "text-primary border-b border-primary" : "text-muted-foreground hover:text-white"}`}
                            >
                              Register Node
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setAuthMode("forgot"); setAuthError(null); setAuthSuccess(null); setRecoveryStep(1); }}
                            className={`text-[10px] uppercase font-bold tracking-wider pb-1 transition-all cursor-pointer ${authMode === "forgot" ? "text-yellow-500 border-b border-yellow-500" : "text-muted-foreground hover:text-white"}`}
                          >
                            Recover Key
                          </button>
                        </div>

                        {authMode === "login" && (
                          <form onSubmit={handleAuthSubmit} className="space-y-3">
                            <div>
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Username</label>
                              <input
                                type="text"
                                value={authUsername}
                                onChange={(e) => setAuthUsername(e.target.value)}
                                placeholder="e.g. admin"
                                className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Password</label>
                              <input
                                type="password"
                                value={authPassword}
                                onChange={(e) => setAuthPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                required
                              />
                            </div>

                            {authError && (
                              <div className="text-[10px] text-red-400 font-semibold bg-red-400/5 px-2 py-1.5 rounded-md border border-red-400/10 flex items-center gap-1.5 font-mono">
                                <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                                <span>{authError}</span>
                              </div>
                            )}

                            {authSuccess && (
                              <div className="text-[10px] text-[#10b981] font-semibold bg-[#10b981]/5 px-2 py-1.5 rounded-md border border-[#10b981]/10 flex items-center gap-1.5 font-mono">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{authSuccess}</span>
                              </div>
                            )}

                            <button
                              type="submit"
                              disabled={authLoading}
                              className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-primary-foreground py-2 px-3 rounded text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.2)] cursor-pointer"
                            >
                              {authLoading ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Unlock className="w-3" />
                              )}
                              <span>Attest Credentials</span>
                            </button>
                          </form>
                        )}

                        {authMode === "register" && (
                          <form onSubmit={handleAuthSubmit} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Username</label>
                                <input
                                  type="text"
                                  value={authUsername}
                                  onChange={(e) => setAuthUsername(e.target.value)}
                                  placeholder="e.g. pilot"
                                  className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                  required
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Password (6+ chars)</label>
                                <input
                                  type="password"
                                  value={authPassword}
                                  onChange={(e) => setAuthPassword(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Email Connection</label>
                              <input
                                type="email"
                                value={authEmail}
                                onChange={(e) => setAuthEmail(e.target.value)}
                                placeholder="e.g. team@observx.io"
                                className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                required
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Grid Role</label>
                                <input
                                  type="text"
                                  value={authNodeRole}
                                  onChange={(e) => setAuthNodeRole(e.target.value)}
                                  placeholder="e.g. Auditor"
                                  className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Node Location</label>
                                <input
                                  type="text"
                                  value={authNodeLoc}
                                  onChange={(e) => setAuthNodeLoc(e.target.value)}
                                  placeholder="e.g. Orbit-3"
                                  className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Recovery Security Question</label>
                              <select
                                value={authSecurityQuestion}
                                onChange={(e) => setAuthSecurityQuestion(e.target.value)}
                                className="w-full bg-background/50 border border-border/50 rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                              >
                                <option value="What is your first terminal?">What is your first terminal?</option>
                                <option value="What is the name of your first spacecraft?">What is the name of your first spacecraft?</option>
                                <option value="What is your secret kinetic keycode?">What is your secret kinetic keycode?</option>
                                <option value="What is your favorite Linux flavor?">What is your favorite Linux flavor?</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Challenge Answer Answer</label>
                              <input
                                type="text"
                                value={authSecurityAnswer}
                                onChange={(e) => setAuthSecurityAnswer(e.target.value)}
                                placeholder="Case-insensitive recovery"
                                className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                required
                              />
                            </div>

                            {authError && (
                              <div className="text-[10px] text-red-400 font-semibold bg-red-400/5 px-2 py-1.5 rounded-md border border-red-400/10 flex items-center gap-1.5 font-mono">
                                <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                                <span>{authError}</span>
                              </div>
                            )}

                            {authSuccess && (
                              <div className="text-[10px] text-[#10b981] font-semibold bg-[#10b981]/5 px-2 py-1.5 rounded-md border border-[#10b981]/10 flex items-center gap-1.5 font-mono">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{authSuccess}</span>
                              </div>
                            )}

                            <button
                              type="submit"
                              disabled={authLoading}
                              className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-primary-foreground py-2 px-3 rounded text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.2)] cursor-pointer"
                            >
                              {authLoading ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Rocket className="w-3" />
                              )}
                              <span>Register Node Configuration</span>
                            </button>
                          </form>
                        )}

                        {authMode === "forgot" && (
                          <div>
                            {recoveryStep === 1 ? (
                              <form onSubmit={handleRecoveryQuery} className="space-y-3">
                                <p className="text-[10px] text-muted-foreground leading-normal mb-2 font-mono">
                                  Enter your registered node username to fetch the cryptographic verification challenge.
                                </p>
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Username</label>
                                  <input
                                    type="text"
                                    value={recoveryUsername}
                                    onChange={(e) => setRecoveryUsername(e.target.value)}
                                    placeholder="e.g. admin"
                                    className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                    required
                                  />
                                </div>

                                {authError && (
                                  <div className="text-[10px] text-red-400 font-semibold bg-red-400/5 px-2 py-1.5 rounded-md border border-red-400/10 flex items-center gap-1.5 font-mono">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>{authError}</span>
                                  </div>
                                )}

                                <button
                                  type="submit"
                                  disabled={authLoading}
                                  className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-500 py-2 px-3 rounded text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                                >
                                  {authLoading ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <HelpCircle className="w-3.5 h-3.5 text-yellow-500" />
                                  )}
                                  <span>Get Verification Challenge</span>
                                </button>
                              </form>
                            ) : (
                              <form onSubmit={handleRecoverySubmit} className="space-y-3">
                                <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded font-mono text-[11px] space-y-1">
                                  <span className="text-[9px] font-bold text-yellow-500 block uppercase tracking-wide">Verification Challenge:</span>
                                  <span className="text-foreground font-semibold">{recoveryQuestion}</span>
                                </div>

                                <div>
                                  <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Challenge Answer Code</label>
                                  <input
                                    type="text"
                                    value={recoveryAnswer}
                                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                                    placeholder="Verify challenge response"
                                    className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                    required
                                  />
                                </div>

                                <div>
                                  <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">New Access Password</label>
                                  <input
                                    type="password"
                                    value={recoveryNewPassword}
                                    onChange={(e) => setRecoveryNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                    required
                                  />
                                </div>

                                {authError && (
                                  <div className="text-[10px] text-red-400 font-semibold bg-red-400/5 px-2 py-1.5 rounded-md border border-red-400/10 flex items-center gap-1.5 font-mono">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>{authError}</span>
                                  </div>
                                )}

                                {authSuccess && (
                                  <div className="text-[10px] text-[#10b981] font-semibold bg-[#10b981]/5 px-2 py-1.5 rounded-md border border-[#10b981]/10 flex items-center gap-1.5 font-mono">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{authSuccess}</span>
                                  </div>
                                )}

                                <div className="flex gap-2 font-mono">
                                  <button
                                    type="button"
                                    onClick={() => setRecoveryStep(1)}
                                    className="w-1/3 border border-border hover:bg-white/5 py-1.5 px-3 rounded text-[11px] font-bold uppercase text-muted-foreground transition-all cursor-pointer"
                                  >
                                    Back
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-2/3 bg-[#10b981] hover:bg-[#10b981]/80 text-white rounded text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                  >
                                    {authLoading ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                    <span>Re-attest identity</span>
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : showProfile ? (
                    <motion.div
                      key="node-profile"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start font-sans"
                    >
                      {/* Left Column: Properties Setup */}
                      <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-5 shadow-inner">
                        <div className="text-primary/80 mb-4 border-b border-white/5 pb-2 uppercase tracking-wide text-xs font-bold flex justify-between items-center">
                          <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-primary" /> Profile Parameters</span>
                          {profile?.createdAt && (
                            <span className="text-[10px] text-muted-foreground font-mono font-normal">Active since {new Date(profile.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-3">
                          <div>
                            <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Username (Immutable)</label>
                            <input
                              type="text"
                              value={profile?.username || user?.username || ""}
                              className="w-full bg-white/5 border border-white/5 select-all rounded px-2.5 py-1.5 text-xs text-muted-foreground font-mono"
                              disabled
                            />
                          </div>

                          <div>
                            <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Email Address</label>
                            <div className="relative">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                              <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="e.g. pilot@observx.io"
                                className="w-full bg-background/50 border border-border/50 rounded pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Grid Operational Role</label>
                              <input
                                type="text"
                                value={editNodeRole}
                                onChange={(e) => setEditNodeRole(e.target.value)}
                                placeholder="e.g. Chief Auditor"
                                className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Station Location</label>
                              <div className="relative">
                                <MapPin className="w-3 h-3 text-muted-foreground absolute left-2.5 top-2.5" />
                                <input
                                  type="text"
                                  value={editNodeLoc}
                                  onChange={(e) => setEditNodeLoc(e.target.value)}
                                  placeholder="e.g. Station Delta"
                                  className="w-full bg-background/50 border border-border/50 rounded pl-7 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/5">
                            <label className="text-[9px] uppercase font-bold text-yellow-500/80 block mb-1">Change Security recovery Question</label>
                            <select
                              value={editSecurityQuestion}
                              onChange={(e) => setEditSecurityQuestion(e.target.value)}
                              className="w-full bg-background/50 border border-border/50 rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                            >
                              <option value="What is your first terminal?">What is your first terminal?</option>
                              <option value="What is the name of your first spacecraft?">What is the name of your first spacecraft?</option>
                              <option value="What is your secret kinetic keycode?">What is your secret kinetic keycode?</option>
                              <option value="What is your favorite Linux flavor?">What is your favorite Linux flavor?</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] uppercase font-bold text-yellow-500/80 block mb-1">Optional Answers Key (Write answer to change)</label>
                            <input
                              type="text"
                              value={editSecurityAnswer}
                              onChange={(e) => setEditSecurityAnswer(e.target.value)}
                              placeholder="Type new security answer to commit question swap"
                              className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                            />
                          </div>

                          {profileError && (
                            <div className="text-[10px] text-red-400 font-semibold bg-red-400/5 px-2 py-1.5 rounded-md border border-red-400/10 flex items-center gap-1.5 font-mono">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{profileError}</span>
                            </div>
                          )}

                          {profileSuccess && (
                            <div className="text-[10px] text-[#10b981] font-semibold bg-[#10b981]/5 px-2 py-1.5 rounded-md border border-[#10b981]/10 flex items-center gap-1.5 font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{profileSuccess}</span>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={profileLoading}
                            className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-primary-foreground py-2 px-3 rounded text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(139,92,246,0.15)] animate-shimmer"
                          >
                            {profileLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Save Node Parameters</span>
                          </button>
                        </form>
                      </div>

                      {/* Right Column: Credentials Rotation */}
                      <div className="space-y-4">
                        <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-5 shadow-inner">
                          <div className="text-primary/80 mb-4 border-b border-white/5 pb-2 uppercase tracking-wide text-xs font-bold flex items-center gap-1.5">
                            <Key className="w-4 h-4 text-primary" /> Credentials Rotation
                          </div>

                          <form onSubmit={handleChangePassword} className="space-y-3">
                            <div>
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Current Password</label>
                              <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
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
                                className="w-full bg-background/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                                required
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={profileLoading}
                              className="w-full bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/20 text-[#10b981] py-2 px-3 rounded text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {profileLoading ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              <span>Rotate Access Key</span>
                            </button>
                          </form>
                        </div>

                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg text-xs leading-normal font-mono text-muted-foreground space-y-2">
                          <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Signature Details</span>
                          <div className="flex justify-between">
                            <span>Connection:</span>
                            <span className="text-foreground">Secure Node SSL</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Email Status:</span>
                            <span className="text-foreground">{profile?.email ? "Verified" : "Unconnected"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Identity Role:</span>
                            <span className="text-foreground">{profile?.nodeRole || "Unassigned"}</span>
                          </div>
                          <button
                            onClick={() => setShowProfile(false)}
                            className="w-full text-center mt-2 pt-2 border-t border-white/5 text-[10px] text-primary hover:text-white transition-colors cursor-pointer block font-bold uppercase tracking-wider"
                          >
                            &larr; Return to telemetry stream
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="infrastructure-ledger"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div className="space-y-4">
                        {telemetryLoading ? (
                          <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-6 min-h-[150px] flex items-center justify-center font-mono text-xs text-primary/60 italic gap-3">
                            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                            Fetching cryptographic secure packets...
                          </div>
                        ) : telemetryError ? (
                          <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-4 min-h-[150px] font-mono text-xs text-red-400 flex flex-col justify-center items-center gap-2">
                            <AlertCircle className="w-6 h-6 text-red-500 animate-bounce" />
                            <span>Telemetry Link Loss: {telemetryError}</span>
                          </div>
                        ) : telemetry ? (
                          <>
                            <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-4 font-mono text-xs shadow-inner">
                                <div className="text-accent/60 mb-2 border-b border-white/5 pb-1 uppercase tracking-tighter text-[9px] font-bold flex justify-between">
                                    <span>Node Specifications</span>
                                    <span className="text-[#10b981] font-bold">JWT SIGNED</span>
                                </div>
                                <div className="text-primary/90 flex justify-between mb-1">
                                    <span>Node Identity:</span>
                                    <span className="text-foreground">{telemetry.nodeId}</span>
                                </div>
                                <div className="text-primary/90 flex justify-between mb-1">
                                    <span>Authed User:</span>
                                    <span className="text-foreground font-semibold">{telemetry.authUsername}</span>
                                </div>
                                <div className="text-primary/90 flex justify-between">
                                    <span>Sync Timestamp:</span>
                                    <span className="text-[10px] text-muted-foreground">{new Date(telemetry.timestamp).toLocaleTimeString()}</span>
                                </div>
                            </div>
                            <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-4 font-mono text-xs shadow-inner">
                                <div className="text-accent/60 mb-2 border-b border-white/5 pb-1 uppercase tracking-tighter text-[9px] font-bold">Live Authed Dockets (SECURE STACK)</div>
                                {telemetry.activeDockets?.map((doc: string, idx: number) => (
                                  <div key={idx} className="text-primary/90 mt-1.5 flex items-start gap-2">
                                      <span className="text-[#10b981] shrink-0 font-bold">&#8226;</span>
                                      <span>{doc}</span>
                                  </div>
                                ))}
                            </div>

                            {/* Dynamic Lattice Latency Monitor */}
                            <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-4 font-mono text-xs shadow-inner space-y-3">
                                <div className="text-accent/60 mb-2 border-b border-white/5 pb-1 uppercase tracking-tighter text-[9px] font-bold flex justify-between items-center">
                                    <span className="flex items-center gap-1.5 text-primary">
                                      <Activity className="w-3.5 h-3.5 text-primary animate-pulse" /> LATENCY DIAGNOSTICS
                                    </span>
                                    <span className="text-[#10b981] font-bold">REAL-TIME</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-muted-foreground text-[10px] uppercase">Ping Target</span>
                                        <span className="text-foreground font-semibold">/api/{pingTarget}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 items-end">
                                        <span className="text-muted-foreground text-[10px] uppercase block">Round-Trip Time</span>
                                        <span className={`font-bold text-sm tracking-tight ${
                                          lastLatency === null ? "text-muted-foreground" :
                                          lastLatency < 50 ? "text-[#10b981]" :
                                          lastLatency < 120 ? "text-yellow-400" : "text-rose-400"
                                        }`}>
                                          {lastLatency !== null ? `${lastLatency} ms` : "--- ms"}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress bar and rating */}
                                <div className="flex items-center justify-between text-[10px] bg-white/5 px-2 py-1 rounded border border-white/5">
                                  <span className="text-muted-foreground">LINK HEALTH</span>
                                  <span className={`font-mono font-bold uppercase ${
                                    lastLatency === null ? "text-muted-foreground" :
                                    lastLatency < 50 ? "text-[#10b981]" :
                                    lastLatency < 120 ? "text-yellow-400" : "text-rose-400"
                                  }`}>
                                    {lastLatency === null ? "PENDING TEST" :
                                     lastLatency < 30 ? "DIRECT COHERENCE" :
                                     lastLatency < 50 ? "EXCELLENT" :
                                     lastLatency < 120 ? "OPTIMAL" :
                                     lastLatency < 250 ? "STABLE" : "LINK CONGESTED"}
                                  </span>
                                </div>

                                {/* Mini graphical track of latency histories */}
                                <div className="pt-1">
                                  <div className="text-[9px] text-accent font-bold uppercase tracking-wider mb-1.5 flex justify-between">
                                    <span>RTT HISTORY</span>
                                    <span className="text-muted-foreground font-normal">Last {latencyHistory.length}/15</span>
                                  </div>
                                  {latencyHistory.length > 0 ? (
                                    <>
                                      <div className="h-10 flex items-end gap-1 px-2 py-1.5 bg-[#030308]/60 rounded border border-white/5 relative group justify-between">
                                        {latencyHistory.map((item, idx) => {
                                          const heightPercentage = Math.min(100, Math.max(15, (item.latency / 300) * 100));
                                          const barColor = item.latency < 50 ? "bg-[#10b981]" : item.latency < 120 ? "bg-yellow-500" : "bg-rose-500";
                                          return (
                                            <div 
                                              key={idx} 
                                              className="flex-1 flex flex-col items-center group/bar relative"
                                              style={{ height: "100%" }}
                                            >
                                              {/* Bar */}
                                              <div 
                                                className={`w-full rounded-t-sm ${barColor} opacity-75 hover:opacity-100 transition-all`}
                                                style={{ height: `${heightPercentage}%` }}
                                              />
                                              {/* Tooltip */}
                                              <div className="absolute bottom-full mb-1 bg-[#0a0a24] text-white text-[8px] font-mono px-1 rounded opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-30 border border-primary/40 shadow">
                                                {item.latency}ms ({item.time})
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="mt-1.5 text-[10px] text-muted-foreground flex justify-between items-center bg-white/5 px-2.5 py-1.5 rounded border border-white/5">
                                        <span>AVERAGE RTT (LAST 15 MEASUREMENTS)</span>
                                        <span className="font-bold text-foreground">
                                          {Math.round(latencyHistory.reduce((sum, item) => sum + item.latency, 0) / latencyHistory.length)} ms
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="h-10 flex items-center justify-center text-[10px] text-muted-foreground/50 italic bg-[#030308]/60 rounded border border-white/5">
                                      No latency signals yet. Run a measurement.
                                    </div>
                                  )}
                                </div>

                                {/* Active controllers */}
                                <div className="flex gap-2 pt-1.5">
                                  <button
                                    type="button"
                                    onClick={handleManualPing}
                                    disabled={isPinging}
                                    className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 py-1 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer font-sans disabled:opacity-50 transition-colors"
                                  >
                                    {isPinging ? (
                                      <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                                    ) : (
                                      <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
                                    )}
                                    <span>{isPinging ? "pinging..." : "measure link"}</span>
                                  </button>
                                  
                                  <select
                                    value={pingTarget}
                                    onChange={(e: any) => setPingTarget(e.target.value)}
                                    className="bg-background border border-border/50 text-foreground text-[10px] uppercase font-bold tracking-tight rounded-md px-2 py-1 select-none font-mono focus:outline-none focus:border-primary/40"
                                  >
                                    <option value="telemetry">Secured</option>
                                    <option value="hello">Public</option>
                                  </select>
                                </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-6 min-h-[150px] flex items-center justify-center font-mono text-xs text-muted-foreground italic">
                            Awaiting synchronization...
                          </div>
                        )}
                      </div>

                      <div className="bg-[#050510]/80 rounded-lg border border-border/50 p-5 font-mono text-xs shadow-inner flex flex-col justify-center items-center text-center">
                        <div className="text-accent/60 mb-4 border-b border-white/5 pb-1 uppercase tracking-tighter text-[10px] font-bold w-full text-center">Stability Check (S)</div>
                        <div className="text-5xl font-extrabold text-[#10b981] tracking-tighter">0.99</div>
                        <div className="mt-4 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#10b981] w-[99%]" />
                        </div>
                        <div className="text-[9px] text-[#10b981] mt-2 uppercase tracking-widest font-extrabold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Securing Accuracy Gateway
                        </div>

                        {/* Recharts Divergence Score Area Chart */}
                        <div className="w-full mt-6 pt-4 border-t border-white/5 flex flex-col items-start">
                          <div className="text-[10px] text-accent font-bold uppercase tracking-wider mb-2">Divergence Score Trend</div>
                          <div className="h-28 w-full mt-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={[
                                  { epoch: "04:00", score: 0.15 },
                                  { epoch: "08:00", score: 0.11 },
                                  { epoch: "12:00", score: 0.08 },
                                  { epoch: "16:00", score: 0.05 },
                                  { epoch: "20:00", score: 0.03 },
                                  { epoch: "Live", score: telemetry?.kernelDiagnostics?.divergenceScore ?? 0.02 }
                                ]}
                                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                              >
                                <defs>
                                  <linearGradient id="divergenceColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <XAxis 
                                  dataKey="epoch" 
                                  stroke="#4b5563" 
                                  fontSize={8}
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <YAxis 
                                  stroke="#4b5563" 
                                  fontSize={8}
                                  domain={[0, 0.2]}
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <Tooltip
                                  contentStyle={{ 
                                    backgroundColor: '#0a0a24', 
                                    borderColor: '#10b981',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '9px',
                                    fontFamily: 'monospace'
                                  }}
                                  itemStyle={{ color: '#10b981' }}
                                  labelStyle={{ color: '#9ca3af' }}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="score" 
                                  stroke="#10b981" 
                                  strokeWidth={1.5}
                                  fillOpacity={1} 
                                  fill="url(#divergenceColor)" 
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="text-[8px] text-muted-foreground mt-2 w-full text-center">Lower score indicates higher system coherence</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Panel: Repository Registry */}
          <aside className="w-full md:w-72 bg-[#080815]/80 backdrop-blur-xl shrink-0 flex flex-col border-t md:border-t-0 p-6 z-10">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-6">Repository Registry</h3>
            
            <div className="space-y-4">
              <RegistryItem name="Hewston" role="Gemini Starter" status="ACTIVE" />
              <RegistryItem name="The-Paralegal-" role="Controller" status="ACTIVE" />
              <RegistryItem name="ObservX-Core" role="Foundation" status="PENDING" />
              
              <div className="pt-6 border-t border-border/50 mt-4">
                <label className="text-[10px] text-muted-foreground uppercase font-bold mb-3 block tracking-widest">Environment Meta</label>
                <div className="space-y-2">
                  <ConfigItem label="Platform" value="Termux / Local" />
                  <ConfigItem label="Auditor" value="v1.0" />
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-border/50">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10 group cursor-default">
                  <Server className="w-5 h-5 text-primary shrink-0 transition-transform shadow-[0_0_10px_rgba(139,92,246,0.4)]" />
                  <div className="text-[10px] leading-tight">
                    <div className="font-bold text-foreground">Audit Record</div>
                    <div className="text-muted-foreground">Public Ledger Upstream</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* Terminal Section Pattern */}
        <footer className="h-40 border-t border-border bg-[#050510] p-4 relative overflow-hidden shrink-0 hidden sm:block">
          <div className="flex items-center gap-6 mb-3 border-b border-border pb-2 text-[10px] uppercase tracking-[0.2em] font-bold">
            <span className="text-primary border-b border-primary pb-2 flex items-center gap-2">
              <TerminalIcon className="w-3 h-3 text-primary h-[8px]" /> Operational Trace
            </span>
            <span className="opacity-40">System Log</span>
          </div>
          <div className="font-mono text-[11px] space-y-1.5 overflow-y-auto h-24 custom-scrollbar pr-2">
            <div className="text-primary opacity-60">[audit] Initializing ObservX Master Infrastructure...</div>
            <div className="text-accent opacity-60">[protocol] Kinetic Rules verified within focus lattice.</div>
            <div className="text-muted-foreground opacity-40">[system] Paralegal syncing with repository registry.</div>
            <div className="text-primary/80">
              {loading ? "> TRACE_LEDGER (pending...)" : `> LEDGER_ACK (200) - NODE_OK`}
            </div>
            <div className="inline-block w-2 h-4 bg-primary/40 animate-pulse ml-1 vertical-middle shadow-[0_0_5px_rgba(139,92,246,0.5)]" />
          </div>
        </footer>
      </main>
    </div>
  );
}

function StatusCard({ title, status, icon, onRefresh, description }: { title: string; status: "loading" | "success" | "error"; icon: React.ReactNode; onRefresh: () => void; description?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded bg-secondary text-foreground group-hover:text-primary transition-colors">
          {icon}
        </div>
        <button onClick={onRefresh} className="p-1 hover:bg-secondary rounded transition-colors text-muted-foreground">
          <RefreshCw className={`w-3 h-3 ${status === "loading" ? "animate-spin" : ""}`} />
        </button>
      </div>
      <h3 className="text-sm font-bold mb-1 tracking-tight">{title}</h3>
      <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1.5">
          {description}
      </div>
      <div className="flex items-center gap-1.5 pt-2 border-t border-border/20">
        <div className={`w-1.5 h-1.5 rounded-full ${status === "success" ? "bg-green-500" : status === "error" ? "bg-destructive" : "bg-yellow-500"}`} />
        <span className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-widest">
          {status === "success" ? "Stable" : status === "error" ? "Divergent" : "Syncing"}
        </span>
      </div>
    </div>
  );
}

function RegistryItem({ name, role, status }: { name: string; role: string; status: "ACTIVE" | "PENDING" | "DIVERGENT" }) {
    return (
        <div className="p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-primary/5 transition-colors">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-foreground">{name}</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                    {status}
                </span>
            </div>
            <div className="text-[10px] text-muted-foreground italic">{role}</div>
        </div>
    )
}

function ConfigItem({ label, value, isProxy }: { label: string; value: string; isProxy?: boolean }) {
  return (
    <div className="flex justify-between items-center bg-background/50 border border-border/50 rounded px-2 py-1.5">
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs ${isProxy ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function CapabilityBadge({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded bg-secondary/50 border border-border/50 text-[9px] font-bold uppercase tracking-tighter text-muted-foreground">
      {label}
    </span>
  );
}
