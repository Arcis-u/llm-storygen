"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, Cpu, Database, Terminal, Server, Clock, HardDrive, BrainCircuit, ArrowLeft, Network, ShieldCheck, Zap, Code, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import axios from "axios";

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m ${s}s`;
};

const formatBytes = (kb: number) => {
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(2)} MB`;
  return `${(kb / (1024 * 1024)).toFixed(2)} GB`;
};

const ProgressBar = ({ label, percent, color, detailRight }: any) => (
  <div style={{ marginBottom: "1rem" }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
      <span>{label}</span>
      <span>{detailRight || `${percent.toFixed(1)}%`}</span>
    </div>
    <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
      <motion.div 
        initial={{ width: 0 }} 
        animate={{ width: `${Math.max(0, Math.min(100, percent))}%` }} 
        transition={{ duration: 0.5 }}
        style={{ height: "100%", background: color, boxShadow: `0 0 10px ${color}` }}
      />
    </div>
  </div>
);

const CardHeader = ({ icon: Icon, title, color, status }: any) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", borderBottom: `1px solid ${color}33`, paddingBottom: "0.8rem" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
      <Icon color={color} size={20} />
      <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: color, letterSpacing: "2px" }}>{title}</h2>
    </div>
    {status && (
      <div style={{ fontSize: "0.65rem", padding: "3px 8px", background: `${color}22`, borderRadius: "4px", color: color, fontWeight: 700, letterSpacing: "1px" }}>
        {status}
      </div>
    )}
  </div>
);

