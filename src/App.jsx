import { useState } from 'react';
import { Bus } from 'lucide-react';

export default function App() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const handleSendOTP = () => {
    if (mobileNumber.length === 10) {
      setOtpSent(true); // Flips the switch to hide the number input and show the OTP input
    } else {
      alert("Please enter a valid 10-digit number.");
    }
  };

  const handleVerifyOTP = () => {
    alert("Logging in with OTP: " + otp);
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
          PSIT BusTrack
        </h1>
        <p className="text-[#F58220] text-sm font-medium mb-12">
          Know your bus. Know your time.
        </p>
        
        {/* Login Form Section */}
        <div className="w-full max-w-sm flex flex-col gap-4 bg-transparent/10 p-6 rounded-3xl backdrop-blur-sm border border-white/10 shadow-2xl">
          
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
                className="w-full bg-[#F58220] hover:bg-orange-600 text-white font-bold text-lg py-3.5 rounded-xl shadow-lg transition-colors mt-2"
              >
                Send OTP
              </button>
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
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold text-lg py-3.5 rounded-xl shadow-lg transition-colors mt-2"
              >
                Verify & Login
              </button>
              
              {/* Back button in case of a typo */}
              <button 
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                }}
                className="text-white/60 text-sm mt-2 hover:text-white transition-colors"
              >
                Change Mobile Number
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}