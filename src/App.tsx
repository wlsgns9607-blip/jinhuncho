import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import Login from './components/Login';
import StudentView from './components/StudentView';
import TeacherView from './components/TeacherView';
import ChatPopup from './components/ChatPopup';
import { Toaster, toast } from 'sonner';
import { LogOut, Leaf, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUser(docSnap.data() as UserProfile);
          } else {
            // If user exists in Auth but not in Firestore (shouldn't happen with our login flow)
            await signOut(auth);
            setUser(null);
          }
        } catch (error) {
          console.error("Auth error:", error);
          toast.error('사용자 정보를 불러오는 데 실패했습니다.');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('로그아웃되었습니다.');
    } catch (error) {
      toast.error('로그아웃에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center gap-4">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="text-green-600"
        >
          <Leaf className="w-12 h-12" />
        </motion.div>
        <p className="text-green-800 font-bold animate-pulse">AI 생물 관찰일지를 불러오고 있어요...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Toaster position="top-center" richColors />
      
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Login onLoginSuccess={() => {}} />
          </motion.div>
        ) : (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
              <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-green-600 p-2 rounded-xl text-white">
                    <Leaf className="w-6 h-6" />
                  </div>
                  <h1 className="text-xl font-black tracking-tight text-gray-900 hidden sm:block">AI BIO LOG</h1>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-900">{user.displayName} {user.role === 'teacher' ? '선생님' : '학생'}</p>
                    <p className="text-[10px] text-gray-400">{user.role === 'teacher' ? '교사 계정' : `${user.className} ${user.studentNumber}번`}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="로그아웃"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="pt-6">
              {user.role === 'student' ? (
                <StudentView user={user} />
              ) : (
                <TeacherView user={user} />
              )}
            </main>

            {/* Global Chatbot Popup */}
            <ChatPopup />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