export default function PanoramaDashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/system/status");
        setData(res.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Connection refused");
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#020204", color: "#fff", position: "relative", overflowX: "hidden", padding: "2rem" }}>
      {/* Background */}
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: "linear-gradient(rgba(0, 245, 212, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 212, 0.03) 1px, transparent 1px)", backgroundSize: "30px 30px", zIndex: 0 }} />
      <div className="scanlines" style={{ opacity: 0.2, position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />
      
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1800, margin: "0 auto" }}>
        
        {/* HEADER */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", borderBottom: "1px solid rgba(0,245,212,0.2)", paddingBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            <Link href="/" style={{ padding: "0.5rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", display: "flex", alignItems: "center", gap: "0.5rem", color: "#fff", textDecoration: "none", fontSize: "0.8rem", transition: "0.3s" }}>
              <ArrowLeft size={16} /> RETURN_TO_BASE
            </Link>
            <div>
              <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, letterSpacing: "5px", color: "#00f5d4", textShadow: "0 0 15px rgba(0,245,212,0.4)" }}>
                PANORAMA_DASHBOARD
              </h1>
              <div style={{ fontSize: "0.75rem", color: "rgba(0,245,212,0.6)", marginTop: "0.2rem", letterSpacing: "4px", fontFamily: "monospace" }}>
                GLOBAL SYSTEM TELEMETRY V3.0
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: "right", fontFamily: "monospace" }}>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.3rem" }}>SERVER_TIME (UTC)</div>
            <div style={{ fontSize: "1.2rem", color: "#fff", letterSpacing: "2px" }}>{data ? data.timestamp_utc : "--:--:--"}</div>
          </div>
        </header>

        {error && (
          <div style={{ padding: "1.5rem", background: "rgba(220,38,38,0.1)", borderLeft: "4px solid var(--accent-error)", color: "var(--accent-error)", marginBottom: "2rem", fontFamily: "monospace" }}>
            <h2 style={{ margin: "0 0 0.5rem 0" }}>[!] API GATEWAY UNREACHABLE</h2>
            <p style={{ margin: 0 }}>System core is not responding. Awaiting manual reboot.</p>
          </div>
        )}

        {data && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "1.5rem" }}>
            
            {/* ROW 1: CORE INFRASTRUCTURE (3 Cards) */}
            
            {/* 1.1 API GATEWAY */}
            <div className="glass-card" style={{ gridColumn: "span 4", padding: "1.5rem", border: "1px solid rgba(59,130,246,0.3)" }}>
              <CardHeader icon={Activity} title="API_GATEWAY" color="#3b82f6" status="ONLINE" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>TOTAL REQUESTS</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff" }}>{data.api_core.total_requests.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>ERROR RATE</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, color: data.api_core.error_rate > 5 ? "#ef4444" : "#10b981" }}>{data.api_core.error_rate.toFixed(2)}%</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>AVG LATENCY</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#3b82f6" }}>{data.api_core.avg_latency_ms.toFixed(1)} ms</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>ASYNC TASKS</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff" }}>{data.api_core.active_async_tasks} active</div>
                </div>
              </div>
            </div>

            {/* 1.2 HOST VITALS */}
            <div className="glass-card" style={{ gridColumn: "span 4", padding: "1.5rem", border: "1px solid rgba(157,78,221,0.3)" }}>
              <CardHeader icon={Server} title="HOST_HARDWARE" color="#e0aaff" status={formatUptime(data.uptime_seconds)} />
              <ProgressBar label={`CPU CORE (${data.host.cpu_cores_physical} Physical / ${data.host.cpu_cores_logical} Logical)`} percent={data.host.cpu_percent} color="#00f5d4" />
              <ProgressBar label="RAM MEMORY ALLOCATION" percent={data.host.memory_percent} color="#9d4edd" detailRight={`${data.host.memory_used_mb.toFixed(0)} / ${data.host.memory_total_mb.toFixed(0)} MB`} />
              <ProgressBar label="SYSTEM DISK USAGE" percent={data.host.disk_percent} color="#f59e0b" detailRight={`${data.host.disk_free_gb.toFixed(1)} GB Free`} />
            </div>

            {/* 1.3 MONGODB CORE */}
            <div className="glass-card" style={{ gridColumn: "span 4", padding: "1.5rem", border: "1px solid rgba(16,185,129,0.3)" }}>
              <CardHeader icon={Database} title="MONGODB_CORE" color="#10b981" status={data.database.status.toUpperCase()} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>TOTAL DATA SIZE</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff" }}>{formatBytes(data.database.data_size_kb)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>TOTAL OBJECTS</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#10b981" }}>{data.database.objects.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>ACTIVE INDEXES</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff" }}>{data.database.indexes} loaded</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>PING LATENCY</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff" }}>{data.database.latency_ms.toFixed(2)} ms</div>
                </div>
              </div>
            </div>

            {/* ROW 2: AGENTS, VECTORS, LLMS (4 Cards) */}

            {/* 2.1 AGENT MATRIX */}
            <div className="glass-card" style={{ gridColumn: "span 3", padding: "1.5rem", border: "1px solid rgba(236,72,153,0.3)" }}>
              <CardHeader icon={ShieldCheck} title="AGENT_MATRIX" color="#ec4899" status="ONLINE" />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {data.agents.map((ag: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem", background: "rgba(0,0,0,0.3)", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{ag.name}</span>
                    <span style={{ fontSize: "0.7rem", color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 6px", borderRadius: "4px" }}>READY</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2.2 QDRANT VECTOR */}
            <div className="glass-card" style={{ gridColumn: "span 3", padding: "1.5rem", border: "1px solid rgba(59,130,246,0.3)" }}>
              <CardHeader icon={Network} title="QDRANT_VECTOR" color="#3b82f6" status={data.vector_db.status.toUpperCase()} />
              {data.vector_db.collections.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "180px", overflowY: "auto" }}>
                  {data.vector_db.collections.map((c: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.3)", padding: "0.6rem", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{c.name}</span>
                      <div style={{ fontSize: "0.85rem", color: "#3b82f6", fontWeight: 700 }}>{c.vectors_count.toLocaleString()} <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>pts</span></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "4px", fontSize: "0.8rem" }}>
                  No vector collections found
                </div>
              )}
            </div>

            {/* 2.3 LLM CORE */}
            <div className="glass-card" style={{ gridColumn: "span 3", padding: "1.5rem", border: "1px solid rgba(245,158,11,0.3)" }}>
              <CardHeader icon={BrainCircuit} title="LLM_CORE" color="#fcd34d" status="ACTIVE" />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {data.llm_matrix.map((llm: any, idx: number) => (
                  <div key={idx} style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", padding: "0.6rem", borderRadius: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{llm.provider}</span>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: llm.status === "Ready" ? "#10b981" : "#f59e0b" }} />
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                      {llm.capabilities.join(" | ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2.4 DEPENDENCIES */}
            <div className="glass-card" style={{ gridColumn: "span 3", padding: "1.5rem", border: "1px solid rgba(255,255,255,0.2)" }}>
              <CardHeader icon={Code} title="SYS_DEPENDENCIES" color="#fff" />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>OS ENVIRONMENT</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{data.host.os}</span>
                </div>
                {Object.entries(data.api_core.dependencies).map(([key, val]: any) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>{key}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>v{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ROW 3: LIVE TERMINAL */}
            <div className="glass-card" style={{ gridColumn: "span 12", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid rgba(0,245,212,0.3)" }}>
              <div style={{ background: "rgba(0,0,0,0.8)", padding: "0.8rem 1.5rem", borderBottom: "1px solid rgba(0,245,212,0.2)", display: "flex", alignItems: "center", gap: "1rem" }}>
                <Terminal color="#00f5d4" size={16} />
                <span style={{ fontSize: "0.75rem", color: "#00f5d4", letterSpacing: "2px", fontFamily: "monospace" }}>/VAR/LOG/FASTAPI_TRAFFIC_STREAM.LOG</span>
                <span style={{ marginLeft: "auto", fontSize: "0.65rem", background: "rgba(0,245,212,0.1)", padding: "2px 8px", color: "#00f5d4", borderRadius: "10px" }}>LIVE</span>
              </div>
              <div className="mono-font" style={{ flex: 1, background: "#020202", padding: "1.5rem", overflowY: "auto", fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.8, minHeight: "220px" }}>
                {data.api_core.traffic_log.length > 0 ? (
                  data.api_core.traffic_log.map((log: string, idx: number) => {
                    const isError = log.includes("-> 4") || log.includes("-> 5");
                    return (
                      <div key={idx} style={{ marginBottom: "0.2rem" }}>
                        <span style={{ color: "rgba(255,255,255,0.3)", marginRight: "10px" }}>{log.split("]")[0]}]</span>
                        <span style={{ color: isError ? "#ef4444" : "#00f5d4" }}>{log.split("]")[1]}</span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: "rgba(255,255,255,0.3)" }}>Awaiting inbound API traffic...</div>
                )}
                <div style={{ color: "#00f5d4", marginTop: "1rem" }}>
                  <span>{">"} </span>
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} style={{ display: "inline-block", width: 8, height: 14, background: "#00f5d4", verticalAlign: "middle" }} />
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
