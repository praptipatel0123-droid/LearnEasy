import { useState } from 'react';
import Visualizer from './components/Visualizer';
import { extractProblemData } from './lib/groq';
import { ProblemSchema, type ProblemData } from './lib/schema';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<ProblemData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    
    try {
      const rawJson = await extractProblemData(input);
      const validatedData = ProblemSchema.parse(rawJson);
      setData(validatedData);
    } catch (err: any) {
      console.error(err);
      setError("Math Logic Error: Check your API key or try a simpler problem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-blue-700 italic">MATH-TO-MOTION</h1>
            <p className="text-slate-500 font-bold uppercase tracking-tighter">Physics Simulation Engine</p>
          </div>
          {data && (
            <span className="bg-blue-600 text-white px-4 py-1 rounded-full font-black text-xs">
              {data.problemType.toUpperCase()}
            </span>
          )}
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-white">
          <textarea
            className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none h-32 text-xl focus:border-blue-400 transition-all text-slate-800"
            placeholder="Type a physics problem... (e.g., A car goes 50 m/s)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 text-xl shadow-lg transition-transform active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {loading ? "SIMULATING..." : "RUN VISUALIZATION"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl border-2 border-red-100 font-bold flex gap-2 items-center">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-2 space-y-6">
              <Visualizer data={data} />
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-400 uppercase text-xs mb-4 tracking-widest text-center">Active Objects</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.objects.map((obj) => (
                    <div key={obj.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: obj.color }} />
                        <span className="font-black text-slate-700 text-sm">{obj.label}</span>
                      </div>
                      <p className="text-blue-600 font-mono font-bold text-lg leading-none">
                        {obj.speed} {obj.speedUnit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl border-b-4 border-blue-500">
                <h3 className="text-blue-400 font-black text-sm uppercase mb-4 tracking-widest">Answer</h3>
                <p className="text-3xl font-black mb-2">{data.answer.value} {data.answer.unit}</p>
                <div className="bg-slate-800 p-3 rounded-xl">
                   <code className="text-xs text-slate-300 italic break-words">{data.answer.expression}</code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}