import { useEffect, useState } from 'react'

type FontStyle = 'literary' | 'sans' | 'mono' | 'classic'

const OPTIONS: { value: FontStyle; label: string; title: string }[] = [
  { value: 'literary', label: 'Literary', title: 'Lora — warm serif' },
  { value: 'classic',  label: 'Classic',  title: 'Georgia — traditional serif' },
  { value: 'sans',     label: 'Sans',     title: 'System sans-serif — modern' },
  { value: 'mono',     label: 'Mono',     title: 'JetBrains Mono — technical' },
]

export function FontSelector() {
  const [fontStyle, setFontStyle] = useState<FontStyle>(
    () => (localStorage.getItem('font-style') as FontStyle) ?? 'literary'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-font', fontStyle)
    localStorage.setItem('font-style', fontStyle)
  }, [fontStyle])

  return (
    <select
      className="font-selector"
      value={fontStyle}
      onChange={e => setFontStyle(e.target.value as FontStyle)}
      title="Font style"
    >
      {OPTIONS.map(o => (
        <option key={o.value} value={o.value} title={o.title}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
