"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowRight, BookOpen, Sparkles, Swords, Network, Compass, RotateCcw, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import WorldShowcase from "@/components/WorldShowcase";
import NexusHeader from "@/components/NexusHeader";

const previewChoices = [
  { title: "Theo dấu tín hiệu", text: "Bạn chạm vào con chip. Một bản đồ bừng sáng dưới da, dẫn đến nơi thành phố đã xóa khỏi mọi ký ức.", tag: "Một bí mật được hé lộ" },
  { title: "Bước vào bóng tối", text: "Bạn tắt tai nghe và rẽ vào hẻm. Trong tấm kính đen, một bóng người vẫn bước tiếp dù bạn đã dừng lại.", tag: "Một mối nguy thức giấc" },
  { title: "Gọi cho người lạ", text: "Đầu dây im lặng. Rồi một giọng nói cất lên: “Cuối cùng cũng tìm thấy bạn.” Đó là giọng của chính bạn.", tag: "Một mối liên kết mới" },
];
const reveal = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .15 }, transition: { duration: .5 } };

export default function HomePage() {
  const token = useAuthStore(s => s.token);
  const [branch, setBranch] = useState<number | null>(null);
  return <main id="main-content" className="nexus-evolved nexus-landing">
    <NexusHeader />
    <section className="nexus-hero">
      <div className="hero-atmosphere" aria-hidden="true"><Image src="/images/herosection.png" alt="" fill sizes="100vw" priority /></div>
      <div className="hero-grid" aria-hidden="true" />
      <div className="evo-container hero-columns">
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65 }}>
          <span className="evo-eyebrow"><span className="signal-dot" /> AI-POWERED INTERACTIVE RPG</span>
          <h1>Một lựa chọn.<br /><span>Ngàn thế giới.</span><em>Dấu ấn của bạn.</em></h1>
          <p>Nhập vai vào thế giới do AI kiến tạo. Gặp những người bạn không thể quên, đối diện điều chưa biết — và tự viết lấy số phận mình.</p>
          <div className="hero-actions"><Link href="/create" className="evo-button evo-button-primary">Bắt đầu hành trình <ArrowUpRight size={19} /></Link><a className="evo-text-link" href="#worlds">Khám phá thế giới <ArrowRight size={16} /></a></div>
          <div className="hero-footnote"><span>01 / NHẬP VAI</span><span>02 / LỰA CHỌN</span><span>03 / ĐỊNH HÌNH</span></div>
        </motion.div>
        <div className="hero-scene-shell"><div className="hero-scene-rail" aria-hidden="true"><span>STORY ENGINE</span><i/><span>01 — ∞</span></div><motion.div className="story-preview" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, delay: .12 }}>
          <div className="preview-art"><Image src="/images/cyberpunk.png" alt="Thành phố cyberpunk trong mưa neon" fill sizes="(max-width:900px) 100vw, 45vw" priority /><div className="preview-art-shade" /><span className="preview-label"><span className="signal-dot" /> TRÍCH CẢNH MINH HỌA</span><div className="preview-location"><span>CYBERPUNK / 01</span><h2>Thành phố<br />không quên.</h2></div><span className="preview-coordinate" aria-hidden="true">NXS_2077<br />MEMORY ARCHIVE</span></div>
          <div className="preview-narrative">
            <div className="preview-caption"><span>{branch === null ? "MỌI CÂU CHUYỆN BẮT ĐẦU TỪ BẠN" : previewChoices[branch].tag}</span>{branch !== null && <button onClick={() => setBranch(null)} aria-label="Đọc lại cảnh minh họa"><RotateCcw size={14} /></button>}</div>
            <div className="preview-prose" aria-live="polite"><AnimatePresence mode="wait"><motion.p key={branch ?? "start"} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .18 }}>{branch === null ? 'Mưa neon trượt trên con chip trong tay bạn. Một giọng nói vang lên: “Đừng quay đầu lại.” Bạn sẽ làm gì?' : previewChoices[branch].text}</motion.p></AnimatePresence></div>
            <div className="preview-choices">{previewChoices.map((choice, i) => <button key={choice.title} aria-pressed={branch === i} onClick={() => setBranch(i)}><span>0{i + 1}</span>{choice.title}<ChevronRight size={14} /></button>)}</div>
            <small>Cảnh minh họa tương tác · Hành trình thật được tạo theo lựa chọn của bạn.</small>
          </div>
        </motion.div><div className="hero-scene-caption"><span><i/>CÂU CHUYỆN ĐỔI THEO LỰA CHỌN</span><span>THỬ MỘT NGÃ RẼ ↗</span></div></div>
      </div>
      <div className="evo-container hero-bottom"><span>NEXUS TALE / THE STORY IS YOURS</span><a href="#worlds">Mở cánh cửa tiếp theo <span>↓</span></a></div>
    </section>
    <WorldShowcase />
    <section id="experience" className="evo-container experience-section">
      <motion.div {...reveal} className="evo-section-heading"><div><span className="evo-eyebrow">02 / KHÔNG CHỈ LÀ ĐỌC TRUYỆN</span><h2>Một thế giới phản hồi.<br /><span>Một hành trình có chiều sâu.</span></h2></div></motion.div>
      <div className="experience-grid">
        <motion.article {...reveal} className="experience-card experience-core"><div className="experience-image"><Image src="/images/brain.png" alt="Lõi trí tuệ Nexus" fill sizes="(max-width:760px) 100vw, 45vw" /></div><span className="experience-icon"><Network size={23} /></span><div className="experience-card-copy"><span className="evo-eyebrow">TRÍ TUỆ ĐẰNG SAU CÂU CHUYỆN</span><h3>Câu chuyện tiếp diễn.<br />Ký ức ở lại.</h3><p>Các AI phối hợp viết, phản biện và cập nhật thế giới. Những gì bạn đã làm trở thành chất liệu cho chương tiếp theo.</p><div className="agent-trail"><span>Đạo diễn</span><ArrowRight size={12}/><span>Nhà văn</span><ArrowRight size={12}/><span>Phản biện</span></div></div></motion.article>
        <motion.article {...reveal} className="experience-card"><span className="experience-icon cyan"><Swords size={23}/></span><h3>Sức mạnh luôn<br />có cái giá.</h3><p>Sức khỏe, năng lượng, vật phẩm và các mối quan hệ cùng định hình cách bạn vượt qua thử thách.</p><div className="sample-vitals" aria-label="Minh họa chỉ số nhân vật"><div><span>SINH LỰC</span><span>85 / 100</span></div><i><b /></i><div><span>NĂNG LƯỢNG</span><span>62 / 100</span></div><i><b /></i><small>Minh họa trạng thái nhân vật</small></div></motion.article>
        <motion.article {...reveal} className="experience-card experience-journal"><span className="experience-icon"><BookOpen size={23}/></span><div><h3>Nhìn lại những<br />ngã rẽ đã qua.</h3><p>Nhật ký giữ lựa chọn, xúc xắc và dấu mốc. Tìm lại ký ức hoặc xuất hành trình của bạn.</p></div><div className="sample-journal" aria-hidden="true"><span>01</span><i/><span>02</span><i/><span className="current">03</span><i/><Compass size={20}/></div></motion.article>
      </div>
    </section>
    <section className="evo-container final-invitation"><Sparkles size={28}/><span className="evo-eyebrow">CHƯƠNG ĐẦU TIÊN ĐANG CHỜ</span><h2>Bạn sẽ trở thành ai?</h2><Link className="evo-button evo-button-primary" href={token ? "/dashboard" : "/create"}>{token ? "Trở về những hành trình" : "Kiến tạo nhân vật của bạn"}<ArrowUpRight size={18}/></Link></section>
    <footer className="evo-container nexus-footer"><span>NEXUS <b>TALE</b></span><p>Trí tưởng tượng của bạn. Một thế giới để sống.</p><Link href="/dashboard">Thư viện <ArrowUpRight size={14}/></Link></footer>
  </main>;
}
