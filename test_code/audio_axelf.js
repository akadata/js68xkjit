const { spawn } = require('child_process');

const SAMPLE_RATE = 44100;

const play = spawn('ffplay', [
  '-nodisp', '-autoexit',
  '-f', 's16le', '-ar', SAMPLE_RATE,
  '-ch_layout', 'mono', '-i', 'pipe:0'
]);

// CRITICAL: Handle the EPIPE error so it doesn't crash Node
play.stdin.on('error', (err) => {
  if (err.code === 'EPIPE') {
    console.error('Error: ffplay closed the pipe. Is FFmpeg installed?');
  } else {
    console.error('stdin error:', err);
  }
});



// --- FREQUENCIES ---
const F2=87.31, Gs2=103.83, As2=116.54, C3=130.81, Ds3=155.56;
const F3=174.61, Gs3=207.65, As3=233.08, C4=261.63, Cs4=277.18, Ds4=311.13;
const F4=349.23, Gs4=415.30, As4=466.16, C5=523.25, Cs5=554.37, Ds5=622.25, F5=698.46, Gs5=830.61;

const BPM = 117;
const step = 60 / BPM / 4; 

// --- SOUND ENGINES ---
const adsr = (t, dur, a=0.005, d=0.1, s=0.3, r=0.08) => {
    if (t < a) return t / a;
    if (t < a + d) return 1 - ((t - a) / d) * (1 - s);
    if (t < dur - r) return s;
    if (t < dur) return s * (1 - (t - (dur - r)) / r);
    return 0;
};

const lead = (t, f) => (Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.3 + Math.sin(2 * Math.PI * f * 2.01 * t) * 0.1);
const bass = (t, f) => (Math.sin(2 * Math.PI * f * t) + ((t * f % 1) * 2 - 1) * 0.15);

// --- THE COMPLETE SCORE ---
const melody = [
    // Phrase 1 (Main)
    [F4, 0, 4], [Gs4, 4, 3], [F4, 8, 2], [F4, 10, 1], [As4, 11, 2], [F4, 13, 2], [Ds4, 15, 2],
    [F4, 16, 4], [C5, 20, 3], [F4, 24, 2], [F4, 26, 1], [Cs5, 27, 2], [C5, 29, 2], [Gs4, 31, 2],
    [F4, 32, 2], [C5, 34, 2], [F5, 36, 2], [F4, 38, 1], [Ds4, 39, 2], [Ds4, 41, 1], [C4, 42, 2], [Gs4, 44, 2], [F4, 46, 4],
    // Phrase 2 (The "B" Section / Higher Hook)
    [F4, 64, 4], [Gs4, 68, 3], [F4, 72, 2], [F4, 74, 1], [As4, 75, 2], [F4, 77, 2], [Ds4, 79, 2],
    [F4, 80, 4], [C5, 84, 3], [F4, 88, 2], [F4, 90, 1], [Cs5, 91, 2], [C5, 93, 2], [Gs4, 95, 2],
    [F4, 96, 2], [C5, 98, 2], [F5, 100, 2], [F4, 102, 1], [Ds4, 103, 2], [Cs5, 105, 2], [C5, 107, 2], [Gs4, 109, 2], [F4, 111, 4]
];

const bassline = [];
for (let i = 0; i < 128; i += 16) {
    bassline.push([F2, i, 2], [F2, i+4, 1], [Gs2, i+6, 2], [F2, i+8, 2], [As2, i+14, 2]);
}

function renderLoop() {
    const totalSteps = 128;
    const totalSamples = Math.floor(totalSteps * step * SAMPLE_RATE);
    const canvas = new Float32Array(totalSamples);

    melody.forEach(([f, s, d]) => {
        const start = Math.floor(s * step * SAMPLE_RATE);
        const len = Math.floor(d * step * SAMPLE_RATE * 1.5);
        for (let i = 0; i < len && (start + i) < totalSamples; i++) {
            canvas[start + i] += lead(i / SAMPLE_RATE, f) * adsr(i / SAMPLE_RATE, d * step) * 0.4;
        }
    });

    bassline.forEach(([f, s, d]) => {
        const start = Math.floor(s * step * SAMPLE_RATE);
        const len = Math.floor(d * step * SAMPLE_RATE);
        for (let i = 0; i < len && (start + i) < totalSamples; i++) {
            canvas[start + i] += bass(i / SAMPLE_RATE, f) * adsr(i / SAMPLE_RATE, d * step, 0.01, 0.05, 0.6, 0.05) * 0.5;
        }
    });

    for (let s = 0; s < totalSteps; s++) {
        const start = Math.floor(s * step * SAMPLE_RATE);
        for (let i = 0; i < 0.1 * SAMPLE_RATE && (start + i) < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            if (s % 8 === 0) canvas[start + i] += (t > 0.1 ? 0 : Math.sin(2 * Math.PI * 110 * Math.exp(-t * 30) * t) * (1 - t / 0.1)) * 0.7;
            if (s % 8 === 4) canvas[start + i] += ((Math.random() * 2 - 1) * Math.exp(-t * 50)) * 0.3;
        }
    }

    // Reverb
    const dly = Math.floor(SAMPLE_RATE * 0.18);
    for (let i = dly; i < totalSamples; i++) canvas[i] += canvas[i - dly] * 0.22;

    const out = Buffer.alloc(totalSamples * 2);
    for (let i = 0; i < totalSamples; i++) {
        const s = Math.max(-1, Math.min(1, canvas[i]));
        out.writeInt16LE(Math.floor(s * 32767), i * 2);
    }
    return out;
}

const audioData = renderLoop();

function playLoop() {
    if (play.stdin.writable) {
        play.stdin.write(audioData, () => playLoop());
    }
}

playLoop();
