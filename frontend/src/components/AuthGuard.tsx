"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Loader2, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);

  const publicRoutes = ["/", "/login", "/status"];

  useEffect(() => {
    setMounted(true);
    
    // Simulate a tiny delay for the "cyberpunk" feel during auth check
    const timer = setTimeout(() => {
      if (!publicRoutes.includes(pathname) && !isAuthenticated()) {
        router.push("/login");
      } else if (pathname === "/login" && isAuthenticated()) {
        router.push("/dashboard");
      }
      setChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, pathname, router]);

  if (!mounted || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050A] fixed inset-0 z-[9999]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <Loader2 size={64} className="animate-spin text-cyan-500 relative z-10" />
            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
          </div>
          <div className="text-cyan-400 font-mono tracking-[0.3em] text-sm font-bold flex flex-col items-center gap-2">
            <span>VERIFYING CLEARANCE</span>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!publicRoutes.includes(pathname) && !isAuthenticated()) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
