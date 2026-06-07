"use client";

import { motion } from "framer-motion";
import Logo from "@/components/Logo";
import { ArrowRight, BookOpen, Users, Trophy } from "lucide-react";
import Link from "next/link";
import HallOfFame from "@/components/HallOfFame";

export default function Home() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent/10 rounded-full blur-[150px]" />

      <main className="z-10 max-w-6xl text-center space-y-12">
        <Logo size="lg" />
        
        {/* ... (Hero section content) ... */}
        <div className="max-w-4xl mx-auto space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
              Learn Programming <br />
              <span className="text-gradient">The Smart Way</span>
            </h2>
            <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto font-medium">
              Join the most advanced programming academy. Build real-world projects, 
              master modern stacks, and accelerate your career with Snakket.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link 
              href="/login"
              className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-white font-bold py-5 px-10 rounded-2xl shadow-xl shadow-primary/20 transform transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 text-lg group"
            >
              Get Started Free
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-5 px-10 rounded-2xl transition-all text-lg">
              Explore Courses
            </button>
          </motion.div>

          {/* Stats/Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16"
          >
            {[
              { icon: <BookOpen className="w-6 h-6 text-primary" />, title: "Expert Courses", desc: "Curated by industry leaders" },
              { icon: <Users className="w-6 h-6 text-primary" />, title: "Elite Community", desc: "Network with the best devs" },
              { icon: <Trophy className="w-6 h-6 text-primary" />, title: "Job Ready", desc: "Projects that get you hired" },
            ].map((item, i) => (
              <div key={i} className="glass-card p-6 rounded-2xl text-left hover:border-primary/30 transition-colors group">
                <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{item.title}</h3>
                <p className="text-white/40 text-sm">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Hall Of Fame Section */}
        <HallOfFame />
      </main>

      {/* Decorative dots/grid */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(var(--primary) 0.5px, transparent 0.5px)', backgroundSize: '40px 40px' }} 
      />
    </div>
  );
}
