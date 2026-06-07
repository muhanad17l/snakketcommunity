"use client";
import { motion } from "framer-motion";

const Logo = ({ size = "md", showSlogan = false }) => {
  const sizes = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex items-center justify-center gap-2"
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative"
        >
          {/* Animated Snack Bite Box */}
          <motion.div 
            animate={{
              clipPath: [
                "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
                "polygon(0% 0%, 85% 0%, 75% 15%, 85% 30%, 100% 30%, 100% 100%, 0% 100%)",
                "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
              ]
            }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-pink shadow-lg"
          >
            <span className="text-white font-black text-2xl italic">e</span>
          </motion.div>
          <div className="absolute -inset-1 bg-primary blur-lg opacity-20 animate-pulse" />
        </motion.div>
        
        <motion.h1 
          className={`${sizes[size]} font-black tracking-tighter text-white flex items-center`}
        >
          <span className="text-gradient">Snakket</span>
        </motion.h1>
      </motion.div>
      
      {showSlogan && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-zain text-yellow text-xl font-bold tracking-wide -mt-2"
        >
          التعليم صار سناك
        </motion.p>
      )}
    </div>
  );
};

export default Logo;
