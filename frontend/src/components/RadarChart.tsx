"use client";
import { motion } from "framer-motion";

export default function RadarChart({ data, maxVal = 100 }: { data: { name: string, value: number }[], maxVal?: number }) {
  const size = 200;
  const center = size / 2;
  const radius = size / 2 - 20; // 10px padding

  // Must have at least 3 points to draw a polygon
  const safeData = data.length >= 3 ? data : [...data, { name: "N/A", value: 0 }, { name: "N/A", value: 0 }, { name: "N/A", value: 0 }].slice(0, Math.max(3, data.length));
  
  const total = safeData.length;
  const angleStep = (Math.PI * 2) / total;

  // Generate outer polygon background (the web)
  const webLevels = [0.25, 0.5, 0.75, 1];
  
  const getPoint = (val: number, index: number) => {
    const r = (val / maxVal) * radius;
    const angle = index * angleStep - Math.PI / 2; // start from top
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const dataPoints = safeData.map((d, i) => getPoint(d.value, i));
  const dataPolygonStr = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", padding: "2.5rem 0" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Draw Web Background */}
        {webLevels.map((level, i) => {
          const levelPoints = safeData.map((_, idx) => getPoint(maxVal * level, idx));
          const levelStr = levelPoints.map(p => `${p.x},${p.y}`).join(" ");
          return (
            <polygon key={`web-${i}`} points={levelStr} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          );
        })}
        
        {/* Draw Web Spoke Lines */}
        {safeData.map((_, i) => {
          const p = getPoint(maxVal, i);
          return <line key={`spoke-${i}`} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
        })}

        {/* Draw Data Polygon */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 0.5 }}
          points={dataPolygonStr}
          fill="var(--accent-primary)"
          stroke="var(--accent-secondary)"
          strokeWidth="2"
          style={{ filter: "drop-shadow(0 0 10px var(--accent-primary))", transformOrigin: "center" }}
        />

        {/* Draw Data Points */}
        {dataPoints.map((p, i) => (
          <circle key={`pt-${i}`} cx={p.x} cy={p.y} r="4" fill="var(--accent-secondary)" />
        ))}
      </svg>
      {/* Labels positioned absolutely over the SVG wrapper */}
      {safeData.map((d, i) => {
        const p = getPoint(maxVal + 35, i); // push labels further out to avoid clipping
        return (
          <div key={`label-${i}`} style={{
            position: "absolute",
            left: p.x, top: p.y,
            transform: "translate(-50%, -50%)",
            fontSize: "0.65rem",
            fontWeight: 800,
            color: "var(--text-primary)",
            textTransform: "uppercase",
            textShadow: "0 2px 4px rgba(0,0,0,0.8)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            textAlign: "center"
          }}>
            {d.name || "TRAIT"}
          </div>
        );
      })}
      </div>
    </div>
  );
}
