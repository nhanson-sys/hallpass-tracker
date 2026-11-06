import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  LogOut, 
  LogIn, 
  Download, 
  Lock, 
  Unlock, 
  Users, 
  AlertTriangle, 
  Search, 
  CheckCircle2, 
  Key, 
  FileSpreadsheet, 
  BarChart3, 
  RefreshCw,
  Droplets,
  HelpCircle,
  Bell,
  Settings,
  Mail
} from 'lucide-react';

// Default Teacher Roster & Accounts
const INITIAL_TEACHERS = [
  { id: 'NH000', name: 'N. H. (Admin)', initials: 'NH', isAdmin: true, passCode: 'NH000' },
  { id: 'GC000', name: 'G. C.', initials: 'GC', isAdmin: false, passCode: 'GC000' },
  { id: 'LN000', name: 'L. N.', initials: 'LN', isAdmin: false, passCode: 'LN000' },
  { id: 'BH000', name: 'B. H.', initials: 'BH', isAdmin: false, passCode: 'BH000' },
  { id: 'KB000', name: 'K. B.', initials: 'KB', isAdmin: false, passCode: 'KB000' }
];

// Initial Demo Conflict Rules (Anti-Meetup Pairs)
const INITIAL_CONFLICT_GROUPS = [
  { id: 'rule-1', name: 'Restroom Meetup Pair A', studentIds: ['NH101', 'GC205'] },
  { id: 'rule-2', name: 'Restroom Meetup Pair B', studentIds: ['LN302', 'BH410'] }
];

// Seed initial historical logs
const INITIAL_LOGS = [
  { id: 'log-1', studentId: 'NH101', teacherId: 'NH000', reason: 'Restroom', signOutTime: new Date(Date.now() - 3600000 * 2).toISOString(), signInTime: new Date(Date.now() - 3600000 * 2 + 240000).toISOString(), durationMinutes: 4 },
  { id: 'log-2', studentId: 'GC205', teacherId: 'GC000', reason: 'Water', signOutTime: new Date(Date.now() - 3600000 * 3).toISOString(), signInTime: new Date(Date.now() - 3600000 * 3 + 420000).toISOString(), durationMinutes: 7 },
  { id: 'log-3', studentId: 'LN302', teacherId: 'LN000', reason: 'Restroom', signOutTime: new Date(Date.now() - 3600000 * 5).toISOString(), signInTime: new Date(Date.now() - 3600000 * 5 + 180000).toISOString(), durationMinutes: 3 },
  { id: 'log-4', studentId: 'BH410', teacherId: 'BH000', reason: 'Water', signOutTime: new Date(Date.now() - 3600000 * 1).toISOString(), signInTime: new Date(Date.now() - 3600000 * 1 + 330000).toISOString(), durationMinutes: 5.5 }
];

// Initial active out passes
const INITIAL_ACTIVE_PASSES = [
  { id: 'pass-active-1', studentId: 'KB501', teacherId: 'KB000', reason: 'Restroom', signOutTime: new Date(Date.now() - 380000).toISOString() } // ~6 min out (Overtime)
];

// Initial restricted permissions
const INITIAL_LOCKED_STUDENTS = ['BH412'];

