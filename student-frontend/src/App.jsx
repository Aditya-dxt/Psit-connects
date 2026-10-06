import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login'; 
import StudentDashboard from './studentdashboard';
import LiveLOcation from './LiveLocation'; // Updated file name imported here
import DriverDashboard from './driverdashboard'; // Member 1 - Driver module placeholder

import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Login Page */}
        <Route path="/" element={<Login />} />
        
        {/* Student Dashboard Page */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Driver Dashboard Page - Member 1 */}
        <Route
          path="/driver-dashboard"
          element={
            <ProtectedRoute allowedRole="driver">
              <DriverDashboard />
            </ProtectedRoute>
          }
        />

        {/* Live Tracking / Location Page */}
        <Route
          path="/live-tracking"
          element={
            <ProtectedRoute allowedRole="student">
              <LiveLOcation />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}