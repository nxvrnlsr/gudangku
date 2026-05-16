'use client';
import { IconChevronRight } from '@/components/ui/Icons';

interface Props {
  value: string | number;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  textAlign?: 'left' | 'right' | 'center';
}

export default function NumberInput({
  value, onChange, min, max, step = 1,
  placeholder = '0', className, style, disabled, textAlign = 'right',
}: Props) {
  const numVal  = parseFloat(String(value)) || 0;
  const canDown = min === undefined || numVal - step >= min;
  const canUp   = max === undefined || numVal + step <= max;

  const increment = () => {
    if (!canUp) return;
    onChange(String(+(numVal + step).toFixed(10)));
  };
  const decrement = () => {
    if (!canDown) return;
    onChange(String(+(numVal - step).toFixed(10)));
  };

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-bright)',
        borderRadius: 'var(--r-sm)',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        ...style,
      }}
      onFocusCapture={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor  = 'var(--primary)';
        (e.currentTarget as HTMLDivElement).style.boxShadow   = '0 0 0 3px var(--primary-glow)';
      }}
      onBlurCapture={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor  = 'var(--border-bright)';
        (e.currentTarget as HTMLDivElement).style.boxShadow   = 'none';
      }}
    >
      {/* ── Input ─────────────────────────────── */}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '8px 10px',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 'var(--text-base)',
          fontFamily: 'var(--font)',
          color: 'var(--text-primary)',
          textAlign,
          /* hide native spinners — all browsers */
          MozAppearance: 'textfield',
          WebkitAppearance: 'none',
        } as React.CSSProperties}
      />

      {/* ── Spinner Column ────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* Up */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || !canUp}
          onClick={increment}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            color: canUp && !disabled ? 'var(--text-secondary)' : 'var(--text-muted)',
            cursor: canUp && !disabled ? 'pointer' : 'not-allowed',
            transition: 'background 0.1s, color 0.1s',
            padding: 0,
          }}
          onMouseEnter={e => { if (canUp && !disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = canUp && !disabled ? 'var(--text-secondary)' : 'var(--text-muted)'; }}
        >
          {/* Rotated chevron as up arrow */}
          <span style={{ display: 'flex', transform: 'rotate(-90deg)' }}>
            <IconChevronRight size={10} />
          </span>
        </button>

        {/* Down */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || !canDown}
          onClick={decrement}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            background: 'transparent',
            border: 'none',
            color: canDown && !disabled ? 'var(--text-secondary)' : 'var(--text-muted)',
            cursor: canDown && !disabled ? 'pointer' : 'not-allowed',
            transition: 'background 0.1s, color 0.1s',
            padding: 0,
          }}
          onMouseEnter={e => { if (canDown && !disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = canDown && !disabled ? 'var(--text-secondary)' : 'var(--text-muted)'; }}
        >
          <span style={{ display: 'flex', transform: 'rotate(90deg)' }}>
            <IconChevronRight size={10} />
          </span>
        </button>
      </div>
    </div>
  );
}
