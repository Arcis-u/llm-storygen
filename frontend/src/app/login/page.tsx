"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, Loader2, Key, Fingerprint, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { login, register } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [bgImage, setBgImage] = useState("/images/auth-cover.png");
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const images = ["/images/auth-cover.png", "/images/auth-cover1.png", "/images/auth-cover2.png"];
    setBgImage(images[Math.floor(Math.random() * images.length)]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("Mật khẩu không khớp. Vui lòng kiểm tra lại.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const data = await login({ username: formData.username, password: formData.password });
        setAuth(data.token, data.user);
        router.push("/dashboard");
      } else {
        const data = await register({ username: formData.username, password: formData.password });
        setAuth(data.token, data.user);
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Đăng nhập thất bại. Sai thông tin định danh.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#05050A] text-white overflow-hidden relative">
      
      {/* --- LEFT PANEL: CINEMATIC COVER --- */}
      <div className="hidden lg:flex w-[55%] relative flex-col justify-between p-16 overflow-hidden border-r border-white/5 z-10 bg-[#020203]">
        <Image 
          src={bgImage} 
          alt="Neural Core" 
          fill 
          style={{ objectFit: "cover", opacity: 0.6, filter: "contrast(1.2) brightness(0.9)" }}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020203] via-[#020203]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020203] via-transparent to-transparent" />
        
        {/* Top Header */}
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center">
              <Shield className="text-cyan-400" size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black tracking-widest text-sm">NEXUS CORE</span>
              <span className="text-cyan-400 font-mono tracking-widest text-[10px] font-bold">SECURE CONNECTION</span>
            </div>
          </div>
        </div>

        {/* Bottom Title */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.2 }}
          className="relative z-10 mb-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-px bg-cyan-500" />
            <span className="font-mono text-cyan-400 tracking-widest text-xs font-bold uppercase">System Override Level 9</span>
          </div>
          <h1 className="text-7xl font-black leading-[1.05] tracking-tighter drop-shadow-2xl mb-6">
            ENTER THE <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
              MAINFRAME
            </span>
          </h1>
          <p className="text-white/50 text-lg max-w-md font-medium leading-relaxed">
            Khởi tạo liên kết thần kinh. Mọi quyết định đều ảnh hưởng trực tiếp đến thực tại. Cần xác thực danh tính để tiếp tục.
          </p>
        </motion.div>
      </div>

      {/* --- RIGHT PANEL: SLEEK PREMIUM FORM --- */}
      <div className="w-full lg:w-[45%] relative flex flex-col items-center justify-center p-8 sm:p-16 z-20">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.03]"
            style={{ background: isLogin ? "#00f5d4" : "#9d4edd", top: "50%", right: "10%", transform: "translate(50%, -50%)" }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Form Container (No Box, Just Content) */}
        <div className="w-full max-w-[500px] relative z-10">
          
          <Link href="/">
            <motion.div 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 text-white/40 hover:text-white mb-16 text-sm font-bold uppercase tracking-widest transition-colors cursor-pointer group"
            >
              <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Quay lại trang chủ
            </motion.div>
          </Link>

          <div className="mb-12">
            <h2 className="text-5xl font-black tracking-tight mb-4 flex items-center gap-4">
              {isLogin ? "Đăng Nhập" : "Đăng Ký"}
              {isLogin ? <Fingerprint className="text-cyan-400 opacity-50" size={36} /> : <Key className="text-purple-400 opacity-50" size={36} />}
            </h2>
            <p className="text-white/40 text-base">
              {isLogin ? "Chào mừng trở lại Nexus Core. Nhập thông tin của bạn." : "Tạo danh tính số mới để truy cập vào hệ thống."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? "login" : "register"}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Username Input */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-white/50 uppercase tracking-widest">Mã định danh (Username)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <User size={20} className="text-white/30 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Tên đăng nhập"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full pl-14 pr-5 py-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 rounded-xl text-white text-lg placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-white/50 uppercase tracking-widest flex justify-between">
                    <span>Mật khẩu</span>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/30 hover:text-white flex items-center gap-1 transition-colors">
                      {showPassword ? "Ẩn" : "Hiện"}
                    </button>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Lock size={20} className="text-white/30 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-14 pr-5 py-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 rounded-xl text-white text-lg placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all font-mono tracking-[0.3em]"
                    />
                  </div>
                </div>

                {/* Confirm Password (Register only) */}
                <AnimatePresence>
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      <label className="block text-sm font-bold text-white/50 uppercase tracking-widest pt-1">Xác nhận mật khẩu</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                          <Lock size={20} className="text-white/30 group-focus-within:text-white transition-colors" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          required={!isLogin}
                          placeholder="••••••••••••"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="w-full pl-14 pr-5 py-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 rounded-xl text-white text-lg placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all font-mono tracking-[0.3em]"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="p-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3"
                >
                  <Shield size={20} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !formData.username || !formData.password || (!isLogin && !formData.confirmPassword)}
              className="w-full mt-8 py-5 rounded-xl font-bold text-lg text-black bg-white hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.15)] uppercase tracking-wider"
            >
              {loading && <Loader2 size={24} className="animate-spin" />}
              {loading ? "ĐANG XỬ LÝ..." : isLogin ? "TIẾP TỤC" : "ĐĂNG KÝ TÀI KHOẢN"}
            </button>
          </form>

          {/* Footer Toggle */}
          <div className="mt-12 text-center text-base text-white/40">
            {isLogin ? "Chưa có danh tính?" : "Đã có danh tính?"}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(""); setFormData({...formData, confirmPassword: ""}); }}
              className="ml-2 font-bold text-white hover:underline underline-offset-4 transition-all"
            >
              {isLogin ? "Tạo tài khoản mới" : "Đăng nhập ngay"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
