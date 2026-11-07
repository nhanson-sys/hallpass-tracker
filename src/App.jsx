import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// Initialize Firebase (Only once)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "hallpass-tracker-3476e.firebaseapp.com",
  databaseURL: "https://hallpass-tracker-3476e-default-rtdb.firebaseio.com",
  projectId: "hallpass-tracker-3476e",
  storageBucket: "hallpass-tracker-3476e.firebasestorage.app",
  messagingSenderId: "185741566583",
  appId: "1:185741566583:web:fafb32c73f921c01425c72"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

export default function App() {
  const [view, setView] = useState('kiosk');
  const [authenticatedTeacher, setAuthenticatedTeacher] = useState(null);
  
  // Auth Modal state
  const [loginCode, setLoginCode] = useState('NH000');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Password Change State
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [updatedPasswordInput, setUpdatedPasswordInput] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState('');

  // Kiosk Form state
  const [studentId, setStudentId] = useState('');
  const [reason, setReason] = useState('Restroom');
  const [kioskStatus, setKioskStatus] = useState({ type: '', msg: '' });

  // Database states
  const [userPasses, setUserPasses] = useState([]);
  const [allowedStudents, setAllowedStudents] = useState({});
  const [teachers, setTeachers] = useState({});
  
  // Admin Management states
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newTeacherCode, setNewTeacherCode] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [newTeacherRole, setNewTeacherRole] = useState('teacher');

  useEffect(() => {
    // Sync Passes
    const passesRef = db.ref('passes');
    passesRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const passList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setUserPasses(passList);
      } else {
        setUserPasses([]);
      }
    });

    // Sync Allowed Students
    const studentsRef = db.ref('allowedStudents');
    studentsRef.on('value', (snapshot) => {
      const data = snapshot.val();
      setAllowedStudents(data || {});
    });

    // Sync Teachers
    const teachersRef = db.ref('teachers');
    teachersRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTeachers(data);
      } else {
        const defaultTeachers = {
          NH000: { name: 'Mr. H (Admin)', role: 'admin', password: '1234', prefix: 'NH' },
          GC000: { name: 'Ms. C', role: 'teacher', password: '1234', prefix: 'GC' },
          LN000: { name: 'Mr. N', role: 'teacher', password: '1234', prefix: 'LN' },
          BH000: { name: 'Mrs. H', role: 'teacher', password: '1234', prefix: 'BH' },
          KB000: { name: 'Mr. B', role: 'teacher', password: '1234', prefix: 'KB' }
        };
        db.ref('teachers').set(defaultTeachers);
        setTeachers(defaultTeachers);
      }
    });

    return () => {
      passesRef.off();
      studentsRef.off();
      teachersRef.off();
    };
  }, []);

  // Teacher Login Handler
  const handleTeacherLogin = (e) => {
    e.preventDefault();
    const teacher = teachers[loginCode];
    if (teacher && teacher.password === loginPassword) {
      setAuthenticatedTeacher({ code: loginCode, ...teacher });
      setLoginError('');
      setLoginPassword('');
      setView('dashboard');
    } else {
      setLoginError('Invalid password for this account.');
    }
  };

  const handleTeacherLogout = () => {
    setAuthenticatedTeacher(null);
    setView('kiosk');
  };

  // Self-Service Password Change Handler
  const handleSelfPasswordChange = (e) => {
    e.preventDefault();
    const newPass = updatedPasswordInput.trim();
    if (!newPass || !authenticatedTeacher) return;

    db.ref(`teachers/${authenticatedTeacher.code}/password`).set(newPass);
    setAuthenticatedTeacher(prev => ({ ...prev, password: newPass }));
    
    setPassChangeSuccess('Password updated successfully!');
    setUpdatedPasswordInput('');
    setTimeout(() => {
      setPassChangeSuccess('');
      setShowChangePassModal(false);
    }, 1500);
  };

  // Student Sign Out / Sign In Logic
  const handleKioskSubmit = (action) => {
    const code = studentId.trim().toUpperCase();
    if (!code) return;

    if (!allowedStudents[code]) {
      setKioskStatus({ type: 'error', msg: `Student code "${code}" is not registered. Please check with your teacher.` });
      return;
    }

    const activePass = userPasses.find(p => p.studentId === code && !p.returned);

    if (action === 'out') {
      if (activePass) {
        setKioskStatus({ type: 'error', msg: `Student "${code}" is already signed out.` });
        return;
      }
      
      const roomPrefix = code.substring(0, 2);
      const roomActivePasses = userPasses.filter(p => !p.returned && p.studentId.startsWith(roomPrefix));
      
      if (roomActivePasses.length >= 1) {
        setKioskStatus({ type: 'error', msg: `Please wait, another student from room ${roomPrefix} is currently out.` });
        return;
      }

      db.ref('passes').push({
        studentId: code,
        reason,
        timestamp: Date.now(),
        returned: false
      });
      setKioskStatus({ type: 'success', msg: `Success! ${code} signed out for ${reason}.` });
      setStudentId('');
    } else if (action === 'in') {
      if (!activePass) {
        setKioskStatus({ type: 'error', msg: `No active pass found for "${code}".` });
        return;
      }
      db.ref(`passes/${activePass.id}`).update({ returned: true, returnTime: Date.now() });
      setKioskStatus({ type: 'success', msg: `Welcome back! ${code} signed back in.` });
      setStudentId('');
    }
  };

  // Admin Handlers
  const handleAddStudent = (e) => {
    e.preventDefault();
    const code = newStudentCode.trim().toUpperCase();
    if (code.length === 5) {
      db.ref(`allowedStudents/${code}`).set(true);
      setNewStudentCode('');
    }
  };

  const handleRemoveStudent = (code) => {
    db.ref(`allowedStudents/${code}`).remove();
  };

  const handleAddTeacher = (e) => {
    e.preventDefault();
    const code = newTeacherCode.trim().toUpperCase();
    const prefix = code.substring(0, 2);
    if (code.length === 5 && newTeacherName && newTeacherPassword) {
      db.ref(`teachers/${code}`).set({
        name: newTeacherName,
        role: newTeacherRole,
        password: newTeacherPassword,
        prefix: prefix
      });
      setNewTeacherCode('');
      setNewTeacherName('');
      setNewTeacherPassword('');
    }
  };

  const handleRemoveTeacher = (code) => {
    db.ref(`teachers/${code}`).remove();
  };

  const activePasses = userPasses.filter(p => !p.returned);
  const filteredPasses = activePasses.filter(pass => {
    if (!authenticatedTeacher) return false;
    if (authenticatedTeacher.role === 'admin') return true;
    
    const teacherPrefix = authenticatedTeacher.prefix || authenticatedTeacher.code.substring(0, 2);
    return pass.studentId.startsWith(teacherPrefix);
  });

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto relative bg-gray-100 font-sans">
      
      {/* Password Change Modal Overlay */}
      {showChangePassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Change Your Passcode</h3>
            <p className="text-xs text-gray-500 mb-4">Logged in as {authenticatedTeacher.name} ({authenticatedTeacher.code})</p>
            
            {passChangeSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 p-2 rounded mb-3 text-center text-xs font-bold">
                {passChangeSuccess}
              </div>
            )}

            <form onSubmit={handleSelfPasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">New Passcode</label>
                <input 
                  type="password" 
                  value={updatedPasswordInput} 
                  onChange={(e) => setUpdatedPasswordInput(e.target.value)}
                  placeholder="Enter new passcode" 
                  className="mt-1 block w-full rounded-md border-gray-300 border p-2 text-sm"
                  required 
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button 
                  type="button"
                  onClick={() => setShowChangePassModal(false)}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300">
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
                  Save New Passcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-white p-6 rounded-lg shadow-md mb-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hall Pass Tracker</h1>
          <p className="text-xs text-gray-500">
            {authenticatedTeacher 
              ? `Logged in: ${authenticatedTeacher.name} (${authenticatedTeacher.role.toUpperCase()})` 
              : 'Student Kiosk Mode'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => { setView('kiosk'); setKioskStatus({type: '', msg: ''}); }} 
            className={`px-4 py-2 rounded font-medium ${view === 'kiosk' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            Student Kiosk
          </button>
          
          {authenticatedTeacher ? (
            <>
              <button 
                onClick={() => setView('dashboard')} 
                className={`px-4 py-2 rounded font-medium ${view === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                Dashboard
              </button>
              {authenticatedTeacher.role === 'admin' && (
                <button 
                  onClick={() => setView('admin')} 
                  className={`px-4 py-2 rounded font-medium ${view === 'admin' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                  Manage Roster
                </button>
              )}
              <button 
                onClick={() => setShowChangePassModal(true)} 
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded font-medium text-sm hover:bg-gray-200 border">
                Change Password
              </button>
              <button 
                onClick={handleTeacherLogout} 
                className="px-3 py-2 bg-red-100 text-red-700 rounded font-medium text-sm hover:bg-red-200">
                Sign Out Staff
              </button>
            </>
          ) : (
            <button 
              onClick={() => setView('login')} 
              className="px-4 py-2 bg-gray-800 text-white rounded font-medium hover:bg-gray-900">
              Teacher Login
            </button>
          )}
        </div>
      </header>

      {/* VIEW 1: STUDENT KIOSK */}
      {view === 'kiosk' && (
        <main className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4 text-center">Student Sign Out / Sign In</h2>
          
          {kioskStatus.msg && (
            <div className={`p-3 rounded mb-4 text-center font-bold text-sm border ${
              kioskStatus.type === 'error' 
                ? 'bg-red-100 border-red-400 text-red-700' 
                : 'bg-green-100 border-green-400 text-green-700'
            }`}>
              {kioskStatus.msg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Enter Your 5-Character Code</label>
              <input 
                type="text" 
                value={studentId} 
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. NH101" 
                maxLength={5}
                className="mt-1 block w-full rounded-md border-gray-300 border p-3 text-xl font-mono tracking-widest text-center uppercase focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reason for Pass</label>
              <select 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 border p-3">
                <option value="Restroom">Restroom</option>
                <option value="Water">Water</option>
                <option value="Nurse">Nurse</option>
                <option value="Main Office">Main Office</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button 
                onClick={() => handleKioskSubmit('out')} 
                className="bg-green-600 text-white py-3 rounded-md text-lg font-bold hover:bg-green-700 transition shadow">
                Sign OUT
              </button>
              <button 
                onClick={() => handleKioskSubmit('in')} 
                className="bg-blue-600 text-white py-3 rounded-md text-lg font-bold hover:bg-blue-700 transition shadow">
                Sign IN
              </button>
            </div>
          </div>
        </main>
      )}

      {/* VIEW 2: TEACHER LOGIN MODAL */}
      {view === 'login' && (
        <main className="bg-white p-8 rounded-lg shadow-md max-w-sm mx-auto">
          <h2 className="text-xl font-semibold mb-4 text-center">Teacher / Admin Login</h2>
          {loginError && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-2 rounded mb-3 text-center text-xs font-bold">
              {loginError}
            </div>
          )}
          <form onSubmit={handleTeacherLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Staff ID</label>
              <select 
                value={loginCode} 
                onChange={(e) => setLoginCode(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 border p-2 bg-gray-50 font-mono">
                {Object.keys(teachers).map(code => (
                  <option key={code} value={code}>
                    {teachers[code].name} ({code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Passcode</label>
              <input 
                type="password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password" 
                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                required 
              />
            </div>
            <button type="submit" className="w-full bg-gray-800 text-white py-2 rounded font-bold hover:bg-gray-900">
              Authenticate
            </button>
          </form>
        </main>
      )}

      {/* VIEW 3: TEACHER & ADMIN DASHBOARD */}
      {view === 'dashboard' && authenticatedTeacher && (
        <main className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {authenticatedTeacher.role === 'admin' ? 'Building-Wide Active Passes' : `Room (${authenticatedTeacher.prefix}) Active Passes`}
              </h2>
              <p className="text-xs text-gray-500">
                {authenticatedTeacher.role === 'admin' 
                  ? 'Displaying passes across all rooms' 
                  : `Displaying passes for teacher code ${authenticatedTeacher.code}`}
              </p>
            </div>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
              {filteredPasses.length} Out of Class
            </span>
          </div>

          {filteredPasses.length === 0 ? (
            <p className="text-gray-500 italic py-6 text-center">No students currently out of class.</p>
          ) : (
            <div className="space-y-3">
              {filteredPasses.map(pass => {
                const elapsedMinutes = Math.floor((Date.now() - pass.timestamp) / 60000);
                const isOvertime = elapsedMinutes >= 5;

                return (
                  <div key={pass.id} className={`flex justify-between items-center p-4 border rounded-lg ${isOvertime ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div>
                      <span className="font-bold text-lg font-mono">{pass.studentId}</span>
                      <span className="ml-3 text-sm text-gray-700">({pass.reason})</span>
                      <div className="text-xs text-gray-500 mt-1">
                        Signed out: {new Date(pass.timestamp).toLocaleTimeString()} 
                        <span className={`ml-2 font-bold ${isOvertime ? 'text-red-600' : 'text-gray-600'}`}>
                          ({elapsedMinutes} min ago {isOvertime && '⚠️ OVERTIME'})
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => db.ref(`passes/${pass.id}`).update({ returned: true, returnTime: Date.now() })}
                      className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">
                      Sign Back In
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* VIEW 4: ADMIN ROSTER & STAFF MANAGEMENT */}
      {view === 'admin' && authenticatedTeacher?.role === 'admin' && (
        <main className="bg-white p-6 rounded-lg shadow-md space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-purple-900">Manage Allowed Student Roster</h2>
            <p className="text-xs text-gray-500 mb-4">Only whitelisted 5-character IDs can sign out at student kiosks.</p>
            <form onSubmit={handleAddStudent} className="flex gap-3 mb-4">
              <input 
                type="text" 
                value={newStudentCode} 
                onChange={(e) => setNewStudentCode(e.target.value)}
                placeholder="Student ID (e.g. NH103)" 
                maxLength={5}
                className="border rounded p-2 font-mono uppercase"
                required 
              />
              <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700">
                Add Student Code
              </button>
            </form>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border rounded bg-gray-50">
              {Object.keys(allowedStudents).length === 0 ? (
                <p className="text-xs text-gray-400 italic">No whitelisted student IDs. Add codes above.</p>
              ) : (
                Object.keys(allowedStudents).map(code => (
                  <span key={code} className="bg-purple-100 text-purple-800 px-3 py-1 rounded font-mono text-sm flex items-center gap-2 border border-purple-200">
                    {code}
                    <button onClick={() => handleRemoveStudent(code)} className="text-red-500 font-bold hover:text-red-700">&times;</button>
                  </span>
                ))
              )}
            </div>
          </div>

          <hr />

          <div>
            <h2 className="text-xl font-semibold mb-2 text-purple-900">Manage Staff Accounts & Passcodes</h2>
            <form onSubmit={handleAddTeacher} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
              <input 
                type="text" 
                value={newTeacherCode} 
                onChange={(e) => setNewTeacherCode(e.target.value)}
                placeholder="Code (e.g. AB000)" 
                maxLength={5}
                className="border rounded p-2 font-mono uppercase"
                required 
              />
              <input 
                type="text" 
                value={newTeacherName} 
                onChange={(e) => setNewTeacherName(e.target.value)}
                placeholder="Staff Name" 
                className="border rounded p-2"
                required 
              />
              <input 
                type="text" 
                value={newTeacherPassword} 
                onChange={(e) => setNewTeacherPassword(e.target.value)}
                placeholder="Password" 
                className="border rounded p-2"
                required 
              />
              <select 
                value={newTeacherRole} 
                onChange={(e) => setNewTeacherRole(e.target.value)}
                className="border rounded p-2 bg-white">
                <option value="teacher">Teacher (Room Only)</option>
                <option value="admin">Admin (Building-Wide)</option>
              </select>
              <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700">
                Add Staff
              </button>
            </form>

            <div className="space-y-2">
              {Object.keys(teachers).map(code => (
                <div key={code} className="flex justify-between items-center p-3 border rounded bg-gray-50">
                  <div>
                    <span className="font-bold font-mono mr-2">{code}</span>
                    <span className="text-sm font-medium text-gray-800 mr-2">{teachers[code].name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${teachers[code].role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-700'}`}>
                      {teachers[code].role}
                    </span>
                    <span className="text-xs text-gray-400 ml-3">Password: {teachers[code].password}</span>
                  </div>
                  {code !== 'NH000' && (
                    <button onClick={() => handleRemoveTeacher(code)} className="text-red-600 text-sm hover:underline font-medium">
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
