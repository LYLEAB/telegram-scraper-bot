'use client';

import { useState, useEffect } from 'react';
import { MapPin, User, Tag, DollarSign, Target, Send, Navigation, Store, Boxes, LayoutGrid, Info, Check, Camera } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('./MapPicker'), { 
  ssr: false, 
  loading: () => <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-sm text-gray-500 rounded-xl">Loading map...</div> 
});

export default function Form({ options }: { options: any }) {
  const [formData, setFormData] = useState({
    submitted_by: '',
    category_code: '',
    brand_code: '',
    type_select_code: '',
    region_code: '',
    dealer_code: '',
    province_code: '',
    district_code: '',
    commune: '',
    village: '',
    channel_code: '',
    sub_channel_code: '',
    scheme: '',
    basic_price: '',
    price_source_code: '',
    net_price: '',
    sellout_price_seller: '',
    sellout_price_consumer: '',
    sellout_price_consumer_can: '',
    note: '',
  });

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  const [photoBase64s, setPhotoBase64s] = useState<string[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          setLocError('Failed to get location: ' + error.message);
        }
      );
    } else {
      setLocError('Geolocation is not supported by your browser.');
    }
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    if (name === 'category_code') {
      setFormData(prev => ({ ...prev, category_code: value, brand_code: '' }));
    } else if (name === 'region_code') {
      setFormData(prev => ({ ...prev, region_code: value, dealer_code: '' }));
    } else if (name === 'province_code') {
      setFormData(prev => ({ ...prev, province_code: value, district_code: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: any) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const readers = files.map((file: any) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });
      Promise.all(readers).then(base64Array => {
        setPhotoBase64s(prev => [...prev, ...base64Array]);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotoBase64s(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!formData.brand_code) {
      alert("Please select a Brand before submitting.");
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const { category_code, ...payloadBase } = formData;
      const payload = {
        ...payloadBase,
        submission_date: new Date().toISOString().split('T')[0],
        lat: location?.lat || null,
        lng: location?.lng || null,
        basic_price: Number(formData.basic_price) || null,
        net_price: Number(formData.net_price) || null,
        sellout_price_seller: Number(formData.sellout_price_seller) || null,
        sellout_price_consumer: Number(formData.sellout_price_consumer) || null,
        sellout_price_consumer_can: Number(formData.sellout_price_consumer_can) || null,
        photoBase64s, 
      };

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to submit');
      }

      setSuccess(true);
      setHasSubmitted(true);
      // Reset only the pricing and note fields so they can submit another easily
      setFormData({
        ...formData,
        scheme: '',
        basic_price: '',
        net_price: '',
        sellout_price_seller: '',
        sellout_price_consumer: '',
        sellout_price_consumer_can: '',
        note: '',
      });
      setPhotoBase64s([]);
      
      // Clear file input
      const fileInput = document.getElementById('photo_upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      alert('Error submitting form');
    } finally {
      setLoading(false);
    }
  };

  // Filtered dropdown lists based on cascades
  const filteredBrands = formData.category_code
    ? options.brands.filter((b: any) => b.category_code === formData.category_code)
    : [];
    
  const filteredDealers = formData.region_code
    ? options.dealers.filter((d: any) => d.region_code === formData.region_code)
    : [];

  const filteredDistricts = formData.province_code
    ? options.districts.filter((d: any) => d.province_code === formData.province_code)
    : [];

  // Channel Logic
  const selectedChannel = options.channels.find((c: any) => c.code === formData.channel_code);
  const isOffTrade = selectedChannel && selectedChannel.label.toLowerCase().includes('off-trade');

  return (
    <>
      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center transform transition-all scale-in-90">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Success!</h3>
            <p className="text-gray-500 mb-6">Pricing data has been submitted and sent to Telegram.</p>
            <button 
              type="button"
              onClick={() => setSuccess(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 pb-24">
        {/* Staff Info */}
        {!hasSubmitted ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2 rounded-t-xl">
              <User className="text-gray-500 w-5 h-5" />
              <h2 className="font-semibold text-gray-700">Staff Information</h2>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Submitted by</label>
              <input
                type="text"
                name="submitted_by"
                placeholder="e.g., Ly Leab"
                value={formData.submitted_by}
                onChange={handleChange}
                className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:font-normal placeholder:text-gray-400"
              />
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 text-blue-900 px-4 py-3 rounded-xl flex items-center justify-between border border-blue-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <User size={18} className="text-blue-700" />
              </div>
              <div>
                <p className="text-xs text-blue-600/80 font-medium uppercase tracking-wider">Logged in as</p>
                <p className="font-bold text-sm">{formData.submitted_by}</p>
              </div>
            </div>
            <button type="button" onClick={() => setHasSubmitted(false)} className="text-sm font-medium text-blue-600 hover:text-blue-800 underline">
              Change
            </button>
          </div>
        )}

        {/* Product Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 relative">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2 rounded-t-xl">
            <Tag className="text-gray-500 w-5 h-5" />
            <h2 className="font-semibold text-gray-700">Promotion Of</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select name="category_code" value={formData.category_code} onChange={handleChange} className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="" className="text-gray-500 font-normal">Select Category...</option>
                {options.categories?.map((c: any) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <SearchableSelect
                  name="brand_code"
                  options={filteredBrands}
                  value={formData.brand_code}
                  onChange={(val) => handleSelectChange('brand_code', val)}
                  placeholder={formData.category_code ? "Type to search brand..." : "Select Category first"}
                  disabled={!formData.category_code}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                <select name="type_select_code" value={formData.type_select_code} onChange={handleChange} className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="" className="text-gray-500 font-normal">Select Type...</option>
                  {options.types.map((t: any) => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Territory & Location */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 relative">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2 rounded-t-xl">
            <MapPin className="text-gray-500 w-5 h-5" />
            <h2 className="font-semibold text-gray-700">Territory & Location</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-700 mb-1">Region <span className="text-gray-400 text-xs font-normal whitespace-nowrap">(សូមជ្រើសរើសតំបន់)</span></label>
                <select name="region_code" value={formData.region_code} onChange={handleChange} className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="" className="text-gray-500 font-normal">Select Region...</option>
                  {options.regions.map((r: any) => <option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dealer <span className="text-gray-400 text-xs font-normal whitespace-nowrap">(សូមជ្រើសរើសដេប៉ូ)</span></label>
                <SearchableSelect
                  name="dealer_code"
                  options={filteredDealers}
                  value={formData.dealer_code}
                  onChange={(val) => handleSelectChange('dealer_code', val)}
                  placeholder={formData.region_code ? "Type to search dealer..." : "Select Region first"}
                  disabled={!formData.region_code}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-700 mb-1">Province <span className="text-gray-400 text-xs font-normal whitespace-nowrap">(សូមជ្រើសរើសខេត្ត)</span></label>
                <select name="province_code" value={formData.province_code} onChange={handleChange} className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="" className="text-gray-500 font-normal">Select Province...</option>
                  {options.provinces.map((p: any) => <option key={p.code} value={p.code}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District <span className="text-gray-400 text-xs font-normal whitespace-nowrap">(សូមជ្រើសរើសស្រុក)</span></label>
                <SearchableSelect
                  name="district_code"
                  options={filteredDistricts}
                  value={formData.district_code}
                  onChange={(val) => handleSelectChange('district_code', val)}
                  placeholder={formData.province_code ? "Type to search district..." : "Select Province first"}
                  disabled={!formData.province_code}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commune <span className="text-gray-400 text-xs font-normal whitespace-nowrap">(សូមបំពេញឈ្មោះឃុំ)</span></label>
                <input type="text" name="commune" value={formData.commune} onChange={handleChange} placeholder="Enter Commune" className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Village <span className="text-gray-400 text-xs font-normal whitespace-nowrap">(សូមបំពេញឈ្មោះភូមិ)</span></label>
                <input type="text" name="village" value={formData.village} onChange={handleChange} placeholder="Enter Village" className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            
            <div className="mt-4 pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">GPS Location</label>
                {location && <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}</span>}
              </div>
              
              <MapPicker 
                value={location} 
                onChange={(loc) => setLocation(loc)} 
              />
              {!location && <p className="text-orange-500 text-xs mt-2">{locError || 'Waiting for GPS...'}</p>}
            </div>
          </div>
        </div>

        {/* Channel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2 rounded-t-xl">
            <Store className="text-gray-500 w-5 h-5" />
            <h2 className="font-semibold text-gray-700">Channel Setup</h2>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Main Channel <span className="text-gray-400 text-xs font-normal whitespace-nowrap">(សូមជ្រើសរើស Channel)</span></label>
              <select name="channel_code" value={formData.channel_code} onChange={handleChange} className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="" className="text-gray-500 font-normal">Select Channel...</option>
                {options.channels.map((c: any) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            {!isOffTrade ? null : (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-1">Sub Channel</label>
                <select name="sub_channel_code" value={formData.sub_channel_code} onChange={handleChange} className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="" className="text-gray-500 font-normal">Select Sub Channel...</option>
                  {options.subChannels.map((sc: any) => <option key={sc.code} value={sc.code}>{sc.label}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Data */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between rounded-t-xl">
            <div className="flex items-center gap-2">
              <DollarSign className="text-gray-500 w-5 h-5" />
              <h2 className="font-semibold text-gray-700">Pricing Data</h2>
            </div>
            <span className="text-xs font-medium text-gray-500 px-2">Auto-detects USD ($) or KHR (៛)</span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheme (Promotion)</label>
              <input type="text" name="scheme" placeholder="e.g., 1000+115+1Bike" value={formData.scheme} onChange={handleChange} className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:font-normal placeholder:text-gray-400" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-700 mb-1">Basic Price <span className="text-gray-400 text-xs font-normal whitespace-nowrap">(តម្លៃដើម)</span></label>
                <input type="number" step="any" name="basic_price" value={formData.basic_price} onChange={handleChange} className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Source <span className="text-gray-400 text-xs font-normal whitespace-nowrap">(តម្លៃដើមមកពី Wholesale/Company)</span></label>
                <select name="price_source_code" value={formData.price_source_code} onChange={handleChange} className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="" className="text-gray-500 font-normal">Select Source...</option>
                  {options.priceSources.map((ps: any) => <option key={ps.code} value={ps.code}>{ps.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-700 mb-1">Net Price <span className="text-gray-400 text-xs font-normal whitespace-nowrap">(តម្លៃចែកដាច់)</span></label>
                <input type="number" step="any" name="net_price" value={formData.net_price} onChange={handleChange} className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-700 mb-1">Sellout To Seller <span className="text-gray-400 text-xs font-normal whitespace-nowrap">(លក់អោយទៅម៉ូយជាអ្នកលក់)</span></label>
                <input type="number" step="any" name="sellout_price_seller" value={formData.sellout_price_seller} onChange={handleChange} className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-700 mb-1">Sellout to Enconsumer Per Ctn <span className="text-gray-400 text-xs font-normal whitespace-nowrap">(លក់អោយទៅអ្នកផឹកក្នុងមួយកេស)</span></label>
                <input type="number" step="any" name="sellout_price_consumer" value={formData.sellout_price_consumer} onChange={handleChange} className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-700 mb-1">Sellout to Enconsumer Per Can <span className="text-gray-400 text-xs font-normal whitespace-nowrap">(លក់អោយទៅអ្នកផឹកក្នុងមួយកំប៉ុង)</span></label>
                <input type="number" step="any" name="sellout_price_consumer_can" value={formData.sellout_price_consumer_can} onChange={handleChange} className="w-full h-[42px] px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Note and Photo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2 rounded-t-xl">
            <Info className="text-gray-500 w-5 h-5" />
            <h2 className="font-semibold text-gray-700">Additional Notes & Photo</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <textarea name="note" placeholder="Any remarks..." value={formData.note} onChange={handleChange} rows={3} className="w-full px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:font-normal placeholder:text-gray-400"></textarea>
            </div>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="photo_upload" className="flex items-center justify-center gap-2 w-full h-[52px] border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-colors">
                <Camera className="text-gray-500" size={20} />
                <span className="font-medium text-gray-600">
                  {photoBase64s.length > 0 ? `Add More Photos (${photoBase64s.length} added)` : "Take Photos or Upload"}
                </span>
                <input 
                  id="photo_upload" 
                  type="file" 
                  accept="image/*" 
                  multiple
                  capture="environment" 
                  onChange={handlePhotoChange} 
                  className="hidden" 
                />
              </label>
              {photoBase64s.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {photoBase64s.map((src, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200 aspect-square group">
                      <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
          <Send size={20} />
          {loading ? 'Submitting...' : 'Submit Pricing Data'}
        </button>
      </form>
    </>
  );
}
