"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Play, Trash2, Clock, Globe, Shield, Loader2, Sparkles, AlertTriangle, Settings } from "lucide-react";
import { getMyStories, deleteStory } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import StorySettingsModal from "@/components/StorySettingsModal";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingsStory, setSettingsStory] = useState<any | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchStories();
  }, [isAuthenticated, router]);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const data = await getMyStories();
      setStories(data.stories || []);
    } catch (err) {
      console.error("Failed to fetch stories", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (storyId: string) => {
    if (!confirm("Delete this universe forever? This action cannot be undone.")) return;
    try {
      setDeletingId(storyId);
      await deleteStory(storyId);
      setStories((prev) => prev.filter((s) => s.story_id !== storyId));
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete the story. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const cardVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (!isAuthenticated()) return null;

  return (
    <div className="min-h-screen text-white relative overflow-x-hidden" style={{ background: "#05050A" }}>
      {/* Background glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#05050A]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 shadow-[0_0_15px_rgba(157,78,221,0.5)] flex items-center justify-center">
              <span className="text-white font-black text-xs tracking-tighter">NEX</span>
            </div>
            <span className="font-bold tracking-widest text-sm text-white/90">NEXUS CORE</span>
          </Link>
          <div className="h-4 w-px bg-white/20 mx-2" />
          <span className="text-sm font-medium text-white/50">DASHBOARD</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block mr-2">
            <div className="text-sm font-bold">{user?.username}</div>
            <div className="text-xs text-cyan-400 uppercase tracking-widest">{user?.role}</div>
          </div>
          {user?.role === 'admin' && (
            <Link href="/admin">
              <button className="px-4 py-1.5 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-full transition-colors border border-red-500/20">
                ADMIN PANEL
              </button>
            </Link>
          )}
          <button 
            onClick={logout}
            className="px-4 py-1.5 text-xs font-bold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"
          >
            LOGOUT
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 flex items-center gap-3">
              Your Universes
              <Sparkles className="text-cyan-400" size={28} />
            </h1>
            <p className="text-white/50 text-lg">Continue your journeys or forge a new reality.</p>
          </div>
          
          <Link href="/create">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,245,212,0.4)] transition-all transform hover:scale-105 active:scale-95">
              <Plus size={20} />
              <span>INITIALIZE NEW STORY</span>
            </button>
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Loader2 size={48} className="animate-spin text-cyan-400 mb-4" />
            <p className="tracking-widest uppercase text-sm font-bold">Scanning Nexus Database...</p>
          </div>
        ) : stories.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm"
          >
            <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
              <Globe size={40} className="text-white/30" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No active universes detected</h3>
            <p className="text-white/50 mb-8 max-w-md">You haven't initiated any story instances yet. The neural network awaits your command.</p>
            <Link href="/create">
              <button className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition-all">
                <Plus size={20} />
                <span>START FIRST STORY</span>
              </button>
            </Link>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {stories.map((story) => (
              <motion.div
                key={story.story_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                className="group relative bg-[#0a0a0f] border border-white/5 rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(0,255,255,0.1)] transition-all duration-300"
              >
                {/* Background rendering for cover_image */}
                {story.cover_image && (
                  <div 
                    className="absolute inset-0 z-0 opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                    style={{
                      backgroundImage: `url(${story.cover_image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                )}
                {/* Dark gradient overlay so text remains readable */}
                <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent pointer-events-none" />

                {/* Status indicator */}
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  {story.is_god_mode && (
                    <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-1 rounded-full border border-yellow-500/30 backdrop-blur-md">
                      <Shield size={10} />
                      GOD
                    </div>
                  )}
                  <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border backdrop-blur-md ${
                    story.is_ended 
                      ? "bg-red-500/20 text-red-400 border-red-500/30" 
                      : "bg-green-500/20 text-green-400 border-green-500/30"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${story.is_ended ? "bg-red-400" : "bg-green-400 animate-pulse"}`} />
                    {story.is_ended ? "ARCHIVED" : "ACTIVE"}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 relative z-10 flex flex-col h-full">
                  <h3 className="text-xl font-bold mb-1 truncate pr-20 group-hover:text-cyan-300 transition-colors">
                    {story.title}
                  </h3>
                  <div className="text-sm text-cyan-500 mb-4 capitalize font-medium">
                    {story.genre.replace("_", " ")}

                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-white/60">
                      <BookOpen size={16} className="mr-3 opacity-50" />
                      <span className="flex-1">Chapter {story.current_chapter}</span>
                      <span className="text-xs opacity-50 bg-white/5 px-2 py-0.5 rounded-md">{story.total_turns || 0} Turns</span>
                    </div>
                    <div className="flex items-center text-sm text-white/60">
                      <Clock size={16} className="mr-3 opacity-50" />
                      <span className="truncate">{new Date(story.updated_at || story.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Character mini-preview */}
                  {story.character && (
                    <div className="bg-white/5 rounded-xl p-3 mb-6 border border-white/5 text-sm">
                      <div className="font-bold text-white/80 mb-1">{story.character.name}</div>
                      <div className="flex flex-wrap gap-1">
                        {story.character.traits?.slice(0, 3).map((t: any, i: number) => (
                          <span key={i} className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/60">
                            {t.name}
                          </span>
                        ))}
                        {story.character.traits?.length > 3 && (
                          <span className="text-[10px] bg-white/5 px-1 py-0.5 rounded text-white/40">+{story.character.traits.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 relative z-10">
                    <button 
                      onClick={() => router.push(`/play?id=${story.story_id}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-cyan-500 hover:text-black rounded-xl font-bold transition-all text-sm backdrop-blur-sm"
                    >
                      <Play size={16} fill="currentColor" />
                      {story.is_ended ? "REVIEW" : "RESUME"}
                    </button>
                    <button 
                      onClick={() => setSettingsStory(story)}
                      className="p-3 bg-white/5 hover:bg-white/20 text-white rounded-xl border border-white/10 transition-all backdrop-blur-sm"
                      title="Settings & Info"
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(story.story_id)}
                      disabled={deletingId === story.story_id}
                      className="p-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl border border-red-500/20 transition-all disabled:opacity-50 backdrop-blur-sm"
                      title="Delete Story"
                    >
                      {deletingId === story.story_id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {settingsStory && (
        <StorySettingsModal 
          isOpen={!!settingsStory}
          onClose={() => setSettingsStory(null)}
          storyId={settingsStory.story_id}
          initialTitle={settingsStory.title}
          initialCoverImage={settingsStory.cover_image}
          characterData={settingsStory.character}
          storyData={settingsStory}
          onSettingsUpdated={() => {
            setSettingsStory(null);
            fetchStories();
          }}
        />
      )}
    </div>
  );
}
