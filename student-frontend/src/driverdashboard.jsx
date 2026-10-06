import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Bus, QrCode, MapPin, Wifi, WifiOff, Play, Square, Clock, Shield, Phone } from 'lucide-react';
import { api, getUser } from './services/api';

// Mock registered mobile numbers database (same as student side)
const REGISTERED_MOBILES = ["9876543210", "9123456789", "9988776655"];

export default function DriverDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = getUser();
  const [registeredMobile, setRegisteredMobile] = useState(
    location.state?.mobileNumber || user?.mobile || "9988776655"
  );
  const role = location.state?.role || user?.role || "driver";

  // State
  const [driverName, setDriverName] = useState(user?.name || '');
  const [assignedBus, setAssignedBus] = useState('');
  const [tripStatus, setTripStatus] = useState('Idle'); // Idle | Active | Completed
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(false);

  // Throttling ref for GPS transmission (3-5s requirement)
  const lastGpsSentRef = useRef(0);
  const activeTripRef = useRef(null);
  activeTripRef.current = activeTrip;

  // QR Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  // GPS state
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsConnected, setGpsConnected] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsSignal, setGpsSignal] = useState('weak'); // weak | good | excellent
  const watchIdRef = useRef(null);
  const [isBackground, setIsBackground] = useState(false);
  const [backgroundTracking, setBackgroundTracking] = useState(false);

  // On mount: Load driver profile and active trip from backend
  useEffect(() => {
    let isMounted = true;
    async function loadDriver() {
      try {
        const [profileRes, activeTripRes] = await Promise.allSettled([
          api.getDriverProfile(),
          api.getActiveTrip()
        ]);

        if (isMounted && profileRes.status === 'fulfilled' && profileRes.value.user) {
          const prof = profileRes.value.user;
          if (prof.name) setDriverName(prof.name);
          if (prof.mobile) setRegisteredMobile(prof.mobile);
          if (prof.bus?.busNumber) setAssignedBus(prof.bus.busNumber);
        }

        if (isMounted && activeTripRes.status === 'fulfilled' && activeTripRes.value.trip) {
          const trip = activeTripRes.value.trip;
          setActiveTrip(trip);
          activeTripRef.current = trip;
          setTripStatus('Active');
          if (trip.bus_number) setAssignedBus(trip.bus_number);
          startGpsTracking(trip.bus_number);
        }
      } catch (err) {
        console.warn('Driver dashboard init notice:', err);
      }
    }

    loadDriver();
    return () => {
      isMounted = false;
    };
  }, []);

  // ─── QR Scanner ───────────────────────────────────────────────

  const startScanner = useCallback(async () => {
    setScannerError(null);
    setCameraLoading(true);

    // ─── Testing mode: simulate QR scan and verify with backend ────
    setScannerActive(true);
    const busQr = assignedBus
      ? `PSIT-BUS-${assignedBus.replace('PSIT-', '').padStart(2, '0')}`
      : 'PSIT-BUS-01';

    console.log('[QR SCAN] Verifying bus QR with backend:', busQr);
    await new Promise(resolve => setTimeout(resolve, 800)); // Scan animation delay

    try {
      const verifyRes = await api.verifyQr(busQr);
      if (verifyRes.bus?.busNumber) {
        setAssignedBus(verifyRes.bus.busNumber);
      }
    } catch (err) {
      console.warn('QR verify notice:', err.message);
    }

    setScanResult({
      success: true,
      mobile: registeredMobile,
      timestamp: new Date().toISOString()
    });

    setCameraLoading(false);
    startGpsTracking(registeredMobile);
    return;
    // ─── End test mode ───────────────────────────────────────────

    // ─── Production camera scanner (commented out for testing) ──
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      const scanner = new Html5Qrcode('qr-reader');
      scannerInstanceRef.current = scanner;

      await scanner.start({ facingMode: 'environment' }, {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      }, (decodedText, decodedResult) => {
        const qrData = decodedText;
        console.log('QR Scanned:', qrData);

        scanner.stop().then(() => {
          setScannerActive(false);
          setCameraLoading(false);
        }).catch(() => {});

        let scannedMobile = null;

        if (qrData.startsWith('PSIT-DRIVER:')) {
          scannedMobile = qrData.replace('PSIT-DRIVER:', '');
        } else if (qrData.match(/^\d{10}$/)) {
          scannedMobile = qrData;
        } else {
          const phoneMatch = qrData.match(/\d{10}/);
          if (phoneMatch) scannedMobile = phoneMatch[0];
        }

        if (scannedMobile && REGISTERED_MOBILES.includes(scannedMobile)) {
          setScanResult({
            success: true,
            mobile: scannedMobile,
            timestamp: new Date().toISOString()
          });
          startGpsTracking(scannedMobile);
        } else {
          setScannerError(`Unregistered mobile: ${scannedMobile || qrData}`);
          setTimeout(() => {
            setScannerError(null);
            startScanner();
          }, 2000);
        }
      }, () => {});

      setScannerActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraLoading(false);
      setScannerError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Failed to access camera: ' + err.message
      );
    }
  }, []);

  const stopScanner = useCallback(() => {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.stop().then(() => {
        setScannerActive(false);
        setCameraLoading(false);
      }).catch(() => {});
      scannerInstanceRef.current = null;
    } else {
      setScannerActive(false);
      setCameraLoading(false);
    }
  }, []);

  // ─── GPS Tracking ─────────────────────────────────────────────

  const startGpsTracking = useCallback((scannedMobile) => {
    if (!navigator.geolocation) {
      setGpsSignal('weak');
      return;
    }

    setGpsActive(true);
    setGpsConnected(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsCoords({ latitude, longitude });
        setGpsAccuracy(accuracy);

        // Signal quality based on accuracy
        if (accuracy < 15) setGpsSignal('excellent');
        else if (accuracy < 50) setGpsSignal('good');
        else setGpsSignal('weak');

        // Throttle GPS transmission to backend (every 3-5 seconds, requirement 4)
        const now = Date.now();
        if (activeTripRef.current?.id && (now - lastGpsSentRef.current >= 3500)) {
          lastGpsSentRef.current = now;
          api.updateTripLocation(activeTripRef.current.id, {
            lat: latitude,
            lng: longitude,
            speed: position.coords.speed || 0,
            accuracy: accuracy || null
          }).catch((err) => {
            console.warn('GPS transmission error:', err.message);
          });
        }
      },
      (error) => {
        console.warn('GPS error:', error.message);
        if (error.code === 1) {
          setGpsConnected(false);
          setGpsSignal('weak');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000, // Accept cached positions up to 2s old
        distanceFilter: 5 // Only fire if moved 5m+
      }
    );
  }, []);

  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsActive(false);
    setGpsConnected(false);
    setGpsCoords(null);
    setGpsSignal('weak');
  }, []);

  // ─── Background Tracking (visibility API) ─────────────────────

  useEffect(() => {
    const handleVisibilityChange = () => {
      const hidden = document.visibilityState === 'hidden';
      setIsBackground(hidden);

      if (hidden && gpsActive) {
        // App is in background but still running
        setBackgroundTracking(true);
        console.log('App went to background — GPS continues tracking');
      } else if (!hidden && backgroundTracking && gpsActive) {
        // App came back to foreground
        setBackgroundTracking(false);
        console.log('App returned to foreground');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle page hide (app switched away or minimized)
    document.addEventListener('pagehide', () => {
      if (gpsActive) {
        setBackgroundTracking(true);
        console.log('Page hidden — background tracking active');
      }
    });

    // Handle page show (app brought back)
    document.addEventListener('pageshow', () => {
      if (backgroundTracking && gpsActive) {
        setBackgroundTracking(false);
        console.log('Page shown — tracking resumed');
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('pagehide', handleVisibilityChange);
      document.removeEventListener('pageshow', handleVisibilityChange);
    };
  }, [gpsActive, backgroundTracking]);

  // ─── Trip Controls ─────────────────────────────────────────────

  const handleStartTrip = async () => {
    if (!gpsConnected) {
      alert('GPS is not connected. Please scan a QR code first to activate GPS tracking.');
      return;
    }
    if (!assignedBus) {
      alert('Please set your assigned bus number first.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.startTrip();
      if (res.trip) {
        setActiveTrip(res.trip);
        activeTripRef.current = res.trip;
        setTripStatus('Active');
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('already has an active trip')) {
        const activeRes = await api.getActiveTrip();
        if (activeRes.trip) {
          setActiveTrip(activeRes.trip);
          activeTripRef.current = activeRes.trip;
          setTripStatus('Active');
        }
      } else {
        alert(err.message || 'Failed to start trip.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEndTrip = async () => {
    if (tripStatus !== 'Active' || !activeTripRef.current?.id) {
      alert('No active trip to end.');
      return;
    }

    setLoading(true);
    try {
      await api.endTrip(activeTripRef.current.id);
      setTripStatus('Completed');
      setActiveTrip(null);
      activeTripRef.current = null;
      setTimeout(() => {
        setTripStatus('Idle');
      }, 2000);
    } catch (err) {
      alert(err.message || 'Failed to end trip.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Cleanup ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white font-sans overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl"></div>
      </div>

      {/* Top Nav */}
      <header className="relative z-10 border-b border-white/5 bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-bold text-white hidden sm:block">PSIT Connects</span>
              <span className="text-xs text-orange-400/60 border border-orange-500/20 px-2 py-0.5 rounded-full hidden sm:block">
                Driver Module
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs text-emerald-300">
                <Phone className="w-3 h-3" />
                <span className="hidden sm:inline">+91 </span>
                <span>{registeredMobile}</span>
              </div>
              {gpsConnected && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                  backgroundTracking
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                }`}>
                  {backgroundTracking ? (
                    <>
                      <Wifi className="w-3 h-3" />
                      <span>Background</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3 h-3" />
                      <span>Connected</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* LEFT: Status & Trip Panel */}
          <div className="lg:col-span-2 space-y-5">

            {/* Greeting */}
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Driver Dashboard
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                {driverName ? `Welcome, ${driverName}` : 'Sign in to start your shift'}
              </p>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Assigned Bus Card */}
              <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
                    <Bus className="w-3.5 h-3.5" />
                    Assigned Bus
                  </h3>
                  <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-full">
                    {assignedBus || 'Not set'}
                  </span>
                </div>

                {assignedBus ? (
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">{assignedBus}</p>
                    <p className="text-xs text-slate-400 mt-1">Bus assigned to this driver</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Bus className="w-6 h-6 text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-400">No bus assigned yet</p>
                    <p className="text-xs text-slate-500 mt-1">Check with transport incharge</p>
                  </div>
                )}

                {/* Bus input (inline edit) */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <input
                    type="text"
                    placeholder="e.g. PSIT-07"
                    value={assignedBus}
                    onChange={(e) => setAssignedBus(e.target.value.toUpperCase())}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all uppercase"
                  />
                </div>
              </div>

              {/* Trip Status Card */}
              <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Trip Status
                  </h3>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    tripStatus === 'Active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : tripStatus === 'Completed'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-slate-700/50 text-slate-400 border border-white/5'
                  }`}>
                    {tripStatus}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Trip status icon */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    tripStatus === 'Active'
                      ? 'bg-emerald-500/20'
                      : tripStatus === 'Completed'
                      ? 'bg-blue-500/20'
                      : 'bg-slate-800'
                  }`}>
                    {tripStatus === 'Active' ? (
                      <MapPin className="w-7 h-7 text-emerald-400 animate-pulse" />
                    ) : tripStatus === 'Completed' ? (
                      <Square className="w-7 h-7 text-blue-400" />
                    ) : (
                      <Clock className="w-7 h-7 text-slate-500" />
                    )}
                  </div>

                  <div>
                    <p className={`text-lg font-bold ${
                      tripStatus === 'Active' ? 'text-emerald-400' :
                      tripStatus === 'Completed' ? 'text-blue-400' :
                      'text-white'
                    }`}>
                      {tripStatus === 'Active' ? 'Trip In Progress' :
                       tripStatus === 'Completed' ? 'Trip Completed' :
                       'No Active Trip'}
                    </p>
                    {tripStatus === 'Active' && gpsCoords && (
                      <p className="text-xs text-slate-400 mt-1">
                        GPS active • {gpsAccuracy ? `${Math.round(gpsAccuracy)}m accuracy` : 'Acquiring signal'}
                      </p>
                    )}
                    {tripStatus === 'Idle' && (
                      <p className="text-xs text-slate-400 mt-1">
                        Start a trip when assigned
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleStartTrip}
                disabled={tripStatus === 'Active' || !gpsConnected || loading}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700/50 disabled:text-slate-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed group"
              >
                {loading && tripStatus === 'Active' ? (
                  <span className="animate-pulse">Ending Trip...</span>
                ) : (
                  <>
                    <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Start Trip</span>
                  </>
                )}
              </button>

              <button
                onClick={handleEndTrip}
                disabled={tripStatus !== 'Active' || loading}
                className="bg-red-500 hover:bg-red-600 disabled:bg-slate-700/50 disabled:text-slate-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed group"
              >
                <Square className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>End Trip</span>
              </button>

              <button
                onClick={() => scannerActive ? stopScanner() : startScanner()}
                disabled={cameraLoading}
                className={`flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl shadow-lg transition-all cursor-pointer ${
                  scannerActive
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-orange-500/20 hover:shadow-orange-500/30'
                }`}
              >
                {cameraLoading ? (
                  <span className="animate-pulse">Opening Camera...</span>
                ) : scannerActive ? (
                  <>
                    <Square className="w-4 h-4" />
                    <span>Stop Scan</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Test Scan QR</span>
                  </>
                )}
              </button>
            </div>

            {/* QR Scanner Modal / Panel */}
            {scannerActive && (
              <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                  {/* Scanner header */}
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                        <QrCode className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">QR Scanner</h3>
                        <p className="text-xs text-slate-400">Point at the student's QR code</p>
                      </div>
                    </div>
                    <button
                      onClick={stopScanner}
                      className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Camera viewfinder */}
                  <div className="relative aspect-square bg-slate-900 flex items-center justify-center">
                    {cameraLoading && (
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-sm text-slate-400">Requesting camera access...</p>
                        <p className="text-xs text-slate-500 mt-1">Allow camera when prompted</p>
                      </div>
                    )}

                    {scannerError && (
                      <div className="text-center px-6">
                        <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <WifiOff className="w-6 h-6 text-red-400" />
                        </div>
                        <p className="text-sm text-red-300 font-semibold">{scannerError}</p>
                        <p className="text-xs text-slate-400 mt-1">Retrying in 2 seconds...</p>
                      </div>
                    )}

                    {/* QR reader container */}
                    <div
                      id="qr-reader"
                      className="w-full h-full flex items-center justify-center"
                    >
                      {!cameraLoading && !scannerError && (
                        <div className="text-center">
                          <div className="relative w-48 h-48 mx-auto mb-4">
                            {/* Scanning frame animation */}
                            <div className="absolute inset-0 border-2 border-orange-500/30 rounded-2xl overflow-hidden">
                              <div className="absolute inset-y-0 left-0 w-1 bg-orange-500 animate-pulse"></div>
                              <div className="absolute inset-y-0 right-0 w-1 bg-orange-500 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                            </div>
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                              <span className="text-xs text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full">
                                Test Mode — Simulating
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-slate-400">Simulating QR scan for testing...</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Will auto-connect GPS with a registered mobile
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Scan result overlay */}
                    {scanResult && (
                      <div className="absolute inset-0 bg-emerald-500/90 flex items-center justify-center">
                        <div className="text-center px-6">
                          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
                            <MapPin className="w-8 h-8 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">QR Scanned</h3>
                          <p className="text-2xl font-mono font-bold text-emerald-300">
                            +91 {scanResult.mobile}
                          </p>
                          <p className="text-sm text-white/70 mt-2">
                            GPS tracking activated
                          </p>
                          <button
                            onClick={() => {
                              setScanResult(null);
                              setScannerActive(false);
                              stopScanner();
                            }}
                            className="mt-4 bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-xl text-sm transition-all cursor-pointer"
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scanner footer */}
                  <div className="flex items-center justify-between p-4 border-t border-white/10 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Test Mode Active</span>
                    </div>
                    <div className="text-slate-500">
                      Click to simulate QR scan
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GPS Status Bar */}
            <div className={`bg-slate-900/70 backdrop-blur-xl border rounded-2xl p-4 ${
              gpsConnected
                ? 'border-emerald-500/20'
                : 'border-white/10'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    gpsConnected
                      ? 'bg-emerald-500/20'
                      : 'bg-slate-800'
                  }`}>
                    {gpsConnected ? (
                      backgroundTracking ? (
                        <Wifi className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Wifi className="w-5 h-5 text-emerald-400 animate-pulse" />
                      )
                    ) : (
                      <WifiOff className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${
                      gpsConnected
                        ? backgroundTracking
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                        : 'text-slate-400'
                    }`}>
                      {gpsConnected ? (
                        backgroundTracking ? 'Background GPS Active' : 'GPS Connected'
                      ) : 'GPS Not Connected'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {gpsConnected && gpsCoords ? (
                        <span className="text-slate-400">
                          Lat: {gpsCoords.latitude.toFixed(6)} • Lng: {gpsCoords.longitude.toFixed(6)}
                          {gpsAccuracy ? ` • ±${Math.round(gpsAccuracy)}m` : ''}
                        </span>
                      ) : (
                        'Scan a QR code to activate GPS tracking'
                      )}
                    </p>
                  </div>
                </div>

                {/* Signal strength indicator */}
                {gpsConnected && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Signal:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`w-2 h-4 rounded-sm ${
                            gpsSignal === 'excellent' || (gpsSignal === 'good' && level <= 2) || (gpsSignal === 'weak' && level === 1)
                              ? 'bg-emerald-400'
                              : gpsSignal === 'good' && level === 3
                              ? 'bg-emerald-400/50'
                              : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-500 capitalize">{gpsSignal}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Driver Info Input */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-300/80 mb-2">
                Driver Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all"
              />
            </div>
          </div>

          {/* RIGHT: Info Sidebar */}
          <div className="lg:col-span-1 space-y-4">

            {/* How it works */}
            <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-4">Workflow</h3>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'Scan QR', desc: 'Scan student QR to pair' },
                  { step: '2', title: 'GPS Activates', desc: 'Location tracking starts' },
                  { step: '3', title: 'Start Trip', desc: 'Begin your assigned route' },
                  { step: '4', title: 'Track Live', desc: 'GPS updates in real-time' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Background tracking info */}
            <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Background Tracking</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                GPS continues tracking even when you switch apps or the screen is off.
                {backgroundTracking && (
                  <span className="text-amber-400 block mt-1">Currently in background — tracking active</span>
                )}
              </p>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Note: If the app is fully closed from recents, tracking stops. 
                Keep the app running in background for continuous GPS.
              </p>
            </div>

            {/* Registered mobile */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Phone className="w-4.5 h-4.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Verified Number</p>
                  <p className="text-sm text-white font-semibold">+91 {registeredMobile}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
