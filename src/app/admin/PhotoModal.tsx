"use client";

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
}

export default function PhotoModal({ isOpen, onClose, photos }: PhotoModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white absolute top-0 w-full z-10">
          <h3 className="font-semibold text-gray-900">
            Photo {currentIndex + 1} of {photos.length}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Container */}
        <div className="flex-1 bg-gray-50 flex items-center justify-center relative overflow-hidden mt-14">
          {photos.length > 0 && (
            <>
              <img 
                src={photos[currentIndex]} 
                alt={`Submission photo ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
              <div className="absolute top-4 left-4 bg-blue-600 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white z-10">
                {currentIndex + 1}
              </div>
            </>
          )}

          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              <button 
                onClick={handlePrev}
                className="absolute left-4 p-3 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow-lg transition-transform hover:scale-110 backdrop-blur-md"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={handleNext}
                className="absolute right-4 p-3 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow-lg transition-transform hover:scale-110 backdrop-blur-md"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {photos.length > 1 && (
          <div className="h-24 bg-white border-t border-gray-100 flex items-center px-4 gap-2 overflow-x-auto">
            {photos.map((photo, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                  currentIndex === idx ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={photo} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
