'use client';

import { motion } from 'framer-motion';

export default function EdoHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="relative overflow-hidden bg-gradient-to-br from-edo-vermilion to-edo-gold text-white py-20 px-10 text-center mb-16 shadow-lg"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 Q75 25 50 50 Q25 25 50 0' fill='rgba(255,255,255,0.05)'/%3E%3C/svg%3E")`,
        }}
      />
      
      <div className="relative z-10">
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="font-serif text-5xl md:text-6xl mb-5 font-bold tracking-wide"
        >
          🏮 EDO ICHIBA<br />
          「江戸縁日・旅みくじ」<br />
          最終版デザイン
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-xl opacity-95 font-light mb-4"
        >
          ジブリの温かみ × 江戸文化の粋 × 現代UI
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-xl opacity-95 font-light mb-5"
        >
          江戸っぽさ強化版 - 文化的アイデンティティの明確化
        </motion.p>
        
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="inline-block bg-white/25 backdrop-blur-md px-6 py-2.5 rounded-full text-sm mt-5"
        >
          最終版 v6.0 | Edo-Enhanced Design
        </motion.span>
      </div>
    </motion.header>
  );
}

