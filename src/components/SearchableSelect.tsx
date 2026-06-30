'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Option {
  code: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  name,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync search input with selected value when closed
  const selectedOption = options.find((opt) => opt.code === value);
  
  useEffect(() => {
    if (!isOpen) {
      setSearch(selectedOption ? selectedOption.label : '');
    }
  }, [isOpen, selectedOption]);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Hidden input to ensure native form submission works if needed */}
      <input type="hidden" name={name} value={value} />
      
      <div 
        className={`w-full h-[42px] relative flex items-center bg-white border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors ${
          disabled ? 'bg-gray-100 opacity-70 cursor-not-allowed' : 'cursor-text'
        }`}
        onClick={() => {
          if (!disabled) setIsOpen(true);
        }}
      >
        <input
          type="text"
          className="w-full h-full pl-3 pr-10 bg-transparent text-gray-900 font-medium outline-none placeholder:font-normal placeholder:text-gray-400 disabled:cursor-not-allowed"
          placeholder={placeholder}
          value={isOpen ? search : (selectedOption?.label || '')}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
            // If user deletes everything, clear the selected value
            if (e.target.value === '') {
               onChange('');
            }
          }}
          disabled={disabled}
        />
        
        <div className="absolute right-2 flex items-center gap-1 text-gray-400">
          {value && !disabled && (
            <button
              type="button"
              className="p-1 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearch('');
                setIsOpen(true);
              }}
            >
              <X size={14} />
            </button>
          )}
          <div className={`p-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No results found
            </div>
          ) : (
            <ul className="py-1">
              {filteredOptions.map((opt) => (
                <li
                  key={opt.code}
                  className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                    value === opt.code
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    onChange(opt.code);
                    setSearch(opt.label);
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
