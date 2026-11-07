"use client";

import { useEffect, useMemo, useState } from "react";

type Meal = { id: string; name: string; kcal: number; protein: number; carbs: number; fat: number; time: string };
type Exercise = { id: string; name: string; sets: number; reps: number; completed: boolean };
type Msg = { role: "user" | "assistant"; text: string };

const initialMeals: Meal[] = [
  { id: "m1", name: "Овсяная каша", kcal: 250, protein: 9, carbs: 42, fat: 5, time: "08:30" },
  { id: "m2", name: "Курица с рисом", kcal: 520, protein: 42, carbs: 58, fat: 12, time: "13:00" }
];
const initialExercises: Exercise[] = [
  { id: "e1", name: "Жим лёжа", sets: 3, reps: 10, completed: false },
  { id: "e2", name: "Тяга верхнего блока", sets: 3, reps: 12, completed: false },
  { id: "e3", name: "Жим гантелей", sets: 3, reps: 10, completed: false },
  { id: "e4", name: "Разгибание рук на блоке", sets: 3, reps: 12, completed: false }
];

declare global {
  interface Window { Telegram?: { WebApp?: { initData?: string; ready: () => void; expand: () => void; close: () => void; colorScheme?: string; BackButton?: { show: () => void; hide: () => void } } } }
}

