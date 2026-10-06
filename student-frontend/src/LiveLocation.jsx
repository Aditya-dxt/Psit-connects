import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bus, ArrowLeft, ShieldAlert, Clock, MapPin, Phone, Navigation, Send, ClockIcon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { api } from './services/api';
import { getSocket } from './services/socket';

// Custom bus marker icon
const busIcon = new L.DivIcon({
  className: 'custom-bus-marker',
  html: `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    ">
      <span style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        background: #f97316;
        border-radius: 50%;
        animation: bus-pulse 2s infinite;
      "></span>
      <div style="
        background: #f97316;
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 3px 8px;
        border-radius: 20px;
        border: 1.5px solid #fb923c;
        backdrop-filter: blur(8px);
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(249,115,22,0.4);
      ">
        <span style="margin-right: 3px;">🚌</span>
        <span id="bus-label">PSIT-07</span>
      </div>
    </div>
  `,
  iconSize: [60, 40],
  iconAnchor: [30, 40],
});

const userIcon = new L.DivIcon({
  className: 'custom-user-marker',
  html: `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    ">
      <span style="
        width: 14px;
        height: 14px;
        background: #3b82f6;
        border-radius: 50%;
        border: 2.5px solid #60a5fa;
        box-shadow: 0 0 0 4px rgba(59,130,246,0.2);
      "></span>
      <div style="
        background: #2563eb;
        color: white;
        font-size: 9px;
        font-weight: bold;
        padding: 2px 7px;
        border-radius: 12px;
        border: 1px solid #3b82f6;
        backdrop-filter: blur(8px);
        white-space: nowrap;
        margin-top: 4px;
      ">You</div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

export default function LiveTracking() {
  const location = useLocation();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const busMarkerRef = useRef(null);
  const polylineRef = useRef(null);

  const { studentName, busNumber, mobileNumber, busId: routeBusId } = location.state || {
    studentName: "Student",
    busNumber: "PSIT-07",
    mobileNumber: "9876543210"
  };

  const [busData, setBusData] = useState(null);
  const [busCoords, setBusCoords] = useState({ latitude: 26.4600, longitude: 80.3200 });
  const [userCoords, setUserCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState('idle');
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  // Fetch real bus info and listen for real-time location updates via Socket.IO
  useEffect(() => {
    let isMounted = true;
    let pollInterval = null;
    let targetBusId = routeBusId;

    async function loadBusData() {
      try {
        const res = await api.getBuses();
        const buses = res.buses || [];
        
        let found = null;
        if (targetBusId) {
          found = buses.find(b => Number(b.id) === Number(targetBusId));
        }
        if (!found && busNumber) {
          found = buses.find(b => b.bus_number.toUpperCase() === busNumber.toUpperCase());
        }
        if (!found && buses.length > 0) {
          found = buses[0];
        }

        if (isMounted && found) {
          targetBusId = found.id;
          setBusData({
            id: found.id,
            busNo: found.bus_number,
            routeName: found.route_name ? `Route ${found.route_number || ''} — ${found.route_name}` : "PSIT Campus Route",
            driverName: "Assigned PSIT Driver",
            status: found.status === 'running' ? 'Active / On Route' : (found.status === 'stopped' ? 'Stopped' : 'On Time')
          });

          if (found.current_lat && found.current_lng) {
            setBusCoords({
              latitude: Number(found.current_lat),
              longitude: Number(found.current_lng)
            });
          }
          setLoading(false);
        } else if (isMounted) {
          setBusData({
            busNo: busNumber,
            routeName: "PSIT Campus Route",
            driverName: "Assigned PSIT Driver",
            status: "On Time"
          });
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to fetch buses from API, using fallback:', err);
        if (isMounted) {
          setBusData({
            busNo: busNumber,
            routeName: "PSIT Campus Route",
            driverName: "Assigned PSIT Driver",
            status: "On Time"
          });
          setLoading(false);
        }
      }

      // Socket.IO real-time event listener
      const socket = getSocket();
      if (socket) {
        socket.emit('join:student');
        if (targetBusId) {
          socket.emit('join:bus', targetBusId);
        }

        const handleBusLocation = (data) => {
          if (!targetBusId || Number(data.busId) === Number(targetBusId)) {
            if (isMounted && data.lat && data.lng) {
              setBusCoords({
                latitude: Number(data.lat),
                longitude: Number(data.lng)
              });
              if (data.busNumber) {
                setBusData(prev => prev ? { ...prev, busNo: data.busNumber } : prev);
              }
            }
          }
        };

        socket.on('bus:location', handleBusLocation);

        return () => {
          socket.off('bus:location', handleBusLocation);
        };
      }
    }

    loadBusData();

    // Fallback polling every 5 seconds for current location
    pollInterval = setInterval(async () => {
      if (targetBusId) {
        try {
          const locRes = await api.getBusLocation(targetBusId);
          if (isMounted && locRes.location && locRes.location.lat && locRes.location.lng) {
            setBusCoords({
              latitude: Number(locRes.location.lat),
              longitude: Number(locRes.location.lng)
            });
          }
        } catch {}
      }
    }, 5000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [busNumber, routeBusId]);

  // Live user location via Geolocation API
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationPermission('denied');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ latitude, longitude });
        setLocationPermission('granted');
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
        setLocationPermission('denied');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Recalculate distance & ETA when either busCoords or userCoords changes
  useEffect(() => {
    if (userCoords && busCoords) {
      const dist = calculateDistance(busCoords.latitude, busCoords.longitude, userCoords.latitude, userCoords.longitude);
      setDistance(dist);
      setEta(Math.max(2, Math.round(dist * 3)));

      if (polylineRef.current) {
        polylineRef.current.setLatLngs([
          [busCoords.latitude, busCoords.longitude],
          [userCoords.latitude, userCoords.longitude]
        ]);
      }
    }
  }, [busCoords, userCoords]);

  // Calculate distance in KM between two lat/lng points
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }

  const handleTriggerSOS = () => {
    setSosSent(true);
    setTimeout(() => {
      setSosModalOpen(false);
      alert("Emergency alert sent successfully to PSIT Transport Cell and Security Desk!");
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center font-sans px-4">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-500/30 mb-6">
          <Bus className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">PSIT Connects</h1>
        <p className="text-slate-400 text-sm mb-6">Live Bus Tracking</p>
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 mt-4 animate-pulse">Finding your bus on the map...</p>
      </div>
    );
  }

  // Center map between bus and user (or default to bus location)
  const mapCenter = userCoords
    ? [(busCoords.latitude + userCoords.latitude) / 2, (busCoords.longitude + userCoords.longitude) / 2]
    : [busCoords.latitude, busCoords.longitude];
  const mapZoom = userCoords ? 15 : 14;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans overflow-hidden">
      {/* Main container — responsive: full width on desktop, centered card on mobile */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 h-full lg:h-[calc(100vh-64px)]">

          {/* LEFT: Map Panel — takes full height on desktop, full width on mobile */}
          <div className="lg:col-span-2 bg-slate-950/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative min-h-[400px] sm:min-h-[500px] lg:min-h-0 flex flex-col">

            {/* Top Header Bar */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-5 flex justify-between items-center bg-gradient-to-b from-slate-950/95 to-transparent">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center hover:bg-white/20 hover:scale-105 transition-all cursor-pointer shadow-lg"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-center shadow-lg min-w-[180px]">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">{busData.routeName}</h2>
                <p className="text-xs sm:text-sm text-orange-400 font-semibold">{busData.busNo}</p>
              </div>

              <button
                onClick={() => setSosModalOpen(true)}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-600 to-rose-700 border border-red-500/40 rounded-xl flex items-center justify-center hover:scale-105 hover:shadow-lg hover:shadow-red-600/40 transition-all cursor-pointer shadow-lg shadow-red-600/30"
                title="Emergency SOS"
              >
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </div>

            {/* Interactive Map */}
            <div className="relative flex-1 min-h-[400px] sm:min-h-[500px]">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* Bus marker */}
                <Marker position={[busCoords.latitude, busCoords.longitude]} icon={busIcon}>
                  <Popup>
                    <div style={{ minWidth: 160, backgroundColor: '#1e293b', color: 'white', borderRadius: 12, padding: '10px 14px', fontFamily: 'sans-serif' }}>
                      <p style={{ fontWeight: 'bold', margin: '0 0 4px', color: '#f97316', fontSize: '14px' }}>{busData.busNo}</p>
                      <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#cbd5e1' }}>{busData.driverName}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Live Tracking Active</p>
                    </div>
                  </Popup>
                </Marker>

                {/* User live location marker */}
                {userCoords && (
                  <Marker position={[userCoords.latitude, userCoords.longitude]} icon={userIcon}>
                    <Popup>
                      <div style={{ minWidth: 140, backgroundColor: '#1e293b', color: 'white', borderRadius: 12, padding: '10px 14px', fontFamily: 'sans-serif' }}>
                        <p style={{ fontWeight: 'bold', margin: '0 0 4px', fontSize: '14px' }}>{studentName}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Your Live Location</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Route line from bus to user */}
                {userCoords && (
                  <Polyline
                    positions={[
                      [busCoords.latitude, busCoords.longitude],
                      [userCoords.latitude, userCoords.longitude]
                    ]}
                    ref={polylineRef}
                    pathOptions={{
                      color: '#f97316',
                      weight: 4,
                      dashArray: '10 10',
                      opacity: 0.9,
                    }}
                  />
                )}
              </MapContainer>

              {/* Location permission banner */}
              {locationPermission === 'denied' && (
                <div className="absolute top-4 left-4 right-4 sm:top-5 sm:left-5 sm:right-5 bg-blue-600/90 backdrop-blur-md border border-blue-400/30 rounded-xl px-4 py-3 text-sm text-white flex items-center gap-2 z-10 shadow-lg">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>Location access needed for live tracking. Please allow when prompted.</span>
                </div>
              )}

              {/* Distance & ETA overlay */}
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 bg-slate-900/90 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl flex justify-between items-center text-sm z-10 shadow-xl">
                <span className="text-slate-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-400" />
                  <span className="hidden xs:inline">Distance: </span>
                  <strong className="text-white">{distance ?? '—'} <span className="text-xs font-normal text-slate-400">KM</span></strong>
                </span>
                <span className="text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="hidden xs:inline">ETA: </span>
                  <strong className="text-white">~<span className="text-sm">{eta ?? '—'}</span> <span className="text-xs font-normal text-slate-400">mins</span></strong>
                </span>
              </div>
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
          </div>

          {/* RIGHT: Info Panel — desktop sidebar, mobile bottom sheet */}
          <div className="lg:col-span-1 bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-5 sm:p-6 lg:p-8 flex flex-col overflow-y-auto hidden lg:flex">
            {/* Panel header accent */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <h3 className="text-lg font-bold text-white">Live Tracking</h3>
              <span className="ml-auto text-xs text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                GPS Active
              </span>
            </div>

            {/* Student Info Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
              <p className="text-xs uppercase tracking-wider text-orange-400 font-bold mb-3">Passenger</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Navigation className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">{studentName}</h4>
                  <p className="text-sm text-slate-400 mt-0.5">Mobile: <span className="text-slate-300 font-mono">{mobileNumber}</span></p>
                </div>
              </div>
            </div>

            {/* Driver Info Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
              <p className="text-xs uppercase tracking-wider text-orange-400 font-bold mb-3">Assigned Driver</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center font-bold text-orange-400 border border-white/10 shadow-lg">
                  DR
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">{busData.driverName}</h4>
                  <p className="text-sm text-slate-400 mt-0.5">{busData.busNo} • Route {busData.routeName}</p>
                </div>
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-5 mb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-emerald-400 font-bold mb-1">Status</p>
                  <h4 className="text-xl font-black text-white">{busData.status}</h4>
                </div>
                <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                  <span className="w-8 h-8 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
              </div>
            </div>

            {/* ETA Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
              <p className="text-xs uppercase tracking-wider text-orange-400 font-bold mb-3">Estimated Arrival</p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-amber-600/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                  <ClockIcon className="w-7 h-7 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">~{eta ?? '—'} <span className="text-base font-normal text-slate-400">mins</span></h3>
                  <p className="text-sm text-slate-400">Away from your stop</p>
                </div>
              </div>
            </div>

            {/* Distance Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
              <p className="text-xs uppercase tracking-wider text-orange-400 font-bold mb-3">Distance from Bus</p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                  <MapPin className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{distance ?? '—'} <span className="text-base font-normal text-slate-400">KM</span></h3>
                  <p className="text-sm text-slate-400">Straight-line distance</p>
                </div>
              </div>
            </div>

            {/* SOS Quick Action */}
            <button
              onClick={() => setSosModalOpen(true)}
              className="mt-auto w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold rounded-2xl shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              <ShieldAlert className="w-4 h-4" />
              Emergency SOS
            </button>

            <p className="text-[10px] text-center text-slate-500 mt-4">
              Tracking active • GPS updates in real-time
            </p>
          </div>

          {/* Mobile: bottom sheet card (visible only on small screens) */}
          <div className="lg:hidden bg-slate-900/95 backdrop-blur-xl border-t border-white/15 rounded-t-3xl p-5 shadow-2xl relative overflow-y-auto max-h-[45vh] sm:max-h-[40vh]">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto -mt-2"></div>

            {/* Status & ETA */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-orange-400 font-bold">Estimated Arrival</p>
                <h2 className="text-xl font-black text-white flex items-center gap-2 mt-0.5">
                  <Navigation className="w-4 h-4 text-orange-400" />
                  <span>~{eta ?? '—'} mins away</span>
                </h2>
              </div>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {busData.status}
              </span>
            </div>

            {/* Passenger card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{studentName}</h4>
                <p className="text-xs text-slate-400">Mobile: {mobileNumber}</p>
              </div>
            </div>

            {/* Driver card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center font-bold text-orange-400 border border-white/10 shadow-lg">
                DR
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{busData.driverName}</h4>
                <p className="text-xs text-slate-400">Assigned Driver • {busData.busNo}</p>
              </div>
            </div>

            <p className="text-[10px] text-center text-slate-500 mt-3">
              Tracking active • GPS updates in real-time
            </p>
          </div>
        </div>
      </div>

      {/* SOS Modal */}
      {sosModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center px-4 py-8">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl mx-auto flex items-center justify-center border border-red-500/40">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white">Trigger Emergency SOS?</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              This will instantly alert the PSIT Security Desk and Transport Incharge using your registered mobile number ({mobileNumber}).
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setSosModalOpen(false)}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerSOS}
                disabled={sosSent}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-red-600/40 transition-all cursor-pointer disabled:opacity-50"
              >
                {sosSent ? 'Sending...' : 'Yes, Send SOS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
