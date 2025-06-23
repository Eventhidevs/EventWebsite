import { useState } from "react";

const TIME_SLOTS = [
  { label: "Before 6 am", value: "before6" },
  { label: "6 am – 12 pm", value: "morning" },
  { label: "12 pm – 6 pm", value: "afternoon" },
  { label: "After 6 pm", value: "after6" },
];

interface TimeOfDayFilterProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  dropdownClassName?: string;
}

export default function TimeOfDayFilter({ value, onChange, className = '', dropdownClassName = '' }: TimeOfDayFilterProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative w-full ${className}`}>
      <button
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white flex items-center justify-between focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>{value ? TIME_SLOTS.find(s => s.value === value)?.label : "Time of Day"}</span>
        <svg className="w-4 h-4 ml-2 text-gray-400" viewBox="0 0 20 20" fill="none"><path d="M5.5 8l4.5 4.5L14.5 8" stroke="currentColor" strokeWidth="2" /></svg>
      </button>
      {open && (
        <div className={`absolute z-10 mt-1 left-0 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex flex-col gap-1 ${dropdownClassName}`} style={{ minWidth: '100%' }}>
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot.value}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition font-medium
                ${value === slot.value ? "bg-blue-100 border-blue-500 text-blue-700" : "hover:bg-gray-100 border-gray-200 text-gray-900"}
              `}
              onClick={() => { onChange(slot.value); setOpen(false); }}
              type="button"
            >
              {slot.label}
            </button>
          ))}
          {value && (
            <button
              className="mt-1 text-xs text-red-500 hover:underline text-left px-3"
              onClick={() => { onChange(""); setOpen(false); }}
              type="button"
            >
              Clear Time Filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
