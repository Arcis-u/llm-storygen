"use client";

import { ShopItem, CharacterEconomy } from "@/store/useStoryStore";
import { Coins, ShoppingCart, Hammer, FlaskConical, Shield, Sword, Hexagon } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  items: ShopItem[];
  playerEconomy: CharacterEconomy;
  onBuyAction: (itemId: string) => void;
}

function getCategoryIcon(cat: string) {
  const c = cat.toLowerCase();
  if (c.includes("weapon") || c.includes("vũ khí") || c.includes("kiếm")) return <Sword size={16} />;
  if (c.includes("armor") || c.includes("giáp")) return <Shield size={16} />;
  if (c.includes("potion") || c.includes("thuốc") || c.includes("dược")) return <FlaskConical size={16} />;
  if (c.includes("material") || c.includes("nguyên liệu")) return <Hammer size={16} />;
  return <Hexagon size={16} />;
}

export default function MarketPanel({ items, playerEconomy, onBuyAction }: Props) {
  if (items.length === 0) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <ShoppingCart size={48} style={{ opacity: 0.2 }} />
        <div style={{ fontSize: "1.2rem", letterSpacing: "1px", textTransform: "uppercase" }}>Sàn giao dịch tạm đóng</div>
        <p style={{ fontSize: "0.85rem" }}>Không có tín hiệu giao thương tại khu vực này.</p>
      </div>
    );
  }

  const checkAffordable = (price: number, currencyType: string) => {
    const playerMoney = playerEconomy.currencies[currencyType] || 0;
    return playerMoney >= price;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.5rem", padding: "1rem" }}>
      {items.map((item, idx) => {
        const affordable = checkAffordable(item.price, item.currency_type);

        return (
          <motion.div 
            key={item.item_id} 
            className="glass-card" 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ duration: 0.4, delay: idx * 0.1, type: "spring", stiffness: 200 }}
            style={{ 
              display: "flex", 
              flexDirection: "column", 
              padding: "1.5rem",
              position: "relative",
              overflow: "hidden",
              borderTop: "2px solid rgba(255,255,255,0.1)",
            }}
          >
            {/* Background Hologram Icon */}
            <div style={{ position: "absolute", right: "-10%", top: "0%", opacity: 0.03, transform: "scale(6)", pointerEvents: "none", color: "var(--accent-secondary)" }}>
              {getCategoryIcon(item.category)}
            </div>

            {/* Glowing Corner */}
            <div style={{ position: "absolute", top: 0, left: 0, width: "30%", height: "2px", background: "linear-gradient(90deg, var(--accent-secondary), transparent)" }} />

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", zIndex: 1 }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "0.5px" }}>{item.name}</h3>
              {item.is_consumable && (
                <span className="badge badge-bound">
                  TIÊU HAO
                </span>
              )}
            </div>

            <div style={{ fontSize: "0.75rem", color: "var(--accent-secondary)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>
              {getCategoryIcon(item.category)} {item.category}
            </div>

            {/* Description */}
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, flex: 1, zIndex: 1 }}>
              {item.description}
            </p>

            <div style={{ fontSize: "0.8rem", color: "var(--accent-primary)", fontStyle: "italic", marginBottom: "1.5rem", marginTop: "0.5rem", zIndex: 1, opacity: 0.8 }}>
              {item.narrative_impact}
            </div>

            {/* Footer / Price */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "1rem", borderTop: "1px dashed rgba(255,255,255,0.1)", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: affordable ? "var(--accent-tertiary)" : "var(--accent-danger)", fontWeight: 800, fontSize: "1.1rem" }}>
                <Coins size={18} />
                {item.price} <span style={{ fontSize: "0.7em", opacity: 0.8 }}>{item.currency_type}</span>
              </div>

              <button 
                className="btn-primary" 
                style={{ 
                  padding: "0.5rem 1.2rem", 
                  fontSize: "0.8rem",
                  background: affordable ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" : "rgba(255,255,255,0.05)",
                  color: affordable ? "#fff" : "var(--text-muted)",
                  boxShadow: affordable ? "0 0 15px rgba(0, 245, 212, 0.4)" : "none",
                }}
                disabled={!affordable}
                onClick={() => onBuyAction(item.item_id)}
              >
                {affordable ? "MUA NGAY" : "THIẾU QUỸ"}
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
