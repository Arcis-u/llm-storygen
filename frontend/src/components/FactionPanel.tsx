"use client";

import { useState } from "react";
import { Organization } from "@/store/useStoryStore";
import { Globe, EyeOff, Shield, Target, Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { searchFaction } from "@/lib/api";
import { useStoryStore } from "@/store/useStoryStore";

interface Props {
  storyId: string;
  organizations: Organization[];
  onJoinAction: (orgId: string) => void;
}

export default function FactionPanel({ storyId, organizations, onJoinAction }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchError("");
    
    try {
      const res = await searchFaction({ story_id: storyId, query: searchQuery });
      if (res.status === "success" || res.status === "exists") {
        // Update the global store with the new faction if it's new
        if (res.status === "success") {
          useStoryStore.setState((state) => {
            const orgExists = state.worldOrganizations?.some((o: any) => o.org_id === res.faction.org_id);
            if (!orgExists) {
              return {
                worldOrganizations: [...(state.worldOrganizations || []), res.faction]
              };
            }
            return state;
          });
        }
        setSearchQuery("");
      }
    } catch (err) {
      console.error(err);
      setSearchError("Lỗi khi tìm kiếm thế lực.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm tổ chức thực tế hoặc tin đồn..."
          className="chat-input"
          style={{ flex: 1 }}
          disabled={isSearching}
        />
        <button 
          type="submit" 
          className="action-button" 
          disabled={isSearching || !searchQuery.trim()}
          style={{ padding: "0 1rem" }}
        >
          {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        </button>
      </form>

      {searchError && <div style={{ color: "var(--accent-danger)", fontSize: "0.85rem", marginBottom: "1rem" }}>{searchError}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {organizations.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", gridColumn: "1/-1" }}>
            Chưa có thế lực nào xuất hiện trong câu chuyện. Hãy tìm kiếm để thêm mới!
          </div>
        ) : (
          organizations.map((org, idx) => (
            <motion.div 
              key={org.org_id}
          className="glass-card" 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: idx * 0.05 }}
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            borderTop: `3px solid ${org.is_real_world_based ? "#3b82f6" : "#8b5cf6"}`,
            padding: "1.25rem"
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ position: "relative", width: "48px", height: "48px", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(0,245,212,0.3)", boxShadow: "0 0 10px rgba(0,245,212,0.1)", flexShrink: 0 }}>
                <Image src="/images/Faction Emblems.png" alt="Emblem" fill style={{ objectFit: "cover" }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>{org.name}</h3>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>{org.type}</span>
              </div>
            </div>
            {org.is_real_world_based ? (
              <span title="Tổ chức có thật" style={{ color: "#3b82f6" }}><Globe size={18} /></span>
            ) : (
              <span title="Thế lực hư cấu" style={{ color: "#8b5cf6" }}><EyeOff size={18} /></span>
            )}
          </div>

          {/* Danger Level */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Độ nguy hiểm:</span>
            <div style={{ display: "flex", gap: "2px" }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div 
                  key={i} 
                  style={{ 
                    width: "12px", 
                    height: "4px", 
                    background: i <= org.danger_level ? (org.danger_level > 3 ? "#ef4444" : "#f59e0b") : "rgba(255,255,255,0.1)",
                    borderRadius: "2px"
                  }} 
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, flex: 1 }}>
            {org.public_description}
          </p>

          {/* Requirements & Benefits */}
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem", background: "rgba(0,0,0,0.2)", padding: "0.8rem", borderRadius: "8px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              <Target size={14} style={{ color: "var(--accent-warning)", marginTop: "2px" }} />
              <div>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-primary)", display: "block" }}>Điều kiện:</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {Object.entries(org.join_requirements).length === 0 
                    ? "Không có yêu cầu đặc biệt." 
                    : Object.entries(org.join_requirements).map(([k, v]) => `${k} >= ${v}`).join(", ")}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              <Shield size={14} style={{ color: "var(--accent-success)", marginTop: "2px" }} />
              <div>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-primary)", display: "block" }}>Quyền lợi:</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{org.benefits_description}</span>
              </div>
            </div>
          </div>

          {/* Action */}
          <button 
            className="action-button" 
            style={{ marginTop: "1rem", width: "100%", justifyContent: "center" }}
            onClick={() => onJoinAction(org.org_id)}
          >
            TÌM HIỂU
          </button>
        </motion.div>
      ))
    )}
  </div>
    </div>
  );
}
