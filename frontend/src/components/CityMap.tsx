"use client";

import { useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  Position,
  Handle,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MapLocation } from "@/store/useStoryStore";
import { MapPin, Info, Zap, ShieldAlert, Target } from "lucide-react";
import Image from "next/image";

// --- Custom Node: Location ---
function LocationNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const isCurrent = d.is_current as boolean;
  const isUnlocked = d.is_unlocked as boolean;

  return (
    <div
      style={{
        position: "relative",
        padding: "12px 16px",
        background: isCurrent
          ? "linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(20,20,30,0.9) 100%)"
          : isUnlocked
          ? "linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(10,10,20,0.9) 100%)"
          : "rgba(5,5,10,0.9)",
        border: `1px solid ${isCurrent ? "var(--accent-primary)" : isUnlocked ? "rgba(0,245,212,0.3)" : "rgba(255,255,255,0.05)"}`,
        borderLeft: `4px solid ${isCurrent ? "var(--accent-primary)" : isUnlocked ? "var(--accent-secondary)" : "rgba(255,255,255,0.1)"}`,
        minWidth: "160px",
        backdropFilter: "blur(8px)",
        boxShadow: isCurrent ? "0 0 20px rgba(139,92,246,0.4), inset 0 0 10px rgba(139,92,246,0.2)" : "none",
        opacity: isUnlocked ? 1 : 0.5,
        transition: "all 0.3s ease",
        cursor: "pointer",
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
        overflow: "hidden"
      }}
    >
      {/* Scanning line animation for current node */}
      {isCurrent && (
        <div style={{ position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%", background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)", animation: "scan-line 2s linear infinite", pointerEvents: "none" }} />
      )}
      
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", position: "relative", zIndex: 2 }}>
        <MapPin size={16} color={isCurrent ? "var(--accent-primary)" : "var(--text-secondary)"} />
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {d.label as string} {!isUnlocked && "🔒"}
        </span>
      </div>
      
      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "4px" }}>
        {d.shortFunction as string}
      </div>

      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="b" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="t" style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = {
  location: LocationNode,
};

interface Props {
  locations: MapLocation[];
  onMoveAction: (locationId: string) => void;
}

export default function CityMap({ locations, onMoveAction }: Props) {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);

  const nodes: Node[] = useMemo(() => {
    const SCALE = 8; // Scale 0-100 to 0-800 pixel space for proper spacing
    return locations.map((loc) => ({
      id: loc.location_id,
      type: "location",
      data: {
        label: loc.name,
        is_current: loc.is_current,
        is_unlocked: loc.is_unlocked,
        shortFunction: loc.function.substring(0, 30) + (loc.function.length > 30 ? "..." : ""),
      },
      position: { x: loc.x_position * SCALE, y: loc.y_position * SCALE },
    }));
  }, [locations]);

  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];
    locations.forEach((loc) => {
      loc.connected_to.forEach((targetId) => {
        // Prevent duplicate undirected edges
        const reverseId = `edge-${targetId}-${loc.location_id}`;
        if (!result.find(e => e.id === reverseId)) {
           result.push({
            id: `edge-${loc.location_id}-${targetId}`,
            source: loc.location_id,
            target: targetId,
            style: { stroke: "rgba(139,92,246,0.3)", strokeWidth: 2, strokeDasharray: "5,5" },
            animated: loc.is_current || locations.find(l => l.location_id === targetId)?.is_current,
          });
        }
      });
    });
    return result;
  }, [locations]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    const loc = locations.find((l) => l.location_id === node.id);
    if (loc) setSelectedLocation(loc);
  };

  return (
    <div style={{ display: "flex", gap: "1rem", height: "100%", width: "100%", minHeight: "500px" }}>
      {/* Map Container */}
      <div style={{ flex: 1, borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border-subtle)", position: "relative" }}>
        <Image src="/images/map.png" alt="Map BG" fill style={{ objectFit: "cover", opacity: 0.35, mixBlendMode: "screen", pointerEvents: "none", zIndex: 0 }} />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          style={{ background: "transparent" }}
        >
          <Controls position="bottom-right" />
          <Background variant={BackgroundVariant.Lines} gap={30} size={1} color="rgba(255,255,255,0.03)" />
        </ReactFlow>
      </div>

      {/* Detail Sidebar */}
      {selectedLocation && (
        <div style={{ 
          width: "300px", 
          padding: "1rem", 
          background: "rgba(26,26,46,0.8)", 
          borderRadius: "12px",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          backdropFilter: "blur(10px)"
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <MapPin size={18} color="var(--accent-primary)" /> {selectedLocation.name}
            </h3>
            <div style={{ fontSize: "0.75rem", color: "var(--accent-warning)", marginTop: "0.2rem" }}>
              {selectedLocation.is_current ? "📍 Bạn đang ở đây" : selectedLocation.is_unlocked ? "Mở khóa" : "🔒 Chưa khám phá"}
            </div>
          </div>

          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {selectedLocation.description}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <div className="glass-card" style={{ padding: "0.6rem", background: "rgba(14,165,233,0.1)", borderLeft: "2px solid #0ea5e9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#0ea5e9", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                <Target size={14} /> Chức năng
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{selectedLocation.function}</div>
            </div>

            <div className="glass-card" style={{ padding: "0.6rem", background: "rgba(34,197,94,0.1)", borderLeft: "2px solid #22c55e" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#22c55e", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                <Zap size={14} /> Lợi ích
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{selectedLocation.benefits}</div>
            </div>

            <div className="glass-card" style={{ padding: "0.6rem", background: "rgba(239,68,68,0.1)", borderLeft: "2px solid #ef4444" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#ef4444", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                <ShieldAlert size={14} /> Rủi ro
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{selectedLocation.risks}</div>
            </div>
          </div>

          <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
            <button 
              className="action-button" 
              style={{ width: "100%", opacity: (!selectedLocation.is_unlocked || selectedLocation.is_current) ? 0.5 : 1 }}
              disabled={!selectedLocation.is_unlocked || selectedLocation.is_current}
              onClick={() => onMoveAction(selectedLocation.location_id)}
            >
              {selectedLocation.is_current ? "Đang ở đây" : "Di chuyển đến đây"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
