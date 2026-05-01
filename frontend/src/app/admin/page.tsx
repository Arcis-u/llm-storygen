"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, ShieldAlert, Activity, Users, Globe, Target, Map } from "lucide-react";
import Link from "next/link";
import axios from "axios";

const formatTimeAgo = (secondsStr: string) => {
  const d = new Date(secondsStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  return `${mins}m ago`;
};

export default function AdminAnalyticsDashboard() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async (pwd: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await axios.get(`${baseUrl}/api/analytics/admin/live`, {
        headers: { "x-admin-password": pwd }
      });
      setData(res.data);
      setIsAuthenticated(true);
      setError(null);
      return true;
    } catch (err: any) {
      setError("ACCESS DENIED");
      setIsAuthenticated(false);
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchStatus(password);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => fetchStatus(password), 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated, password]);

  if (!isAuthenticated) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "#020202", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: "linear-gradient(rgba(239, 68, 68, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.05) 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 }} />
        
        <motion.form onSubmit={handleLogin} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card" style={{ padding: "3rem", width: "100%", maxWidth: "450px", position: "relative", zIndex: 1, border: "1px solid rgba(239, 68, 68, 0.3)", boxShadow: "0 0 50px rgba(239,68,68,0.1)", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
            <div style={{ padding: "1rem", background: "rgba(239,68,68,0.1)", borderRadius: "50%" }}>
              <Lock color="#ef4444" size={40} />
            </div>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ef4444", marginBottom: "0.5rem", letterSpacing: "3px" }}>RESTRICTED AREA</h1>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "2rem", letterSpacing: "1px" }}>Enter Level 5 Clearance Code</p>
          
          <input 
            type="password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            style={{ width: "100%", padding: "1rem", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "8px", color: "#fff", fontSize: "1rem", textAlign: "center", letterSpacing: "5px", outline: "none", marginBottom: "1.5rem" }}
          />

          {error && <div style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "1.5rem", fontWeight: 600 }}>{error}</div>}

          <button type="submit" style={{ width: "100%", padding: "1rem", background: "rgba(239,68,68,0.2)", border: "1px solid #ef4444", borderRadius: "8px", color: "#ef4444", fontWeight: 700, letterSpacing: "2px", cursor: "pointer", transition: "0.3s" }}>
            AUTHENTICATE
          </button>
        </motion.form>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#020202", color: "#fff", position: "relative", overflowX: "hidden", padding: "2rem" }}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: "linear-gradient(rgba(239, 68, 68, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.05) 1px, transparent 1px)", backgroundSize: "50px 50px", zIndex: 0 }} />
      <div className="scanlines" style={{ opacity: 0.1, position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />
      
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto" }}>
        
        {/* HEADER */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem", borderBottom: "1px solid rgba(239,68,68,0.3)", paddingBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            <Link href="/" style={{ padding: "0.5rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", display: "flex", alignItems: "center", gap: "0.5rem", color: "#fff", textDecoration: "none", fontSize: "0.8rem" }}>
              <Lock size={16} /> LOGOUT
            </Link>
            <div>
              <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, letterSpacing: "5px", color: "#ef4444", textShadow: "0 0 15px rgba(239,68,68,0.4)" }}>
                TRAFFIC_RADAR
              </h1>
              <div style={{ fontSize: "0.75rem", color: "rgba(239,68,68,0.6)", marginTop: "0.2rem", letterSpacing: "4px", fontFamily: "monospace" }}>
                LIVE WEB ANALYTICS COMMAND
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#ef4444", letterSpacing: "2px", fontWeight: 600 }}>LIVE</span>
            <Activity color="#ef4444" size={24} className="animate-pulse" />
          </div>
        </header>

        {/* TOP METRICS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem", marginBottom: "2rem" }}>
          
          <div className="glass-card" style={{ border: "1px solid rgba(239,68,68,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 0" }}>
            <Users color="#ef4444" size={40} style={{ marginBottom: "1rem" }} />
            <div style={{ fontSize: "1rem", color: "rgba(239,68,68,0.7)", letterSpacing: "3px", fontWeight: 600, marginBottom: "0.5rem" }}>ACTIVE USERS ONLINE</div>
            <div style={{ fontSize: "5rem", fontWeight: 900, color: "#ef4444", textShadow: "0 0 30px rgba(239,68,68,0.5)", lineHeight: 1 }}>
              {data?.active_users_count || 0}
            </div>
          </div>

          <div className="glass-card" style={{ border: "1px solid rgba(255,255,255,0.1)", padding: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1rem" }}>
              <ShieldAlert color="#fff" size={20} />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, letterSpacing: "2px" }}>RADAR_SCAN_LOGS</h2>
            </div>
            
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ color: "rgba(255,255,255,0.5)", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th style={{ padding: "0.8rem 1rem", fontWeight: 600, letterSpacing: "1px" }}>IP_ADDRESS</th>
                    <th style={{ padding: "0.8rem 1rem", fontWeight: 600, letterSpacing: "1px" }}>PATH_TRACKED</th>
                    <th style={{ padding: "0.8rem 1rem", fontWeight: 600, letterSpacing: "1px" }}>USER_AGENT</th>
                    <th style={{ padding: "0.8rem 1rem", fontWeight: 600, letterSpacing: "1px" }}>LAST_PING</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.sessions.map((session: any, idx: number) => {
                    const maskedIp = session.ip.split('.').map((p: string, i: number) => i === 3 ? '***' : p).join('.');
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: idx % 2 === 0 ? "rgba(0,0,0,0.3)" : "transparent" }}>
                        <td style={{ padding: "1rem", color: "#00f5d4", fontFamily: "monospace", fontWeight: 600 }}>{maskedIp}</td>
                        <td style={{ padding: "1rem", color: "#fff" }}>
                          <span style={{ padding: "2px 8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px" }}>{session.path}</span>
                        </td>
                        <td style={{ padding: "1rem", color: "rgba(255,255,255,0.6)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={session.agent}>{session.agent}</td>
                        <td style={{ padding: "1rem", color: "#f59e0b" }}>{new Date(session.last_seen * 1000).toLocaleTimeString()}</td>
                      </tr>
                    );
                  })}
                  {!data?.sessions || data.sessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>No active users detected in the network.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
