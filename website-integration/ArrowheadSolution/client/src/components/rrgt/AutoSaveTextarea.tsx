import { useEffect, useRef, useState } from 'react';

interface AutoSaveTextareaProps {
  initialValue: string;
  onSave: (value: string) => void;
}

/**
 * Auto-saving textarea for RRGT subtasks.
 *
 * - Local state for immediate typing feedback
 * - Debounced save after 1s of inactivity
 * - Immediate save on blur
 */
export function AutoSaveTextarea({ initialValue, onSave }: AutoSaveTextareaProps) {
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
    onSave(value);
  };

  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-sm"
      rows={1}
      spellCheck={false}
    />
  );
}
