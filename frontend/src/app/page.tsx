"use client";

import { motion, type Variants } from "framer-motion";
import { BookOpen, Sparkles, Swords, Map, ChevronRight, Activity, Cpu, Network, Layers } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const GENRES = [
  { value: "dark_fantasy", label: "Dark Fantasy", emoji: "🗡️", color: "#8b0000", desc: "Thế giới tàn khốc, ma thuật hắc ám và những anh hùng sa ngã.", image: "/images/dark_fantasy.png" },
  { value: "cyberpunk", label: "Cyberpunk", emoji: "🌃", color: "#00f5d4", desc: "Công nghệ cao, đời sống thấp. Neon, hacker và tập đoàn tư bản.", image: "/images/cyberpunk.png" },
  { value: "wuxia", label: "Kiếm Hiệp", emoji: "⚔️", color: "#d4af37", desc: "Giang hồ hiểm ác, bí kíp võ công và những trận chiến kinh thiên.", image: "/images/wuxia.png" },
  { value: "scifi", label: "Sci-Fi", emoji: "🚀", color: "#3b82f6", desc: "Khám phá vũ trụ, người ngoài hành tinh và tương lai nhân loại.", image: "/images/scifi.png" },
  { value: "horror", label: "Kinh Dị", emoji: "👻", color: "#2d3748", desc: "Sự sợ hãi tột cùng, những thực thể bí ẩn không thể diễn tả.", image: "/images/horror.png" },
  { value: "romance", label: "Tình Cảm", emoji: "💕", color: "#ec4899", desc: "Tình yêu mãnh liệt, drama và những mối quan hệ phức tạp.", image: "/images/romance.png" },
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

export default function HomePage() {
  return (
    <main
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
      <div className="noise-overlay" z-index="999" />

      {/* --- SOFT 3D FLUID BACKGROUND --- */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100vh", zIndex: 0, overflow: "hidden" }}>
        <Image
          src="/images/herosection.png"
          alt="Premium Abstract Fluid"
          fill
          priority
          className="animate-bg-pan"
          style={{ objectFit: "cover", opacity: 0.5, filter: "brightness(0.9) contrast(1.1)" }}
        />
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(180deg, rgba(5,5,10,0.3) 0%, #05050A 100%)" }} />
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
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(20px)",
              fontSize: "0.85rem",
              fontWeight: 500,
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "2px",
              marginBottom: "2rem",
              textTransform: "uppercase"
            }}
          >
            <Sparkles size={16} style={{ color: "var(--accent-secondary)" }} />
            Thế Hệ AI Kể Chuyện Mới
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
            <span style={{ 
              background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.4) 100%)", 
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
            <button className="pill-button" style={{ fontSize: "1.2rem", padding: "1.4rem 3.5rem" }}>
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
          {/* Feature 1: Large Box (AI System) */}
          <motion.div 
            className="bento-card soft-glass"
            custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ gridColumn: "span 8", gridRow: "span 2", padding: "4rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
          >
            <div style={{ maxWidth: "60%", zIndex: 2 }}>
              <div style={{ display: "inline-flex", padding: "12px", borderRadius: "16px", background: "rgba(157,78,221,0.1)", color: "#e0aaff", marginBottom: "2rem" }}>
                <Cpu size={32} />
              </div>
              <h3 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem", color: "#fff", lineHeight: 1.2 }}>Mạng Lưới 5 AI Đa Tác Vụ</h3>
              <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
                Đạo diễn, Nhà văn, Biên tập viên, Quản trò và Chuyên viên Dữ liệu. Tất cả hoạt động song song để đảm bảo tính logic, cảm xúc và độ hoành tráng của từng chương truyện.
              </p>
            </div>
            {/* User image placeholder */}
            <div className="animate-float" style={{ position: "absolute", right: "-5%", bottom: "-10%", width: "65%", height: "120%", opacity: 0.9 }}>
               <Image
                 src="/images/brain.png"
                 alt="AI Core Brain"
                 fill
                 style={{ 
                   objectFit: "contain", 
                   mixBlendMode: "screen", /* Removes the black background */
                   WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 40%, transparent 80%)", /* Oval mask to feather the edges and hide the hard pedestal edges */
                   maskImage: "radial-gradient(ellipse at 50% 40%, black 40%, transparent 80%)",
                   filter: "brightness(0.6) contrast(2.5) drop-shadow(0 0 20px rgba(157,78,221,0.5))" /* Crush the dark-grey background to pure black so 'screen' works perfectly */
                 }}
               />
            </div>
          </motion.div>

          {/* Feature 2: Medium Box (RPG System) */}
          <motion.div 
            className="bento-card soft-glass"
            custom={2} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ gridColumn: "span 4", gridRow: "span 1", padding: "3rem", display: "flex", flexDirection: "column", justifyContent: "center" }}
          >
            <div style={{ display: "inline-flex", padding: "12px", borderRadius: "16px", background: "rgba(220,38,38,0.1)", color: "#fca5a5", marginBottom: "1.5rem", width: "fit-content" }}>
              <Swords size={28} />
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "#fff" }}>Cơ Chế RPG Sâu Sắc</h3>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              Chỉ số tâm lý, thanh máu, quản lý tài sản và danh tiếng phe phái. Mọi quyết định đều có cái giá phải trả.
            </p>
          </motion.div>

          {/* Feature 3: Medium Box (World Generation) */}
          <motion.div 
            className="bento-card soft-glass"
            custom={3} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ gridColumn: "span 4", gridRow: "span 1", padding: "3rem", display: "flex", flexDirection: "column", justifyContent: "center" }}
          >
            <div style={{ display: "inline-flex", padding: "12px", borderRadius: "16px", background: "rgba(59,130,246,0.1)", color: "#93c5fd", marginBottom: "1.5rem", width: "fit-content" }}>
              <Layers size={28} />
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "#fff" }}>Thế Giới Vô Tận</h3>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              Bản đồ tự động mở rộng, cốt truyện rẽ nhánh hoàn toàn dựa trên hành vi của bạn. Không có kịch bản cố định.
            </p>
          </motion.div>

          {/* Feature 4: Wide Box (Network) */}
          <motion.div 
            className="bento-card soft-glass"
            custom={4} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ gridColumn: "span 12", gridRow: "span 1", padding: "3rem 4rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <div style={{ maxWidth: "50%" }}>
              <div style={{ display: "inline-flex", padding: "12px", borderRadius: "16px", background: "rgba(0,245,212,0.1)", color: "#00f5d4", marginBottom: "1.5rem" }}>
                <Network size={28} />
              </div>
              <h3 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem", color: "#fff" }}>Mạng Lưới NPC Sống Động</h3>
              <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                Hàng ngàn nhân vật có bộ nhớ riêng, tự động phản ứng với hành động của bạn và tương tác lẫn nhau.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- CAPSULE GENRE SHOWCASE --- */}
      <section style={{ padding: "6rem 0 10rem 0", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "5rem" }}>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-1px", color: "#fff", marginBottom: "1rem" }}>Đa Vũ Trụ Thể Loại</h2>
        </div>

        <div className="marquee-container" style={{ padding: "2rem 0", overflow: "visible" }}>
          <div className="marquee-content" style={{ gap: "3rem" }}>
            {[...GENRES, ...GENRES].map((g, idx) => (
              <div
                key={`${g.value}-${idx}`}
                className="bento-card"
                style={{
                  minWidth: "340px",
                  height: "500px",
                  borderRadius: "40px", /* Capsule shape */
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: "3rem 2rem",
                  border: "1px solid rgba(255,255,255,0.05)",
                  boxShadow: "0 20px 40px -20px rgba(0,0,0,0.5)"
                }}
              >
                {g.image && (
                  <Image src={g.image} alt={g.label} fill style={{ objectFit: "cover", zIndex: 0, transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)", opacity: 0.5, filter: "brightness(0.8)" }} className="hover:scale-105" />
                )}
                <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "80%", background: "linear-gradient(to top, rgba(5,5,10,1) 0%, rgba(5,5,10,0.5) 60%, transparent 100%)", zIndex: 0 }} />
                
                <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{g.emoji}</div>
                  <h3 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0 0 1rem 0", color: "#fff" }}>{g.label}</h3>
                  <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PREMIUM FLOATING DOCK FOOTER --- */}
      <section style={{ padding: "0 2rem 3rem 2rem", position: "relative", zIndex: 1, display: "flex", justifyContent: "center" }}>
        <div className="soft-glass" style={{ padding: "1.5rem 3rem", borderRadius: "100px", display: "flex", alignItems: "center", gap: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "rgba(255,255,255,0.8)" }}>
            <Activity size={20} className="animate-pulse" style={{ color: "#00f5d4" }} />
            <span style={{ fontWeight: 500, fontSize: "0.9rem", letterSpacing: "1px", textTransform: "uppercase" }}>Core Systems: Active</span>
          </div>
          <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.1)" }} />
          <div className="mono-font" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>
            v2.0.0.alpha // Deep Narrative Engine
          </div>
        </div>
      </section>
    </main>
  );
}
