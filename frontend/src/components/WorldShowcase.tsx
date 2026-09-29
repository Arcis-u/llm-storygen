"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowLeft, ArrowRight, Compass, MoveUpRight } from "lucide-react";
import { worlds } from "@/lib/worlds";

export default function WorldShowcase() {
  const [index, setIndex] = useState(1);
  const strip = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const world = worlds[index];
  const select = (next: number) => {
    const nextIndex = (next + worlds.length) % worlds.length;
    setIndex(nextIndex);
    const container = strip.current;
    const button = container?.children[nextIndex] as HTMLElement | undefined;
    if (container && button) container.scrollTo({ left: button.offsetLeft - (container.clientWidth - button.offsetWidth) / 2, behavior: reducedMotion ? "instant" : "smooth" });
  };

  return <section id="worlds" className="world-observatory">
    <div className="evo-container">
      <div className="observatory-heading">
        <div><span className="evo-eyebrow"><Compass size={14} /> THE WORLD ATLAS / 01</span><h2>Một cánh cửa.<br /><em>Một cuộc đời khác.</em></h2></div>
        <p>Bạn chọn nơi bắt đầu.<br />Thế giới sẽ đáp lại từng bước chân.</p>
        <div className="observatory-controls"><button onClick={() => select(index - 1)} aria-label="Thế giới trước"><ArrowLeft size={19} /></button><button onClick={() => select(index + 1)} aria-label="Thế giới tiếp theo"><ArrowRight size={19} /></button></div>
      </div>
      <div className="atlas-stage">
        <AnimatePresence initial={false}>
          <motion.div key={world.id} className="atlas-art" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .45 }}>
            <Image src={world.image} alt={`Không gian ${world.name}`} fill sizes="(max-width:680px) 100vw, 90vw" />
          </motion.div>
        </AnimatePresence>
        <div className="atlas-shade" />
        <div className="atlas-edge atlas-edge-top" aria-hidden="true"><span>NEXUS TALE / WORLD EXPLORER</span><span>0{index + 1} — 06</span></div>
        <div className="atlas-coordinate" aria-hidden="true"><i /><span>EXPLORE<br />BEYOND THE KNOWN</span></div>
        <div className="atlas-copy" aria-live="polite">
          <span className="atlas-genre">{world.name}</span>
          <h3>{world.subtitle}</h3>
          <p>{world.description}</p>
          <div className="atlas-copy-bottom"><Link href={`/create?genre=${world.id}`} className="evo-button evo-button-primary">Bước vào {world.name}<ArrowUpRight size={18} /></Link><span>{world.tag}</span></div>
        </div>
        <div className="atlas-number" aria-hidden="true">0{index + 1}<MoveUpRight size={26} /></div>
      </div>
      <div ref={strip} className="atlas-filmstrip" aria-label="Chọn thế giới">
        {worlds.map((item, itemIndex) => <button key={item.id} aria-pressed={itemIndex === index} onClick={() => select(itemIndex)}>
          <span className="atlas-thumbnail"><Image src={item.image} alt="" fill sizes="180px" /><span className="thumbnail-shade" /><i>0{itemIndex + 1}</i>{itemIndex === index && <span className="atlas-selected-dot" />}</span>
          <span className="atlas-thumbnail-label">{item.name}<ArrowUpRight size={13} /></span>
        </button>)}
      </div>
      <div className="atlas-footer"><span>SÁU THẾ GIỚI. KHÔNG GIỚI HẠN TRÍ TƯỞNG TƯỢNG.</span><span>CHỌN MỘT KHUNG HÌNH ĐỂ KHÁM PHÁ <ArrowRight size={12} /></span></div>
    </div>
  </section>;
}
