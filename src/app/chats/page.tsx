"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { 
  collection, addDoc, query, orderBy, 
  onSnapshot, serverTimestamp, Timestamp, where, limit 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  Send, Search, MessageSquare, Users, 
  Smile, MoreVertical, Hash, Paperclip, X, Image as ImageIcon, Loader2, AlertCircle
} from "lucide-react";

interface Message {
  id: string;
  text?: string;
  image?: string;
  sticker?: string;
  senderId: string;
  senderName: string;
  createdAt: Timestamp;
}

const STICKERS = [
  "https://cdn-icons-png.flaticon.com/512/4359/4359911.png",
  "https://cdn-icons-png.flaticon.com/512/4359/4359642.png",
  "https://cdn-icons-png.flaticon.com/512/4359/4359850.png",
  "https://cdn-icons-png.flaticon.com/512/4359/4359674.png",
  "https://cdn-icons-png.flaticon.com/512/4359/4359820.png",
];

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChat, setActiveChat] = useState("global");
  const [showStickers, setShowStickers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [indexError, setIndexError] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    // Simplified query to bypass index requirement
    const q = query(collection(db, "messages"), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      
      // Sort in memory to avoid "Index Required" error
      const sorted = msgs.sort((a, b) => {
        const timeA = a.createdAt?.toDate()?.getTime() || 0;
        const timeB = b.createdAt?.toDate()?.getTime() || 0;
        return timeA - timeB;
      });
      
      setMessages(sorted);
    }, (error) => {
      console.error("Firestore Listener Error:", error);
      if (error.message.includes("requires an index")) {
        setIndexError(true);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSelectedSticker(null); // Clear sticker if image chosen
    }
  };

  const handleStickerClick = (url: string) => {
    setSelectedSticker(url);
    setSelectedImage(null); // Clear image if sticker chosen
    setPreviewUrl(null);
    setShowStickers(false);
  };

  const clearSelection = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setSelectedSticker(null);
  };

  const handleSendMessage = async (data: Partial<Message>) => {
    if (!user) return;
    setUploading(true);
    try {
      let imageUrl = data.image || "";
      if (selectedImage) {
        const storageRef = ref(storage, `chat_images/${Date.now()}_${selectedImage.name}`);
        await uploadBytes(storageRef, selectedImage);
        imageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "messages"), {
        ...data,
        image: imageUrl,
        sticker: selectedSticker || data.sticker || "",
        senderId: user.uid,
        senderName: user.displayName || "مبدع Snakket",
        createdAt: serverTimestamp(),
      });

      clearSelection();
    } catch (err) {
      console.error("Send Error:", err);
      alert("فشل في إرسال الرسالة. قد يكون هناك مشكلة في الـ CORS أو الصلاحيات.");
    } finally {
      setUploading(false);
    }
  };

  const onSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedImage && !selectedSticker) return;
    const text = newMessage;
    setNewMessage("");
    await handleSendMessage({ text });
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {indexError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500">
            <AlertCircle className="shrink-0" />
            <p className="text-xs font-bold leading-relaxed">
              تنبيه: محرك البحث يحتاج لتفعيل الفهرسة (Indexing) في Firebase. يرجى مراجعة الـ Console الخاص بك والضغط على الرابط المقترح لإنشاء الفهرس تلقائياً.
            </p>
          </div>
        )}

        <div className="h-[calc(100vh-160px)] flex gap-6 overflow-hidden">
          {/* Conversation List */}
          <aside className="hidden lg:flex flex-col w-80 glass-card rounded-[40px] overflow-hidden border border-white/5">
            <div className="p-8 border-b border-white/10">
              <h2 className="text-2xl font-black mb-6">الدردشات</h2>
              <div className="bg-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
                <Search className="w-4 h-4 text-white/20" />
                <input type="text" placeholder="بحث..." className="bg-transparent text-sm outline-none" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-bold">
               <button className="w-full flex items-center gap-4 p-5 rounded-3xl bg-primary text-white shadow-2xl shadow-primary/30">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black">#</div>
                  <div className="text-right">
                    <p className="font-black text-sm">شات الأكاديمية</p>
                    <p className="text-[10px] opacity-60 uppercase font-black tracking-widest">Global Hub</p>
                  </div>
               </button>
            </div>
          </aside>

          {/* Chat Window */}
          <main className="flex-1 glass-card rounded-[40px] flex flex-col relative overflow-hidden border border-white/5 shadow-2xl">
            <header className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[20px] bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                    <Hash className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="font-black text-lg">الغرفة العامة</h3>
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-500">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live Now
                   </div>
                </div>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth custom-scrollbar">
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`flex flex-col ${isMe ? "items-start" : "items-end"}`}>
                    <div className={`max-w-[75%] p-5 rounded-[28px] shadow-sm ${isMe ? "bg-primary text-white rounded-br-none" : "bg-white/5 border border-white/10 text-foreground rounded-bl-none"}`}>
                      {!isMe && <p className="text-[10px] font-black text-primary mb-2 uppercase tracking-widest">{msg.senderName}</p>}
                      {msg.text && <p className="text-sm font-medium leading-relaxed">{msg.text}</p>}
                      {msg.image && <img src={msg.image} className="rounded-2xl mt-3 w-full border border-white/10" alt="img" />}
                      {msg.sticker && <img src={msg.sticker} className="w-24 h-24 mt-2" alt="sticker" />}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Sticker Picker */}
            <AnimatePresence>
              {showStickers && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-32 right-8 z-50 glass-card p-4 rounded-3xl border border-white/10 flex gap-4 shadow-2xl bg-background/95 backdrop-blur-xl"
                >
                  {STICKERS.map((s, i) => (
                    <button key={i} onClick={() => handleStickerClick(s)} className="p-2 hover:bg-white/10 rounded-2xl transition-all hover:scale-110 active:scale-95">
                      <img src={s} className="w-12 h-12" alt="sticker" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Section */}
            <div className="p-8 border-t border-white/10 bg-white/5 relative">
              {/* Media Preview */}
              <AnimatePresence>
                {(previewUrl || selectedSticker) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute bottom-full mb-4 left-8 bg-white/10 backdrop-blur-md p-4 rounded-[32px] border border-white/10 flex items-center gap-4 shadow-2xl"
                  >
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                       <img src={previewUrl || selectedSticker || ""} className="w-full h-full object-cover" alt="preview" />
                    </div>
                    <button 
                      type="button"
                      onClick={clearSelection}
                      onTouchStart={clearSelection}
                      className="p-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-colors shadow-lg active:scale-90"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={onSendText} className="flex items-center gap-4">
                 <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white/30 transition-all border border-white/10"
                 >
                   <Paperclip />
                 </button>
                 <input 
                  type="file" 
                  hidden 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                 />
                 
                 <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={newMessage} 
                      onChange={(e) => setNewMessage(e.target.value)} 
                      placeholder="اكتب رسالتك..." 
                      className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-8 outline-none focus:ring-2 focus:ring-primary/40 font-bold" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowStickers(!showStickers)} 
                      className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors ${showStickers ? "text-primary" : "text-white/20 hover:text-primary"}`}
                    >
                      <Smile />
                    </button>
                 </div>
                 
                 <button 
                  type="submit" 
                  disabled={(!newMessage.trim() && !selectedImage && !selectedSticker) || uploading} 
                  className="bg-primary text-white p-5 rounded-3xl shadow-2xl shadow-primary/30 active:scale-95 disabled:opacity-50"
                 >
                   {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send />}
                 </button>
              </form>
            </div>
          </main>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
