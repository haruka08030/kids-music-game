import React, { useEffect, useMemo, useRef, useState } from "react";

function buildBeatSequence(bpm, judgeOffset, judgeBeats, startAtMs) {
  const interval = 60000 / bpm;
  return Array.from({ length: judgeOffset + judgeBeats }, (_, i) => startAtMs + i * interval);
}
function judgeDelta(deltaMs, perfectWin, goodWin) {
  return deltaMs <= perfectWin ? "Perfect" : deltaMs <= goodWin ? "Good" : null;
}
function computeAccuracy(total, perfect, good) {
  return total ? Math.round(((perfect + 0.5 * good) / total) * 100) : 0;
}
function useAudio() {
  const ctxRef = useRef(null);
  const ensure = async () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === "suspended") {
      try { await ctxRef.current.resume(); } catch { }
    }
    return ctxRef.current;
  };

  const playBeep = async ({
    freq = 660,
    duration = 0.12,
    type = "sine",
    volume = 0.2,
    when = 0,
    attack = 0.005,
    release = 0.06,
  } = {}) => {
    const ctx = await ensure();
    const t0 = ctx.currentTime + Math.max(0, when);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(attack + 0.01, duration - release));
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
  };

  const playTick = async (strong = false) => {
    await playBeep({ freq: strong ? 980 : 660, type: "square", duration: 0.07, volume: 0.15 });
  };

  return { ensure, playBeep, playTick };
}


const Section = ({ title, children }) => (
  <div className="rounded-2xl bg-white/80 shadow p-4 md:p-6">
    <h2 className="text-xl font-bold mb-3">{title}</h2>
    {children}
  </div>
);

const BigButton = ({ children, onClick, disabled, variant = "primary" }) => {
  const base =
    "px-6 py-3 rounded-2xl text-lg font-bold shadow transition active:scale-[0.98] disabled:opacity-50";
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    green: "bg-green-600 text-white hover:bg-green-700",
    orange: "bg-orange-500 text-white hover:bg-orange-600",
    gray: "bg-gray-200 hover:bg-gray-300",
  };
  return (
    <button className={`${base} ${styles[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};

const Stat = ({ label, value }) => (
  <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-gray-50">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-xl font-bold">{value}</div>
  </div>
);


function Starburst({ label = "パン!", active = false }) {
  const spikes = 16;
  const outer = 90;
  const inner = 55;
  const cx = 100, cy = 100;
  const step = Math.PI / spikes;
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + i * step;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    pts.push(`${x},${y}`);
  }
  const rays = Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2;
    const r1 = 95, r2 = 120;
    return { x1: cx + r1 * Math.cos(a), y1: cy + r1 * Math.sin(a), x2: cx + r2 * Math.cos(a), y2: cy + r2 * Math.sin(a) };
  });
  return (
    <div className={`relative w-40 h-40 transition-transform duration-150 ${active ? "scale-110" : ""}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <g stroke="#ea580c" strokeWidth="6" strokeLinecap="round">
          {rays.map((r, i) => (
            <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
          ))}
        </g>
        <polygon points={pts.join(" ")} fill="#facc15" stroke="#111" strokeWidth="6" strokeLinejoin="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center select-none">
        <div className="text-4xl font-extrabold text-black drop-shadow">{label}</div>
      </div>
    </div>
  );
}


