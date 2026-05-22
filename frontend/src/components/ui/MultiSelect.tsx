import { useEffect, useRef, useState } from 'react'
import styles from './MultiSelect.module.css'

interface Option {
  value: string | number
  label: string
}

interface Props {
  options: Option[]
  selected: (string | number)[]
  onChange: (selected: (string | number)[]) => void
  placeholder?: string
  disabled?: boolean
  fullWidth?: boolean
}

export default function MultiSelect({ options, selected, onChange, placeholder = 'Select…', disabled, fullWidth }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function toggle(value: string | number) {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? options.find(o => o.value === selected[0])?.label ?? placeholder
      : `${selected.length} selected`

  return (
    <div className={`${styles.wrapper} ${disabled ? styles.disabled : ''} ${fullWidth ? styles.fullWidth : ''}`} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <span className={selected.length ? styles.labelActive : styles.labelPlaceholder}>{label}</span>
        <span className={`${styles.chevron} ${open ? styles.open : ''}`}>▾</span>
      </button>

      {open && !disabled && (
        <div className={styles.dropdown}>
          {selected.length > 0 && (
            <button className={styles.deselectAll} onClick={() => onChange([])}>
              Deselect all
            </button>
          )}
          {options.length === 0 && <p className={styles.empty}>No options available</p>}
          {options.map(opt => (
            <label key={opt.value} className={styles.option}>
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
