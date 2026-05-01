"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  Brain,
  Heart,
  Coins,
  MapPin,
  Scroll,
  AlertTriangle,
  Clock,
  Target,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Layers,
  BookOpen,
  Send,
  Loader2,
  Swords,
  Users,
  Backpack,
} from "lucide-react";
import { useStoryStore, ChapterContent } from "@/store/useStoryStore";
import { submitAction, getStoryState } from "@/lib/api";

import CityMap from "@/components/CityMap";
import RelationshipGraph from "@/components/RelationshipGraph";
import MarketPanel from "@/components/MarketPanel";
import FactionPanel from "@/components/FactionPanel";
import PlotTimeline from "@/components/PlotTimeline";
import AILoadingTerminal from "@/components/AILoadingTerminal";
import ReactMarkdown from "react-markdown";
import Image from "next/image";

// ============================================================
// Typing Effect Component
// ============================================================
function TypewriterText({ text, speed = 15 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <div className="story-text">
      {displayed.split("\n").map((p, i) =>
        p.trim() ? <p key={i}>{p}</p> : <br key={i} />
      )}
      {!done && (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: "1.1em",
            background: "var(--accent-primary)",
            animation: "pulse-glow 1s ease-in-out infinite",
            verticalAlign: "text-bottom",
            marginLeft: 2,
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Memoized Chapter Component
// ============================================================
const MemoizedChapter = React.memo(({ content }: { content: string }) => {
  return (
    <div className="story-text">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}, (prevProps, nextProps) => prevProps.content === nextProps.content);

// ============================================================
// Stat Bar Component
// ============================================================
function StatBar({
  label,
  value,
  maxVal = 100,
  color,
}: {
  label: string;
  value: number;
  maxVal?: number;
  color: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / maxVal) * 100));
  const totalSegments = 10;
  const activeSegments = Math.round((pct / 100) * totalSegments);

  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.5rem", color: "rgba(255,255,255,0.7)", fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "2px" }}>
        <span>{label}</span>
        <span className="mono-font" style={{ color: "rgba(255,255,255,0.9)", fontWeight: 400 }}>
          {value.toFixed(0)} <span style={{ color: "rgba(255,255,255,0.3)" }}>/ {maxVal}</span>
        </span>
      </div>
      <div style={{ position: "relative", height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, height: "100%",
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
            transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            borderRadius: "2px"
          }}
        />
      </div>
    </div>
  );
}

// ============================================================
// Left Panel: Dashboard
// ============================================================
function DashboardPanel() {
  const { character, quests } = useStoryStore();
  const [dashTab, setDashTab] = useState<"status" | "relations" | "items">("status");

  return (
    <div
      className="hud-panel"
      style={{
        padding: "var(--panel-padding)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", position: "relative", zIndex: 2 }}>
        <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
          <div className="hud-avatar-ring" />
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 400,
              fontSize: "1.4rem",
              fontFamily: "'Chakra Petch', sans-serif",
              color: "rgba(255, 255, 255, 0.9)",
            }}
          >
            {character.name.charAt(0).toUpperCase() || "?"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          <div className="hud-font" style={{ fontWeight: 500, fontSize: "1.2rem", color: "rgba(255,255,255,0.9)", textTransform: "uppercase", letterSpacing: "3px" }}>
            {character.name || "Chưa đặt tên"}
          </div>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <span className="cyber-badge" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", boxShadow: "none", clipPath: "none", borderRadius: "4px" }}>{character.psychology.mood}</span>
            <span className="mono-font" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 6, height: 6, background: "rgba(255,255,255,0.8)", borderRadius: "50%", boxShadow: "0 0 8px rgba(255,255,255,0.5)" }} /> SYNCED
            </span>
          </div>
        </div>
      </div>

      {/* Tab switch */}
      <div style={{ display: "flex", gap: "2px" }}>
        {[
          { key: "status", icon: <Brain size={14} />, label: "Trạng thái" },
          { key: "relations", icon: <Users size={14} />, label: "Quan hệ" },
          { key: "items", icon: <Backpack size={14} />, label: "Vật phẩm" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setDashTab(t.key as typeof dashTab)}
            className={`hud-tab ${dashTab === t.key ? "active" : ""}`}
            style={{ flex: 1 }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={dashTab}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.2 }}
          style={{ flex: 1, position: "relative", zIndex: 2 }}
        >
          {/* STATUS */}
          {dashTab === "status" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Thoughts */}
              {character.psychology.current_thoughts && (
                <div style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", borderRadius: "6px", padding: "1.2rem", position: "relative" }}>
                  <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", letterSpacing: "2px", fontFamily: "'Space Mono', monospace", marginBottom: "0.8rem", textTransform: "uppercase" }}>DIAGNOSTICS</div>
                  <div className="mono-font" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                    {character.psychology.current_thoughts}
                  </div>
                </div>
              )}

              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "6px", padding: "1.2rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                <StatBar label="Stress" value={character.psychology.stress_level} maxVal={100} color="rgba(255,255,255,0.8)" />
                {character.traits.map((t, i) => (
                  <StatBar key={i} label={t.name} value={t.current_value} maxVal={t.max_value} color="rgba(255,255,255,0.5)" />
                ))}
              </div>

              {/* Economy */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {Object.entries(character.economy.currencies).map(([name, amount]) => (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "1rem",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: "6px",
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
                      <Coins size={16} /> <span style={{ textTransform: "uppercase", letterSpacing: "2px" }}>{name}</span>
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "1.1rem", fontWeight: 400 }}>
                      {amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RELATIONS */}
          {dashTab === "relations" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {character.relationships.length === 0 ? (
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", padding: "2rem", border: "1px dashed rgba(255,255,255,0.1)" }}>
                  NO_DATA_FOUND
                </div>
              ) : (
                character.relationships.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderLeft: "2px solid rgba(0,245,212,0.5)",
                      padding: "0.8rem",
                      position: "relative"
                    }}
                  >
                    <div style={{ position: "absolute", top: 5, right: 5 }}>
                      <span className="cyber-badge">{r.tier}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#fff", marginBottom: "2px", textTransform: "uppercase" }}>{r.npc_name}</div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "0.8rem", fontFamily: "monospace" }}>
                      &lt; {r.npc_title} &gt;
                    </div>
                    <StatBar label="Trst" value={r.trust} maxVal={100} color="var(--accent-info)" />
                    <StatBar label="Affc" value={r.affection} maxVal={100} color="var(--accent-success)" />
                    <StatBar label="Hstl" value={r.hostility} maxVal={100} color="var(--accent-danger)" />
                  </div>
                ))
              )}
            </div>
          )}

          {/* ITEMS */}
          {dashTab === "items" && (
            <div style={{ position: "relative", padding: "0.5rem", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="scanline-v" style={{ opacity: 0.5 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", position: "relative", zIndex: 2 }}>
                {character.economy.inventory.length === 0 ? (
                  <div style={{ gridColumn: "span 4", fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", padding: "2rem", fontFamily: "monospace" }}>
                    INVENTORY_EMPTY
                  </div>
                ) : (
                  character.economy.inventory.map((item, i) => (
                    <div
                      key={i}
                      title={`${item.name} x${item.quantity}`}
                      style={{
                        aspectRatio: "1",
                        background: "rgba(20,20,30,0.8)",
                        border: "1px solid rgba(0, 245, 212, 0.3)",
                        position: "relative",
                        boxShadow: "inset 0 0 10px rgba(0, 245, 212, 0.1)",
                        cursor: "help",
                        overflow: "hidden"
                      }}
                    >
                      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)" }} />
                      <div style={{ position: "absolute", width: "70%", height: "70%", top: "15%", left: "15%", opacity: 0.8, mixBlendMode: "screen" }}>
                        <Image src="/images/loots.png" alt="Item" fill style={{ objectFit: "contain" }} />
                      </div>
                      <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: "0.6rem", fontWeight: 800, color: "#fff", zIndex: 2, textShadow: "0 0 4px #000" }}>
                        x{item.quantity}
                      </span>
                      {item.current_durability !== null && (
                        <div style={{ position: "absolute", bottom: 0, left: 0, height: 2, width: `${item.current_durability}%`, background: "var(--accent-success)", boxShadow: "0 0 5px var(--accent-success)" }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Right Panel: Quests & Map
// ============================================================
function QuestMapPanel() {
  const { quests, locations } = useStoryStore();
  const [rightTab, setRightTab] = useState<"quests" | "map">("quests");

  const priorityBadge = (p: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      urgent: { label: "Cấp bách", cls: "badge-urgent" },
      bound: { label: "Ràng buộc", cls: "badge-bound" },
      long_term: { label: "Dài hạn", cls: "badge-long-term" },
    };
    const info = map[p] || map["long_term"];
    return <span className={`badge ${info.cls}`}>{info.label}</span>;
  };

  return (
    <div
      className="hud-panel"
      style={{
        padding: "var(--panel-padding)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        height: "100%",
      }}
    >
      <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--accent-secondary)", textTransform: "uppercase", letterSpacing: "2px", borderBottom: "1px solid rgba(0,245,212,0.2)", paddingBottom: "0.5rem" }}>
        MẠNG LƯỚI THEO DÕI
      </div>
      
      {/* Tab switch */}
      <div style={{ display: "flex", gap: "2px" }}>
        {[
          { key: "quests", icon: <Scroll size={14} />, label: "Nhiệm vụ" },
          { key: "map", icon: <MapPin size={14} />, label: "Bản đồ" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setRightTab(t.key as typeof rightTab)}
            className={`hud-tab ${rightTab === t.key ? "active" : ""}`}
            style={{ flex: 1 }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={rightTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* QUESTS */}
          {rightTab === "quests" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {quests.filter((q) => q.status === "active").length === 0 ? (
                <div className="mono-font" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "3rem 0", letterSpacing: "1px" }}>
                  NO_ACTIVE_BOUNTIES
                </div>
              ) : (
                quests
                  .filter((q) => q.status === "active")
                  .map((q) => (
                      <div key={q.quest_id} className="bounty-card">
                        <div className="bounty-card-indicator" />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8rem", paddingRight: "1.5rem" }}>
                          <span className="hud-font" style={{ fontWeight: 600, fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", textTransform: "uppercase", width: "80%", letterSpacing: "1px" }}>{q.title}</span>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5, margin: 0 }}>
                          {q.description}
                        </p>
                        {q.deadline_chapter && (
                          <div
                            className="mono-font"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              color: "var(--accent-danger)",
                              background: "rgba(220,38,38,0.15)",
                              padding: "0.3rem 0.6rem",
                              borderRadius: "2px",
                              marginTop: "0.8rem",
                              border: "1px solid rgba(220,38,38,0.3)"
                            }}
                          >
                            <Clock size={12} />
                            HẠN CHÓT: CHƯƠNG {q.deadline_chapter}
                          </div>
                        )}
                      </div>
                  ))
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Center Panel: Story & Choices
// ============================================================
function StoryPanel() {
  const { chapters, currentChoices, isLoading, isProcessing, storyId } = useStoryStore();
  const { updateFullState, setLoading, setIsProcessing, setError } = useStoryStore();
  const isBusy = isLoading || isProcessing;
  const [customInput, setCustomInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [readMode, setReadMode] = useState<"continuous" | "single">("continuous");

  const latestChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null;

  // Track the number of chapters to detect when a new one is added
  const prevChapterCount = useRef(chapters.length);

  useEffect(() => {
    if (chapters.length > prevChapterCount.current) {
      if (latestChapter) {
        setActiveChapter(latestChapter.chapter_number);
        // If in single mode, scroll to top of the new chapter
        if (readMode === "single" && scrollRef.current) {
          scrollRef.current.scrollTop = 0;
        }
      }
    } else if (latestChapter && !activeChapter) {
      // Initial load
      setActiveChapter(latestChapter.chapter_number);
    }
    prevChapterCount.current = chapters.length;
  }, [chapters, latestChapter, activeChapter, readMode]);

  const handleScroll = () => {
    if (readMode !== "continuous") return; // Only track scroll in continuous mode
    if (!scrollRef.current) return;
    
    if (scrollTimeoutRef.current) return; // Throttled

    scrollTimeoutRef.current = setTimeout(() => {
      scrollTimeoutRef.current = null;
      if (!scrollRef.current) return;
      
      const container = scrollRef.current;
      const chapterElements = container.querySelectorAll('.chapter-container');
      const containerRect = container.getBoundingClientRect();
      
      // The "reading line" is 40% down from the top of the container
      const triggerY = containerRect.top + containerRect.height * 0.4; 

      let newActive = activeChapter;
      chapterElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // If the top of the chapter has scrolled past the reading line
        if (rect.top <= triggerY) {
          const chapterNum = parseInt(el.getAttribute('data-chapter') || "1");
          newActive = chapterNum;
        }
      });

      if (newActive !== activeChapter) {
        setActiveChapter(newActive);
      }
    }, 100); // 100ms throttle
  };

  useEffect(() => {
    // Only auto-scroll to bottom if a new chapter was added
    if (readMode === "continuous" && scrollRef.current && chapters.length > prevChapterCount.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

  }, [chapters, readMode]);

  const handleChoice = async (choiceId: number) => {
    if (!storyId || isBusy) return;
    setLoading(true);
    setIsProcessing(true);
    try {
      const result = await submitAction({
        story_id: storyId,
        action_type: "choice",
        choice_id: choiceId,
      });
      updateFullState(result);
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      setError("Lỗi khi tạo chương mới.");
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const handleCustomAction = async () => {
    if (!storyId || isBusy || !customInput.trim()) return;
    setLoading(true);
    setIsProcessing(true);
    try {
      const result = await submitAction({
        story_id: storyId,
        action_type: "custom",
        custom_action: customInput.trim(),
      });
      updateFullState(result);
      setCustomInput("");
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      setError("Lỗi khi tạo chương mới.");
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const riskIcon = (r: string) => {
    if (r === "risky") return <AlertTriangle size={13} style={{ color: "var(--accent-warm)" }} />;
    if (r === "crucial") return <Swords size={13} style={{ color: "var(--accent-danger)" }} />;
    return <ChevronRight size={13} style={{ color: "var(--accent-success)" }} />;
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: 0, // Remove padding to use full width
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.5rem",
          background: "linear-gradient(180deg, rgba(5,5,10,0.8) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", position: "relative" }}>
          {/* Prev Button */}
          {activeChapter && activeChapter > 1 && (
            <button
              onClick={() => {
                const target = activeChapter - 1;
                setActiveChapter(target);
                if (readMode === "continuous") {
                  setTimeout(() => document.getElementById(`chapter-${target}`)?.scrollIntoView({ behavior: 'smooth' }), 50);
                } else {
                  if (scrollRef.current) scrollRef.current.scrollTop = 0;
                }
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "0.4rem",
                borderRadius: "6px",
                cursor: "pointer",
                color: "var(--accent-secondary)",
                transition: "0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,245,212,0.1)"; e.currentTarget.style.borderColor = "var(--accent-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {/* Dropdown Button */}
          <button 
            onClick={() => setIsTocOpen(!isTocOpen)}
            style={{ 
              display: "flex", alignItems: "center", gap: "0.5rem",
              background: "rgba(0,245,212,0.05)",
              border: "1px solid rgba(0,245,212,0.2)",
              padding: "0.4rem 0.8rem",
              borderRadius: "6px",
              cursor: "pointer",
              color: "var(--accent-secondary)",
              fontWeight: 800,
              fontSize: "1rem",
              letterSpacing: "1px",
              textTransform: "uppercase",
              boxShadow: "inset 0 0 10px rgba(0,245,212,0.05)",
              transition: "0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,245,212,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,245,212,0.05)"; }}
          >
            <AnimatePresence mode="popLayout">
              <motion.span 
                key={activeChapter || "init"}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{ display: "inline-block" }}
              >
                {activeChapter ? `CHƯƠNG ${activeChapter}` : latestChapter ? `CHƯƠNG ${latestChapter.chapter_number}` : "BẮT ĐẦU"}
              </motion.span>
            </AnimatePresence>
            <ChevronDown size={16} style={{ transform: isTocOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "0.3s ease" }} />
          </button>

          {/* Next Button */}
          {activeChapter && latestChapter && activeChapter < latestChapter.chapter_number && (
            <button
              onClick={() => {
                const target = activeChapter + 1;
                setActiveChapter(target);
                if (readMode === "continuous") {
                  setTimeout(() => document.getElementById(`chapter-${target}`)?.scrollIntoView({ behavior: 'smooth' }), 50);
                } else {
                  if (scrollRef.current) scrollRef.current.scrollTop = 0;
                }
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "0.4rem",
                borderRadius: "6px",
                cursor: "pointer",
                color: "var(--accent-secondary)",
                transition: "0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,245,212,0.1)"; e.currentTarget.style.borderColor = "var(--accent-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            >
              <ChevronRight size={16} />
            </button>
          )}
          
          {/* Chapter Title */}
          <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", fontWeight: 600, letterSpacing: "1px", borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: "1rem" }}>
            {chapters.find(c => c.chapter_number === activeChapter)?.chapter_title || ""}
          </span>

          {/* Table of Contents Dropdown Menu */}
          <AnimatePresence>
            {isTocOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  top: "120%",
                  left: 0,
                  background: "rgba(10,10,15,0.85)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  padding: "1rem",
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "0.5rem",
                  zIndex: 50,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)"
                }}
              >
                {chapters.map((ch, idx) => (
                  <motion.button
                    key={ch.chapter_number}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03, type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => {
                      setIsTocOpen(false);
                      setActiveChapter(ch.chapter_number);
                      if (readMode === "continuous") {
                        setTimeout(() => {
                          const el = document.getElementById(`chapter-${ch.chapter_number}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }, 50);
                      } else {
                        if (scrollRef.current) scrollRef.current.scrollTop = 0;
                      }
                    }}
                    style={{
                      width: "45px",
                      height: "45px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: activeChapter === ch.chapter_number ? "rgba(0,245,212,0.2)" : "rgba(255,255,255,0.03)",
                      border: activeChapter === ch.chapter_number ? "1px solid var(--accent-secondary)" : "1px solid rgba(255,255,255,0.05)",
                      color: activeChapter === ch.chapter_number ? "var(--accent-secondary)" : "rgba(255,255,255,0.5)",
                      borderRadius: "8px",
                      fontWeight: 800,
                      fontSize: "1rem",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(0,245,212,0.15)";
                      e.currentTarget.style.color = "var(--accent-secondary)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = activeChapter === ch.chapter_number ? "rgba(0,245,212,0.2)" : "rgba(255,255,255,0.03)";
                      e.currentTarget.style.color = activeChapter === ch.chapter_number ? "var(--accent-secondary)" : "rgba(255,255,255,0.5)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {ch.chapter_number}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button 
            onClick={() => setReadMode(m => m === "continuous" ? "single" : "continuous")}
            title={readMode === "continuous" ? "Chuyển sang Đọc từng chương" : "Chuyển sang Cuộn liền mạch"}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px",
              padding: "0.3rem",
              color: "var(--accent-secondary)",
              cursor: "pointer",
              transition: "0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
          >
            {readMode === "continuous" ? <Layers size={16} /> : <BookOpen size={16} />}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-success)", boxShadow: "0 0 10px var(--accent-success)" }} />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "2px" }}>
              DATA_LINK: ONLINE
            </span>
          </div>
        </div>
      </div>

      {/* Story text area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem 2.5rem",
          scrollBehavior: "smooth",
        }}
      >
        {chapters.length === 0 && !isLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 1rem",
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem"
            }}
          >
            <div style={{ position: "relative" }}>
              <Target size={64} style={{ color: "var(--accent-primary)", opacity: 0.2 }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "100%", height: "100%", borderRadius: "50%", border: "1px solid var(--accent-primary)", animation: "pulse-glow 2s infinite" }} />
            </div>
            <h3 style={{ margin: 0, color: "var(--text-secondary)", fontWeight: 400, letterSpacing: "2px" }}>ĐANG CHỜ KẾT NỐI KÝ ỨC...</h3>
            <p style={{ fontSize: "0.85rem" }}>Nhập hành động khởi đầu của bạn vào terminal bên dưới.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {(readMode === "continuous" ? chapters : chapters.filter(c => c.chapter_number === activeChapter)).map((ch, i) => (
              <motion.div
                id={`chapter-${ch.chapter_number}`}
                key={`ch-${ch.chapter_number}`}
                className="chapter-container"
                data-chapter={ch.chapter_number}
                initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={readMode === "single" ? { opacity: 0, y: -20, filter: "blur(4px)" } : undefined}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ marginBottom: "2rem", position: "relative" }}
              >
                {i > 0 && readMode === "continuous" && (
                  <div style={{ display: "flex", alignItems: "center", margin: "3rem 0", opacity: 0.3 }}>
                    <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, var(--accent-primary))" }} />
                    <Target size={14} style={{ margin: "0 1rem", color: "var(--accent-primary)" }} />
                    <div style={{ flex: 1, height: "1px", background: "linear-gradient(270deg, transparent, var(--accent-primary))" }} />
                  </div>
                )}
                
                {/* AAA Scene Banner */}
                <div style={{ position: "relative", width: "100%", height: "200px", borderRadius: "1rem", overflow: "hidden", marginBottom: "2rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <Image src={i % 2 === 0 ? "/images/darkfantasybanner.png" : "/images/cyberpunkbanner.png"} alt="Scene" fill style={{ objectFit: "cover", opacity: 0.5, mixBlendMode: "luminosity" }} />
                  <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(180deg, transparent 0%, rgba(5,5,10,1) 100%)" }} />
                  <div style={{ position: "absolute", bottom: "1rem", left: "1.5rem", fontWeight: 800, fontSize: "1.2rem", letterSpacing: "2px", textShadow: "0 2px 10px rgba(0,0,0,0.8)", color: "var(--accent-secondary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <MapPin size={18} /> {ch.chapter_number === 1 ? "ĐIỂM KHỞI ĐẦU" : `PHÂN ĐOẠN ${ch.chapter_number}`}
                  </div>
                </div>

                <MemoizedChapter content={ch.content} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Loading indicator */}
        {isBusy && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "3rem 0"
            }}
          >
            <AILoadingTerminal />
          </motion.div>
        )}
      </div>

      {/* Action Input Area (Sticky Bottom) */}
      {!isBusy && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            flexShrink: 0,
            padding: "1.5rem",
            background: "linear-gradient(0deg, rgba(5,5,10,0.9) 0%, rgba(10,10,20,0.6) 100%)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            backdropFilter: "blur(10px)"
          }}
        >
          {/* Choices Grid */}
          {currentChoices.length > 0 && (
            <div
              className="choices-grid-container"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              {currentChoices.map((c, idx) => (
                <motion.button
                  key={c.choice_id}
                  id={`choice-${c.choice_id}`}
                  className="choice-card-wrapper"
                  onClick={() => handleChoice(c.choice_id)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.4 }}
                  style={{
                    position: "relative",
                    background: "rgba(20,20,30,0.5)",
                    border: `1px solid ${c.risk_level === 'crucial' ? 'var(--accent-danger)' : c.risk_level === 'risky' ? 'var(--accent-warm)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    textAlign: "left",
                    cursor: "pointer",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: c.risk_level === 'crucial' ? 'inset 0 0 20px rgba(220,38,38,0.1)' : 'none'
                  }}
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(30,30,45,0.8)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div style={{ padding: "0.4rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                      {riskIcon(c.risk_level)}
                    </div>
                    <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff", textTransform: "uppercase" }}>
                      {c.title}
                    </span>
                    {c.requires && (
                      <span style={{ marginLeft: "auto", fontSize: "0.65rem", padding: "0.2rem 0.5rem", background: "rgba(255,255,255,0.1)", borderRadius: "4px", color: "var(--accent-warning)", fontWeight: 700 }}>
                        REQ: {c.requires}
                      </span>
                    )}
                  </div>
                  
                  <div className="choice-desc">
                    <div className="choice-desc-inner">
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                        {c.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Hover scanline effect purely via CSS pseudo-class in globals.css */}
                  <div className="choice-hover-fx" />
                </motion.button>
              ))}
            </div>
          )}

          {/* Custom Action Terminal */}
          <div style={{ display: "flex", gap: "0.75rem", position: "relative" }}>
            <div style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--accent-primary)", zIndex: 5 }}>
              <ChevronRight size={20} />
            </div>
            <input
              id="input-custom-action"
              className="input-field"
              placeholder="Nhập lệnh hoặc hành động tùy chỉnh..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomAction()}
              style={{ flex: 1, paddingLeft: "3rem", fontSize: "1rem", letterSpacing: "0.5px" }}
            />
            <button
              className="btn-primary"
              onClick={handleCustomAction}
              disabled={!customInput.trim()}
              style={{
                padding: "0 2rem",
                opacity: customInput.trim() ? 1 : 0.5,
              }}
            >
              <span style={{ fontWeight: 800 }}>THỰC THI</span>
              <Send size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Main Play Page
// ============================================================
function PlayContent() {
  const params = useSearchParams();
  const storyId = params.get("id") || "";
  const { setStoryId, setPhase, setCharacter, setQuests, setLocations, setWorldOrganizations, setMarketItems, setPlotTriggers, setIsProcessing } = useStoryStore();
  const [mainTab, setMainTab] = useState<"story" | "map" | "relations" | "timeline" | "market" | "factions">("story");
  
  // Connect to store for the other tabs
  const { locations, character, plotTriggers, chapters, marketItems, worldOrganizations, updateFullState, setLoading, setError, isLoading, isProcessing } = useStoryStore();

  useEffect(() => {
    if (storyId) {
      setStoryId(storyId);
      setPhase("playing");

      // Load existing state
      getStoryState(storyId)
        .then((data) => {
          if (data.config) {
            setCharacter(data.config.character);
            setQuests(data.config.quests || []);
            setLocations(data.config.locations || []);
            setWorldOrganizations(data.config.available_organizations || []);
            setMarketItems(data.config.available_shop_items || []);
            setPlotTriggers(data.config.plot_triggers || []);
          }
          if (data.chapters && data.chapters.length > 0) {
            useStoryStore.setState({ chapters: data.chapters });
            // Restore choices from the latest chapter on refresh
            const latestChapter = data.chapters[data.chapters.length - 1];
            if (latestChapter.choices) {
              useStoryStore.setState({ currentChoices: latestChapter.choices });
            }
          }
          // Restore processing state from backend lock
          if (data.is_processing) {
            setIsProcessing(true);
            setLoading(true);
          }
        })
        .catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // Poll backend when processing is detected (e.g. after page refresh mid-generation)
  useEffect(() => {
    if (!isProcessing || !storyId) return;
    const interval = setInterval(async () => {
      try {
        const data = await getStoryState(storyId);
        if (!data.is_processing) {
          // Generation finished! Reload all data.
          clearInterval(interval);
          if (data.config) {
            setCharacter(data.config.character);
            setQuests(data.config.quests || []);
            setLocations(data.config.locations || []);
          }
          if (data.chapters && data.chapters.length > 0) {
            useStoryStore.setState({ chapters: data.chapters });
            const latestChapter = data.chapters[data.chapters.length - 1];
            if (latestChapter.choices) {
              useStoryStore.setState({ currentChoices: latestChapter.choices });
            }
          }
          setIsProcessing(false);
          setLoading(false);
        }
      } catch (err) {
        console.error("[POLL] Error checking state:", err);
      }
    }, 3000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing, storyId]);

  const handleCustomAction = async (action_type: "move" | "buy_item" | "join_faction", target_id: string) => {
    if (!storyId || isLoading || isProcessing) return;
    setLoading(true);
    setIsProcessing(true);
    
    // Smooth UX: Switch back to story tab immediately so user sees the loading state
    setMainTab("story");
    
    // Optional: Scroll to bottom of story so loading terminal is visible
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);

    try {
      const payload: Record<string, unknown> = {
        story_id: storyId,
        action_type,
      };
      // Map target_id to the correct backend field
      if (action_type === "buy_item") {
        payload.item_id = target_id;
      } else if (action_type === "move") {
        payload.target_location_id = target_id;
      } else if (action_type === "join_faction") {
        payload.org_id = target_id;
      } else {
        payload.custom_action = target_id;
      }
      const result = await submitAction(payload as Parameters<typeof submitAction>[0]);
      updateFullState(result);
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      setError("Lỗi khi thực hiện hành động.");
      setLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="split-layout" style={{ maxWidth: "100%", padding: "1rem 2rem" }}>
      {/* --- AAA Backgrounds --- */}
      <div className="hex-grid-bg" style={{ opacity: 0.2 }} />
      <div className="scanlines" style={{ opacity: 0.15 }} />

      {/* LEFT COLUMN: HUD Dashboard */}
      <div className="sidebar" style={{ width: 300, display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ flex: 3, minHeight: 0, overflow: "hidden" }}>
          <DashboardPanel />
        </div>
        <div style={{ flex: 2, minHeight: 0, overflow: "hidden" }}>
          <QuestMapPanel />
        </div>
      </div>
      
      {/* CENTER COLUMN: Navigation + Active Tab Content */}
      <div className="main-content">
        
        {/* Top Navigation Bar - Holographic Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: "1rem", overflowX: "auto", flexShrink: 0, position: "relative" }}>
          {[
            { key: "story", label: "TRUYỆN", icon: "📖" },
            { key: "map", label: "BẢN ĐỒ", icon: "🗺️" },
            { key: "relations", label: "QUAN HỆ", icon: "👥" },
            { key: "timeline", label: "CỐT TRUYỆN", icon: "⏳" },
            { key: "market", label: "CỬA HÀNG", icon: "🛒" },
            { key: "factions", label: "THẾ LỰC", icon: "🏛️" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key as typeof mainTab)}
              style={{
                position: "relative",
                padding: "0.8rem 1.5rem",
                background: "transparent",
                border: "none",
                color: mainTab === t.key ? "#fff" : "var(--text-muted)",
                fontSize: "0.8rem",
                fontWeight: 800,
                letterSpacing: "1px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "color 0.3s"
              }}
            >
              <span style={{ opacity: mainTab === t.key ? 1 : 0.5 }}>{t.icon}</span>
              {t.label}
              {mainTab === t.key && (
                <motion.div
                  layoutId="activeTabIndicator"
                  style={{
                    position: "absolute",
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: "var(--accent-primary)",
                    boxShadow: "0 0 10px var(--accent-primary)"
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {mainTab === "story" && <StoryPanel />}
        
        {mainTab === "map" && (
          <div className="glass-panel" style={{ flex: 1, padding: "1rem", overflow: "hidden" }}>
            <h2 style={{ marginTop: 0, color: "var(--text-primary)" }}>Bản đồ Thành phố</h2>
            <CityMap locations={locations} onMoveAction={(id) => handleCustomAction("move", id)} />
          </div>
        )}

        {mainTab === "relations" && (
          <div className="glass-panel" style={{ flex: 1, padding: "1rem", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <h2 style={{ marginTop: 0, color: "var(--text-primary)" }}>Mạng lưới Quan hệ</h2>
            <RelationshipGraph characterName={character.name || "Bạn"} relationships={character.relationships} factions={character.factions} />
          </div>
        )}

        {mainTab === "timeline" && (
          <div className="glass-panel" style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
            <h2 style={{ marginTop: 0, color: "var(--text-primary)" }}>Dòng thời gian</h2>
            <PlotTimeline chapters={chapters} plotTriggers={plotTriggers} />
          </div>
        )}

        {mainTab === "market" && (
          <div className="glass-panel" style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
            <h2 style={{ marginTop: 0, color: "var(--text-primary)" }}>Sàn Giao dịch</h2>
            <MarketPanel items={marketItems} playerEconomy={character.economy} onBuyAction={(id) => handleCustomAction("buy_item", id)} />
          </div>
        )}

        {mainTab === "factions" && (
          <div className="glass-panel" style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
            <h2 style={{ marginTop: 0, color: "var(--text-primary)" }}>Danh bạ Thế lực</h2>
            <FactionPanel storyId={storyId} organizations={worldOrganizations} onJoinAction={(id) => handleCustomAction("join_faction", id)} />
          </div>
        )}

      </div>



    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
        </div>
      }
    >
      <PlayContent />
    </Suspense>
  );
}
