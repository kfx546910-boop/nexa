import React, { useRef, useState } from 'react';
import {
  AudioLines, CheckCircle2, Cloud, Database, FileImage, Film, Globe2, ImagePlus,
  LockKeyhole, MapPinned, Mic, Play, Search, Sparkles, Upload, WandSparkles
} from 'lucide-react';
import { firebaseConfigured, getFirebaseUser, saveCapabilityEvent } from '../services/firebase';

type Capability = {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  kind: 'local' | 'firebase' | 'cloud';
};

const capabilities: Capability[] = [
  { id: 'firebase', icon: Database, title: 'Add database and auth', description: 'Firestore & Auth with Firebase', kind: 'firebase' },
  { id: 'image-edit', icon: ImagePlus, title: 'Create & edit images', description: 'Fast image generation & editing with Nano Banana 2', kind: 'cloud' },
  { id: 'voice', icon: AudioLines, title: 'Add voice conversations', description: 'Real-time voice with the Gemini Live API', kind: 'cloud' },
  { id: 'image-video', icon: Film, title: 'Animate images into video', description: 'Turn images into cinematic video with Veo 3', kind: 'cloud' },
  { id: 'search', icon: Search, title: 'Use Google Search data', description: 'Access real-time info with Search Grounding', kind: 'cloud' },
  { id: 'maps', icon: MapPinned, title: 'Use Google Maps data', description: 'Access real-time info with Maps Grounding', kind: 'cloud' },
  { id: 'text-video', icon: WandSparkles, title: 'Generate video from text', description: 'Text-to-video generation with Veo 3', kind: 'cloud' },
  { id: 'transcribe', icon: Mic, title: 'Transcribe audio', description: 'Audio transcription with Gemini 3.5 Transcribe', kind: 'local' }
];

export const Capabilities: React.FC = () => {
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 3500);
  };

  const activate = async (capability: Capability) => {
    if (capability.id === 'firebase') {
      if (!firebaseConfigured) {
        notify('Add VITE_FIREBASE_* values to .env.local to enable Firebase.');
        return;
      }
      try {
        const user = await getFirebaseUser();
        setUserId(user.uid);
        await saveCapabilityEvent('firebase-auth');
        notify('Firebase anonymous auth is connected.');
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Firebase connection failed.');
      }
      return;
    }
    if (capability.id === 'image-edit') {
      fileInputRef.current?.click();
      return;
    }
    if (capability.id === 'transcribe') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) { notify('Speech recognition is not supported in this browser.'); return; }
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.onstart = () => setRecording(true);
      recognition.onend = () => setRecording(false);
      recognition.onresult = event => notify(`Transcribed: ${event.results[0][0].transcript}`);
      recognition.start();
      return;
    }
    notify(`${capability.title} needs a configured Gemini API or server endpoint.`);
  };

  const handleImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    notify('Image loaded. Connect Nano Banana 2 to apply edits.');
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col justify-between gap-3 border-b border-slate-800 pb-5 md:flex-row md:items-end">
        <div><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400">Capability deck</p><h1 className="text-2xl font-bold text-white">Extend NEXUS</h1><p className="mt-1 max-w-xl text-sm text-slate-400">Connect creative tools, live data, and durable cloud memory from one workspace.</p></div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400"><span className={`h-2 w-2 rounded-full ${firebaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />{firebaseConfigured ? 'Firebase configured' : 'Firebase setup required'}</div>
      </div>
      {message && <div className="mb-4 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-2 text-xs text-cyan-200">{message}</div>}
      {userId && <div className="mb-4 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Signed in anonymously <span className="font-mono text-slate-500">{userId.slice(0, 10)}...</span></div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {capabilities.map(capability => {
          const Icon = capability.icon;
          const isActive = capability.kind === 'local' || (capability.kind === 'firebase' && firebaseConfigured);
          return <button key={capability.id} onClick={() => activate(capability)} className="group flex min-h-44 flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-500/50 hover:bg-slate-900">
            <div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-cyan-300"><Icon className="h-5 w-5" /></span><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${isActive ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>{isActive ? 'Ready' : 'Setup'}</span></div>
            <div><h2 className="mt-5 text-sm font-semibold text-slate-100">{capability.title}</h2><p className="mt-1 text-xs leading-5 text-slate-400">{capability.description}</p></div>
          </button>;
        })}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
      {preview && <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3"><img src={preview} alt="Selected source" className="h-16 w-16 rounded-lg object-cover" /><div><p className="text-xs font-semibold text-slate-200">Source image ready</p><p className="text-[11px] text-slate-500">Nano Banana 2 editing endpoint is not configured yet.</p></div></div>}
      <p className="mt-6 flex items-center gap-2 text-[11px] text-slate-500"><LockKeyhole className="h-3.5 w-3.5" /> Cloud tools only activate after their provider credentials are configured.</p>
    </section>
  );
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
  interface SpeechRecognition extends EventTarget {
    lang: string;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    start: () => void;
  }
  interface SpeechRecognitionEvent extends Event { results: { [index: number]: { [index: number]: { transcript: string } } }; }
}