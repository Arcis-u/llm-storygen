"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ChevronRight,
  Globe,
  User,
  Palette,
  Scroll,
  Loader2,
  Settings,
  Shield,
  Coins,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useStoryStore } from "@/store/useStoryStore";
import { createStory } from "@/lib/api";

const GENRES = [
  { value: "dark_fantasy", label: "Dark Fantasy", emoji: "🗡️", color: "#8b0000", desc: "Thế giới tàn khốc, ma thuật hắc ám và những anh hùng sa ngã." },
  { value: "cyberpunk", label: "Cyberpunk", emoji: "🌃", color: "#00f5d4", desc: "Công nghệ cao, đời sống thấp. Neon, hacker và tập đoàn tư bản." },
  { value: "wuxia", label: "Kiếm Hiệp", emoji: "⚔️", color: "#d4af37", desc: "Giang hồ hiểm ác, bí kíp võ công và những trận chiến kinh thiên." },
  { value: "sci_fi", label: "Sci-Fi", emoji: "🚀", color: "#3b82f6", desc: "Khám phá vũ trụ, người ngoài hành tinh và tương lai nhân loại." },
  { value: "horror", label: "Kinh Dị", emoji: "👻", color: "#2d3748", desc: "Sự sợ hãi tột cùng, những thực thể bí ẩn không thể diễn tả." },
  { value: "romance", label: "Tình Cảm", emoji: "💕", color: "#ec4899", desc: "Tình yêu mãnh liệt, drama và những mối quan hệ phức tạp." },
];

