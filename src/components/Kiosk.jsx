import React, { useState, useEffect } from 'react';
import { ref, push, onValue, update, get, query, orderByChild, equalTo } from 'firebase/database';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../firebase';

export default function Kiosk() {
  const [isAuthorized, setIsAuthorized] = useState(!!localStorage.getItem('kiosk_room_id'));
  const [roomId, setRoomId] = useState(localStorage.getItem('kiosk_room_id') || '');
  
  // Setup State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [setupRoom, setSetupRoom] = useState('');
  const [staffUser, setStaffUser] = useState(null);

  // Kiosk State
  const [studentId, setStudentId] = useState('');
  const [reason, setReason] = useState('Restroom');
  const [otherReason, setOtherReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Live Data State
  const [activePasses, setActivePasses] = useState([]);
  const [roomSettings, setRoomSettings] = useState({
    maxTotal: 2, combinedRestroomWater: 1, nurse: 1, office: 1, library: 1, other: 1
  });
  const [now, setNow] = useState(Date.now());

  // Timer for color status updates
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000); // update every 15s
    return () => clearInterval(timer);
  }, []);

  // Listeners
  useEffect(() => {
    if (!isAuthorized) {
      const unsubAuth = auth.onAuthStateChanged(user => setStaffUser(user));
      return () => unsubAuth();
    }

    // Listen to Room Settings
    const settingsRef = ref(db, `roomSettings/${roomId}`);
    const unsubSettings = onValue(settingsRef, (snap) => {
      if (snap.exists()) setRoomSettings(snap.val());
    });

    // Listen to Active Passes for this room
    const passesRef = ref(db, 'passes');
    const unsubPasses = onValue(passesRef, (snap) => {
      const passes = [];
      snap.forEach(child => {
        const pass = child.val();
        if (pass.roomId === roomId && pass.returned === false) {
          passes.push(pass);
        }
      });
      setActivePasses(passes);
    });

    return () => { unsubSettings(); unsubPasses(); };
  }, [isAuthorized, roomId]);

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, loginEmail, loginPass); } 
    catch (err) { alert("Invalid login."); }
  };

  const handleAuthorize = () => {
    if (!setupRoom) return alert("Enter a room number");
    const token = Math.random().toString(36).substring(2);
    localStorage.setItem('kiosk_room_id', setupRoom.toUpperCase());
    localStorage.setItem('kiosk_auth_token', token);
    setRoomId(setupRoom.toUpperCase());
    setIsAuthorized(true);
    signOut(auth);
  };

  const getStatusColorClass = (timestamp) => {
    const mins = Math.floor((now - timestamp) / 60000);
    if (mins < 5) return 'bg-green';
    if (mins < 10) return 'bg-yellow';
    return 'bg-red';
  };

  // --- SIGN OUT LOGIC ---
  const handleSignOut = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    const id = studentId.trim().toUpperCase();
    if (id.length !== 5) return setErrorMsg('Please enter a valid 5-character ID.');
    const finalReason = reason === 'Other' ? otherReason : reason;
    if (!finalReason) return setErrorMsg('Please provide a reason.');

    // Enforce Active Limits
    if (activePasses.length >= roomSettings.maxTotal) {
      return setErrorMsg(`Room limit reached. Only ${roomSettings.maxTotal} passes allowed at once.`);
    }

    if (reason === 'Restroom' || reason === 'Water') {
      const rwCount = activePasses.filter(p => p.reason === 'Restroom' || p.reason === 'Water').length;
      if (rwCount >= roomSettings.combinedRestroomWater) return setErrorMsg(`Restroom/Water pass limit reached.`);
    } else {
      const reasonCount = activePasses.filter(p => p.reason === reason).length;
      const limitMap = { 'Nurse': roomSettings.nurse, 'Office': roomSettings.office, 'Library': roomSettings.library, 'Other': roomSettings.other };
      if (reasonCount >= limitMap[reason]) return setErrorMsg(`${reason} pass limit reached.`);
    }

    // Daily Limit check (Student-specific)
    const midnight = new Date(); midnight.setHours(0,0,0,0);
    const passesRef = ref(db, 'passes');
    let dailyCount = 0;
    
    onValue(passesRef, snap => {
      snap.forEach(c => {
        if(c.val().studentId === id && c.val().timestamp >= midnight.getTime()) dailyCount++;
      });
    }, { onlyOnce: true });

    if (dailyCount >= 6) return setErrorMsg("Daily limit reached. See teacher for emergency override.");

    try {
      await push(ref(db, 'passes'), {
        studentId: id, roomId, reason: finalReason, timestamp: Date.now(), returned: false, emergency: false
      });
      setSuccessMsg('Pass approved.');
      setStudentId(''); setReason('Restroom'); setOtherReason('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) { setErrorMsg('Database error.'); }
  };

  // --- SIGN IN LOGIC ---
  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    const id = studentId.trim().toUpperCase();
    if (id.length !== 5) return setErrorMsg('Please enter a valid 5-character ID.');

    try {
      const passesRef = ref(db, 'passes');
      // Query Firebase for all passes matching this student ID
      const studentQuery = query(passesRef, orderByChild('studentId'), equalTo(id));
      const snapshot = await get(studentQuery);

      let passToReturn = null;
      if (snapshot.exists()) {
        // Find the active one
        snapshot.forEach((child) => {
          if (child.val().returned === false) {
            passToReturn = child.key;
          }
        });
      }

      if (passToReturn) {
        await update(ref(db, `passes/${passToReturn}`), { returned: true });
        setSuccessMsg('Welcome back! You are signed in.');
        setStudentId('');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg('No active pass found for this ID.');
      }
    } catch (err) { 
      console.error(err);
      setErrorMsg('Database error while signing in.'); 
    }
  };

  // UI: UNAUTHORIZED KIOSK
  if (!isAuthorized) {
    return (
      <div className="container" style={{ maxWidth: '400px', marginTop: '40px' }}>
        <div className="card header-card">
          <h2 style={{marginTop: 0}}>Kiosk Setup</h2>
          {!staffUser ? (
            <form onSubmit={handleStaffLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p>Staff login required to authorize this device.</p>
              <input type="email" placeholder="Teacher Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              <input type="password" placeholder="Password" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
              <button type="submit">Login</button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p>Logged in as {staffUser.email}</p>
              <input type="text" placeholder="Enter Room Number" value={setupRoom} onChange={e => setSetupRoom(e.target.value)} />
              <button onClick={handleAuthorize}>Authorize Kiosk</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // UI: AUTHORIZED STUDENT KIOSK
  return (
    <div className="container" style={{ maxWidth: '500px', marginTop: '40px' }}>
      <div className="card header-card" style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: '8px' }}>Room {roomId}</h1>
        <div style={{ color: '#5f6368', marginBottom: '24px' }}>
          <strong>{activePasses.length}</strong> / {roomSettings.maxTotal} Passes Out
        </div>

        {/* Anonymous Active Passes Status */}
        {activePasses.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {activePasses.map(pass => (
              <span key={pass.timestamp} className={`status-badge ${getStatusColorClass(pass.timestamp)}`}>
                Active Pass
              </span>
            ))}
          </div>
        )}

        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          <input type="text" placeholder="5-Character ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} maxLength={5} style={{ textTransform: 'uppercase', textAlign: 'center', fontSize: '24px', letterSpacing: '2px' }} />
          
          <select value={reason} onChange={e => setReason(e.target.value)}>
            <option value="Restroom">Restroom</option>
            <option value="Water">Water</option>
            <option value="Nurse">Nurse</option>
            <option value="Office">Office</option>
            <option value="Library">Library</option>
            <option value="Other">Other</option>
          </select>

          {reason === 'Other' && (
             <input type="text" placeholder="Explain reason..." value={otherReason} onChange={e => setOtherReason(e.target.value)} />
          )}

          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <button type="button" onClick={handleSignOut} style={{ flex: 1, padding: '16px', fontSize: '16px' }}>Sign Out</button>
            <button type="button" onClick={handleSignIn} className="secondary-btn" style={{ flex: 1, padding: '16px', fontSize: '16px' }}>Sign In</button>
          </div>
        </form>

        {errorMsg && <div style={{ color: '#d93025', marginTop: '16px', fontWeight: '500' }}>{errorMsg}</div>}
        {successMsg && <div style={{ color: '#1e8e3e', marginTop: '16px', fontWeight: '500' }}>{successMsg}</div>}
      </div>
    </div>
  );
}
