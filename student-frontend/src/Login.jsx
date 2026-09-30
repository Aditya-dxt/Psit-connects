import { useState } from 'react';
import { Bus, User, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function App() {
  const navigate = useNavigate();
  const [role, setRole] = useState('student'); // 'student' or 'driver'
  const [showRegister, setShowRegister] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Registration form fields (student only)
  const [regFullName, setRegFullName] = useState('');
  const [regRollNumber, setRegRollNumber] = useState('');
  const [regYearSection, setRegYearSection] = useState('');

  const handleSendOTP = async () => {
    setErrorMessage('');
    
    if (mobileNumber.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    // Database verification simulation
    setTimeout(() => {
      const registeredDatabaseNumbers = ['9876543210', '9123456789', '9988776655'];

      if (registeredDatabaseNumbers.includes(mobileNumber)) {
        setOtpSent(true);
      } else {
        setErrorMessage("Access Denied: Yeh mobile number transport database mein registered nahi hai.");
      }
      setLoading(false);
    }, 800);
  };

  const handleVerifyOTP = () => {
    if (otp.length === 4) {
      // OTP verify hone ke baad dashboard par mobile number aur role pass kar rahe hain
      const dashboardPath = role === 'driver' ? '/driver-dashboard' : '/dashboard';
      navigate(dashboardPath, { state: { mobileNumber, role } }); 
    } else {
      alert("Please enter a valid 4-digit OTP.");
    }
  };

  return (
    <div className="relative min-h-screen bg-[url('/bg-campus.webp')] bg-cover bg-center">
      <div className="absolute inset-0 bg-gradient-to-b from-orange-950/95 via-orange-900/70 to-transparent md:hidden"></div>

      <div className="relative z-10 flex flex-col items-center min-h-screen w-full px-6 pt-24">
        
        {/* Header Section */}
        <div className="bg-[#F58220] p-4 rounded-2xl mb-4 shadow-lg">
          <Bus className="text-white w-8 h-8" />
        </div>
        <h1 className="text-white text-4xl font-bold mb-2 tracking-wide">
          PSIT Connects
        </h1>
        <p className="text-[#F58220] text-sm font-medium mb-4">
          Know your bus. Know your time.
        </p>

        {/* Role Selector - Student / Driver */}
        <div className="flex gap-4 mb-8 w-full max-w-xs">
          <button
            onClick={() => setRole('student')}
            className={`flex items-center justify-center gap-2 flex-1 py-3.5 px-6 rounded-xl text-sm font-bold tracking-wide transition-all ${
              role === 'student'
                ? 'bg-[#F58220] text-white shadow-lg shadow-orange-500/30'
                : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/10'
            }`}
          >
            <User className="w-4 h-4" />
            Student
          </button>
          <button
            onClick={() => setRole('driver')}
            className={`flex items-center justify-center gap-2 flex-1 py-3.5 px-6 rounded-xl text-sm font-bold tracking-wide transition-all ${
              role === 'driver'
                ? 'bg-[#F58220] text-white shadow-lg shadow-orange-500/30'
                : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/10'
            }`}
          >
            <Truck className="w-4 h-4" />
            Driver
          </button>
        </div>

        {/* Login Form Section */}
        <div className="w-full max-w-sm flex flex-col gap-4 bg-transparent/10 p-6 rounded-3xl backdrop-blur-sm border border-white/10 shadow-2xl">
          
          {/* Error Message Box */}
          {errorMessage && (
            <div className="text-xs text-red-300 bg-red-950/60 border border-red-500/40 p-3 rounded-xl text-center">
              {errorMessage}
            </div>
          )}

          {/* ===== REGISTRATION FORM (Student only) ===== */}
          {showRegister && role === 'student' ? (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-xs font-bold tracking-wider uppercase">
                  Full Name
                </label>
                <input 
                  type="text" 
                  placeholder="Enter your full name"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full bg-slate-800/80 text-white placeholder-white/40 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#F58220] focus:ring-1 focus:ring-[#F58220] transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-xs font-bold tracking-wider uppercase">
                  Roll Number
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. 21CS1001"
                  value={regRollNumber}
                  onChange={(e) => setRegRollNumber(e.target.value)}
                  className="w-full bg-slate-800/80 text-white placeholder-white/40 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#F58220] focus:ring-1 focus:ring-[#F58220] transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-xs font-bold tracking-wider uppercase">
                  Year - Section
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. 2024 - A"
                  value={regYearSection}
                  onChange={(e) => setRegYearSection(e.target.value)}
                  className="w-full bg-slate-800/80 text-white placeholder-white/40 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#F58220] focus:ring-1 focus:ring-[#F58220] transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-xs font-bold tracking-wider uppercase">
                  Mobile Number
                </label>
                <input 
                  type="tel" 
                  maxLength="10"
                  placeholder="Enter 10-digit number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-800/80 text-white placeholder-white/40 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#F58220] focus:ring-1 focus:ring-[#F58220] transition-colors"
                />
              </div>
              <button 
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full bg-[#F58220] hover:bg-orange-600 text-white font-bold text-lg py-3.5 rounded-xl shadow-lg transition-colors mt-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Checking Database...' : 'Send OTP'}
              </button>
              <button 
                onClick={() => { setShowRegister(false); setErrorMessage(''); }}
                className="text-white/60 text-sm mt-2 hover:text-white transition-colors cursor-pointer"
              >
                Back to Login
              </button>
            </>
          ) : (
            /* ===== LOGIN FORM ===== */
            <>
              {!otpSent ? (
                /* STEP 1: MOBILE NUMBER VIEW */
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-white/80 text-xs font-bold tracking-wider uppercase">
                      Registered Mobile Number
                    </label>
                    <input 
                      type="tel" 
                      maxLength="10"
                      placeholder="Enter 10-digit number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-800/80 text-white placeholder-white/40 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#F58220] focus:ring-1 focus:ring-[#F58220] transition-colors"
                    />
                  </div>
                  <button 
                    onClick={handleSendOTP}
                    disabled={loading}
                    className="w-full bg-[#F58220] hover:bg-orange-600 text-white font-bold text-lg py-3.5 rounded-xl shadow-lg transition-colors mt-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Checking Database...' : 'Send OTP'}
                  </button>
                  {/* Not registered link - Student only */}
                  {role === 'student' && (
                    <button 
                      onClick={() => setShowRegister(true)}
                      className="text-[#F58220] text-sm hover:underline transition-colors cursor-pointer"
                    >
                      Not registered? Register here
                    </button>
                  )}
                </>
              ) : (
                /* STEP 2: OTP VERIFICATION VIEW */
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-white/80 text-xs font-bold tracking-wider uppercase">
                      Enter 4-Digit OTP
                    </label>
                    <input 
                      type="text" 
                      maxLength="4"
                      placeholder="••••"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-800/80 text-white placeholder-white/40 px-4 py-3 rounded-xl border border-white/10 text-center tracking-[1em] text-xl focus:outline-none focus:border-[#F58220] focus:ring-1 focus:ring-[#F58220] transition-colors"
                    />
                  </div>
                  <button 
                    onClick={handleVerifyOTP}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold text-lg py-3.5 rounded-xl shadow-lg transition-colors mt-2 cursor-pointer"
                  >
                    Verify & Login
                  </button>
                  
                  {/* Back button in case of a typo */}
                  <button 
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      setErrorMessage('');
                    }}
                    className="text-white/60 text-sm mt-2 hover:text-white transition-colors cursor-pointer"
                  >
                    Change Mobile Number
                  </button>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}