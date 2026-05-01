"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import axios from "axios";

export default function AnalyticsHeartbeat() {
  const pathname = usePathname();

  useEffect(() => {
    // Generate a simple anonymous session ID if none exists
    let sessionId = localStorage.getItem("anon_session_id");
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("anon_session_id", sessionId);
    }

    const sendHeartbeat = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        await axios.post(`${baseUrl}/api/analytics/heartbeat`, {
          session_id: sessionId,
          user_agent: navigator.userAgent,
          path: pathname
        });
      } catch (err) {
        // Silently fail if backend is unreachable
      }
    };

    // Send immediately on load/route change
    sendHeartbeat();

    // Then send every 30 seconds
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  return null; // This component doesn't render anything
}
