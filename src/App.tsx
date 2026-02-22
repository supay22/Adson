import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clover, Dices, TrendingUp, History, RefreshCw, ChevronRight, Sparkles, Copy, Check, Users, MessageSquare, LogIn, UserPlus, LogOut, Trash2, Send, Wallet, Trophy, Bell, X, Mail, Heart, Search, Ticket, QrCode, Camera, Lightbulb, Target, ShieldAlert } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import axios from 'axios';
import { generateRandomNumbers, generateSuperSete } from './utils';
import { getLotteryPredictions } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'sorteio' | 'palpites' | 'resultados' | 'estimativas' | 'comunidade' | 'contato' | 'conferencia' | 'estrategia';

interface User {
  id: number;
  username: string;
  role: string;
}

interface Post {
  id: number;
  username: string;
  user_id: number;
  content: string;
  created_at: string;
}

interface WinnerComment {
  id: number;
  content: string;
  created_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: Date;
  read: boolean;
}

const LOTTERY_CONFIGS = [
  { id: 'quina', name: 'Quina', count: 5, max: 80, color: 'text-purple-400', bg: 'bg-purple-500' },
  { id: 'megasena', name: 'Mega-Sena', count: 6, max: 60, color: 'text-blue-400', bg: 'bg-blue-500' },
  { id: 'duplasena', name: 'Dupla Sena', count: 6, max: 50, color: 'text-red-400', bg: 'bg-red-500' },
  { id: 'maismilionaria', name: 'Milionária', count: 6, max: 50, color: 'text-yellow-400', bg: 'bg-yellow-500', extra: 'Trevos' },
  { id: 'diadesorte', name: 'Dia de Sorte', count: 7, max: 31, color: 'text-orange-400', bg: 'bg-orange-500', extra: 'Mês' },
  { id: 'supersete', name: 'Super Sete', count: 7, max: 9, color: 'text-emerald-400', bg: 'bg-emerald-500', special: 'supersete' },
  { id: 'timemania', name: 'Timemania', count: 10, max: 80, color: 'text-green-400', bg: 'bg-green-500', extra: 'Time' },
  { id: 'lotofacil', name: 'Lotofácil', count: 15, max: 25, color: 'text-pink-400', bg: 'bg-pink-500' },
  { id: 'lotomania', name: 'Lotomania', count: 50, max: 99, min: 0, color: 'text-orange-600', bg: 'bg-orange-600' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('sorteio');
  const [generatedNumbers, setGeneratedNumbers] = useState<Record<string, number[]>>({});
  const [results, setResults] = useState<Record<string, any[]>>({});
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [predicting, setPredicting] = useState<boolean>(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Auth & Community State
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [authError, setAuthError] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWinnerWall, setShowWinnerWall] = useState(false);

  // Conference State
  const [confLottery, setConfLottery] = useState(LOTTERY_CONFIGS[0].id);
  const [confNumbers, setConfNumbers] = useState<string>('');
  const [confResult, setConfResult] = useState<any>(null);
  const [confLoading, setConfLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Winner Comments State
  const [winnerComments, setWinnerComments] = useState<WinnerComment[]>([]);
  const [newWinnerComment, setNewWinnerComment] = useState('');

  useEffect(() => {
    if (isScanning && activeTab === 'conferencia') {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scannerRef.current.render((decodedText) => {
        // Try to extract numbers from QR code text
        // Lottery QR codes usually contain a URL or a specific string
        // We'll try to find sequences of 2 digits
        const numbers = decodedText.match(/\d{2}/g);
        if (numbers) {
          setConfNumbers(numbers.join(' '));
          setIsScanning(false);
          if (scannerRef.current) {
            scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
          }
          addNotification('QR Code Lido', 'Números extraídos com sucesso!');
        }
      }, (error) => {
        // console.warn(error);
      });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [isScanning, activeTab]);

  const handleConference = async () => {
    if (!confNumbers.trim()) return;
    setConfLoading(true);
    setConfResult(null);
    try {
      const response = await axios.get(`/api/lottery/${confLottery}`);
      const latest = response.data[0];
      
      const playedNumbers = confNumbers.split(/[\s,.-]+/).filter(n => n).map(n => n.padStart(2, '0'));
      const drawnNumbers = latest.dezenas;
      
      const hits = playedNumbers.filter(n => drawnNumbers.includes(n));
      
      setConfResult({
        contest: latest.concurso,
        date: latest.data,
        drawnNumbers,
        playedNumbers,
        hits,
        hitCount: hits.length,
        isAccumulated: latest.acumulou,
        prize: latest.valorEstimadoProximoConcurso
      });
      
      addNotification('Conferência Realizada', `Você acertou ${hits.length} números na ${LOTTERY_CONFIGS.find(c => c.id === confLottery)?.name}!`);
    } catch (error) {
      console.error("Erro na conferência:", error);
      addNotification('Erro', 'Não foi possível conferir seus números. Tente novamente.');
    } finally {
      setConfLoading(false);
    }
  };

  const addNotification = (title: string, message: string) => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      time: new Date(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 10));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await fetchAllResults();
        await fetchDailyPredictions();
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    };
    init();
    const savedUser = localStorage.getItem('minhasorte_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (activeTab === 'comunidade') {
      fetchPosts();
    }
  }, [activeTab]);

  const handleCreateWinnerComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWinnerComment.trim()) return;
    
    try {
      const response = await axios.post('/api/winner-comments', { content: newWinnerComment });
      setWinnerComments(prev => [response.data, ...prev]);
      setNewWinnerComment('');
      addNotification('Depoimento Enviado', 'Seu comentário anônimo foi postado com sucesso! 🎉');
    } catch (error) {
      console.error("Erro ao postar comentário:", error);
    }
  };

  const fetchWinnerComments = async () => {
    try {
      const response = await axios.get('/api/winner-comments');
      setWinnerComments(response.data);
    } catch (error) {
      console.error("Erro ao buscar comentários:", error);
    }
  };

  useEffect(() => {
    if (activeTab === 'contato' || showWinnerWall) {
      fetchWinnerComments();
    }
  }, [activeTab, showWinnerWall]);

  const fetchAllResults = async () => {
    setLoading(true);
    try {
      const promises = LOTTERY_CONFIGS.map(config => 
        axios.get(`/api/lottery/${config.id}`).then(res => ({ id: config.id, data: res.data }))
      );
      const allResults = await Promise.all(promises);
      const resultsMap: Record<string, any[]> = {};
      allResults.forEach(res => {
        resultsMap[res.id] = res.data;
        
        // Check for accumulation and notify
        const latest = res.data[0];
        if (latest && latest.acumulou) {
          const config = LOTTERY_CONFIGS.find(c => c.id === res.id);
          if (config) {
            addNotification(
              'Prêmio Acumulado!', 
              `${config.name} acumulou em ${latest.valorEstimadoProximoConcurso?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'} para o próximo concurso!`
            );
          }
        }
      });
      setResults(resultsMap);
    } catch (error) {
      console.error("Erro ao buscar resultados:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyPredictions = async () => {
    try {
      const response = await axios.get('/api/predictions/daily');
      setPredictions(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Not generated for today yet, trigger generation
        handleGetPredictions().catch(err => console.error("Failed to get predictions:", err));
      }
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await axios.get('/api/community/posts');
      setPosts(response.data);
    } catch (error) {
      console.error("Erro ao buscar posts:", error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await axios.post(endpoint, { username, password });
      setUser(response.data);
      localStorage.setItem('minhasorte_user', JSON.stringify(response.data));
      setUsername('');
      setPassword('');
    } catch (error: any) {
      setAuthError(error.response?.data?.error || 'Erro na autenticação');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('minhasorte_user');
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPost.trim()) return;
    try {
      await axios.post('/api/community/posts', { user_id: user.id, content: newPost });
      setNewPost('');
      fetchPosts();
      addNotification('Novo Post', 'Seu palpite foi publicado na comunidade!');
    } catch (error) {
      console.error("Erro ao criar post:", error);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!user) return;
    try {
      await axios.delete(`/api/community/posts/${postId}`, { data: { user_id: user.id, role: user.role } });
      fetchPosts();
    } catch (error) {
      console.error("Erro ao deletar post:", error);
    }
  };

  const handleGenerate = (config: typeof LOTTERY_CONFIGS[0]) => {
    let nums: number[];
    if (config.special === 'supersete') {
      nums = generateSuperSete();
    } else {
      nums = generateRandomNumbers(config.count, config.max, config.min);
    }
    setGeneratedNumbers(prev => ({ ...prev, [config.id]: nums }));
    addNotification('Números Sorteados', `Novos números gerados para ${config.name}!`);
  };

  const handleGetPredictions = async () => {
    if (predicting) return;
    setPredicting(true);
    try {
      const promises = LOTTERY_CONFIGS.map(config => {
        if (!results[config.id]) return Promise.resolve({ id: config.id, data: null });
        return getLotteryPredictions(config.name, results[config.id]).then(res => ({ id: config.id, data: res }));
      });
      const allPreds = await Promise.all(promises);
      const predsMap: Record<string, any> = {};
      allPreds.forEach(res => {
        if (res.data) predsMap[res.id] = res.data;
      });
      
      if (Object.keys(predsMap).length > 0) {
        setPredictions(predsMap);
        // Save to backend for today
        await axios.post('/api/predictions/daily', { data: predsMap });
      }
    } catch (error) {
      console.error("Erro ao gerar palpites:", error);
    } finally {
      setPredicting(false);
    }
  };

  const handleCopy = (numbers: number[], type: string) => {
    const text = numbers.map(n => n.toString().padStart(2, '0')).join(', ');
    navigator.clipboard.writeText(`${type}: ${text}`);
    setCopied(type);
    addNotification('Copiado', `Números da ${type} copiados para a área de transferência.`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#001f3f] text-white flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden font-sans relative">
      {/* Winner Wall Overlay */}
      <AnimatePresence>
        {showWinnerWall && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWinnerWall(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-[#00152b] z-[70] shadow-2xl border-l border-white/10 p-6 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/20 rounded-2xl text-yellow-400">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase italic text-white">Ganhadores</h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Depoimentos Anônimos</p>
                  </div>
                </div>
                <button onClick={() => setShowWinnerWall(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateWinnerComment} className="space-y-3 mb-8">
                <textarea 
                  value={newWinnerComment}
                  onChange={(e) => setNewWinnerComment(e.target.value)}
                  placeholder="Ganhou com nossos palpites? Conte sua experiência aqui! (Anônimo)"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[100px] focus:outline-none focus:border-yellow-500/50 transition-all font-medium text-white/80 text-sm"
                />
                <button 
                  type="submit"
                  disabled={!newWinnerComment.trim()}
                  className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 rounded-xl font-black text-sm uppercase italic flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 text-[#00152b]"
                >
                  <Send className="w-4 h-4" />
                  Enviar Depoimento
                </button>
              </form>

              <div className="space-y-4">
                {winnerComments.length === 0 ? (
                  <div className="text-center py-10 opacity-20">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-xs font-black uppercase italic">Nenhum depoimento ainda</p>
                  </div>
                ) : (
                  winnerComments.map((comment) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={comment.id} 
                      className="bg-white/5 rounded-2xl p-4 border border-white/5 relative"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                          <Users className="w-3 h-3 text-yellow-400" />
                        </div>
                        <p className="text-[10px] font-black italic uppercase text-white/40">Ganhador Anônimo</p>
                        <span className="text-[8px] text-white/20 ml-auto">{new Date(comment.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-white/80 font-medium leading-relaxed italic">"{comment.content}"</p>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notifications Overlay */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-[#00152b] z-[70] shadow-2xl border-l border-white/10 p-6 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase italic flex items-center gap-2">
                  <Bell className="text-emerald-400 w-6 h-6" />
                  Avisos
                </h2>
                <button onClick={() => setShowNotifications(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <Bell className="w-12 h-12 mx-auto mb-4" />
                  <p className="font-black uppercase italic">Nenhum aviso</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button onClick={clearNotifications} className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-red-400 transition-all">
                      Limpar Tudo
                    </button>
                  </div>
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => markAsRead(n.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer",
                        n.read ? "bg-white/5 border-white/5 opacity-60" : "bg-emerald-500/10 border-emerald-500/20"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-black italic uppercase text-sm">{n.title}</h3>
                        <span className="text-[8px] font-bold text-white/20">{n.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-white/60 font-medium leading-tight">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="p-6 pt-10 bg-[#00152b] border-b border-white/10 relative">
        <div className="absolute top-8 right-6 grid grid-cols-2 gap-2 z-40">
          {/* Top Left Leaf */}
          <button 
            onClick={() => setShowNotifications(true)}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group relative flex items-center justify-center"
            title="Notificações"
          >
            <Bell className={cn("w-5 h-5 transition-all", notifications.some(n => !n.read) ? "text-emerald-400 animate-bounce" : "text-white/40")} />
            {notifications.some(n => !n.read) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
            )}
          </button>

          {/* Top Right Leaf */}
          <button 
            onClick={() => setShowWinnerWall(true)}
            className={cn(
              "p-2.5 rounded-2xl transition-all group flex items-center justify-center",
              showWinnerWall ? "bg-yellow-500 text-[#00152b]" : "bg-white/5 hover:bg-white/10 text-yellow-400"
            )}
            title="Mural dos Ganhadores"
          >
            <Trophy className="w-5 h-5" />
          </button>

          {/* Bottom Left Leaf */}
          <button 
            onClick={() => setActiveTab('conferencia')}
            className={cn(
              "p-2.5 rounded-2xl transition-all group flex items-center justify-center",
              activeTab === 'conferencia' ? "bg-emerald-500 text-white" : "bg-white/5 hover:bg-white/10 text-white/40"
            )}
            title="Conferir Jogos"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Bottom Right Leaf */}
          <button 
            onClick={() => setActiveTab('estrategia')}
            className={cn(
              "p-2.5 rounded-2xl transition-all group flex items-center justify-center",
              activeTab === 'estrategia' ? "bg-indigo-500 text-white" : "bg-white/5 hover:bg-white/10 text-indigo-400"
            )}
            title="Estratégias"
          >
            <Lightbulb className="w-5 h-5" />
          </button>
        </div>

        <div className="pr-28">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-2">
            <Clover className="text-emerald-400 w-10 h-10" />
            Minha Sorte
          </h1>
          <p className="text-white/60 font-medium mt-1">Seu app de loteria inteligente</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'sorteio' && (
            <motion.div
              key="sorteio"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {LOTTERY_CONFIGS.map(config => (
                <section key={config.id} className="bg-white/5 rounded-3xl p-6 border border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className={cn("text-2xl font-black uppercase italic", config.color)}>{config.name}</h2>
                    <div className="flex items-center gap-2">
                      {generatedNumbers[config.id] && (
                        <button 
                          onClick={() => handleCopy(generatedNumbers[config.id], config.name)}
                          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                        >
                          {copied === config.name ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                      <span className={cn("text-xs font-bold px-2 py-1 rounded", config.bg + "/20", config.color)}>
                        {config.count} de {config.max}
                      </span>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "grid gap-2 mb-6",
                    config.count > 15 ? "grid-cols-10" : config.count > 6 ? "grid-cols-5" : "grid-cols-6"
                  )}>
                    {generatedNumbers[config.id] ? (
                      generatedNumbers[config.id].map((num, i) => (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.02 }}
                          key={i}
                          className={cn(
                            "aspect-square flex items-center justify-center text-white font-black rounded-full shadow-lg border-2 border-white/10",
                            config.bg,
                            config.count > 15 ? "text-[10px]" : "text-xl"
                          )}
                        >
                          {num.toString().padStart(2, '0')}
                        </motion.div>
                      ))
                    ) : (
                      Array.from({ length: config.count }).map((_, i) => (
                        <div key={i} className="aspect-square flex items-center justify-center bg-white/10 text-white/20 font-black text-xl rounded-full border-2 border-dashed border-white/20">
                          ?
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => handleGenerate(config)}
                    className={cn(
                      "w-full py-4 hover:opacity-90 active:scale-95 transition-all rounded-2xl font-black text-xl uppercase italic flex items-center justify-center gap-2 shadow-xl",
                      config.bg
                    )}
                  >
                    <RefreshCw className="w-6 h-6" />
                    Sortear Números
                  </button>
                </section>
              ))}
            </motion.div>
          )}

          {activeTab === 'palpites' && (
            <motion.div
              key="palpites"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <Sparkles className="absolute top-[-10px] right-[-10px] w-24 h-24 text-white/10 rotate-12" />
                <h2 className="text-3xl font-black uppercase italic mb-2">Palpites do Dia</h2>
                <p className="text-white/80 font-medium mb-2">Sugestões exclusivas geradas automaticamente para hoje.</p>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                  <RefreshCw className={cn("w-3 h-3", predicting && "animate-spin")} />
                  {predicting ? "Atualizando palpites..." : `Atualizado em: ${new Date().toLocaleDateString()}`}
                </div>
              </div>

              {LOTTERY_CONFIGS.map(config => predictions[config.id] && (
                <section key={config.id} className="bg-white/5 rounded-3xl p-6 border border-white/10">
                  <h3 className={cn("text-xl font-black uppercase italic mb-4", config.color)}>{config.name} Sugerida</h3>
                  <div className={cn(
                    "grid gap-2 mb-4",
                    config.count > 15 ? "grid-cols-10" : config.count > 6 ? "grid-cols-5" : "grid-cols-6"
                  )}>
                    {predictions[config.id].numbers.map((num: number, i: number) => (
                      <div key={i} className={cn(
                        "aspect-square flex items-center justify-center font-black rounded-full border border-white/10",
                        config.bg + "/20",
                        config.color,
                        config.count > 15 ? "text-[10px]" : "text-lg"
                      )}>
                        {num.toString().padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-white/60 italic leading-tight">{predictions[config.id].reason}</p>
                </section>
              ))}
            </motion.div>
          )}

          {activeTab === 'resultados' && (
            <motion.div
              key="resultados"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-3xl font-black uppercase italic">Histórico de Sorteios</h2>
                <button onClick={fetchAllResults} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                  <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                </button>
              </div>

              {LOTTERY_CONFIGS.map(config => results[config.id] && (
                <div key={config.id} className="space-y-4">
                  <h3 className={cn("text-2xl font-black uppercase italic px-2", config.color)}>{config.name}</h3>
                  {results[config.id].map((res, idx) => (
                    <div key={idx} className={cn(
                      "bg-white/5 rounded-3xl p-6 border border-white/10",
                      idx === 0 ? "border-emerald-500/30 bg-emerald-500/5" : "opacity-70"
                    )}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white/40">Concurso {res.concurso} • {res.data}</p>
                          {res.acumulou && (
                            <span className="text-[10px] font-black uppercase bg-orange-500 text-white px-2 py-0.5 rounded animate-pulse">Acumulou!</span>
                          )}
                        </div>
                        {idx === 0 && <span className="text-[10px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded">Mais Recente</span>}
                      </div>
                      <div className={cn(
                        "grid gap-2 mb-4",
                        config.count > 15 ? "grid-cols-10" : config.count > 6 ? "grid-cols-5" : "grid-cols-6"
                      )}>
                        {res.dezenas.map((num: string, i: number) => (
                          <div key={i} className={cn(
                            "aspect-square flex items-center justify-center text-white font-black rounded-full shadow-md",
                            config.bg,
                            config.count > 15 ? "text-[10px]" : "text-lg"
                          )}>
                            {num}
                          </div>
                        ))}
                      </div>

                      {res.premiacoes && res.premiacoes.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Ganhadores</p>
                          <div className="grid grid-cols-2 gap-2">
                            {res.premiacoes.slice(0, 3).map((premio: any, pIdx: number) => (
                              <div key={pIdx} className="bg-white/5 rounded-xl p-2 border border-white/5">
                                <p className="text-[10px] font-bold text-white/40 truncate">{premio.descricao}</p>
                                <p className="text-xs font-black text-emerald-400">{premio.ganhadores} ganhadores</p>
                                <p className="text-[9px] text-white/20">Prêmio: {premio.valorPago?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'estimativas' && (
            <motion.div
              key="estimativas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-black uppercase italic mb-4">Próximos Prêmios</h2>
              {LOTTERY_CONFIGS.map(config => results[config.id] && results[config.id][0] && (
                <div key={config.id} className="bg-white/5 rounded-3xl p-6 border border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className={cn("text-xl font-black uppercase italic", config.color)}>{config.name}</h3>
                    <p className="text-xs font-bold text-white/40">Concurso {results[config.id][0].proximoConcurso}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-400">
                      {results[config.id][0].valorEstimadoProximoConcurso?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                    </p>
                    <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Estimativa de Prêmio</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'comunidade' && (
            <motion.div
              key="comunidade"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {!user ? (
                <div className="bg-white/5 rounded-3xl p-8 border border-white/10 text-center">
                  <div className="w-20 h-20 bg-emerald-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-black uppercase italic mb-2">Comunidade</h2>
                  <p className="text-white/60 font-medium mb-8">Participe da nossa comunidade de palpiteiros. Faça login para ver e postar palpites!</p>
                  
                  <form onSubmit={handleAuth} className="space-y-4 text-left">
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-white/40 mb-1 block">Usuário</label>
                      <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400/50 transition-all font-bold"
                        placeholder="Seu nome de usuário"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-white/40 mb-1 block">Senha</label>
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400/50 transition-all font-bold"
                        placeholder="Sua senha"
                        required
                      />
                    </div>
                    {authError && <p className="text-red-400 text-xs font-bold">{authError}</p>}
                    <button 
                      type="submit"
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 rounded-2xl font-black text-xl uppercase italic shadow-xl transition-all active:scale-95"
                    >
                      {authMode === 'login' ? 'Entrar' : 'Criar Conta'}
                    </button>
                  </form>
                  
                  <button 
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="mt-6 text-emerald-400 text-sm font-black uppercase italic hover:underline"
                  >
                    {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-400 rounded-2xl flex items-center justify-center font-black text-xl italic shadow-lg">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-xl font-black italic uppercase leading-tight">{user.username}</h3>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                            {user.role === 'admin' ? 'Administrador' : 'Palpiteiro'}
                          </span>
                        </div>
                      </div>
                      <button onClick={handleLogout} className="p-2 bg-white/5 hover:bg-red-500/20 rounded-xl transition-colors group">
                        <LogOut className="w-5 h-5 text-white/40 group-hover:text-red-400" />
                      </button>
                    </div>

                    <form onSubmit={handleCreatePost} className="space-y-3">
                      <textarea 
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        placeholder="Qual o seu palpite para hoje?"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[100px] focus:outline-none focus:border-emerald-400/50 transition-all font-medium text-white/80"
                      />
                      <button 
                        type="submit"
                        disabled={!newPost.trim()}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-xl font-black text-lg uppercase italic flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                      >
                        <Send className="w-5 h-5" />
                        Postar Palpite
                      </button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-2xl font-black uppercase italic px-2">Mural de Palpites</h2>
                    {posts.map((post) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={post.id} 
                        className="bg-white/5 rounded-3xl p-5 border border-white/10 relative group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center font-black text-sm italic">
                              {post.username[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-black italic uppercase">{post.username}</p>
                              <p className="text-[10px] text-white/30 font-bold">{new Date(post.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          {(user.role === 'admin' || post.user_id === user.id) && (
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                        </div>
                        <p className="text-white/80 font-medium leading-relaxed">{post.content}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
          {activeTab === 'conferencia' && (
            <motion.div
              key="conferencia"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <Ticket className="absolute top-[-10px] right-[-10px] w-24 h-24 text-white/10 rotate-12" />
                <h2 className="text-3xl font-black uppercase italic mb-2">Conferência</h2>
                <p className="text-white/80 font-medium">Confira seus jogos automaticamente com os últimos resultados.</p>
              </div>

              <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block">Selecione a Loteria</label>
                  <button 
                    onClick={() => setIsScanning(!isScanning)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all",
                      isScanning ? "bg-red-500 text-white" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    )}
                  >
                    {isScanning ? <X className="w-3 h-3" /> : <QrCode className="w-3 h-3" />}
                    {isScanning ? "Parar Scanner" : "Escanear QR Code"}
                  </button>
                </div>

                {isScanning && (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <div id="reader" className="w-full"></div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                    {LOTTERY_CONFIGS.map(config => (
                      <button
                        key={config.id}
                        onClick={() => setConfLottery(config.id)}
                        className={cn(
                          "py-2 rounded-xl text-[10px] font-black uppercase transition-all border",
                          confLottery === config.id 
                            ? "bg-white text-[#001f3f] border-white" 
                            : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                        )}
                      >
                        {config.name}
                      </button>
                    ))}
                  </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 block">Seus Números (separados por espaço ou vírgula)</label>
                  <textarea
                    value={confNumbers}
                    onChange={(e) => setConfNumbers(e.target.value)}
                    placeholder="Ex: 05 12 23 34 45 56"
                    className="w-full bg-[#00152b] border border-white/10 rounded-2xl p-4 text-white font-black placeholder:text-white/10 focus:outline-none focus:border-emerald-500/50 transition-all h-32 resize-none"
                  />
                </div>

                <button
                  onClick={handleConference}
                  disabled={confLoading || !confNumbers.trim()}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-2xl font-black text-xl uppercase italic flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95"
                >
                  {confLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                  {confLoading ? "Conferindo..." : "Conferir Agora"}
                </button>
              </div>

              {confResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 rounded-3xl p-6 border border-emerald-500/30 space-y-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black uppercase italic text-emerald-400">Resultado da Conferência</h3>
                      <p className="text-xs font-bold text-white/40">Concurso {confResult.contest} • {confResult.date}</p>
                    </div>
                    <div className="bg-emerald-500 text-white px-4 py-2 rounded-2xl font-black text-2xl italic">
                      {confResult.hitCount} <span className="text-xs uppercase not-italic">Acertos</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Números Sorteados</p>
                      <div className="flex flex-wrap gap-2">
                        {confResult.drawnNumbers.map((num: string, i: number) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black border border-white/10">
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Seus Números</p>
                      <div className="flex flex-wrap gap-2">
                        {confResult.playedNumbers.map((num: string, i: number) => (
                          <div 
                            key={i} 
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border transition-all",
                              confResult.hits.includes(num) 
                                ? "bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                                : "bg-white/5 border-white/10 opacity-40"
                            )}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {confResult.hitCount >= 4 ? (
                    <div className="bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-2xl text-center">
                      <p className="text-emerald-400 font-black uppercase italic text-sm">Parabéns! Você teve um ótimo desempenho! 🎉</p>
                    </div>
                  ) : confResult.hitCount > 0 ? (
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                      <p className="text-white/60 font-black uppercase italic text-xs">Não foi dessa vez, mas continue tentando! 🍀</p>
                    </div>
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-center">
                      <p className="text-red-400 font-black uppercase italic text-xs">Nenhum acerto. A sorte está guardada para a próxima! 🤞</p>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
          {activeTab === 'estrategia' && (
            <motion.div
              key="estrategia"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <Target className="absolute top-[-10px] right-[-10px] w-24 h-24 text-white/10 rotate-12" />
                <h2 className="text-3xl font-black uppercase italic mb-2">Estratégias</h2>
                <p className="text-white/80 font-medium">Aumente suas chances com técnicas comprovadas.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { title: 'Desdobramentos', desc: 'Jogue com mais números gastando menos através de combinações matemáticas.', icon: <Sparkles className="text-indigo-400" /> },
                  { title: 'Frequência', desc: 'Analise os números que mais saem em cada loteria para basear seus palpites.', icon: <TrendingUp className="text-emerald-400" /> },
                  { title: 'Números Primos', desc: 'Mantenha um equilíbrio de números primos em seus jogos (comum em sorteios).', icon: <Target className="text-red-400" /> },
                  { title: 'Pares e Ímpares', desc: 'A maioria dos sorteios mantém uma proporção equilibrada entre pares e ímpares.', icon: <Dices className="text-blue-400" /> }
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-2xl p-5 border border-white/10 flex gap-4 items-start">
                    <div className="p-3 bg-white/5 rounded-xl">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-black uppercase italic text-white mb-1">{item.title}</h3>
                      <p className="text-xs text-white/60 leading-relaxed font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-3xl text-center">
                <p className="text-indigo-400 font-black uppercase italic text-sm mb-2">Dica de Ouro</p>
                <p className="text-white/80 text-xs font-medium leading-relaxed">
                  "A consistência é a chave. Use nossas ferramentas de IA para gerar palpites baseados em tendências históricas."
                </p>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-3 justify-center mb-2">
                  <ShieldAlert className="w-6 h-6 text-red-400" />
                  <h3 className="text-xl font-black uppercase italic text-red-400">Jogue Consciente</h3>
                </div>
                <div className="space-y-3 text-white/70 text-xs font-medium leading-relaxed">
                  <p className="flex gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    Defina um orçamento fixo para suas apostas e nunca o ultrapasse.
                  </p>
                  <p className="flex gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    Encare a loteria como diversão, não como uma fonte de renda.
                  </p>
                  <p className="flex gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    Nunca use dinheiro destinado a contas essenciais (aluguel, comida, etc).
                  </p>
                  <p className="flex gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    Se sentir que está perdendo o controle, pare imediatamente e peça ajuda.
                  </p>
                </div>
                <p className="text-[10px] font-black uppercase italic text-center text-red-400/60 pt-2">
                  Aposta não é investimento. Jogue com inteligência.
                </p>
              </div>
            </motion.div>
          )}
          {activeTab === 'contato' && (
            <motion.div
              key="contato"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8 py-4"
            >
              <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden text-center group">
                <motion.div 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-10 -left-10 opacity-20"
                >
                  <Heart className="w-48 h-48 text-white" />
                </motion.div>
                
                <div className="relative z-10">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-24 h-24 bg-white/20 backdrop-blur-2xl rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/30"
                  >
                    <Mail className="w-12 h-12 text-white" />
                  </motion.div>
                  <h2 className="text-4xl font-black uppercase italic mb-4 leading-tight tracking-tighter">Bora Conversar?</h2>
                  <p className="text-white/90 font-bold text-xl italic leading-tight">
                    "Minha Sorte: O melhor app de palpites gratuito, feito especialmente para você!"
                  </p>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Sparkles className="w-32 h-32" />
                </div>

                <div className="space-y-2 relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/50">Criado por</p>
                  <p className="text-3xl font-black text-white uppercase italic tracking-tight">Adson Teixeira</p>
                  <div className="h-1 w-12 bg-emerald-500 rounded-full" />
                </div>

                <div className="space-y-6 text-white/80 font-medium leading-relaxed relative">
                  <p className="text-lg">
                    E aí, o <span className="text-emerald-400 font-black">Minha Sorte</span> te ajudou a chegar mais perto do prêmio? 🚀
                  </p>
                  <p>
                    Se você curtiu o app e quer dar aquela força, pode recompensar o trabalho ou mandar sugestões de melhorias. Eu adoro ouvir o que você tem a dizer!
                  </p>
                  
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-[#00152b] rounded-3xl p-6 border border-white/5 flex flex-col gap-4 group hover:border-emerald-500/50 transition-all shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-400 shadow-inner">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Mande um alô no e-mail</p>
                        <a href="mailto:adsonteixeira180@gmail.com" className="text-base font-black text-white hover:text-emerald-400 transition-colors break-all">
                          adsonteixeira180@gmail.com
                        </a>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText('adsonteixeira180@gmail.com');
                        addNotification('E-mail Copiado', 'O e-mail do Adson foi copiado com sucesso!');
                      }}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Copy className="w-3 h-3" /> Copiar E-mail
                    </button>
                  </motion.div>
                </div>

                <div className="pt-8 border-t border-white/5 text-center">
                  <p className="text-sm font-black uppercase italic text-emerald-400 tracking-widest animate-pulse">
                    Valeu por usar o nosso App! Boa sorte nos jogos! 🍀
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#00152b]/90 backdrop-blur-xl border-t border-white/10 px-2 py-4 flex justify-between items-center z-50">
        <NavButton
          active={activeTab === 'sorteio'}
          onClick={() => setActiveTab('sorteio')}
          icon={<Dices className="w-5 h-5" />}
          label="Sorteio"
        />
        <NavButton
          active={activeTab === 'palpites'}
          onClick={() => setActiveTab('palpites')}
          icon={<TrendingUp className="w-5 h-5" />}
          label="Palpites"
        />
        <NavButton
          active={activeTab === 'estimativas'}
          onClick={() => setActiveTab('estimativas')}
          icon={<Trophy className="w-5 h-5" />}
          label="Prêmios"
        />
        <NavButton
          active={activeTab === 'resultados'}
          onClick={() => setActiveTab('resultados')}
          icon={<History className="w-5 h-5" />}
          label="Histórico"
        />
        <NavButton
          active={activeTab === 'comunidade'}
          onClick={() => setActiveTab('comunidade')}
          icon={<Users className="w-5 h-5" />}
          label="Comu"
        />
        <NavButton
          active={activeTab === 'contato'}
          onClick={() => setActiveTab('contato')}
          icon={<Mail className="w-5 h-5" />}
          label="Contato"
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all duration-300 flex-1",
        active ? "text-emerald-400 scale-110" : "text-white/40 hover:text-white/60"
      )}
    >
      <div className={cn(
        "p-2 rounded-2xl transition-all",
        active ? "bg-emerald-400/20 shadow-[0_0_20px_rgba(52,211,153,0.2)]" : "bg-transparent"
      )}>
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest italic truncate w-full text-center">{label}</span>
    </button>
  );
}
