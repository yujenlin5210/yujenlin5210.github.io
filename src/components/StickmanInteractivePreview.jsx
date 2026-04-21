import { useState } from 'react';
import StickmanPreview from './StickmanPreview.jsx';

export default function StickmanInteractivePreview() {
  const [activeId, setActiveId] = useState('idle');

  return (
    <div className="my-8">
      <div className="flex justify-center gap-4 mb-4">
        {['idle', 'varifocal', 'mario-kart'].map(id => (
          <button
            key={id}
            onClick={() => setActiveId(id)}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
              activeId === id 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {id === 'idle' ? 'Idle' : id === 'varifocal' ? 'Varifocal' : 'Mario Kart'}
          </button>
        ))}
      </div>
      {/* We use negative margin here because StickmanPreview already has my-8, or we can just let it have some extra space */}
      <div className="-my-8">
        <StickmanPreview animationId={activeId} />
      </div>
    </div>
  );
}
