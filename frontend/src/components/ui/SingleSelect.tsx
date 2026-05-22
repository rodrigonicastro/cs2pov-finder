import { useEffect, useRef, useState } from 'react'
import styles from './MultiSelect.module.css'

interface Option {
  value: string
  label: string
}

interface Props {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  fullWidth?: boolean
}

export default function SingleSelect({ options, value, onChange, placeholder = 'Select…', disabled, fullWidth }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const selected = options.find(o => o.value === value)

  function pick(val: string) {
    onChange(val)
    setOpen(false)
  }

  return (
    <div className={`${styles.wrapper} ${disabled ? styles.disabled : ''} ${fullWidth ? styles.fullWidth : ''}`} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <span className={selected ? styles.labelActive : styles.labelPlaceholder}>
          {selected ? selected.label : placeholder}
        </span>
        <span className={`${styles.chevron} ${open ? styles.open : ''}`}>▾</span>
      </button>

      {open && !disabled && (
        <div className={styles.dropdown}>
          <label className={styles.option} onClick={() => pick('')}>
            <span className={!value ? styles.labelActive : styles.labelPlaceholder}>{placeholder}</span>
          </label>
          {options.map(opt => (
            <label key={opt.value} className={styles.option} onClick={() => pick(opt.value)}>
              <span className={value === opt.value ? styles.labelActive : styles.labelPlaceholder}>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
