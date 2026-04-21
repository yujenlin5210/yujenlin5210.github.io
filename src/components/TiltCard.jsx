import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

export default function TiltCard({ project, coverUrl }) {
  const cardRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Mouse position relative to the card
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for rotation
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  // Map mouse position to rotation (-10 to 10 degrees)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  // Map mouse position to glow position
  const glowX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glowY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (e) => {
    if (!cardRef.current || prefersReducedMotion) return;
    const rect = cardRef.current.getBoundingClientRect();
    
    // Get mouse position relative to the center of the card (-0.5 to 0.5)
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
    <div 
      className="perspective-1000 w-full h-full"
      onMouseMove={prefersReducedMotion ? undefined : handleMouseMove}
      onMouseLeave={prefersReducedMotion ? undefined : handleMouseLeave}
    >
      <motion.a
        ref={cardRef}
        href={`/projects/${project.id}`}
        style={prefersReducedMotion ? undefined : {
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative block w-full aspect-video rounded-3xl overflow-hidden bg-slate-900 border border-slate-200/10 shadow-2xl group transition-all"
      >
        {/* Background Image */}
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={project.data.title} 
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${prefersReducedMotion ? '' : 'group-hover:scale-110'}`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-medium">No Image</div>
        )}

        {/* The Glow Effect */}
        {!prefersReducedMotion && (
          <motion.div
            style={{
              background: 'radial-gradient(circle at var(--glow-x) var(--glow-y), rgba(255,255,255,0.15) 0%, transparent 60%)',
              "--glow-x": glowX,
              "--glow-y": glowY,
            }}
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
        )}

        {/* Content Overlay */}
        <div 
          style={{ transform: "translateZ(50px)" }}
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <h3 className="text-2xl font-bold text-white mb-2">{project.data.title}</h3>
          {project.data.description && (
            <p className="text-slate-200 text-sm line-clamp-2 max-w-md font-light">
              {project.data.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {(project.data.tags || []).slice(0, 3).map((tag) => (
              <span key={tag} className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] uppercase tracking-widest text-white/80 border border-white/10">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.a>
    </div>
  );
}
