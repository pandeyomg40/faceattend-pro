import { useState, useRef, useCallback, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import * as faceapi from 'face-api.js';
// Firebase disabled for local-only mode

// ─── Types ──────────────────────────────────────────────────────
interface Student {
  id: string;
  name: string;
  rollNumber: string;
  faceData: string[];
  faceDescriptors?: number[][];
  registeredOn: string;
  email: string;
  department: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  status: 'Present' | 'Absent' | 'Half-Day';
  confidence: number;
  totalHours: string;
}

interface ScheduleItem {
  id: string;
  subject: string;
  time: string;
  room: string;
  faculty: string;
  date: string;
  type: 'lecture' | 'lab' | 'tutorial' | 'exam';
}

type AppScreen = 'splash' | 'faceScan' | 'adminLogin' | 'adminPanel' | 'notifications' | 'studentDetail';
type AdminTab = 'overview' | 'students' | 'register' | 'records' | 'schedule' | 'monthly';
type ScanMode = 'checkin' | 'checkout';

// ─── Mock Data ──────────────────────────────────────────────────
// Mock data removed - empty state
const initialStudents: Student[] = [
  { id: '1', name: 'Aryan Sharma', rollNumber: 'CSE001', email: 'aryan@college.edu', department: 'CSE', faceData: [], registeredOn: '2023-01-15' },
  { id: '2', name: 'Sneha Reddy', rollNumber: 'CSE002', email: 'sneha@college.edu', department: 'CSE', faceData: [], registeredOn: '2023-01-16' }
];

const generateAttendance = (students: Student[]): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  
  // Generate 30 days of data
  for (let i = 0; i < 30; i++) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    students.forEach(s => {
      // 80% attendance rate for mock data
      if (Math.random() > 0.2) {
        const inH = 8 + Math.floor(Math.random() * 2);
        const inM = Math.floor(Math.random() * 60);
        const outH = 15 + Math.floor(Math.random() * 3);
        const outM = Math.floor(Math.random() * 60);
        
        records.push({
          id: `${s.id}-${dateStr}`,
          studentId: s.id,
          studentName: s.name,
          rollNumber: s.rollNumber,
          date: dateStr,
          checkInTime: `${String(inH).padStart(2, '0')}:${String(inM).padStart(2, '0')}`,
          checkOutTime: `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`,
          status: 'Present',
          confidence: 90 + Math.random() * 10,
          totalHours: `${outH - inH}h ${Math.abs(outM - inM)}m`
        });
      }
    });
  }
  return records;
};

const initialSchedules: ScheduleItem[] = [
  { id: 's1', subject: 'Data Structures', time: '09:00 - 10:30', room: 'LHC-101', faculty: 'Dr. Smith', date: format(new Date(), 'yyyy-MM-dd'), type: 'lecture' },
  { id: 's2', subject: 'Operating Systems', time: '11:00 - 12:30', room: 'Lab-2', faculty: 'Prof. Jha', date: format(new Date(), 'yyyy-MM-dd'), type: 'lab' },
  { 
    id: 's3', 
    subject: 'Algorithms', 
    time: '14:00 - 15:30', 
    room: 'LHC-204', 
    faculty: 'Dr. Kumar', 
    date: format(new Date(), 'yyyy-MM-dd'), 
    type: 'lecture' 
  }
];

const CHART_COLORS = ['#10B981', '#EF4444', '#F59E0B', '#6366F1'];
const ADMIN_PIN = '1234';

function getAutoScanMode(): ScanMode {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 14 ? 'checkout' : 'checkin';
}

