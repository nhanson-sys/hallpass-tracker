import React, { useState, useEffect } from 'react';
import { ref, onValue, update, push } from 'firebase/database';
import { db } from '../firebase';

export default function TeacherDashboard() {
  const [activePasses, setActivePasses] = useState([]);
  const [studentNames, setStudentNames] = useState({});
  const [setupRoomId, setSetupRoomId] = useState('');
  const [emergencyId, setEmergencyId] = useState('');
  
  // Load Local Roster on Mount
  useEffect(() => {
    const savedRoster = localStorage.getItem('local_student_roster');
    if (savedRoster) {
      setStudentNames(JSON.parse(savedRoster));
    }

    // Listen to Active Passes
    const passesRef = ref(db, 'passes');
    const unsubscribe = onValue(passesRef, (snapshot) => {
      const passes = [];
      snapshot.forEach((child) => {
        const pass = child.val();
        if (pass.returned === false) {
          passes.push({ id: child.key, ...pass });
        }
      });
      setActivePasses(passes);
    });

    return () => unsubscribe();
  }, []);

  // --- CSV Roster Upload ---
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
          const name = parts[1].trim();
          if (id.length === 5) {
            mapping[id] = name;
          }
        }
      });

      setStudentNames(mapping);
      localStorage.setItem('local_student_roster', JSON.stringify(mapping));
      alert("Local roster updated!");
    };
    reader.readAsText(file);
  };

  // --- Kiosk Setup ---
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
    alert("Kiosk authorization removed from this device.");
    window.location.reload();
  };

  // --- Emergency Override ---
  const handleEmergencyUse = async (e) => {
    e.preventDefault();
    const id = emergencyId.trim().toUpperCase();
    if (id.length !== 5) return alert('Enter a valid 5-character ID');
    
    // Grabs the room ID from the teacher's configured kiosk state
    const currentRoom = localStorage.getItem('kiosk_room_id') || 'Unknown';

    try {
      await push(ref(db, 'passes'), {
        studentId: id,
        roomId: currentRoom,
        reason: 'Emergency Override',
        timestamp: Date.now(),
        returned: false,
        emergency: true
      });
      setEmergencyId('');
      alert("Emergency pass granted.");
    } catch (err) {
      console.error(err);
      alert("Error creating emergency pass.");
    }
  };

  // --- Return Student ---
  const handleReturn = async (passId) => {
    try {
      const passRef = ref(db, `passes/${passId}`);
      await update(passRef, { returned: true });
    } catch (err) {
      console.error(err);
    }
  };

  const currentConfiguredRoom = localStorage.getItem('kiosk_room_id');

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Teacher Dashboard</h1>

      {/* 1. Kiosk Management */}
      <section style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px' }}>
        <h2>Device Kiosk Status</h2>
        {currentConfiguredRoom ? (
          <div>
            <p>Status: <strong>Active Kiosk for Room {currentConfiguredRoom}</strong></p>
            <button onClick={handleDeauthorize} style={{ color: 'red' }}>Deauthorize Device</button>
          </div>
        ) : (
          <div>
            <input 
              type="text" 
              placeholder="Enter Room Number (e.g. GC102)" 
              value={setupRoomId}
              onChange={(e) => setSetupRoomId(e.target.value)}
            />
            <button onClick={handleAuthorizeKiosk}>Authorize & Lock to Room</button>
          </div>
        )}
      </section>

      {/* 2. Roster Management */}
      <section style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px' }}>
        <h2>Local Roster Upload</h2>
        <p><small>Loads names locally into your browser. Never sent to Firebase. CSV format: <i>ID, Name</i></small></p>
        <input type="file" accept=".csv" onChange={handleLocalCsvUpload} />
        <p>Currently loaded: {Object.keys(studentNames).length} students.</p>
      </section>

      {/* 3. Emergency Override */}
      <section style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px', backgroundColor: '#fff3f3' }}>
        <h2 style={{ color: 'red' }}>🚨 Emergency Override</h2>
        <form onSubmit={handleEmergencyUse}>
          <input 
            type="text" 
            placeholder="Student ID" 
            value={emergencyId}
            onChange={(e) => setEmergencyId(e.target.value)}
            maxLength={5}
          />
          <button type="submit" style={{ backgroundColor: 'red', color: 'white', marginLeft: '10px' }}>
            Grant Emergency Pass
          </button>
        </form>
      </section>

      {/* 4. Active Passes */}
      <section>
        <h2>Active Passes (School-wide)</h2>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc' }}>
              <th>Student</th>
              <th>Room</th>
              <th>Time Out</th>
              <th>Notes</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {activePasses.length === 0 ? (
              <tr><td colSpan="5">No active passes.</td></tr>
            ) : (
              activePasses.map(pass => {
                // Map the ID to the local name if it exists, otherwise just show ID
                const displayName = studentNames[pass.studentId] 
                  ? `${studentNames[pass.studentId]} (${pass.studentId})` 
                  : pass.studentId;

                const timeStr = new Date(pass.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                return (
                  <tr key={pass.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 0' }}>{displayName}</td>
                    <td>{pass.roomId}</td>
                    <td>{timeStr}</td>
                    <td style={{ color: 'red', fontWeight: 'bold' }}>{pass.emergency ? 'EMERGENCY' : ''}</td>
                    <td>
                      <button onClick={() => handleReturn(pass.id)}>Mark Returned</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
