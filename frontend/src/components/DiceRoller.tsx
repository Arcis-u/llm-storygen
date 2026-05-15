"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dices } from "lucide-react";
import { audioEngine } from "@/lib/audio";

interface Props {
  isOpen: boolean;
  onResult: (result: number) => void;
  onCancel: () => void;
  riskLevel: "risky" | "crucial";
}

export default function DiceRoller({ isOpen, onResult, onCancel, riskLevel }: Props) {
  const [isRolling, setIsRolling] = useState(false);
  const [currentValue, setCurrentValue] = useState(20);
  const [finalValue, setFinalValue] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsRolling(false);
      setFinalValue(null);
      setCurrentValue(20);
    }
  }, [isOpen]);

  const handleRoll = () => {
    if (isRolling || finalValue) return;
    
    setIsRolling(true);
    audioEngine.playSfx("click");
    
    // Simulate dice roll animation
    let rolls = 0;
    const maxRolls = 20;
    const interval = setInterval(() => {
      setCurrentValue(Math.floor(Math.random() * 20) + 1);
      rolls++;
      
      if (rolls >= maxRolls) {
        clearInterval(interval);
        const result = Math.floor(Math.random() * 20) + 1;
        setFinalValue(result);
        setCurrentValue(result);
        setIsRolling(false);
        
        // Determine sound
        if (result === 1) audioEngine.playSfx("error");
        else if (result >= 10) audioEngine.playSfx("success");
        else audioEngine.playSfx("glitch");

        // Auto close and submit after a delay
        setTimeout(() => {
          onResult(result);
        }, 2000);
      }
    }, 50);
  };

  const getResultText = (val: number) => {
    if (val === 1) return { text: "CRITICAL FAILURE", color: "var(--accent-danger)" };
    if (val >= 2 && val <= 9) return { text: "FAILURE", color: "var(--accent-warm)" };
    if (val >= 10 && val <= 19) return { text: "SUCCESS", color: "var(--accent-success)" };
    if (val === 20) return { text: "CRITICAL SUCCESS", color: "var(--accent-info)" };
    return { text: "", color: "white" };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(5px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="glass-panel"
            style={{
              padding: "3rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2rem",
              border: `2px solid ${riskLevel === "crucial" ? "var(--accent-danger)" : "var(--accent-warm)"}`,
              boxShadow: `0 0 30px ${riskLevel === "crucial" ? "rgba(230,57,70,0.3)" : "rgba(255,84,0,0.3)"}`
            }}
          >
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "1.5rem", color: "var(--text-primary)", margin: 0, textTransform: "uppercase", letterSpacing: "2px" }}>
                Thử Thách Nhân Phẩm
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                Hành động này mang rủi ro lớn. Đổ xúc xắc (D20) để quyết định số phận.
              </p>
            </div>

            <div 
              style={{
                width: 150, height: 150,
                borderRadius: "20px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                cursor: finalValue ? "default" : "pointer"
              }}
              onClick={handleRoll}
            >
              {isRolling ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
                  style={{ fontSize: "4rem", fontWeight: 800, fontFamily: "var(--font-mono)" }}
                >
                  {currentValue}
                </motion.div>
              ) : (
                <div style={{ fontSize: "5rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: finalValue ? getResultText(finalValue).color : "white", textShadow: finalValue ? `0 0 20px ${getResultText(finalValue).color}` : "none" }}>
                  {finalValue !== null ? finalValue : <Dices size={64} opacity={0.5} />}
                </div>
              )}
            </div>

            <div style={{ height: "2rem", textAlign: "center" }}>
              {finalValue !== null && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ fontSize: "1.5rem", fontWeight: 800, color: getResultText(finalValue).color, textTransform: "uppercase", letterSpacing: "2px" }}
                >
                  {getResultText(finalValue).text}
                </motion.div>
              )}
            </div>

            {!finalValue && !isRolling && (
              <div style={{ display: "flex", gap: "1rem", width: "100%" }}>
                <button className="action-button" style={{ flex: 1, justifyContent: "center" }} onClick={onCancel}>
                  HỦY BỎ
                </button>
                <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={handleRoll}>
                  ĐỔ XÚC XẮC
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
