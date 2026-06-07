"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  Camera, User, AtSign, FileText, 
  Save, CheckCircle2, Crown, ShieldCheck, 
  ArrowRight, Loader2 
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        setFullName(user.displayName || "");
        setPhotoURL(user.photoURL || "");
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.username || "");
          setBio(data.bio || "");
        }
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setSaving(true);
    try {
      const storageRef = ref(storage, `profile_pictures/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      // Update Auth Profile
      await updateProfile(user, { photoURL: url });
      
      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
      
      setPhotoURL(url);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      // Update Auth
      await updateProfile(user, { displayName: fullName });

      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), {
        fullName,
        username,
        bio,
        updatedAt: new Date().toISOString()
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto pb-20">
          <div className="flex items-center gap-4 mb-10">
            <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <ArrowRight className="w-6 h-6" />
            </Link>
            <h1 className="text-3xl font-black">إعدادات الحساب</h1>
          </div>

          <form onSubmit={handleSave} className="space-y-8">
            {/* Profile Picture Section */}
            <div className="glass-card p-10 rounded-[40px] flex flex-col items-center text-center space-y-6">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent p-1 glow-pink">
                  <div className="w-full h-full rounded-full bg-background overflow-hidden flex items-center justify-center border-4 border-background">
                    {photoURL ? (
                      <img src={photoURL} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-16 h-16 text-foreground/20" />
                    )}
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-all border-4 border-background"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input 
                  type="file" 
                  hidden 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                />
              </div>

              <div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h2 className="text-2xl font-black">{fullName || "بدون اسم"}</h2>
                  {isAdmin && (
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="bg-yellow/20 text-yellow text-[10px] font-black py-1 px-3 rounded-full border border-yellow/40 flex items-center gap-1 shadow-lg shadow-yellow/10"
                    >
                      <Crown className="w-3 h-3" /> FOUNDER
                    </motion.div>
                  )}
                </div>
                <p className="text-foreground/40 font-medium italic">@{username || "username"}</p>
              </div>
            </div>

            {/* Inputs Section */}
            <div className="glass-card p-8 rounded-[40px] space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-foreground/30 uppercase tracking-widest block pr-2">الاسم الكامل</label>
                <div className="relative group">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all font-bold"
                    placeholder="أدخل اسمك..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-foreground/30 uppercase tracking-widest block pr-2">اسم المستخدم (Username)</label>
                <div className="relative group">
                  <AtSign className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all font-bold"
                    placeholder="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-foreground/30 uppercase tracking-widest block pr-2">البايو (Bio)</label>
                <div className="relative group">
                  <FileText className="absolute right-4 top-6 w-5 h-5 text-foreground/20 group-focus-within:text-primary transition-colors" />
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all font-bold resize-none"
                    placeholder="تحدث عن شغفك الفني..."
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  disabled={saving}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : success ? (
                    <><CheckCircle2 className="w-5 h-5 text-green-300" /> تم الحفظ بنجاح</>
                  ) : (
                    <><Save className="w-5 h-5" /> حفظ التغييرات</>
                  )}
                </button>
              </div>
            </div>

            {/* Footer Admin badge extra check */}
            {isAdmin && (
              <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex items-center gap-4">
                <div className="bg-primary/20 p-3 rounded-2xl">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-black text-primary italic">لوحة المدير مفعلة</p>
                  <p className="text-xs text-foreground/60">لديك صلاحيات كاملة لإدارة الأكاديمية والذكاء الاصطناعي.</p>
                </div>
              </div>
            )}
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
