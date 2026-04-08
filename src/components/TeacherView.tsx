import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, ObservationLog, ClassSettings } from '../types';
import { Users, LayoutDashboard, Settings, Filter, Award, Search, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

interface TeacherViewProps {
  user: UserProfile;
}

export default function TeacherView({ user }: TeacherViewProps) {
  const [tab, setTab] = useState<'dashboard' | 'logs' | 'badges'>('dashboard');
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [classSettings, setClassSettings] = useState<ClassSettings | null>(null);
  const [filter, setFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  useEffect(() => {
    // Fetch students
    const qStudents = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      setStudents(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    // Fetch logs
    const qLogs = query(collection(db, 'logs'), orderBy('createdAt', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ObservationLog)));
    });

    // Fetch class settings (assuming one class for simplicity)
    const fetchSettings = async () => {
      const docRef = doc(db, 'classSettings', '3학년 1반'); // Mock class name
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setClassSettings(docSnap.data() as ClassSettings);
      } else {
        const initial = { className: '3학년 1반', teacherId: user.uid, enabledBadges: ['성실왕', '관찰왕', '호기심왕'] };
        await setDoc(docRef, initial);
        setClassSettings(initial);
      }
    };
    fetchSettings();

    return () => { unsubStudents(); unsubLogs(); };
  }, [user.uid]);

  const chartData = students.map(s => ({
    name: s.displayName,
    count: logs.filter(l => l.studentId === s.uid).length
  }));

  const filteredLogs = logs.filter(l => 
    (selectedStudent ? l.studentId === selectedStudent : true) &&
    (l.title.includes(filter) || l.content.includes(filter) || l.studentName.includes(filter))
  );

  const toggleBadge = async (badge: string) => {
    if (!classSettings) return;
    const docRef = doc(db, 'classSettings', classSettings.className);
    const isEnabled = classSettings.enabledBadges.includes(badge);
    
    try {
      await updateDoc(docRef, {
        enabledBadges: isEnabled ? arrayRemove(badge) : arrayUnion(badge)
      });
      setClassSettings(prev => prev ? {
        ...prev,
        enabledBadges: isEnabled ? prev.enabledBadges.filter(b => b !== badge) : [...prev.enabledBadges, badge]
      } : null);
      toast.success(`${badge} 배지가 ${isEnabled ? '비활성화' : '활성화'}되었습니다.`);
    } catch (error) {
      toast.error('설정 변경에 실패했습니다.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Sidebar/Nav */}
      <div className="flex items-center gap-4 mb-8 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <button onClick={() => setTab('dashboard')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${tab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}>
          <LayoutDashboard className="w-5 h-5" /> 대시보드
        </button>
        <button onClick={() => setTab('logs')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${tab === 'logs' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}>
          <Search className="w-5 h-5" /> 일지 관리
        </button>
        <button onClick={() => setTab('badges')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${tab === 'badges' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}>
          <Award className="w-5 h-5" /> 배지 설정
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm font-medium mb-1">전체 학생</p>
                <h4 className="text-3xl font-bold text-gray-900">{students.length}명</h4>
                <div className="mt-4 flex items-center gap-2 text-green-600 text-xs font-bold">
                  <Users className="w-4 h-4" /> 학급 활성도 높음
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm font-medium mb-1">누적 관찰 일지</p>
                <h4 className="text-3xl font-bold text-gray-900">{logs.length}건</h4>
                <div className="mt-4 flex items-center gap-2 text-blue-600 text-xs font-bold">
                  <LayoutDashboard className="w-4 h-4" /> 꾸준히 기록 중
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm font-medium mb-1">오늘 올라온 일지</p>
                <h4 className="text-3xl font-bold text-gray-900">{logs.filter(l => new Date(l.createdAt?.toDate()).toDateString() === new Date().toDateString()).length}건</h4>
                <div className="mt-4 flex items-center gap-2 text-purple-600 text-xs font-bold">
                  <Settings className="w-4 h-4" /> 실시간 업데이트
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h4 className="text-xl font-bold text-gray-800 mb-8">학생별 관찰 활동 현황</h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'logs' && (
          <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="학생 이름, 제목, 내용으로 검색..." 
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <button onClick={() => setSelectedStudent(null)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${!selectedStudent ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>전체</button>
                {students.map(s => (
                  <button key={s.uid} onClick={() => setSelectedStudent(s.uid)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${selectedStudent === s.uid ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{s.displayName}</button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {filteredLogs.map(log => (
                <div key={log.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
                  {log.imageUrl && <img src={log.imageUrl} className="w-full md:w-48 h-32 object-cover rounded-2xl" alt={log.title} />}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{log.studentName} ({log.className})</span>
                      <span className="text-xs text-gray-400">{new Date(log.createdAt?.toDate()).toLocaleString()}</span>
                    </div>
                    <h5 className="text-lg font-bold text-gray-900 mb-2">{log.title}</h5>
                    <p className="text-gray-600 text-sm line-clamp-2">{log.content}</p>
                  </div>
                  <div className="flex items-center">
                    <button className="p-3 rounded-2xl bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'badges' && (
          <motion.div key="badges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h4 className="text-xl font-bold text-gray-800 mb-2">학급 배지 관리</h4>
            <p className="text-gray-500 mb-8">학생들이 획득할 수 있는 배지를 활성화하거나 비활성화할 수 있습니다.</p>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {['성실왕', '관찰왕', '호기심왕', '생물박사', '탐험가', '기록전문가'].map(badge => {
                const isEnabled = classSettings?.enabledBadges.includes(badge);
                return (
                  <div key={badge} className={`p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${isEnabled ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${isEnabled ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        <Award className="w-6 h-6" />
                      </div>
                      <span className={`font-bold ${isEnabled ? 'text-blue-900' : 'text-gray-400'}`}>{badge}</span>
                    </div>
                    <button onClick={() => toggleBadge(badge)}>
                      {isEnabled ? <CheckCircle2 className="w-8 h-8 text-blue-500" /> : <XCircle className="w-8 h-8 text-gray-300" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
