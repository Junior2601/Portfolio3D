import { useEffect, useRef } from 'react';
import { useStudio } from './store.js';
import { fetchPortfolio } from './api.js';
import { Engine } from './studio/Engine.js';
import {
  advance, attachEngine, canMove, closeContact, enter, focusStation, goOverview, onManualMove, pickBook, pickCourse, showCourses,
  startTour, step, stopTour, toggleNight, toggleView, walkTo,
} from './controller.js';
import Intro from './components/Intro.jsx';
import TopBar from './components/TopBar.jsx';
import Dock from './components/Dock.jsx';
import Tags from './components/Tags.jsx';
import Bubble from './components/Bubble.jsx';
import Panel from './components/Panel.jsx';
import Toast from './components/Toast.jsx';
import ContactModal from './components/ContactModal.jsx';

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('700 40px "Space Grotesk"'), document.fonts.load('500 20px "JetBrains Mono"')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* polices de secours */ }
}

export default function App() {
  const canvasRef = useRef(null);
  const status = useStudio((s) => s.status);
  const started = useStudio((s) => s.started);
  const night = useStudio((s) => s.night);
  const focus = useStudio((s) => s.focus);

  // Construit le studio une seule fois, à partir des données de l'API
  useEffect(() => {
    const onPick = (i, { book, course, tab }) => {
      if (book !== undefined) pickBook(book);
      else if (course !== undefined) pickCourse(course);
      else if (tab !== undefined) showCourses(tab);
      else focusStation(i);
    };
    const engine = new Engine(canvasRef.current, { onPick, onWalk: walkTo, canMove, onManual: onManualMove });
    engine.setView(useStudio.getState().view);
    attachEngine(engine);
    (async () => {
      try {
        const [data] = await Promise.all([fetchPortfolio(), fontsReady()]);
        const stations = engine.build(data.profile, data.projects);
        const hour = new Date().getHours();
        const isNight = hour < 7 || hour >= 19;
        engine.setNight(isNight, true);
        useStudio.setState({
          status: 'ready',
          profile: data.profile,
          night: isNight,
          stations: stations.map(({ idx, type, num, project, look }) => ({ idx, type, num, project, look })),
        });
        document.title = `${data.profile.owner.toLowerCase()}.studio · Portfolio 3D`;
        engine.start();
      } catch (err) {
        useStudio.setState({ status: 'error', error: err.message });
      }
    })();
    const onResize = () => engine.resize();
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, []);

  // Classes du <body> utilisées par le CSS
  useEffect(() => { document.body.classList.toggle('intro', !started); }, [started]);
  useEffect(() => { document.body.classList.toggle('night', night); }, [night]);
  useEffect(() => {
    document.body.classList.toggle('focusing', focus >= 0);
    document.body.classList.toggle('panel-open', focus >= 0);
  }, [focus]);

  // Raccourcis clavier
  useEffect(() => {
    const onKey = (e) => {
      const s = useStudio.getState();
      if (s.contactOpen) { if (e.key === 'Escape') closeContact(); return; }
      if (!s.started) { if (e.key === 'Enter') enter(); return; }
      if (e.target.closest('input, textarea')) return;
      const fp = s.view === 'fp'; // à la première personne, les flèches servent à marcher (firstperson.js)
      if (e.key === 'ArrowRight' && !fp) step(1);
      else if (e.key === 'ArrowLeft' && !fp) step(-1);
      else if (e.key === 'Escape') goOverview();
      else if ((e.key === ' ' || e.key === 'Enter') && !e.target.closest('button, a')) { e.preventDefault(); advance(); }
      else if (e.key.toLowerCase() === 't') (s.tour ? stopTour() : startTour());
      else if (e.key.toLowerCase() === 'n') toggleNight();
      else if (e.key.toLowerCase() === 'v') toggleView();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <div className="bg bg-day" />
      <div className="bg bg-night" />
      <canvas id="scene" ref={canvasRef} aria-label="Open-space 3D interactif" />
      {status === 'ready' && (
        <>
          <Tags />
          <Bubble />
          <TopBar />
          <Dock />
          <Panel />
        </>
      )}
      <Toast />
      <ContactModal />
      <Intro />
    </>
  );
}
