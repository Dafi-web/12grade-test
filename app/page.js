'use client';

import { useEffect, useMemo, useState } from 'react';

const YEARS = Array.from({ length: 15 }, (_, i) => String(2015 + i));
const NATURAL = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Aptitude', 'Technical Drawing', 'ICT'];
const SOCIAL = ['History', 'Geography', 'Economics', 'Civics', 'Business', 'English', 'Aptitude', 'ICT'];
const ADMIN_PASSWORD = 'muse@dawit';

async function api(path, options = {}) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export default function Page() {
  const [view, setView] = useState('home'); // home | exam | about | contact | admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [examMenuOpen, setExamMenuOpen] = useState(false);

  const [sel, setSel] = useState({
    examType: '',
    year: '',
    stream: '',
    course: '',
  });

  const [currentExam, setCurrentExam] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showSol, setShowSol] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [adminQuestions, setAdminQuestions] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [adminForm, setAdminForm] = useState({
    examType: 'entrance',
    year: '2015',
    stream: 'natural',
    course: '',
    text: '',
    A: '',
    B: '',
    C: '',
    D: '',
    correct: 'A',
    solution: '',
  });

  const courses = useMemo(() => (sel.stream === 'natural' ? NATURAL : sel.stream === 'social' ? SOCIAL : []), [sel.stream]);
  const adminCourses = useMemo(() => (adminForm.stream === 'natural' ? NATURAL : SOCIAL), [adminForm.stream]);

  const q = currentExam?.questions?.[idx];
  const total = currentExam?.questions?.length || 0;
  const correctCount = currentExam
    ? currentExam.questions.reduce((n, item) => n + (answers[item._id] === item.correct ? 1 : 0), 0)
    : 0;
  const percent = total ? Math.round((correctCount / total) * 100) : 0;
  const pass = percent >= 80;

  useEffect(() => {
    if (isAdmin) setView('admin');
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) loadAdminQuestions();
  }, [isAdmin]);

  async function loadAdminQuestions() {
    setLoadingAdmin(true);
    try {
      const rows = await api('/api/questions');
      setAdminQuestions(rows);
    } catch {
      setAdminQuestions([]);
    } finally {
      setLoadingAdmin(false);
    }
  }

  function openExamFromMenu(type) {
    setExamMenuOpen(false);
    setView('exam');
    setSel({ examType: type, year: '', stream: '', course: '' });
    setCurrentExam(null);
    setSubmitted(false);
    setShowSol(false);
  }

  async function startExam() {
    setSubmitted(false);
    setShowSol(false);
    setIdx(0);
    setAnswers({});
    try {
      const exam = await api(
        `/api/exams/find/by-filters?grade=12&examType=${encodeURIComponent(sel.examType)}&year=${encodeURIComponent(
          sel.year
        )}&stream=${encodeURIComponent(sel.stream)}&course=${encodeURIComponent(sel.course)}`
      );
      setCurrentExam(exam);
    } catch {
      setCurrentExam({ questions: [] });
    }
  }

  async function saveQuestion(e) {
    e.preventDefault();
    const payload = {
      question: {
        text: adminForm.text.trim(),
        choices: { A: adminForm.A.trim(), B: adminForm.B.trim(), C: adminForm.C.trim(), D: adminForm.D.trim() },
        correct: adminForm.correct,
        solution: adminForm.solution.trim(),
      },
    };
    try {
      if (editingId) {
        await api(`/api/questions/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await api('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grade: '12',
            examType: adminForm.examType,
            year: adminForm.year,
            stream: adminForm.stream,
            course: adminForm.course,
            question: payload.question,
          }),
        });
      }
      setEditingId('');
      setAdminForm((s) => ({ ...s, text: '', A: '', B: '', C: '', D: '', correct: 'A', solution: '' }));
      await loadAdminQuestions();
    } catch (err) {
      alert(err.message);
    }
  }

  function editQuestion(row) {
    setEditingId(row.id);
    setAdminForm({
      examType: row.examType,
      year: row.year,
      stream: row.stream,
      course: row.course,
      text: row.text,
      A: row.choices?.A || '',
      B: row.choices?.B || '',
      C: row.choices?.C || '',
      D: row.choices?.D || '',
      correct: row.correct || 'A',
      solution: row.solution || '',
    });
  }

  async function deleteQuestion(id) {
    if (!confirm('Delete this question?')) return;
    try {
      await api(`/api/questions/${id}`, { method: 'DELETE' });
      if (editingId === id) setEditingId('');
      await loadAdminQuestions();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brandTitle">Dafitech</div>
          <div className="brandSub">Grade 12 Exams Portal</div>
        </div>
        {!isAdmin && (
          <nav className="nav">
            <button onClick={() => setView('home')}>Home</button>
            <div className="menu" onMouseLeave={() => setExamMenuOpen(false)}>
              <button onClick={() => setExamMenuOpen((v) => !v)}>Exams</button>
              {examMenuOpen && (
                <div className="menuList">
                  <button onClick={() => openExamFromMenu('entrance')}>Entrance</button>
                  <button onClick={() => openExamFromMenu('remedial')}>Remedial</button>
                </div>
              )}
            </div>
            <button onClick={() => setView('about')}>About</button>
            <button onClick={() => setView('contact')}>Contact</button>
          </nav>
        )}
      </header>

      <main className="main">
        {view === 'home' && !isAdmin && (
          <section className="card">
            <h1>Grade 12 Entrance & Remedial Exams</h1>
            <p className="lead">Practice smart. Learn faster. Pass with confidence.</p>
            <div className="topics">
              <div>
                <h3>Entrance Exams</h3>
                <p>Real exam style. Year by year.</p>
              </div>
              <div>
                <h3>Remedial Exams</h3>
                <p>Fix weak topics with clear guidance.</p>
              </div>
              <div>
                <h3>Instant Feedback</h3>
                <p>See pass/fail (80%) and correct answers fast.</p>
              </div>
            </div>
          </section>
        )}

        {view === 'about' && !isAdmin && (
          <section className="card">
            <h1>About</h1>
            <p>International exam practice platform for Ethiopian Grade 12 students.</p>
          </section>
        )}

        {view === 'contact' && !isAdmin && (
          <section className="card">
            <h1>Contact</h1>
            <p>support@grade12exams.et</p>
          </section>
        )}

        {view === 'exam' && !isAdmin && (
          <section className="grid">
            <aside className="card">
              <h2>Select Exam</h2>
              <label>Exam Type</label>
              <div className="row">
                <button className={sel.examType === 'entrance' ? 'active' : ''} onClick={() => setSel({ examType: 'entrance', year: '', stream: '', course: '' })}>
                  Entrance
                </button>
                <button className={sel.examType === 'remedial' ? 'active' : ''} onClick={() => setSel({ examType: 'remedial', year: '', stream: '', course: '' })}>
                  Remedial
                </button>
              </div>
              <label>Year</label>
              <select value={sel.year} onChange={(e) => setSel((s) => ({ ...s, year: e.target.value, stream: '', course: '' }))}>
                <option value="">Select year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <label>Stream</label>
              <select value={sel.stream} onChange={(e) => setSel((s) => ({ ...s, stream: e.target.value, course: '' }))}>
                <option value="">Select stream</option>
                <option value="natural">Natural</option>
                <option value="social">Social</option>
              </select>
              <label>Course</label>
              <select value={sel.course} onChange={(e) => setSel((s) => ({ ...s, course: e.target.value }))}>
                <option value="">Select course</option>
                {courses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button disabled={!sel.examType || !sel.year || !sel.stream || !sel.course} onClick={startExam}>
                Start Exam
              </button>
            </aside>

            <article className="card examArea">
              {!currentExam && <p>Select filters and click Start Exam.</p>}
              {currentExam && currentExam.questions?.length === 0 && <p>No exam found for this combination.</p>}
              {currentExam && q && !submitted && (
                <div className="ltr">
                  <h3>
                    Question {idx + 1} / {total}
                  </h3>
                  <p className="q">{q.text}</p>
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <label key={opt} className="opt">
                      <input
                        type="radio"
                        name="ans"
                        checked={answers[q._id] === opt}
                        onChange={() => setAnswers((a) => ({ ...a, [q._id]: opt }))}
                      />
                      <b>{opt}.</b> {q.choices?.[opt]}
                    </label>
                  ))}
                  <div className="row">
                    <button onClick={() => setShowSol(true)}>Check Solution</button>
                    <button disabled={idx === 0} onClick={() => setIdx((v) => v - 1)}>
                      Previous
                    </button>
                    {idx < total - 1 ? (
                      <button onClick={() => setIdx((v) => v + 1)}>Next</button>
                    ) : (
                      <button onClick={() => setSubmitted(true)}>Submit Exam</button>
                    )}
                  </div>
                  {showSol && answers[q._id] !== q.correct && (
                    <div className="solution ltr">
                      <b>Correct: {q.correct}</b>
                      <p>{q.solution}</p>
                    </div>
                  )}
                </div>
              )}
              {currentExam && submitted && (
                <div className="ltr">
                  <h2>Result</h2>
                  <p>
                    Score: {correctCount}/{total} ({percent}%)
                  </p>
                  <p className={pass ? 'pass' : 'fail'}>{pass ? 'PASS (80% required)' : 'FAIL (80% required)'}</p>
                  {currentExam.questions.map((item, i) => {
                    const ua = answers[item._id] || 'No answer';
                    const ok = ua === item.correct;
                    return (
                      <div key={item._id} className="solution">
                        <b>
                          Q{i + 1}: {ok ? 'Correct' : 'Incorrect'} (your: {ua}, correct: {item.correct})
                        </b>
                        {!ok && <p>{item.solution}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          </section>
        )}

        {isAdmin && (
          <section className="grid">
            <aside className="card">
              <h2>Admin Dashboard</h2>
              <form onSubmit={saveQuestion} className="form">
                <label>Exam Type</label>
                <select value={adminForm.examType} onChange={(e) => setAdminForm((s) => ({ ...s, examType: e.target.value }))} disabled={!!editingId}>
                  <option value="entrance">Entrance</option>
                  <option value="remedial">Remedial</option>
                </select>
                <label>Year</label>
                <select value={adminForm.year} onChange={(e) => setAdminForm((s) => ({ ...s, year: e.target.value }))} disabled={!!editingId}>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <label>Stream</label>
                <select
                  value={adminForm.stream}
                  onChange={(e) => setAdminForm((s) => ({ ...s, stream: e.target.value, course: '' }))}
                  disabled={!!editingId}
                >
                  <option value="natural">Natural</option>
                  <option value="social">Social</option>
                </select>
                <label>Course</label>
                <select value={adminForm.course} onChange={(e) => setAdminForm((s) => ({ ...s, course: e.target.value }))} disabled={!!editingId}>
                  <option value="">Select course</option>
                  {adminCourses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <label>Question</label>
                <textarea value={adminForm.text} onChange={(e) => setAdminForm((s) => ({ ...s, text: e.target.value }))} required />
                <label>Choice A</label>
                <input value={adminForm.A} onChange={(e) => setAdminForm((s) => ({ ...s, A: e.target.value }))} required />
                <label>Choice B</label>
                <input value={adminForm.B} onChange={(e) => setAdminForm((s) => ({ ...s, B: e.target.value }))} required />
                <label>Choice C</label>
                <input value={adminForm.C} onChange={(e) => setAdminForm((s) => ({ ...s, C: e.target.value }))} required />
                <label>Choice D</label>
                <input value={adminForm.D} onChange={(e) => setAdminForm((s) => ({ ...s, D: e.target.value }))} required />
                <label>Correct</label>
                <select value={adminForm.correct} onChange={(e) => setAdminForm((s) => ({ ...s, correct: e.target.value }))}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
                <label>Solution</label>
                <textarea value={adminForm.solution} onChange={(e) => setAdminForm((s) => ({ ...s, solution: e.target.value }))} required />
                <button type="submit">{editingId ? 'Update Question' : 'Save Question'}</button>
              </form>
            </aside>
            <article className="card">
              <div className="row">
                <h3>Questions</h3>
                <button onClick={loadAdminQuestions}>Refresh</button>
              </div>
              {loadingAdmin && <p>Loading...</p>}
              {!loadingAdmin &&
                adminQuestions.map((row) => (
                  <div key={row.id} className="item ltr">
                    <p>
                      <b>{row.examType}</b> • {row.year} • {row.stream} • {row.course}
                    </p>
                    <p>{row.text}</p>
                    <div className="row">
                      <button onClick={() => editQuestion(row)}>Edit</button>
                      <button onClick={() => deleteQuestion(row.id)}>Delete</button>
                    </div>
                  </div>
                ))}
            </article>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>Designed by Dafitech</span>
        {!isAdmin && <button onClick={() => setShowAdminLogin(true)}>Admin</button>}
      </footer>

      {showAdminLogin && (
        <div className="modal">
          <div className="modalBox">
            <h3>Admin Login</h3>
            <input
              type="password"
              value={pwd}
              placeholder="Password"
              onChange={(e) => {
                setPwd(e.target.value);
                setPwdErr('');
              }}
            />
            {pwdErr && <p className="fail">{pwdErr}</p>}
            <div className="row">
              <button onClick={() => setShowAdminLogin(false)}>Cancel</button>
              <button
                onClick={() => {
                  if (pwd === ADMIN_PASSWORD) {
                    setIsAdmin(true);
                    setShowAdminLogin(false);
                    setPwd('');
                  } else {
                    setPwdErr('Invalid password');
                  }
                }}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

