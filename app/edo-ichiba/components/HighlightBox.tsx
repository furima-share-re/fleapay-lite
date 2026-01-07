'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface HighlightBoxProps {
  title: string;
  children: ReactNode;
}

export default function HighlightBox({ title, children }: HighlightBoxProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="bg-gradient-to-br from-red-50 to-red-100 border-l-[6px] border-edo-vermilion p-10 my-10 rounded-xl shadow-lg"
    >
      <h3 className="font-serif text-3xl text-edo-vermilion mb-5 font-bold">
        {title}
      </h3>
      <div className="text-lg leading-relaxed">
        {children}
      </div>
    </motion.div>
  );
}

