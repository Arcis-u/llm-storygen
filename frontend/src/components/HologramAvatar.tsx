"use client";
import { motion } from "framer-motion";

export default function HologramAvatar() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Background Glow */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", width: "150px", height: "150px", background: "radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)", filter: "blur(20px)" }}
      />
      
      {/* Outer Rotating Ring */}
      <motion.svg
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        width="220" height="220" viewBox="0 0 220 220" style={{ position: "absolute" }}
      >
        <circle cx="110" cy="110" r="100" fill="none" stroke="var(--accent-secondary)" strokeWidth="1" strokeDasharray="5, 15, 30, 10" opacity="0.6" />
        <circle cx="110" cy="110" r="105" fill="none" stroke="var(--accent-primary)" strokeWidth="0.5" strokeDasharray="1, 5" opacity="0.4" />
      </motion.svg>

      {/* Inner Rotating Ring Reverse */}
      <motion.svg
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        width="180" height="180" viewBox="0 0 180 180" style={{ position: "absolute" }}
      >
        <polygon points="90,10 160,50 160,130 90,170 20,130 20,50" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeDasharray="20, 10" opacity="0.5" />
      </motion.svg>

      {/* Core Avatar (Abstract Geometric Silhouette) */}
      <motion.svg
        animate={{ filter: ["hue-rotate(0deg)", "hue-rotate(20deg)", "hue-rotate(0deg)"] }}
        transition={{ duration: 5, repeat: Infinity }}
        width="120" height="150" viewBox="0 0 120 150" style={{ zIndex: 2 }}
      >
        <path d="M60 10 L90 40 L90 70 L75 90 L85 110 L85 140 L35 140 L35 110 L45 90 L30 70 L30 40 Z" fill="rgba(0, 245, 212, 0.1)" stroke="var(--accent-primary)" strokeWidth="2" />
        {/* Eyes/Visor */}
        <path d="M45 50 L75 50 L80 60 L40 60 Z" fill="var(--accent-secondary)" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
        </path>
        <line x1="60" y1="10" x2="60" y2="140" stroke="var(--accent-secondary)" strokeWidth="1" strokeDasharray="4, 4" opacity="0.5" />
      </motion.svg>

      {/* Scanning Line overlay */}
      <motion.div
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", width: "100%", height: "2px", background: "var(--accent-secondary)", boxShadow: "0 0 10px var(--accent-secondary)", zIndex: 3, opacity: 0.5 }}
      />
    </div>
  );
}
