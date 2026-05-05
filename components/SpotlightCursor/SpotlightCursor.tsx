import { useEffect, useRef } from 'react';
import styles from './SpotlightCursor.module.css';

export default function SpotlightCursor() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!spotlightRef.current) return;

      const x = e.clientX;
      const y = e.clientY;

      spotlightRef.current.style.background = `radial-gradient(
        600px circle at ${x}px ${y}px,
        rgba(99, 102, 241, 0.15),
        transparent 40%
      )`;
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return <div ref={spotlightRef} className={styles.spotlight} />;
}
