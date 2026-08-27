import type { InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function Field({ label, id, ...inputProps }: FieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} {...inputProps} />
    </div>
  );
}
