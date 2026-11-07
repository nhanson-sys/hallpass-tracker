import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Kiosk from './components/Kiosk';
import TeacherDashboard from './components/TeacherDashboard';

function App() {
  return (
    <Router>
      <div style={{ padding: '10px', backgroundColor: '#f0f0f0', textAlign: 'right' }}>
        <Link to="/" style={{ marginRight: '15px' }}>Student Kiosk</Link>
        <Link to="/teacher">Teacher Dashboard</Link>
      </div>
      
      <Routes>
        <Route path="/" element={<Kiosk />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
