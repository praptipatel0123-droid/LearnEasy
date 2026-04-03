import { useEffect, useState } from 'react';
import t from '../lib/translations';
import AppIcon from './AppIcon';

interface Props {
  onDone: () => void;
  lang?: 'EN' | 'HI';
}

export default function WelcomeScreen({ onDone, lang = 'EN' }: Props) {
  const T = t[lang];
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 150);
    const t2 = setTimeout(() => setPhase('out'), 2800);
    const t3 = setTimeout(() => onDone(), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
      style={{
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out' ? 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        pointerEvents: phase === 'out' ? 'none' : 'all',
      }}
    >
      {/* Glow blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gray-200/60 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gray-300/40 blur-[120px] rounded-full pointer-events-none" />

      <div
        className="text-center space-y-5 px-6"
        style={{
          opacity: phase === 'in' ? 0 : 1,
          transform: phase === 'in' ? 'translateY(32px)' : 'translateY(0)',
          transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <p className="text-4xl md:text-5xl font-semibold tracking-tight text-black/80">{T.welcome}</p>
        <h1 className="inline-flex items-center justify-center gap-3 md:gap-5 text-6xl md:text-8xl font-black tracking-tighter text-gray-500 leading-none">
          <AppIcon size={60} className="shrink-0 drop-shadow-xl" />
          <span>LearnEasy</span>
        </h1>
        <p className="text-gray-400 text-2xl md:text-3xl" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontStyle: 'italic', letterSpacing: '0.04em' }}>
          {T.tagline}
        </p>
      </div>
    </div>
  );
}
