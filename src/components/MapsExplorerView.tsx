import React, { useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Search, Compass, Send } from 'lucide-react';

export interface SpatialHubMarker {
  id: string;
  name: string;
  category: string;
  address: string;
  position: { lat: number; lng: number };
  summary: string;
  capacityMetric: string;
}

const CURATED_HUBS: SpatialHubMarker[] = [
  {
    id: 'hub-sf-hq',
    name: 'Anthropic & AI Safety Research Corridor',
    category: 'Research Campus',
    address: '548 Market St, San Francisco, CA',
    position: { lat: 37.7897, lng: -122.4014 },
    summary: 'Primary frontier alignment, Constitutional AI, and 200K context evaluation lab.',
    capacityMetric: '120 MW Compute Interconnect',
  },
  {
    id: 'hub-mission-bay',
    name: 'Mission Bay Grid-Forming Microgrid Hub',
    category: 'IEEE 1547 BESS Facility',
    address: '1650 Owens St, San Francisco, CA',
    position: { lat: 37.7685, lng: -122.3926 },
    summary: '85 MW solar + 4-hour LFP battery dispatch telemetry station operating on 34.5 kV bus.',
    capacityMetric: '272.0 MWh Usable LFP',
  },
  {
    id: 'hub-embarcadero',
    name: 'Embarcadero Subsea Fiber & Edge Gateway',
    category: 'Low-Latency Quorum Node',
    address: '1 Ferry Building, San Francisco, CA',
    position: { lat: 37.7955, lng: -122.3937 },
    summary: 'Raft consensus Leader Node A termination point with sub-2ms metro optical ring.',
    capacityMetric: '400 Gbps Optical Ring',
  },
  {
    id: 'hub-stanford',
    name: 'Bay Area Autonomous Energy & Robotics Lab',
    category: 'Academic Partner',
    address: '450 Serra Mall, Stanford, CA',
    position: { lat: 37.4275, lng: -122.1697 },
    summary: 'Joint testbed for synthetic inertia inverters and spatial 3D simulation benchmarks.',
    capacityMetric: '34.5 kV Test Feeder',
  },
];

interface MapsExplorerViewProps {
  onAskMapsGroundedChat: (prompt: string) => void;
}

