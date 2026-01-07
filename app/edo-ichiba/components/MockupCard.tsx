'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface MockupCardProps {
  imageUrl: string;
  title: string;
  badges: Array<{ label: string; type: 'ghibli' | 'edo' | 'modern' }>;
  description: string;
  imageAlt: string;
}

export default function MockupCard({ imageUrl, title, badges, description, imageAlt }: MockupCardProps) {
  const badgeStyles = {
    ghibli: 'bg-ghibli-forest text-white',
    edo: 'bg-edo-vermilion text-white',
    modern: 'bg-modern-neon text-white',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow"
    >
      <div className="relative w-full aspect-video">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized
        />
      </div>
      <div className="p-6 bg-gradient-to-b from-stone-50 to-white">
        <h4 className="text-xl text-edo-indigo mb-3 font-semibold">{title}</h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {badges.map((badge, idx) => (
            <span
              key={idx}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${badgeStyles[badge.type]}`}
            >
              {badge.label}
            </span>
          ))}
        </div>
        <p className="text-gray-600 leading-relaxed">
          <strong>雰囲気:</strong> {description}
        </p>
      </div>
    </motion.div>
  );
}

