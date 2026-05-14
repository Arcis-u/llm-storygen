"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getAdminStats, getAdminUsers, deleteUser } from "@/lib/api";
import { Shield, Users, Database, Activity, Trash2, Loader2, Server, Globe } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"overview" | "users">("overview");

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetchData();
  }, [isAuthenticated, user, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsData = await getAdminStats();
      setStats(statsData);
      const usersData = await getAdminUsers();
      setUsersList(usersData.users || []);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Xóa người dùng này và toàn bộ dữ liệu của họ? HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC.")) return;
    try {
      await deleteUser(userId);
      setUsersList((prev) => prev.filter((u) => u.user_id !== userId));
      fetchData(); // Refresh stats
    } catch (err) {
      alert("Lỗi khi xóa người dùng.");
    }
  };

  if (!isAuthenticated() || user?.role !== "admin") return null;

  return (
    <div className="min-h-screen text-white bg-[#030305] overflow-x-hidden relative">
      <div className="absolute top-0 right-0 w-full h-[50vh] bg-red-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#030305]/80 backdrop-blur-xl border-b border-red-500/10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            <Shield className="text-red-500" size={20} />
          </div>
          <span className="font-black tracking-[0.2em] text-lg text-white">ADMINISTRATOR</span>
        </div>
        <Link href="/dashboard">
          <button className="px-4 py-2 text-xs font-bold text-white/50 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all">
            EXIT OVERRIDE
          </button>
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10 flex gap-8 flex-col lg:flex-row">
        
        {/* Sidebar */}
        <div className="w-full lg:w-64 flex flex-col gap-2">
          <button 
            onClick={() => setView("overview")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm tracking-wider ${view === "overview" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "text-white/40 hover:bg-white/5 hover:text-white"}`}
          >
            <Activity size={18} /> OVERVIEW
          </button>
          <button 
            onClick={() => setView("users")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm tracking-wider ${view === "users" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "text-white/40 hover:bg-white/5 hover:text-white"}`}
          >
            <Users size={18} /> ACCESS LOGS
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 size={48} className="animate-spin text-red-500" />
            </div>
          ) : view === "overview" && stats ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-3xl font-black mb-8 uppercase tracking-widest text-red-400">System Telemetry</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl relative overflow-hidden">
                  <Users className="absolute -bottom-4 -right-4 text-white/5" size={100} />
                  <div className="text-white/50 text-sm font-bold uppercase tracking-widest mb-2">Total Entities</div>
                  <div className="text-5xl font-black text-white">{stats.total_users}</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl relative overflow-hidden">
                  <Globe className="absolute -bottom-4 -right-4 text-white/5" size={100} />
                  <div className="text-white/50 text-sm font-bold uppercase tracking-widest mb-2">Universes</div>
                  <div className="text-5xl font-black text-white">{stats.total_stories}</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl relative overflow-hidden">
                  <Database className="absolute -bottom-4 -right-4 text-white/5" size={100} />
                  <div className="text-white/50 text-sm font-bold uppercase tracking-widest mb-2">Nodes / Chapters</div>
                  <div className="text-5xl font-black text-white">{stats.total_chapters}</div>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-6 tracking-wider">RECENT ACTIVITY</h3>
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 border-b border-white/10 text-white/50 text-xs uppercase">
                    <tr>
                      <th className="p-4 font-bold tracking-wider">Story ID</th>
                      <th className="p-4 font-bold tracking-wider">User ID</th>
                      <th className="p-4 font-bold tracking-wider">Genre</th>
                      <th className="p-4 font-bold tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_stories.map((s: any, i: number) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-cyan-400">{s.story_id.split("-")[0]}...</td>
                        <td className="p-4 font-mono text-white/60">{s.user_id.split("-")[0]}</td>
                        <td className="p-4 capitalize">{s.genre}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest ${s.is_ended ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                            {s.is_ended ? "ENDED" : "ACTIVE"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : view === "users" ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-3xl font-black mb-8 uppercase tracking-widest text-red-400">Identity Directory</h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 border-b border-white/10 text-white/50 text-xs uppercase">
                    <tr>
                      <th className="p-4 font-bold tracking-wider">Username</th>
                      <th className="p-4 font-bold tracking-wider">Role</th>
                      <th className="p-4 font-bold tracking-wider">Created At</th>
                      <th className="p-4 font-bold tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u: any, i: number) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold flex items-center gap-3">
                          <UserIcon role={u.role} />
                          {u.username}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/60'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-white/50">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                          {u.role !== 'admin' && (
                            <button 
                              onClick={() => handleDeleteUser(u.user_id)}
                              className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors"
                              title="Delete Identity"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

const UserIcon = ({ role }: { role: string }) => {
  if (role === 'admin') return <Shield size={16} className="text-red-400" />;
  return <Server size={16} className="text-cyan-400" />;
};
