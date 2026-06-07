"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  Trophy, Timer, Crown, Target, 
  Star, Upload, Plus, X, BrainCircuit, 
  CheckCircle2, AlertCircle, Sparkles 
} from "lucide-react";

interface Tournament {
  id: string;
  title: string;
  description: string;
  prize: string;
  endDate: string;
  isActive: boolean;
}

export default function EventsPage() {
  const { user, isAdmin } = useAuth();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const tournaments: Tournament[] = [
    {
      id: "t1",
      title: "تحدي رسم الوجوه الواقعية",
      description: "ارسم وجهاً بشرياً يظهر أدق التفاصيل من مسام الجلد إلى انعكاس الضوء في العين.",
      prize: "عضوية ذهبية + 100 رصيد",
      endDate: "2026-06-15T23:59:59",
      isActive: true
    },
    {
      id: "t2",
      title: "بطولة تصميم الشخصيات الخيالية",
      description: "ابتكر شخصية تجمع بين التكنولوجيا والطبيعة (Cyber-Organic).",
      prize: "لقب مصمم الأسبوع + هدية مفاجئة",
      endDate: "2026-05-30T00:00:00",
      isActive: false
    }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const handleSubmit = async () => {
    if (!file || !user || !selectedTournament) return;
    setUploading(true);
    // Simulate upload/save to Firestore logic
    setTimeout(() => {
      setUploading(false);
      setIsSubmitModalOpen(false);
      alert("تم إرسال مشاركتك بنجاح! بانتظار تحكيم الـ AI.");
    }, 2000);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-12 pb-20">
          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-primary/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 glow-pink"
            >
              <Trophy className="w-10 h-10 text-primary" />
            </motion.div>
            <h1 className="text-5xl font-black italic tracking-tighter">ساحة البطولات</h1>
            <p className="text-foreground/50 font-medium max-w-xl mx-auto">
              شارك في أقوى التحديات الأسبوعية، أثبت موهبتك، واحصل على جوائز حصرية من أكاديمية Snakket.
            </p>
          </div>

          {/* Active Challenges */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-8 w-2 bg-primary rounded-full" />
              <h2 className="text-3xl font-black">تحديات نشطة</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {tournaments.filter(t => t.isActive).map((tournament) => (
                <motion.div 
                  key={tournament.id}
                  whileHover={{ y: -5 }}
                  className="glass-card p-1 rounded-[40px] relative overflow-hidden group shadow-2xl"
                >
                  <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="bg-yellow/20 text-yellow text-xs font-black py-2 px-4 rounded-full border border-yellow/20 animate-pulse">
                         نشـط الآن
                      </div>
                      <div className="flex items-center gap-2 text-primary font-black">
                        <Timer className="w-5 h-5" />
                        <span className="text-sm">ينتهي قريباً</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-2xl font-black">{tournament.title}</h3>
                      <p className="text-foreground/60 leading-relaxed font-medium line-clamp-2">
                        {tournament.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                        <Crown className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white/30 uppercase">جائزة المركز الأول</p>
                        <p className="font-bold text-white">{tournament.prize}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setSelectedTournament(tournament);
                        setIsSubmitModalOpen(true);
                      }}
                      className="w-full bg-primary hover:bg-primary-hover text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden group/btn"
                    >
                      <Plus className="w-6 h-6 group-hover/btn:rotate-90 transition-transform" />
                      شارك في التحدي الآن
                    </button>

                    {isAdmin && (
                      <div className="pt-4 mt-4 border-t border-white/5">
                        <button className="w-full flex items-center justify-center gap-2 text-xs font-black text-primary hover:text-accent transition-colors">
                          <BrainCircuit className="w-4 h-4" /> إرسال مشاركات الطلاب للـ AI
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Past Tournaments */}
          <section className="space-y-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-4">
              <div className="h-8 w-2 bg-foreground/20 rounded-full" />
              <h2 className="text-3xl font-black">بطولات منتهية</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tournaments.filter(t => !t.isActive).map((tournament) => (
                <div key={tournament.id} className="glass-card p-6 rounded-[32px] border-white/5">
                  <div className="flex justify-between items-center mb-4">
                    <Star className="w-5 h-5 text-yellow opacity-50" />
                    <span className="text-[10px] font-black text-foreground/40">انتهت الصلاحية</span>
                  </div>
                  <h3 className="font-black mb-2">{tournament.title}</h3>
                  <div className="flex items-center gap-2 text-green-500 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" /> بطل التحدي: محمد خالد
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Submission Modal */}
        <AnimatePresence>
          {isSubmitModalOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setIsSubmitModalOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 50 }}
                className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-[110] glass-card p-8 rounded-[40px] shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black flex items-center gap-3">
                    <Sparkles className="text-primary w-6 h-6" /> مشاركة جديدة
                  </h3>
                  <button onClick={() => setIsSubmitModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div 
                    onClick={() => document.getElementById('tourney-upload')?.click()}
                    className={`h-60 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${preview ? "border-primary/40 bg-primary/5" : "hover:border-primary/20"}`}
                  >
                    {preview ? (
                      <img src={preview} className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mb-2 text-foreground/30" />
                        <p className="font-bold text-foreground/50">ارفع رسمتك هنا</p>
                      </>
                    )}
                    <input id="tourney-upload" type="file" hidden onChange={handleFileChange} accept="image/*" />
                  </div>

                  <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-primary shrink-0-mt-0.5" />
                    <p className="text-xs text-primary/80 font-medium">سيقوم خبير الـ AI بتحكيم رسمتك بدقة عالية فور انتهاء البطولة.</p>
                  </div>

                  <button 
                    disabled={!file || uploading}
                    onClick={handleSubmit}
                    className="w-full bg-primary hover:bg-primary-hover text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {uploading ? "جاري الإرسال..." : "تأكيد الاشتراك في التحدي"}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
