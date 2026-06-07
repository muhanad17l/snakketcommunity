"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, query, where, getDocs, 
  doc, updateDoc, arrayUnion, arrayRemove, 
  onSnapshot, limit, orderBy, addDoc, serverTimestamp, setDoc 
} from "firebase/firestore";
import { 
  User, UserPlus, UserMinus, MessageCircle, 
  Grid, Image as ImageIcon, Heart, 
  MapPin, Calendar, Loader2, ShieldCheck, Crown
} from "lucide-react";
import { useRouter } from "next/navigation";

interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  bio: string;
  photoURL: string;
  followers?: string[];
  following?: string[];
}

interface Post {
  id: string;
  image: string;
  text: string;
  createdAt: any;
}

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user: currentUser, isAdmin } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!resolvedParams.username) return;
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        
        // Robust fetch: try both cases to handle case-sensitivity without complex indices
        const q1 = query(usersRef, where("username", "==", resolvedParams.username), limit(1));
        const q2 = query(usersRef, where("username", "==", resolvedParams.username.toLowerCase()), limit(1));
        
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const foundDoc = snap1.docs[0] || snap2.docs[0];

        if (foundDoc) {
          const userData = foundDoc.data() as UserProfile;
          const userUid = foundDoc.id;
          setProfile({ ...userData, uid: userUid });
          
          if (currentUser) {
            setIsFollowing(userData.followers?.includes(currentUser.uid) || false);
          }

          // Fetch posts - Simplified to bypass index
          const postsRef = collection(db, "posts");
          const postsQuery = query(postsRef, where("uid", "==", userUid), limit(30));
          const postsSnapshot = await getDocs(postsQuery);
          const fetchedPosts = postsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Post[];
          
          const sortedPosts = fetchedPosts.sort((a, b) => {
            const timeA = (a.createdAt as any)?.toDate?.()?.getTime() || 0;
            const timeB = (b.createdAt as any)?.toDate?.()?.getTime() || 0;
            return timeB - timeA;
          });
          
          setPosts(sortedPosts);
        } else {
            console.log("No user found for:", resolvedParams.username);
        }
      } catch (err) {
        console.error("Profile Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [resolvedParams.username, currentUser]);

  const handleFollow = async () => {
    if (!currentUser || !profile || followLoading) return;
    setFollowLoading(true);

    try {
      const actorDocRef = doc(db, "users", currentUser.uid);
      const targetDocRef = doc(db, "users", profile.uid);

      if (isFollowing) {
        await updateDoc(targetDocRef, { followers: arrayRemove(currentUser.uid) });
        await updateDoc(actorDocRef, { following: arrayRemove(profile.uid) });
        setIsFollowing(false);
      } else {
        await updateDoc(targetDocRef, { followers: arrayUnion(currentUser.uid) });
        await updateDoc(actorDocRef, { following: arrayUnion(profile.uid) });
        
        await addDoc(collection(db, "notifications"), {
            receiverId: profile.uid,
            senderId: currentUser.uid,
            senderName: currentUser.displayName || "مبدع",
            type: "follow",
            text: "بدأ بمتابعة ملفك الشخصي!",
            link: `/profile/${currentUser.displayName || "user"}`,
            isRead: false,
            createdAt: serverTimestamp()
        });
        
        setIsFollowing(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(false);
    }
  };

  const startChat = async () => {
    if (!currentUser || !profile) return;
    
    try {
      // Check for existing room
      const roomsRef = collection(db, "chatRooms");
      const q = query(roomsRef, where("participants", "array-contains", currentUser.uid));
      const snap = await getDocs(q);
      
      let existingRoomId = null;
      snap.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(profile.uid)) {
          existingRoomId = doc.id;
        }
      });

      if (existingRoomId) {
        router.push(`/chat/${existingRoomId}`);
      } else {
        // Create new room
        const newRoomRef = await addDoc(collection(db, "chatRooms"), {
          participants: [currentUser.uid, profile.uid],
          createdAt: serverTimestamp(),
          lastMessage: ""
        });
        router.push(`/chat/${newRoomRef.id}`);
      }
    } catch (err) {
      console.error("Start Chat Error:", err);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="h-[60vh] flex flex-col items-center justify-center opacity-30 text-center px-4">
          <User className="w-20 h-20 mb-4" />
          <h2 className="text-2xl font-black mb-2">المسخدم (@{resolvedParams.username}) غير موجود</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">تحقق من كتابة الاسم بشكل صحيح</p>
        </div>
      </DashboardLayout>
    );
  }

  const isFounder = profile.username?.toLowerCase() === "muhanad";

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto pb-20">
          <div className="glass-card p-6 md:p-10 rounded-[40px] md:rounded-[48px] mb-10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -z-10" />
            
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-10 text-center md:text-right">
              <div className="relative shrink-0">
                <div className={`w-32 h-32 md:w-40 md:h-40 rounded-[32px] md:rounded-[40px] border-4 overflow-hidden shadow-2xl ${isFounder ? "border-yellow" : "border-white/10"}`}>
                   {profile.photoURL ? (
                     <img src={profile.photoURL} alt="p" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/10"><User className="w-16 h-16" /></div>
                   )}
                </div>
                {isFounder && <div className="absolute -bottom-2 -right-2 bg-yellow text-black p-2 rounded-xl"><Crown className="w-5 h-5" /></div>}
              </div>

              <div className="flex-1 w-full space-y-6">
                <div>
                   <h1 className="text-3xl md:text-4xl font-black mb-1">{profile.displayName}</h1>
                   <p className="text-primary font-black uppercase tracking-[3px] text-xs">@{profile.username}</p>
                </div>

                <p className="text-foreground/60 leading-relaxed font-medium max-w-lg mx-auto md:mx-0">
                  {profile.bio || "مبدع من عائلة Snakket.."}
                </p>

                <div className="flex flex-wrap gap-4 pt-2">
                   {currentUser?.uid !== profile.uid && (
                      <>
                        <button 
                          onClick={handleFollow}
                          disabled={followLoading}
                          className={`flex-1 md:flex-none px-8 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${
                            isFollowing ? "bg-white/5 text-white/40 border border-white/5" : "bg-primary text-white shadow-xl shadow-primary/20"
                          }`}
                        >
                          {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />)}
                          {isFollowing ? "إلغاء المتابعة" : "متابعة"}
                        </button>
                        <button onClick={startChat} className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-4 rounded-2xl transition-all">
                           <MessageCircle className="w-6 h-6" />
                        </button>
                      </>
                   )}
                </div>

                <div className="flex justify-center md:justify-start gap-8 md:gap-12 pt-6 border-t border-white/5">
                   <div className="text-center md:text-right">
                      <p className="text-xl font-black">{posts.length}</p>
                      <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">منشورات</p>
                   </div>
                   <div className="text-center md:text-right">
                      <p className="text-xl font-black">{profile.followers?.length || 0}</p>
                      <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">متابعون</p>
                   </div>
                   <div className="text-center md:text-right">
                      <p className="text-xl font-black">{profile.following?.length || 0}</p>
                      <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">متابعة</p>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {posts.map((post) => (
              <div key={post.id} className="aspect-square glass-card rounded-[24px] md:rounded-[32px] overflow-hidden group relative cursor-pointer">
                 <img src={post.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="art" />
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                    <p className="text-xs font-black text-center line-clamp-2">{post.text}</p>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
