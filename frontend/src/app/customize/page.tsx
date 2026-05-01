"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Zap,
  Plus,
  Trash2,
  Shield,
  Target,
  Sparkles,
  Loader2,
  ChevronRight,
  AlertTriangle,
  Hexagon,
  User,
  Activity,
  Cpu,
  Lock
} from "lucide-react";
import { useStoryStore, CustomTrait, SpecialAbility, CharacterSkill, PlotTrigger } from "@/store/useStoryStore";
import { customizeStory, startStory, getStoryState } from "@/lib/api";
import HologramAvatar from "@/components/HologramAvatar";
import RadarChart from "@/components/RadarChart";

function CustomizeContent() {
  const router = useRouter();
  const params = useSearchParams();
  const storyId = params.get("id") || "";
  const { setPhase } = useStoryStore();

  const [activeTab, setActiveTab] = useState<"traits" | "abilities" | "skills">("traits");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);

  // --- States ---
  const [traits, setTraits] = useState<CustomTrait[]>([]);
  const [abilities, setAbilities] = useState<SpecialAbility[]>([]);
  const [skills, setSkills] = useState<CharacterSkill[]>([]);
  const [triggers, setTriggers] = useState<PlotTrigger[]>([]);

  // --- Load auto-generated data from backend on mount ---
  useEffect(() => {
    if (!storyId) return;
    getStoryState(storyId)
      .then((data) => {
        if (data.config) {
          const char = data.config.character || {};
          if (char.traits && char.traits.length > 0) setTraits(char.traits);
          else setTraits([{ name: "", description: "", current_value: 50, max_value: 100, min_value: 0, story_impact: "" }]);
          
          if (char.abilities && char.abilities.length > 0) setAbilities(char.abilities);
          else setAbilities([{ name: "", description: "", origin: "", power_level: 1, side_effects: [], cooldown_turns: 0, last_used_chapter: 0 }]);
          
          if (char.skills && char.skills.length > 0) setSkills(char.skills);
          else setSkills([{ name: "", description: "", proficiency: 1, source: "" }]);
          
          if (data.config.plot_triggers && data.config.plot_triggers.length > 0) setTriggers(data.config.plot_triggers);
          else setTriggers([{ title: "", description: "", importance: 5, probability: 0.5, earliest_chapter: 1, triggered: false, triggered_at_chapter: null, related_traits: [] }]);
        }
        setDataLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load story config:", err);
        setTraits([{ name: "", description: "", current_value: 50, max_value: 100, min_value: 0, story_impact: "" }]);
        setAbilities([{ name: "", description: "", origin: "", power_level: 1, side_effects: [], cooldown_turns: 0, last_used_chapter: 0 }]);
        setSkills([{ name: "", description: "", proficiency: 1, source: "" }]);
        setTriggers([{ title: "", description: "", importance: 5, probability: 0.5, earliest_chapter: 1, triggered: false, triggered_at_chapter: null, related_traits: [] }]);
        setDataLoaded(true);
      });
  }, [storyId]);

  // --- Handlers ---
  const handleAdd = (type: string) => {
    if (type === "traits") setTraits([...traits, { name: "", description: "", current_value: 50, max_value: 100, min_value: 0, story_impact: "" }]);
    if (type === "abilities") setAbilities([...abilities, { name: "", description: "", origin: "", power_level: 1, side_effects: [], cooldown_turns: 0, last_used_chapter: 0 }]);
    if (type === "skills") setSkills([...skills, { name: "", description: "", proficiency: 1, source: "" }]);
    if (type === "triggers") setTriggers([...triggers, { title: "", description: "", importance: 5, probability: 0.5, earliest_chapter: 1, triggered: false, triggered_at_chapter: null, related_traits: [] }]);
  };

  const handleRemove = (type: string, i: number) => {
    if (type === "traits") setTraits(traits.filter((_, idx) => idx !== i));
    if (type === "abilities") setAbilities(abilities.filter((_, idx) => idx !== i));
    if (type === "skills") setSkills(skills.filter((_, idx) => idx !== i));
    if (type === "triggers") setTriggers(triggers.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const filteredTraits = traits.filter((t) => t.name.trim() !== "");
      const filteredAbilities = abilities.filter((a) => a.name.trim() !== "");
      const filteredSkills = skills.filter((s) => s.name.trim() !== "");
      const filteredTriggers = triggers.filter((t) => t.title.trim() !== "");

      setStatusMsg("Đang đồng bộ hóa thực thể...");
      await customizeStory({
        story_id: storyId,
        traits: filteredTraits,
        abilities: filteredAbilities,
        skills: filteredSkills,
        plot_triggers: filteredTriggers,
      });

      setStatusMsg("AI đang kiến tạo vũ trụ... (Vui lòng chờ)");
      await startStory(storyId);

      setPhase("playing");
      router.push(`/play?id=${storyId}`);
    } catch (err) {
      console.error("Customization failed:", err);
      alert("Kết nối AI thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
      setStatusMsg("");
    }
  };

  if (!dataLoaded) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <Loader2 size={40} className="animate-spin" color="var(--accent-primary)" />
        <div className="glitch-text" data-text="ĐANG TRÍCH XUẤT DỮ LIỆU NHÂN VẬT...">ĐANG TRÍCH XUẤT DỮ LIỆU NHÂN VẬT...</div>
      </div>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "1.5rem", background: "var(--bg-base)", position: "relative", overflow: "hidden" }}>
      {/* Background Elements */}
      <div className="hex-grid-bg" style={{ opacity: 0.5 }} />
      <div className="scanlines" style={{ opacity: 0.15 }} />

      {/* HEADER */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", marginBottom: "1.5rem", zIndex: 1 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, margin: 0, textTransform: "uppercase", letterSpacing: "2px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Activity color="var(--accent-primary)" />
            CẤU HÌNH THỰC THỂ
          </h1>
          <p style={{ margin: "0.2rem 0 0 0", color: "var(--text-muted)", fontSize: "0.85rem", letterSpacing: "1px" }}>SYSTEM://HOLO-LOADOUT_MODULE_V2.0</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary"
          style={{ padding: "0.8rem 2.5rem", fontSize: "1rem", boxShadow: "0 0 30px var(--accent-primary-glow)" }}
        >
          {submitting ? (
            <><Loader2 size={18} className="animate-spin" /> {statusMsg || "ĐANG XỬ LÝ..."}</>
          ) : (
            <><Sparkles size={18} /> KÍCH HOẠT VŨ TRỤ <ChevronRight size={18} /></>
          )}
        </button>
      </header>

      {/* 3-COLUMN LAYOUT */}
      <div style={{ flex: 1, display: "flex", gap: "2rem", zIndex: 1, height: "100%", overflow: "hidden" }}>
        
        {/* COL 1: HOLOGRAM AVATAR */}
        <aside style={{ width: "340px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2rem", alignItems: "center", position: "relative", border: "1px solid rgba(0, 245, 212, 0.3)", boxShadow: "inset 0 0 50px rgba(0, 245, 212, 0.05)" }}>
            {/* Hologram Scanner Effect */}
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "2px", background: "var(--accent-secondary)", boxShadow: "0 0 20px var(--accent-secondary)", animation: "scan-vertical 4s linear infinite" }} />
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes scan-vertical {
                0% { top: 0; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
              }
              @keyframes spin-slow { 100% { transform: rotate(360deg); } }
              @keyframes spin-slow-reverse { 100% { transform: rotate(-360deg); } }
            `}} />
            
            <div style={{ fontWeight: 800, color: "var(--accent-secondary)", letterSpacing: "2px", fontSize: "0.8rem", marginBottom: "2rem", width: "100%", textAlign: "left", borderBottom: "1px solid rgba(0,245,212,0.2)", paddingBottom: "0.5rem" }}>
              <Cpu size={14} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
              SUBJECT ANALYSIS
            </div>

            {/* Hologram Avatar Component */}
            <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HologramAvatar />
            </div>

            <div style={{ marginTop: "auto", width: "100%", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                <span>COMPLEXITY SCORE</span>
                <span style={{ color: "var(--accent-primary)", fontWeight: 800 }}>{traits.length * 10 + abilities.length * 15 + skills.length * 5} PTS</span>
              </div>
              <div style={{ width: "100%", height: "2px", background: "rgba(255,255,255,0.1)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (traits.length * 10 + abilities.length * 15 + skills.length * 5) / 2)}%` }} style={{ height: "100%", background: "var(--accent-primary)", boxShadow: "0 0 10px var(--accent-primary)" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                <span>AVERAGE TRAIT LVL</span>
                <span style={{ color: "var(--accent-tertiary)", fontWeight: 800 }}>{traits.length > 0 ? Math.round(traits.reduce((a, b) => a + b.current_value, 0) / traits.length) : 0}/100</span>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                <span>PLOT INSTABILITY</span>
                <span style={{ color: "var(--accent-danger)", fontWeight: 800 }}>{triggers.length > 0 ? Math.round((triggers.reduce((a, b) => a + b.probability, 0) / triggers.length) * 100) : 0}%</span>
              </div>
              <div style={{ width: "100%", height: "2px", background: "rgba(255,255,255,0.1)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${triggers.length > 0 ? (triggers.reduce((a, b) => a + b.probability, 0) / triggers.length) * 100 : 0}%` }} style={{ height: "100%", background: "var(--accent-danger)", boxShadow: "0 0 10px var(--accent-danger)" }} />
              </div>
            </div>
          </div>
        </aside>

        {/* COL 2: SKILL TREE / ATTRIBUTES */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Custom Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", background: "rgba(10,10,15,0.6)", padding: "0.5rem", borderRadius: "1rem", border: "1px solid var(--glass-border)" }}>
            {[
              { id: "traits", icon: <Shield size={16} />, label: "THUỘC TÍNH (TRAITS)" },
              { id: "abilities", icon: <Zap size={16} />, label: "THIÊN PHÚ (ABILITIES)" },
              { id: "skills", icon: <Target size={16} />, label: "KỸ NĂNG (SKILLS)" }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  flex: 1, padding: "0.8rem", borderRadius: "0.75rem", border: "none", cursor: "pointer",
                  fontWeight: 800, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  background: activeTab === t.id ? "var(--accent-primary)" : "transparent",
                  color: activeTab === t.id ? "#fff" : "var(--text-muted)",
                  boxShadow: activeTab === t.id ? "0 0 20px var(--accent-primary-glow)" : "none",
                  transition: "all 0.3s"
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Dynamic Content Panel */}
          <div className="glass-panel" style={{ flex: 1, padding: "2rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Show Radar Chart for Traits if Active */}
            {activeTab === "traits" && traits.length > 0 && (
              <div style={{ padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "1rem" }}>
                <RadarChart data={traits.map(t => ({ name: t.name || "?", value: t.current_value }))} maxVal={100} />
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
              >
                {/* TRAITS */}
                {activeTab === "traits" && traits.map((item, i) => (
                  <div key={`trait-${i}`} style={{ display: "flex", gap: "1rem", background: "rgba(255,255,255,0.02)", padding: "1.5rem", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ width: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}><Hexagon size={32} color="var(--accent-primary)" /></div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                      <input className="input-field" placeholder="Tên thuộc tính (VD: Thể lực, Ý chí)" value={item.name} onChange={(e) => { const newArr = [...traits]; newArr[i].name = e.target.value; setTraits(newArr); }} style={{ fontSize: "1.1rem", fontWeight: 700, background: "transparent", borderBottom: "1px solid var(--accent-primary)", borderRadius: 0, padding: "0.5rem 0" }} />
                      <input className="input-field" placeholder="Mô tả..." value={item.description} onChange={(e) => { const newArr = [...traits]; newArr[i].description = e.target.value; setTraits(newArr); }} />
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", width: 80 }}>GIÁ TRỊ: {item.current_value}</span>
                        <input type="range" min={item.min_value} max={item.max_value} value={item.current_value} onChange={(e) => { const newArr = [...traits]; newArr[i].current_value = parseInt(e.target.value); setTraits(newArr); }} style={{ flex: 1, accentColor: "var(--accent-primary)" }} />
                      </div>
                    </div>
                    <button className="action-button" onClick={() => handleRemove("traits", i)} style={{ background: "rgba(230, 57, 70, 0.1)", border: "none", color: "var(--accent-danger)" }}><Trash2 size={16} /></button>
                  </div>
                ))}

                {/* ABILITIES */}
                {activeTab === "abilities" && abilities.map((item, i) => (
                  <div key={`ability-${i}`} style={{ display: "flex", gap: "1rem", background: "rgba(255,255,255,0.02)", padding: "1.5rem", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ width: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}><Zap size={32} color="var(--accent-tertiary)" /></div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                      <input className="input-field" placeholder="Tên thiên phú (VD: Mắt Ưng, Kháng Độc)" value={item.name} onChange={(e) => { const newArr = [...abilities]; newArr[i].name = e.target.value; setAbilities(newArr); }} style={{ fontSize: "1.1rem", fontWeight: 700, background: "transparent", borderBottom: "1px solid var(--accent-tertiary)", borderRadius: 0, padding: "0.5rem 0" }} />
                      <input className="input-field" placeholder="Mô tả & Nguồn gốc..." value={item.description} onChange={(e) => { const newArr = [...abilities]; newArr[i].description = e.target.value; setAbilities(newArr); }} />
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", width: 100 }}>SỨC MẠNH (LV):</span>
                        <input type="number" min={1} max={10} value={item.power_level} onChange={(e) => { const newArr = [...abilities]; newArr[i].power_level = parseInt(e.target.value); setAbilities(newArr); }} className="input-field" style={{ width: 80, padding: "0.4rem" }} />
                      </div>
                    </div>
                    <button className="action-button" onClick={() => handleRemove("abilities", i)} style={{ background: "rgba(230, 57, 70, 0.1)", border: "none", color: "var(--accent-danger)" }}><Trash2 size={16} /></button>
                  </div>
                ))}

                {/* SKILLS */}
                {activeTab === "skills" && skills.map((item, i) => (
                  <div key={`skill-${i}`} style={{ display: "flex", gap: "1rem", background: "rgba(255,255,255,0.02)", padding: "1.5rem", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ width: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}><Target size={32} color="var(--accent-info)" /></div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                      <input className="input-field" placeholder="Tên Kỹ năng (VD: Bắn cung, Hack máy tính)" value={item.name} onChange={(e) => { const newArr = [...skills]; newArr[i].name = e.target.value; setSkills(newArr); }} style={{ fontSize: "1.1rem", fontWeight: 700, background: "transparent", borderBottom: "1px solid var(--accent-info)", borderRadius: 0, padding: "0.5rem 0" }} />
                      <input className="input-field" placeholder="Mô tả..." value={item.description} onChange={(e) => { const newArr = [...skills]; newArr[i].description = e.target.value; setSkills(newArr); }} />
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", width: 100 }}>ĐỘ THUẦN THỤC:</span>
                        <input type="range" min={1} max={100} value={item.proficiency} onChange={(e) => { const newArr = [...skills]; newArr[i].proficiency = parseInt(e.target.value); setSkills(newArr); }} style={{ flex: 1, accentColor: "var(--accent-info)" }} />
                        <span style={{ fontSize: "0.8rem", color: "var(--accent-info)", fontWeight: 800 }}>{item.proficiency}%</span>
                      </div>
                    </div>
                    <button className="action-button" onClick={() => handleRemove("skills", i)} style={{ background: "rgba(230, 57, 70, 0.1)", border: "none", color: "var(--accent-danger)" }}><Trash2 size={16} /></button>
                  </div>
                ))}

                <button
                  onClick={() => handleAdd(activeTab)}
                  style={{ width: "100%", padding: "1rem", borderRadius: "1rem", border: "1px dashed rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.02)", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "all 0.3s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "var(--accent-primary)"; e.currentTarget.style.color = "var(--accent-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  <Plus size={20} /> THÊM {activeTab.toUpperCase()}
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* COL 3: PLOT TRIGGERS (CLASSIFIED LOGS) */}
        <aside style={{ width: "380px", display: "flex", flexDirection: "column" }}>
          <div className="glass-panel" style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid rgba(230, 57, 70, 0.3)", boxShadow: "inset 0 0 50px rgba(230, 57, 70, 0.05)" }}>
            <div style={{ fontWeight: 800, color: "var(--accent-danger)", letterSpacing: "2px", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid rgba(230,57,70,0.2)", paddingBottom: "1rem", marginBottom: "0.5rem" }}>
              <AlertTriangle size={18} />
              RESTRICTED: PLOT TRIGGERS
            </div>
            
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
              Các Ràng buộc Cốt truyện (Plot Triggers) là các biến cố ngầm do AI quản lý. Chúng sẽ được kích hoạt ngẫu nhiên dựa trên xác suất và diễn biến câu chuyện.
            </p>

            <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem", paddingRight: "0.5rem", marginTop: "1rem" }}>
              {triggers.map((item, i) => (
                <div key={`trigger-${i}`} style={{ background: "rgba(230, 57, 70, 0.05)", padding: "1rem", borderRadius: "0.75rem", borderLeft: "3px solid var(--accent-danger)", position: "relative" }}>
                  <button onClick={() => handleRemove("triggers", i)} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}><Trash2 size={14} /></button>
                  <input className="input-field" placeholder="Tên Biến cố (VD: Bị ám sát)" value={item.title} onChange={(e) => { const newArr = [...triggers]; newArr[i].title = e.target.value; setTriggers(newArr); }} style={{ fontSize: "0.95rem", fontWeight: 700, background: "transparent", border: "none", padding: 0, marginBottom: "0.5rem", color: "var(--accent-danger)" }} />
                  <textarea className="input-field" placeholder="Mô tả biến cố..." value={item.description} onChange={(e) => { const newArr = [...triggers]; newArr[i].description = e.target.value; setTriggers(newArr); }} style={{ fontSize: "0.8rem", minHeight: "60px", padding: "0.5rem", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(230,57,70,0.2)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.8rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}><Lock size={12} /> TỈ LỆ: {item.probability * 100}%</span>
                    <span>CHƯƠNG ≥ {item.earliest_chapter}</span>
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => handleAdd("triggers")}
                style={{ width: "100%", padding: "0.8rem", borderRadius: "0.5rem", border: "1px dashed rgba(230, 57, 70, 0.4)", background: "transparent", color: "var(--accent-danger)", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}
              >
                + ADD CLASSIFIED FILE
              </button>
            </div>
          </div>
        </aside>

      </div>
    </main>
  );
}

export default function CustomizePage() {
  return (
    <Suspense fallback={
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={40} className="animate-spin" color="var(--accent-primary)" />
      </div>
    }>
      <CustomizeContent />
    </Suspense>
  );
}
