import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Kiosk from './components/Kiosk';
import TeacherDashboard from './components/TeacherDashboard';

function App() {
  return (
    <Router>
      <Header />
      
      {/* Notice this opening div */}
      <div style={{ padding: '20px' }}>
        <Routes>
          <Route path="/" element={<Kiosk />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
        </Routes>
      {/* And notice this closing div right before the Router closes */}
      </div>
      
    </Router>
  );
}

export default App;
