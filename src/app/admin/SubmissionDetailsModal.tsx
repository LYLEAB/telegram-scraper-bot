"use client";

import { useState } from 'react';
import { X, MapPin, User, Tag, DollarSign, Store, Info, Calendar, ImageIcon } from 'lucide-react';
import PhotoModal from './PhotoModal';

interface SubmissionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: any;
}

export default function SubmissionDetailsModal({ isOpen, onClose, submission }: SubmissionDetailsModalProps) {
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  if (!isOpen || !submission) return null;

  const parseScheme = (schemeString: string) => {
    if (!schemeString) return { scheme: '—', foc: '—' };
    const plusMatch = schemeString.match(/^(\d+)\s*\+\s*(\d+)$/);
    if (plusMatch) return { scheme: plusMatch[1], foc: plusMatch[2] };
    return { scheme: schemeString, foc: '—' };
  };

  let computedNetPrice = submission.net_price;
  if (!computedNetPrice && submission.basic_price && submission.scheme) {
    const { scheme, foc } = parseScheme(submission.scheme);
    if (scheme !== '—' && foc !== '—') {
      const s = Number(scheme);
      const f = Number(foc);
      if (s > 0) {
        computedNetPrice = ((Number(submission.basic_price) * s) / (s + f)).toFixed(2);
      }
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#111C44] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0B1437]/50">
          <div className="flex items-center gap-3">
            <div className="bg-brand/10 text-brand p-2 rounded-lg">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy dark:text-white">Submission Details</h2>
              <p className="text-sm text-[#A3AED0]">
                Submitted on {new Date(submission.phnom_penh_time || submission.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[#A3AED0] hover:text-navy dark:hover:text-white hover:bg-[#F4F7FE] dark:hover:bg-[#0B1437] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Staff Info */}
          <section>
            <h3 className="text-sm font-semibold text-[#A3AED0] uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Staff Information
            </h3>
            <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-4 border border-gray-100 dark:border-gray-800">
              <p className="text-navy dark:text-white font-medium">{submission.submitted_by}</p>
            </div>
          </section>

          {/* Product Details */}
          <section>
            <h3 className="text-sm font-semibold text-[#A3AED0] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Product Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="block text-xs text-[#A3AED0] mb-1">Category</span>
                <span className="font-medium text-navy dark:text-white">{submission.category_label || '-'}</span>
              </div>
              <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="block text-xs text-[#A3AED0] mb-1">Brand</span>
                <span className="font-medium text-navy dark:text-white">{submission.brand_label || '-'}</span>
              </div>
              <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="block text-xs text-[#A3AED0] mb-1">Type</span>
                <span className="font-medium text-navy dark:text-white">{submission.type_label || '-'}</span>
              </div>
            </div>
          </section>

          {/* Territory & Location */}
          <section>
            <h3 className="text-sm font-semibold text-[#A3AED0] uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Territory & Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="block text-xs text-[#A3AED0] mb-1">Region</span>
                <span className="font-medium text-navy dark:text-white">{submission.region_label || '-'}</span>
              </div>
              <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="block text-xs text-[#A3AED0] mb-1">Dealer</span>
                <span className="font-medium text-navy dark:text-white">{submission.dealer_label || '-'}</span>
              </div>
              <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="block text-xs text-[#A3AED0] mb-1">Province</span>
                <span className="font-medium text-navy dark:text-white">{submission.province_label || '-'}</span>
              </div>
              <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="block text-xs text-[#A3AED0] mb-1">District</span>
                <span className="font-medium text-navy dark:text-white">{submission.district_label || '-'}</span>
              </div>
              <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="block text-xs text-[#A3AED0] mb-1">Commune</span>
                <span className="font-medium text-navy dark:text-white">{submission.commune || '-'}</span>
              </div>
              <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="block text-xs text-[#A3AED0] mb-1">Village</span>
                <span className="font-medium text-navy dark:text-white">{submission.village || '-'}</span>
              </div>
            </div>
            {(submission.lat && submission.lng) && (
              <div className="bg-brand/10 rounded-lg p-3 border border-brand/20 flex items-center gap-2">
                <span className="block text-xs text-brand font-medium">GPS:</span>
                <span className="font-mono text-sm text-brand">{submission.lat}, {submission.lng}</span>
              </div>
            )}
          </section>

          {/* Channel Setup */}
          <section>
            <h3 className="text-sm font-semibold text-[#A3AED0] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Store className="w-4 h-4" /> Channel Setup
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="block text-xs text-[#A3AED0] mb-1">Main Channel</span>
                <span className="font-medium text-navy dark:text-white">{submission.channel_label || '-'}</span>
              </div>
              <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="block text-xs text-[#A3AED0] mb-1">Sub Channel</span>
                <span className="font-medium text-navy dark:text-white">{submission.sub_channel_label || '-'}</span>
              </div>
            </div>
          </section>

          {/* Pricing Data */}
          <section>
            <h3 className="text-sm font-semibold text-[#A3AED0] uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Pricing Data
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="block text-xs text-[#A3AED0] mb-1">Scheme (Promotion)</span>
                <span className="font-medium text-navy dark:text-white">{submission.scheme || '-'}</span>
              </div>
              <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="block text-xs text-[#A3AED0] mb-1">Price Source</span>
                <span className="font-medium text-navy dark:text-white">{submission.price_source_label || '-'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-3 border border-green-100 dark:border-green-500/20">
                <span className="block text-xs text-green-600 dark:text-green-400 mb-1">Basic Price</span>
                <span className="font-bold text-green-700 dark:text-green-300">${submission.basic_price || '-'}</span>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 border border-blue-100 dark:border-blue-500/20">
                <span className="block text-xs text-blue-600 dark:text-blue-400 mb-1">Net Price</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">${computedNetPrice || '-'}</span>
              </div>
              <div className="bg-orange-50 dark:bg-orange-500/10 rounded-lg p-3 border border-orange-100 dark:border-orange-500/20">
                <span className="block text-xs text-orange-600 dark:text-orange-400 mb-1">To Seller</span>
                <span className="font-bold text-orange-700 dark:text-orange-300">${submission.sellout_price_seller || '-'}</span>
              </div>
              <div className="bg-purple-50 dark:bg-purple-500/10 rounded-lg p-3 border border-purple-100 dark:border-purple-500/20">
                <span className="block text-xs text-purple-600 dark:text-purple-400 mb-1">To Consumer Ctn</span>
                <span className="font-bold text-purple-700 dark:text-purple-300">${submission.sellout_price_consumer || '-'}</span>
              </div>
              <div className="bg-pink-50 dark:bg-pink-500/10 rounded-lg p-3 border border-pink-100 dark:border-pink-500/20">
                <span className="block text-xs text-pink-600 dark:text-pink-400 mb-1">To Consumer Can</span>
                <span className="font-bold text-pink-700 dark:text-pink-300">${submission.sellout_price_consumer_can || '-'}</span>
              </div>
            </div>
          </section>

          {/* Notes */}
          {submission.note && (
            <section>
              <h3 className="text-sm font-semibold text-[#A3AED0] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" /> Notes
              </h3>
              <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-lg p-4 border border-yellow-100 dark:border-yellow-500/20">
                <p className="text-gray-800 dark:text-yellow-100 whitespace-pre-wrap">{submission.note}</p>
              </div>
            </section>
          )}

          {/* Photos */}
          {submission.photo_url && (
            <section>
              <h3 className="text-sm font-semibold text-[#A3AED0] uppercase tracking-wider mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Photos
              </h3>
              <div className="flex flex-wrap justify-center gap-4">
                {submission.photo_url.split(',').map((url: string, index: number) => (
                  <button 
                    key={index}
                    onClick={() => {
                      const allUrls = submission.photo_url.split(',');
                      setSelectedPhotos([url, ...allUrls.filter((u: string) => u !== url)]);
                      setIsPhotoModalOpen(true);
                    }}
                    className="block relative w-32 sm:w-40 md:w-48 aspect-[3/4] rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:opacity-90 transition group bg-gray-50 dark:bg-gray-800/50 shadow-sm"
                  >
                    <img 
                      src={url} 
                      alt={`Submission photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white font-medium text-sm drop-shadow-md bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-opacity">View Full</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
      
      <PhotoModal 
        isOpen={isPhotoModalOpen} 
        onClose={() => setIsPhotoModalOpen(false)} 
        photos={selectedPhotos} 
      />
    </div>
  );
}
