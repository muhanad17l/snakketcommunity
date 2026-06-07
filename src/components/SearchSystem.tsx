"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { 
  collection, query, where, getDocs, 
  limit, orderBy, startAt, endAt 
} from "firebase/firestore";
import { Search, User, UserPlus, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface SearchResult {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
}

export default function SearchSystem() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { isAdmin } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.trim().length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        console.log("Searching for:", searchTerm);
        const usersRef = collection(db, "users");
        
        // Firestore is case-sensitive. We try both original and lowercase to increase hit rate.
        const qOriginal = query(
          usersRef,
          where("username", ">=", searchTerm),
          where("username", "<=", searchTerm + "\uf8ff"),
          limit(5)
        );

        const qLower = query(
          usersRef,
          where("username", ">=", searchTerm.toLowerCase()),
          where("username", "<=", searchTerm.toLowerCase() + "\uf8ff"),
          limit(5)
        );

        const [snapOriginal, snapLower] = await Promise.all([
          getDocs(qOriginal),
          getDocs(qLower)
        ]);

        const searchResults: SearchResult[] = [];
        const seenIds = new Set();

        [...snapOriginal.docs, ...snapLower.docs].forEach((doc) => {
          if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            searchResults.push({ uid: doc.id, ...doc.data() } as SearchResult);
          }
        });
        
        console.log("Search Results Found:", searchResults);
        setResults(searchResults);
        setIsOpen(true);
      } catch (err) {
        console.error("Critical Search Error:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSelect = (username: string) => {
    if (!username) return;
    router.push(`/profile/${username}`);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      {/* Search Input UI */}
      <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus-within:ring-2 focus-within:ring-primary/40 transition-all shadow-2xl backdrop-blur-xl">
        <Search className={`w-5 h-5 transition-colors ${loading ? "text-primary animate-pulse" : "text-white/20"}`} />
        <input 
          type="text" 
          placeholder="ابحث عن أصدقاء أو مبدعين..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none outline-none w-full text-sm placeholder:text-white/10 font-bold text-white tracking-wide"
        />
        {searchTerm && (
          <button onClick={() => {setSearchTerm(""); setResults([]);}} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="absolute top-full left-0 right-0 mt-3 p-3 glass-card rounded-[32px] z-[100] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {results.length > 0 ? (
              <div className="flex flex-col gap-2">
                {results.map((user) => (
                  <button 
                    key={user.uid}
                    onClick={() => handleSelect(user.username)}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all text-right group border border-transparent hover:border-white/5"
                  >
                    <div className="w-12 h-12 rounded-2xl border-2 border-white/5 overflow-hidden shrink-0 bg-gradient-to-br from-primary/20 to-accent/20 group-hover:border-primary/40 transition-all">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white/10" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-white group-hover:text-primary transition-colors">{user.displayName}</p>
                      <p className="text-[10px] text-primary/60 uppercase font-black tracking-[2px]">@{user.username}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <UserPlus className="w-4 h-4 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center opacity-20 grayscale">
                <Loader2 className="w-8 h-8 mb-4 animate-spin text-white" />
                <p className="text-xs font-black uppercase tracking-widest">Searching Snakket Database...</p>
              </div>
            )}
            
            <div className="mt-3 p-3 text-center border-t border-white/5 bg-white/5 rounded-2xl">
                <p className="text-[9px] font-black uppercase text-white/20 tracking-[2px]">Snakket Academy • Social Discovery</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
