import React, { useEffect, useMemo, useRef, useState } from 'react';

const AutocompleteInput = ({
  value,
  onChange,
  options = [],
  placeholder,
  label,
  required = true
}) => {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const safeValue = value || '';

  const normalizedOptions = useMemo(() => {
    const unique = [...new Set(options.map((opt) => String(opt).trim()).filter(Boolean))];
    return unique;
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!safeValue.trim()) return normalizedOptions;

    return normalizedOptions.filter((opt) =>
      opt.toLowerCase().includes(safeValue.toLowerCase())
    );
  }, [normalizedOptions, safeValue]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedValue) => {
    onChange(selectedValue);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className="block text-xs font-semibold text-[#2F2F2F] mb-1">
        {label}
      </label>

      <input
        ref={inputRef}
        type="text"
        required={required}
        value={safeValue}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full p-2.5 rounded-lg border border-zinc-300 text-sm outline-none focus:border-orange-500 text-zinc-800 bg-white"
      />

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => (
              <button
                key={`${opt}-${index}`}
                type="button"
                onClick={() => handleSelect(opt)}
                className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 hover:bg-orange-50 hover:text-orange-700 border-b border-zinc-50 last:border-b-0"
              >
                {opt}
              </button>
            ))
          ) : (
            <div className="p-3 text-xs text-zinc-500">
              <span className="font-semibold text-orange-600">"{safeValue}"</span> será salvo para uso futuro.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;