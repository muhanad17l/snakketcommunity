"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification 
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import Logo from "@/components/Logo";
import { Mail, Lock, User, ArrowRight, Globe, Code, CheckCircle2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showVerificationMsg, setShowVerificationMsg] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
          setError("يرجى تفعيل بريدك الإلكتروني أولاً.");
          setLoading(false);
          return;
        }
        router.push("/dashboard");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Send Verification Email
        await sendEmailVerification(user);
        
        // Update profile
        await updateProfile(user, { displayName: fullName });
        
        // Create user doc in Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          fullName,
          email,
          createdAt: new Date().toISOString(),
          role: "student"
        });

        setShowVerificationMsg(true);
      }
    } catch (err: any) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <Logo size="md" />
          <p className="text-white/50 mt-4 text-sm font-medium">
            {isLogin ? "Welcome back! Please enter your details." : "Join our elite community today."}
          </p>
        </div>

        <div className="glass-card p-8 rounded-3xl relative overflow-hidden text-right" dir="rtl">
          <AnimatePresence>
            {showVerificationMsg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 glow-pink">
                  <CheckCircle2 className="w-10 h-10 text-primary animate-bounce" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4">تفقّد بريدك الإلكتروني!</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-8">
                  لقد أرسلنا رابط التفعيل إلى <strong>{email}</strong>.<br />
                  يرجى النقر على الرابط لتفعيل حسابك والبدء في رحلتك التعليمية.
                </p>
                <button
                  onClick={() => {
                    setShowVerificationMsg(false);
                    setIsLogin(true);
                  }}
                  className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> العودة لتسجيل الدخول
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Header Toggle */}
          <div className="flex bg-white/5 p-1 rounded-xl mb-8 relative">
            <motion.div
              layout
              className="absolute inset-y-1 bg-primary rounded-lg shadow-lg shadow-primary/20"
              initial={false}
              animate={{
                x: isLogin ? 0 : "100%",
                width: "50%"
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-semibold z-10 transition-colors ${isLogin ? "text-white" : "text-white/60 hover:text-white"}`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-semibold z-10 transition-colors ${!isLogin ? "text-white" : "text-white/60 hover:text-white"}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="fullname"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-2"
                >
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-white/20"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-white/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Password</label>
                {isLogin && (
                  <button type="button" className="text-xs text-primary hover:text-accent font-semibold transition-colors">
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-white/20"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl text-center"
              >
                {error}
              </motion.div>
            )}

            <button
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 transform transition-all active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative flex items-center mb-6">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-white/20 text-[10px] font-bold uppercase tracking-[2px]">Or continue with</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-2xl py-3 text-sm font-semibold hover:bg-white/10 transition-colors">
                <Globe className="w-4 h-4" /> Google
              </button>
              <button type="button" className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-2xl py-3 text-sm font-semibold hover:bg-white/10 transition-colors">
                <Code className="w-4 h-4" /> GitHub
              </button>
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-white/40 text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:text-accent font-bold ml-1 transition-colors"
          >
            {isLogin ? "Sign up for free" : "Login here"}
          </button>
        </p>
      </motion.div>

      {/* Decorative dots/grid */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(var(--primary) 0.5px, transparent 0.5px)', backgroundSize: '30px 30px' }} 
      />
    </div>
  );
}
