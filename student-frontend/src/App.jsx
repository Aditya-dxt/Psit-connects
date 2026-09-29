import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login'; 
import StudentDashboard from './studentdashboard';
import LiveLOcation from './LiveLocation'; // Updated file name imported here

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Login Page */}
        <Route path="/" element={<Login />} />
        
        {/* Student Dashboard Page */}
        <Route path="/dashboard" element={<StudentDashboard />} />

        {/* Live Tracking / Location Page */}
        <Route path="/live-tracking" element={<LiveLOcation />} />
      </Routes>
    </Router>
  );
}