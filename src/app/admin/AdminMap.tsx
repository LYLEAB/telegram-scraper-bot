"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet when using Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

export default function AdminMap({ submissions }: { submissions: any[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="bg-gray-100 animate-pulse w-full h-[600px] rounded-xl flex items-center justify-center text-gray-500">Loading Map...</div>;
  }

  // Filter out submissions without coordinates
  const validSubmissions = submissions.filter(s => s.lat !== null && s.lng !== null);

  // Default to Cambodia center if no submissions, else center on the first submission
  const defaultCenter: [number, number] = validSubmissions.length > 0 
    ? [validSubmissions[0].lat, validSubmissions[0].lng] 
    : [11.5564, 104.9282]; // Phnom Penh

  return (
    <div className="h-[600px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={7} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {validSubmissions.map(sub => (
          <Marker 
            key={sub.id} 
            position={[sub.lat, sub.lng]} 
            icon={icon}
          >
            <Popup>
              <div className="p-1 min-w-[200px]">
                <h4 className="font-bold text-gray-900 border-b pb-1 mb-2">{sub.brand_label}</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Submitter:</strong> {sub.submitted_by}</p>
                  <p><strong>Location:</strong> {sub.district_label}, {sub.province_label}</p>
                  <p><strong>Net Price:</strong> ${sub.net_price}</p>
                  <p className="text-gray-500 text-xs mt-2 pt-1 border-t">
                    {sub.phnom_penh_time 
                      ? new Date(sub.phnom_penh_time).toLocaleString('en-US', { timeZone: 'UTC' }) 
                      : new Date(sub.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
