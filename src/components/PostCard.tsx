"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { useState } from "react";

interface PostCardProps {
  author: string;
  avatar: string;
  content: string;
  image?: string;
  createdAt?: any;
  likes: number;
  comments: number;
}

export default function PostCard({ author, avatar, content, image, createdAt, likes, comments }: PostCardProps) {
  const [liked, setLiked] = useState(false);

  // Simple relative time formatter
  const formatTime = (ts: any) => {
    if (!ts) return "الآن";
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString("ar-IQ", { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-3xl overflow-hidden mb-6 group border-white/5"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl border border-white/10 overflow-hidden bg-white/5`}>
              {avatar ? (
                <img src={avatar} className="w-full h-full object-cover" alt={author} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-accent" />
              )}
            </div>
            <div>
              <h4 className="font-bold text-foreground text-lg leading-tight">{author}</h4>
              <p className="text-foreground/40 text-[10px] font-black uppercase tracking-wider">{formatTime(createdAt)}</p>
            </div>
          </div>
          <button className="p-2 hover:bg-white/5 rounded-full text-foreground/40 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        <p className="text-foreground/80 leading-relaxed mb-6 font-medium whitespace-pre-wrap">
          {content}
        </p>

        {image && (
          <div className="rounded-2xl overflow-hidden border border-white/5 mb-6 bg-black/20">
            <img src={image} alt="post" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700" />
          </div>
        )}

        <div className="flex items-center gap-6 pt-2">
          <button 
            onClick={() => setLiked(!liked)}
            className={`flex items-center gap-2 text-sm font-bold transition-all ${liked ? "text-primary" : "text-foreground/40 hover:text-primary"}`}
          >
            <Heart className={`w-5 h-5 ${liked ? "fill-primary" : ""}`} />
            {likes + (liked ? 1 : 0)}
          </button>
          <button className="flex items-center gap-2 text-sm font-bold text-foreground/40 hover:text-accent transition-all">
            <MessageCircle className="w-5 h-5" />
            {comments}
          </button>
          <button className="flex items-center gap-2 text-sm font-bold text-foreground/40 hover:text-white transition-all ml-auto">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
