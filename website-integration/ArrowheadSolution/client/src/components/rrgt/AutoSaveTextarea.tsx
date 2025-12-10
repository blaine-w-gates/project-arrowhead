import { useEffect, useRef, useState } from 'react';

interface AutoSaveTextareaProps {
  initialValue: string;
  onSave: (value: string) => void;
  disabled?: boolean;
}

/**
 * Auto-saving textarea for RRGT subtasks.
 *
 * - Local state for immediate typing feedback
 * - Debounced save after 1s of inactivity
 * - Immediate save on blur
 */
export function AutoSaveTextarea({ initialValue, onSave, disabled }: AutoSaveTextareaProps) {
  const [value, setValue] = useState(initialValue);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      onSave(value);
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, onSave]);

  const handleBlur = () => {
    if (disabled) return;
    onSave(value);
  };

  return (
    <textarea
      value={value}
      onChange={disabled ? undefined : (e) => setValue(e.target.value)}
      onBlur={disabled ? undefined : handleBlur}
      readOnly={disabled}
      className={
        "w-full h-full bg-transparent border-none resize-none focus:outline-none text-sm" +
        (disabled ? " pointer-events-none cursor-pointer select-none" : "")
      }
      rows={1}
      spellCheck={false}
    />
  );
}
