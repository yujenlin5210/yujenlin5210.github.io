import React from 'react';
import { motion } from 'framer-motion';

export default function LabCard({ lab, coverUrl, index }) {
  // Use index to create a staggered entry animation
  const delay = index * 0.05;

  return (
    <motion.a
      href={`/lab/${lab.id}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="group relative block aspect-[4/5] md:aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
    >
      {/* Background Image with slight zoom on hover */}
      <div className="absolute inset-0 z-0">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={lab.data.title} 
            className="w-full h-full object-cover transition-transform duration-700 scale-105 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 font-mono text-xs italic">
            missing_asset
          </div>
        )}
      </div>

      {/* Blueprint Overlay - shown on hover */}
      <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-indigo-600/10 backdrop-blur-[2px]">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      </div>

      {/* Glass Card Info - Slaps up on hover */}
      <div className="absolute inset-x-4 bottom-4 z-20 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out">
        <div className="p-5 rounded-2xl bg-white/10 dark:bg-black/20 backdrop-blur-xl backdrop-saturate-150 border border-white/20 shadow-2xl overflow-hidden relative">
          {/* Section ID label */}
          <div className="flex justify-between items-start mb-3">
            <span className="text-[9px] font-mono font-black tracking-widest text-white/50 uppercase">
              Exp_{lab.id.slice(-4)}
            </span>
            <span className="text-[9px] font-mono text-white/50">
              {lab.data.date}
            </span>
          </div>
          
          <h3 className="text-lg font-bold text-white leading-tight mb-2">
            {lab.data.title}
          </h3>
          
          <p className="text-xs text-white/70 font-light line-clamp-2 leading-relaxed mb-4">
            {lab.data.description}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {lab.data.tags?.slice(0, 3).map(tag => (
              <span key={tag} className="text-[8px] font-mono uppercase tracking-tighter bg-white/10 px-1.5 py-0.5 rounded text-white/80 border border-white/5">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Default Label - hidden on hover */}
      <div className="absolute top-4 left-4 z-20 group-hover:opacity-0 transition-opacity duration-300">
        <div className="px-3 py-1 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-full border border-white/20 dark:border-white/10 shadow-sm">
          <span className="text-[10px] font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {lab.data.title}
          </span>
        </div>
      </div>
    </motion.a>
  );
}
