"use client";

/**
 * RelationshipGraph: Interactive node graph showing NPC relationships.
 * Each NPC is a node, edges show trust/affection/hostility.
 */

import { useCallback, useMemo } from "react";
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
import { NPCRelationship, FactionRelation } from "@/store/useStoryStore";

// --- Custom Node: Player ---
function PlayerNode({ data }: NodeProps) {
  return (
    <div
      style={{
        padding: "10px 18px",
        background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))",
        border: "2px solid var(--accent-primary)",
        borderRadius: "50%",
        minWidth: 70,
        minHeight: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 20px rgba(139,92,246,0.4)",
        animation: "pulse-glow 2s ease-in-out infinite",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "1.2rem" }}>🧑</div>
        <div style={{ fontSize: "0.65rem", color: "#e2e8f0", fontWeight: 600 }}>
          {(data as Record<string, unknown>).label as string}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
    </div>
  );
}

// --- Custom Node: NPC ---
function NpcNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  return (
    <div
      style={{
        padding: "8px 14px",
        background: "rgba(26,26,46,0.85)",
        border: `1.5px solid ${d.borderColor as string || "var(--border-subtle)"}`,
        borderRadius: 12,
        minWidth: 100,
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#e2e8f0" }}>
          {d.label as string}
        </div>
        <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: 2 }}>
          {d.title as string}
        </div>
        <div style={{ fontSize: "0.55rem", color: d.tierColor as string, marginTop: 3, fontWeight: 500 }}>
          {d.tier as string}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
    </div>
  );
}

// --- Custom Node: Faction ---
function FactionNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  return (
    <div
      style={{
        padding: "8px 14px",
        background: "rgba(245,158,11,0.1)",
        border: "1.5px solid rgba(245,158,11,0.4)",
        borderRadius: 12,
        minWidth: 100,
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "0.65rem" }}>🏛️</div>
        <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#fbbf24" }}>
          {d.label as string}
        </div>
        <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", marginTop: 2 }}>
          Rep: {d.reputation as number}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = {
  player: PlayerNode,
  npc: NpcNode,
  faction: FactionNode,
};

function getTierColor(tier: string): string {
  switch (tier) {
    case "enemy": return "#ef4444";
    case "rival": return "#f97316";
    case "stranger": return "#6b7280";
    case "acquaintance": return "#a78bfa";
    case "friend": return "#34d399";
    case "close": return "#22d3ee";
    case "intimate": return "#ec4899";
    default: return "#6b7280";
  }
}

function getEdgeColor(r: NPCRelationship): string {
  if (r.hostility > r.trust && r.hostility > r.affection) return "#ef4444";
  if (r.affection > r.trust) return "#ec4899";
  return "#34d399";
}

interface Props {
  characterName: string;
  relationships: NPCRelationship[];
  factions: FactionRelation[];
}

export default function RelationshipGraph({ characterName, relationships, factions }: Props) {
  const nodes: Node[] = useMemo(() => {
    const result: Node[] = [
      {
        id: "player",
        type: "player",
        data: { label: characterName },
        position: { x: 300, y: 250 },
      },
    ];

    // NPC nodes in a circle around the player
    relationships.forEach((r, i) => {
      const angle = (2 * Math.PI * i) / Math.max(relationships.length, 1);
      const radius = 200;
      result.push({
        id: `npc-${i}`,
        type: "npc",
        data: {
          label: r.npc_name,
          title: r.npc_title,
          tier: r.tier,
          tierColor: getTierColor(r.tier),
          borderColor: getEdgeColor(r),
        },
        position: {
          x: 300 + radius * Math.cos(angle) - 50,
          y: 250 + radius * Math.sin(angle) - 20,
        },
      });
    });

    // Faction nodes further out
    factions.forEach((f, i) => {
      const angle = (2 * Math.PI * i) / Math.max(factions.length, 1) + Math.PI / 4;
      const radius = 340;
      result.push({
        id: `faction-${f.org_id}`,
        type: "faction",
        data: {
          label: f.org_name,
          reputation: f.reputation,
        },
        position: {
          x: 300 + radius * Math.cos(angle) - 50,
          y: 250 + radius * Math.sin(angle) - 20,
        },
      });
    });

    return result;
  }, [characterName, relationships, factions]);

  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];

    relationships.forEach((r, i) => {
      result.push({
        id: `edge-npc-${i}`,
        source: "player",
        target: `npc-${i}`,
        style: { stroke: getEdgeColor(r), strokeWidth: 1.5 },
        animated: r.tier === "intimate" || r.tier === "enemy",
        label: `T:${r.trust} A:${r.affection}`,
        labelStyle: { fontSize: 9, fill: "var(--text-muted)" },
      });
    });

    factions.forEach((f) => {
      result.push({
        id: `edge-faction-${f.org_id}`,
        source: "player",
        target: `faction-${f.org_id}`,
        style: { stroke: "rgba(245,158,11,0.5)", strokeWidth: 1, strokeDasharray: "5,5" },
        label: f.status,
        labelStyle: { fontSize: 9, fill: "#fbbf24" },
      });
    });

    return result;
  }, [relationships, factions]);

  return (
    <div style={{ width: "100%", height: 450, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: "rgba(10,10,25,0.95)" }}
      >
        <Controls position="bottom-right" />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(139,92,246,0.1)" />
      </ReactFlow>
    </div>
  );
}