function RhythmGame() {
  const { playTick, ensure } = useAudio();
  const [bpm, setBpm] = useState(90);
  const [running, setRunning] = useState(false);
  const [beats, setBeats] = useState([]);
  const [hits, setHits] = useState({});
  const [pulse, setPulse] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const timeoutsRef = useRef([]);

  const perfectWin = 80;
  const goodWin = 160;
  const judgeOffset = 4;
  const judgeBeats = 16;

  useEffect(() => () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
  }, []);

  const stop = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
    setRunning(false);
    setCurrentBeat(-1);
  };

  const start = async () => {
    await ensure();
    stop();
    const interval = 60000 / bpm;
    const startAt = performance.now() + 600;
    const seq = buildBeatSequence(bpm, judgeOffset, judgeBeats, startAt);
    setBeats(seq);
    setHits({});
    setRunning(true);

    seq.forEach((t, i) => {
      const delay = t - performance.now();
      const id = setTimeout(() => {
        playTick(i % 4 === 0);
        setCurrentBeat(i);
        setPulse(true);
        setTimeout(() => setPulse(false), 120);
      }, Math.max(0, delay));
      timeoutsRef.current.push(id);
    });

    const endId = setTimeout(() => {
      setRunning(false);
      setCurrentBeat(-1);
    }, Math.max(0, seq[seq.length - 1] - performance.now() + interval * 0.8));
    timeoutsRef.current.push(endId);
  };

  const onTap = () => {
    if (!running || !beats.length) return;
    const now = performance.now();
    let bestIdx = -1, bestDelta = Infinity;
    for (let i = 0; i < beats.length; i++) {
      if (i < judgeOffset || hits[i]) continue;
      const d = Math.abs(now - beats[i]);
      if (d < bestDelta) { bestDelta = d; bestIdx = i; }
    }
    if (bestIdx === -1) return;

    const judgment = judgeDelta(bestIdx >= 0 ? Math.abs(now - beats[bestIdx]) : Infinity, perfectWin, goodWin);
    if (!judgment) return;
    setHits((prev) => ({ ...prev, [bestIdx]: { delta: Math.round(Math.abs(now - beats[bestIdx])), judgment } }));
  };

  useEffect(() => {
    const h = (e) => {
      if (e.code === "Space") { e.preventDefault(); onTap(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const { perfect, good, total, miss } = useMemo(() => {
    const vals = Object.values(hits);
    const p = vals.filter((v) => v.judgment === "Perfect").length;
    const g = vals.filter((v) => v.judgment === "Good").length;
    const t = Math.max(0, beats.length - judgeOffset);
    const m = Math.max(0, t - (p + g));
    return { perfect: p, good: g, total: t, miss: m };
  }, [hits, beats.length]);

  const accuracy = computeAccuracy(total, perfect, good);
  const stars = accuracy >= 90 ? 3 : accuracy >= 75 ? 2 : accuracy >= 55 ? 1 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Section title="リズム合わせ（スペースでタップ）">
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm text-gray-600">BPM</label>
          <input
            type="range" min={60} max={140} value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="w-40"
          />
          <div className="w-10 text-center font-mono">{bpm}</div>
          <span className="text-sm text-gray-600 ml-4">判定: 4×4</span>
        </div>
        <div className="flex items-center gap-3 mb-4">
          {!running ? (
            <BigButton onClick={start}>スタート</BigButton>
          ) : (
            <BigButton variant="orange" onClick={stop}>ストップ</BigButton>
          )}
          <BigButton variant="gray" onClick={onTap} disabled={!running}>タップ（クリック）</BigButton>
        </div>

        <div className="flex items-center justify-center h-44">
          {running ? (
            currentBeat < judgeOffset ? (
              <div className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-100 select-none ${pulse ? "scale-110 bg-blue-500" : "bg-blue-300"}`}>
                <div className="text-white text-5xl font-extrabold">{judgeOffset - currentBeat}</div>
              </div>
            ) : (
              <Starburst active={pulse} />
            )
          ) : (
            <div className="w-36 h-36 rounded-full bg-blue-200 flex items-center justify-center text-white text-4xl font-extrabold">♪</div>
          )}
        </div>
        <div className="mt-3 text-center text-gray-600 text-sm">スペースキーでもOK</div>
      </Section>

      <Section title="スコア">
        <div className="flex gap-3 flex-wrap">
          <Stat label="Perfect" value={perfect} />
          <Stat label="Good" value={good} />
          <Stat label="Miss(未ヒット)" value={miss} />
          <Stat label="判定数" value={total} />
          <Stat label="精度" value={`${accuracy}%`} />
        </div>
        <div className="mt-4 flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className={`w-10 h-10 rounded-xl ${i < stars ? "bg-yellow-400" : "bg-gray-200"} flex items-center justify-center text-2xl`}>
              ⭐
            </div>
          ))}
        </div>
        <div className="mt-4">
          <h3 className="font-semibold mb-2">ヒットログ</h3>
          <div className="max-h-40 overflow-auto border rounded-lg p-2 bg-gray-50">
            {Array.from({ length: beats.length }).map((_, i) => (
              <div key={i} className="text-sm font-mono">
                {i + 1}. {i < judgeOffset ? "準備" : (hits[i] ? `${hits[i].judgment} (+/-${hits[i].delta}ms)` : "—")}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="遊び方のヒント">
        <ul className="list-disc pl-5 text-sm leading-6 text-gray-700">
          <li>「パン！」が弾けたタイミング（拍）でスペースキー / タップ！</li>
          <li>最初の4拍は 4→3→2→1 のカウント表示（判定なし）。5拍目から「パン」表示と判定開始。</li>
          <li>±80ms 以内で <span className="font-bold">Perfect</span>、±160ms 以内で <span className="font-bold">Good</span> 判定。</li>
          <li>4拍ごとに強拍（少し高い音）。体で数えよう：1・2・3・4！</li>
          <li>小さい子でも遊びやすいよう、判定外はミスとして数えずスルー。</li>
        </ul>
      </Section>
    </div>
  );
}

function MelodyGame() {
  const { playBeep, ensure } = useAudio();
  const NOTES = [
    { name: "ド", key: "1", freq: 261.63, color: "bg-rose-400" },
    { name: "レ", key: "2", freq: 293.66, color: "bg-orange-400" },
    { name: "ミ", key: "3", freq: 329.63, color: "bg-amber-300" },
    { name: "ソ", key: "4", freq: 392.0, color: "bg-emerald-400" },
  ];
  const SONG = useMemo(() => [2, 1, 0, 1, 2, 2, 2, 1, 1, 1, 2, 3, 3], []);
  const [mode, setMode] = useState("free");
  const [idx, setIdx] = useState(0);
  const [bpm, setBpm] = useState(90);
  const [highlight, setHighlight] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [assist, setAssist] = useState(true);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const beatMs = 60000 / bpm;

  const glow = (i, ms = beatMs * 0.9) => {
    setHighlight(i);
    setTimeout(() => setHighlight(null), Math.min(ms, 500));
  };

  const playNoteIdx = async (i, dur = beatMs * 0.9) => {
    await ensure();
    glow(i, dur);
    await playBeep({ freq: NOTES[i].freq, duration: Math.min(0.4, dur / 1000), type: "sine", volume: 0.2 });
  };

  const startPractice = async () => {
    setMode("practice");
    setIdx(0);
    setScore(0);
    setFinished(false);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    let t = 600;
    SONG.forEach((noteIdx) => {
      timers.current.push(setTimeout(() => playNoteIdx(noteIdx), t));
      t += beatMs;
    });
    timers.current.push(setTimeout(() => setFinished(true), t + 200));
  };

  const startGame = async () => {
    await ensure();
    setMode("game");
    setIdx(0);
    setScore(0);
    setFinished(false);
    setAssist(true);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    glow(SONG[0]);
  };

  const onPad = async (i) => {
    if (mode === "free") {
      playNoteIdx(i);
      return;
    }
    if (mode === "practice") return;
    const expected = SONG[idx];
    playNoteIdx(i);
    if (i === expected) {
      setScore((s) => s + 1);
      const next = idx + 1;
      if (next >= SONG.length) {
        setIdx(next);
        setFinished(true);
        setMode("free");
        return;
      }
      setIdx(next);
      glow(SONG[next]);
    } else {
      if (assist) {
        setTimeout(() => playNoteIdx(expected), 200);
      }
    }
  };

  useEffect(() => {
    const h = (e) => {
      const map = { "Digit1": 0, "Digit2": 1, "Digit3": 2, "Digit4": 3, "Numpad1": 0, "Numpad2": 1, "Numpad3": 2, "Numpad4": 3 };
      if (e.code in map) { e.preventDefault(); onPad(map[e.code]); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const stars = score >= SONG.length * 0.9 ? 3 : score >= SONG.length * 0.7 ? 2 : score >= SONG.length * 0.5 ? 1 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Section title="メロディ（ド・レ・ミ・ソ）">
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm text-gray-600">BPM</label>
          <input type="range" min={70} max={120} value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))} className="w-40" />
          <div className="w-10 text-center font-mono">{bpm}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {NOTES.map((n, i) => (
            <button
              key={n.name}
              onClick={() => onPad(i)}
              className={`h-28 rounded-2xl text-3xl font-extrabold text-white shadow active:scale-[0.98] transition 
                ${n.color} ${highlight === i ? "ring-4 ring-white" : ""}`}
            >
              <div className="text-4xl">{n.name}</div>
              <div className="text-sm opacity-90">キー: {n.key}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <BigButton onClick={async () => { await ensure(); setMode("free"); setFinished(false); }}>自由にひく</BigButton>
          <BigButton variant="gray" onClick={startPractice}>練習（自動再生）</BigButton>
          <BigButton variant="green" onClick={startGame}>ゲーム開始</BigButton>
        </div>
        <div className="mt-3 text-sm text-gray-600">キーボード 1〜4 でもOK</div>
      </Section>

      <Section title="スコア & 進行">
        <div className="flex gap-3 flex-wrap mb-4">
          <Stat label="正解" value={`${score} / ${SONG.length}`} />
          <Stat label="状態" value={mode === "free" ? "自由" : mode === "practice" ? "練習" : "ゲーム"} />
        </div>
        <div className="mb-3 font-semibold">曲（譜面）</div>
        <div className="flex flex-wrap gap-2">
          {SONG.map((nIdx, i) => (
            <div key={i} className={`px-3 py-1 rounded-full text-sm font-bold text-white ${["bg-rose-400", "bg-orange-400", "bg-amber-300", "bg-emerald-400"][nIdx]} 
              ${i < idx ? "opacity-50" : i === idx ? "ring-4 ring-blue-400" : ""}`}>
              {NOTES[nIdx].name}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className={`w-10 h-10 rounded-xl ${i < stars ? "bg-yellow-400" : "bg-gray-200"} flex items-center justify-center text-2xl`}>
              ⭐
            </div>
          ))}
        </div>
        {finished && (
          <div className="mt-4 p-3 rounded-xl bg-green-50 text-green-700 font-semibold">できた！ よくできました 🎉</div>
        )}
      </Section>

      <Section title="遊び方のヒント">
        <ul className="list-disc pl-5 text-sm leading-6 text-gray-700">
          <li>「練習」で曲を自動再生して覚える → 「ゲーム開始」で同じ音を順に押す。</li>
          <li>ミスしても大丈夫。少しヒント音が鳴ります（ON）。</li>
          <li>自由モードでは好きに音で遊べます。保育・幼児向けの簡単設計。</li>
          <li>曲を増やしたい場合は <code>SONG</code> の配列に音インデックス（0=ド,1=レ,2=ミ,3=ソ）を追加。</li>
        </ul>
      </Section>
    </div>
  );
}

export default function KidsMusicGame() {
  const [tab, setTab] = useState("rhythm");
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-indigo-100 text-gray-900">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">🎵 子供向け 音楽ゲーム</h1>
          <div className="flex gap-2">
            <button
              className={`px-3 py-2 rounded-xl text-sm font-bold ${tab === 'rhythm' ? 'bg-white' : 'bg-white/60 hover:bg-white'}`}
              onClick={() => setTab('rhythm')}
            >リズム</button>
            <button
              className={`px-3 py-2 rounded-xl text-sm font-bold ${tab === 'melody' ? 'bg-white' : 'bg-white/60 hover:bg-white'}`}
              onClick={() => setTab('melody')}
            >メロディ</button>
          </div>
        </header>

        {tab === 'rhythm' ? <RhythmGame /> : <MelodyGame />}

        <footer className="mt-8 text-xs text-gray-600">
          <div>※ 音が出ない場合は、いずれかのボタンを一度クリック（ブラウザのオート再生制限のため）。</div>
        </footer>
      </div>
    </div>
  );
}
