function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function questionsForTest(test, bank = []) {
  if (Array.isArray(test.questionIds)) {
    const byId = new Map(bank.map((question) => [question.id, question]));
    return unique(test.questionIds).map((id) => byId.get(id)).filter(Boolean);
  }
  return bank.filter((question) =>
    (!test.subjects?.length || test.subjects.includes(question.subject))
    && (!test.topics?.length || test.topics.includes(question.topic))
    && (!test.types?.length || test.types.includes(question.type || 'mcq'))
  );
}

export function subjectsForTest(test, bank) {
  const subjects = unique(test.subjects?.length ? test.subjects : questionsForTest(test, bank).map((question) => question.subject));
  return subjects.length === 1 ? subjects : ['Mixed Practice'];
}

export function inferTestLevel(test) {
  const explicit = String(test.level || test.examStage || '').trim().toLowerCase();
  if (explicit === 'prelims') return 'Prelims';
  if (explicit === 'mains') return 'Mains';
  if (explicit === 'practice') return 'Practice';
  const text = `${test.title || ''} ${test.description || ''} ${(test.types || []).join(' ')}`.toLowerCase();
  if (/\bmains?\b|descriptive/.test(text)) return 'Mains';
  if (/\bprelims?\b|preliminary/.test(text)) return 'Prelims';
  return 'Practice';
}

export function testProgress(test, attempts, tests = []) {
  const hasId = (id) => id !== undefined && id !== null && String(id).trim() !== '';
  const sameTitle = tests.filter((item) => item.title === test.title);
  const allowLegacyTitle = Boolean(test.title) && (!hasId(test.id)
    || (sameTitle.length === 1 && sameTitle[0].id === test.id));
  const completed = (Array.isArray(attempts) ? attempts : [])
    .filter((attempt) => {
      if (!attempt || attempt.isTestRun) return false;
      // An explicit ID is authoritative. Only unambiguous legacy attempts may use titles.
      if (hasId(attempt.testId)) return hasId(test.id) && attempt.testId === test.id;
      return allowLegacyTitle && attempt.title === test.title;
    })
    .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
  return {
    solved: completed.length > 0,
    attempts: completed.length,
    latest: completed[0] || null,
    bestAccuracy: completed.length ? Math.max(...completed.map((attempt) => Number(attempt.analytics?.accuracy || 0))) : 0,
  };
}

export function buildSubjectLibrary(tests = [], bank = [], attempts = [], customSubjects = []) {
  const map = new Map();
  unique([...(bank || []).map((question) => question.subject), ...customSubjects.map((subject) => String(subject || '').trim())]).forEach((subject) => map.set(subject, { subject, tests: [], questionIds: new Set((bank || []).filter((question) => question.subject === subject).map((question) => question.id)), solvedCount: 0, untouchedCount: 0 }));
  (tests || []).forEach((test) => {
    subjectsForTest(test, bank).forEach((subject) => {
      if (!map.has(subject)) map.set(subject, { subject, tests: [], questionIds: new Set(), solvedCount: 0, untouchedCount: 0 });
      const entry = map.get(subject);
      const progress = testProgress(test, attempts, tests);
      entry.tests.push({ test, level: inferTestLevel(test), progress });
      questionsForTest(test, bank).forEach((question) => entry.questionIds.add(question.id));
      if (progress.solved) entry.solvedCount += 1; else entry.untouchedCount += 1;
    });
  });
  const preferred = ['Reasoning Ability', 'Quantitative Aptitude', 'English Language', 'General Awareness', 'Mixed Practice'];
  return [...map.values()].map(({ questionIds, ...entry }) => ({ ...entry, questionCount: questionIds.size })).sort((a, b) => {
    const ai = preferred.indexOf(a.subject), bi = preferred.indexOf(b.subject);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    return a.subject.localeCompare(b.subject);
  });
}
