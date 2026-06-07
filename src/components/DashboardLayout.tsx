"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";
import { 
  Menu, X, MessageSquare, User, Trophy, Phone,
  Settings, ShieldAlert, Cpu, Sparkles, Home as HomeIcon, Crown, History as HistoryIcon,
  Search
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Link from "next/link";
import SearchSystem from "@/components/SearchSystem";
import NotificationDisplay from "@/components/NotificationDisplay";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPinkTheme, setIsPinkTheme] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Toggle Theme
  useEffect(() => {
    if (isPinkTheme) {
      document.documentElement.classList.add("theme-pink");
    } else {
      document.documentElement.classList.remove("theme-pink");
    }
  }, [isPinkTheme]);

  const menuItems = [
    { icon: <HomeIcon className="w-5 h-5" />, label: "الصفحة الرئيسية", href: "/dashboard" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "المراسلات", href: "/chats" },
    { icon: <User className="w-5 h-5" />, label: "الملف الشخصي", href: "/profile" },
    { icon: <Trophy className="w-5 h-5" />, label: "الفعاليات والبطولات", href: "/events" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 overflow-x-hidden">
      {/* Top Bar */}
      <header className="relative h-auto min-h-20 z-40 bg-[#0a0a0a] border-b border-white/10 flex flex-wrap items-center justify-between px-4 md:px-6 py-4 md:py-0 gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/dashboard" className="transition-transform active:scale-95">
            <Logo size="sm" showSlogan={true} />
          </Link>
        </div>

        <div className="flex-1 min-w-[280px] order-3 md:order-none w-full md:w-auto flex justify-center">
          <SearchSystem />
        </div>

        {/* Theme Switch, Notifications & Profile */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <NotificationDisplay />
          
          <button 
            onClick={() => setIsPinkTheme(!isPinkTheme)}
            className="hidden sm:block relative w-12 h-6 md:w-14 md:h-7 rounded-full bg-white/10 border border-white/10 transition-all overflow-hidden"
          >
            <motion.div 
              animate={{ x: isPinkTheme ? 28 : 2 }}
              className={`absolute top-0.5 w-5 h-5 rounded-full shadow-lg ${isPinkTheme ? "bg-primary" : "bg-white/40"}`}
            />
          </button>
          
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent border border-white/10 cursor-pointer overflow-hidden backdrop-blur-md shrink-0">
            {/* User Avatar */}
            {user?.photoURL && <img src={user.photoURL} alt="p" className="w-full h-full object-cover" />}
          </div>
        </div>
      </header>

      {/* Hamburger Side Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-80 z-[60] bg-background border-l border-white/10 p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-10">
                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                  <Logo size="sm" />
                </Link>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                {menuItems.map((item, i) => (
                  <Link 
                    key={i} 
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex justify-between items-center p-4 rounded-xl hover:bg-white/5 text-foreground/70 hover:text-primary transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="group-hover:scale-110 transition-transform">{item.icon}</div>
                      <span className="font-bold">{item.label}</span>
                    </div>
                    {item.label === "الملف الشخصي" && isAdmin && (
                      <div className="bg-yellow/20 text-yellow text-[10px] font-black px-2 py-0.5 rounded-full border border-yellow/40 flex items-center gap-1 animate-pulse">
                        <Crown className="w-3 h-3" /> FOUNDER
                      </div>
                    )}
                  </Link>
                ))}

                {/* Competitive Section */}
                <div className="pt-6 mt-6 border-t border-white/5">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[2px] mb-4 pr-4">Competition Hub</p>
                  <Link 
                    href="/admin/ai"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-4 p-4 rounded-xl bg-yellow/10 border border-yellow/20 text-yellow hover:bg-yellow/20 transition-all group"
                  >
                    <Trophy className="w-5 h-5 animate-bounce" />
                    <span className="font-bold">Drawing World Cup</span>
                  </Link>

                  <div className="mt-6 space-y-4">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[2px] pr-4">سجل الأبطال (History)</p>
                    <div className="space-y-3 max-h-48 overflow-y-auto px-2 custom-scrollbar min-h-[100px] flex flex-col items-center justify-center border border-white/5 rounded-2xl bg-white/5">
                        <HistoryIcon className="w-6 h-6 text-white/10 mb-2" />
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[2px]">في انتظار بطلنا الأول</p>
                    </div>
                  </div>
                </div>
              </nav>

              <div className="mt-auto space-y-4 pt-6 border-t border-white/5">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Support Line</p>
                    <p className="text-sm font-black">07508902645</p>
                  </div>
                </div>
                
                <a 
                  href="https://www.instagram.com/snakketacademy/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] text-white font-black text-xs shadow-2xl shadow-pink-500/30 active:scale-95 transition-all group"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" className="w-5 h-5 invert" alt="IG" />
                  <span>انستكرام الأكاديمية</span>
                </a>
                <button 
                  onClick={() => signOut(auth)}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all font-bold"
                >
                  <Settings className="w-4 h-4" /> تسجيل الخروج
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="px-4 md:px-8 max-w-7xl mx-auto pb-20 mt-10">
        {children}
      </main>
    </div>
  );
}
