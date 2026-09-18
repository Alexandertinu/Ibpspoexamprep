function positiveInteger(value, label, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > max) throw new Error(`${label} must be between 1 and ${max}.`);
  return number;
}

function testLevel(value) {
  return ['Prelims', 'Mains', 'Practice'].includes(value) ? value : 'Practice';
}

function questionTypes(value) {
  if (value === 'both') return ['mcq', 'descriptive'];
  return [value === 'descriptive' ? 'descriptive' : 'mcq'];
}

export function matchingMockQuestions(bank, { subject = '', topics = [], type = 'mcq', query = '' } = {}) {
  const allowedTypes = questionTypes(type);
  const selectedTopics = new Set(topics);
  const search = String(query).trim().toLowerCase();
  return bank.filter((question) => {
    if (subject && question.subject !== subject) return false;
    if (selectedTopics.size && !selectedTopics.has(question.topic)) return false;
    if (!allowedTypes.includes(question.type || 'mcq')) return false;
    if (search && !`${question.question} ${question.topic} ${question.subject}`.toLowerCase().includes(search)) return false;
    return true;
  });
}

export function buildRandomMockConfig({ title, subject, topics, type, count, durationMinutes, level, shuffle = true }, bank) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new Error('Enter a test name.');
  if (!String(subject || '').trim()) throw new Error('Choose a subject.');
  if (!Array.isArray(topics) || !topics.length) throw new Error('Choose at least one chapter.');
  const pool = matchingMockQuestions(bank, { subject, topics, type });
  if (!pool.length) throw new Error('No questions match those chapters.');
  const questionCount = positiveInteger(count, 'Question count', pool.length);
  return {
    title: cleanTitle.slice(0, 120),
    level: testLevel(level),
    description: `Random practice from ${topics.length} selected chapter${topics.length === 1 ? '' : 's'}.`,
    subjects: [subject],
    topics: [...topics],
    types: questionTypes(type),
    count: questionCount,
    durationMinutes: positiveInteger(durationMinutes, 'Duration', 600),
    selectionStrategy: 'random',
    shuffle: Boolean(shuffle),
  };
}

export function buildSelectedMockConfig({ title, questionIds, durationMinutes, level, shuffle = true }, bank) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new Error('Enter a test name.');
  const availableIds = new Set(bank.map((question) => question.id));
  const uniqueIds = [...new Set(Array.isArray(questionIds) ? questionIds : [])].filter((id) => availableIds.has(id));
  if (!uniqueIds.length) throw new Error('Select at least one question.');
  const selected = bank.filter((question) => uniqueIds.includes(question.id));
  return {
    title: cleanTitle.slice(0, 120),
    level: testLevel(level),
    description: `Created from ${uniqueIds.length} questions you selected.`,
    questionIds: uniqueIds,
    subjects: [...new Set(selected.map((question) => question.subject))],
    topics: [...new Set(selected.map((question) => question.topic))],
    types: [...new Set(selected.map((question) => question.type || 'mcq'))],
    count: uniqueIds.length,
    durationMinutes: positiveInteger(durationMinutes, 'Duration', 600),
    shuffle: Boolean(shuffle),
  };
}
