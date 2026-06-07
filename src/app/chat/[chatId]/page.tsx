"use client";

import { useState, useEffect, useRef, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, addDoc, query, orderBy, 
  onSnapshot, serverTimestamp, Timestamp, where, 
  doc, getDoc, limit 
} from "firebase/firestore";
import { 
  Send, Search, MessageSquare, Users, 
  Smile, Hash, Paperclip, X, Loader2, ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  text?: string;
  senderId: string;
  senderName: string;
  createdAt: Timestamp;
}

export default function DirectChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const resolvedParams = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatRoom, setChatRoom] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !resolvedParams.chatId) return;

    // Fetch Room Info
    const fetchRoom = async () => {
      const roomRef = doc(db, "chatRooms", resolvedParams.chatId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        setChatRoom(roomSnap.data());
      }
    };
    fetchRoom();

    // Listen for messages in this specific room
    const q = query(
      collection(db, "chatRooms", resolvedParams.chatId, "messages"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      // Client-side sort to bypass index
      const sorted = msgs.sort((a, b) => {
        const timeA = a.createdAt?.toDate()?.getTime() || 0;
        const timeB = b.createdAt?.toDate()?.getTime() || 0;
        return timeA - timeB;
      });
      setMessages(sorted);
    });

    return () => unsubscribe();
  }, [user, resolvedParams.chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const text = newMessage;
    setNewMessage("");

    try {
      await addDoc(collection(db, "chatRooms", resolvedParams.chatId, "messages"), {
        text,
        senderId: user.uid,
        senderName: user.displayName || "مبدع",
        createdAt: serverTimestamp(),
      });
      
      // Update room last message
      await addDoc(collection(db, "notifications"), {
          receiverId: chatRoom.participants.find((p: string) => p !== user.uid),
          senderId: user.uid,
          senderName: user.displayName,
          type: "message",
          text: "أرسل لك رسالة جديدة!",
          link: `/chat/${resolvedParams.chatId}`,
          isRead: false,
          createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col glass-card rounded-[48px] overflow-hidden border border-white/5 shadow-2xl">
          <header className="p-8 border-b border-white/10 flex items-center gap-6 bg-white/5">
            <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-xl transition-all">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-black">
                  <MessageSquare />
               </div>
               <div>
                  <h2 className="font-black text-xl">المحادثة الخاصة</h2>
                  <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest">End-to-End Encryption</p>
               </div>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {messages.map((msg) => {
              const isMe = msg.senderId === user?.uid;
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] p-5 rounded-[28px] ${isMe ? "bg-primary text-white rounded-br-none" : "bg-white/5 border border-white/10 text-foreground rounded-bl-none"}`}>
                    <p className="text-sm font-medium">{msg.text}</p>
                    <p className="text-[8px] mt-2 opacity-40 font-black">{msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <form onSubmit={handleSendMessage} className="p-8 border-t border-white/10 bg-white/5 flex gap-4">
            <input 
              type="text" 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب رسالتك الخاصة هنا..."
              className="flex-1 bg-white/5 border border-white/10 rounded-3xl py-5 px-8 outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button className="bg-primary text-white p-5 rounded-3xl shadow-2xl shadow-primary/30 active:scale-95"><Send /></button>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