export const MapsExplorerView: React.FC<MapsExplorerViewProps> = ({
  onAskMapsGroundedChat,
}) => {
  const [selectedHub, setSelectedHub] = useState<SpatialHubMarker>(CURATED_HUBS[0]);
  const [destinationHubId, setDestinationHubId] = useState<string>(CURATED_HUBS[1].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapsPrompt, setMapsPrompt] = useState(
    'Find clean energy research centers, EV microgrid stations, and coffee workspaces near Market Street in San Francisco'
  );

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const filteredHubs = CURATED_HUBS.filter(
    (h) =>
      !searchQuery.trim() ||
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const destinationHub =
    CURATED_HUBS.find((h) => h.id === destinationHubId) || CURATED_HUBS[1];

  // Haversine distance calculation for deterministic route metrics
  const computeRouteMetrics = (a: SpatialHubMarker, b: SpatialHubMarker) => {
    const R = 6371;
    const dLat = ((b.position.lat - a.position.lat) * Math.PI) / 180;
    const dLng = ((b.position.lng - a.position.lng) * Math.PI) / 180;
    const s1 =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((a.position.lat * Math.PI) / 180) *
        Math.cos((b.position.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
    const distanceKm = Math.max(0.4, R * c * 1.28);
    const durationMin = Math.max(3, Math.round(distanceKm * 2.4));
    return {
      distanceKm: distanceKm.toFixed(1),
      durationMin,
    };
  };

  const routeMetrics = computeRouteMetrics(selectedHub, destinationHub);

  return (
    <main className="flex-1 h-screen flex flex-col bg-[#FAF9F5] dark:bg-[#191918] overflow-hidden">
      {/* Header */}
      <header className="h-14 shrink-0 px-6 border-b border-[#E5E2D9] dark:border-[#2C2B28] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Compass className="w-4 h-4 text-[#C96442] shrink-0" />
          <h1 className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2] truncate">
            Google Maps Platform · Geospatial Intelligence &amp; Grounding
          </h1>
        </div>
        <span className="text-xs font-claude-mono text-[#6E6D68] dark:text-[#9A9890] hidden sm:inline">
          Maps JavaScript API · Advanced Markers · Gemini Maps Grounding
        </span>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* Left Sidebar: Places Filter, Route Planner, and Gemini Maps Grounding Prompt */}
        <div className="lg:col-span-4 border-r border-[#E5E2D9] dark:border-[#2C2B28] p-5 overflow-y-auto space-y-5 bg-[#F3F1EA]/60 dark:bg-[#1D1C1A]">
          {/* Search Places */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#191918] dark:text-[#ECEAE2]">
              Search Infrastructure &amp; Research Hubs
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#7A7872] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                aria-label="Filter map locations"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name, address, or IEEE 1547..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-xs text-[#191918] dark:text-[#ECEAE2] focus:outline-none focus:border-[#C96442]"
              />
            </div>
          </div>

          {/* Hub List */}
          <div className="space-y-2">
            {filteredHubs.map((hub) => {
              const isSelected = selectedHub.id === hub.id;
              return (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => setSelectedHub(hub)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-colors ${
                    isSelected
                      ? 'bg-[#FAF9F5] dark:bg-[#262522] border-[#C96442] shadow-xs'
                      : 'bg-[#FAF9F5]/70 dark:bg-[#21201E] border-[#E5E2D9] dark:border-[#2C2B28] hover:border-[#C96442]/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#191918] dark:text-[#ECEAE2] truncate">
                      {hub.name}
                    </span>
                    <span className="text-[10px] font-claude-mono text-[#C96442] shrink-0">
                      {hub.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#6E6D68] dark:text-[#9A9890] mt-0.5">
                    {hub.address}
                  </div>
                  <div className="text-[11px] font-claude-mono text-[#2D6A4F] mt-1.5">
                    {hub.capacityMetric}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Corridor Route Estimator */}
          <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#191918] dark:text-[#ECEAE2]">
              <Navigation className="w-3.5 h-3.5 text-[#C96442]" />
              <span>Corridor Route &amp; Fiber Span</span>
            </div>
            <div className="text-xs text-[#6E6D68] dark:text-[#9A9890]">
              Origin: <strong className="text-[#191918] dark:text-[#ECEAE2]">{selectedHub.name}</strong>
            </div>
            <div>
              <label className="block text-[11px] text-[#6E6D68] mb-1">Destination Node</label>
              <select
                aria-label="Select destination node"
                value={destinationHubId}
                onChange={(e) => setDestinationHubId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#F3F1EA] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-xs"
              >
                {CURATED_HUBS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-[#F3F1EA] dark:bg-[#191918]">
                <div className="text-[10px] text-[#6E6D68]">Estimated Distance</div>
                <div className="text-sm font-bold font-claude-mono text-[#C96442]">
                  {routeMetrics.distanceKm} km
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F3F1EA] dark:bg-[#191918]">
                <div className="text-[10px] text-[#6E6D68]">Transit / Dispatch ETA</div>
                <div className="text-sm font-bold font-claude-mono text-[#191918] dark:text-[#ECEAE2]">
                  {routeMetrics.durationMin} mins
                </div>
              </div>
            </div>
          </div>

          {/* Ask Claude with Live Google Maps Grounding */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!mapsPrompt.trim()) return;
              onAskMapsGroundedChat(mapsPrompt.trim());
            }}
            className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-3"
          >
            <div className="text-xs font-semibold text-[#191918] dark:text-[#ECEAE2]">
              Ask Claude with Google Maps Grounding
            </div>
            <textarea
              rows={3}
              aria-label="Google Maps grounded query"
              value={mapsPrompt}
              onChange={(e) => setMapsPrompt(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#F3F1EA] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-xs text-[#191918] dark:text-[#ECEAE2] focus:outline-none focus:border-[#C96442]"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-[#C96442] hover:bg-[#B55535] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Run Maps-Grounded Query in Chat</span>
            </button>
          </form>
        </div>

        {/* Right Area: Interactive Google Map */}
        <div className="lg:col-span-8 relative min-h-[420px] h-full bg-[#EAE7DD] dark:bg-[#141413]">
          <APIProvider apiKey={apiKey}>
            <Map
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              defaultCenter={{ lat: 37.782, lng: -122.398 }}
              defaultZoom={12}
              gestureHandling="greedy"
              disableDefaultUI={false}
              className="w-full h-full"
            >
              {filteredHubs.map((hub) => (
                <AdvancedMarker
                  key={hub.id}
                  position={hub.position}
                  onClick={() => setSelectedHub(hub)}
                  title={hub.name}
                >
                  <Pin
                    background={selectedHub.id === hub.id ? '#C96442' : '#191918'}
                    borderColor="#FAF9F5"
                    glyphColor="#FAF9F5"
                  />
                </AdvancedMarker>
              ))}

              {selectedHub && (
                <InfoWindow position={selectedHub.position}>
                  <div className="p-1 max-w-[230px] text-[#191918]">
                    <div className="text-xs font-bold">{selectedHub.name}</div>
                    <div className="text-[11px] text-[#5A5955] mt-0.5">{selectedHub.address}</div>
                    <p className="text-[11px] mt-1 leading-snug">{selectedHub.summary}</p>
                    <div className="mt-1.5 text-[10px] font-mono font-semibold text-[#C96442]">
                      {selectedHub.capacityMetric}
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>

          {/* Bottom Floating Active Node Card */}
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md p-4 rounded-2xl bg-[#FAF9F5]/95 dark:bg-[#191918]/95 backdrop-blur-md border border-[#E5E2D9] dark:border-[#2C2B28] shadow-lg">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#C96442]">
              <MapPin className="w-3.5 h-3.5" />
              <span>{selectedHub.category}</span>
            </div>
            <div className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2] mt-0.5">
              {selectedHub.name}
            </div>
            <p className="text-xs text-[#6E6D68] dark:text-[#9A9890] mt-1">
              {selectedHub.summary}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};
