"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import { BookOpen, Sparkles, Swords, Map, ChevronRight, Activity, Cpu, Network, Layers, Terminal } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// ============================================================
// IMAGE PROMPTS (For the User)
// ============================================================
/*
  🎨 HƯỚNG DẪN TẠO ẢNH (Dùng cho ChatGPT DALL-E 3 hoặc Midjourney)
  
  1. Ảnh nền Hero (herosection.png):
     Prompt: "A hyper-realistic, dark and moody cyberpunk neural network core, glowing ethereal purple and cyan nodes connected by glowing threads, depth of field, 8k resolution, Unreal Engine 5 render, cinematic lighting, glassmorphism elements, pure black background."
  
  2. Ảnh não bộ AI (brain.png):
     Prompt: "A futuristic cyberpunk artificial intelligence brain, made of translucent glass and glowing neon fiber optics, floating in a void, glowing purple and teal aura, 8k, highly detailed, black background, octane render."
     
  3. Ảnh thể loại Cyberpunk (cyberpunk.png):
     Prompt: "A breathtaking cinematic shot of a neon-drenched cyberpunk city street in the rain, towering holographic advertisements, dark alleys, glowing cyan and magenta reflections on wet asphalt, photorealistic, 8k."
*/

const GENRES = [
  { value: "dark_fantasy", label: "Dark Fantasy", emoji: "🗡️", color: "#8b0000", desc: "Thế giới tàn khốc, ma thuật hắc ám và những anh hùng sa ngã.", image: "/images/dark_fantasy.png" },
  { value: "cyberpunk", label: "Cyberpunk", emoji: "🌃", color: "#00f5d4", desc: "Công nghệ cao, đời sống thấp. Neon, hacker và tập đoàn tư bản.", image: "/images/cyberpunk.png" },
  { value: "wuxia", label: "Kiếm Hiệp", emoji: "⚔️", color: "#d4af37", desc: "Giang hồ hiểm ác, bí kíp võ công và những trận chiến kinh thiên.", image: "/images/wuxia.png" },
  { value: "scifi", label: "Sci-Fi", emoji: "🚀", color: "#3b82f6", desc: "Khám phá vũ trụ, người ngoài hành tinh và tương lai nhân loại.", image: "/images/scifi.png" },
  { value: "horror", label: "Kinh Dị", emoji: "👻", color: "#2d3748", desc: "Sự sợ hãi tột cùng, những thực thể bí ẩn không thể diễn tả.", image: "/images/horror.png" },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(10px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.1, duration: 1, ease: [0.16, 1, 0.3, 1] },
  }),
};

// ============================================================
// SIMULATED TERMINAL COMPONENT
// ============================================================
const TerminalSim = () => {
  const [text, setText] = useState("");
  const fullText = "[SYS] Initializing NLP Core...\n[SYS] Loading personality matrices... [OK]\n[SYS] Establishing neural link... [CONNECTED]\n> Awaiting user input_";
  
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mono-font" style={{ padding: "1rem", background: "rgba(0,0,0,0.6)", borderRadius: "8px", border: "1px solid rgba(0,245,212,0.2)", color: "#00f5d4", fontSize: "0.8rem", whiteSpace: "pre-wrap", minHeight: "100px", boxShadow: "inset 0 0 10px rgba(0,0,0,0.8)" }}>
      {text}<span className="terminal-cursor"></span>
    </div>
  );
};

