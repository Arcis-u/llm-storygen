"use client";
import Link from "next/link";
import { useRef } from "react";
import { ArrowUpRight, LogOut, Menu, Compass, Layers, Library, Activity } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
export default function NexusHeader({ library = false }: { library?: boolean }) {
  const { token, user, logout } = useAuthStore();
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  return <header className="nexus-header"><div className="evo-container nexus-header-inner">
    <Link href="/" className="nexus-brand" aria-label="Nexus Tale — Trang chủ"><span className="nexus-brand-mark">N<span>↗</span></span><span>NEXUS <b>TALE</b><small>INTERACTIVE STORY UNIVERSE</small></span></Link>
    <nav aria-label="Điều hướng chính">{library ? <span className="header-current">Thư viện của bạn</span> : <><a href="#worlds">Thế giới</a><a href="#experience">Trải nghiệm</a></>}<Link href="/status">Trạng thái hệ thống</Link></nav>
    <div className="nexus-account">{token ? <><span className="account-name">{user?.username}</span>{user?.role === "admin" && <Link className="header-admin" href="/admin">Quản trị</Link>}<Link className="header-cta" href={library ? "/create" : "/dashboard"}>{library ? "Hành trình mới" : "Thư viện"}<ArrowUpRight size={16}/></Link><button onClick={logout} aria-label="Đăng xuất" className="header-logout"><LogOut size={17}/></button></> : <Link className="header-cta" href="/login">Đăng nhập <ArrowUpRight size={16}/></Link>}
      <details className="nexus-mobile-menu" ref={mobileMenu} onKeyDown={event => { if (event.key === "Escape" && mobileMenu.current) { mobileMenu.current.open = false; mobileMenu.current.querySelector('summary')?.focus(); } }}>
        <summary aria-label="Menu điều hướng"><Menu size={19}/></summary>
        <div onClick={() => { if (mobileMenu.current) mobileMenu.current.open = false; }}><Link href="/#worlds"><Compass size={17}/>Khám phá thế giới<ArrowUpRight size={14}/></Link><Link href="/#experience"><Layers size={17}/>Trải nghiệm Nexus<ArrowUpRight size={14}/></Link><Link href="/dashboard"><Library size={17}/>Thư viện của bạn<ArrowUpRight size={14}/></Link><Link href="/status"><Activity size={17}/>Trạng thái hệ thống<ArrowUpRight size={14}/></Link></div>
      </details>
    </div>
  </div></header>;
}
