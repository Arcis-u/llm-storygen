"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  Brain,
  Coins,
  MapPin,
  Scroll,
  AlertTriangle,
  Clock,
  Target,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Layers,
  BookOpen,
  Send,
  Loader2,
  Swords,
  Users,
  Backpack,
  Hammer,
  Home,
  Settings,
  Maximize2,
  Minimize2,
  Network,
  ShoppingBag,
  Flag,
  Route,
} from "lucide-react";
import { useStoryStore } from "@/store/useStoryStore";
import { submitAction, submitInstantAction, submitIntent, submitCraftAction, getStoryState, streamAction } from "@/lib/api";
import { audioEngine } from "@/lib/audio";

import dynamic from "next/dynamic";
import Link from "next/link";
import DecisionJournal from "@/components/DecisionJournal";
import ChapterNavigator from "@/components/ChapterNavigator";
import ReaderSettings from "@/components/ReaderSettings";
import { useReaderPreferences } from "@/store/useReaderPreferences";
const CityMap = dynamic(() => import("@/components/CityMap"), { ssr: false });
const RelationshipGraph = dynamic(() => import("@/components/RelationshipGraph"), { ssr: false });
import DiceRoller from "@/components/DiceRoller";
import MarketPanel from "@/components/MarketPanel";
import FactionPanel from "@/components/FactionPanel";
import PlotTimeline from "@/components/PlotTimeline";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { worldFor } from "@/lib/worlds";