// ============================================================
// MAIN PAGE
// ============================================================
export default function HomePage() {
  
  // Spotlight effect hook
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const cards = document.getElementsByClassName("spotlight-card");
    for (const card of cards as any) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    }
  };

  return (
    <main
      onMouseMove={handleMouseMove}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflowX: "hidden",
        backgroundColor: "#05050A",
      }}
    >
      {/* --- PREMIUM NOISE OVERLAY --- */}
      <div className="noise-overlay" style={{ zIndex: 999 }} />

      {/* --- DYNAMIC GRID BACKGROUND --- */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100vh", zIndex: 0, overflow: "hidden" }}>
        {/* The original background image they wanted */}
        <Image
          src="/images/herosection.png"
          alt="Hero Background"
          fill
          priority
          style={{ objectFit: "cover", opacity: 0.35, filter: "brightness(0.7) contrast(1.2)" }}
        />
        <div className="hex-grid-bg" style={{ opacity: 0.15 }} />
        <div className="scanlines" style={{ opacity: 0.2 }} />
        {/* Core Glowing Orb */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", top: "20%", left: "50%", transform: "translate(-50%, -50%)", width: "800px", height: "800px", background: "radial-gradient(circle, rgba(157,78,221,0.2) 0%, transparent 60%)", borderRadius: "50%", pointerEvents: "none" }} 
        />
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(180deg, rgba(5,5,10,0.1) 0%, #05050A 100%)" }} />
      </div>

      {/* --- HERO SECTION --- */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 2rem", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, filter: "blur(20px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: "center", maxWidth: 900, marginTop: "-5vh" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1.5rem",
              borderRadius: "100px",
              background: "rgba(0, 245, 212, 0.05)",
              border: "1px solid rgba(0, 245, 212, 0.2)",
              backdropFilter: "blur(20px)",
              fontSize: "0.85rem",
              fontWeight: 500,
              color: "#00f5d4",
              letterSpacing: "2px",
              marginBottom: "2rem",
              textTransform: "uppercase",
              boxShadow: "0 0 20px rgba(0, 245, 212, 0.1)"
            }}
          >
            <Sparkles size={16} />
            Hệ Thống Trí Tuệ Kể Chuyện
          </motion.div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(3.5rem, 8vw, 7rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "2rem",
              color: "#fff",
              letterSpacing: "-2px",
            }}
          >
            Trải Nghiệm
            <br />
            <span className="glitch-text" data-text="Sống Động Từng Phút" style={{ 
              background: "linear-gradient(135deg, #fff 0%, var(--accent-primary) 100%)", 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent" 
            }}>
              Sống Động Từng Phút
            </span>
          </h1>

          <p
            style={{
              fontSize: "1.25rem",
              lineHeight: 1.8,
              color: "rgba(255,255,255,0.5)",
              maxWidth: 680,
              margin: "0 auto 3.5rem",
              fontWeight: 400,
              letterSpacing: "0.5px"
            }}
          >
            Hệ thống 5 AI chuyên biệt. Cốt truyện rẽ nhánh vô tận. Đồ họa đẳng cấp. Một vũ trụ sinh ra chỉ để dành riêng cho trí tưởng tượng của bạn.
          </p>

          <Link href="/create">
            <button className="pill-button" style={{ fontSize: "1.2rem", padding: "1.4rem 3.5rem", boxShadow: "0 0 30px rgba(157,78,221,0.4)" }}>
              Khởi Động Trải Nghiệm
              <ChevronRight size={22} />
            </button>
          </Link>
        </motion.div>
      </section>

      {/* --- BENTO BOX FEATURES SECTION --- */}
      <section style={{ padding: "8rem 2rem", position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "5rem" }}>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-1px", color: "#fff", marginBottom: "1rem" }}>Hệ Sinh Thái Độc Bản</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem" }}>Được thiết kế tỉ mỉ đến từng điểm ảnh, điều khiển bởi mạng lưới AI lõi.</p>
        </div>

        <div className="bento-grid">
          {/* Feature 1: Large Box (AI System + Terminal) */}
          <motion.div 
            className="bento-card spotlight-card"
            custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ gridColumn: "span 8", gridRow: "span 2", padding: "4rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
          >
            <div style={{ maxWidth: "60%", zIndex: 2 }}>
              <div style={{ display: "inline-flex", padding: "12px", borderRadius: "16px", background: "rgba(157,78,221,0.1)", color: "#e0aaff", marginBottom: "2rem" }}>
                <Cpu size={32} />
              </div>
              <h3 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem", color: "#fff", lineHeight: 1.2 }}>Mạng Lưới 5 AI Đa Tác Vụ</h3>
              <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: "2rem" }}>
                Đạo diễn, Nhà văn, Biên tập viên, Quản trò và Chuyên viên Dữ liệu. Tất cả hoạt động song song để đảm bảo tính logic, cảm xúc và độ hoành tráng của từng chương truyện.
              </p>
              <TerminalSim />
            </div>
            {/* User image placeholder */}
            <div className="animate-float" style={{ position: "absolute", right: "-5%", bottom: "-10%", width: "65%", height: "120%", opacity: 0.9, zIndex: 1 }}>
               <Image
                 src="/images/brain.png"
                 alt="AI Core Brain"
                 fill
                 style={{ 
                   objectFit: "contain", 
                   mixBlendMode: "screen",
                   WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 40%, transparent 80%)",
                   filter: "brightness(0.6) contrast(2.5) drop-shadow(0 0 20px rgba(157,78,221,0.5))"
                 }}
               />
            </div>
          </motion.div>

          {/* Feature 2: Medium Box (RPG System + HP Bar) */}
          <motion.div 
            className="bento-card spotlight-card"
            custom={2} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ gridColumn: "span 4", gridRow: "span 1", padding: "3rem", display: "flex", flexDirection: "column", justifyContent: "center" }}
          >
            <div style={{ display: "inline-flex", padding: "12px", borderRadius: "16px", background: "rgba(220,38,38,0.1)", color: "#fca5a5", marginBottom: "1.5rem", width: "fit-content" }}>
              <Swords size={28} />
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "#fff" }}>Cơ Chế RPG Sâu Sắc</h3>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              Chỉ số tâm lý, thanh máu, quản lý tài sản và danh tiếng phe phái. Mọi quyết định đều có cái giá phải trả.
            </p>
            {/* Simulated UI: HP Bar */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--accent-success)", fontWeight: 600 }}>
                <span>HP [HEALTH]</span>
                <span>85%</span>
              </div>
              <div className="sim-hp-container">
                <div className="sim-hp-fill" style={{ width: "85%" }}></div>
                <div className="sim-hp-pulse"></div>
              </div>
            </div>
          </motion.div>

          {/* Feature 3: Medium Box (World Generation + Radar) */}
          <motion.div 
            className="bento-card spotlight-card"
            custom={3} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ gridColumn: "span 4", gridRow: "span 1", padding: "3rem", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}
          >
            <div style={{ display: "inline-flex", padding: "12px", borderRadius: "16px", background: "rgba(59,130,246,0.1)", color: "#93c5fd", marginBottom: "1.5rem", width: "fit-content", zIndex: 2 }}>
              <Layers size={28} />
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "#fff", zIndex: 2 }}>Thế Giới Vô Tận</h3>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, zIndex: 2 }}>
              Bản đồ tự động mở rộng, cốt truyện rẽ nhánh hoàn toàn dựa trên hành vi của bạn. Không có kịch bản cố định.
            </p>
            
            {/* Simulated UI: Radar Background */}
            <div style={{ position: "absolute", top: "-20%", right: "-20%", width: "250px", height: "250px", opacity: 0.3, zIndex: 1 }}>
              <div className="radar-circle">
                <div className="radar-sweep"></div>
                <div className="radar-ping" style={{ top: "30%", left: "60%" }}></div>
                <div className="radar-ping" style={{ top: "70%", left: "20%", animationDelay: "1s" }}></div>
              </div>
            </div>
          </motion.div>

          {/* Feature 4: Wide Box (Network) */}
          <motion.div 
            className="bento-card spotlight-card"
            custom={4} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ gridColumn: "span 12", gridRow: "span 1", padding: "3rem 4rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <div style={{ maxWidth: "50%" }}>
              <div style={{ display: "inline-flex", padding: "12px", borderRadius: "16px", background: "rgba(0,245,212,0.1)", color: "#00f5d4", marginBottom: "1.5rem" }}>
                <Network size={28} />
              </div>
              <h3 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem", color: "#fff" }}>Mạng Lưới NPC Sống Động</h3>
              <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                Hàng ngàn nhân vật có bộ nhớ riêng, tự động phản ứng với hành động của bạn và tương tác lẫn nhau. Một xã hội AI đích thực.
              </p>
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
               {/* Decorative Network Nodes */}
               <div style={{ position: "relative", width: "200px", height: "150px" }}>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "100%", height: "2px", background: "var(--glass-border-glow)" }} />
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", height: "100%", width: "2px", background: "var(--glass-border-glow)" }} />
                  {[
                    {top: 0, left: '50%'}, {bottom: 0, left: '50%'}, {top: '50%', left: 0}, {top: '50%', right: 0}, {top: '50%', left: '50%'}
                  ].map((pos, i) => (
                    <div key={i} style={{ ...pos, position: "absolute", transform: "translate(-50%, -50%)", width: 12, height: 12, background: "var(--accent-secondary)", borderRadius: "50%", boxShadow: "0 0 10px var(--accent-secondary)" }} />
                  ))}
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- ACCORDION GENRE SHOWCASE --- */}
      <section style={{ padding: "6rem 2rem 10rem 2rem", position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "5rem" }}>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-1px", color: "#fff", marginBottom: "1rem" }}>Đa Vũ Trụ Thể Loại</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem" }}>Lựa chọn bối cảnh của riêng bạn. Mỗi thể loại là một hệ sinh thái riêng biệt.</p>
        </div>

        <div className="accordion-container">
          {GENRES.map((g, idx) => (
            <div 
              key={`${g.value}-${idx}`} 
              className="accordion-item"
              style={{ "--theme-color": g.color } as React.CSSProperties}
            >
              {g.image && (
                <Image src={g.image} alt={g.label} fill className="accordion-bg" />
              )}
              <div className="accordion-title" style={{ color: g.color }}>{g.label}</div>
              <div className="accordion-content">
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{g.emoji}</div>
                <h3 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: g.color }}>{g.label}</h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.8)", margin: 0, lineHeight: 1.6 }}>{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- PREMIUM FLOATING DOCK FOOTER --- */}
      <section style={{ padding: "0 2rem 3rem 2rem", position: "relative", zIndex: 1, display: "flex", justifyContent: "center" }}>
        <div className="soft-glass" style={{ padding: "1.5rem 3rem", borderRadius: "100px", display: "flex", alignItems: "center", gap: "2rem", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
          <Link href="/status" style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "rgba(255,255,255,0.8)", textDecoration: "none", cursor: "pointer", transition: "color 0.3s" }} onMouseEnter={(e) => e.currentTarget.style.color = '#00f5d4'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}>
            <Activity size={20} className="animate-pulse" style={{ color: "#00f5d4" }} />
            <span style={{ fontWeight: 500, fontSize: "0.9rem", letterSpacing: "1px", textTransform: "uppercase" }}>Core Systems: Active</span>
          </Link>
          <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.2)" }} />
          <div className="mono-font" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>
            v2.1.0.core // Deep Narrative Engine
          </div>
        </div>
      </section>
    </main>
  );
}
