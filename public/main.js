/* eslint-disable no-console */
// Ethiopian Grade 12 Exams Frontend
// Uses MongoDB-backed API endpoints from the Express server.

const API_BASE = '/api';
const ADMIN_PASSWORD = 'muse@dawit';

// Courses per stream (Natural/Social majors)
const naturalCourses = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Aptitude',
  'Technical Drawing',
  'ICT',
];

const socialCourses = [
  'History',
  'Geography',
  'Economics',
  'Civics',
  'Business',
  'English',
  'Aptitude',
  'ICT',
];

const yearsAvailable = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029'];

function qs(id) {
  return document.getElementById(id);
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && data.error ? data.error : `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && data.error ? data.error : `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && data.error ? data.error : `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && data.error ? data.error : `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

function typesetMath(el) {
  if (!el) return;
  const tryTypeset = (attemptsLeft) => {
    try {
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([el]).catch((err) => console.error('MathJax:', err));
        return;
      }
      if (window.MathJax && window.MathJax.Hub && window.MathJax.Hub.Queue) {
        window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub, el]);
        return;
      }
    } catch (e) {
      console.error('MathJax typeset error:', e);
    }
    if (attemptsLeft > 0) setTimeout(() => tryTypeset(attemptsLeft - 1), 150);
  };
  tryTypeset(10);
}

const state = {
  grade: '12',
  examType: null, // 'entrance' | 'remedial'
  year: null,
  stream: null, // 'natural' | 'social'
  course: null,
};

let currentExam = null;
let currentIndex = 0;
let currentAnswers = {}; // key: question._id, value: 'A'|'B'|'C'|'D'
let showSolutionForIndex = null;