function formatTimeAMPM(timeStr: string): string {
  if (!timeStr || timeStr === '-') return '-';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── Splash Screen ────────────────────────────────────────────────
function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 2100);
    const t4 = setTimeout(() => onFinish(), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center z-[200] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(25)].map((_, i) => (
          <div key={i} className="absolute rounded-full" style={{
            width: `${3 + Math.random() * 6}px`, height: `${3 + Math.random() * 6}px`,
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            background: `hsl(${155 + Math.random() * 50}, 80%, 55%)`,
            animation: `float ${3 + Math.random() * 5}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }} />
        ))}
      </div>

      <div className={`absolute transition-all duration-1000 ${phase >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
        <div className="w-60 h-60 rounded-full border-2 border-emerald-500/20 animate-ping" style={{ animationDuration: '2.5s' }} />
      </div>
      <div className={`absolute transition-all duration-1000 delay-200 ${phase >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
        <div className="w-44 h-44 rounded-full border border-teal-400/30 animate-ping" style={{ animationDuration: '3s' }} />
      </div>

      <div className="relative flex flex-col items-center z-10">
        <div className={`transition-all duration-700 ${phase >= 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 translate-y-10'}`}>
          <div className="w-32 h-32 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40 relative overflow-hidden">
            <span className="text-6xl relative z-10">🔐</span>
            <div className={`absolute inset-x-3 h-0.5 bg-emerald-200/70 rounded-full ${phase >= 2 ? 'animate-scanLine' : 'opacity-0'}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/30 to-transparent" />
          </div>
        </div>

        <div className={`mt-8 text-center transition-all duration-700 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h1 className="text-5xl font-black text-white tracking-tight">
            Face<span className="text-emerald-400">Attend</span>
          </h1>
          <p className="text-gray-500 mt-2 text-xs tracking-[0.3em] uppercase font-medium">Biometric Attendance System</p>
        </div>

        <div className={`mt-10 transition-all duration-500 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-52 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-full animate-loadBar" />
          </div>
          <p className="text-gray-600 text-xs mt-4 text-center animate-pulse">Initializing camera & face engine...</p>
        </div>
      </div>
    </div>
  );
}

// ─── Face Scan Result Cards ────────────────────────────────────────
function ScanResultCard({ type, student, mode, onClose }: {
  type: 'recognized' | 'notfound' | 'duplicate';
  student?: Student;
  mode: ScanMode;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-gray-900/95 border border-gray-700/50 rounded-3xl p-8 mx-4 max-w-sm w-full shadow-2xl animate-scaleIn">
        {type === 'recognized' && student && (
          <div className="text-center">
            {student.faceData.length > 0 && (
              <img src={student.faceData[0]} alt="Student" className="w-24 h-24 mx-auto rounded-full mb-5 object-cover ring-4 ring-emerald-500/20" />
            )}
            <h3 className="text-2xl font-bold text-white">
              {mode === 'checkin' ? 'Checked In!' : 'Checked Out!'} ✅
            </h3>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/20">
                  {student.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-lg">{student.name}</p>
                  <p className="text-gray-400 text-sm">{student.rollNumber} • {student.department}</p>
                </div>
              </div>
              <div className="bg-gray-800/80 rounded-2xl px-5 py-4 mt-4 space-y-2">
                <p className="text-emerald-400 text-sm flex items-center gap-2">📅 {format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-emerald-400 text-sm flex items-center gap-2">
                  {mode === 'checkin' ? '🟢' : '🔴'} {mode === 'checkin' ? 'Check In' : 'Check Out'}: {format(new Date(), 'hh:mm:ss a')}
                </p>
              </div>
            </div>
          </div>
        )}

        {type === 'duplicate' && student && (
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-amber-500/15 rounded-full flex items-center justify-center mb-5 ring-4 ring-amber-500/20">
              <span className="text-5xl">⚠️</span>
            </div>
            <h3 className="text-2xl font-bold text-white">Already {mode === 'checkin' ? 'Checked In' : 'Checked Out'}</h3>
            <p className="text-gray-400 mt-3 text-lg">{student.name}</p>
            <p className="text-gray-500 text-sm">{student.rollNumber}</p>
            <p className="text-amber-400/80 text-sm mt-3 bg-amber-500/10 rounded-xl px-4 py-2">
              {mode === 'checkin' ? 'Check-in' : 'Check-out'} already recorded for today
            </p>
          </div>
        )}

        {type === 'notfound' && (
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-red-500/15 rounded-full flex items-center justify-center mb-5 ring-4 ring-red-500/20">
              <span className="text-5xl">❌</span>
            </div>
            <h3 className="text-2xl font-bold text-white">Not Recognized</h3>
            <p className="text-gray-400 mt-3">No matching student found in database.</p>
            <div className="bg-gray-800/80 rounded-xl px-4 py-3 mt-4">
              <p className="text-gray-500 text-sm">📌 Contact admin for registration</p>
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-6 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-2xl transition-all active:scale-[0.98]">
          Continue
        </button>
      </div>
    </div>
  );
}

// ─── Admin Login Screen ────────────────────────────────────────────
function AdminLoginScreen({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handlePinInput = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    if (newPin.length === 4) {
      setTimeout(() => {
        if (newPin === ADMIN_PIN) {
          onSuccess();
        } else {
          setError('Incorrect PIN');
          setShake(true);
          setTimeout(() => { setShake(false); setPin(''); }, 600);
        }
      }, 300);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center z-[100] animate-fadeIn">
      <button onClick={onBack} className="absolute top-6 left-6 text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        <span className="text-sm">Back</span>
      </button>

      <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/25">
        <span className="text-4xl">🛡️</span>
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">Admin Access</h2>
      <p className="text-gray-400 text-sm mb-2">Enter 4-digit PIN</p>
      <p className="text-gray-600 text-xs mb-8">(Default: 1234)</p>

      <div className={`flex gap-5 mb-8 ${shake ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
            i < pin.length ? 'bg-emerald-500 border-emerald-500 scale-125 shadow-lg shadow-emerald-500/40' : 'border-gray-600'
          }`} />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4 animate-fadeIn">{error}</p>}

      <div className="grid grid-cols-3 gap-3 max-w-[280px]">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map(key => (
          <button
            key={key || 'empty'}
            onClick={() => { if (key === '⌫') handleDelete(); else if (key) handlePinInput(key); }}
            disabled={!key}
            className={`w-20 h-16 rounded-2xl text-xl font-semibold transition-all ${
              !key ? 'invisible' :
              key === '⌫' ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 active:scale-90' :
              'bg-gray-800 text-white hover:bg-gray-700 active:scale-90 active:bg-emerald-600'
            }`}
          >{key}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Notification Screen (Student View) ─────────────────────────────
function NotificationScreen({ schedules, onBack }: { schedules: ScheduleItem[]; onBack: () => void }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todaySchedules = schedules.filter(s => s.date === today);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'lecture': return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300', icon: '📖' };
      case 'lab': return { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300', icon: '🖥️' };
      case 'tutorial': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300', icon: '📝' };
      case 'exam': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300', icon: '📋' };
      default: return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400', badge: 'bg-gray-500/20 text-gray-300', icon: '📌' };
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950 z-[100] overflow-auto animate-slideRight">
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/50 px-4 py-4 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">📅 Today's Schedule</h2>
            <p className="text-gray-500 text-xs">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 pb-8">
        {/* Time banner */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <span className="text-2xl">⏰</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Current Time: {format(new Date(), 'hh:mm a')}</p>
            <p className="text-emerald-400/70 text-xs">
              Sign-in: 8:00 AM – 2:00 PM • Sign-out: 2:00 PM onwards
            </p>
          </div>
        </div>

        {todaySchedules.length > 0 ? (
          todaySchedules.map((s, idx) => {
            const style = getTypeStyle(s.type);
            return (
              <div key={s.id} className={`${style.bg} border ${style.border} rounded-2xl p-4 animate-fadeIn`} style={{ animationDelay: `${idx * 80}ms` }}>
                <div className="flex items-start gap-3">
                  <div className="text-3xl mt-0.5">{style.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-bold text-sm">{s.subject}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${style.badge}`}>{s.type}</span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-gray-400 text-xs flex items-center gap-2">🕐 {s.time}</p>
                      <p className="text-gray-400 text-xs flex items-center gap-2">📍 {s.room}</p>
                      <p className="text-gray-400 text-xs flex items-center gap-2">👨‍🏫 {s.faculty}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16">
            <span className="text-6xl">🎉</span>
            <p className="text-white font-semibold mt-4 text-lg">No Classes Today!</p>
            <p className="text-gray-500 mt-2 text-sm">Enjoy your free day</p>
          </div>
        )}

        {/* Alerts Section */}
        <div className="pt-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">🔔 Alerts</h3>
          <div className="space-y-3">
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4">
              <div className="flex gap-3">
                <span className="text-xl">📢</span>
                <div>
                  <h4 className="text-white font-semibold text-sm">Attendance Policy</h4>
                  <p className="text-gray-500 text-xs mt-1">Sign-in opens at 8:00 AM. Auto-switches to sign-out at 2:00 PM. You can also use manual toggle.</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4">
              <div className="flex gap-3">
                <span className="text-xl">⚡</span>
                <div>
                  <h4 className="text-white font-semibold text-sm">Face Recognition Tip</h4>
                  <p className="text-gray-500 text-xs mt-1">Ensure good lighting and face the camera directly for best recognition accuracy.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Student Detail Screen ─────────────────────────────────
function StudentDetailScreen({ student, records, onBack }: {
  student: Student;
  records: AttendanceRecord[];
  onBack: () => void;
}) {
  const studentRecords = records.filter(r => r.studentId === student.id);
  const presentDays = studentRecords.filter(r => r.status === 'Present').length;
  const totalDays = studentRecords.length;
  const overallPercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayRec = studentRecords.find(r => r.date === today);

  // Monthly data
  const [viewMonth, setViewMonth] = useState(new Date());
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const monthRecords = studentRecords.filter(r => {
    const d = parseISO(r.date);
    return isSameMonth(d, viewMonth);
  });
  const monthPresent = monthRecords.filter(r => r.status === 'Present').length;
  const monthTotal = monthRecords.length;
  const monthPercent = monthTotal > 0 ? Math.round((monthPresent / monthTotal) * 100) : 0;

  // Weekly trend
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const rec = studentRecords.find(r => r.date === d);
    return {
      day: format(subDays(new Date(), 6 - i), 'EEE'),
      hours: rec && rec.totalHours !== '-' ? parseFloat(rec.totalHours.replace('h ', '.').replace('m', '')) || 0 : 0,
      present: rec?.status === 'Present' ? 1 : 0,
    };
  });

  return (
    <div className="fixed inset-0 bg-gray-950 z-[100] overflow-auto animate-slideRight">
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/50 px-4 py-4 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h2 className="text-lg font-bold text-white">{student.name}</h2>
            <p className="text-gray-500 text-xs">{student.rollNumber} • {student.department}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-8">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-emerald-500/20">
              {student.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-xl">{student.name}</h3>
              <p className="text-gray-400 text-sm">{student.email}</p>
              <p className="text-gray-500 text-xs mt-1">Registered: {student.registeredOn}</p>
            </div>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-emerald-400">{overallPercent}%</p>
            <p className="text-gray-500 text-xs mt-1">Overall</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-blue-400">{presentDays}</p>
            <p className="text-gray-500 text-xs mt-1">Present</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-red-400">{totalDays - presentDays}</p>
            <p className="text-gray-500 text-xs mt-1">Absent</p>
          </div>
        </div>

        {/* Today's Status */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
          <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">📍 Today's Attendance</h4>
          {todayRec ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  todayRec.status === 'Present' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>{todayRec.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">🟢 Check In</span>
                <span className="text-white text-sm font-mono">{formatTimeAMPM(todayRec.checkInTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">🔴 Check Out</span>
                <span className="text-white text-sm font-mono">{formatTimeAMPM(todayRec.checkOutTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">⏱️ Duration</span>
                <span className="text-emerald-400 text-sm font-mono">{todayRec.totalHours}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No record for today yet</p>
          )}
        </div>

        {/* Weekly Trend */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
          <h4 className="text-white font-bold text-sm mb-3">📊 Weekly Trend</h4>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={weeklyData}>
              <XAxis dataKey="day" stroke="#6B7280" fontSize={10} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
              <Line type="monotone" dataKey="present" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Calendar */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-bold text-sm">📆 Monthly Recap — {monthPercent}%</h4>
            <div className="flex items-center gap-2">
              <button onClick={() => setViewMonth(prev => subDays(startOfMonth(prev), 1))} className="p-1 text-gray-400 hover:text-white">◀</button>
              <span className="text-gray-400 text-xs">{format(viewMonth, 'MMM yyyy')}</span>
              <button onClick={() => {
                const next = new Date(viewMonth);
                next.setMonth(next.getMonth() + 1);
                setViewMonth(next);
              }} className="p-1 text-gray-400 hover:text-white">▶</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-center text-gray-600 text-[10px] font-semibold py-1">{d}</div>
            ))}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`e${i}`} />)}
            {daysInMonth.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const rec = studentRecords.find(r => r.date === dateStr);
              const isT = isToday(day);
              return (
                <div key={dateStr} className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-medium ${
                  isT ? 'ring-2 ring-emerald-500 ' : ''
                }${rec?.status === 'Present' ? 'bg-emerald-500/20 text-emerald-400' :
                  rec?.status === 'Absent' ? 'bg-red-500/20 text-red-400' :
                  'text-gray-600'
                }`}>
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2 h-2 bg-emerald-500/40 rounded-sm inline-block" /> Present</span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2 h-2 bg-red-500/40 rounded-sm inline-block" /> Absent</span>
          </div>
        </div>

        {/* Recent Records */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
          <h4 className="text-white font-bold text-sm mb-3">📋 Recent Records</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
            {studentRecords.slice(0, 10).map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-700/30 last:border-0">
                <div>
                  <p className="text-white text-xs font-medium">{r.date}</p>
                  <p className="text-gray-500 text-[10px]">In: {formatTimeAMPM(r.checkInTime)} • Out: {formatTimeAMPM(r.checkOutTime)}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    r.status === 'Present' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>{r.status}</span>
                  {r.totalHours !== '-' && <p className="text-gray-500 text-[10px] mt-0.5">{r.totalHours}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────
function AdminPanel({
  students, setStudents,
  records, setRecords,
  schedules, setSchedules,
  onLogout,
  computeFaceDescriptors,
}: {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  records: AttendanceRecord[];
  setRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  schedules: ScheduleItem[];
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  onLogout: () => void;
  computeFaceDescriptors: (dataUrls: string[]) => Promise<number[][]>;
}) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newStudent, setNewStudent] = useState({ name: '', rollNumber: '', email: '' });
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);
  const [newSchedule, setNewSchedule] = useState({ subject: '', time: '', room: '', faculty: '', date: format(new Date(), 'yyyy-MM-dd'), type: 'lecture' as ScheduleItem['type'] });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const showToast = (type: string, msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 360 } });
      streamRef.current = stream;
      // Wait a tick for the video element to be mounted in the DOM
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch {
      setCameraActive(false);
      showToast('error', 'Camera access denied');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureImage = () => {
    if (videoRef.current && capturedImages.length < 5) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.drawImage(videoRef.current, 0, 0); setCapturedImages(prev => [...prev, canvas.toDataURL('image/jpeg', 0.8)]); showToast('success', `Image ${capturedImages.length + 1}/5 captured`); }
    }
  };

  const registerStudent = async () => {
    if (!newStudent.name || !newStudent.rollNumber || !newStudent.email) { showToast('error', 'Please fill all fields'); return; }
    if (capturedImages.length < 3) { showToast('error', 'Capture at least 3 face images'); return; }
    if (students.some(s => s.rollNumber === newStudent.rollNumber)) { showToast('error', 'Roll number already exists'); return; }

    setIsRegistering(true);
    showToast('success', 'Processing face data, please wait...');

    try {
      const descriptors = await computeFaceDescriptors(capturedImages);
      if (descriptors.length < 1) {
        showToast('error', 'Could not detect a face in the captured images. Please try again.');
        return;
      }

      const student: Student = {
        id: String(Date.now()), name: newStudent.name, rollNumber: newStudent.rollNumber,
        email: newStudent.email, department: 'CSE', faceData: capturedImages, faceDescriptors: descriptors, registeredOn: format(new Date(), 'yyyy-MM-dd'),
      };
      setStudents(prev => [...prev, student]);
      setNewStudent({ name: '', rollNumber: '', email: '' });
      setCapturedImages([]);
      stopCamera();
      showToast('success', `${student.name} registered!`);
    } finally {
      setIsRegistering(false);
    }
  };

  const deleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    setRecords(prev => prev.filter(r => r.studentId !== id));
    setDeleteConfirm(null);
    showToast('success', 'Student deleted');
  };

  const addSchedule = () => {
    if (!newSchedule.subject || !newSchedule.time || !newSchedule.room || !newSchedule.faculty) { showToast('error', 'Fill all fields'); return; }
    const item: ScheduleItem = { id: String(Date.now()), ...newSchedule };
    setSchedules(prev => [...prev, item]);
    setNewSchedule({ subject: '', time: '', room: '', faculty: '', date: format(new Date(), 'yyyy-MM-dd'), type: 'lecture' });
    showToast('success', 'Schedule added! Students will see it.');
  };

  const exportCSV = () => {
    const dayRecords = records.filter(r => r.date === selectedDate);
    let csv = 'Roll Number,Name,Date,Check In,Check Out,Status,Duration,Confidence\n';
    dayRecords.forEach(r => { csv += `${r.rollNumber},${r.studentName},${r.date},${r.checkInTime},${r.checkOutTime},${r.status},${r.totalHours},${r.confidence.toFixed(1)}%\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance_${selectedDate}.csv`; a.click();
    showToast('success', 'CSV exported');
  };

  const resetSystem = () => {
    if (window.confirm("Danger: This will delete all registered students and records. Continue?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Stats
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRec = records.filter(r => r.date === todayStr);
  const presentToday = todayRec.filter(r => r.status === 'Present').length;
  const absentToday = students.length - presentToday;
  const rateToday = students.length ? Math.round((presentToday / students.length) * 100) : 0;

  const dateRec = records.filter(r => r.date === selectedDate);
  const datePresentCount = dateRec.filter(r => r.status === 'Present').length;

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const dr = records.filter(r => r.date === d);
    return { name: format(subDays(new Date(), 6 - i), 'EEE'), Present: dr.filter(r => r.status === 'Present').length, Absent: dr.filter(r => r.status === 'Absent').length };
  });

  // Monthly calendar
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const adminTabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'records', label: 'Records', icon: '📋' },
    { id: 'monthly', label: 'Monthly', icon: '📆' },
    { id: 'students', label: 'Students', icon: '👥' },
    { id: 'register', label: 'Register', icon: '➕' },
    { id: 'schedule', label: 'Schedule', icon: '🗓️' },
  ];

  if (selectedStudent) {
    return <StudentDetailScreen student={selectedStudent} records={records} onBack={() => setSelectedStudent(null)} />;
  }

  return (
    <div className="fixed inset-0 bg-gray-950 z-[100] overflow-auto animate-slideRight">
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-[200] animate-slideDown">
          <div className={`px-5 py-3 rounded-2xl shadow-xl font-medium text-sm text-center ${
            toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>{toast.msg}</div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/50 px-4 py-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onLogout} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">🛡️ Admin Panel</h2>
              <p className="text-gray-600 text-xs">{format(new Date(), 'EEEE, MMM d yyyy')}</p>
            </div>
          </div>
          <button onClick={onLogout} className="text-xs bg-red-500/15 text-red-400 px-4 py-2 rounded-xl hover:bg-red-500/25 transition-colors font-semibold">
            Logout
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="sticky top-[73px] bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/50 z-10">
        <div className="flex overflow-x-auto no-scrollbar">
          {adminTabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              tab === t.id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-600 hover:text-gray-400'
            }`}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 pb-8 max-w-4xl mx-auto">
        {/* ── Overview ────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Today Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Students', val: students.length, icon: '👥', gradient: 'from-blue-600 to-indigo-600' },
                { label: 'Present Today', val: presentToday, icon: '✅', gradient: 'from-emerald-600 to-teal-600' },
                { label: 'Absent Today', val: absentToday, icon: '❌', gradient: 'from-red-600 to-rose-600' },
                { label: 'Today\'s Rate', val: `${rateToday}%`, icon: '📈', gradient: 'from-amber-600 to-orange-600' },
              ].map((c, i) => (
                <div key={i} className={`bg-gradient-to-br ${c.gradient} rounded-2xl p-4 text-white shadow-lg`}>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{c.icon}</span>
                    <span className="text-3xl font-black">{c.val}</span>
                  </div>
                  <p className="text-white/70 text-xs mt-2 font-medium">{c.label}</p>
                </div>
              ))}
          </div>

          <div className="flex justify-end">
            <button onClick={resetSystem} className="text-[10px] text-red-500/50 hover:text-red-500 transition-colors">
              ⚠️ Reset System (Clear Storage)
            </button>
            </div>

            {/* Today's Attendance with Sign In/Out */}
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">📍 Today's Attendance Log</h3>
              {todayRec.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">No attendance recorded yet today</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                  {todayRec.filter(r => r.status === 'Present').map(r => (
                    <div key={r.id} className="bg-gray-900/50 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-sm">
                        {r.studentName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{r.studentName}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-emerald-400/70 text-[10px]">🟢 In: {formatTimeAMPM(r.checkInTime)}</span>
                          <span className="text-red-400/70 text-[10px]">🔴 Out: {formatTimeAMPM(r.checkOutTime)}</span>
                          <span className="text-gray-500 text-[10px]">⏱️ {r.totalHours}</span>
                        </div>
                      </div>
                      <span className="bg-emerald-500/15 text-emerald-400 text-[10px] px-2 py-1 rounded-lg font-semibold">{r.rollNumber}</span>
                    </div>
                  ))}
                  {todayRec.filter(r => r.status === 'Absent').map(r => (
                    <div key={r.id} className="bg-gray-900/50 rounded-xl p-3 flex items-center gap-3 opacity-60">
                      <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center text-red-400 font-bold text-sm">
                        {r.studentName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{r.studentName}</p>
                        <span className="text-red-400/60 text-[10px]">Not signed in</span>
                      </div>
                      <span className="bg-red-500/15 text-red-400 text-[10px] px-2 py-1 rounded-lg font-semibold">Absent</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weekly Chart */}
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4">
              <h3 className="text-white font-bold text-sm mb-4">📊 Weekly Attendance</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={11} />
                  <YAxis stroke="#6B7280" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="Present" fill="#10B981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Absent" fill="#EF4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4">
              <h3 className="text-white font-bold text-sm mb-4">🥧 Today's Split</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={[{ name: 'Present', value: presentToday }, { name: 'Absent', value: Math.max(0, absentToday) }]} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {[0, 1].map(i => <Cell key={i} fill={CHART_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Records ────────────────────────────── */}
        {tab === 'records' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-white flex-1">📋 Records</h3>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-gray-800 text-white rounded-xl px-3 py-2 text-sm border border-gray-700 focus:border-emerald-500 focus:outline-none" />
              <button onClick={exportCSV} className="bg-emerald-500/15 text-emerald-400 px-4 py-2 rounded-xl text-sm hover:bg-emerald-500/25 transition-colors font-semibold">📥 CSV</button>
            </div>

            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-around">
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-400">{datePresentCount}</p>
                <p className="text-gray-500 text-[10px]">Present</p>
              </div>
              <div className="w-px h-8 bg-gray-700" />
              <div className="text-center">
                <p className="text-2xl font-black text-red-400">{students.length - datePresentCount}</p>
                <p className="text-gray-500 text-[10px]">Absent</p>
              </div>
              <div className="w-px h-8 bg-gray-700" />
              <div className="text-center">
                <p className="text-2xl font-black text-amber-400">{students.length ? Math.round((datePresentCount / students.length) * 100) : 0}%</p>
                <p className="text-gray-500 text-[10px]">Rate</p>
              </div>
            </div>

            {dateRec.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-5xl">📭</span>
                <p className="text-gray-500 mt-4">No records for {selectedDate}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dateRec.map((r, idx) => (
                  <div key={r.id} className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 flex items-center gap-3 animate-fadeIn" style={{ animationDelay: `${idx * 30}ms` }}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      r.status === 'Present' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>{r.status === 'Present' ? '✓' : '✗'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{r.studentName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-gray-500 text-[10px]">{r.rollNumber}</span>
                        {r.status === 'Present' && (
                          <>
                            <span className="text-emerald-500/60 text-[10px]">In: {formatTimeAMPM(r.checkInTime)}</span>
                            <span className="text-red-500/60 text-[10px]">Out: {formatTimeAMPM(r.checkOutTime)}</span>
                            <span className="text-gray-600 text-[10px]">{r.totalHours}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                      r.status === 'Present' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>{r.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Monthly Recap ────────────────────────────── */}
        {tab === 'monthly' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">📆 Monthly Recap</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setViewMonth(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; })} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">◀</button>
                <span className="text-white text-sm font-semibold min-w-[100px] text-center">{format(viewMonth, 'MMMM yyyy')}</span>
                <button onClick={() => setViewMonth(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; })} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">▶</button>
              </div>
            </div>

            {/* Monthly Stats */}
            {(() => {
              const monthRecords = records.filter(r => { const d = parseISO(r.date); return isSameMonth(d, viewMonth); });
              const mPresent = monthRecords.filter(r => r.status === 'Present').length;
              const mAbsent = monthRecords.filter(r => r.status === 'Absent').length;
              const mRate = monthRecords.length ? Math.round((mPresent / monthRecords.length) * 100) : 0;
              const avgHoursPerDay = (() => {
                const presentRecs = monthRecords.filter(r => r.status === 'Present' && r.checkInTime !== '-' && r.checkOutTime !== '-');
                if (presentRecs.length === 0) return '0h 0m';
                let totalMins = 0;
                presentRecs.forEach(r => {
                  const [inH, inM] = r.checkInTime.split(':').map(Number);
                  const [outH, outM] = r.checkOutTime.split(':').map(Number);
                  totalMins += (outH * 60 + outM) - (inH * 60 + inM);
                });
                const avg = Math.round(totalMins / presentRecs.length);
                return `${Math.floor(avg / 60)}h ${avg % 60}m`;
              })();

              return (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
                      <p className="text-xl font-black text-emerald-400">{mPresent}</p>
                      <p className="text-gray-600 text-[9px] mt-0.5">Present</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center">
                      <p className="text-xl font-black text-red-400">{mAbsent}</p>
                      <p className="text-gray-600 text-[9px] mt-0.5">Absent</p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-center">
                      <p className="text-xl font-black text-amber-400">{mRate}%</p>
                      <p className="text-gray-600 text-[9px] mt-0.5">Rate</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 text-center">
                      <p className="text-xl font-black text-blue-400">{avgHoursPerDay}</p>
                      <p className="text-gray-600 text-[9px] mt-0.5">Avg Hours</p>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4">
                    <div className="grid grid-cols-7 gap-1.5">
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                        <div key={i} className="text-center text-gray-600 text-[10px] font-bold py-1">{d}</div>
                      ))}
                      {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`e${i}`} />)}
                      {daysInMonth.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayRecs = records.filter(r => r.date === dateStr);
                        const dayPresent = dayRecs.filter(r => r.status === 'Present').length;
                        const dayTotal = dayRecs.length;
                        const isT = isToday(day);
                        const pct = dayTotal > 0 ? Math.round((dayPresent / dayTotal) * 100) : -1;
                        return (
                          <div key={dateStr} className={`aspect-square rounded-xl flex flex-col items-center justify-center text-[10px] cursor-pointer hover:ring-1 hover:ring-gray-600 transition-all ${
                            isT ? 'ring-2 ring-emerald-500 ' : ''
                          }${pct >= 75 ? 'bg-emerald-500/20 text-emerald-400' :
                            pct >= 50 ? 'bg-amber-500/15 text-amber-400' :
                            pct >= 0 ? 'bg-red-500/15 text-red-400' :
                            'text-gray-700'
                          }`} onClick={() => { setSelectedDate(dateStr); setTab('records'); }}>
                            <span className="font-bold">{format(day, 'd')}</span>
                            {pct >= 0 && <span className="text-[8px] opacity-60">{pct}%</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-4 justify-center">
                      <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 bg-emerald-500/30 rounded inline-block" /> ≥75%</span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 bg-amber-500/30 rounded inline-block" /> 50-74%</span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 bg-red-500/30 rounded inline-block" /> &lt;50%</span>
                    </div>
                  </div>

                  {/* Per-student monthly breakdown */}
                  <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4">
                    <h4 className="text-white font-bold text-sm mb-3">👥 Student-wise {format(viewMonth, 'MMM')} Summary</h4>
                    <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                      {students.map(s => {
                        const sRecs = monthRecords.filter(r => r.studentId === s.id);
                        const sPresent = sRecs.filter(r => r.status === 'Present').length;
                        const sTotal = sRecs.length;
                        const sPct = sTotal > 0 ? Math.round((sPresent / sTotal) * 100) : 0;
                        return (
                          <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0 cursor-pointer hover:bg-gray-800/50 rounded-lg px-2 transition-colors" onClick={() => setSelectedStudent(s)}>
                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">{s.name.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-semibold truncate">{s.name}</p>
                              <p className="text-gray-600 text-[10px]">{s.rollNumber}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${sPct >= 75 ? 'bg-emerald-500' : sPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${sPct}%` }} />
                              </div>
                              <span className={`text-[10px] font-bold min-w-[30px] text-right ${sPct >= 75 ? 'text-emerald-400' : sPct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{sPct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ── Students List ────────────────────────────── */}
        {tab === 'students' && (
          <div className="space-y-3 animate-fadeIn">
            <h3 className="text-lg font-bold text-white">👥 Students ({students.length})</h3>
            {students.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-5xl">📭</span>
                <p className="text-gray-500 mt-4">No students registered</p>
                <button onClick={() => setTab('register')} className="mt-4 bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-colors font-semibold">Register First Student</button>
              </div>
            ) : (
              students.map((s, idx) => {
                const sRecords = records.filter(r => r.studentId === s.id);
                const pCount = sRecords.filter(r => r.status === 'Present').length;
                const totalDays = Math.max(1, sRecords.length);
                const aRate = Math.round((pCount / totalDays) * 100);
                const tRec = sRecords.find(r => r.date === todayStr);
                return (
                  <div key={s.id} className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4 animate-fadeIn cursor-pointer hover:bg-gray-800/60 transition-colors" style={{ animationDelay: `${idx * 40}ms` }} onClick={() => setSelectedStudent(s)}>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg shadow-emerald-500/10">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold">{s.name}</h4>
            <p className="text-gray-500 text-xs">{s.rollNumber}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden max-w-[120px]">
                            <div className={`h-full rounded-full ${aRate >= 75 ? 'bg-emerald-500' : aRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${aRate}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 font-semibold">{aRate}%</span>
                          {tRec && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              tRec.status === 'Present' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                            }`}>{tRec.status === 'Present' ? 'In' : 'Absent'}</span>
                          )}
                        </div>
                      </div>
                      {deleteConfirm === s.id ? (
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => deleteStudent(s.id)} className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg font-semibold">Yes</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 bg-gray-700 text-white text-xs rounded-lg">No</button>
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(s.id); }} className="p-2 rounded-xl hover:bg-red-500/15 text-red-400/60 hover:text-red-400 transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Register ─────────────────────────── */}
        {tab === 'register' && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-lg font-bold text-white">➕ Register Student</h3>
            <div className="space-y-3">
              {[
                { key: 'name', label: 'Full Name', placeholder: 'Enter student name', icon: '👤' },
                { key: 'rollNumber', label: 'Roll Number', placeholder: 'e.g. CSE007', icon: '🔢' },
                { key: 'email', label: 'Email', placeholder: 'student@college.edu', icon: '📧' },
              ].map(f => (
                <div key={f.key} className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3">
                  <label className="text-gray-500 text-xs flex items-center gap-1.5 mb-1.5 font-medium"><span>{f.icon}</span> {f.label}</label>
                  <input type="text" value={newStudent[f.key as keyof typeof newStudent]} onChange={e => setNewStudent(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-700 focus:border-emerald-500 focus:outline-none transition-colors" />
                </div>
              ))}
            </div>
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4">
              <h4 className="text-white font-bold text-sm mb-3">📷 Face Capture ({capturedImages.length}/5)</h4>
              {cameraActive ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-2xl" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={captureImage} disabled={capturedImages.length >= 5} className="flex-1 bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">📸 Capture</button>
                    <button onClick={stopCamera} className="px-5 bg-gray-700 text-white py-2.5 rounded-xl text-sm hover:bg-gray-600 transition-colors">Stop</button>
                  </div>
                </div>
              ) : (
                <button onClick={startCamera} className="w-full bg-gray-900 text-white py-10 rounded-2xl hover:bg-gray-800 transition-colors flex flex-col items-center gap-2 border border-gray-700/30 border-dashed">
                  <span className="text-4xl">📷</span>
                  <span className="text-sm text-gray-400">Start Camera</span>
                </button>
              )}
              {capturedImages.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {capturedImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500/20" />
                      <button onClick={() => setCapturedImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={registerStudent} disabled={isRegistering} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl font-bold text-sm hover:shadow-xl hover:shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-60">
              {isRegistering ? 'Registering...' : '✅ Register Student'}
            </button>
          </div>
        )}

        {/* ── Schedule Manager ─────────────────────────── */}
        {tab === 'schedule' && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-lg font-bold text-white">🗓️ Class Schedule</h3>
            <p className="text-gray-600 text-sm">Students see these in their Notifications tab</p>

            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4 space-y-3">
              <h4 className="text-white font-bold text-sm">➕ Add Schedule</h4>
              <input value={newSchedule.subject} onChange={e => setNewSchedule(prev => ({ ...prev, subject: e.target.value }))} placeholder="Subject name" className="w-full bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-700 focus:border-emerald-500 focus:outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input value={newSchedule.time} onChange={e => setNewSchedule(prev => ({ ...prev, time: e.target.value }))} placeholder="e.g. 09:00 - 10:00" className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-700 focus:border-emerald-500 focus:outline-none" />
                <input value={newSchedule.room} onChange={e => setNewSchedule(prev => ({ ...prev, room: e.target.value }))} placeholder="Room / Lab" className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-700 focus:border-emerald-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={newSchedule.faculty} onChange={e => setNewSchedule(prev => ({ ...prev, faculty: e.target.value }))} placeholder="Faculty name" className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-700 focus:border-emerald-500 focus:outline-none" />
                <input type="date" value={newSchedule.date} onChange={e => setNewSchedule(prev => ({ ...prev, date: e.target.value }))} className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-700 focus:border-emerald-500 focus:outline-none" />
              </div>
              <select value={newSchedule.type} onChange={e => setNewSchedule(prev => ({ ...prev, type: e.target.value as ScheduleItem['type'] }))} className="w-full bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-700 focus:border-emerald-500 focus:outline-none">
                <option value="lecture">📖 Lecture</option>
                <option value="lab">🖥️ Lab</option>
                <option value="tutorial">📝 Tutorial</option>
                <option value="exam">📋 Exam</option>
              </select>
              <button onClick={addSchedule} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-2xl text-sm font-bold hover:shadow-lg transition-all active:scale-[0.98]">Add to Schedule</button>
            </div>

            <h4 className="text-white font-bold text-sm">📋 Scheduled Classes</h4>
            {schedules.length === 0 ? (
              <div className="text-center py-10">
                <span className="text-5xl">📭</span>
                <p className="text-gray-500 mt-3 text-sm">No schedules yet</p>
              </div>
            ) : (
              schedules.map((s, idx) => (
                <div key={s.id} className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 flex items-center gap-3 animate-fadeIn" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className="text-2xl">{s.type === 'lecture' ? '📖' : s.type === 'lab' ? '🖥️' : s.type === 'tutorial' ? '📝' : '📋'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{s.subject}</p>
                    <p className="text-gray-500 text-xs">{s.time} • {s.room} • {s.faculty}</p>
                    <p className="text-gray-600 text-[10px]">{s.date}</p>
                  </div>
                  <button onClick={() => { setSchedules(prev => prev.filter(x => x.id !== s.id)); showToast('success', 'Removed'); }} className="p-2 rounded-xl hover:bg-red-500/15 text-red-400/50 hover:text-red-400 transition-colors shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── Main App ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState<AppScreen>('splash');
  
  // Load initial data from localStorage for persistence
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('fa_students');
    return saved ? JSON.parse(saved) : initialStudents;
  });
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('fa_records');
    return saved ? JSON.parse(saved) : generateAttendance(initialStudents);
  });
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem('fa_schedules');
    return saved ? JSON.parse(saved) : initialSchedules;
  });

  // Persist data whenever it changes
  useEffect(() => {
    localStorage.setItem('fa_students', JSON.stringify(students));
  }, [students]);
  useEffect(() => {
    localStorage.setItem('fa_records', JSON.stringify(records));
  }, [records]);
  useEffect(() => {
    localStorage.setItem('fa_schedules', JSON.stringify(schedules));
  }, [schedules]);

  // Face scan state
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<{ type: 'recognized' | 'notfound' | 'duplicate'; student?: Student } | null>(null);
  const [faceModelLoaded, setFaceModelLoaded] = useState(false);
  const [faceModelLoading, setFaceModelLoading] = useState(false);
  const faceModelLoadedRef = useRef(false);
  const faceModelLoadingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scan mode: auto based on time, or manual override
  const [scanMode, setScanMode] = useState<ScanMode>(getAutoScanMode);
  const [manualMode, setManualMode] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const faceModelBaseUrl = 'https://justadudewhohacks.github.io/face-api.js/models';

  const loadFaceModels = async (): Promise<boolean> => {
    if (faceModelLoadedRef.current) return true;
    if (faceModelLoadingRef.current) {
      while (faceModelLoadingRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return faceModelLoadedRef.current;
    }

    setFaceModelLoading(true);
    faceModelLoadingRef.current = true;
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(faceModelBaseUrl),
        faceapi.nets.faceLandmark68Net.loadFromUri(faceModelBaseUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(faceModelBaseUrl),
      ]);
      setFaceModelLoaded(true);
      faceModelLoadedRef.current = true;
      return true;
    } catch (error) {
      console.error('Face model load failed:', error);
      return false;
    } finally {
      setFaceModelLoading(false);
      faceModelLoadingRef.current = false;
    }
  };

  const createImageElement = (dataUrl: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });

  const computeFaceDescriptors = async (dataUrls: string[]) => {
    const loaded = await loadFaceModels();
    if (!loaded) return [];

    const descriptors: number[][] = [];
    for (const url of dataUrls) {
      try {
        const img = await createImageElement(url);
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        if (detection?.descriptor) {
          descriptors.push(Array.from(detection.descriptor));
        }
      } catch (error) {
        console.error('Descriptor computation error:', error);
      }
    }
    return descriptors;
  };

  const buildMatcher = () => {
    const labeledDescriptors = students
      .filter(s => s.faceDescriptors && s.faceDescriptors.length > 0)
      .map(s => new faceapi.LabeledFaceDescriptors(
        s.id,
        s.faceDescriptors!.map(d => new Float32Array(d))
      ));
    return new faceapi.FaceMatcher(labeledDescriptors, 0.52);
  };

  const recognizeCurrentFace = async (): Promise<Student | null> => {
    if (!videoRef.current) return null;
    const loaded = await loadFaceModels();
    if (!loaded) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const img = await createImageElement(imageDataUrl);
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if (!detection?.descriptor) return null;

      const matcher = buildMatcher();
      const bestMatch = matcher.findBestMatch(detection.descriptor);
      if (bestMatch.label === 'unknown') return null;
      return students.find(s => s.id === bestMatch.label) ?? null;
    } catch (error) {
      console.error('Recognition error:', error);
      return null;
    }
  };

  // Initialize Firebase automatically with fallback credentials
  // Firebase disabled - local storage only
  useEffect(() => {}, []);

  // Auto-update scan mode every minute
  useEffect(() => {
    if (manualMode) return;
    const timer = setInterval(() => {
      setScanMode(getAutoScanMode());
    }, 60000);
    return () => clearInterval(timer);
  }, [manualMode]);

  const handleSplashFinish = useCallback(() => {
    setScreen('faceScan');
  }, []);

  useEffect(() => {
    if (screen === 'faceScan' && !cameraActive) {
      startCamera();
      loadFaceModels();
    }
    return () => {
      if (screen !== 'faceScan') stopCam();
    };
  }, [screen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        // Start auto scan after camera starts
        setTimeout(() => startAutoScan(), 1000);
      }
    } catch {
      setCameraActive(false);
    }
  };

  const stopCam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
  };

  const startAutoScan = () => {
    if (autoScanIntervalRef.current) return;
    autoScanIntervalRef.current = setInterval(async () => {
      if (scanning || scanResult) return;
      const student = await recognizeCurrentFace();
      if (student) {
        // Auto trigger scan
        startScan();
      }
    }, 2000); // Check every 2 seconds
  };

  const toggleManualMode = () => {
    setManualMode(true);
    setScanMode(prev => prev === 'checkin' ? 'checkout' : 'checkin');
  };

  /**
   * Handles the business logic for attendance once a face is recognized.
   */
  const processRecognition = async () => {
    const student = await recognizeCurrentFace();
    if (!student) return setScanResult({ type: 'notfound' });

    const existingRec = records.find(r => r.studentId === student.id && r.date === today);
    const timeNow = format(new Date(), 'HH:mm');
    
    if (scanMode === 'checkin') {
      if (existingRec && existingRec.checkInTime !== '-') {
        return setScanResult({ type: 'duplicate', student });
      }

      const newRec: AttendanceRecord = {
        id: `${student.id}-${today}`,
        ...student,
        studentId: student.id, // Explicitly map student properties to record
        studentName: student.name,
        date: today,
        checkInTime: timeNow,
        checkOutTime: '-',
        status: 'Present',
        confidence: 88 + Math.random() * 12,
        totalHours: '-',
      } as AttendanceRecord;

      setRecords(prev => [...prev.filter(r => !(r.studentId === student.id && r.date === today)), newRec]);
    } else {
      if (existingRec?.checkOutTime !== '-') return setScanResult({ type: 'duplicate', student });
      if (!existingRec || existingRec.checkInTime === '-') return setScanResult({ type: 'notfound' });

      const [inH, inM] = existingRec.checkInTime.split(':').map(Number);
      const [outH, outM] = timeNow.split(':').map(Number);
      const totalMins = (outH * 60 + outM) - (inH * 60 + inM);
      
      setRecords(prev => prev.map(r => (r.studentId === student.id && r.date === today) ? {
        ...r, checkOutTime: timeNow, totalHours: `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`
      } : r));
    }
    setScanResult({ type: 'recognized', student });
  };

  const startScan = () => {
    if (scanning) return;
    setScanning(true);
    setScanProgress(0);
    setScanResult(null);

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanning(false);
          processRecognition();
          return 100;
        }
        return prev + 5; // Faster progress for better UX
      });
    }, 50);
    scanIntervalRef.current = interval;
  };

  const closeResult = useCallback(() => {
    setScanResult(null);
    setScanProgress(0);
    // Re-trigger auto-scan after a short delay to prevent immediate re-scanning
    if (autoScanIntervalRef.current === null) {
        setTimeout(() => startAutoScan(), 2000);
    }
  }, []);

  // Count today's attendance
  const todayRecords = records.filter(r => r.date === today);
  const checkedInCount = todayRecords.filter(r => r.status === 'Present' && r.checkInTime !== '-').length;
  const checkedOutCount = todayRecords.filter(r => r.checkOutTime !== '-' && r.checkOutTime !== '-' && r.status === 'Present').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {screen === 'splash' && <SplashScreen onFinish={handleSplashFinish} />}

      {screen === 'adminLogin' && (
        <AdminLoginScreen onSuccess={() => setScreen('adminPanel')} onBack={() => setScreen('faceScan')} />
      )}

      {screen === 'adminPanel' && (
        <AdminPanel
          students={students} setStudents={setStudents}
          records={records} setRecords={setRecords}
          schedules={schedules} setSchedules={setSchedules}
          onLogout={() => setScreen('faceScan')}
          computeFaceDescriptors={computeFaceDescriptors}
        />
      )}

      {screen === 'notifications' && (
        <NotificationScreen schedules={schedules} onBack={() => setScreen('faceScan')} />
      )}

      {/* ═══ Face Scan (Main Screen) ═══ */}
      {screen === 'faceScan' && (
        <div className="fixed inset-0 bg-gray-950 flex flex-col">
          {/* Header */}
          <div className="relative z-20 bg-gray-950/95 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-gray-800/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-emerald-500/20">
                🔐
              </div>
              <div>
                <h1 className="text-lg font-black text-white leading-tight">FaceAttend</h1>
                <p className="text-gray-600 text-[10px] font-medium">CSE Biometric System</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setScreen('notifications')} className="p-2.5 rounded-xl hover:bg-gray-800 text-gray-500 hover:text-white transition-colors relative">
                <span className="text-lg">🔔</span>
                {schedules.filter(s => s.date === today).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                )}
              </button>
              <button onClick={() => setScreen('adminLogin')} className="flex items-center gap-1.5 bg-gray-800/80 hover:bg-gray-700 px-3 py-2 rounded-xl transition-all active:scale-95">
                <span className="text-sm">🛡️</span>
                <span className="text-xs font-semibold text-gray-400">Admin</span>
              </button>
            </div>
          </div>

          {/* Camera View */}
          <div className="flex-1 relative overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

            {!cameraActive && (
              <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-10">
                <div className="w-24 h-24 bg-gray-800 rounded-3xl flex items-center justify-center mb-5">
                  <span className="text-5xl">📷</span>
                </div>
                <p className="text-gray-400 text-sm font-medium">Camera Not Available</p>
                <p className="text-gray-600 text-xs mt-1">Grant camera permission to start scanning</p>
                <button onClick={startCamera} className="mt-6 bg-emerald-500 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                  Enable Camera
                </button>
              </div>
            )}

            {/* Face detection frame */}
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className={`relative w-52 h-68 sm:w-60 sm:h-76 ${scanning ? '' : ''}`}>
                <div className={`absolute top-0 left-0 w-12 h-12 border-t-3 border-l-3 rounded-tl-3xl transition-colors duration-500 ${scanning ? 'border-emerald-400' : 'border-white/30'}`} />
                <div className={`absolute top-0 right-0 w-12 h-12 border-t-3 border-r-3 rounded-tr-3xl transition-colors duration-500 ${scanning ? 'border-emerald-400' : 'border-white/30'}`} />
                <div className={`absolute bottom-0 left-0 w-12 h-12 border-b-3 border-l-3 rounded-bl-3xl transition-colors duration-500 ${scanning ? 'border-emerald-400' : 'border-white/30'}`} />
                <div className={`absolute bottom-0 right-0 w-12 h-12 border-b-3 border-r-3 rounded-br-3xl transition-colors duration-500 ${scanning ? 'border-emerald-400' : 'border-white/30'}`} />
                {scanning && (
                  <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scanLine rounded-full shadow-lg shadow-emerald-500/50" />
                )}
              </div>
            </div>

            {/* Mode indicator pill */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <div className={`px-5 py-2 rounded-2xl backdrop-blur-xl border text-sm font-bold flex items-center gap-2 ${
                scanMode === 'checkin'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-orange-500/15 border-orange-500/30 text-orange-400'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${scanMode === 'checkin' ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500 animate-pulse'}`} />
                {scanMode === 'checkin' ? '🟢 Check In Mode' : '🔴 Check Out Mode'}
              </div>
            </div>

            {/* Scan progress overlay */}
            {scanning && (
              <div className="absolute bottom-28 left-6 right-6 z-20">
                <div className="bg-gray-900/90 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/30">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-white text-sm font-semibold">Scanning face...</span>
                    <span className="text-emerald-400 text-sm ml-auto font-bold">{Math.round(scanProgress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-100" style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* Result overlay */}
            {scanResult && (
              <ScanResultCard type={scanResult.type} student={scanResult.student} mode={scanMode} onClose={closeResult} />
            )}
          </div>

          {/* Bottom Controls */}
          <div className="relative z-20 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/30 px-4 py-3 pb-5">
            {/* Stats bar */}
            <div className="flex items-center justify-around mb-3 text-[10px]">
              <div className="text-center">
                <span className="text-gray-600 block">Registered</span>
                <span className="text-white font-bold text-sm">{students.length}</span>
              </div>
              <div className="w-px h-6 bg-gray-800" />
              <div className="text-center">
                <span className="text-gray-600 block">Checked In</span>
                <span className="text-emerald-400 font-bold text-sm">{checkedInCount}</span>
              </div>
              <div className="w-px h-6 bg-gray-800" />
              <div className="text-center">
                <span className="text-gray-600 block">Checked Out</span>
                <span className="text-orange-400 font-bold text-sm">{checkedOutCount}</span>
              </div>
              <div className="w-px h-6 bg-gray-800" />
              <div className="text-center">
                <span className="text-gray-600 block">Time</span>
                <span className="text-gray-400 font-bold text-sm">{format(new Date(), 'hh:mm a')}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              {/* Manual toggle */}
              <button onClick={toggleManualMode} className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 ${
                scanMode === 'checkin'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
              }`}>
                <span className="text-lg">{scanMode === 'checkin' ? '🟢' : '🔴'}</span>
                <span className="text-[8px] font-bold mt-0.5">{scanMode === 'checkin' ? 'IN' : 'OUT'}</span>
              </button>

              {/* Scan button */}
              <button
                onClick={startScan}
                disabled={scanning || !cameraActive}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold transition-all ${
                  scanning
                    ? 'bg-emerald-600 scale-95'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:shadow-2xl hover:shadow-emerald-500/30 hover:scale-105 active:scale-90'
                } disabled:opacity-40`}
              >
                {scanning ? (
                  <div className="w-7 h-7 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                )}
              </button>

              {/* Manual mode label */}
              <button onClick={() => { setManualMode(false); setScanMode(getAutoScanMode()); }} className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 ${
                manualMode
                  ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                  : 'bg-gray-800/50 border border-gray-700/30 text-gray-600'
              }`}>
                <span className="text-lg">{manualMode ? '🔧' : '⚙️'}</span>
                <span className="text-[8px] font-bold mt-0.5">{manualMode ? 'MANUAL' : 'AUTO'}</span>
              </button>
            </div>

            <p className="text-center text-gray-600 text-[10px] mt-2 font-medium">
              {scanning ? 'Hold still — scanning your face...' :
  manualMode ? `Manual mode: ${scanMode === 'checkin' ? 'Check In' : 'Check Out'} • Tap toggle to switch` :
               `Auto: Sign-in before 2PM, Sign-out after 2PM`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
