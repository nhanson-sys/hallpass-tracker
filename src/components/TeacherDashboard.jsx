import React, { useState, useEffect } from 'react';
import { ref, onValue, update, push } from 'firebase/database';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from '../firebase';

export default function TeacherDashboard() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [activePasses, setActivePasses] = useState([]);
  const [studentNames, setStudentNames] = useState({});
  const [setupRoomId, setSetupRoomId] = useState('');
  const [emergencyId, setEmergencyId] = useState('');

  // Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Data Listeners (Only run if logged in)
  useEffect(() => {
    if (!user) return;
    
    const savedRoster = localStorage.getItem('local_student_roster');
    if (savedRoster) setStudentNames(JSON.parse(savedRoster));

    const passesRef = ref(db, 'passes');
    const unsubscribe = onValue(passesRef, (snapshot) => {
      const passes = [];
      snapshot.forEach((child) => {
        if (child.val().returned === false) {
          passes.push({ id: child.key, ...child.val() });
        }
      });
      setActivePasses(passes);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert("Invalid email or password.");
    }
  };

  const handleLogout = () => signOut(auth);

  // --- Handlers ---
  const handleLocalCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split(/\r?\n/);
      const mapping = {};
      lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const id = parts[0].trim().toUpperCase();
          if (id.length === 5) mapping[id] = parts[1].trim();
        }
      });
      setStudentNames(mapping);
      localStorage.setItem('local_student_roster', JSON.stringify(mapping));
      alert("Local roster updated!");
    };
    reader.readAsText(file);
  };

  const handleAuthorizeKiosk = () => {
    if (!setupRoomId) return alert("Please enter a room ID.");
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('kiosk_room_id', setupRoomId);
    localStorage.setItem('kiosk_auth_token', token);
    alert(`This device is now locked to Room ${setupRoomId}`);
    window.location.reload();
  };

  const handleDeauthorize = () => {
    localStorage.removeItem('kiosk_room_id');
    localStorage.removeItem('kiosk_auth_token');
    alert("Kiosk authorization removed.");
    window.location.reload();
  };

  const handleEmergencyUse = async (e) => {
    e.preventDefault();
    const id = emergencyId.trim().toUpperCase();
    if (id.length !== 5) return alert('Enter a valid 5-character ID');
    const currentRoom = localStorage.getItem('kiosk_room_id') || 'Unknown';
    try {
      await push(ref(db, 'passes'), {
        studentId: id, roomId: currentRoom, reason: 'Emergency Override',
        timestamp: Date.now(), returned: false, emergency: true
      });
      setEmergencyId('');
    } catch (err) { alert("Error creating pass."); }
  };

  const handleReturn = async (passId) => {
    await update(ref(db, `passes/${passId}`), { returned: true });
  };

  if (!user) {
    return (
      <div className="card" style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
        <h2>Staff Login</h2>
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '90%', marginBottom: '15px' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '90%', marginBottom: '15px' }} />
          <button type="submit" style={{ width: '95%' }}>Login</button>
        </form>
      </div>
    );
  }

  const currentConfiguredRoom = localStorage.getItem('kiosk_room_id');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Teacher Dashboard</h1>
        <button onClick={handleLogout} className="secondary-btn">Sign Out</button>
      </div>

      <section className="card">
        <h2>Device Kiosk Status</h2>
        {currentConfiguredRoom ? (
          <div>
            <p>Status: <strong>Active Kiosk for Room {currentConfiguredRoom}</strong></p>
            <button onClick={handleDeauthorize} className="danger-btn">Deauthorize Device</button>
          </div>
        ) : (
          <div>
            <input type="text" placeholder="Room Number (e.g. GC102)" value={setupRoomId} onChange={e => setSetupRoomId(e.target.value)} />
            <button onClick={handleAuthorizeKiosk}>Authorize & Lock</button>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Local Roster Upload</h2>
        <p><small>Names stay in your browser memory for privacy. CSV format: <i>ID, Name</i></small></p>
        <input type="file" accept=".csv" onChange={handleLocalCsvUpload} />
        <p>Loaded: {Object.keys(studentNames).length} students.</p>
      </section>

      <section className="card emergency-card">
        <h2 style={{ color: '#dc2626', marginTop: 0 }}>🚨 Emergency Override</h2>
        <form onSubmit={handleEmergencyUse} style={{ display: 'flex', gap: '10px' }}>
          <input type="text" placeholder="Student ID" value={emergencyId} onChange={e => setEmergencyId(e.target.value)} maxLength={5} />
          <button type="submit" className="danger-btn">Grant Emergency Pass</button>
        </form>
      </section>

      <section className="card">
        <h2>Active Passes</h2>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th>Student</th><th>Room</th><th>Time Out</th><th>Notes</th><th>Action</th></tr>
          </thead>
          <tbody>
            {activePasses.length === 0 ? <tr><td colSpan="5">No active passes.</td></tr> : activePasses.map(pass => (
              <tr key={pass.id}>
                <td>{studentNames[pass.studentId] ? `${studentNames[pass.studentId]} (${pass.studentId})` : pass.studentId}</td>
                <td>{pass.roomId}</td>
                <td>{new Date(pass.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td style={{ color: '#dc2626', fontWeight: 'bold' }}>{pass.emergency ? 'EMERGENCY' : ''}</td>
                <td><button onClick={() => handleReturn(pass.id)}>Return</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
