"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection, doc, onSnapshot, writeBatch,
  runTransaction, setDoc, serverTimestamp, getDocs, addDoc, getDoc,
} from "firebase/firestore";
import {
  Trophy, Calendar, Upload, Crown, ShieldAlert,
  Plus, X, Loader2, Eye, Trash2, ChevronRight, Lock,
} from "lucide-react";
import HallOfFame from "@/components/HallOfFame";

/* ══════════════════════════════════════════════════════════════
   STATIC CONFIG — never written to Firestore
══════════════════════════════════════════════════════════════ */
const ROUND_DEFS = [
  { id: "r16",    label: "دور الـ ١٦",    count: 16, index: 0 },
  { id: "qf",     label: "ربع النهائي",   count: 8,  index: 1 },
  { id: "sf",     label: "نصف النهائي",   count: 4,  index: 2 },
  { id: "fn",     label: "النهائي",       count: 2,  index: 3 },
  { id: "winner", label: "🏆 البطل",      count: 1,  index: 4 },
] as const;

/** Total match documents: 16+8+4+2+1 = 31 */
const TOTAL_MATCHES = ROUND_DEFS.reduce((sum, r) => sum + r.count, 0); // 31

/* ══════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════ */

/** Shape stored in Firestore: tournament/current/matches/{matchId} */
interface MatchDoc {
  matchId:    string;   // "{roundId}_{slotIndex}"
  roundId:    string;
  slotIndex:  number;
  name:       string;   // participant display name
  userId:     string;   // Firebase UID (empty = slot available)
  image:      string;   // compressed base64 thumbnail (~10-25 KB each)
  winner:     boolean;  // promoted to next round?
}

/** Local display types (built from MatchDoc map) */
interface Slot extends MatchDoc {}
interface Round { id: string; label: string; slots: Slot[] }