export default function App() {
  // Navigation & Role State
  const [currentMode, setCurrentMode] = useState('kiosk'); // 'kiosk' | 'teacher'
  const [loggedInTeacher, setLoggedInTeacher] = useState(null);
  const [loginPasscode, setLoginPasscode] = useState('');
  const [loginError, setLoginError] = useState('');

  // Core Data States
  const [teachers, setTeachers] = useState(INITIAL_TEACHERS);
  const [activePasses, setActivePasses] = useState(INITIAL_ACTIVE_PASSES);
  const [passLogs, setPassLogs] = useState(INITIAL_LOGS);
  const [conflictGroups, setConflictGroups] = useState(INITIAL_CONFLICT_GROUPS);
  const [lockedStudents, setLockedStudents] = useState(INITIAL_LOCKED_STUDENTS);

  // Kiosk Form State
  const [studentInput, setStudentInput] = useState('');
  const [selectedReason, setSelectedReason] = useState('Restroom');
  const [kioskStatus, setKioskStatus] = useState({ type: null, message: '' });

  // Notifications State (Simulated Overtime Email Triggers)
  const [notifications, setNotifications] = useState([]);
  const [newGroupInput, setNewGroupInput] = useState({ name: '', id1: '', id2: '' });
  const [manualLockInput, setManualLockInput] = useState('');
  const [teacherPasscodeForm, setTeacherPasscodeForm] = useState('');

  // Clock tick to force timer re-renders & check for 5-min overtime notifications
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor active passes for >5 minute overtime and simulate emails
  useEffect(() => {
    activePasses.forEach(pass => {
      const elapsedMin = (currentTime - new Date(pass.signOutTime).getTime()) / 60000;
      if (elapsedMin >= 5) {
        const notifId = `overtime-${pass.studentId}-${Math.floor(new Date(pass.signOutTime).getTime() / 1000)}`;
        setNotifications(prev => {
          if (prev.some(n => n.id === notifId)) return prev;
          return [
            {
              id: notifId,
              studentId: pass.studentId,
              teacherId: pass.teacherId,
              time: new Date().toLocaleTimeString(),
              message: `Simulated Email Sent to ${pass.teacherId}: Student ${pass.studentId} exceeded 5-minute hall pass limit (${Math.floor(elapsedMin)} min out).`
            },
            ...prev
          ];
        });
      }
    });
  }, [currentTime, activePasses]);

  // Handle Teacher Authentication
  const handleTeacherLogin = (e) => {
    e.preventDefault();
    const formattedCode = loginPasscode.trim().toUpperCase();
    const foundTeacher = teachers.find(t => t.passCode === formattedCode);

    if (foundTeacher) {
      setLoggedInTeacher(foundTeacher);
      setTeacherPasscodeForm(foundTeacher.passCode);
      setLoginError('');
      setLoginPasscode('');
    } else {
      setLoginError('Invalid 5-character teacher passcode. Try default (e.g. NH000, GC000)');
    }
  };

  const handleTeacherLogout = () => {
    setLoggedInTeacher(null);
  };

  const handleUpdatePasscode = (e) => {
    e.preventDefault();
    const code = teacherPasscodeForm.trim().toUpperCase();
    if (code.length !== 5) {
      alert('Passcode must be exactly 5 characters long!');
      return;
    }
    setTeachers(teachers.map(t => t.id === loggedInTeacher.id ? { ...t, passCode: code } : t));
    setLoggedInTeacher({ ...loggedInTeacher, passCode: code });
    alert('Teacher passcode successfully updated!');
  };

  // Helper function to validate 5-character student format
  const isValidStudentId = (id) => {
    return /^[A-Z]{2}\d{3}$/.test(id);
  };

  // Execute Student Sign Out / Sign In Action
  const handleKioskSubmit = (e) => {
    e.preventDefault();
    const code = studentInput.trim().toUpperCase();
    setKioskStatus({ type: null, message: '' });

    if (!code || code.length !== 5) {
      setKioskStatus({
        type: 'error',
        message: 'Please enter a valid 5-character ID (e.g., NH101, GC205).'
      });
      return;
    }

    // Check if student is currently signed out
    const existingPassIndex = activePasses.findIndex(p => p.studentId === code);

    if (existingPassIndex !== -1) {
      // --- SIGN BACK IN ACTION ---
      const activePass = activePasses[existingPassIndex];
      const durationMin = parseFloat(((Date.now() - new Date(activePass.signOutTime).getTime()) / 60000).toFixed(1));

      // Remove from active passes
      const updatedActive = activePasses.filter(p => p.studentId !== code);
      setActivePasses(updatedActive);

      // Log completion
      const newLog = {
        id: `log-${Date.now()}`,
        studentId: code,
        teacherId: activePass.teacherId,
        reason: activePass.reason,
        signOutTime: activePass.signOutTime,
        signInTime: new Date().toISOString(),
        durationMinutes: durationMin
      };
      setPassLogs([newLog, ...passLogs]);

      setKioskStatus({
        type: 'success',
        message: `Welcome back, ${code}! Signed in successfully. (Total out: ${durationMin} mins)`
      });
      setStudentInput('');
      return;
    }

    // --- SIGN OUT ACTION ---

    // 1. Check if teacher lock is enabled for this student
    if (lockedStudents.includes(code)) {
      setKioskStatus({
        type: 'restricted',
        message: `Sign out permission restricted by teacher for student ${code}. Please see your teacher.`
      });
      return;
    }

    // 2. Check Anti-Meetup Conflict Rule across all classrooms
    // Find all conflict groups this student belongs to
    const matchingGroups = conflictGroups.filter(g => g.studentIds.includes(code));
    
    // Check if any OTHER student in those conflict groups is currently signed out
    let hasConflict = false;
    for (const group of matchingGroups) {
      const otherConflictStudents = group.studentIds.filter(id => id !== code);
      const isOtherOut = activePasses.some(pass => otherConflictStudents.includes(pass.studentId));
      if (isOtherOut) {
        hasConflict = true;
        break;
      }
    }

    if (hasConflict) {
      setKioskStatus({
        type: 'restricted',
        message: 'Please wait, another student is currently out.'
      });
      return;
    }

    // Derive teacher classroom prefix from ID (First 2 initials + '000')
    const teacherPrefix = code.substring(0, 2);
    const matchedTeacher = teachers.find(t => t.initials === teacherPrefix) || teachers[0];

    // Create New Active Pass
    const newPass = {
      id: `pass-${Date.now()}`,
      studentId: code,
      teacherId: matchedTeacher.id,
      reason: selectedReason,
      signOutTime: new Date().toISOString()
    };

    setActivePasses([newPass, ...activePasses]);
    setKioskStatus({
      type: 'success',
      message: `Pass Approved! ${code} signed out for ${selectedReason}. Please return promptly.`
    });
    setStudentInput('');
  };

  // Teacher Locks Toggle
  const toggleStudentLock = (studentId) => {
    if (lockedStudents.includes(studentId)) {
      setLockedStudents(lockedStudents.filter(id => id !== studentId));
    } else {
      setLockedStudents([...lockedStudents, studentId]);
    }
  };

  const handleAddManualLock = (e) => {
    e.preventDefault();
    const code = manualLockInput.trim().toUpperCase();
    if (code.length === 5 && !lockedStudents.includes(code)) {
      setLockedStudents([...lockedStudents, code]);
      setManualLockInput('');
    }
  };

  // Add Anti-Meetup Group
  const handleAddConflictGroup = (e) => {
    e.preventDefault();
    const { name, id1, id2 } = newGroupInput;
    const s1 = id1.trim().toUpperCase();
    const s2 = id2.trim().toUpperCase();

    if (!name || s1.length !== 5 || s2.length !== 5) {
      alert('Please fill out all fields with valid 5-character IDs.');
      return;
    }

    const newRule = {
      id: `rule-${Date.now()}`,
      name: name,
      studentIds: [s1, s2]
    };

    setConflictGroups([...conflictGroups, newRule]);
    setNewGroupInput({ name: '', id1: '', id2: '' });
  };

  const deleteConflictRule = (ruleId) => {
    setConflictGroups(conflictGroups.filter(r => r.id !== ruleId));
  };

  // CSV Export Utility
  const exportToCSV = (scopeAll = false) => {
    let logsToExport = passLogs;

    // Filter by teacher if not admin export
    if (!scopeAll && loggedInTeacher && !loggedInTeacher.isAdmin) {
      logsToExport = passLogs.filter(log => log.teacherId === loggedInTeacher.id);
    }

    if (logsToExport.length === 0) {
      alert('No logs available to export.');
      return;
    }

    const headers = ['Log ID', 'Student ID', 'Teacher Account', 'Reason', 'Sign Out Time', 'Sign In Time', 'Duration (Minutes)'];
    const csvRows = [
      headers.join(','),
      ...logsToExport.map(log => [
        log.id,
        log.studentId,
        log.teacherId,
        log.reason,
        `"${new Date(log.signOutTime).toLocaleString()}"`,
        `"${new Date(log.signInTime).toLocaleString()}"`,
        log.durationMinutes
      ].join(','))
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HallPass_Report_${scopeAll ? 'All' : loggedInTeacher.initials}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Derived Analytics Data
  const visibleLogs = useMemo(() => {
    if (!loggedInTeacher) return [];
    if (loggedInTeacher.isAdmin) return passLogs;
    return passLogs.filter(log => log.teacherId === loggedInTeacher.id);
  }, [passLogs, loggedInTeacher]);

  const stats = useMemo(() => {
    const totalOut = visibleLogs.length;
    const avgDuration = totalOut > 0 
      ? (visibleLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0) / totalOut).toFixed(1)
      : 0;

    // Frequent flyers
    const counts = {};
    visibleLogs.forEach(l => {
      counts[l.studentId] = (counts[l.studentId] || 0) + 1;
    });
    const frequentFlyers = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { totalOut, avgDuration, frequentFlyers };
  }, [visibleLogs]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* GLOBAL TOP NAVIGATION */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">PassGuard HQ</h1>
              <span className="text-xs text-slate-400">School Hall Pass & Anti-Meetup System</span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentMode('kiosk')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentMode === 'kiosk' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Kiosk Station Mode
            </button>
            <button
              onClick={() => setCurrentMode('teacher')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentMode === 'teacher' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Teacher/Admin Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* ==================================================================== */}
        {/* MODE 1: STUDENT KIOSK INTERFACE */}
        {/* ==================================================================== */}
        {currentMode === 'kiosk' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* KIOSK CARD */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <div className="text-center mb-6">
                <span className="inline-block p-3 bg-indigo-50 text-indigo-600 rounded-full mb-2">
                  <LogIn className="h-8 w-8" />
                </span>
                <h2 className="text-2xl font-bold text-slate-900">Student Sign Out / In</h2>
                <p className="text-sm text-slate-500 mt-1">Enter your 5-character ID code below</p>
              </div>

              {/* Status Alerts */}
              {kioskStatus.message && (
                <div className={`p-4 rounded-xl mb-6 flex items-start space-x-3 ${
                  kioskStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                  kioskStatus.type === 'restricted' ? 'bg-amber-50 text-amber-900 border border-amber-200' :
                  'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {kioskStatus.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
                  {kioskStatus.type === 'restricted' && <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                  {kioskStatus.type === 'error' && <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />}
                  <span className="text-sm font-medium">{kioskStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleKioskSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Student ID Code</label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="e.g. NH101"
                    value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value.toUpperCase())}
                    className="w-full text-center text-3xl font-mono tracking-widest font-bold py-3 px-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none uppercase bg-slate-50"
                  />
                  <p className="text-xs text-slate-400 mt-1 text-center">Format: Teacher Initials + 3 digits (e.g. NH101)</p>

                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Select Reason</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedReason('Restroom')}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          selectedReason === 'Restroom'
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <UserCheck className="h-6 w-6 mb-1 text-indigo-600" />
                        <span className="text-xs">Restroom</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedReason('Water')}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          selectedReason === 'Water'
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Droplets className="h-6 w-6 mb-1 text-blue-500" />
                        <span className="text-xs">Water Drink</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all text-lg flex items-center justify-center space-x-2 mt-6"
                >
                  <span>Submit Pass Request</span>
                  <LogIn className="h-5 w-5" />
                </button>
              </form>
            </div>

            {/* LIVE OUT-OF-CLASS MONITORING PANEL */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-indigo-600" />
                    Building-Wide Active Out-of-Class Monitor
                  </h3>
                  <p className="text-xs text-slate-500">Real-time tracking of students currently in hallways</p>
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                  {activePasses.length} Out Now
                </span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3">
                {activePasses.length === 0 ? (
                  <div className="h-48 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                    <UserCheck className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">All students are currently in class!</p>
                  </div>
                ) : (
                  activePasses.map(pass => {
                    const elapsedMs = currentTime - new Date(pass.signOutTime).getTime();
                    const elapsedMin = Math.floor(elapsedMs / 60000);
                    const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
                    const isOvertime = elapsedMin >= 5;

                    return (
                      <div
                        key={pass.id}
                        className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                          isOvertime
                            ? 'bg-rose-50 border-rose-300 text-rose-900 animate-pulse'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-lg ${isOvertime ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                            <LogOut className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-lg">{pass.studentId}</span>
                              <span className="text-xs px-2 py-0.5 bg-white border rounded text-slate-600">
                                Class: {pass.teacherId}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-white border rounded text-slate-600">
                                {pass.reason}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Signed out at: {new Date(pass.signOutTime).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`font-mono text-xl font-bold ${isOvertime ? 'text-rose-700' : 'text-slate-700'}`}>
                            {elapsedMin}m {elapsedSec < 10 ? `0${elapsedSec}` : elapsedSec}s
                          </div>
                          {isOvertime ? (
                            <span className="inline-flex items-center text-xs font-bold text-rose-600 gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" /> OVERTIME (&gt;5m)
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 font-medium">Within limit</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODE 2: TEACHER / ADMIN DASHBOARD */}
        {/* ==================================================================== */}
        {currentMode === 'teacher' && (
          <div>
            {!loggedInTeacher ? (
              /* TEACHER LOGIN CARD */
              <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mt-8">
                <div className="text-center mb-6">
                  <span className="inline-block p-3 bg-indigo-50 text-indigo-600 rounded-full mb-2">
                    <Key className="h-8 w-8" />
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900">Teacher Login</h2>
                  <p className="text-sm text-slate-500 mt-1">Enter your 5-character teacher passcode</p>
                </div>

                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-4 text-center">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleTeacherLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Teacher Passcode</label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="e.g. NH000"
                      value={loginPasscode}
                      onChange={(e) => setLoginPasscode(e.target.value.toUpperCase())}
                      className="w-full text-center text-2xl font-mono tracking-widest font-bold py-3 px-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase bg-slate-50"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all"
                  >
                    Authenticate
                  </button>
                </form>

                <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700 mb-1">Default Demo Accounts:</p>
                  <ul className="space-y-1 font-mono">
                    <li>NH000 (Admin - Full Access)</li>
                    <li>GC000, LN000, BH000, KB000</li>
                  </ul>
                </div>
              </div>
            ) : (
              /* AUTHENTICATED TEACHER DASHBOARD */
              <div className="space-y-6">
                
                {/* DASHBOARD HEADER BANNER */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded font-bold uppercase">
                        {loggedInTeacher.isAdmin ? 'Building Admin' : 'Classroom Teacher'}
                      </span>
                      <span className="text-xs text-slate-400">Account ID: {loggedInTeacher.id}</span>
                    </div>
                    <h2 className="text-2xl font-bold mt-1">Welcome, Teacher {loggedInTeacher.initials}</h2>
                    <p className="text-xs text-slate-400">
                      {loggedInTeacher.isAdmin 
                        ? 'Building-wide monitoring & system administration enabled.'
                        : 'Scoped to your classroom student pass records.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => exportToCSV(loggedInTeacher.isAdmin)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 shadow-sm"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export CSV Report</span>
                    </button>

                    <button
                      onClick={handleTeacherLogout}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl flex items-center space-x-1"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>

                {/* METRICS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{stats.totalOut}</div>
                      <div className="text-xs text-slate-500">Total Sign-Out Logs Recorded</div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{stats.avgDuration} min</div>
                      <div className="text-xs text-slate-500">Average Out-of-Class Duration</div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{lockedStudents.length}</div>
                      <div className="text-xs text-slate-500">Students Currently Permission-Locked</div>
                    </div>
                  </div>
                </div>

                {/* DASHBOARD GRID CONTENT */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* LEFT COLUMN: LOCK CONTROLS & ANTI-MEETUP RULES */}
                  <div className="space-y-6">
                    
                    {/* PERMISSION LOCK CONTROL */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 flex items-center space-x-2 mb-2">
                        <Lock className="h-5 w-5 text-indigo-600" />
                        <span>Individual Student Sign-Out Lock</span>
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">
                        Prevent specific students from signing out.
                      </p>

                      <form onSubmit={handleAddManualLock} className="flex gap-2 mb-4">
                        <input
                          type="text"
                          maxLength={5}
                          placeholder="e.g. BH412"
                          value={manualLockInput}
                          onChange={(e) => setManualLockInput(e.target.value.toUpperCase())}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm uppercase font-mono bg-slate-50"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
                        >
                          Lock Code
                        </button>
                      </form>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {lockedStudents.length === 0 ? (
                          <div className="text-xs text-slate-400 italic text-center py-2">No locked students</div>
                        ) : (
                          lockedStudents.map(id => (
                            <div key={id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                              <span className="font-mono font-bold text-slate-700">{id}</span>
                              <button
                                onClick={() => toggleStudentLock(id)}
                                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                              >
                                <Unlock className="h-3.5 w-3.5" /> Unlock
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* ANTI-MEETUP CONFLICT GROUP SETTINGS */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 flex items-center space-x-2 mb-2">
                        <Users className="h-5 w-5 text-indigo-600" />
                        <span>Anti-Meetup Concurrent Blocking</span>
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">
                        Define paired student IDs who cannot be signed out simultaneously from ANY classroom.
                      </p>

                      <form onSubmit={handleAddConflictGroup} className="space-y-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                          type="text"
                          placeholder="Rule Label (e.g. Pair A)"
                          value={newGroupInput.name}
                          onChange={(e) => setNewGroupInput({ ...newGroupInput, name: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            maxLength={5}
                            placeholder="Student A (NH101)"
                            value={newGroupInput.id1}
                            onChange={(e) => setNewGroupInput({ ...newGroupInput, id1: e.target.value.toUpperCase() })}
                            className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg uppercase bg-white"
                          />
                          <input
                            type="text"
                            maxLength={5}
                            placeholder="Student B (GC205)"
                            value={newGroupInput.id2}
                            onChange={(e) => setNewGroupInput({ ...newGroupInput, id2: e.target.value.toUpperCase() })}
                            className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg uppercase bg-white"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                        >
                          Add Conflict Pair
                        </button>
                      </form>

                      {/* Rule List */}
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {conflictGroups.map(rule => (
                          <div key={rule.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-800">{rule.name}</div>
                              <div className="font-mono text-indigo-600 mt-0.5">
                                {rule.studentIds.join(' ↔ ')}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteConflictRule(rule.id)}
                              className="text-slate-400 hover:text-rose-600 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ACCOUNT SETTINGS */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 flex items-center space-x-2 mb-2">
                        <Settings className="h-5 w-5 text-indigo-600" />
                        <span>Teacher Credentials</span>
                      </h3>
                      <form onSubmit={handleUpdatePasscode} className="space-y-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Update Passcode (5 chars)</label>
                          <input
                            type="text"
                            maxLength={5}
                            value={teacherPasscodeForm}
                            onChange={(e) => setTeacherPasscodeForm(e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold uppercase bg-slate-50"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700"
                        >
                          Save Passcode
                        </button>
                      </form>
                    </div>

                  </div>

                  {/* RIGHT COLUMN: PASS HISTORY & NOTIFICATIONS */}
                  <div className="lg:col-span-2 space-y-6">

                    {/* OVERTIME NOTIFICATIONS / SIMULATED EMAIL LOG */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 flex items-center space-x-2 mb-2">
                        <Mail className="h-5 w-5 text-indigo-600" />
                        <span>Simulated Overtime Email Alerts (&gt; 5 Minutes)</span>
                      </h3>
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl">
                            No overtime alerts triggered yet.
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
                              <Bell className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="font-bold text-amber-800">[{n.time}] </span>
                                {n.message}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* FREQUENT FLYER ANALYTICS */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 flex items-center space-x-2 mb-3">
                        <BarChart3 className="h-5 w-5 text-indigo-600" />
                        <span>Frequent Sign-Out Summary</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {stats.frequentFlyers.map(([id, count]) => (
                          <div key={id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                            <div className="font-mono font-bold text-slate-800 text-sm">{id}</div>
                            <div className="text-xs text-slate-500 mt-1">{count} passes</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* LOG HISTORICAL TABLE */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-slate-900">Historical Pass Logs</h3>
                          <p className="text-xs text-slate-500">
                            {loggedInTeacher.isAdmin 
                              ? 'Showing all building records' 
                              : `Showing records for teacher ${loggedInTeacher.initials}`}
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                          <thead className="bg-slate-50 text-slate-700 text-xs uppercase border-b">
                            <tr>
                              <th className="py-3 px-4">Student ID</th>
                              <th className="py-3 px-4">Teacher</th>
                              <th className="py-3 px-4">Reason</th>
                              <th className="py-3 px-4">Signed Out</th>
                              <th className="py-3 px-4">Signed In</th>
                              <th className="py-3 px-4">Duration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {visibleLogs.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                                  No logs recorded for this view.
                                </td>
                              </tr>
                            ) : (
                              visibleLogs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{log.studentId}</td>
                                  <td className="py-3 px-4 text-xs">{log.teacherId}</td>
                                  <td className="py-3 px-4 text-xs">{log.reason}</td>
                                  <td className="py-3 px-4 text-xs">{new Date(log.signOutTime).toLocaleTimeString()}</td>
                                  <td className="py-3 px-4 text-xs">{new Date(log.signInTime).toLocaleTimeString()}</td>
                                  <td className="py-3 px-4 text-xs">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                      log.durationMinutes > 5 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      {log.durationMinutes} min
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