export default function CreatePage() {
  const router = useRouter();
  const { setStoryId, setPhase } = useStoryStore();

  const [step, setStep] = useState(0);
  const [genre, setGenre] = useState("");
  const [worldDesc, setWorldDesc] = useState("");
  const [charName, setCharName] = useState("");
  const [charBackstory, setCharBackstory] = useState("");
  const [tone, setTone] = useState("dark, immersive, detailed");
  const [nsfwEnabled, setNsfwEnabled] = useState(true);
  const [godMode, setGodMode] = useState(false);
  const [startingGold, setStartingGold] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  // Background color effect based on genre
  const [bgColor, setBgColor] = useState("var(--bg-base)");

  useEffect(() => {
    const activeGenre = GENRES.find(g => g.value === genre);
    if (activeGenre) {
      setBgColor(`${activeGenre.color}15`); // Very transparent background tint
    } else {
      setBgColor("var(--bg-base)");
    }
  }, [genre]);

  const canProceed = () => {
    if (step === 0) return genre !== "";
    if (step === 1) return worldDesc.trim().length > 10;
    if (step === 2) return charName.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await createStory({
        genre,
        world_description: worldDesc,
        character_name: charName,
        character_backstory: charBackstory,
        tone,
        nsfw_enabled: nsfwEnabled,
        is_god_mode: godMode,
        starting_gold: startingGold,
      });
      setStoryId(result.story_id);
      setPhase("customizing");
      router.push(`/customize?id=${result.story_id}`);
    } catch (err) {
      console.error("Failed to create story:", err);
      alert("Không thể tạo truyện. Hãy kiểm tra kết nối Backend.");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    {
      title: "Khởi tạo Bối cảnh",
      subtitle: "Chọn thể loại vũ trụ",
      icon: <Palette size={24} />,
      content: (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {GENRES.map((g, idx) => {
            const isSelected = genre === g.value;
            return (
              <motion.button
                key={g.value}
                onClick={() => setGenre(g.value)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  border: isSelected ? `2px solid ${g.color}` : "1px solid rgba(255,255,255,0.05)",
                  background: isSelected ? `linear-gradient(135deg, ${g.color}30, ${g.color}10)` : "rgba(20,20,30,0.6)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: isSelected ? `0 0 20px ${g.color}40` : "none",
                }}
              >
                {/* Background glowing mesh */}
                <div style={{ position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%", background: `radial-gradient(circle at 50% 50%, ${g.color}20, transparent 60%)`, opacity: isSelected ? 1 : 0.3, transition: "opacity 0.3s", zIndex: 0, pointerEvents: "none" }} />
                
                {isSelected && (
                  <div style={{ position: "absolute", top: "1rem", right: "1rem", color: g.color }}>
                    <Check size={20} />
                  </div>
                )}
                
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.8rem", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>{g.emoji}</div>
                  <div style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: "0.5rem", letterSpacing: "0.5px" }}>{g.label}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{g.desc}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Luật Thế Giới",
      subtitle: "Chi tiết quy luật và bối cảnh",
      icon: <Globe size={24} />,
      content: (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-secondary)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "1px" }}>
              Cơ sở Dữ liệu Thế giới
            </label>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem", lineHeight: 1.6 }}>
              Hệ thống AI sẽ dùng thông tin này làm lõi kiến tạo vũ trụ. Mô tả pháp luật, tôn giáo, phe phái hoặc xung đột chính.
            </p>
            <textarea
              className="input-field"
              placeholder="Ví dụ: Một thế giới nơi phép thuật bị cấm đoán bởi Giáo hội Bóng tối..."
              value={worldDesc}
              onChange={(e) => setWorldDesc(e.target.value)}
              style={{ minHeight: 200, fontSize: "1.05rem", lineHeight: 1.7 }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              Phong cách / Tone truyện
            </label>
            <input
              className="input-field"
              placeholder="dark, gritty, cinematic, emotional..."
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            />
          </div>
        </motion.div>
      ),
    },
    {
      title: "Hồ Sơ Chủ Thể",
      subtitle: "Xác định danh tính của bạn",
      icon: <User size={24} />,
      content: (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-primary)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "1px" }}>
              Định danh (Tên Nhân Vật)
            </label>
            <input
              className="input-field"
              placeholder="Ví dụ: Kael Ashford"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              style={{ fontSize: "1.2rem", padding: "1.2rem" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              Tiểu sử / Ký ức (Tùy chọn)
            </label>
            <textarea
              className="input-field"
              placeholder="Ký ức mơ hồ về một vụ thảm sát, một món nợ máu chưa trả..."
              value={charBackstory}
              onChange={(e) => setCharBackstory(e.target.value)}
              style={{ minHeight: 150 }}
            />
          </div>
        </motion.div>
      ),
    },
    {
      title: "Thông số Khởi tạo",
      subtitle: "Thiết lập hệ thống",
      icon: <Settings size={24} />,
      content: (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          
          {/* NSFW Module */}
          <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <AlertTriangle size={28} color={nsfwEnabled ? "var(--accent-danger)" : "var(--text-muted)"} style={{ flexShrink: 0 }} />
              <div>
                <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary)", fontSize: "1.1rem" }}>Bộ lọc An toàn (NSFW)</h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {nsfwEnabled ? "Đã tắt bộ lọc. AI có quyền mô tả chi tiết bạo lực, rùng rợn và cảnh nhạy cảm." : "Đã bật bộ lọc. Nội dung sẽ được giữ ở mức an toàn (PG-13)."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setNsfwEnabled(!nsfwEnabled)}
              style={{
                width: "100%", padding: "0.8rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700,
                background: nsfwEnabled ? "rgba(230, 57, 70, 0.2)" : "rgba(255,255,255,0.05)",
                color: nsfwEnabled ? "var(--accent-danger)" : "var(--text-muted)",
                borderBottom: nsfwEnabled ? "2px solid var(--accent-danger)" : "2px solid transparent",
                transition: "all 0.3s"
              }}
            >
              {nsfwEnabled ? "KHÔNG GIỚI HẠN (NSFW ON)" : "CHẾ ĐỘ AN TOÀN (NSFW OFF)"}
            </button>
          </div>

          {/* God Mode Module */}
          <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", border: godMode ? "1px solid var(--accent-tertiary)" : "1px solid var(--glass-border)", boxShadow: godMode ? "0 0 20px rgba(254, 228, 64, 0.2)" : "none" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <Shield size={28} color={godMode ? "var(--accent-tertiary)" : "var(--text-muted)"} style={{ flexShrink: 0 }} />
              <div>
                <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary)", fontSize: "1.1rem" }}>Quyền Năng Thần Thánh</h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Phá vỡ mọi giới hạn. Nhân vật của bạn có thể làm bất cứ điều gì mà không sợ thất bại.
                </p>
              </div>
            </div>
            <button
              onClick={() => setGodMode(!godMode)}
              style={{
                width: "100%", padding: "0.8rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 800,
                background: godMode ? "var(--accent-tertiary)" : "rgba(255,255,255,0.05)",
                color: godMode ? "#000" : "var(--text-muted)",
                transition: "all 0.3s"
              }}
            >
              {godMode ? "GOD MODE: KÍCH HOẠT" : "GOD MODE: TẮT"}
            </button>
          </div>

          {/* Economy Module */}
          <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Coins size={28} color="var(--accent-secondary)" />
              <div>
                <h3 style={{ margin: "0 0 0.2rem 0", color: "var(--text-primary)", fontSize: "1.1rem" }}>Tài sản Khởi đầu</h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>Số dư "Gold" khi bước vào thế giới</p>
              </div>
            </div>
            <input
              type="number"
              className="input-field"
              value={startingGold}
              onChange={(e) => setStartingGold(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
              style={{ fontSize: "1.5rem", fontWeight: 800, textAlign: "center", color: "var(--accent-secondary)" }}
            />
          </div>

        </motion.div>
      ),
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        background: bgColor,
        transition: "background 1s ease",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background Decor */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.5, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "10%", right: "10%", width: "40vw", height: "40vw", borderRadius: "50%", background: "var(--accent-primary)", filter: "blur(200px)", opacity: 0.1 }} />
        <div style={{ position: "absolute", bottom: "10%", left: "10%", width: "50vw", height: "50vw", borderRadius: "50%", background: "var(--accent-secondary)", filter: "blur(200px)", opacity: 0.05 }} />
      </div>

      <div style={{ display: "flex", width: "100%", maxWidth: 1400, margin: "0 auto", zIndex: 1, padding: "2rem", gap: "3rem" }}>
        
        {/* Left Side: Progress Tracker HUD */}
        <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", padding: "2rem 0" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, marginBottom: "3rem", textTransform: "uppercase", letterSpacing: "1px", lineHeight: 1.1 }}>
            Kiến Tạo<br/>
            <span style={{ color: "var(--accent-primary)" }}>Thực Thể</span>
          </h1>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem", position: "relative" }}>
            {/* Timeline Line */}
            <div style={{ position: "absolute", left: "23px", top: "10px", bottom: "10px", width: "2px", background: "rgba(255,255,255,0.05)", zIndex: -1 }} />
            
            {steps.map((s, i) => {
              const isActive = i === step;
              const isPast = i < step;
              return (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "1.5rem", cursor: "pointer", opacity: isPast || isActive ? 1 : 0.4 }} onClick={() => isPast && setStep(i)}>
                  <div style={{ 
                    width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: isActive ? "var(--accent-primary)" : isPast ? "rgba(255,255,255,0.1)" : "var(--bg-tertiary)",
                    boxShadow: isActive ? "0 0 20px var(--accent-primary-glow)" : "none",
                    color: isActive ? "#fff" : "var(--text-muted)",
                    transition: "all 0.3s",
                    border: isActive ? "2px solid #fff" : "2px solid transparent"
                  }}>
                    {s.icon}
                  </div>
                  <div style={{ paddingTop: "0.2rem" }}>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem", color: isActive ? "var(--text-primary)" : "var(--text-secondary)", marginBottom: "0.2rem" }}>{s.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{s.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", paddingTop: "2rem" }}>
          
          {/* Main Content Container */}
          <div className="glass-panel" style={{ flex: 1, padding: "3rem", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30, filter: "blur(10px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -30, filter: "blur(10px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{ flex: 1 }}
              >
                {steps[step].content}
              </motion.div>
            </AnimatePresence>

          </div>

          {/* Floating Action Bar */}
          <div style={{ 
            marginTop: "1.5rem", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            background: "rgba(10,10,15,0.8)",
            padding: "1rem 1.5rem",
            borderRadius: "1rem",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--glass-border)"
          }}>
            {step > 0 ? (
              <button
                className="action-button"
                onClick={() => setStep((s) => s - 1)}
                style={{ padding: "0.8rem 1.5rem" }}
              >
                QUAY LẠI
              </button>
            ) : (
              <div />
            )}

            {step < steps.length - 1 ? (
              <button
                className="btn-primary"
                disabled={!canProceed()}
                onClick={() => setStep((s) => s + 1)}
                style={{
                  opacity: canProceed() ? 1 : 0.4,
                  pointerEvents: canProceed() ? "auto" : "none",
                  padding: "1rem 2.5rem",
                }}
              >
                BƯỚC TIẾP THEO
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                className="btn-primary"
                disabled={submitting}
                onClick={handleSubmit}
                style={{
                  opacity: submitting ? 0.6 : 1,
                  pointerEvents: submitting ? "none" : "auto",
                  padding: "1rem 3rem",
                  background: "linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))",
                  boxShadow: "0 0 30px var(--accent-secondary-glow)"
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    ĐANG DỊCH MÃ...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    KÍCH HOẠT THẾ GIỚI
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
