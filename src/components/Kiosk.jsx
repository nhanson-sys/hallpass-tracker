import React, { useState, useEffect } from 'react';
import { ref, push, get, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../firebase';

export default function Kiosk() {
  const [studentId, setStudentId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Kiosk Authorization State
  const roomId = localStorage.getItem('kiosk_room_id');
  const authToken = localStorage.getItem('kiosk_auth_token');

  if (!roomId || !authToken) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2>Device Not Authorized</h2>
        <p>This kiosk is not configured. A staff member must log in to authorize this device for a specific room.</p>
      </div>
    );
  }

  const handleSignOut = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    const id = studentId.trim().toUpperCase();
    if (id.length !== 5) {
      setErrorMsg('Please enter a valid 5-character ID.');
      return;
    }

    try {
      const passesRef = ref(db, 'passes');

      // 1. Check if anyone is currently out from THIS room
      const activeQuery = query(passesRef, orderByChild('returned'), equalTo(false));
      const activeSnapshot = await get(activeQuery);
      let roomActiveCount = 0;
      
      if (activeSnapshot.exists()) {
        activeSnapshot.forEach((child) => {
          if (child.val().roomId === roomId) {
            roomActiveCount++;
          }
        });
      }

      if (roomActiveCount >= 1) {
        setErrorMsg(`Please wait, a student from Room ${roomId} is currently out.`);
        return;
      }

      // 2. Check the daily limit (6 passes) for THIS student
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      
      const studentQuery = query(passesRef, orderByChild('studentId'), equalTo(id));
      const studentSnapshot = await get(studentQuery);
      
      let passesToday = 0;
      if (studentSnapshot.exists()) {
        studentSnapshot.forEach((child) => {
          if (child.val().timestamp >= midnight.getTime()) {
            passesToday++;
          }
        });
      }

      if (passesToday >= 6) {
        setErrorMsg("You have used all 6 of your allotted passes for today. If this is an emergency, please speak directly with your teacher.");
        return;
      }

      // 3. Create the pass
      await push(passesRef, {
        studentId: id,
        roomId: roomId,
        reason: 'Restroom', // Can be made into a dropdown if desired
        timestamp: Date.now(),
        returned: false,
        emergency: false
      });

      setSuccessMsg('Pass approved. You may go.');
      setStudentId('');
      
      // Auto-clear success message
      setTimeout(() => setSuccessMsg(''), 3000);

    } catch (err) {
      console.error(err);
      setErrorMsg('Database error. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
      <h1>Room {roomId} Hall Pass</h1>
      <form onSubmit={handleSignOut}>
        <input 
          type="text" 
          placeholder="Enter 5-Character ID" 
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          maxLength={5}
          style={{ padding: '15px', fontSize: '20px', width: '100%', marginBottom: '20px', textTransform: 'uppercase' }}
        />
        <button type="submit" style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer' }}>
          Sign Out
        </button>
      </form>
      
      {errorMsg && <div style={{ color: 'red', marginTop: '20px', padding: '10px', border: '1px solid red' }}>{errorMsg}</div>}
      {successMsg && <div style={{ color: 'green', marginTop: '20px', padding: '10px', border: '1px solid green' }}>{successMsg}</div>}
    </div>
  );
}
