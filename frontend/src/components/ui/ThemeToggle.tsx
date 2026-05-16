'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  // Inisialisasi dari localStorage saat mount
  useEffect(() => {
    const saved = localStorage.getItem('gk_theme');
    const dark  = saved !== 'light';
    setIsDark(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    const theme = next ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gk_theme', theme);
  };

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            7,
        padding:        '5px 10px',
        background:     'var(--bg-elevated)',
        border:         '1px solid var(--border-bright)',
        borderRadius:   'var(--r-full)',
        cursor:         'pointer',
        fontSize:       'var(--text-xs)',
        fontFamily:     'var(--font)',
        fontWeight:     500,
        color:          'var(--text-secondary)',
        transition:     'all 0.2s ease',
        flexShrink:     0,
        whiteSpace:     'nowrap',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
    >
      {/* Track */}
      <div style={{
        width:        34,
        height:       18,
        borderRadius: 9,
        background:   isDark ? 'var(--primary)' : '#d0d0d0',
        position:     'relative',
        transition:   'background 0.25s ease',
        flexShrink:   0,
      }}>
        {/* Knob */}
        <div style={{
          position:     'absolute',
          top:          2,
          left:         isDark ? 18 : 2,
          width:        14,
          height:       14,
          borderRadius: '50%',
          background:   '#ffffff',
          transition:   'left 0.25s ease',
          boxShadow:    '0 1px 3px rgba(0,0,0,0.3)',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontSize:     8,
        }}>
          {/* Sun / Moon icon di dalam knob */}
          {isDark
            ? <span style={{ fontSize: 8, lineHeight: 1 }}>●</span>
            : <span style={{ fontSize: 8, lineHeight: 1 }}>○</span>
          }
        </div>
      </div>

      <span>{isDark ? 'Gelap' : 'Terang'}</span>
    </button>
  );
}
