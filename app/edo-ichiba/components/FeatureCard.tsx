'use client';

import { motion } from 'framer-motion';

interface FeatureCardProps {
  icon: string;
  title: string;
  children: React.ReactNode;
  isEdo?: boolean;
}

export default function FeatureCard({ icon, title, children, isEdo = false }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -3, transition: { duration: 0.3 } }}
      className={`bg-white border-2 rounded-lg p-6 transition-all ${
        isEdo
          ? 'bg-gradient-to-br from-orange-50 to-red-50 border-l-4 border-edo-vermilion hover:border-edo-gold'
          : 'border-stone-200 hover:border-edo-gold'
      } hover:shadow-lg`}
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h4 className={`text-lg mb-3 font-semibold ${isEdo ? 'text-edo-vermilion' : 'text-edo-indigo'}`}>
        {title}
      </h4>
      <div className="text-gray-600 leading-relaxed text-sm">{children}</div>
    </motion.div>
  );
}