// App init (runs after DOM loads)
function initializeApp() {
  const views = {
    home: qs('view-home'),
    exam: qs('view-exam'),
    admin: qs('view-admin'),
    about: qs('view-about'),
    contact: qs('view-contact'),
  };

  // Navigation
  const navButtons = document.querySelectorAll('.nav-link[data-view]');
  const heroButtons = document.querySelectorAll('[data-view-switch]');

  const dropdownItems = document.querySelectorAll('.dropdown-item[data-exam-type]');

  const closeAllViews = () => {
    Object.values(views).forEach((v) => {
      if (v) v.classList.remove('active');
    });
  };

  let isAdminAuthed = false;
  const adminLoginModal = qs('admin-login-modal');
  const adminPasswordInput = qs('admin-password-input');
  const adminLoginCancel = qs('admin-login-cancel');
  const adminLoginSubmit = qs('admin-login-submit');
  const adminLoginError = qs('admin-login-error');

  const openAdmin = () => {
    if (isAdminAuthed) {
      closeAllViews();
      views.admin && views.admin.classList.add('active');
      return;
    }
    if (adminLoginModal) adminLoginModal.classList.remove('hidden');
    if (adminPasswordInput) adminPasswordInput.value = '';
    if (adminLoginError) adminLoginError.textContent = '';
    if (adminPasswordInput) adminPasswordInput.focus();
  };

  const closeAdminModal = () => {
    adminLoginModal && adminLoginModal.classList.add('hidden');
  };

  const setActiveView = (name) => {
    // Once admin is logged in, only allow the admin dashboard UI.
    if (isAdminAuthed && name !== 'admin') {
      closeAllViews();
      views.admin && views.admin.classList.add('active');
      return;
    }
    if (name === 'admin') {
      openAdmin();
      return;
    }
    closeAllViews();
    if (views[name]) views[name].classList.add('active');
  };

  // Exams dropdown hover/click items
  dropdownItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const examType = item.dataset.examType;
      state.examType = examType || null;
      // Reset dependent selections
      state.year = null;
      state.stream = null;
      state.course = null;

      syncExamTypeUI();
      renderYearRow();
      renderStreamRow();
      renderCourseRow();
      updateSelectionSummary();
      updateStartButtonState();
      setActiveView('exam');
    });
  });

  // Top nav buttons
  navButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const view = btn.dataset.view;
      if (view) setActiveView(view);
    });
  });

  // Hero buttons
  heroButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const view = btn.dataset.viewSwitch;
      if (view === 'admin') openAdmin();
      else if (view === 'exam') setActiveView('exam');
    });
  });

  // Footer admin button opens login
  const adminFooterBtn = qs('admin-footer-btn');
  adminFooterBtn &&
    adminFooterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openAdmin();
    });

  adminLoginCancel &&
    adminLoginCancel.addEventListener('click', () => {
      closeAdminModal();
    });

  adminLoginSubmit &&
    adminLoginSubmit.addEventListener('click', () => {
      const value = adminPasswordInput && adminPasswordInput.value ? adminPasswordInput.value : '';
      if (value === ADMIN_PASSWORD) {
        isAdminAuthed = true;
        closeAdminModal();
          document.body.classList.add('admin-mode');
        // Open admin view
        closeAllViews();
        views.admin && views.admin.classList.add('active');
      } else {
        adminLoginError && (adminLoginError.textContent = 'Incorrect password. Please try again.');
      }
    });

  adminPasswordInput &&
    adminPasswordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        adminLoginSubmit && adminLoginSubmit.click();
      }
    });

  // Exam selection UI
  const yearRow = qs('year-row');
  const examTypeRow = qs('exam-type-row');
  const streamRow = qs('stream-row');
  const courseRow = qs('course-row');
  const startExamBtn = qs('start-exam-btn');
  const selectionSummary = qs('selection-summary');
  const examContainer = qs('exam-container');

  const updateStartButtonState = () => {
    const ready = state.examType && state.year && state.stream && state.course;
    if (startExamBtn) startExamBtn.disabled = !ready;
  };

  const updateSelectionSummary = () => {
    if (!selectionSummary) return;
    if (!state.examType) {
      selectionSummary.textContent = 'Choose exam type to begin.';
      return;
    }
    const parts = [
      `Grade ${state.grade}`,
      state.examType === 'entrance' ? 'Entrance' : 'Remedial',
      state.year ? `Year ${state.year}` : null,
      state.stream ? (state.stream === 'natural' ? 'Natural Stream' : 'Social Stream') : null,
      state.course ? `Course: ${state.course}` : null,
    ].filter(Boolean);
    selectionSummary.textContent = parts.join(' • ');
  };

  function renderPillRow(container, items, key) {
    if (!container) return;
    container.innerHTML = '';
    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.className = 'pill';
      btn.type = 'button';
      btn.textContent = item.label;
      btn.dataset[key] = item.value;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Mark selected
        container.querySelectorAll('.pill').forEach((p) => p.classList.remove('pill-selected'));
        btn.classList.add('pill-selected');
        state[key] = item.value;

        if (key === 'examType') {
          state.year = null;
          state.stream = null;
          state.course = null;
          renderYearRow();
          renderStreamRow();
          renderCourseRow();
        }
        if (key === 'year') {
          state.stream = null;
          state.course = null;
          renderStreamRow();
          renderCourseRow();
        }
        if (key === 'stream') {
          state.course = null;
          renderCourseRow();
        }

        syncExamTypeUI();
        updateSelectionSummary();
        updateStartButtonState();
      });

      // Preselect
      if (state[key] && state[key] === item.value) btn.classList.add('pill-selected');
      container.appendChild(btn);
    });
  }

  function renderYearRow() {
    if (!examTypeRow || !yearRow) return;
    if (!state.examType) {
      yearRow.innerHTML = '';
      return;
    }
    renderPillRow(
      yearRow,
      yearsAvailable.map((y) => ({ label: y, value: y })),
      'year'
    );
  }

  function renderStreamRow() {
    if (!streamRow) return;
    if (!state.year) {
      streamRow.innerHTML = '';
      return;
    }
    renderPillRow(
      streamRow,
      [
        { label: 'Natural', value: 'natural' },
        { label: 'Social', value: 'social' },
      ],
      'stream'
    );
  }

  function renderCourseRow() {
    if (!courseRow) return;
    courseRow.innerHTML = '';
    if (!state.stream) return;

    const select = document.createElement('select');
    select.id = 'course-select';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select course';
    placeholder.disabled = true;
    placeholder.selected = !state.course;
    select.appendChild(placeholder);

    const courses = state.stream === 'natural' ? naturalCourses : socialCourses;
    courses.forEach((course) => {
      const opt = document.createElement('option');
      opt.value = course;
      opt.textContent = course;
      if (state.course && state.course === course) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      state.course = e.target.value || null;
      updateSelectionSummary();
      updateStartButtonState();
    });

    courseRow.appendChild(select);
  }

  function syncExamTypeUI() {
    if (!examTypeRow) return;
    examTypeRow.querySelectorAll('.pill').forEach((p) => {
      const type = p.dataset.examType;
      p.classList.toggle('pill-selected', state.examType === type);
    });
  }

  // Bind exam-type pills (Entrance/Remedial) from HTML
  if (examTypeRow) {
    examTypeRow.querySelectorAll('.pill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const type = btn.dataset.examType;
        if (!type) return;
        state.examType = type;
        state.year = null;
        state.stream = null;
        state.course = null;
        syncExamTypeUI();
        renderYearRow();
        renderStreamRow();
        renderCourseRow();
        updateSelectionSummary();
        updateStartButtonState();
      });
    });
  }

  function initialExamUI() {
    renderYearRow();
    renderStreamRow();
    renderCourseRow();
    updateSelectionSummary();
    updateStartButtonState();
  }

  // Start exam
  startExamBtn &&
    startExamBtn.addEventListener('click', async () => {
      if (!state.examType || !state.year || !state.stream || !state.course) return;

      if (startExamBtn) {
        startExamBtn.disabled = true;
        startExamBtn.textContent = 'Loading...';
      }

      try {
        const exam = await apiGet(
          `/exams/find/by-filters?grade=${encodeURIComponent(state.grade)}&examType=${encodeURIComponent(
            state.examType
          )}&year=${encodeURIComponent(state.year)}&stream=${encodeURIComponent(state.stream)}&course=${encodeURIComponent(
            state.course
          )}`
        );
        currentExam = exam;
        currentIndex = 0;
        currentAnswers = {};
        showSolutionForIndex = null;
        renderExamQuestion();
      } catch (err) {
        examContainer.innerHTML = `
          <h2>No exam found</h2>
          <p>Please create questions for this combination in the Admin dashboard.</p>
        `;
        examContainer.classList.add('empty-state');
      } finally {
        if (startExamBtn) {
          startExamBtn.disabled = false;
          startExamBtn.textContent = 'Start Exam';
        }
      }
    });

  function renderExamQuestion() {
    if (!currentExam) return;
    const q = currentExam.questions[currentIndex];

    examContainer.classList.remove('empty-state');
    examContainer.innerHTML = '';

    const total = currentExam.questions.length;
    const selectedAnswer = currentAnswers[q._id] || null;

    const container = document.createElement('div');

    const header = document.createElement('div');
    header.className = 'question-header';
    const left = document.createElement('div');
    left.innerHTML = `<span class="question-progress">Question ${currentIndex + 1} of ${total}</span>`;
    const right = document.createElement('div');
    right.innerHTML = `<span class="badge">${
      currentExam.examType === 'entrance' ? 'Entrance' : 'Remedial'
    } • ${currentExam.year} • ${
      currentExam.stream === 'natural' ? 'Natural' : 'Social'
    } • ${currentExam.course}</span>`;

    header.appendChild(left);
    header.appendChild(right);

    const qtWrap = document.createElement('div');
    qtWrap.className = 'question-body';
    const qt = document.createElement('div');
    qt.className = 'question-text';
    qt.innerHTML = q.text;
    qtWrap.appendChild(qt);

    const choicesEl = document.createElement('div');
    choicesEl.className = 'choices';

    ['A', 'B', 'C', 'D'].forEach((label) => {
      const choiceLabel = document.createElement('label');
      choiceLabel.className = 'choice';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'choice';
      radio.value = label;
      radio.checked = selectedAnswer === label;

      radio.addEventListener('change', () => {
        currentAnswers[q._id] = label;
      });

      const labelSpan = document.createElement('span');
      labelSpan.className = 'choice-label';
      labelSpan.textContent = `${label}.`;

      const textSpan = document.createElement('span');
      textSpan.innerHTML = q.choices[label];

      choiceLabel.appendChild(radio);
      choiceLabel.appendChild(labelSpan);
      choiceLabel.appendChild(textSpan);
      choicesEl.appendChild(choiceLabel);
    });

    const actions = document.createElement('div');
    actions.className = 'exam-actions';

    const leftActions = document.createElement('div');
    const statusBadge = document.createElement('span');
    statusBadge.className = 'badge';

    if (!selectedAnswer) {
      statusBadge.textContent = 'No answer selected';
    } else if (selectedAnswer === q.correct) {
      statusBadge.textContent = 'Correct';
      statusBadge.classList.add('badge-success');
    } else {
      statusBadge.textContent = `Incorrect (your answer: ${selectedAnswer})`;
      statusBadge.classList.add('badge-error');
    }
    leftActions.appendChild(statusBadge);

    const rightActions = document.createElement('div');
    rightActions.className = 'exam-actions-right';

    const checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = 'secondary small';
    checkBtn.textContent = 'Check Solution';
    checkBtn.addEventListener('click', () => {
      showSolutionForIndex = currentIndex;
      renderExamQuestion();
    });

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'secondary small';
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentIndex === 0;
    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        showSolutionForIndex = null;
        renderExamQuestion();
      }
    });

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'primary small';
    nextBtn.textContent = currentIndex === total - 1 ? 'Submit Exam' : 'Next';
    nextBtn.addEventListener('click', () => {
      if (currentIndex < total - 1) {
        currentIndex += 1;
        showSolutionForIndex = null;
        renderExamQuestion();
      } else {
        showExamSummary();
      }
    });

    rightActions.appendChild(checkBtn);
    rightActions.appendChild(prevBtn);
    rightActions.appendChild(nextBtn);

    actions.appendChild(leftActions);
    actions.appendChild(rightActions);

    container.appendChild(header);
    container.appendChild(qtWrap);
    container.appendChild(choicesEl);
    container.appendChild(actions);

    // Solution box only when student clicked "Check Solution" and is wrong/unanswered
    if (showSolutionForIndex === currentIndex) {
      const isCorrect = selectedAnswer && selectedAnswer === q.correct;
      if (!isCorrect) {
        const solBox = document.createElement('div');
        solBox.className = 'solution-box';
        const title = document.createElement('div');
        title.className = 'solution-title';
        title.textContent = `Solution (Correct answer: ${q.correct})`;
        const text = document.createElement('div');
        text.className = 'solution-text';
        text.innerHTML = q.solution;
        solBox.appendChild(title);
        solBox.appendChild(text);
        container.appendChild(solBox);
        typesetMath(solBox);
      }
    }

    examContainer.appendChild(container);
    typesetMath(container);
  }

  function showExamSummary() {
    if (!currentExam) return;

    const total = currentExam.questions.length;
    let correctCount = 0;

    currentExam.questions.forEach((q) => {
      if (currentAnswers[q._id] === q.correct) correctCount += 1;
    });

    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const PASS_PERCENT = 80;
    const didPass = percent >= PASS_PERCENT;

    examContainer.classList.remove('empty-state');
    examContainer.innerHTML = '';

    const container = document.createElement('div');

    const title = document.createElement('h2');
    title.textContent = 'Exam Summary';

    const score = document.createElement('p');
    score.textContent = `You answered ${correctCount} out of ${total} questions correctly (${percent}%).`;

    const passBadge = document.createElement('div');
    passBadge.style.marginBottom = '10px';
    passBadge.style.fontWeight = '700';
    passBadge.style.fontSize = '14px';
    passBadge.style.padding = '8px 10px';
    passBadge.style.borderRadius = '12px';
    passBadge.style.border = `1px solid ${didPass ? 'rgba(34, 197, 94, 0.7)' : 'rgba(248, 113, 113, 0.7)'}`;
    passBadge.style.color = didPass ? '#bbf7d0' : '#fecaca';
    passBadge.style.background = didPass
      ? 'rgba(22, 101, 52, 0.35)'
      : 'rgba(127, 29, 29, 0.35)';
    passBadge.textContent = didPass ? `PASS (Need ${PASS_PERCENT}%)` : `FAIL (Need ${PASS_PERCENT}%)`;

    const list = document.createElement('div');
    list.style.marginTop = '10px';

    currentExam.questions.forEach((q, idx) => {
      const block = document.createElement('div');
      block.className = 'solution-box';
      block.style.marginBottom = '8px';

      const header = document.createElement('div');
      header.className = 'solution-title';
      const userAnswer = currentAnswers[q._id] || 'No answer';
      const isCorrect = userAnswer === q.correct;
      header.textContent = `Q${idx + 1}: ${
        isCorrect ? 'Correct' : 'Incorrect'
      } (your answer: ${userAnswer}, correct: ${q.correct})`;

      const text = document.createElement('div');
      if (!isCorrect) {
        text.innerHTML = q.solution;
        typesetMath(block);
      } else {
        text.textContent = 'You answered this question correctly.';
      }

      block.appendChild(header);
      block.appendChild(text);
      list.appendChild(block);
    });

    const restart = document.createElement('button');
    restart.type = 'button';
    restart.className = 'primary';
    restart.textContent = 'Retake Exam';
    restart.style.marginTop = '10px';
    restart.addEventListener('click', () => {
      currentIndex = 0;
      showSolutionForIndex = null;
      currentAnswers = {};
      renderExamQuestion();
    });

    container.appendChild(title);
    container.appendChild(score);
    container.appendChild(passBadge);
    container.appendChild(list);
    container.appendChild(restart);

    examContainer.appendChild(container);
    typesetMath(container);
  }

  // Admin dashboard
  const adminForm = qs('admin-form');
  const adminExamType = qs('admin-exam-type');
  const adminYear = qs('admin-year');
  const adminStream = qs('admin-stream');
  const adminCourse = qs('admin-course');
  const adminQuestion = qs('admin-question');
  const adminChoiceA = qs('admin-choice-a');
  const adminChoiceB = qs('admin-choice-b');
  const adminChoiceC = qs('admin-choice-c');
  const adminChoiceD = qs('admin-choice-d');
  const adminCorrect = qs('admin-correct-answer');
  const adminSolution = qs('admin-solution');
  const adminList = qs('admin-question-list');
  const adminRefreshBtn = qs('admin-refresh');

  let editingQuestionId = null;
  const submitBtn = adminForm ? adminForm.querySelector('button[type="submit"]') : null;

  function setMetaEnabled(enabled) {
    if (!adminExamType || !adminYear || !adminStream || !adminCourse) return;
    adminExamType.disabled = !enabled;
    adminYear.disabled = !enabled;
    adminStream.disabled = !enabled;
    adminCourse.disabled = !enabled;
  }

  function ensureCourseOption(courseName) {
    if (!adminCourse || !courseName) return;
    const exists = Array.from(adminCourse.options).some((o) => o.value === courseName);
    if (exists) return;
    const opt = document.createElement('option');
    opt.value = courseName;
    opt.textContent = courseName;
    adminCourse.appendChild(opt);
  }

  function loadQuestionIntoForm(q) {
    editingQuestionId = q.id;

    // Disable meta selectors to avoid mismatch (edit stays in same exam doc)
    setMetaEnabled(false);

    adminExamType.value = q.examType;
    adminYear.value = q.year;
    adminStream.value = q.stream;

    populateAdminCourseOptions();
    ensureCourseOption(q.course);
    adminCourse.value = q.course;

    adminQuestion.value = q.text || '';
    adminChoiceA.value = q.choices?.A || '';
    adminChoiceB.value = q.choices?.B || '';
    adminChoiceC.value = q.choices?.C || '';
    adminChoiceD.value = q.choices?.D || '';
    adminCorrect.value = q.correct || 'A';
    adminSolution.value = q.solution || '';

    if (submitBtn) submitBtn.textContent = '📝 Update Question';

    // Scroll form into view
    adminQuestion && adminQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function resetEditMode() {
    editingQuestionId = null;
    setMetaEnabled(true);
    if (submitBtn) submitBtn.textContent = '💾 Save Question';

    adminQuestion.value = '';
    adminChoiceA.value = '';
    adminChoiceB.value = '';
    adminChoiceC.value = '';
    adminChoiceD.value = '';
    adminCorrect.value = 'A';
    adminSolution.value = '';
  }

  function populateAdminCourseOptions() {
    if (!adminCourse || !adminStream) return;
    const stream = adminStream.value || 'natural';
    const courses = stream === 'natural' ? naturalCourses : socialCourses;

    const currentValue = adminCourse.value;
    adminCourse.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select course';
    placeholder.disabled = true;
    placeholder.selected = !currentValue;
    adminCourse.appendChild(placeholder);

    courses.forEach((course) => {
      const opt = document.createElement('option');
      opt.value = course;
      opt.textContent = course;
      if (currentValue && currentValue === course) opt.selected = true;
      adminCourse.appendChild(opt);
    });
  }

  // Create a simple render of existing questions for the admin
  async function renderAdminList() {
    if (!adminList) return;
    adminList.innerHTML = '<p class="helper-text">Loading questions...</p>';
    try {
      const questions = await apiGet('/questions');
      if (!questions || questions.length === 0) {
        adminList.innerHTML = '<p class="helper-text">No questions yet. Add your first question using the form.</p>';
        return;
      }

      adminList.innerHTML = '';
      questions.forEach((q) => {
        const item = document.createElement('div');
        item.className = 'admin-question-item';

        const meta = document.createElement('div');
        meta.className = 'admin-question-meta';
        meta.innerHTML = `
          <span class="badge">${q.examType === 'entrance' ? 'Entrance' : 'Remedial'}</span>
          <span class="badge">Year ${q.year}</span>
          <span class="badge">${q.stream === 'natural' ? 'Natural' : 'Social'}</span>
          <span class="badge">${q.course}</span>
        `;

        const text = document.createElement('div');
        text.className = 'admin-question-text';
        text.textContent = q.text;

        item.appendChild(meta);
        item.appendChild(text);

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.marginTop = '8px';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'secondary small';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => loadQuestionIntoForm(q));

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'secondary small';
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.borderColor = 'rgba(248, 113, 113, 0.7)';
        deleteBtn.style.color = '#fecaca';
        deleteBtn.addEventListener('click', async () => {
          const ok = window.confirm('Delete this question?');
          if (!ok) return;
          try {
            await apiDelete(`/questions/${q.id}`);
            if (editingQuestionId === q.id) resetEditMode();
            await renderAdminList();
          } catch (err) {
            alert(`Delete failed: ${err.message}`);
          }
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(actions);

        adminList.appendChild(item);
      });
    } catch (err) {
      adminList.innerHTML = `<p class="helper-text" style="color:#f87171;">Error loading questions: ${err.message}</p>`;
    }
  }

  adminStream &&
    adminStream.addEventListener('change', () => {
      // Changing stream updates course dropdown
      populateAdminCourseOptions();
    });

  // Submit question
  adminForm &&
    adminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!adminCourse || !adminCourse.value) {
        alert('Please select course.');
        return;
      }

      const meta = {
        grade: '12',
        examType: adminExamType.value,
        year: adminYear.value,
        stream: adminStream.value,
        course: adminCourse.value,
      };

      const question = {
        text: adminQuestion.value.trim(),
        choices: {
          A: adminChoiceA.value.trim(),
          B: adminChoiceB.value.trim(),
          C: adminChoiceC.value.trim(),
          D: adminChoiceD.value.trim(),
        },
        correct: adminCorrect.value,
        solution: adminSolution.value.trim(),
      };

      if (!question.text) return alert('Please enter a question.');
      if (!question.solution) return alert('Please enter a detailed solution.');
      if (!question.choices.A || !question.choices.B || !question.choices.C || !question.choices.D) {
        return alert('Please fill choices A-D.');
      }

      try {
        if (editingQuestionId) {
          await apiPut(`/questions/${editingQuestionId}`, { question });
          alert('Question updated successfully.');
        } else {
          await apiPost('/questions', {
            grade: meta.grade,
            examType: meta.examType,
            year: meta.year,
            stream: meta.stream,
            course: meta.course,
            question,
          });
          alert('Question saved successfully.');
        }

        resetEditMode();
        await renderAdminList();
      } catch (err) {
        alert(`Error saving question: ${err.message}`);
      }
    });

  adminRefreshBtn &&
    adminRefreshBtn.addEventListener('click', async () => {
      await renderAdminList();
    });

  // Init UI
  initialExamUI();
  populateAdminCourseOptions();
  renderAdminList();
  updateSelectionSummary();
  updateStartButtonState();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Dafitech advert interactivity (mouse parallax glow)
function setupDafitechAdvert() {
  const advert = document.getElementById('dafitech-advert');
  const glow = document.querySelector('.dafitech-glow');
  const orbit = document.getElementById('dafitech-orbit');
  if (!advert) return;

  let rafId = null;
  const state = { x: 50, y: 50 };

  const update = () => {
    rafId = null;
    advert.style.setProperty('--mx', String(state.x));
    advert.style.setProperty('--my', String(state.y));
    if (glow) {
      glow.style.setProperty('--gx', `${state.x}%`);
      glow.style.setProperty('--gy', `${state.y}%`);
    }
    if (orbit) {
      orbit.style.setProperty('--mx', String(state.x));
      orbit.style.setProperty('--my', String(state.y));
    }
  };

  advert.addEventListener('mousemove', (e) => {
    const rect = advert.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    state.x = Math.max(0, Math.min(100, x));
    state.y = Math.max(0, Math.min(100, y));
    if (!rafId) rafId = requestAnimationFrame(update);
  });

  advert.addEventListener('mouseleave', () => {
    state.x = 50;
    state.y = 50;
    update();
  });
}

// Ensure advert interactivity is set up
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDafitechAdvert);
} else {
  setupDafitechAdvert();
}

