/**
 * NEXA // AMBIENT BACKGROUND
 * Lightweight canvas starfield + neural connecting lines + drifting core dust.
 * GPU friendly (single canvas, requestAnimationFrame, capped particles) and
 * fully static when the user prefers reduced motion.
 */

import React, { useEffect, useRef } from 'react';
import { useNexaSystem } from '../state/NexaSystemContext';
import { nexaSystem } from '../state/nexaSystem';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  twinkle: number;
  phase: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
}

export const NexaBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { settings } = useNexaSystem();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const preferredReduced = settings.reducedMotion;
    const intensity = settings.animationIntensity;
    const reduced = preferredReduced || intensity === 'minimal';
    const densityFactor = intensity === 'cinematic' ? 1.4 : intensity === 'minimal' ? 0.5 : 1.0;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let stars: Star[] = [];
    let rafId = 0;
    let running = true;

    const countFor = (area: number, per: number) =>
      Math.max(8, Math.min(90, Math.round(area / per * densityFactor)));

    const seed = () => {
      const area = Math.max(1, width * height);
      const particleCount = reduced ? 0 : countFor(area, 26000);
      const starCount = Math.max(12, Math.min(64, Math.round(area / 42000 * densityFactor)));
      particles = [];
      stars = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          r: 0.6 + Math.random() * 1.3,
          twinkle: 0.4 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2
        });
      }
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: 0.4 + Math.random() * 1.1,
          phase: Math.random() * Math.PI * 2
        });
      }
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const drawStars = (t: number) => {
      if (reduced) {
        for (const star of stars) {
          ctx.fillStyle = 'rgba(190, 225, 255, 0.5)';
          ctx.fillRect(star.x, star.y, star.r, star.r);
        }
        return;
      }
      for (const star of stars) {
        const alpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.0012 + star.phase));
        ctx.fillStyle = `rgba(190, 225, 255, ${alpha.toFixed(3)})`;
        ctx.fillRect(star.x, star.y, star.r, star.r);
      }
    };

    const drawParticles = (t: number) => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -8) p.x = width + 8;
        if (p.x > width + 8) p.x = -8;
        if (p.y < -8) p.y = height + 8;
        if (p.y > height + 8) p.y = -8;
        const alpha = p.twinkle * (0.5 + 0.5 * Math.sin(t * 0.0016 + p.phase));
        ctx.fillStyle = `rgba(120, 220, 255, ${alpha.toFixed(3)})`;
        ctx.fillRect(p.x, p.y, p.r, p.r);
      }

      // Neural connections between nearby particles
      const maxDist = 120;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxDist * maxDist) {
            const alpha = (1 - Math.sqrt(distSq) / maxDist) * 0.14;
            ctx.strokeStyle = `rgba(90, 200, 255, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    };

    let suspended = false;

    const frame = (time: number) => {
      if (!running || suspended) return;
      ctx.clearRect(0, 0, width, height);
      drawStars(time);
      if (!reduced) drawParticles(time);
      rafId = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      if (document.hidden) {
        suspended = true;
        cancelAnimationFrame(rafId);
      } else if (suspended && !reduced) {
        suspended = false;
        rafId = requestAnimationFrame(frame);
      }
    };

    resize();
    if (reduced) {
      // Draw a single static frame
      drawStars(0);
    } else {
      rafId = requestAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', resize);
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
    };
  }, [settings.reducedMotion, settings.animationIntensity]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="nexa-bg-canvas" />
      <div aria-hidden="true" className="nexa-bg-grid" />
      <div aria-hidden="true" className="nexa-bg-scan" />
      <div aria-hidden="true" className="nexa-bg-vignette" />
    </>
  );
};