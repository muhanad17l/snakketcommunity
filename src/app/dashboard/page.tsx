"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import PostCard from "@/components/PostCard";
import { Plus, X, Image as ImageIcon, Send, Palette, Loader2 } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch posts in real-time
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(fetchedPosts);
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && !selectedFile) return;
    if (!user) return;

    setLoading(true);
    try {
      let imageUrl = "";

      if (selectedFile) {
        const fileRef = ref(storage, `post_images/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(fileRef, selectedFile);
        imageUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "posts"), {
        content: postContent,
        image: imageUrl,
        author: user.displayName || "مستخدم مجهول",
        authorId: user.uid,
        avatar: user.photoURL || "",
        createdAt: serverTimestamp(),
        likes: 0,
        comments: 0
      });

      setPostContent("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsPostModalOpen(false);
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          {/* Create Post Trigger */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsPostModalOpen(true)}
            className="w-full mb-8 bg-gradient-to-r from-primary to-accent p-[2px] rounded-3xl group shadow-xl shadow-primary/20"
          >
            <div className="bg-background rounded-[22px] py-6 px-8 flex items-center justify-between group-hover:bg-transparent transition-colors">
              <span className="text-xl font-black text-foreground group-hover:text-white">ماذا يدور في ذهنك؟</span>
              <div className="bg-primary text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-white group-hover:text-primary transition-colors">
                <Plus className="w-8 h-8" />
              </div>
            </div>
          </motion.button>

          {/* Feed */}
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} {...post} />
            ))}
          </div>
        </div>

        {/* Post Modal */}
        <AnimatePresence>
          {isPostModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsPostModalOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70]"
              />
              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.9 }}
                className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl z-[80] glass-card p-8 rounded-[40px] shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black">نشر جديد</h3>
                  <button onClick={() => setIsPostModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <textarea
                  placeholder="اكتب شيئاً أو صف رسمتك..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-6 text-xl outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none mb-4 placeholder:text-foreground/20 text-foreground"
                />

                {previewUrl && (
                  <div className="relative mb-4 rounded-xl overflow-hidden border border-white/10 h-48 bg-black/20">
                    <img src={previewUrl} className="w-full h-full object-contain" alt="Preview" />
                    <button 
                      onClick={() => {setSelectedFile(null); setPreviewUrl(null);}}
                      className="absolute top-2 left-2 bg-black/50 p-1 rounded-full hover:bg-red-500 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <input 
                      type="file" 
                      hidden 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all font-bold text-sm text-foreground/60"
                    >
                      <ImageIcon className="w-5 h-5 text-primary" /> صورة
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all font-bold text-sm text-foreground/60">
                      <Palette className="w-5 h-5 text-accent" /> رسم
                    </button>
                  </div>
                  <button 
                    disabled={(!postContent.trim() && !selectedFile) || loading}
                    onClick={handleCreatePost}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-black px-8 py-3 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 min-w-[120px] justify-center"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>نشر <Send className="w-4 h-4" /></>}
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
