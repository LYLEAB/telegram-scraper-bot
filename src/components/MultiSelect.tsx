"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

export default function MultiSelect({ options, selectedValues, onChange, placeholder }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] py-2.5 px-4 text-sm font-medium text-navy dark:text-white outline-none focus:ring-2 focus:ring-[#E41E26]/30"
      >
        <span className="truncate">
          {selectedValues.length === 0 
            ? placeholder 
            : selectedValues.length === 1 
              ? selectedValues[0] 
              : `${selectedValues.length} selected`}
        </span>
        <div className="flex items-center gap-1">
          {selectedValues.length > 0 && (
            <div 
              onClick={clearAll}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full cursor-pointer text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </div>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#111C44] border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-gray-400 text-center">No options</div>
          ) : (
            options.map(option => {
              const isSelected = selectedValues.includes(option);
              return (
                <div
                  key={option}
                  onClick={() => toggleOption(option)}
                  className="flex items-center gap-2 px-4 py-2.5 hover:bg-[#F4F7FE] dark:hover:bg-[#0B1437] cursor-pointer text-sm text-navy dark:text-white"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-[#E41E26] border-[#E41E26]' : 'border-gray-300 dark:border-gray-600'}`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="truncate">{option}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
