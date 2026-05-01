"use client";

import { ChapterContent, PlotTrigger } from "@/store/useStoryStore";
import { BookOpen, Flag, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  chapters: ChapterContent[];
  plotTriggers: PlotTrigger[];
}

export default function PlotTimeline({ chapters, plotTriggers }: Props) {
  if (chapters.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
        Dòng thời gian trống. Hãy bắt đầu câu chuyện của bạn.
      </div>
    );
  }

  // Find the highest chapter number
  const currentChapterNum = Math.max(...chapters.map(c => c.chapter_number), 0);

  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0rem", position: "relative" }}>
      {/* Central Line */}
      <div style={{ 
        position: "absolute", 
        left: "35px", 
        top: "20px", 
        bottom: "20px", 
        width: "2px", 
        background: "linear-gradient(to bottom, var(--accent-primary), rgba(255,255,255,0.1))" 
      }} />

      {chapters.map((chap, index) => {
        // Find triggers that happened in this chapter
        const triggers = plotTriggers.filter(pt => pt.triggered_at_chapter === chap.chapter_number);
        const isLatest = chap.chapter_number === currentChapterNum;

        return (
          <motion.div 
            key={`ch-${chap.chapter_number}-${index}`} 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            style={{ display: "flex", gap: "1.5rem", marginBottom: "2rem", position: "relative" }}
          >
            
            {/* Timeline Node */}
            <div style={{ 
              width: "40px", 
              height: "40px", 
              borderRadius: "50%", 
              background: isLatest ? "var(--accent-primary)" : "rgba(30,41,59,1)",
              border: `2px solid ${isLatest ? "var(--text-primary)" : "var(--accent-primary)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
              boxShadow: isLatest ? "0 0 15px var(--accent-primary)" : "none"
            }}>
              <BookOpen size={18} color={isLatest ? "#fff" : "var(--accent-primary)"} />
            </div>

            {/* Content */}
            <div className="glass-card" style={{ flex: 1, padding: "1rem", borderLeft: isLatest ? "3px solid var(--accent-primary)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: isLatest ? "var(--accent-primary)" : "var(--text-primary)" }}>
                  Chương {chap.chapter_number}
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, fontStyle: "italic" }}>
                "{chap.summary}"
              </p>

              {/* Triggers */}
              {triggers.length > 0 && (
                <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {triggers.map(pt => (
                    <div key={pt.title} style={{ 
                      display: "flex", 
                      alignItems: "flex-start", 
                      gap: "0.5rem", 
                      background: "rgba(239,68,68,0.1)", 
                      padding: "0.6rem", 
                      borderRadius: "6px",
                      border: "1px solid rgba(239,68,68,0.3)"
                    }}>
                      <AlertCircle size={16} color="#ef4444" style={{ marginTop: "2px" }} />
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#ef4444" }}>Biến cố kích hoạt: {pt.title}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>{pt.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Future Triggers (Not yet triggered) */}
      {plotTriggers.filter(pt => !pt.triggered && pt.earliest_chapter <= currentChapterNum + 2).map((pt, i) => (
        <div key={`future-${i}`} style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", opacity: 0.5 }}>
          <div style={{ 
            width: "40px", 
            height: "40px", 
            borderRadius: "50%", 
            background: "transparent",
            border: "2px dashed var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}>
            <Flag size={16} color="var(--text-muted)" />
          </div>
          <div style={{ flex: 1, padding: "0.8rem", border: "1px dashed var(--border-subtle)", borderRadius: "12px", background: "rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Flag size={14} /> Tiềm năng: {pt.title}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
