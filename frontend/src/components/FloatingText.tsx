"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export interface FloatingMessage {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

interface Props {
  messages: FloatingMessage[];
  onComplete: (id: string) => void;
}

export default function FloatingText({ messages, onComplete }: Props) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, pointerEvents: "none", zIndex: 9999 }}>
      <AnimatePresence>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 1, y: msg.y, x: msg.x, scale: 0.5 }}
            animate={{ opacity: 0, y: msg.y - 100, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            onAnimationComplete={() => onComplete(msg.id)}
            style={{
              position: "absolute",
              color: msg.color,
              fontWeight: 900,
              fontSize: "1.5rem",
              textShadow: "0 0 10px rgba(0,0,0,0.8), 0 0 20px currentColor",
              fontFamily: "'Fira Code', monospace",
              whiteSpace: "nowrap"
            }}
          >
            {msg.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