/* ══════════════════════════════════════════════════════════════
   HELPER — initialise/reset the tournament subcollection
   Uses a single batch (≤500 ops, we have 31+2 = safe)
══════════════════════════════════════════════════════════════ */
async function bootstrapTournament() {
  const batch = writeBatch(db);

  // Overwrite main doc with lightweight metadata — kills old bloated doc
  batch.set(doc(db, "tournament", "current"), {
    version:   2,
    createdAt: serverTimestamp(),
  });

  // Delete any existing participant index docs
  const participantsSnap = await getDocs(
    collection(db, "tournament", "current", "participants")
  );
  participantsSnap.docs.forEach(d => batch.delete(d.ref));

  // Create/reset all 31 match documents
  ROUND_DEFS.forEach(def => {
    for (let i = 0; i < def.count; i++) {
      const matchId = `${def.id}_${i}`;
      batch.set(
        doc(db, "tournament", "current", "matches", matchId),
        { matchId, roundId: def.id, slotIndex: i, name: "", userId: "", image: "", winner: false }
      );
    }
  });

  await batch.commit();
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
export default function TournamentPage() {
  const { user, isAdmin } = useAuth();

  // Flat map of matchId → MatchDoc (live from Firestore subcollection)
  const [matches, setMatches]       = useState<Record<string, MatchDoc>>({});
  const [loading, setLoading]       = useState(true);
  const initializingRef             = useRef(false);

  // Registration modal (Round-of-16 only)
  const [regSlot, setRegSlot]       = useState<{ roundId: string; slotIndex: number } | null>(null);
  const [regPreview, setRegPreview] = useState<string | null>(null);
  const [regBase64, setRegBase64]   = useState<string | null>(null);
  const [regUploading, setRegUploading] = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // Admin modal
  const [adminSlot, setAdminSlot]   = useState<{ roundId: string; slotIndex: number } | null>(null);
  const [adminWorking, setAdminWorking] = useState(false);

  /* ── Real-time listener on the matches subcollection ── */
  useEffect(() => {
    const matchesCol = collection(db, "tournament", "current", "matches");

    const unsub = onSnapshot(matchesCol, (snap) => {
      // Rebuild local map
      const map: Record<string, MatchDoc> = {};
      snap.docs.forEach(d => { map[d.id] = d.data() as MatchDoc; });
      setMatches(map);
      setLoading(false);

      // Auto-bootstrap if subcollection is empty or incomplete
      if (snap.docs.length < TOTAL_MATCHES && !initializingRef.current) {
        initializingRef.current = true;
        bootstrapTournament()
          .catch(console.error)
          .finally(() => { initializingRef.current = false; });
      }
    }, (err) => {
      console.error("[Snapshot]", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* ── Derive Round[] display structure from flat match map ── */
  const rounds = useMemo<Round[]>(() => {
    return ROUND_DEFS.map(def => ({
      id:    def.id,
      label: def.label,
      slots: Array.from({ length: def.count }, (_, i) => {
        const matchId = `${def.id}_${i}`;
        return matches[matchId] ?? {
          matchId, roundId: def.id, slotIndex: i,
          name: "", userId: "", image: "", winner: false,
        };
      }),
    }));
  }, [matches]);

  /* ── Helpers ── */
  const isRound16 = (roundId: string) => roundId === "r16";

  const userAlreadyEntered = (): boolean => {
    if (!user) return false;
    return Object.values(matches).some(m => m.roundId === "r16" && m.userId === user.uid);
  };

  const getRoundIndex = (roundId: string) =>
    ROUND_DEFS.findIndex(r => r.id === roundId);

  /* ── Image compression (canvas) — keeps each match doc under 50 KB ── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const img = new Image();
    const objectUrl = URL.createObjectURL(f);
    img.onload = () => {
      try {
        const MAX = 280;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // ~8-20 KB per image at this size/quality
        const compressed = canvas.toDataURL("image/jpeg", 0.60);
        setRegBase64(compressed);
        setRegPreview(compressed);
      } catch (err) {
        console.error("[Compress]", err);
        alert("فشل في معالجة الصورة. حاول مرة أخرى.");
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      alert("تعذّر تحميل الملف. تأكد أنه صورة صالحة.");
    };
    img.src = objectUrl;
  };

  /* ── USER: Register in a Round-of-16 slot ── */
  const handleRegister = async () => {
    if (!user || !regSlot || !regBase64) return;
    if (!isRound16(regSlot.roundId)) return; // extra safety

    // UI-level single-entry check (instant)
    if (userAlreadyEntered()) {
      alert("تم تسجيل مشاركتك مسبقاً، لا يمكنك رفع أكثر من صورة واحدة");
      closeRegModal();
      return;
    }

    setRegUploading(true);
    try {
      const { roundId, slotIndex } = regSlot;
      const matchId       = `${roundId}_${slotIndex}`;
      const matchRef      = doc(db, "tournament", "current", "matches", matchId);
      const participantRef= doc(db, "tournament", "current", "participants", user.uid);

      await runTransaction(db, async (tx) => {
        // 1. Check participant index (single read → prevents double-entry)
        const pSnap = await tx.get(participantRef);
        if (pSnap.exists()) throw new Error("ALREADY_ENTERED");

        // 2. Check slot freshness (prevents race condition)
        const mSnap = await tx.get(matchRef);
        const mData = mSnap.data() as MatchDoc | undefined;
        if (mData?.userId) throw new Error("SLOT_TAKEN");

        // 3. Write match document (image stored here, NOT in main doc)
        tx.update(matchRef, {
          name:   user.displayName || "مبدع الأكاديمية",
          userId: user.uid,
          image:  regBase64,
          winner: false,
        });

        // 4. Write participant index (fast lookup for double-entry guard)
        tx.set(participantRef, {
          userId:       user.uid,
          matchId,
          roundId,
          slotIndex,
          registeredAt: serverTimestamp(),
        });
      });

      closeRegModal();
    } catch (err: any) {
      console.error("[Register]", err);
      if (err.message === "ALREADY_ENTERED") {
        alert("تم تسجيل مشاركتك مسبقاً، لا يمكنك رفع أكثر من صورة واحدة");
      } else if (err.message === "SLOT_TAKEN") {
        alert("هذا المكان محجوز بالفعل. اختر مكاناً آخر.");
      } else {
        alert("خطأ في الاتصال بقاعدة البيانات");
      }
    } finally {
      setRegUploading(false);
    }
  };

  const closeRegModal = () => {
    setRegSlot(null); setRegPreview(null); setRegBase64(null);
  };

  /* ── ADMIN: Archive winner to Hall of Fame ── */
  const archiveToHallOfFame = async (winnerName: string, drawingUrl: string, tournamentId: string) => {
    try {
      await addDoc(collection(db, "hall_of_fame"), {
        winnerName,
        drawingUrl,
        year: new Date().getFullYear(),
        tournamentId,
        timestamp: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.error("[Archive]", err);
      return false;
    }
  };

  /* ── ADMIN: Promote winner — touches only 2 documents, no single-doc rewrite ── */
  const advanceWinner = async () => {
    if (!isAdmin || !adminSlot) return;

    const { roundId, slotIndex } = adminSlot;
    const roundIdx = getRoundIndex(roundId);
    if (roundIdx === -1) return;

    // IS THIS THE FINAL ROUND? (Promoting to 'winner' slot)
    const nextRound = ROUND_DEFS[roundIdx + 1];
    const isPromotingToFinal = nextRound?.id === "winner";

    setAdminWorking(true);
    try {
      const currMatchRef = doc(db, "tournament", "current", "matches", `${roundId}_${slotIndex}`);
      
      let nextMatchRef = null;
      if (nextRound) {
        nextMatchRef = doc(db, "tournament", "current", "matches", `${nextRound.id}_${Math.floor(slotIndex / 2)}`);
      }

      await runTransaction(db, async (tx) => {
        const currSnap = await tx.get(currMatchRef);
        if (!currSnap.exists()) throw new Error("Match not found");
        const curr = currSnap.data() as MatchDoc;
        if (!curr.userId) throw new Error("NO_PARTICIPANT");

        // Mark current slot as winner
        tx.update(currMatchRef, { winner: true });

        // If there's a next round, promote
        if (nextMatchRef) {
          const nextSnap = await tx.get(nextMatchRef);
          const nextBase : Partial<MatchDoc> = {
            name:   curr.name,
            userId: curr.userId,
            image:  curr.image,
            winner: false,
          };
          if (nextSnap.exists()) {
            tx.update(nextMatchRef, nextBase);
          } else {
            tx.set(nextMatchRef, {
              matchId:   `${nextRound.id}_${Math.floor(slotIndex / 2)}`,
              roundId:   nextRound.id,
              slotIndex: Math.floor(slotIndex / 2),
              ...nextBase,
            });
          }
        }
      });

      // AUTO-ARCHIVE if this was the final win
      if (isPromotingToFinal) {
        const snap = await getDoc(currMatchRef);
        const data = snap.data() as MatchDoc;
        await archiveToHallOfFame(data.name, data.image, "drawing-world-cup-2026");
      }

      setAdminSlot(null);
    } catch (err: any) {
      console.error("[Advance]", err);
      alert(
        err.message === "NO_PARTICIPANT"
          ? "لا يوجد مشارك في هذا المقعد."
          : "خطأ في الاتصال بقاعدة البيانات"
      );
    } finally {
      setAdminWorking(false);
    }
  };

  /* ── ADMIN: Disqualify / clear a slot ── */
  const disqualify = async () => {
    if (!isAdmin || !adminSlot) return;
    const { roundId, slotIndex } = adminSlot;
    const matchRef      = doc(db, "tournament", "current", "matches", `${roundId}_${slotIndex}`);

    setAdminWorking(true);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(matchRef);
        if (!snap.exists()) throw new Error("Match not found");
        const data = snap.data() as MatchDoc;

        // Clear match doc
        tx.update(matchRef, { name: "", userId: "", image: "", winner: false });

        // Delete participant index if exists
        if (data.userId) {
          const pRef = doc(db, "tournament", "current", "participants", data.userId);
          const pSnap = await tx.get(pRef);
          if (pSnap.exists()) tx.delete(pRef);
        }
      });
      setAdminSlot(null);
    } catch (err) {
      console.error("[Disqualify]", err);
      alert("خطأ في الاتصال بقاعدة البيانات");
    } finally {
      setAdminWorking(false);
    }
  };

  /* ── ADMIN: Full reset — delete all match + participant docs, re-bootstrap ── */
  const resetTournament = async () => {
    if (!isAdmin || !confirm("هل أنت متأكد من إعادة تعيين البطولة بالكامل؟")) return;
    try {
      await bootstrapTournament();
    } catch (err) {
      console.error("[Reset]", err);
      alert("خطأ في إعادة تعيين البطولة");
    }
  };

  /* ── Slot click dispatcher ── */
  const handleSlotClick = (roundId: string, slotIndex: number) => {
    const matchId = `${roundId}_${slotIndex}`;
    const slot    = matches[matchId];
    const occupied = !!slot?.userId;

    if (isAdmin) {
      if (occupied) setAdminSlot({ roundId, slotIndex });
      else if (isRound16(roundId)) setRegSlot({ roundId, slotIndex });
      return;
    }

    // Regular user — R16 empty slot only
    if (isRound16(roundId) && !occupied) {
      if (userAlreadyEntered()) {
        alert("تم تسجيل مشاركتك مسبقاً، لا يمكنك رفع أكثر من صورة واحدة");
        return;
      }
      setRegSlot({ roundId, slotIndex });
    }
  };

  /* ── Slot CSS ── */
  const slotClass = (slot: Slot, roundId: string) => {
    const base = "relative group rounded-[28px] border-2 transition-all p-4 flex items-center gap-4 shadow-xl overflow-hidden";
    if (slot.winner)              return `${base} bg-yellow/10 border-yellow shadow-yellow/10 cursor-pointer`;
    if (slot.userId)              return `${base} bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer`;
    if (isRound16(roundId))       return `${base} bg-white/5 border-dashed border-white/10 hover:border-primary/50 cursor-pointer`;
    return `${base} bg-white/[0.02] border-dashed border-white/5 cursor-default opacity-50`;
  };

  /* ── Derived values for admin modal ── */
  const adminMatchData = adminSlot
    ? matches[`${adminSlot.roundId}_${adminSlot.slotIndex}`]
    : null;
  const adminRoundLabel = adminSlot
    ? ROUND_DEFS.find(r => r.id === adminSlot.roundId)?.label ?? ""
    : "";
  const adminRoundIdx = adminSlot ? getRoundIndex(adminSlot.roundId) : -1;

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-white/30 font-bold uppercase tracking-widest text-xs">جاري تحميل البطولة...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-[1500px] mx-auto pb-20">

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-16 gap-8 bg-[#0a0a0a] p-10 rounded-[40px] border border-white/5 shadow-2xl">
            <div>
              <h1 className="text-6xl font-black italic tracking-tighter mb-2 text-white">Drawing World Cup</h1>
              <p className="text-primary font-black uppercase tracking-[6px] text-xs">Live Bracket · Real-time · v2 Architecture</p>
            </div>
            <div className="flex flex-wrap gap-4 justify-end w-full lg:w-auto">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-5 flex items-center gap-4">
                <Calendar className="w-6 h-6 text-primary" />
                <div className="text-right">
                  <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-1">Time Remaining</p>
                  <p className="font-black text-lg uppercase">7 Days</p>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={resetTournament}
                  className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-5 rounded-3xl hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 font-black text-xs uppercase"
                >
                  <ShieldAlert className="w-5 h-5" /> إعادة تعيين
                </button>
              )}
            </div>
          </div>

          {/* ── Legend ─────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-6 mb-10 px-2">
            <span className="flex items-center gap-2 text-xs text-white/40 font-bold">
              <div className="w-3 h-3 rounded-full bg-primary/60" /> دور الـ ١٦: مفتوح للتسجيل
            </span>
            <span className="flex items-center gap-2 text-xs text-white/40 font-bold">
              <Lock className="w-3 h-3" /> باقي الأدوار: يتحكم بها المشرف
            </span>
            {isAdmin && (
              <span className="flex items-center gap-2 text-xs text-yellow font-bold">
                <Crown className="w-3 h-3" /> وضع المشرف: انقر أي مشارك لإدارته
              </span>
            )}
          </div>

          {/* ── Bracket ────────────────────────────────────────── */}
          <div className="relative overflow-x-auto pb-24 custom-scrollbar">
            <div className="flex items-start min-w-[1350px] gap-0 px-4">
              {rounds.map((round, ri) => (
                <div key={round.id} className="flex items-center flex-1">

                  {/* Round column */}
                  <div className="flex flex-col w-full">
                    <div className="text-center mb-6">
                      <span className="text-[10px] font-black text-primary/60 uppercase tracking-[6px] block mb-1">
                        {round.label}
                      </span>
                      <div className="h-[2px] w-10 bg-white/10 mx-auto rounded-full" />
                    </div>

                    <div
                      className="flex flex-col justify-around flex-grow"
                      style={{ gap: `${Math.pow(2, ri) * 14}px` }}
                    >
                      {round.slots.map((slot) => (
                        <motion.div
                          key={slot.matchId}
                          whileHover={{ scale: 1.03 }}
                          className={slotClass(slot, round.id)}
                          onClick={() => handleSlotClick(round.id, slot.slotIndex)}
                        >
                          {/* Artwork / placeholder */}
                          {slot.image ? (
                            <div className="relative w-12 h-12 rounded-xl border border-white/10 overflow-hidden shrink-0 shadow-xl">
                              <img src={slot.image} className="w-full h-full object-cover" alt="entry" />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                              isRound16(round.id)
                                ? "bg-white/5 border-white/10 text-white/20"
                                : "bg-white/[0.02] border-white/5 text-white/5"
                            }`}>
                              {isRound16(round.id) ? <Plus className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                            </div>
                          )}

                          {/* Name / status text */}
                          <div className="flex flex-col text-right min-w-0 flex-1">
                            <span className="font-black text-sm truncate text-white/90">
                              {slot.name || (isRound16(round.id) ? "Available" : "—")}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider ${
                              slot.winner                  ? "text-yellow"    :
                              slot.userId === user?.uid   ? "text-green-400" :
                              slot.userId                 ? "text-primary/60":
                              isRound16(round.id) && !userAlreadyEntered() ? "text-white/20" : "text-white/10"
                            }`}>
                              {slot.winner                          ? "Winner ✓"  :
                               slot.userId === user?.uid           ? "مشارك ✓"   :
                               slot.userId                         ? "Confirmed" :
                               isRound16(round.id) && !userAlreadyEntered() ? "Join Now" : "Locked"}
                            </span>
                          </div>

                          {/* Admin crown badge */}
                          {isAdmin && slot.userId && (
                            <div className="absolute top-2 left-2 w-5 h-5 bg-yellow/20 rounded-full flex items-center justify-center">
                              <Crown className="w-3 h-3 text-yellow" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Connector arrow */}
                  {ri < rounds.length - 1 && (
                    <div className="flex items-center shrink-0 px-1 self-center">
                      <ChevronRight className="w-5 h-5 text-white/10" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            USER REGISTRATION MODAL (Round-of-16 only)
        ══════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {regSlot && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => !regUploading && closeRegModal()}
                className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[100]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 50 }}
                className="fixed inset-x-4 top-[8%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-[110] glass-card p-10 rounded-[48px] text-center border-white/10 shadow-[0_0_80px_rgba(255,20,147,0.15)]"
              >
                <h3 className="text-4xl font-black mb-2 italic text-white tracking-tighter uppercase">تسجيل مشاركة</h3>
                <p className="text-white/30 text-xs font-bold mb-8 uppercase tracking-widest">دور الـ ١٦ · ارفع رسمتك للمنافسة (مشاركة واحدة فقط)</p>

                <div
                  onClick={() => !regUploading && fileInputRef.current?.click()}
                  className="w-full h-64 border-2 border-dashed border-primary/20 rounded-[32px] mb-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 transition-all bg-white/5 relative overflow-hidden group"
                >
                  {regPreview ? (
                    <img src={regPreview} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="preview" />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="w-10 h-10 text-primary animate-bounce" />
                      <p className="text-sm font-black uppercase tracking-widest text-white/50">اضغط لرفع الرسمة</p>
                      <p className="text-[10px] text-white/20 font-bold">PNG / JPG / WEBP · أي حجم</p>
                    </div>
                  )}
                  <input
                    type="file" hidden ref={fileInputRef}
                    onChange={handleFileChange} accept="image/*"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={closeRegModal} disabled={regUploading}
                    className="flex-1 bg-white/5 hover:bg-white/10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-40"
                  >إلغاء</button>
                  <button
                    onClick={handleRegister} disabled={!regBase64 || regUploading}
                    className="flex-1 bg-primary text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-40"
                  >
                    {regUploading
                      ? <span className="flex items-center justify-center gap-2">جاري الحفظ <Loader2 className="w-4 h-4 animate-spin" /></span>
                      : "تأكيد الانضمام"
                    }
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════
            ADMIN CONTROL MODAL
        ══════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {adminSlot && adminMatchData && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => !adminWorking && setAdminSlot(null)}
                className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[100]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 50 }}
                className="fixed inset-x-4 top-[6%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl z-[110] glass-card p-10 rounded-[48px] border-yellow/20 shadow-[0_0_80px_rgba(250,204,21,0.1)]"
              >
                {/* Admin badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 bg-yellow/10 border border-yellow/20 px-4 py-2 rounded-full">
                    <Crown className="w-4 h-4 text-yellow" />
                    <span className="text-yellow font-black text-[10px] uppercase tracking-widest">لوحة تحكم المشرف</span>
                  </div>
                  <button onClick={() => setAdminSlot(null)} className="p-2 hover:bg-white/10 rounded-full">
                    <X className="w-5 h-5 text-white/50" />
                  </button>
                </div>

                {/* Artwork */}
                <div className="rounded-[32px] overflow-hidden border border-white/10 mb-6 aspect-video bg-black/40">
                  {adminMatchData.image ? (
                    <img src={adminMatchData.image} className="w-full h-full object-contain" alt="entry" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10">
                      <Trophy className="w-12 h-12" />
                    </div>
                  )}
                </div>

                <h3 className="text-3xl font-black mb-1 text-white uppercase tracking-tighter text-center">
                  {adminMatchData.name}
                </h3>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest text-center mb-8">
                  {adminRoundLabel} · المقعد {(adminSlot.slotIndex + 1)}
                </p>

                <div className="flex flex-col gap-3">
                  {/* Advance — only if not at final round and not already promoted */}
                  {adminRoundIdx < ROUND_DEFS.length - 1 && !adminMatchData.winner && (
                    <button
                      onClick={advanceWinner} disabled={adminWorking}
                      className="w-full bg-yellow hover:bg-amber-400 text-black py-5 rounded-2xl font-black uppercase text-sm tracking-[2px] shadow-2xl shadow-yellow/30 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {adminWorking
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : <><Crown className="w-5 h-5" /> تقديم الفائز للدور التالي</>
                      }
                    </button>
                  )}

                  {adminMatchData.winner && (
                    <div className="w-full bg-yellow/10 border border-yellow/30 text-yellow py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                      <Crown className="w-4 h-4" /> تم تقديمه للدور التالي
                    </div>
                  )}

                  <button
                    onClick={disqualify} disabled={adminWorking}
                    className="w-full bg-red-500/10 border border-red-500/20 text-red-400 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" /> إلغاء المشاركة وتفريغ المقعد
                  </button>

                  {/* Manual Archive Button */}
                  {adminMatchData.userId && (
                    <button
                      onClick={async () => {
                        const ok = await archiveToHallOfFame(adminMatchData.name, adminMatchData.image, "drawing-world-cup-2026");
                        if (ok) alert("تمت الأرشفة بنجاح في قاعة المشاهير");
                      }}
                      disabled={adminWorking}
                      className="w-full bg-white/5 border border-white/10 text-white/50 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Trophy className="w-4 h-4" /> أرشفة بدوية لقاعة المشاهير
                    </button>
                  )}

                  <button
                    onClick={() => setAdminSlot(null)}
                    className="w-full bg-white/5 text-white/30 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-white/5 hover:bg-white/10 transition-colors"
                  >إغلاق</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Hall Of Fame Section — Displaying all-time winners */}
        <div className="mt-20 border-t border-white/5 pt-20">
          <HallOfFame />
        </div>

      </DashboardLayout>
    </ProtectedRoute>
  );
}
