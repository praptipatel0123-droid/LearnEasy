
import React, { useEffect, useRef } from 'react';
import p5 from 'p5';
import type { ProblemData } from '../lib/schema';

interface VisualizerProps {
  data: ProblemData;
}

const Visualizer: React.FC<VisualizerProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sketch = (p: p5) => {
      let time = 0;

      p.setup = () => {
        p.createCanvas(p.windowWidth > 800 ? 600 : p.windowWidth - 100, 300).parent(containerRef.current!);
      };

      p.draw = () => {
        p.background(250);
        
        // Draw Ground
        p.stroke(220);
        p.line(0, 250, p.width, 250);

        // Draw Objects (Trains/Tanks/etc)
        data.objects.forEach((obj, _index) => {
          const speed = obj.speed || 0;
          const direction = obj.direction === 'left' ? -1 : 1;
          const startX = obj.direction === 'left' ? p.width - 50 : 50;
          
          // Calculate Motion: Position = Start + (Speed * Time * Direction)
          let x = startX + (speed * time * direction * 0.5);

          // Wrap around screen correctly for both directions
          x = ((x % p.width) + p.width) % p.width;

          p.push();
          p.translate(x, 220);
          p.fill(obj.color || '#3b82f6');
          p.noStroke();
          
          // Draw a simple "Vehicle" shape
          p.rect(-20, 0, 40, 20, 5);
          p.fill(50);
          p.circle(-12, 22, 10);
          p.circle(12, 22, 10);
          
          // Label
          p.fill(0);
          p.textAlign(p.CENTER);
          p.text(obj.label, 0, -10);
          p.pop();
        });

        time += 0.05;
      };
    };

    const myP5 = new p5(sketch);
    return () => myP5.remove();
  }, [data]);

  return (
    <div className="w-full bg-white rounded-[2rem] border-4 border-white shadow-inner overflow-hidden flex justify-center p-4" ref={containerRef} />
  );
};

export default Visualizer;