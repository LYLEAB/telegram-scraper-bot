'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (p: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={icon}></Marker>
  );
}

function RecenterAutomatically({ position }: { position: L.LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  return null;
}

export default function MapPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (loc: { lat: number; lng: number }) => void;
}) {
  const [position, setPosition] = useState<L.LatLng | null>(
    value ? L.latLng(value.lat, value.lng) : null
  );

  useEffect(() => {
    if (value) {
      setPosition(L.latLng(value.lat, value.lng));
    }
  }, [value]);

  const handleSetPosition = (p: L.LatLng) => {
    setPosition(p);
    onChange({ lat: p.lat, lng: p.lng });
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = L.latLng(pos.coords.latitude, pos.coords.longitude);
          handleSetPosition(newPos);
        },
        (err) => {
          console.error("Error getting location", err);
          alert("Could not get your current location. Please check your permissions.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-300 relative z-0">
      <MapContainer
        center={position || [11.5564, 104.9282]} // Default to Phnom Penh
        zoom={position ? 15 : 12}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={handleSetPosition} />
        {position && <RecenterAutomatically position={position} />}
      </MapContainer>
      
      {/* Locate Me Button */}
      <button 
        type="button"
        onClick={handleLocateMe}
        className="absolute bottom-4 right-4 z-[1000] bg-white text-blue-600 p-2.5 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all group flex items-center justify-center"
        title="Use Current Location"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
      </button>

      {!position && (
        <div className="absolute inset-0 z-[1000] pointer-events-none flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
          <div className="bg-white px-4 py-2 rounded-full shadow-md text-sm font-medium text-gray-700 pointer-events-auto cursor-pointer" onClick={() => {}}>
            Click anywhere on the map to drop a pin
          </div>
        </div>
      )}
    </div>
  );
}
