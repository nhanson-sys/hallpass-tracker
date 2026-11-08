import React, { useState, useEffect } from 'react';
import { ref, onValue, update, push, set } from 'firebase/database';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from '../firebase';

export default function TeacherDashboard() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [activePasses, setActivePasses] = useState([]);
  const [studentNames, setStudentNames] = useState({});
  const [emergencyId, setEmergencyId] = useState('');
  
  // Settings State
  const currentRoom = localStorage.getItem('kiosk_room_id') || '';
  const [settings, setSettings] = useState({
    maxTotal: 2, combinedRestroomWater: 1, nurse: 1, office: 1, library: 1, other: 1
  });
  const [now, setNow] = useState(Date.now());

  // Timer for status colors
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const savedRoster = localStorage.getItem('local_student_roster');
    if (savedRoster) setStudentNames(JSON.parse(savedRoster));

    // Listen to all active passes
    const unsubPasses = onValue(ref(db, 'passes'), (snap) => {
      const passes = [];
      snap.forEach((child) => {
        if (child.val().returned === false) passes.push({ id: child.key, ...child.val() });
      });
      // Sort to put current room at top
      passes.sort((a,b) => (a.roomId === currentRoom ? -1 : 1));
      setActivePasses(passes);
    });

    // Listen to Room Settings
    let unsubSettings = () => {};
    if (currentRoom) {
      unsubSettings = onValue(ref(db, `roomSettings/${currentRoom}`), snap => {
        if (snap.exists()) setSettings(snap.val());
      });
    }

    return () => { unsubPasses(); unsubSettings(); };
  }, [user, currentRoom]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (err) { alert("Invalid login."); }
  };

  const saveSettings = () => {
    if (!currentRoom) return alert("Authorize kiosk first.");
    set(ref(db, `roomSettings/${currentRoom}`), settings)
      .then(() => alert("Settings saved!"))
      .catch(() => alert("Error saving settings."));
  };

  const handleEmergencyUse = async (e) => {
    e.preventDefault();
    const id = emergencyId.trim().toUpperCase();
    if (id.length !== 5) return alert('Enter valid ID');
    try {
      await push(ref(db, 'passes'), {
        studentId: id, roomId: currentRoom || 'Unknown', reason: 'Emergency',
        timestamp: Date.now(), returned: false, emergency: true
      });
      setEmergencyId('');
    } catch (err) { alert("Error creating pass."); }
  };

  const getStatusColor = (timestamp) => {
    const mins = Math.floor((now - timestamp) / 60000);
    if (mins < 5) return 'text-green';
    if (mins < 10) return 'text-yellow';
    return 'text-red';
  };

  if (!user) {
    return (
      <div className="container" style={{ maxWidth: '400px', marginTop: '40px' }}>
        <div className="card header-card">
          <h2 style={{marginTop: 0}}>Staff Login</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      

      <div className="container">
        
        {/* Active Passes View */}
        <div className="card header-card">
          <button className="secondary-btn" onClick={() => signOut(auth)} style={{ marginLeft: '16px' }}>Sign Out</button>

          <h2 style={{marginTop: 0}}>Active Passes</h2>
          <table style={{marginTop: 0}}>
            <thead>
              <tr><th>Status</th><th>Student</th><th>Room</th><th>Reason</th><th>Time Out</th><th>Action</th></tr>
            </thead>
            <tbody>
              {activePasses.length === 0 ? <tr><td colSpan="6">No active passes.</td></tr> : activePasses.map(pass => {
                const minsElapsed = Math.floor((now - pass.timestamp) / 60000);
                return (
                <tr key={pass.id} style={pass.roomId === currentRoom ? {backgroundColor: '#f8fbff'} : {}}>
                  <td><span className={`status-dot ${getStatusColor(pass.timestamp).replace('text', 'bg')}`}></span> {minsElapsed}m</td>
                  <td style={{fontWeight: 500}}>{studentNames[pass.studentId] || pass.studentId}</td>
                  <td>{pass.roomId}</td>
                  <td>{pass.emergency ? <span className="status-badge bg-red">EMERGENCY</span> : pass.reason}</td>
                  <td>{new Date(pass.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  <td><button className="secondary-btn" onClick={() => update(ref(db, `passes/${pass.id}`), { returned: true })}>Return</button></td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* Room Rules Configuration */}
        <div className="card">
          <h2 style={{marginTop: 0}}>Room {currentRoom} Pass Limits</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div><label>Max Total Passes Allowed Out</label>
              <input type="number" min="1" max="10" style={{width: '100%', boxSizing: 'border-box'}} value={settings.maxTotal} onChange={e => setSettings({...settings, maxTotal: Number(e.target.value)})} /></div>
            <div><label>Combined Restroom/Water Limit</label>
              <input type="number" min="1" max="10" style={{width: '100%', boxSizing: 'border-box'}} value={settings.combinedRestroomWater} onChange={e => setSettings({...settings, combinedRestroomWater: Number(e.target.value)})} /></div>
            <div><label>Nurse Limit</label>
              <input type="number" min="1" max="10" style={{width: '100%', boxSizing: 'border-box'}} value={settings.nurse} onChange={e => setSettings({...settings, nurse: Number(e.target.value)})} /></div>
            <div><label>Office Limit</label>
              <input type="number" min="1" max="10" style={{width: '100%', boxSizing: 'border-box'}} value={settings.office} onChange={e => setSettings({...settings, office: Number(e.target.value)})} /></div>
            <div><label>Library Limit</label>
              <input type="number" min="1" max="10" style={{width: '100%', boxSizing: 'border-box'}} value={settings.library} onChange={e => setSettings({...settings, library: Number(e.target.value)})} /></div>
            <div><label>Other Limit</label>
              <input type="number" min="1" max="10" style={{width: '100%', boxSizing: 'border-box'}} value={settings.other} onChange={e => setSettings({...settings, other: Number(e.target.value)})} /></div>
          </div>
          <button onClick={saveSettings}>Save Room Limits</button>
        </div>

        {/* Emergency Override */}
        <div className="card" style={{ border: '1px solid #fecaca', backgroundColor: '#fef2f2' }}>
          <h2 style={{marginTop: 0, color: '#d93025'}}>🚨 Emergency Pass Override</h2>
          <form onSubmit={handleEmergencyUse} style={{ display: 'flex', gap: '16px' }}>
            <input type="text" placeholder="Student ID" value={emergencyId} onChange={e => setEmergencyId(e.target.value)} maxLength={5} />
            <button type="submit" className="danger-btn">Issue Override</button>
          </form>
        </div>

      </div>
    </div>
  );
}
