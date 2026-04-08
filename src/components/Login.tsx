import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Leaf, User, Users, GraduationCap, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [mode, setMode] = useState<'select' | 'teacher' | 'student'>('select');
  const [studentInfo, setStudentInfo] = useState({ className: '', studentNumber: '', name: '' });
  const [loading, setLoading] = useState(false);

  const handleTeacherLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '선생님',
          role: 'teacher',
          badges: [],
          createdAt: serverTimestamp()
        });
      }
      toast.success('선생님으로 로그인했습니다.');
      onLoginSuccess();
    } catch (error) {
      console.error("Login error:", error);
      toast.error('로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async () => {
    if (!studentInfo.className || !studentInfo.studentNumber || !studentInfo.name) {
      toast.error('모든 정보를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const result = await signInAnonymously(auth);
      const user = result.user;
      
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, {
        uid: user.uid,
        displayName: studentInfo.name,
        role: 'student',
        className: studentInfo.className,
        studentNumber: studentInfo.studentNumber,
        badges: ['환영합니다!'],
        createdAt: serverTimestamp()
      });
      
      toast.success(`${studentInfo.name} 학생, 환영합니다!`);
      onLoginSuccess();
    } catch (error) {
      console.error("Student login error:", error);
      toast.error('로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="bg-green-100 p-4 rounded-2xl inline-block mb-4">
            <Leaf className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">AI 생물 관찰일지</h1>
          <p className="text-gray-500 mt-2">자연과 함께 성장하는 우리들의 기록</p>
        </div>

        {mode === 'select' && (
          <div className="space-y-4">
            <button 
              onClick={() => setMode('student')}
              className="w-full flex items-center justify-between p-6 rounded-2xl bg-green-50 border-2 border-green-100 hover:border-green-500 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-green-500 p-3 rounded-xl text-white">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">나는 학생이에요</p>
                  <p className="text-sm text-gray-500">관찰 일지를 작성하고 배지를 모아요</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-500" />
            </button>

            <button 
              onClick={() => setMode('teacher')}
              className="w-full flex items-center justify-between p-6 rounded-2xl bg-blue-50 border-2 border-blue-100 hover:border-blue-500 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-500 p-3 rounded-xl text-white">
                  <User className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">나는 선생님이에요</p>
                  <p className="text-sm text-gray-500">우리 반 학생들의 활동을 관리해요</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
            </button>
          </div>
        )}

        {mode === 'student' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setMode('select')} className="text-gray-400 hover:text-gray-600 text-sm">← 뒤로가기</button>
              <h2 className="text-xl font-bold text-gray-800 ml-2">학생 로그인</h2>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="학급명 (예: 3학년 1반)" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                value={studentInfo.className}
                onChange={e => setStudentInfo({...studentInfo, className: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="번호 (예: 15)" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                value={studentInfo.studentNumber}
                onChange={e => setStudentInfo({...studentInfo, studentNumber: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="이름" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                value={studentInfo.name}
                onChange={e => setStudentInfo({...studentInfo, name: e.target.value})}
              />
            </div>
            <button 
              disabled={loading}
              onClick={handleStudentLogin}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-all disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '시작하기'}
            </button>
          </div>
        )}

        {mode === 'teacher' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setMode('select')} className="text-gray-400 hover:text-gray-600 text-sm">← 뒤로가기</button>
              <h2 className="text-xl font-bold text-gray-800 ml-2">선생님 로그인</h2>
            </div>
            <p className="text-gray-600 text-center">선생님은 구글 계정으로 로그인하여<br />학급을 관리할 수 있습니다.</p>
            <button 
              disabled={loading}
              onClick={handleTeacherLogin}
              className="w-full bg-white text-gray-700 border border-gray-200 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-3 shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" className="w-6 h-6" alt="Google" />
              구글로 로그인하기
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
