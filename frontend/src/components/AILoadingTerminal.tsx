"use client";

import { useEffect, useState } from "react";
import { Terminal, Cpu, Database, Network, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LOG_MESSAGES = [
  { icon: <Database size={14} />, text: "Kích hoạt truy xuất vùng hải mã... Tìm kiếm ký ức." },
  { icon: <Network size={14} />, text: "Đồng bộ hóa mảng Qdrant Vector." },
  { icon: <Cpu size={14} />, text: "Director Agent đang phân tích bối cảnh và ràng buộc." },
  { icon: <Terminal size={14} />, text: "Writer Agent đang khởi tạo không gian đa chiều." },
  { icon: <Cpu size={14} />, text: "Tính toán xác suất lượng tử cho các quyết định." },
  { icon: <Database size={14} />, text: "Editor đang bóc tách trạng thái vật chất và tinh thần." },
  { icon: <Network size={14} />, text: "GameMaster đang rèn đúc những ngã rẽ định mệnh." },
  { icon: <Loader2 size={14} className="spin" />, text: "Hoàn tất render thực tại..." },
];

export default function AILoadingTerminal() {
  const [logs, setLogs] = useState<number[]>([0]);

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex++;
      if (currentIndex < LOG_MESSAGES.length) {
        setLogs(prev => [...prev, currentIndex]);
      } else {
        clearInterval(interval);
      }
    }, 1500); // New log every 1.5s

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      width: "100%",
      padding: "2rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "300px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "500px",
        background: "rgba(10,10,25,0.8)",
        border: "1px solid rgba(139,92,246,0.3)",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 0 30px rgba(139,92,246,0.1)",
        fontFamily: "'Fira Code', monospace"
      }}>
        {/* Terminal Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          background: "rgba(139,92,246,0.15)",
          borderBottom: "1px solid rgba(139,92,246,0.3)"
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ marginLeft: "10px", fontSize: "0.75rem", color: "var(--accent-primary)", fontWeight: 600 }}>
            LANGGRAPH_ENGINE_V3.exe
          </span>
        </div>

        {/* Terminal Body */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px", minHeight: "200px" }}>
          <AnimatePresence>
            {logs.map((logIndex) => {
              const log = LOG_MESSAGES[logIndex];
              return (
                <motion.div
                  key={logIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    fontSize: "0.8rem",
                    color: logIndex === LOG_MESSAGES.length - 1 ? "#34d399" : "var(--text-secondary)"
                  }}
                >
                  <span style={{ color: "var(--accent-primary)", marginTop: "2px" }}>{log.icon}</span>
                  <span>{log.text}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {/* Blinking cursor */}
          <motion.div
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            style={{
              width: "8px",
              height: "15px",
              background: "var(--accent-primary)",
              marginTop: "4px"
            }}
          />
        </div>
      </div>
    </div>
  );
}
