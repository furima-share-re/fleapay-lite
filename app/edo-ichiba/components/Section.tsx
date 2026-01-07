'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode;
}

export default function Section({ title, children }: SectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="mb-24"
    >
      <h2 className="font-serif text-3xl md:text-4xl text-edo-indigo border-l-[6px] border-edo-vermilion pl-5 mb-10 font-bold">
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

