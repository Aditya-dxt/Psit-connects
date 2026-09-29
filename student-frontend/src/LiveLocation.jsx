import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bus, ArrowLeft, ShieldAlert, Clock, MapPin } from 'lucide-react';

export default function LiveTracking() {
  const location = useLocation();
  const navigate = useNavigate();

  // Data received from the previous page (Dashboard)
  const { studentName, busNumber, mobileNumber } = location.state || {
    studentName: "Student",
    busNumber: "PSIT-07",
    mobileNumber: "9876543210"
  };

  const [busData, setBusData] = useState(null);
  const [studentCoords, setStudentCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  // =========================================================================
  // BACKEND INTEGRATION NOTE FOR FETCHING DATA:
  // Instead of this mock setTimeout, the backend developer should implement 
  // an API call (e.g., using Axios or Fetch) to fetch live bus coordinates 
  // and student data using the busNumber and mobileNumber.
  // Example Endpoints:
  // 1. GET /api/bus/live-location?busNo=${busNumber}
  // 2. GET /api/student/details?mobile=${mobileNumber}
  // =========================================================================
  useEffect(() => {
    async function fetchDataAndCalculateETA() {
      try {
        // Simulating network/database latency
        setTimeout(() => {
          
          // --- MOCK DATABASE (Replace with backend API response) ---
          const databaseBuses = {
            "PSIT-07": {
              busNo: "PSIT-07",
              routeName: "Route 1 — NH-2",
              driverName: "Ramesh Kumar",
              currentCoords: { latitude: 26.4600, longitude: 80.3200 }, // Real-time GPS from Bus GPS hardware/DB
              status: "On Time"
            }
          };

          const databaseStudentsByMobile = {
            "9876543210": {
              name: studentName,
              storedCoords: { latitude: 26.4499, longitude: 80.3319 } // Student's boarding stop/saved coords from DB
            }
          };

          const foundBus = databaseBuses[busNumber.toUpperCase()] || databaseBuses["PSIT-07"];
          const foundStudent = databaseStudentsByMobile[mobileNumber] || { 
            storedCoords: { latitude: 26.4499, longitude: 80.3319 } 
          };

          setBusData(foundBus);
          setStudentCoords(foundStudent.storedCoords);

          // --- DISTANCE & ETA CALCULATION LOGIC ---
          const busLat = foundBus.currentCoords.latitude;
          const busLng = foundBus.currentCoords.longitude;
          const stuLat = foundStudent.storedCoords.latitude;
          const stuLng = foundStudent.storedCoords.longitude;

          const latDiff = Math.abs(busLat - stuLat);
          const lngDiff = Math.abs(busLng - stuLng);
          const calculatedDist = ((latDiff + lngDiff) * 111).toFixed(1); // Approx KM conversion
          const calculatedEta = Math.max(2, Math.round(calculatedDist * 3)); // Approx 3 mins per KM

          setDistance(calculatedDist);
          setEta(calculatedEta);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Database error:", error);
        setLoading(false);
      }
    }

    fetchDataAndCalculateETA();
  }, [busNumber, mobileNumber, studentName]);

  // =========================================================================
  // BACKEND INTEGRATION NOTE FOR SOS EMERGENCY:
  // When the student triggers SOS, send a POST request to alert college security.
  // Example Endpoint: POST /api/emergency/sos
  // Payload: { mobileNumber, busNumber, studentName, timestamp }
  // =========================================================================
  const handleTriggerSOS = () => {
    setSosSent(true);
    
    // TODO: Replace with actual backend API call
    // axios.post('/api/emergency/sos', { mobileNumber, busNumber })

    setTimeout(() => {
      setSosModalOpen(false);
      alert("Emergency alert sent successfully to PSIT Transport Cell and Security Desk!");
    }, 1000);
  };

  // Loading state while data is being fetched from the database
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1e293b] via-[#334155] to-[#64748b] text-white flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-slate-300 animate-pulse">Syncing database coordinates & preparing live map...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e293b] via-[#334155] to-[#64748b] text-white flex justify-center items-center font-sans">
      
      {/* Responsive App Frame Wrapper */}
      <div className="w-full max-w-full min-h-screen md:min-h-[850px] md:rounded-3xl bg-slate-950 text-white flex flex-col relative overflow-hidden shadow-2xl border border-white/10">
        
        {/* Top Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-slate-950/90 to-transparent">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer shadow-lg text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl text-center shadow-lg">
            <h2 className="text-xs font-bold text-white tracking-wide">{busData.routeName}</h2>
            <p className="text-[10px] text-orange-400 font-semibold">{busData.busNo}</p>
          </div>

          {/* SOS Emergency Button */}
          <button 
            onClick={() => setSosModalOpen(true)}
            className="w-10 h-10 bg-gradient-to-br from-red-600 to-rose-700 border border-red-500/40 rounded-xl flex items-center justify-center hover:scale-105 transition-all cursor-pointer shadow-lg shadow-red-600/30 animate-pulse"
            title="Emergency SOS"
          >
            <ShieldAlert className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Map View Area (Simulated Live GPS Container - Can be replaced with Leaflet/Google Maps API later) */}
        <div className="relative w-full h-[55vh] bg-slate-900 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M 50 150 Q 200 50, 350 300 T 400 500" fill="none" stroke="#f97316" strokeWidth="4" strokeDasharray="8 8" className="animate-pulse" />
          </svg>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <span className="relative flex h-4 w-4 mb-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500"></span>
            </span>
            <div className="bg-orange-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-2xl border border-orange-400 flex items-center gap-1.5 backdrop-blur-md">
              <Bus className="w-3.5 h-3.5" />
              <span>{busData.busNo} Live</span>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex justify-between items-center text-[11px]">
            <span className="text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              Distance: <strong className="text-white">{distance} KM</strong>
            </span>
            <span className="text-slate-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              ETA: <strong className="text-white">~{eta} mins</strong>
            </span>
          </div>
        </div>

        {/* Bottom Sheet Card */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/15 rounded-t-3xl p-6 shadow-2xl z-20 flex flex-col gap-4">
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto -mt-2"></div>

          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-orange-400 font-bold">Estimated Arrival</p>
              <h2 className="text-2xl font-black text-white flex items-center gap-2 mt-0.5">
                <span>~{eta} mins away</span>
              </h2>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {busData.status}
            </span>
          </div>

          {/* Driver Details Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center font-bold text-orange-400 border border-white/10">
              DR
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{busData.driverName}</h4>
              <p className="text-xs text-slate-400">Assigned Driver • {busData.busNo}</p>
            </div>
          </div>

          <p className="text-[11px] text-center text-slate-400">
            Tracking active for <span className="text-white font-semibold">{studentName}</span> (Mobile: {mobileNumber})
          </p>
        </div>

        {/* SOS Emergency Confirmation Modal */}
        {sosModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center px-4">
            <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl mx-auto flex items-center justify-center border border-red-500/40">
                <ShieldAlert className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Trigger Emergency SOS?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                This will instantly alert the PSIT Security Desk and Transport Incharge using your registered mobile number ({mobileNumber}).
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => setSosModalOpen(false)}
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleTriggerSOS}
                  disabled={sosSent}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-red-600/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  {sosSent ? 'Sending...' : 'Yes, Send SOS'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}