'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StatItem {
  value: string;
  label: string;
}

interface StatsBoxProps {
  title: string;
  stats: StatItem[];
  gradient?: string;
  footer?: ReactNode;
}

export default function StatsBox({ title, stats, gradient = 'from-edo-vermilion to-edo-gold', footer }: StatsBoxProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={`bg-gradient-to-br ${gradient} text-white p-10 rounded-xl text-center my-10`}
    >
      <h3 className="mb-5 text-2xl font-semibold">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1, duration: 0.5 }}
            className="stat-item"
          >
            <h4 className="text-5xl font-bold mb-2 drop-shadow-lg">{stat.value}</h4>
            <p className="text-lg opacity-95">{stat.label}</p>
          </motion.div>
        ))}
      </div>
      {footer && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-8"
        >
          {footer}
        </motion.div>
      )}
    </motion.div>
  );
}

