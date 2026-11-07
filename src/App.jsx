import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Kiosk from './components/Kiosk';
import TeacherDashboard from './components/TeacherDashboard';

function App() {
  return (
    <Router>
      <div className="navbar">
        <Link to="/">Student Kiosk</Link>
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
