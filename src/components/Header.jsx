import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Header() {
  const tabContainerStyle = {
    display: 'flex', gap: '4px', borderBottom: '3px solid #1a73e8', padding: '0 16px', marginTop: '16px'
  };

  const getTabStyle = ({ isActive }) => ({
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    backgroundColor: isActive ? '#1a73e8' : '#e8eaed',
    color: isActive ? 'white' : '#5f6368',
    transition: 'background-color 0.2s ease',
  });

  return (
    <div style={tabContainerStyle}>
      <NavLink to="/" style={getTabStyle}>Student Kiosk</NavLink>
      <NavLink to="/teacher" style={getTabStyle}>Teacher Dashboard</NavLink>
    </div>
  );
}
