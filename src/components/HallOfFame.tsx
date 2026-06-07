"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Trophy, Calendar, User } from "lucide-react";

interface HallOfFameEntry {
  id: string;
  winnerName: string;
  drawingUrl: string;
  year: number;
  tournamentId: string;
}

export default function HallOfFame() {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "hall_of_fame"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HallOfFameEntry[];
      setEntries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null;
  if (entries.length === 0) return null;

  return (
    <div className="w-full max-w-6xl mx-auto py-20 px-6">
      <div className="flex flex-col items-center text-center mb-16 space-y-4">
        <div className="bg-yellow/10 w-20 h-20 rounded-[32px] flex items-center justify-center border border-yellow/20 shadow-2xl shadow-yellow/10">
          <Trophy className="w-10 h-10 text-yellow" />
        </div>
        <h2 className="text-5xl font-black italic tracking-tighter text-white">قاعة المشاهير</h2>
        <p className="text-white/40 font-bold uppercase tracking-[10px] text-xs">Hall Of Fame · Legendary Winners</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="group relative"
          >
            {/* Glossy Card */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow/20 to-transparent rounded-[48px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative glass-card p-4 rounded-[48px] border-white/5 group-hover:border-yellow/30 transition-all duration-500 overflow-hidden h-full">
              {/* Image Container */}
              <div className="relative aspect-square rounded-[36px] overflow-hidden mb-6 border border-white/10 shadow-2xl bg-black/40">
                <img 
                  src={entry.drawingUrl} 
                  alt={entry.winnerName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                {/* Year Badge */}
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-black text-white">{entry.year}</span>
                </div>
              </div>

              {/* Info */}
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 p-2 rounded-xl">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-2xl font-black text-white group-hover:text-yellow transition-colors truncate">
                    {entry.winnerName}
                  </h3>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                    Tournament ID
                  </span>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    {entry.tournamentId}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
