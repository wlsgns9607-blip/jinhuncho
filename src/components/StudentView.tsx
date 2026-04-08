import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, ObservationLog } from '../types';
import { Plus, Camera, Mic, PenTool, BookOpen, Award, List, Send, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getLogFeedback, identifySpecies, recognizeHandwriting } from '../services/geminiService';

interface StudentViewProps {
  user: UserProfile;
}

export default function StudentView({ user }: StudentViewProps) {
  const [tab, setTab] = useState<'list' | 'write' | 'encyclopedia' | 'badges'>('list');
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Write state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'logs'),
      where('studentId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ObservationLog)));
    });
  }, [user.uid]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setContent(prev => prev + ' ' + transcript);
    };
    recognition.start();
  };

  const handleHandwriting = async () => {
    if (!image) {
      toast.error('먼저 손글씨 사진을 업로드해주세요.');
      return;
    }
    setLoading(true);
    try {
      const text = await recognizeHandwriting(image.split(',')[1]);
      setContent(prev => prev + '\n' + text);
      toast.success('손글씨를 텍스트로 변환했습니다.');
    } catch (error) {
      toast.error('인식에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !content) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const feedback = await getLogFeedback(title, content);
      await addDoc(collection(db, 'logs'), {
        studentId: user.uid,
        studentName: user.displayName,
        className: user.className,
        studentNumber: user.studentNumber,
        title,
        content,
        imageUrl: image,
        aiFeedback: feedback.praise + '\n\n' + feedback.advice,
        createdAt: serverTimestamp()
      });
      toast.success('관찰 일지가 저장되었습니다!');
      setTitle('');
      setContent('');
      setImage(null);
      setTab('list');
    } catch (error) {
      toast.error('저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-3xl shadow-sm border border-green-50">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{user.displayName} 학생</h2>
          <p className="text-gray-500 text-sm">{user.className} {user.studentNumber}번</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Award className="w-3 h-3" /> 배지 {user.badges.length}개
          </div>
          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <List className="w-3 h-3" /> 일지 {logs.length}개
          </div>
        </div>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {tab === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">나의 관찰 기록</h3>
              <button onClick={() => setTab('write')} className="bg-green-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-green-700 transition-all">
                <Plus className="w-5 h-5" /> 새 일지 쓰기
              </button>
            </div>
            {logs.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-gray-400">아직 작성한 일지가 없어요.<br />첫 번째 관찰을 시작해볼까요?</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {logs.map(log => (
                  <div key={log.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    {log.imageUrl && <img src={log.imageUrl} className="w-full h-40 object-cover rounded-2xl mb-4" alt={log.title} />}
                    <h4 className="font-bold text-lg text-gray-900 mb-1">{log.title}</h4>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-3">{log.content}</p>
                    <div className="text-[10px] text-gray-400">{new Date(log.createdAt?.toDate()).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'write' && (
          <motion.div key="write" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">관찰 일지 작성</h3>
              <button onClick={() => setTab('list')} className="text-gray-400 hover:text-gray-600">취소</button>
            </div>
            
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="제목을 입력하세요 (예: 학교 앞 화단의 민들레)" 
                className="w-full text-xl font-bold border-none focus:ring-0 outline-none placeholder:text-gray-300"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              
              <div className="relative">
                <textarea 
                  placeholder="오늘 무엇을 관찰했나요? 생물의 모양, 색깔, 움직임을 자세히 적어보세요." 
                  className="w-full min-h-[200px] border-none focus:ring-0 outline-none resize-none text-gray-700 placeholder:text-gray-300"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <button onClick={handleSpeech} className={`p-2 rounded-full ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    <Mic className="w-5 h-5" />
                  </button>
                  <button onClick={handleHandwriting} className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                    <PenTool className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-green-50 text-green-700 hover:bg-green-100 transition-all font-medium">
                  <Camera className="w-5 h-5" /> 사진 추가하기
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                {image && (
                  <div className="relative group">
                    <img src={image} className="w-20 h-20 object-cover rounded-xl shadow-sm" alt="Preview" />
                    <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-3 h-3 rotate-45" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button 
              disabled={loading}
              onClick={handleSubmit}
              className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              {loading ? 'AI가 분석 중...' : '일지 저장하고 피드백 받기'}
            </button>
          </motion.div>
        )}

        {tab === 'encyclopedia' && (
          <motion.div key="encyclopedia" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center space-y-4">
              <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <BookOpen className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">AI 생물 도감</h3>
              <p className="text-gray-500">생물 사진을 찍어 올리면 AI가 어떤 생물인지 알려줘요!</p>
              
              <div className="max-w-sm mx-auto">
                <label className="block w-full cursor-pointer bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all">
                  <Camera className="w-6 h-6 inline-block mr-2" /> 사진 찍어보기
                  <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLoading(true);
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const result = await identifySpecies((reader.result as string).split(',')[1]);
                        toast.info(`${result.name}: ${result.description}`, { duration: 10000 });
                        setLoading(false);
                      };
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              </div>
              {loading && <div className="flex items-center justify-center gap-2 text-blue-600"><Loader2 className="w-5 h-5 animate-spin" /> AI가 도감을 찾는 중...</div>}
            </div>
          </motion.div>
        )}

        {tab === 'badges' && (
          <motion.div key="badges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-3 gap-4">
            {user.badges.map((badge, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center space-y-2">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                  <Award className="w-8 h-8 text-yellow-600" />
                </div>
                <p className="font-bold text-gray-800">{badge}</p>
              </div>
            ))}
            <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
              <Plus className="w-8 h-8 mb-2" />
              <p className="text-xs font-medium">다음 배지는 무엇일까?</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full px-6 py-3 flex items-center gap-8 z-40">
        <button onClick={() => setTab('list')} className={`p-2 rounded-full transition-all ${tab === 'list' ? 'bg-green-600 text-white scale-110' : 'text-gray-400 hover:text-green-600'}`}>
          <List className="w-6 h-6" />
        </button>
        <button onClick={() => setTab('write')} className={`p-2 rounded-full transition-all ${tab === 'write' ? 'bg-green-600 text-white scale-110' : 'text-gray-400 hover:text-green-600'}`}>
          <Plus className="w-6 h-6" />
        </button>
        <button onClick={() => setTab('encyclopedia')} className={`p-2 rounded-full transition-all ${tab === 'encyclopedia' ? 'bg-green-600 text-white scale-110' : 'text-gray-400 hover:text-green-600'}`}>
          <BookOpen className="w-6 h-6" />
        </button>
        <button onClick={() => setTab('badges')} className={`p-2 rounded-full transition-all ${tab === 'badges' ? 'bg-green-600 text-white scale-110' : 'text-gray-400 hover:text-green-600'}`}>
          <Award className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
