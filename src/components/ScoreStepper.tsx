import { Minus, Plus } from 'lucide-react'

type ScoreStepperProps = {
  label: string
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}

export function ScoreStepper({ label, value, disabled = false, onChange }: ScoreStepperProps) {
  return (
    <div className="score-stepper">
      <span>{label}</span>
      <div>
        <button disabled={disabled} onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Decrease ${label}`}>
          <Minus size={18} />
        </button>
        <input
          aria-label={`${label} score`}
          inputMode="numeric"
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
        />
        <button disabled={disabled} onClick={() => onChange(value + 1)} aria-label={`Increase ${label}`}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}
