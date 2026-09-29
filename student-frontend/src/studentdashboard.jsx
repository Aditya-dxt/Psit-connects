import { useState, useEffect } from 'react';
import { Bus, Navigation, Phone } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. 1st page (Login) se aaya hua verified mobile number receive karna
  const registeredMobile = location.state?.mobileNumber || "9876543210"; // Fallback default agar direct khola ho

  const [studentName, setStudentName] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrackBus = (e) => {
    e.preventDefault();

    if (!studentName.trim()) {
      alert("Please enter your name.");
      return;
    }
    if (!busNumber.trim()) {
      alert("Please enter your bus number.");
      return;
    }

    setLoading(true);

    // Fetching device live GPS location and sending to database
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const liveCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          
          console.log("Live location successfully saved to database for mobile:", registeredMobile);

          // Simulating database save delay before navigating to the 3rd page
          setTimeout(() => {
            setLoading(false);
            // Passing studentName, busNumber, liveCoords, and the verified mobileNumber to the 3rd page
            navigate('/live-tracking', { 
              state: { 
                studentName, 
                busNumber, 
                mobileNumber: registeredMobile, 
                liveCoords 
              } 
            });
          }, 1000);
        },
        (error) => {
          console.error("Location access error:", error);
          alert("Location permission is required for live tracking.");
          setLoading(false);
        }
      );
    } else {
      alert("Your browser does not support geolocation.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e293b] via-[#334155] to-[#64748b] text-white flex flex-col items-center px-4 py-8 font-sans relative overflow-hidden">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Content Wrapper */}
      <div className="w-full max-w-full flex flex-col pb-10 relative z-10">

        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/40 mb-3 transform hover:scale-105 transition-transform duration-300">
            <Bus className="text-white w-8 h-8" />
          </div>
          <p className="text-[11px] uppercase tracking-wider text-orange-400 font-bold mb-1">Welcome to PSIT Connects</p>
          <h1 className="text-2xl font-black tracking-tight text-white mb-1">
            Hello, {studentName ? studentName : 'Student'}
          </h1>
          
          {/* Verified Mobile Number Badge */}
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full text-xs text-emerald-300 mt-2">
            <Phone className="w-3.5 h-3.5" />
            <span>Verified: +91 {registeredMobile}</span>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleTrackBus} className="space-y-5">
          
          {/* Name Input */}
          <div>
            <label className="block text-xs font-semibold text-amber-300 mb-2 uppercase tracking-wide">Your Name</label>
            <input 
              type="text" 
              placeholder="Enter your name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/40 transition-all shadow-lg"
            />
          </div>

          {/* Bus Number Input */}
          <div>
            <label className="block text-xs font-semibold text-amber-300 mb-2 uppercase tracking-wide">Bus Number</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-300">
                <Bus className="w-4 h-4" />
              </span>
              <input 
                type="text" 
                placeholder="e.g. PSIT-07"
                value={busNumber}
                onChange={(e) => setBusNumber(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/40 transition-all shadow-lg uppercase"
              />
            </div>
          </div>

          {/* Track Button */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
          >
            {loading ? (
              <span className="animate-pulse">Saving Location & Connecting...</span>
            ) : (
              <>
                <Navigation className="w-5 h-5" />
                <span>Track Bus Live</span>
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
}