import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, animate } from 'framer-motion';

const COLORS = {
  yellow: '#FCEE0A',
  cyan: '#00F0FF',
  red: '#FF003C',
  black: '#000000',
};

function Counter({ value, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (inView) {
      const controls = animate(0, parseInt(value), {
        duration: 2,
        onUpdate: (latest) => setDisplayValue(Math.floor(latest)),
      });
      return () => controls.stop();
    }
  }, [inView, value]);

  return (
    <span ref={ref}>
      {displayValue < 10 ? `0${displayValue}` : displayValue}
      {suffix}
    </span>
  );
}

const TIMELINE = [
  { era: 'SEMESTER 01 // 2024', log: 'INITIALIZED_JAVA_CORE.exe', desc: 'Started with Java. Understood the logic of systems. Realized this was a craft, not just a degree.' },
  { era: 'SEMESTER 02 // 2024', log: 'SHIPPED_REACTORX.exe', desc: 'Built first production full-stack app. Spring Boot, React, JWT, PostgreSQL. Real scale achieved.' },
  { era: 'SEM 02–03 // 2025', log: 'PIVOT_TO_IMPACT.vdf', desc: 'CivicSolver and Delhi Kavach. Started caring about what code actually does in the world.' },
  { era: 'SEMESTER 03 // 2025', log: 'LOCAL_AI_PROTOCOL.bin', desc: 'Maeve AI, Suraksha Setu, Mavis AI. Building faster than the semester can keep up.' },
  { era: 'NOW // 2026', log: 'NEURAL_BRIDGE_ACTIVE.sys', desc: 'Semester 04: Focused on Maeve AI and Mavis AI. Building the future of private, local intelligence.' },
];

export default function DataArchives() {
  return (
    <div className="flex flex-col gap-24">
      {/* ── Personal Story & Impact ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <motion.div 
          initial={{ opacity: 0, x: -30 }} 
          whileInView={{ opacity: 1, x: 0 }} 
          viewport={{ once: true }}
          className="flex flex-col gap-6"
        >
          <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-[#FF003C]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            [ ORIGIN_STORY ]
          </h3>
          <div className="space-y-4 text-gray-400 font-mono text-sm leading-relaxed border-l-2 border-[#FF003C] pl-6">
            <p>I didn't start with a roadmap. I started with Java, a lot of bugs, and the slow realization that writing code meant I could build anything.</p>
            <p>By semester 2 I had shipped ReactorX. That's when I stopped thinking like a student and started thinking like an engineer.</p>
            <p>Then I pivoted toward impact. CivicSolver, Delhi Kavach, Suraksha Setu. I wasn't building to pass exams anymore — I was building for the real world.</p>
            <p>Now, I'm all in on local AI. Maeve AI and Mavis AI. Privacy matters. Governance can be automated. Flat screens are boring.</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
          {[
            { label: 'PROJECTS_SHIPPED', val: 7 },
            { label: 'AI_SYSTEMS', val: 5 },
            { label: 'TECH_STACK', val: 10, suffix: "+" },
            { label: 'CURRENT_SEM', val: 4, suffix: "th" },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 bg-[#050505] border border-[#222] flex flex-col items-center justify-center text-center"
              style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
            >
              <div className="text-2xl sm:text-3xl md:text-4xl font-black text-[#FCEE0A]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                <Counter value={stat.val} suffix={stat.suffix} />
              </div>
              <div className="text-[10px] tracking-[0.3em] uppercase mt-2 text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Journey Timeline ── */}
      <div className="flex flex-col gap-12">
        <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-[#00F0FF]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          [ STATUS_TRACE ]
        </h3>
        <div className="relative pl-10 border-l border-[#00F0FF44] space-y-12">
          {TIMELINE.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              {/* Node Dot */}
              <div className="absolute -left-[45px] top-1.5 w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]" />
              
              <div className="flex flex-col gap-2 p-6 bg-[#0a0a0a] border border-[#111] hover:border-[#00F0FF] transition-colors group"
                style={{ clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)' }}
              >
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-[#00F0FF] tracking-widest">{item.era}</span>
                  <span className="bg-white/5 px-2 py-0.5 text-gray-500">{item.log}</span>
                </div>
                <p className="text-sm text-gray-300 font-mono leading-relaxed mt-2 uppercase tracking-tight group-hover:text-white">
                  &gt; {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
