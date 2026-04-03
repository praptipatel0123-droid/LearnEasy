import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Sparkles, Loader2, AlertCircle, Sun, Moon, Globe, LogOut, ChevronDown, Mail, Phone, MapPin, BookOpen, Pencil, Check, X, History, Trash2 } from 'lucide-react';
import AppIcon from './components/AppIcon';
import Visualizer from './components/Visualizer';
import { extractProblemData } from './lib/groq';
import { ProblemSchema, type ProblemData } from './lib/schema';
import t, { type Lang } from './lib/translations';

type HistoryItem = { id: string; input: string; title: string; domain: string; timestamp: number; data: ProblemData; };
type UserInfo = { firstName: string; lastName: string; email: string; phone: string; city: string; state: string; country: string; grade: number; board: string; };

const FIELD = "w-full bg-white border border-gray-300 rounded-xl px-5 py-4 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all text-base font-medium";
const LABEL = "block text-sm font-bold uppercase tracking-widest text-gray-600 mb-2";
const EDIT_FIELD = "w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-gray-400";

export default function App() {
  const saved = localStorage.getItem('user');
  const [step, setStep] = useState<'login' | 'lab'>(saved ? 'lab' : 'login');
  const [user, setUser] = useState<UserInfo | null>(saved ? JSON.parse(saved) : null);
  const [grade, setGrade] = useState<number>(saved ? JSON.parse(saved).grade : 10);
  const [name, setName] = useState(saved ? JSON.parse(saved).firstName : '');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', city: '', state: '', country: '', board: '', password: '', confirmPassword: '' });
  const [formError, setFormError] = useState('');
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));
  const [input, setInput] = useState('');
  const [sentInput, setSentInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ProblemData | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [error, setError] = useState('');
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Lang>((localStorage.getItem('lang') as Lang) || 'EN');
  const T = t[lang];

  const changeLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem('lang', l);
  };
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('history') || '[]'); } catch { return []; }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<UserInfo | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const languages: Lang[] = ['EN', 'HI'];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
        setEditMode(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setFormError(T.passwordMismatch); return; }
    setFormError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, grade }),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.message); return; }
      localStorage.setItem('token', json.token);
      localStorage.setItem('user', JSON.stringify(json));
      setUser(json);
      setName(json.firstName);
      setGrade(json.grade);
      setStep('lab');
    } catch {
      setFormError(T.serverError);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    localStorage.setItem('user', JSON.stringify(editForm));
    setUser(editForm);
    setName(editForm.firstName);
    setGrade(editForm.grade);
    setEditMode(false);
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setSimLoading(true);
    setError('');
    try {
      const rawJson = await extractProblemData(input, lang);
      const validatedData = ProblemSchema.parse(rawJson);
      setData(validatedData);
      setSentInput(input);
      setInput('');
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      const item: HistoryItem = {
        id: Date.now().toString(),
        input,
        title: validatedData.title,
        domain: validatedData.domain ?? 'math',
        timestamp: Date.now(),
        data: validatedData,
      };
      const updated = [item, ...history].slice(0, 20);
      setHistory(updated);
      localStorage.setItem('history', JSON.stringify(updated));
    } catch (err: any) {
      setError(err?.message?.includes('API') ? T.mathError : `${T.mathError} (${err?.message ?? 'unknown'})`);
    } finally {
      setSimLoading(false);
    }
  };

  const deleteHistory = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('history');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setStep('login');
    setUser(null);
    setData(null);
    setInput('');
    setSentInput('');
    setProfileOpen(false);
    setEditMode(false);
  };

  const D = dark;

  // ── SCREEN 1: REGISTER ──────────────────────────────────────────────────────
  if (step === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <AppIcon size={72} className="mx-auto mb-5" />
            <h1 className="text-6xl font-black tracking-tighter text-black">LearnEasy</h1>
            <p className="text-gray-500 text-xl mt-2" style={{ fontFamily: "'Georgia', serif", fontStyle: 'italic' }}>
              {T.tagline}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-sm">
            <h2 className="text-base font-black uppercase tracking-widest text-gray-500 mb-8">{T.createAccount}</h2>
            <form onSubmit={handleEntry} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div><label className={LABEL}>{T.firstName}</label><input required placeholder="John" className={FIELD} value={form.firstName} onChange={f('firstName')} /></div>
                <div><label className={LABEL}>{T.lastName}</label><input required placeholder="Doe" className={FIELD} value={form.lastName} onChange={f('lastName')} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div><label className={LABEL}>{T.email}</label><input required type="email" placeholder="john@email.com" className={FIELD} value={form.email} onChange={f('email')} /></div>
                <div><label className={LABEL}>{T.phone}</label><input required type="tel" placeholder="+91 98765 43210" className={FIELD} value={form.phone} onChange={f('phone')} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div><label className={LABEL}>{T.city}</label><input required placeholder="Mumbai" className={FIELD} value={form.city} onChange={f('city')} /></div>
                <div><label className={LABEL}>{T.state}</label><input required placeholder="Maharashtra" className={FIELD} value={form.state} onChange={f('state')} /></div>
                <div><label className={LABEL}>{T.country}</label><input required placeholder="India" className={FIELD} value={form.country} onChange={f('country')} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={LABEL}>{T.grade}</label>
                  <select required className={FIELD} value={grade} onChange={(e) => setGrade(parseInt(e.target.value))}>
                    <option value="">{T.selectGrade}</option>
                    {['Nursery','KG','1','2','3','4','5','6','7','8','9','10','11','12','College'].map((g, i) => (
                      <option key={g} value={i <= 1 ? 1 : parseInt(g) || 13}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>{T.board}</label>
                  <select required className={FIELD} value={form.board} onChange={f('board')}>
                    <option value="">{T.selectBoard}</option>
                    {['CBSE','ICSE','IB','State Board','Cambridge','Other'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div><label className={LABEL}>{T.password}</label><input required type="password" placeholder={T.createPassword} className={FIELD} value={form.password} onChange={f('password')} /></div>
                <div><label className={LABEL}>{T.confirmPassword}</label><input required type="password" placeholder={T.repeatPassword} className={FIELD} value={form.confirmPassword} onChange={f('confirmPassword')} /></div>
              </div>
              {formError && (
                <div className="flex items-center gap-2 text-red-500 text-sm font-bold bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <AlertCircle size={16} /> {formError}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-black hover:bg-gray-800 text-white rounded-xl py-5 font-black text-base uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
                {loading ? T.settingUp : T.enterLab} <ChevronRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── SCREEN 2: LAB ───────────────────────────────────────────────────────────
  return (
    <div className={`h-screen flex flex-col transition-colors duration-300 overflow-hidden ${D ? 'bg-gray-950' : 'bg-gray-50'}`}>

      {/* NAVBAR */}
      <nav className={`shrink-0 px-6 py-4 flex items-center justify-between border-b backdrop-blur-md z-50 ${D ? 'bg-gray-950/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <AppIcon size={36} />
          <span className={`text-2xl font-black tracking-tighter ${D ? 'text-white' : 'text-black'}`}>LearnEasy</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select value={lang} onChange={(e) => changeLang(e.target.value as Lang)}
              className={`appearance-none pl-9 pr-4 py-2.5 rounded-xl text-sm font-bold border cursor-pointer focus:outline-none transition-colors ${D ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-gray-100 border-gray-200 text-gray-800'}`}>
              {languages.map(l => <option key={l} value={l}>{l === 'EN' ? 'English' : 'हिन्दी'}</option>)}
            </select>
            <Globe className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${D ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
          <button onClick={() => setDark(d => !d)}
            className={`p-2.5 rounded-xl border transition-colors ${D ? 'bg-gray-900 border-gray-700 text-white hover:bg-gray-800' : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'}`}>
            {D ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="relative" ref={profileRef}>
            <button onClick={() => { setProfileOpen(o => !o); setEditMode(false); }}
              className={`flex items-center gap-2 pl-3 pr-2.5 py-2.5 rounded-xl border transition-colors ${D ? 'bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800' : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${D ? 'bg-gray-600 text-white' : 'bg-gray-800 text-white'}`}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <span className={`text-sm font-bold hidden sm:block ${D ? 'text-gray-200' : 'text-gray-800'}`}>{name}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {profileOpen && (
              <div className={`absolute right-0 mt-2 w-80 rounded-2xl border shadow-xl z-50 overflow-hidden ${D ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                {editMode && editForm ? (
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-black uppercase tracking-widest ${D ? 'text-gray-300' : 'text-gray-700'}`}>{T.editProfile}</span>
                      <button onClick={() => setEditMode(false)}><X className={`w-4 h-4 ${D ? 'text-gray-400' : 'text-gray-500'}`} /></button>
                    </div>
                    {([
                      ['firstName', T.firstName], ['lastName', T.lastName], ['email', T.email],
                      ['phone', T.phone], ['city', T.city], ['state', T.state], ['country', T.country],
                    ] as [keyof UserInfo, string][]).map(([k, label]) => (
                      <div key={k}>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${D ? 'text-gray-400' : 'text-gray-500'}`}>{label}</label>
                        <input className={`${EDIT_FIELD} ${D ? '!bg-gray-800 !border-gray-600 !text-white' : ''}`}
                          value={editForm[k] as string} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} />
                      </div>
                    ))}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${D ? 'text-gray-400' : 'text-gray-500'}`}>{T.board}</label>
                      <select className={`${EDIT_FIELD} ${D ? '!bg-gray-800 !border-gray-600 !text-white' : ''}`} value={editForm.board} onChange={e => setEditForm({ ...editForm, board: e.target.value })}>
                        {['CBSE','ICSE','IB','State Board','Cambridge','Other'].map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <button onClick={handleSaveEdit} className="w-full mt-2 bg-black text-white rounded-xl py-3 text-sm font-black flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors">
                      <Check className="w-4 h-4" /> {T.saveChanges}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={`px-5 py-4 border-b ${D ? 'border-gray-800' : 'border-gray-100'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${D ? 'bg-gray-700 text-white' : 'bg-gray-100 text-black'}`}>
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                          </div>
                          <div>
                            <p className={`font-black text-base ${D ? 'text-white' : 'text-black'}`}>{user?.firstName} {user?.lastName}</p>
                            <p className={`text-sm ${D ? 'text-gray-400' : 'text-gray-500'}`}>{T.grade} {user?.grade} · {user?.board}</p>
                          </div>
                        </div>
                        <button onClick={() => { setEditForm(user); setEditMode(true); }}
                          className={`p-2 rounded-lg transition-colors ${D ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className={`px-5 py-4 space-y-3 border-b ${D ? 'border-gray-800' : 'border-gray-100'}`}>
                      {[
                        { icon: Mail, val: user?.email }, { icon: Phone, val: user?.phone },
                        { icon: MapPin, val: `${user?.city}, ${user?.state}, ${user?.country}` },
                        { icon: BookOpen, val: `${user?.board} ${T.board}` },
                      ].map(({ icon: Icon, val }) => (
                        <div key={val} className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 shrink-0 ${D ? 'text-gray-500' : 'text-gray-400'}`} />
                          <span className={`text-sm ${D ? 'text-gray-300' : 'text-gray-700'}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={logout} className={`w-full flex items-center gap-3 px-5 py-4 text-sm font-bold transition-colors ${D ? 'text-red-400 hover:bg-gray-800' : 'text-red-500 hover:bg-red-50'}`}>
                      <LogOut className="w-4 h-4" /> {T.logout}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* MAIN BODY — fills remaining height */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANEL — Visualizer sticky + History scrollable */}
        <div className={`w-1/2 flex flex-col border-r overflow-y-auto ${D ? 'border-gray-800' : 'border-gray-200'}`}>

          {/* Sticky Visualizer */}
          <div className={`sticky top-0 z-10 p-6 pb-3 ${D ? 'bg-gray-950' : 'bg-gray-50'}`}>
            <div className={`rounded-3xl p-6 border ${D ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              {data ? (
                <Visualizer data={data} lang={lang} />
              ) : (
                <div className="min-h-[300px] flex flex-col items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-16 h-16 ${D ? 'text-gray-700' : 'text-gray-300'}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable History */}
          <div className="px-6 pb-6 space-y-6">
            <div className={`rounded-3xl border ${D ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  <span className={`text-sm font-black uppercase tracking-widest ${D ? 'text-gray-300' : 'text-gray-700'}`}>{T.history}</span>
                  {history.length > 0 && (
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${D ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{history.length}</span>
                  )}
                </div>
                {history.length > 0 && (
                  <button onClick={clearHistory} className={`text-xs font-bold flex items-center gap-1 ${D ? 'text-red-400' : 'text-red-500'}`}>
                    <Trash2 className="w-3 h-3" /> {T.clearAll}
                  </button>
                )}
              </div>
              <div className={`border-t ${D ? 'border-gray-800' : 'border-gray-100'}`}>
                {history.length === 0 ? (
                  <p className={`px-5 py-4 text-sm ${D ? 'text-gray-500' : 'text-gray-400'}`}>{T.noHistory}</p>
                ) : (
                  <div className="px-4 py-3 space-y-1">
                    {history.map(item => (
                      <div key={item.id}
                        className={`group flex items-start justify-between gap-2 p-3 rounded-2xl cursor-pointer transition-colors ${D ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
                        onClick={() => { setData(item.data); setSentInput(item.input); }}>
                        <div className="min-w-0">
                          <p className={`text-sm font-black truncate ${D ? 'text-gray-200' : 'text-gray-800'}`}>{item.title}</p>
                          <p className={`text-xs truncate mt-0.5 ${D ? 'text-gray-500' : 'text-gray-400'}`}>{item.input}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold capitalize ${D ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{item.domain}</span>
                            <span className={`text-xs ${D ? 'text-gray-600' : 'text-gray-400'}`}>
                              {Math.floor((Date.now() - item.timestamp) / 60000) < 1 ? T.justNow : `${Math.floor((Date.now() - item.timestamp) / 60000)}m ago`}
                            </span>
                          </div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); deleteHistory(item.id); }}
                          className={`shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${D ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT PANEL — Question shown on top, input fixed at bottom */}
        <div className="w-1/2 flex flex-col">

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            {/* Question bubble */}
            {data && (
              <div className="flex justify-end">
                <div className={`max-w-[85%] px-5 py-4 rounded-3xl rounded-tr-sm text-base font-medium ${D ? 'bg-gray-700 text-white' : 'bg-black text-white'}`}>
                  {sentInput}
                </div>
              </div>
            )}

            {/* Response content */}
            {data && (
              <div className="space-y-4">

                {/* Explanation */}
                <div className={`rounded-3xl p-5 border ${D ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                  <p className={`text-xs font-black uppercase tracking-widest mb-2 ${D ? 'text-gray-400' : 'text-gray-500'}`}>{T.explanation}</p>
                  <p className={`text-base leading-relaxed ${D ? 'text-gray-300' : 'text-gray-700'}`}>{data.explanation}</p>
                </div>

                {/* Knowns & Unknowns */}
                {data.extractedData && (
                  <div className={`rounded-3xl p-5 border ${D ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className={`text-xs font-black uppercase tracking-widest mb-2 ${D ? 'text-gray-400' : 'text-gray-500'}`}>{T.knowns}</p>
                        <div className="space-y-1">
                          {data.extractedData.knowns.map((k, i) => (
                            <div key={i} className={`px-3 py-2 rounded-xl text-sm ${D ? 'bg-gray-800 text-gray-200' : 'bg-gray-50 text-gray-800'}`}>
                              <span className="font-bold">{k.label}:</span> {String(k.value)} {k.unit ?? ''}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className={`text-xs font-black uppercase tracking-widest mb-2 ${D ? 'text-gray-400' : 'text-gray-500'}`}>{T.unknowns}</p>
                        <div className="space-y-1">
                          {data.extractedData.unknowns.map((u, i) => (
                            <div key={i} className={`px-3 py-2 rounded-xl text-sm ${D ? 'bg-gray-800 text-gray-200' : 'bg-gray-50 text-gray-800'}`}>
                              <span className="font-bold">{u.label}</span> {u.unit ? `(${u.unit})` : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {data.extractedData.assumptions.length > 0 && (
                      <p className={`mt-3 text-xs ${D ? 'text-gray-500' : 'text-gray-400'}`}>* {data.extractedData.assumptions.join(' • ')}</p>
                    )}
                  </div>
                )}

                {/* Formulas */}
                <div className={`rounded-3xl p-5 border ${D ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                  <p className={`text-xs font-black uppercase tracking-widest mb-2 ${D ? 'text-gray-400' : 'text-gray-500'}`}>{T.formula}</p>
                  <div className="flex flex-wrap gap-2">
                    {data.formulas.map((f, i) => (
                      <span key={i} className={`px-3 py-1.5 rounded-xl font-mono text-sm font-bold ${D ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>{f}</span>
                    ))}
                  </div>
                </div>

                {/* Steps */}
                <div className={`rounded-3xl p-5 border ${D ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                  <h3 className={`text-base font-black uppercase tracking-widest mb-5 ${D ? 'text-gray-400' : 'text-gray-500'}`}>{T.steps}</h3>
                  <div className="space-y-4">
                    {data.steps.map((s) => (
                      <div key={s.step} className={`rounded-2xl p-4 border ${D ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-black text-sm ${D ? 'bg-white text-black' : 'bg-black text-white'}`}>{s.step}</div>
                          <p className={`text-base font-bold ${D ? 'text-gray-200' : 'text-gray-800'}`}>{s.description}</p>
                        </div>
                        {s.equation && (
                          <div className={`mt-2 px-4 py-3 rounded-xl font-mono text-base font-bold select-all ${D ? 'bg-gray-900 text-green-400' : 'bg-white text-gray-900 border border-gray-200'}`}>
                            {s.equation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Answers */}
                {data.finalAnswers && data.finalAnswers.length > 0 && (
                  <div className={`rounded-3xl p-5 border ${D ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-base font-black uppercase tracking-widest mb-4 ${D ? 'text-gray-400' : 'text-gray-500'}`}>
                      {lang === 'HI' ? 'अंतिम उत्तर' : 'Final Answers'}
                    </h3>
                    <div className="space-y-3">
                      {data.finalAnswers.map((ans, i) => (
                        <div key={i} className={`rounded-2xl p-4 border ${D ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <span className={`text-sm font-bold ${D ? 'text-gray-300' : 'text-gray-700'}`}>{ans.label}</span>
                            <span className={`text-base font-black ${D ? 'text-white' : 'text-black'}`}>
                              {String(ans.value)} <span className={`text-sm font-bold ${D ? 'text-gray-400' : 'text-gray-500'}`}>{ans.unit}</span>
                            </span>
                          </div>
                          {ans.expression && (
                            <div className={`mt-2 px-4 py-3 rounded-xl font-mono text-base font-bold select-all ${D ? 'bg-gray-900 text-green-400' : 'bg-white text-gray-900 border border-gray-200'}`}>
                              {ans.expression}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sliders */}
                {data.sliders.length > 0 && (
                  <div className={`rounded-3xl p-5 border ${D ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${D ? 'text-gray-400' : 'text-gray-500'}`}>{T.manualControls}</h3>
                    <div className="space-y-4">
                      {data.sliders.map((slider) => {
                        const targetObj = data.objects.find(o => o.id === slider.objectId);
                        if (!targetObj) return null;
                        const currentValue = targetObj[slider.field as keyof typeof targetObj] as number;
                        return (
                          <div key={slider.id} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className={`font-bold text-sm ${D ? 'text-gray-300' : 'text-gray-700'}`}>{slider.label}</label>
                              <span className={`px-3 py-1 rounded-lg font-mono font-bold text-sm ${D ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>{currentValue}</span>
                            </div>
                            <input type="range" min={slider.min} max={slider.max} step={slider.step} value={currentValue}
                              onChange={(e) => {
                                const newValue = parseFloat(e.target.value);
                                setData({ ...data, objects: data.objects.map(obj => obj.id === slider.objectId ? { ...obj, [slider.field]: newValue } : obj) });
                              }}
                              className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${D ? 'accent-white bg-gray-700' : 'accent-black bg-gray-200'}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Empty state */}
            {!data && (
              <div className="flex-1 flex flex-col items-center justify-center py-20">
                <p className={`text-base font-bold uppercase tracking-widest text-center ${D ? 'text-gray-600' : 'text-gray-400'}`}>{T.enterProblem}</p>
              </div>
            )}
          </div>

          {/* Fixed input at bottom */}
          <div className={`shrink-0 p-4 border-t ${D ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-gray-50'}`}>
            {error && (
              <div className="mb-3 bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 font-bold flex gap-2 items-center text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <div className={`flex items-end gap-3 p-3 rounded-3xl border ${D ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}>
              <textarea
                placeholder={T.problemPlaceholder}
                value={input}
                rows={3}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                className={`flex-1 resize-none focus:outline-none text-base font-medium bg-transparent ${D ? 'text-white placeholder-gray-500' : 'text-black placeholder-gray-400'}`}
              />
              <button onClick={handleGenerate} disabled={simLoading}
                className={`shrink-0 px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 ${D ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}>
                {simLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {!simLoading && T.send}
              </button>
            </div>
            <p className={`text-xs text-center mt-2 ${D ? 'text-gray-600' : 'text-gray-400'}`}>Press Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  );
}
