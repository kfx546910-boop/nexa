export type AgentIntent =
  | 'general_question'
  | 'conversation'
  | 'explanation'
  | 'coding'
  | 'debugging'
  | 'file_analysis'
  | 'project_modification'
  | 'task_execution'
  | 'planning'
  | 'summarization'
  | 'translation'
  | 'rewriting'
  | 'brainstorming'
  | 'calculation'
  | 'tool_usage'
  | 'clarification';

export type ResponseMode = 'quick' | 'normal' | 'detailed' | 'developer' | 'creative' | 'agent';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentAnalysis {
  normalizedInput: string;
  intents: AgentIntent[];
  mode: ResponseMode;
  resolvedInput: string;
  referencedTurn?: ConversationTurn;
}

const HINGLISH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bkr(?:o|do)?\b/gi, ''],
  [/\bthik\b/gi, 'fix'],
  [/\bisko\b|\bisko bhi\b/gi, 'this'],
  [/\bisko\b/gi, 'this'],
  [/\bmera project\b/gi, 'my project'],
  [/\bbatao\b/gi, 'tell me'],
  [/\bsamjha(?:o)?\b/gi, 'explain'],
  [/\bsearch karke\b/gi, 'search and'],
  [/\badd kar(?:o)?\b/gi, 'add'],
  [/\bban(?:a|ao)\b/gi, 'build']
];

function normalize(text: string): string {
  let normalized = text.normalize('NFKC').replace(/\s+/g, ' ').trim();
  for (const [pattern, replacement] of HINGLISH_REPLACEMENTS) normalized = normalized.replace(pattern, replacement);
  return normalized.replace(/\s+/g, ' ').trim();
}

function hasAny(input: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(input));
}

export function analyzeConversation(input: string, history: ConversationTurn[] = []): AgentAnalysis {
  const normalizedInput = normalize(input);
  const lower = normalizedInput.toLowerCase();
  const intents: AgentIntent[] = [];

  if (hasAny(lower, [/\b(fix|debug|error|bug|broken|issue|not working)\b/i])) intents.push('debugging');
  if (hasAny(lower, [/\b(code|function|component|typescript|javascript|react|css|api)\b/i])) intents.push('coding');
  if (hasAny(lower, [/\b(project|app|application|feature|integrate|add|implement|update)\b/i])) intents.push('project_modification');
  if (hasAny(lower, [/\b(explain|why|how does|meaning|samjha)\b/i])) intents.push('explanation');
  if (hasAny(lower, [/\b(summarize|summary|short me|brief)\b/i])) intents.push('summarization');
  if (hasAny(lower, [/\b(translate|translation|in hindi|in english)\b/i])) intents.push('translation');
  if (hasAny(lower, [/\b(plan|steps|roadmap|build me|create|make|banao)\b/i])) intents.push('planning');
  if (hasAny(lower, [/\b(search|latest|find|look up|research)\b/i])) intents.push('tool_usage');
  if (hasAny(lower, [/\b(idea|ideas|brainstorm|suggest)\b/i])) intents.push('brainstorming');
  if (hasAny(lower, [/\b\d+\s*[+\-*/x]\s*\d+\b/i])) intents.push('calculation');
  if (hasAny(lower, [/\b(haan|yes|okay|same|that one|this|it|wahi|upar wala|previous)\b/i]) && history.length > 0) intents.push('clarification');
  if (intents.length === 0) intents.push(/\?|what|why|how|kya|kaise/i.test(lower) ? 'general_question' : 'conversation');

  const referencedTurn = history.filter(turn => turn.role === 'user').at(-1);
  const isReferenceOnly = /^(haan|yes|same|that one|this|it|haan wahi wala|wahi wala|upar wala|previous one|isko bhi)$/i.test(lower);
  const resolvedInput = isReferenceOnly && referencedTurn
    ? `${normalizedInput}. Continue the previous request: ${referencedTurn.content}`
    : normalizedInput;

  const mode: ResponseMode = /\b(short|quick|brief|short me)\b/i.test(lower)
    ? 'quick'
    : /\b(step by step|detail|detailed|deep)\b/i.test(lower)
      ? 'detailed'
      : intents.includes('coding') || intents.includes('debugging')
        ? 'developer'
        : intents.includes('task_execution') || intents.includes('project_modification')
          ? 'agent'
          : 'normal';

  return { normalizedInput, intents, mode, resolvedInput, referencedTurn };
}

export function buildAgentContext(analysis: AgentAnalysis, history: ConversationTurn[], maxTurns = 8): string {
  const recent = history.slice(-maxTurns);
  const context = recent.map(turn => `${turn.role === 'user' ? 'User' : 'NEXA'}: ${turn.content}`).join('\n');
  return [
    `Intent: ${analysis.intents.join(', ')}`,
    `Response mode: ${analysis.mode}`,
    context ? `Recent conversation:\n${context}` : ''
  ].filter(Boolean).join('\n');
}
