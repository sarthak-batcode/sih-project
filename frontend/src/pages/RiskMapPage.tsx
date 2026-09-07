import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Shield, MapPin, Search, Filter, AlertCircle, Compass, Layers, PhoneCall } from 'lucide-react';
import { apiService } from '../services/api';
import { Area } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { useSearchParams } from 'react-router-dom';

// Center of India coordinates for map default
const DEFAULT_CENTER: [number, number] = [21.5, 78.5];

// Helper to pan to targeted area
const MapController: React.FC<{ targetPos: [number, number] | null }> = ({ targetPos }) => {
  const map = useMap();
  useEffect(() => {
    if (targetPos) {
      map.flyTo(targetPos, 11, { duration: 1.5 });
    }
  }, [targetPos, map]);
  return null;
};

export const RiskMapPage: React.FC = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchAreas = async () => {
      setLoading(true);
      try {
        const data = await apiService.getAreas();
        setAreas(data);

        // Check if navigated with focus query
        const focusId = searchParams.get('focus');
        if (focusId) {
          const match = data.find((a) => a.area_id === focusId);
          if (match) setSelectedArea(match);
        } else if (data.length > 0) {
          setSelectedArea(data[0]);
        }
      } catch (err) {
        console.error('Error loading areas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAreas();
  }, [searchParams]);

  const filteredAreas = areas.filter((a) => {
    const matchesRisk = filterRisk === 'ALL' || a.risk_category === filterRisk;
    const matchesSearch =
      a.area_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.area_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.state.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  const getMarkerColor = (risk: string) => {
    if (risk === 'HIGH') return '#EF4444';
    if (risk === 'MEDIUM') return '#F59E0B';
    return '#10B981';
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls Bar */}
      <div className="cyber-card p-4 border border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ash-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-accent" />
            National Geospatial Surveillance & Risk Heatmap
          </h2>
          <p className="text-xs text-ash-200 mt-0.5">
            Synthetic surveillance grid mapping 100 economic zones and ATM clustering nodes.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-ash-300 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search area ID, name, state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-ink-200 border border-line rounded-lg pl-9 pr-3 py-1.5 text-xs text-ash-100 focus:outline-none focus:border-cyan-500 w-56"
            />
          </div>

          <div className="flex items-center gap-1 bg-ink-200 border border-line p-1 rounded-lg">
            <Filter className="w-3.5 h-3.5 text-ash-300 ml-1.5 mr-0.5" />
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterRisk(lvl)}
                className={`px-2.5 py-1 rounded text-xs font-semibold uppercase transition-all ${
                  filterRisk === lvl
                    ? 'bg-cyan-500 text-black '
                    : 'text-ash-200 hover:text-ash-100'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map + Detail Inspection Drawer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px]">
        {/* Leaflet Map (8 cols) */}
        <div className="lg:col-span-8 cyber-card border border-line rounded-xl overflow-hidden relative shadow-2xl">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={5}
            style={{ width: '100%', height: '100%' }}
            className="z-0"
          >
            <MapController targetPos={selectedArea ? [selectedArea.latitude, selectedArea.longitude] : null} />

            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {filteredAreas.map((area) => (
              <CircleMarker
                key={area.area_id}
                center={[area.latitude, area.longitude]}
                radius={area.risk_category === 'HIGH' ? 12 : 8}
                pathOptions={{
                  color: getMarkerColor(area.risk_category),
                  fillColor: getMarkerColor(area.risk_category),
                  fillOpacity: 0.7,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => setSelectedArea(area),
                }}
              >
                <Popup>
                  <div className="p-2 space-y-1.5 font-sans">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-accent">{area.area_id}</span>
                      <RiskBadge level={area.risk_category} size="sm" score={area.baseline_risk_score} />
                    </div>
                    <div className="text-xs font-bold text-ash-100">{area.area_name}</div>
                    <div className="text-[11px] text-ash-200">{area.state}</div>
                    <div className="text-[10px] text-amber-300 pt-1">
                      ATM Density: {area.atm_pos_density} terminals
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-10 bg-slate-950/90 backdrop-blur-md border border-line p-3 rounded-xl shadow-lg text-xs space-y-2">
            <div className="font-mono text-[10px] uppercase font-bold text-ash-200">Risk Density Grade</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="text-ash-200 text-[11px]">High (≥ 65%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 "></span>
                <span className="text-ash-200 text-[11px]">Medium (40-64%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 "></span>
                <span className="text-ash-200 text-[11px]">Low (&lt; 40%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Area Intelligence Inspector (4 cols) */}
        <div className="lg:col-span-4 cyber-card p-6 border border-line flex flex-col justify-between overflow-y-auto">
          {selectedArea ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-accent uppercase">{selectedArea.area_id}</span>
                  <h3 className="text-base font-bold text-ash-100 mt-1 leading-snug">{selectedArea.area_name}</h3>
                  <p className="text-xs text-ash-200">{selectedArea.district}, {selectedArea.state}</p>
                </div>
                <RiskBadge level={selectedArea.risk_category} size="md" score={selectedArea.baseline_risk_score} />
              </div>

              {/* Tactical Recommendations Box */}
              <div className="p-4 rounded-xl bg-ink-200 border border-line space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ash-200">Recommended Patrol Window:</span>
                  <span className="font-mono text-accent font-bold">
                    {selectedArea.baseline_risk_score >= 0.60 ? '21:00 - 03:00 IST' : '11:00 - 17:00 IST'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-ash-200">ATM / POS Cash-Out Endpoints:</span>
                  <span className="font-mono text-ash-100 font-bold">{selectedArea.atm_pos_density} Points</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-ash-200">Surveillance Radius:</span>
                  <span className="font-mono text-ash-100 font-bold">{selectedArea.radius_km} km</span>
                </div>
              </div>

              {/* Contributing Risk Indicators */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-ash-200 ">
                  Identified Threat Modalities
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-ink-200 border border-line flex items-center justify-between">
                    <span className="text-ash-200">AEPS Spoof & Biometric Fraud</span>
                    <span className="font-mono text-rose-400 font-semibold">+32% Risk</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-ink-200 border border-line flex items-center justify-between">
                    <span className="text-ash-200">Immediate Clearing UPI Mules</span>
                    <span className="font-mono text-amber-400 font-semibold">+24% Risk</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-ink-200 border border-line flex items-center justify-between">
                    <span className="text-ash-200">Off-Peak ATM Liquidity Access</span>
                    <span className="font-mono text-accent font-semibold">+18% Risk</span>
                  </div>
                </div>
              </div>

              {/* Coordinates */}
              <div className="p-3 rounded-lg bg-ink-200/40 border border-line/60 text-[11px] font-mono text-ash-300 flex justify-between">
                <span>LAT: {selectedArea.latitude.toFixed(4)}°N</span>
                <span>LON: {selectedArea.longitude.toFixed(4)}°E</span>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ash-300">
              <MapPin className="w-10 h-10 mb-3 text-slate-600 animate-bounce" />
              <p className="text-sm font-medium text-ash-200">Select any zone marker on the map</p>
              <p className="text-xs text-slate-600 mt-1">Detailed tactical telemetry will appear here.</p>
            </div>
          )}

          {selectedArea && (
            <div className="pt-4 border-t border-line">
              <button 
                onClick={() => window.open(`https://www.google.com/maps?q=${selectedArea.latitude},${selectedArea.longitude}`, '_blank')}
                className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4" />
                Open Geospatial Grid Coordinates
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
