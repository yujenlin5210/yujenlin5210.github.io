import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LabRegistry({ labs }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <div className="relative mt-12 mb-32">
      {/* Background Ambience - subtle glow based on hovered item */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <AnimatePresence>
          {hoveredIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.05 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-indigo-500 blur-[150px]"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex flex-col gap-12">
        {labs.map((lab, index) => (
          <motion.a
            key={lab.id}
            href={`/lab/${lab.id}`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: index * 0.1 }}
            className="group relative flex flex-col lg:flex-row items-center gap-8 lg:gap-16 no-underline"
          >
            {/* Visual Side - Large Image */}
            <div className="w-full lg:w-[45%] aspect-[16/10] relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900">
              {lab.coverUrl ? (
                <img 
                  src={lab.coverUrl} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                  alt={lab.data.title} 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-xs text-slate-400">
                  IMAGE_NOT_FOUND
                </div>
              )}
              
              {/* Technical Overlay on Image */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-indigo-600/10 backdrop-blur-[1px] flex items-center justify-center">
                <div className="px-6 py-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 text-white font-mono text-xs font-black tracking-widest shadow-2xl">
                  OPEN_MODULE_0{labs.length - index}
                </div>
              </div>
            </div>

            {/* Content Side */}
            <div className="w-full lg:w-[55%] flex flex-col py-4">
              <div className="flex items-center gap-4 mb-6">
                <span className="font-mono text-lg font-black text-indigo-500/50">
                  {String(labs.length - index).padStart(2, '0')}
                </span>
                <div className="h-[1px] w-8 bg-slate-200 dark:bg-slate-800" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-400">
                  Registry_Entry_{lab.id.slice(-4)}
                </span>
              </div>

              <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white mb-6 group-hover:text-indigo-500 transition-colors duration-300">
                {lab.data.title}
              </h2>

              <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 font-light leading-relaxed mb-8 max-w-xl">
                {lab.data.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {lab.data.tags?.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-transparent group-hover:border-indigo-500/30 transition-colors">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Background Text Accent (The experiment ID in huge outline text) */}
            <div className="absolute -z-10 right-0 top-1/2 -translate-y-1/2 text-[15rem] font-black text-slate-100 dark:text-white/[0.02] pointer-events-none select-none hidden lg:block uppercase tracking-tighter transition-all duration-700 group-hover:text-indigo-500/10 group-hover:translate-x-4">
              {lab.id.slice(0, 4)}
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