// ============================================================
// Memoized Chapter Component
// ============================================================
const MemoizedChapter = React.memo(function Chapter({ content }: { content: string }) {
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
  value?: number;
  maxVal?: number;
  color: string;
}) {
  const safeValue = value ?? 0;
  const safeMax = maxVal || 1;
  const pct = Math.min(100, Math.max(0, (safeValue / safeMax) * 100));

  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.5rem", color: "rgba(255,255,255,0.7)", fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "2px" }}>
        <span>{label}</span>
        <span className="mono-font" style={{ color: "rgba(255,255,255,0.9)", fontWeight: 400 }}>
          {safeValue.toFixed(0)} <span style={{ color: "rgba(255,255,255,0.3)" }}>/ {maxVal}</span>
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
  const { character, storyId } = useStoryStore();
  const [dashTab, setDashTab] = useState<"status" | "relations" | "items">("status");
  const [isCraftingMode, setIsCraftingMode] = useState(false);
  const [selectedCraftItems, setSelectedCraftItems] = useState<string[]>([]);
  const [isCrafting, setIsCrafting] = useState(false);
  const [craftError, setCraftError] = useState("");
  const busy = useStoryStore(s => s.isLoading || s.isProcessing || s.isEnded);

  const handleCraft = async () => {
    if (selectedCraftItems.length !== 2 || !storyId || busy) return;
    import("@/lib/audio").then(({ audioEngine }) => audioEngine.playSfx("buy"));
    setCraftError("");
    setIsCrafting(true);
    useStoryStore.getState().setIsProcessing(true);
    try {
      await submitCraftAction({
        story_id: storyId,
        item_id_1: selectedCraftItems[0],
        item_id_2: selectedCraftItems[1]
      });
      const fullState = await getStoryState(storyId);
      useStoryStore.getState().hydrateStory(fullState);
      
      setSelectedCraftItems([]);
      setIsCraftingMode(false);
      import("@/lib/audio").then(({ audioEngine }) => audioEngine.playSfx("success"));
    } catch (e) {
      console.error(e);
      setCraftError("Chưa thể chế tác. Hãy kiểm tra nguyên liệu hoặc thử lại.");
      import("@/lib/audio").then(({ audioEngine }) => audioEngine.playSfx("error"));
    } finally {
      setIsCrafting(false);
      useStoryStore.getState().setIsProcessing(false);
    }
  };

  const toggleCraftItem = (itemId: string) => {
    if (!isCraftingMode || busy || isCrafting) return;
    import("@/lib/audio").then(({ audioEngine }) => audioEngine.playSfx("click"));
    if (selectedCraftItems.includes(itemId)) {
      setSelectedCraftItems(prev => prev.filter(i => i !== itemId));
    } else {
      if (selectedCraftItems.length < 2) {
        setSelectedCraftItems(prev => [...prev, itemId]);
      }
    }
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
      {craftError && <div className="cyber-alert" role="alert">{craftError}</div>}
      {/* Top Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "-0.5rem" }}>
        <button 
          onClick={() => window.location.href = "/dashboard"}
          style={{ 
            display: "flex", alignItems: "center", gap: "0.4rem", 
            background: "transparent", border: "none", color: "var(--text-muted)", 
            cursor: "pointer", fontSize: "0.75rem", textTransform: "uppercase",
            fontFamily: "var(--font-mono)", padding: "0.4rem 0",
            transition: "color 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
        >
          <Home size={14} /> Quay lại
        </button>
        <button 
          style={{ 
            background: "transparent", border: "none", color: "var(--text-muted)", 
            cursor: "pointer", padding: "0.4rem" 
          }}
          onClick={() => window.dispatchEvent(new Event("nexus-reader-settings"))}
          title="Cài đặt trải nghiệm đọc"
          aria-label="Cài đặt trải nghiệm đọc"
        >
          <Settings size={14} />
        </button>
      </div>

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
                <StatBar label="HP" value={character.hp} maxVal={character.max_hp} color="var(--accent-danger)" />
                <StatBar label="Năng lượng" value={character.energy} maxVal={character.max_energy} color="var(--accent-info)" />
                <StatBar label="Stress" value={character.psychology?.stress_level} maxVal={100} color="rgba(255,255,255,0.8)" />
                {character.traits?.map((t, i) => (
                  <StatBar key={i} label={t.name} value={t.current_value} maxVal={t.max_value} color="rgba(255,255,255,0.5)" />
                ))}
              </div>

              {/* Economy */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {Object.entries(character.economy?.currencies || {}).map(([name, amount]) => (
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
              {!character.relationships || character.relationships.length === 0 ? (
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
            <div style={{ position: "relative", padding: "0.5rem", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Kho đồ ({character.economy.inventory.length})</span>
                <button
                  onClick={() => {
                    setIsCraftingMode(!isCraftingMode);
                    setSelectedCraftItems([]);
                    import("@/lib/audio").then(({ audioEngine }) => audioEngine.playSfx("click"));
                  }}
                  className="action-button"
                  style={{
                    background: isCraftingMode ? "var(--accent-danger)" : "var(--accent-info)",
                    color: "#000",
                    padding: "0.4rem 0.8rem",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    boxShadow: `0 0 10px ${isCraftingMode ? "var(--accent-danger)" : "var(--accent-info)"}`
                  }}
                >
                  <Hammer size={14} />
                  {isCraftingMode ? "HỦY CHẾ TẠO" : "CHẾ TẠO / GHÉP"}
                </button>
              </div>

              <div className="scanline-v" style={{ opacity: 0.5 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", position: "relative", zIndex: 2 }}>
                {character.economy.inventory.length === 0 ? (
                  <div style={{ gridColumn: "span 4", fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", padding: "2rem", fontFamily: "monospace" }}>
                    INVENTORY_EMPTY
                  </div>
                ) : (
                  character.economy.inventory.map((item, i) => {
                    const isSelected = selectedCraftItems.includes(item.item_id);
                    return (
                      <div
                        key={item.item_id || i}
                        title={`${item.name} x${item.quantity}`}
                        onClick={() => toggleCraftItem(item.item_id)}
                        style={{
                          aspectRatio: "1",
                          background: isSelected ? "var(--accent-info)" : "rgba(20,20,30,0.8)",
                          border: `1px solid ${isSelected ? "#fff" : "rgba(0, 245, 212, 0.3)"}`,
                          position: "relative",
                          boxShadow: isSelected ? "0 0 15px var(--accent-info)" : "inset 0 0 10px rgba(0, 245, 212, 0.1)",
                          cursor: isCraftingMode ? "pointer" : "help",
                          overflow: "hidden",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)" }} />
                        <div style={{ position: "absolute", width: "70%", height: "70%", top: "15%", left: "15%", opacity: isSelected ? 1 : 0.8, mixBlendMode: isSelected ? "normal" : "screen" }}>
                          <Image src="/images/loots.png" alt="Item" fill style={{ objectFit: "contain", filter: isSelected ? "brightness(0) invert(1)" : "none" }} />
                        </div>
                        <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: "0.6rem", fontWeight: 800, color: isSelected ? "#000" : "#fff", zIndex: 2, textShadow: isSelected ? "none" : "0 0 4px #000" }}>
                          x{item.quantity}
                        </span>
                        {item.current_durability !== null && (
                          <div style={{ position: "absolute", bottom: 0, left: 0, height: 2, width: `${item.current_durability}%`, background: "var(--accent-success)", boxShadow: "0 0 5px var(--accent-success)" }} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <AnimatePresence>
                {isCraftingMode && selectedCraftItems.length === 2 && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    onClick={handleCraft}
                    disabled={isCrafting}
                    className="action-button"
                    style={{ marginTop: "0.5rem", background: "var(--accent-info)", color: "#000", fontWeight: 800 }}
                  >
                    {isCrafting ? <Loader2 size={16} className="spin" /> : "TIẾN HÀNH GHÉP"}
                  </motion.button>
                )}
              </AnimatePresence>
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
  const { quests } = useStoryStore();
  const [rightTab, setRightTab] = useState<"quests" | "map">("quests");

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
function StoryPanel({ focusMode, onToggleFocus }: { focusMode: boolean; onToggleFocus: () => void }) {
  const { chapters, currentChoices, isLoading, isProcessing, storyId, isEnded, error, genre } = useStoryStore();
  const { setLoading, setIsProcessing, setError } = useStoryStore();
  const isBusy = isLoading || isProcessing;
  const [approach, setApproach] = useState<"balanced" | "careful" | "bold">("balanced");
  const [showChoiceDetails, setShowChoiceDetails] = useState(false);
  const [streamStatus, setStreamStatus] = useState("");
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const submitting = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const [customInput, setCustomInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const decisionRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const jumpTo = (element: HTMLElement | null) => {
    element?.scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth", block: "start" });
    element?.focus({ preventScroll: true });
  };
  const previousChapterRef = useRef<number | null>(null);
  useEffect(() => () => { controller.current?.abort(); }, []);
  const [selectedChapter, setActiveChapter] = useState<number | null>(null);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [readMode, setReadMode] = useState<"continuous" | "single">("single");
  const [streamingText, setStreamingText] = useState("");
  
  // Dice Roller State
  const [pendingChoice, setPendingChoice] = useState<{ id: number; risk: "risky" | "crucial" } | null>(null);

  const latestChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null;

  const activeChapter = selectedChapter ?? latestChapter?.chapter_number ?? null;

  useEffect(() => {
    if (!latestChapter) return;
    const chapterChanged = previousChapterRef.current !== null && previousChapterRef.current !== latestChapter.chapter_number;
    previousChapterRef.current = latestChapter.chapter_number;
    audioEngine.playBGM(latestChapter.tone || "ambient");
    const frame = requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      if (readMode === "single") {
        scrollRef.current.scrollTo({ top: 0, behavior: "instant" });
        if (chapterChanged && window.matchMedia('(max-width: 760px)').matches) {
          scrollRef.current.scrollIntoView({ behavior: "instant", block: "start" });
        }
      }
      else if (selectedChapter === null) document.getElementById(`chapter-${latestChapter.chapter_number}`)?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [latestChapter, readMode, selectedChapter]);

  useEffect(() => {
    const container = scrollRef.current;
    if (readMode !== "continuous" || !container) return;
    let frame = 0;
    const trackReading = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const bounds = container.getBoundingClientRect();
        const mobile = window.matchMedia('(max-width: 760px)').matches;
        const headerBottom = document.querySelector(".play-masthead")?.getBoundingClientRect().bottom || 0;
        const top = Math.max(bounds.top, mobile ? headerBottom + 12 : 0);
        const bottom = Math.min(bounds.bottom, window.innerHeight - (mobile ? 55 : 0));
        if (bottom <= top) return;
        const readingLine = top + (bottom - top) * .35;
        let visibleChapter = activeChapter;
        container.querySelectorAll<HTMLElement>('.chapter-container').forEach(element => {
          if (element.getBoundingClientRect().top <= readingLine) visibleChapter = Number(element.dataset.chapter);
        });
        if (visibleChapter !== activeChapter) setActiveChapter(visibleChapter);
      });
    };
    // Desktop scrolls the panel; touch layouts scroll the document.
    container.addEventListener('scroll', trackReading, { passive: true });
    window.addEventListener('scroll', trackReading, { passive: true });
    return () => {
      container.removeEventListener('scroll', trackReading);
      window.removeEventListener('scroll', trackReading);
      cancelAnimationFrame(frame);
    };
  }, [readMode, activeChapter]);


  const handleChoice = async (choiceId: number, riskLevel?: "normal" | "risky" | "crucial") => {
    if (!storyId || isBusy || isEnded || submitting.current) return;
    
    if (riskLevel === "risky" || riskLevel === "crucial") {
      setDiceValue(null);
      setPendingChoice({ id: choiceId, risk: riskLevel });
      return;
    }

    executeChoice(choiceId);
  };

  const runAction = async (payload: {action_type: 'choice' | 'custom'; choice_id?:number; custom_action?:string}) => {
    if (!storyId || submitting.current || isBusy || isEnded) return;
    submitting.current = true;
    setLoading(true); setIsProcessing(true); setError(null); setStreamingText("");
    setStreamStatus("Đã gửi hành động…");
    controller.current = new AbortController();
    try {
      await streamAction(
        {story_id:storyId, ...payload, expected_chapter: latestChapter?.chapter_number || 0, approach},
        token => setStreamingText(prev => prev + token),
        (chapter, config) => {
          setActiveChapter(null);
          useStoryStore.getState().completeTurn(chapter, config);
          setStreamingText("");
          if (payload.action_type === 'custom') setCustomInput("");
        },
        message => { setError(message); setStreamingText(""); setPendingChoice(null); },
        {signal:controller.current.signal, onReplace:setStreamingText, onStatus:setStreamStatus, onRoll:setDiceValue},
      );
    } finally {
      submitting.current = false;
      if (!controller.current?.signal.aborted) { setLoading(false); setIsProcessing(false); }
    }
  };
  const executeChoice = (choiceId:number) => runAction({action_type:'choice', choice_id:choiceId});
  const handleCustomAction = () => {
    if (customInput.trim()) void runAction({action_type:'custom', custom_action:customInput.trim()});
  };

  const riskIcon = (r: string) => {
    if (r === "risky") return <AlertTriangle size={13} style={{ color: "var(--accent-warm)" }} />;
    if (r === "crucial") return <Swords size={13} style={{ color: "var(--accent-danger)" }} />;
    return <ChevronRight size={13} style={{ color: "var(--accent-success)" }} />;
  };

  return (
    <div
      className="glass-panel story-reader"
      style={{
        padding: 0, // Remove padding to use full width
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        className="reader-toolbar"
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
              aria-label="Chương trước"
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
            aria-label="Mở mục lục"
            aria-expanded={isTocOpen}
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
              aria-label="Chương tiếp theo"
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

          <ChapterNavigator open={isTocOpen} onClose={() => setIsTocOpen(false)} chapters={chapters} current={activeChapter} onSelect={number => {
            setActiveChapter(number);
            requestAnimationFrame(() => {
              if (readMode === "continuous") document.getElementById(`chapter-${number}`)?.scrollIntoView({ behavior: "smooth" });
              else if (scrollRef.current) { scrollRef.current.scrollTop = 0; const reader = scrollRef.current.closest<HTMLElement>(".story-reader"); if (reader) reader.scrollTop = 0; }
            });
          }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button 
            onClick={() => setReadMode(m => m === "continuous" ? "single" : "continuous")}
            aria-label={readMode === "continuous" ? "Đọc từng chương" : "Cuộn liền mạch"}
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
              {isBusy ? "DATA_LINK: PROCESSING" : "DATA_LINK: SYNCED"}
            </span>
          </div>
        </div>
      </div>

      {/* Story text area */}
      <div
        className="story-scroll"
        ref={scrollRef}
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
          <AnimatePresence key={readMode} mode={readMode === "single" ? "wait" : "sync"}>
            {(readMode === "continuous" ? chapters : chapters.filter(c => c.chapter_number === activeChapter)).map((ch, i) => (
              <motion.div
                id={`chapter-${ch.chapter_number}`}
                tabIndex={-1}
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
                
                <div className="chapter-scene">
                  <Image src={worldFor(genre).image} alt="" sizes="(max-width:760px) 100vw, 75vw" fill priority={i === 0} />
                  <div className="chapter-scene-shade"/>
                  <div className="chapter-scene-copy"><span className="evo-eyebrow">{worldFor(genre).name} / CHƯƠNG {String(ch.chapter_number).padStart(2, "0")}</span><h2>{ch.chapter_title || `Chương ${ch.chapter_number}`}</h2><span className="chapter-scene-meta"><BookOpen size={13}/>{Math.max(1, Math.ceil(ch.content.trim().split(/\s+/).length / 220))} phút đọc<span>•</span>{ch.tone === "combat" ? "Trong giao tranh" : ch.tone === "tense" ? "Căng thẳng" : "Hành trình tiếp diễn"}</span></div>
                  <span className="chapter-scene-number" aria-hidden="true">{String(ch.chapter_number).padStart(2,"0")}</span>
                </div>

                <MemoizedChapter content={ch.content} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Loading indicator / Streaming Text */}
        {isBusy && <div className="stream-status" role="status"><Loader2 size={15} className="animate-spin"/>{streamStatus || "Đang xử lý lượt chơi…"}</div>}
        {isBusy && (
          <motion.div
            ref={draftRef}
            tabIndex={-1}
            className="reader-draft"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              margin: "3rem 0"
            }}
          >
            {streamingText ? (
              <div className="chapter-container" style={{ position: "relative" }}>
                <div style={{ position: "absolute", top: -10, left: 10, background: "var(--accent-info)", color: "#000", padding: "2px 8px", fontSize: "0.6rem", fontWeight: 800, borderRadius: "4px" }}>
                  ĐANG VIẾT...
                </div>
                <div className="story-text">
                  <ReactMarkdown>{streamingText}</ReactMarkdown>
                  <span style={{
                    display: "inline-block",
                    width: 4,
                    height: "1.1em",
                    background: "var(--accent-info)",
                    animation: "pulse-glow 1s ease-in-out infinite",
                    verticalAlign: "text-bottom",
                    marginLeft: 4,
                  }} />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div className="cyber-empty" style={{minHeight:180}}><span className="cyber-kicker">NEXUS // ĐANG KIẾN TẠO</span><p>Lựa chọn của bạn đang định hình chương tiếp theo.</p></div>
              </div>
            )}
          </motion.div>
        )}
      {/* Decisions follow the prose, inside the same reading scroll area. */}
      {!isBusy && !isEnded && chapters.length > 0 && (
        <motion.div className="decision-dock" ref={decisionRef} tabIndex={-1} aria-label="Lựa chọn cho chương tiếp theo"
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
          <div className="decision-heading"><span><Route size={15}/>NGÃ RẼ TIẾP THEO</span><small>Lựa chọn của bạn định hình câu chuyện.</small><button className="touch-choice-details" aria-expanded={showChoiceDetails} onClick={() => setShowChoiceDetails(v => !v)}>{showChoiceDetails ? "Thu mô tả" : "Xem mô tả"}</button></div>
          <fieldset className="approach-selector"><legend>CÁCH TIẾP CẬN</legend>{([['careful','Thận trọng'],['balanced','Cân bằng'],['bold','Táo bạo']] as const).map(([value,label]) => <label key={value}><input type="radio" name="approach" value={value} checked={approach===value} onChange={() => setApproach(value)}/><span>{label}</span></label>)}<small>Bạn muốn tiếp cận tình huống theo cách nào?</small></fieldset>
          {/* Choices Grid */}
          {currentChoices.length > 0 && (
            <div
              className="choices-grid-container"
              data-expanded={showChoiceDetails}
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
                  onClick={() => handleChoice(c.choice_id, c.risk_level)}
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
                  whileHover={{ y: -4, scale: 1.01, backgroundColor: "rgba(30,30,45,0.8)" }}
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
              aria-label="Hành động tùy chỉnh"
              maxLength={4000}
              className="input-field"
              placeholder="Nhập lệnh hoặc hành động tùy chỉnh..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => !e.nativeEvent.isComposing && e.key === "Enter" && handleCustomAction()}
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

      {error && <div className="cyber-alert" role="alert">{error}<button className="btn-secondary" onClick={() => window.location.reload()}>Tải lại tiến trình</button></div>}
      {isEnded && <div className="cyber-alert ending-banner"><BookOpen size={20}/><div><strong>Hành trình đã khép lại.</strong><p>Bạn vẫn có thể đọc lại các chương và lưu nhật ký quyết định.</p></div><Link href="/dashboard">Về thư viện</Link></div>}
      </div>
      {chapters.length > 0 && <nav className="reader-wayfinding" aria-label="Công cụ đọc truyện">
        <span className="reader-position"><BookOpen size={14}/><span>Chương {activeChapter}<small> / {latestChapter?.chapter_number}</small></span></span>
        <div>
          <button className="reader-focus-control" onClick={onToggleFocus} aria-pressed={focusMode}>{focusMode ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}<span>{focusMode ? "Hiện HUD" : "Ẩn HUD"}</span></button>
          <button onClick={() => jumpTo(document.getElementById(`chapter-${activeChapter}`))}><ChevronUp size={15}/><span>Đầu chương</span></button>
          {!isEnded && <button className="reader-next-control" onClick={() => jumpTo(isBusy ? draftRef.current : decisionRef.current)}><span>{isBusy ? "Phần đang viết" : "Đến lựa chọn"}</span><ChevronDown size={15}/></button>}
        </div>
      </nav>}
      <DiceRoller isOpen={pendingChoice !== null} riskLevel={pendingChoice?.risk || "risky"}
        result={diceValue} rolling={isBusy}
        onConfirm={() => {if (pendingChoice) void executeChoice(pendingChoice.id);}}
        onCancel={() => setPendingChoice(null)} />
    </div>
  );
}

// ============================================================
// Main Play Page
// ============================================================
function PlayContent() {
  const params = useSearchParams();
  const storyId = params.get("id") || "";
  const setIsProcessing = useStoryStore(s => s.setIsProcessing);
  const [mainTab, setMainTab] = useState<"story" | "map" | "relations" | "timeline" | "market" | "factions" | "journal">("story");
  useEffect(() => {
    // Reset after the tab has rendered, cancelling any in-flight reading scroll.
    const frame = requestAnimationFrame(() => {
      if (window.matchMedia('(max-width: 760px)').matches) window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [mainTab]);
  
  // Connect to store for the other tabs
  const { locations, character, plotTriggers, chapters, marketItems, worldOrganizations, updateFullState, setLoading, setError, isLoading, isProcessing, genre } = useStoryStore();

  const [booting, setBooting] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mobileHud, setMobileHud] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [readerSettings, setReaderSettings] = useState(false);
  const { fontSize, typeface, measure, illustrations } = useReaderPreferences();
  const [muted, setMuted] = useState(() => audioEngine.getMuted());
  const isEnded = useStoryStore(s => s.isEnded);
  useEffect(() => {
    const show = () => setReaderSettings(true);
    window.addEventListener("nexus-reader-settings", show);
    return () => window.removeEventListener("nexus-reader-settings", show);
  }, []);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    useStoryStore.getState().resetStore();
    const load = async () => {
      try {
        if (!storyId) { setLoadError("Chưa chọn câu chuyện."); return; }
        const data = await getStoryState(storyId);
        if (cancelled) return;
        useStoryStore.getState().hydrateStory(data);
        setLoadError("");
        if (data.is_processing) timer = setTimeout(load, 3000);
      } catch { if (!cancelled) setLoadError("Không thể tải câu chuyện. Kiểm tra kết nối và thử lại."); }
      finally { if (!cancelled) setBooting(false); }
    };
    void load();
    return () => { cancelled = true; clearTimeout(timer); audioEngine.stopBGM(); };
  }, [storyId]);

  const handleCustomAction = async (action_type: "move" | "buy_item" | "join_faction", target_id: string) => {
    if (!storyId || isLoading || isProcessing || isEnded) return;
    
    // --- System Actions (Instant) ---
    if (action_type === "buy_item") {
      try {
        const result = await submitInstantAction({ story_id: storyId, action_type, item_id: target_id });
        useStoryStore.getState().updateEconomy(result.economy);
        alert(result.message);
      } catch (err) {
        console.error(err);
        alert("Thiếu quỹ hoặc vật phẩm không tồn tại.");
      }
      return;
    }

    // --- Intent Actions (Psychology) ---
    if (action_type === "join_faction") {
      try {
        const org = worldOrganizations.find(o => o.org_id === target_id);
        const target_name = org ? org.name : target_id;
        const result = await submitIntent({ story_id: storyId, intent_type: "join_faction", target_name, target_id });
        useStoryStore.getState().addDesire(result.message.replace("Added intent: ", ""));
        alert("Đã lưu ý định! Cốt truyện sẽ tự động diễn biến theo hướng này.");
      } catch (err) {
        console.error(err);
        alert("Lỗi khi ghi nhận ý định.");
      }
      return;
    }

    // --- Narrative Actions (Move) ---
    import("@/lib/audio").then(({ audioEngine }) => audioEngine.playSfx("click"));
    setLoading(true);
    setIsProcessing(true);
    
    // Smooth UX: Switch back to story tab immediately so user sees the loading state
    setMainTab("story");
    
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);

    try {
      const payload: Record<string, unknown> = {
        story_id: storyId,
        action_type,
        target_location_id: target_id,
        expected_chapter: chapters.at(-1)?.chapter_number || 0,
      };
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

  const themeClass = genre?.toLowerCase().includes("fantasy") ? "theme-fantasy" : "theme-cyberpunk";

  if (booting) return <main id="main-content" className="cyber-empty"><Loader2 className="animate-spin"/> Đang đồng bộ câu chuyện…</main>;
  if (loadError) return <main id="main-content" className="cyber-empty"><p>{loadError}</p><button className="btn-secondary" onClick={() => window.location.reload()}>Thử lại</button><Link href="/dashboard">Về thư viện</Link></main>;
  return (
    <div id="main-content" className={`split-layout nexus-play nexus-play-evolved ${themeClass} ${focusMode ? 'focus-mode' : ''} ${mobileHud ? 'hud-open' : ''} ${illustrations ? '' : 'no-scene-illustrations'} ${typeface === 'sans' ? 'reader-sans' : ''}`} style={{maxWidth:"100%",padding:"1rem 2rem",position:"relative",'--reader-size':`${fontSize}px`,'--reader-measure':measure === 'wide' ? '1120px' : '920px'} as React.CSSProperties}>
      <header className="play-masthead">
        <Link href="/dashboard" className="play-brand">N<span>↗</span><b>NEXUS <i>TALE</i></b></Link>
        <div className="play-context"><span>{worldFor(genre).name}</span><strong title={locations.find(l => l.is_current)?.name}>{locations.find(l => l.is_current)?.name || "Hành trình của bạn"}</strong></div>
        <nav className="play-navigation" aria-label="Các màn chơi">
          {[
            { key: "story", label: "TRUYỆN", icon: <BookOpen size={16}/> },
            { key: "map", label: "BẢN ĐỒ", icon: <MapPin size={16}/> },
            { key: "relations", label: "QUAN HỆ", icon: <Network size={16}/> },
            { key: "journal", label: "NHẬT KÝ", icon: <Scroll size={16}/> },
            { key: "timeline", label: "CỐT TRUYỆN", icon: <Route size={16}/> },
            { key: "market", label: "CỬA HÀNG", icon: <ShoppingBag size={16}/> },
            { key: "factions", label: "THẾ LỰC", icon: <Flag size={16}/> },
          ].map(tab => <button key={tab.key} disabled={isLoading || isProcessing} aria-pressed={mainTab === tab.key}
            onClick={() => setMainTab(tab.key as typeof mainTab)}>
            {tab.icon}<span>{tab.label}</span>
            {mainTab === tab.key && <motion.div className="play-tab-indicator" layoutId="activeTabIndicator"/>}
          </button>)}
        </nav>
        <span className="play-session-state"><span className="signal-dot"/>{isProcessing || isLoading ? "ĐANG DIỄN TIẾN" : isEnded ? "ĐÃ KHÉP LẠI" : "ĐANG NHẬP VAI"}</span>
        <div className="play-utility"><button className="cyber-icon-button mobile-hud-toggle" onClick={() => setMobileHud(v => !v)} aria-expanded={mobileHud} aria-label="Mở trạng thái nhân vật"><Users size={17}/></button><Link className="cyber-icon-button" href="/dashboard" data-tip="Thư viện" aria-label="Về thư viện"><Home size={17}/></Link><button className="cyber-icon-button" onClick={() => setFocusMode(v => !v)} data-tip={focusMode ? "Hiện HUD" : "Tập trung đọc"} aria-label={focusMode ? "Hiện bảng trạng thái" : "Tập trung đọc"}>{focusMode ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}</button><button className="cyber-icon-button" onClick={() => setReaderSettings(v => !v)} data-tip="Góc đọc của bạn" aria-expanded={readerSettings} aria-label="Cài đặt trải nghiệm đọc"><Settings size={17}/></button></div>
      </header>
      <ReaderSettings open={readerSettings} onClose={() => setReaderSettings(false)} muted={muted} onMute={() => setMuted(audioEngine.toggleMute())} />
      <div className="play-atmosphere" aria-hidden="true"><Image src={worldFor(genre).image} alt="" fill sizes="100vw" /></div>

      {/* LEFT COLUMN: HUD Dashboard */}
      {mobileHud && <button className="hud-backdrop" aria-label="Đóng bảng nhân vật" onClick={() => setMobileHud(false)}/>}
      <div className="sidebar" style={{ width: 300, display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ flex: 3, minHeight: 0, overflow: "hidden" }}>
          <DashboardPanel />
        </div>
        <div style={{ flex: 2, minHeight: 0, overflow: "hidden" }}>
          <QuestMapPanel />
        </div>
      </div>
      
      {/* CENTER COLUMN: Active Tab Content */}
      <div className="main-content">
        {chapters.length === 0 && <div className="cyber-alert">Câu chuyện chưa có chương mở đầu. <Link href={`/customize?id=${encodeURIComponent(storyId)}`}>Hoàn tất nhân vật & bắt đầu</Link></div>}
        
        {/* Tab Content */}
        {mainTab === "story" && <StoryPanel focusMode={focusMode} onToggleFocus={() => setFocusMode(value => !value)} />}
        {mainTab === "journal" && <div className="glass-panel" style={{flex:1,overflowY:"auto",padding:"1.5rem"}}><DecisionJournal/></div>}
        
        {mainTab === "map" && (
          <div className="glass-panel play-map" style={{ flex: 1, padding: "1rem", overflow: "hidden" }}>
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