export default function Home() {
  const [tab, setTab] = useState("Главная");
  const [dark, setDark] = useState(true);
  const [steps, setSteps] = useState(6842);
  const [weight, setWeight] = useState(79);
  const [targetWeight, setTargetWeight] = useState(70);
  const [calorieGoal, setCalorieGoal] = useState(2200);
  const [water, setWater] = useState(1200);
  const [sleep, setSleep] = useState(7.5);
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [mealName, setMealName] = useState("");
  const [mealKcal, setMealKcal] = useState(250);
  const [mealP, setMealP] = useState(15);
  const [mealC, setMealC] = useState(25);
  const [mealF, setMealF] = useState(8);
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", text: "Привет! Я FITAI — твой фитнес-помощник. Могу помочь с питанием, тренировками и восстановлением. Что сегодня планируем?" }]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [foodImage, setFoodImage] = useState<string | null>(null);
  const [profileGoal, setProfileGoal] = useState("Похудение");
  const [language, setLanguage] = useState("RU");
  const [telegramUser, setTelegramUser] = useState("Веб-режим");

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready(); tg.expand();
      setTelegramUser("Telegram Mini App");
    }
    try {
      const saved = localStorage.getItem("fitai-state-v1");
      if (saved) {
        const s = JSON.parse(saved);
        if (typeof s.steps === "number") setSteps(s.steps);
        if (typeof s.weight === "number") setWeight(s.weight);
        if (typeof s.targetWeight === "number") setTargetWeight(s.targetWeight);
        if (typeof s.calorieGoal === "number") setCalorieGoal(s.calorieGoal);
        if (typeof s.water === "number") setWater(s.water);
        if (typeof s.sleep === "number") setSleep(s.sleep);
        if (Array.isArray(s.meals)) setMeals(s.meals);
        if (Array.isArray(s.exercises)) setExercises(s.exercises);
        if (typeof s.dark === "boolean") setDark(s.dark);
      }
    } catch { /* ignore malformed local state */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("fitai-state-v1", JSON.stringify({ steps, weight, targetWeight, calorieGoal, water, sleep, meals, exercises, dark }));
  }, [steps, weight, targetWeight, calorieGoal, water, sleep, meals, exercises, dark]);

  const totals = useMemo(() => meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [meals]);
  const completed = exercises.filter(e => e.completed).length;
  const initData = () => window.Telegram?.WebApp?.initData || "";

  function addMeal() {
    if (!mealName.trim() || mealKcal < 0) return;
    setMeals(v => [...v, { id: crypto.randomUUID(), name: mealName.trim(), kcal: mealKcal, protein: mealP, carbs: mealC, fat: mealF, time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) }]);
    setMealName(""); setNotice("Продукт добавлен в дневник питания.");
  }

  async function askAI(text?: string, image?: string | null) {
    const question = (text ?? prompt).trim();
    if (!question && !image) return;
    const userText = question || "Проанализируй фото еды. Оцени блюдо, примерную порцию, калории и БЖУ. Укажи, что оценка приблизительная.";
    setMessages(v => [...v, { role: "user", text: userText }]);
    setPrompt(""); setBusy(true); setNotice("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": initData() },
        body: JSON.stringify({ message: userText, image })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось получить ответ AI.");
      setMessages(v => [...v, { role: "assistant", text: data.reply }]);
      setFoodImage(null);
    } catch (e) {
      setMessages(v => [...v, { role: "assistant", text: e instanceof Error ? e.message : "Ошибка соединения." }]);
    } finally { setBusy(false); }
  }

  async function onImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setNotice("Выбери файл изображения."); return; }
    if (file.size > 5 * 1024 * 1024) { setNotice("Размер изображения — до 5 МБ."); return; }
    const reader = new FileReader();
    reader.onload = () => setFoodImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  const nav = ["Главная", "Питание", "Тренировки", "AI-тренер", "Цели"];
  return (
    <main className={dark ? "app dark" : "app light"}>
      <header className="topbar">
        <div className="brand"><div className="brand-mark">F</div><div><b>FITAI</b><small>YOUR AI FITNESS COMPANION</small></div></div>
        <div className="top-actions"><span className="connection"><i />{telegramUser}</span><button className="icon-btn" onClick={() => setDark(v => !v)} aria-label="Переключить тему">{dark ? "☀️" : "🌙"}</button></div>
      </header>
      <div className="layout">
        <aside className="sidebar">
          <div className="nav-label">МЕНЮ</div>
          {nav.map((n, i) => <button key={n} className={`nav-btn ${tab === n ? "active" : ""}`} onClick={() => setTab(n)}><span>{["⌂", "◉", "▣", "✦", "◎"][i]}</span>{n}</button>)}
          <div className="sidebar-tip"><div className="tip-icon">✦</div><b>Маленькие шаги — большие результаты</b><p>Будь последовательным. FITAI поможет держать курс.</p></div>
        </aside>
        <section className="content">
          {notice && <div className="notice" onClick={() => setNotice("")}>{notice} <b>×</b></div>}
          {tab === "Главная" && <>
            <div className="page-heading"><div><p className="eyebrow">ТВОЙ ПРОГРЕСС</p><h1>Добро пожаловать!</h1><p className="muted">Каждый день — новый шаг к лучшей версии себя.</p></div><span className="date-pill">{new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span></div>
            <div className="metric-grid">
              <Metric icon="👟" label="Шаги" value={steps.toLocaleString("ru-RU")} sub="Цель 10 000" />
              <Metric icon="🔥" label="Активные калории" value={`${Math.round(steps * .04)} ккал`} sub="Приблизительная оценка" />
              <Metric icon="⚖️" label="Текущий вес" value={`${weight} кг`} sub={`Цель ${targetWeight} кг`} />
              <Metric icon="🌙" label="Сон" value={`${sleep} ч`} sub={sleep >= 7 ? "Хорошее восстановление" : "Постарайся выспаться"} />
            </div>
            <div className="dashboard-grid">
              <div className="panel">
                <div className="panel-title"><div><h2>Вода</h2><p className="muted">Поддерживай водный баланс</p></div><span className="big-icon">💧</span></div>
                <div className="water-number">{(water / 1000).toFixed(2)} <small>л / 2.5 л</small></div>
                <div className="progress"><span style={{ width: `${Math.min(100, water / 2500 * 100)}%` }} /></div>
                <div className="progress-meta"><span>{Math.round(water / 2500 * 100)}% от цели</span><span>{Math.max(0, 2500 - water)} мл осталось</span></div>
                <div className="button-row"><button className="btn secondary" onClick={() => setWater(v => Math.max(0, v - 250))}>− 250 мл</button><button className="btn primary" onClick={() => setWater(v => v + 250)}>＋ 250 мл</button></div>
              </div>
              <div className="panel">
                <div className="panel-title"><div><h2>Цель по весу</h2><p className="muted">Твоя текущая дистанция</p></div><span className="big-icon">🎯</span></div>
                <div className="weight-display">{weight} <small>кг</small><span>→</span>{targetWeight} <small>кг</small></div>
                <p className="muted">Осталось {Math.max(0, weight - targetWeight).toFixed(1)} кг до цели</p>
                <button className="btn secondary full" onClick={() => setTab("Цели")}>Настроить цели</button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title"><div><h2>Питание сегодня</h2><p className="muted">Сводка дневника питания</p></div><button className="text-btn" onClick={() => setTab("Питание")}>Открыть дневник →</button></div>
              <div className="calorie-row"><strong>{totals.kcal}</strong><span>/ {calorieGoal} ккал</span><b>{Math.max(0, calorieGoal - totals.kcal)} осталось</b></div>
              <div className="progress"><span style={{ width: `${Math.min(100, totals.kcal / Math.max(1, calorieGoal) * 100)}%` }} /></div>
              <div className="macro-grid"><Macro label="Белки" value={totals.protein} unit="г" /><Macro label="Углеводы" value={totals.carbs} unit="г" /><Macro label="Жиры" value={totals.fat} unit="г" /></div>
            </div>
          </>}
          {tab === "Питание" && <>
            <div className="page-heading"><div><p className="eyebrow">ПИТАНИЕ</p><h1>Дневник питания</h1><p className="muted">Следи за калориями и балансом БЖУ.</p></div></div>
            <div className="panel">
              <div className="calorie-row"><strong>{totals.kcal}</strong><span>/ {calorieGoal} ккал</span><b>{Math.max(0, calorieGoal - totals.kcal)} осталось</b></div>
              <div className="progress"><span style={{ width: `${Math.min(100, totals.kcal / Math.max(1, calorieGoal) * 100)}%` }} /></div>
              <div className="macro-grid"><Macro label="Белки" value={totals.protein} unit="г" /><Macro label="Углеводы" value={totals.carbs} unit="г" /><Macro label="Жиры" value={totals.fat} unit="г" /></div>
            </div>
            <div className="panel">
              <h2>Добавить продукт</h2>
              <div className="form-grid">
                <label className="span-2">Название<input value={mealName} onChange={e => setMealName(e.target.value)} placeholder="Например, омлет с овощами" /></label>
                <label>Калории<input type="number" min="0" value={mealKcal} onChange={e => setMealKcal(Number(e.target.value))} /></label>
                <label>Белки, г<input type="number" min="0" value={mealP} onChange={e => setMealP(Number(e.target.value))} /></label>
                <label>Углеводы, г<input type="number" min="0" value={mealC} onChange={e => setMealC(Number(e.target.value))} /></label>
                <label>Жиры, г<input type="number" min="0" value={mealF} onChange={e => setMealF(Number(e.target.value))} /></label>
              </div>
              <button className="btn primary" onClick={addMeal} disabled={!mealName.trim()}>＋ Добавить в дневник</button>
            </div>
            <div className="panel">
              <h2>Записи за сегодня</h2>
              {meals.length === 0 && <p className="muted">Пока записей нет. Добавь первый приём пищи.</p>}
              {meals.map(m => <div className="meal-item" key={m.id}><div className="meal-avatar">🥗</div><div className="meal-info"><b>{m.name}</b><small>{m.time} · Б {m.protein} г · У {m.carbs} г · Ж {m.fat} г</small></div><strong>{m.kcal} ккал</strong><button className="remove" onClick={() => setMeals(v => v.filter(x => x.id !== m.id))}>×</button></div>)}
            </div>
            <div className="panel">
              <h2>AI-анализ по фото</h2><p className="muted">Загрузи фото блюда — AI оценит состав, калории и БЖУ. Оценка приблизительная.</p>
              <label className="upload"><input type="file" accept="image/*" onChange={e => onImage(e.target.files?.[0])} />📷 Выбрать фото еды</label>
              {foodImage && <div className="image-preview"><img src={foodImage} alt="Предпросмотр блюда" /><button className="btn primary" onClick={() => askAI("Проанализируй еду на фото: оцени блюдо, порцию, калории и БЖУ.", foodImage)}>Анализировать фото</button></div>}
            </div>
          </>}
          {tab === "Тренировки" && <>
            <div className="page-heading"><div><p className="eyebrow">АКТИВНОСТЬ</p><h1>Тренировка</h1><p className="muted">Средний уровень · Грудь и трицепс</p></div><span className="date-pill">{completed}/{exercises.length} готово</span></div>
            <div className="panel">
              <div className="progress"><span style={{ width: `${exercises.length ? completed / exercises.length * 100 : 0}%` }} /></div>
              {exercises.map(ex => <div className="exercise" key={ex.id}><button className={`check ${ex.completed ? "checked" : ""}`} onClick={() => setExercises(v => v.map(x => x.id === ex.id ? { ...x, completed: !x.completed } : x))}>{ex.completed ? "✓" : ""}</button><div className="exercise-info"><b>{ex.name}</b><small>{ex.sets} подхода × {ex.reps} повторений</small></div><span className={ex.completed ? "done-label" : "todo-label"}>{ex.completed ? "Выполнено" : "В плане"}</span></div>)}
              <button className="btn secondary full" onClick={() => setExercises(v => v.map(x => ({ ...x, completed: false })))}>Сбросить тренировку</button>
            </div>
          </>}
          {tab === "AI-тренер" && <>
            <div className="page-heading"><div><p className="eyebrow">OPENAI FITNESS COACH</p><h1>Твой AI-тренер</h1><p className="muted">Задавай вопросы о тренировках, питании и восстановлении.</p></div><span className="ai-badge">✦ AI ONLINE*</span></div>
            <div className="panel chat-panel">
              <div className="chat-messages">{messages.map((m, i) => <div key={i} className={`chat-message ${m.role}`}><span>{m.role === "assistant" ? "✦ FITAI" : "Ты"}</span><p>{m.text}</p></div>)}{busy && <div className="chat-message assistant"><span>✦ FITAI</span><p>Думаю над ответом…</p></div>}</div>
              <div className="chat-input"><input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && askAI()} placeholder="Например: составь план питания на день…" /><button className="btn primary" onClick={() => askAI()} disabled={busy || !prompt.trim()}>Отправить</button></div>
              <small className="muted">*AI заработает после добавления OPENAI_API_KEY в Vercel.</small>
            </div>
          </>}
          {tab === "Цели" && <>
            <div className="page-heading"><div><p className="eyebrow">ПЕРСОНАЛЬНЫЙ ПЛАН</p><h1>Цели и профиль</h1><p className="muted">Настрой параметры для расчёта своего плана.</p></div></div>
            <div className="panel">
              <div className="form-grid">
                <label>Текущий вес, кг<input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} /></label>
                <label>Целевой вес, кг<input type="number" value={targetWeight} onChange={e => setTargetWeight(Number(e.target.value))} /></label>
                <label>Калорийная цель<input type="number" value={calorieGoal} onChange={e => setCalorieGoal(Number(e.target.value))} /></label>
                <label>Шаги за день<input type="number" value={steps} onChange={e => setSteps(Number(e.target.value))} /></label>
                <label>Сон, часов<input type="number" step="0.5" value={sleep} onChange={e => setSleep(Number(e.target.value))} /></label>
                <label>Язык<select value={language} onChange={e => setLanguage(e.target.value)}><option value="RU">Русский</option><option value="EN">English</option></select></label>
                <label className="span-2">Главная цель<select value={profileGoal} onChange={e => setProfileGoal(e.target.value)}><option>Похудение</option><option>Набор мышечной массы</option><option>Поддержание формы</option><option>Выносливость</option></select></label>
              </div>
              <div className="notice success">Параметры сохраняются автоматически на этом устройстве.</div>
            </div>
          </>}
          <footer>FITAI · Prototype 1.0 <span>Данные хранятся локально в браузере</span></footer>
        </section>
      </div>
      <nav className="mobile-nav">{nav.map((n, i) => <button key={n} className={tab === n ? "selected" : ""} onClick={() => setTab(n)}><span>{["⌂", "◉", "▣", "✦", "◎"][i]}</span>{n === "AI-тренер" ? "AI" : n}</button>)}</nav>
    </main>
  );
}

function Metric({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{sub}</small></div>;
}
function Macro({ label, value, unit }: { label: string; value: number; unit: string }) {
  return <div className="macro"><span>{label}</span><b>{value}{unit}</b></div>;
}
