import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { filterTags } from '../utils/filterTags';
import { activeProjectId, activeAnimationId } from '../store/projectStore';

export default function CinematicProject({ project, coverUrl, index }) {
  const isEven = index % 2 === 0;
  const imageRef = useRef(null);
  const cleanTags = filterTags(project.data.tags);

  // Mouse position for the 3D tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for tilt
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  // Map mouse position to more dramatic rotation (-15 to 15 degrees)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
    const mouseY = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <section className="relative min-h-[80vh] flex items-center py-24 overflow-hidden">
      <motion.div 
        onViewportEnter={() => {
          activeProjectId.set(project.id);
          activeAnimationId.set(project.data.animation || null);
        }}
        viewport={{ amount: 0.5 }}
        className="absolute inset-0 pointer-events-none"
      />
      {/* Background Parallax Image */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          initial={{ scale: 1.1 }}
          whileInView={{ scale: 1 }}
          viewport={{ amount: 0.3 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="w-full h-full"
        >
          {coverUrl ? (
            <img 
              src={coverUrl} 
              alt={project.data.title} 
              className="w-full h-full object-cover opacity-40 dark:opacity-30"
            />
          ) : (
            <div className="w-full h-full bg-slate-900" />
          )}
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-transparent to-slate-50 dark:from-slate-950 dark:via-transparent dark:to-slate-950" />
      </div>

      <div className={`container mx-auto px-6 relative z-10 flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12`}>
        {/* Visual Side with 3D Tilt */}
        <motion.div 
          initial={{ opacity: 0, x: isEven ? -50 : 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full md:w-3/5 perspective-1000"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <motion.a 
            ref={imageRef}
            href={`/projects/${project.id}`} 
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="block group relative aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
          >
            {coverUrl ? (
              <img 
                src={coverUrl} 
                alt={project.data.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500">No Image</div>
            )}
            <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </motion.a>
        </motion.div>

        {/* Text Side */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full md:w-2/5 space-y-6 p-6 md:p-8 rounded-3xl bg-white/10 dark:bg-white/5 backdrop-blur-lg backdrop-saturate-150 border border-white/20 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/50"
        >
          <a href={`/projects/${project.id}`} className="block group/text space-y-6 no-underline">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-indigo-500 font-mono text-sm tracking-widest uppercase font-bold">
                <span>{project.data.date ? new Date(project.data.date).getFullYear() : project.id.slice(0, 4)}</span>
                {project.data.organization && (
                  <>
                    <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
                    <span>{project.data.organization}</span>
                  </>
                )}
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight group-hover/text:text-indigo-500 transition-colors">
                {project.data.title}
              </h2>
              {project.data.role && (
                <p className="text-indigo-600 dark:text-indigo-400 font-medium text-lg">{project.data.role}</p>
              )}
            </div>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 font-light leading-relaxed">
              {project.data.description}
            </p>
          </a>

          <div className="flex flex-wrap gap-2">
            {cleanTags.slice(0, 4).map((tag) => (
              <span key={tag} className="px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded-full text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 font-bold">
                {tag}
              </span>
            ))}
          </div>

          <div className="pt-4">
            <a href={`/projects/${project.id}`} className="inline-flex items-center gap-2 text-indigo-500 font-bold hover:gap-4 transition-all group">
              View Case Study <span className="text-xl">&rarr;</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
