import { useState, useEffect } from 'react';
import { Bus, Navigation, Phone, MapPin, Clock, Shield, ArrowRight, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // Verified mobile from login state
  const registeredMobile = location.state?.mobileNumber || "9876543210";

  const [studentName, setStudentName] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

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

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const liveCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };

          console.log("Live location saved for mobile:", registeredMobile);

          setTimeout(() => {
            setLoading(false);
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
          console.error("Location error:", error);
          alert("Location permission is required for live tracking.");
          setLoading(false);
        }
      );
    } else {
      alert("Your browser does not support geolocation.");
      setLoading(false);
    }
  };

  // Auto-focus name field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById('name-input')?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white font-sans overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl"></div>
      </div>

      {/* Top Nav Bar */}
      <header className="relative z-10 border-b border-white/5 bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-bold text-white hidden sm:block">PSIT Connects</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs text-emerald-300">
                <Phone className="w-3 h-3" />
                <span className="hidden sm:inline">+91 </span>
                <span>{registeredMobile}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">

          {/* LEFT: Hero Section (3/5 width on desktop) */}
          <div className="lg:col-span-3">
            {/* Greeting */}
            <div className="text-center mb-8 sm:mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-xs text-orange-300 font-semibold mb-4">
                <Bus className="w-3.5 h-3.5" />
                <span>Student Portal</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                Hello,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                  {studentName || 'Student'}
                </span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base mt-3 max-w-md mx-auto">
                Track your PSIT bus in real-time. Enter your details below to start live tracking.
              </p>
            </div>

            {/* Track Form Card */}
            <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/30">
              <form onSubmit={handleTrackBus} className="space-y-5">
                {/* Name Field */}
                <div>
                  <label
                    className={`block text-xs font-semibold uppercase tracking-wide mb-2.5 transition-colors ${
                      focusedField === 'name' ? 'text-orange-400' : 'text-amber-300/80'
                    }`}
                  >
                    Your Name
                  </label>
                  <input
                    id="name-input"
                    type="text"
                    placeholder="Enter your full name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full bg-white/5 backdrop-blur-md border rounded-2xl px-4 py-3.5 text-sm transition-all shadow-lg placeholder:text-white/30 focus:outline-none focus:ring-2 ${
                      focusedField === 'name'
                        ? 'border-orange-500/60 focus:ring-orange-500/40'
                        : 'border-white/10 focus:border-orange-500 focus:ring-orange-500/30'
                    }`}
                  />
                </div>

                {/* Bus Number Field */}
                <div>
                  <label
                    className={`block text-xs font-semibold uppercase tracking-wide mb-2.5 transition-colors ${
                      focusedField === 'bus' ? 'text-orange-400' : 'text-amber-300/80'
                    }`}
                  >
                    Bus Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 transition-colors" style={{
                      color: focusedField === 'bus' ? '#f97316' : undefined
                    }}>
                      <Bus className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. PSIT-07"
                      value={busNumber}
                      onChange={(e) => setBusNumber(e.target.value.toUpperCase())}
                      onFocus={() => setFocusedField('bus')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full bg-white/5 backdrop-blur-md border rounded-2xl pl-11 pr-4 py-3.5 text-sm transition-all shadow-lg placeholder:text-white/30 focus:outline-none focus:ring-2 uppercase ${
                        focusedField === 'bus'
                          ? 'border-orange-500/60 focus:ring-orange-500/40'
                          : 'border-white/10 focus:border-orange-500 focus:ring-orange-500/30'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 pl-10">
                    Check your bus number on the transport notice board
                  </p>
                </div>

                {/* Track Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Saving Location & Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      <span>Track Bus Live</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Quick Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 text-center">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Navigation className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-xs text-slate-400">Real-time GPS tracking</p>
                <p className="text-sm font-semibold text-white mt-0.5">Live on map</p>
              </div>
              <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 text-center">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-xs text-slate-400">ETA calculation</p>
                <p className="text-sm font-semibold text-white mt-0.5">Dynamic updates</p>
              </div>
              <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 text-center">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-xs text-slate-400">SOS emergency button</p>
                <p className="text-sm font-semibold text-white mt-0.5">24/7 active</p>
              </div>
            </div>
          </div>

          {/* RIGHT: Sidebar Info (2/5 width on desktop) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Bus Info Card */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-4">How It Works</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">1</div>
                  <div>
                    <p className="text-sm font-semibold text-white">Enter your details</p>
                    <p className="text-xs text-slate-400 mt-0.5">Name and bus number above</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">2</div>
                  <div>
                    <p className="text-sm font-semibold text-white">Grant location access</p>
                    <p className="text-xs text-slate-400 mt-0.5">GPS needed for live tracking</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">3</div>
                  <div>
                    <p className="text-sm font-semibold text-white">View live map</p>
                    <p className="text-xs text-slate-400 mt-0.5">See your bus on the map</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Registered Number Card */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Phone className="w-4.5 h-4.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Registered Number</p>
                  <p className="text-sm text-white font-semibold">+91 {registeredMobile}</p>
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">Verified student account</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Active
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Quick Access</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl p-3 text-sm text-slate-300 hover:text-white transition-all cursor-pointer border border-transparent hover:border-white/10">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>View route map</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-slate-500" />
                </button>
                <button className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl p-3 text-sm text-slate-300 hover:text-white transition-all cursor-pointer border border-transparent hover:border-white/10">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Bus schedule</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-slate-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
