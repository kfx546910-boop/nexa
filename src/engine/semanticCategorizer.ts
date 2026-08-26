import { TrainingPair } from '../types/nexus';

export type SupportedCategory = 'core' | 'coding' | 'reasoning' | 'chat' | 'productivity' | 'custom';

export interface SemanticAnalysisResult {
  category: SupportedCategory;
  confidence: number; // 0 to 1
  categoryScores: Record<SupportedCategory, number>;
  intent: string;
  suggestedTags: string[];
  rationale: string;
  detectedKeywords: string[];
}

// Domain keywords and semantic patterns
const DOMAIN_PATTERNS = {
  coding: {
    keywords: [
      'function', 'const', 'let', 'var', 'import', 'export', 'class', 'interface', 'type',
      'async', 'await', 'promise', 'return', 'typescript', 'javascript', 'python', 'def',
      'self', 'rust', 'c++', 'golang', 'java', 'html', 'css', 'react', 'tailwind', 'sql',
      'select', 'from', 'where', 'join', 'database', 'api', 'endpoint', 'rest', 'graphql',
      'json', 'props', 'state', 'hook', 'component', 'algorithm', 'binary search', 'tree',
      'recursion', 'stack', 'queue', 'big-o', 'refactor', 'debug', 'syntax', 'error', 'git',
      'commit', 'docker', 'npm', 'package', 'middleware', 'express', 'regex', 'regexp',
      'array', 'object', 'dictionary', 'list', 'map', 'filter', 'reduce', 'loop', 'while',
      'for', 'class', 'method', 'struct', 'enum', 'pointer', 'memory leak', 'null', 'undefined'
    ],
    patterns: [
      /```[\s\S]*?```/i,
      /function\s+\w+\s*\(|const\s+\w+\s*=|def\s+\w+\s*\(|class\s+\w+/i,
      /import\s+.*from|export\s+(default\s+)?/i,
      /<[A-Z][A-Za-z0-9]*(\s+[^>]*)?>/i, // JSX tags
      /SELECT\s+.*\s+FROM\s+/i,
      /\b(npm|yarn|pnpm|cargo|pip|docker)\s+[a-z]/i,
      /console\.log|print\(|System\.out\.println/i
    ],
    weight: 1.3
  },
  reasoning: {
    keywords: [
      'calculate', 'solve', 'proof', 'theorem', 'equation', 'derivative', 'integral',
      'matrix', 'probability', 'statistics', 'hypothesis', 'deduction', 'logic', 'syllogism',
      'formula', 'algebra', 'calculus', 'geometry', 'arithmetic', 'permutation', 'combination',
      'paradox', 'step-by-step', 'therefore', 'conclude', 'axiom', 'derive', 'verify',
      'optimal', 'strategy', 'game theory', 'bayes', 'differential', 'vector', 'cosine',
      'sine', 'tangent', 'logarithm', 'exponential', 'quadratic', 'linear', 'percentage',
      'mean', 'median', 'mode', 'variance', 'standard deviation', 'puzzle', 'riddle'
    ],
    patterns: [
      /\b(\d+\s*[\+\-\*\/\^]\s*\d+)/,
      /[fgh]\(x\)\s*=|dy\/dx|d\/dx|\b\d+x\s*[\+\-]/i,
      /step\s*[1-9]|firstly|secondly|therefore|thus|hence/i,
      /\b(if and only if|modus ponens|contrapositive|boolean logic)\b/i,
      /=\s*[-+]?\d+(\.\d+)?/
    ],
    weight: 1.25
  },
  productivity: {
    keywords: [
      'summary', 'summarize', 'meeting', 'agenda', 'action item', 'bullet points', 'draft',
      'email', 'template', 'report', 'brief', 'schedule', 'planning', 'milestone', 'task',
      'todo', 'workflow', 'checklist', 'proposal', 'outline', 'memo', 'minutes', 'status update',
      'presentation', 'slide', 'kpi', 'objective', 'roadmap', 'organize', 'table', 'structure',
      'rewrite', 'proofread', 'tone', 'executive', 'professional', 'brainstorm', 'prioritize'
    ],
    patterns: [
      /^[-*•]\s+/m,
      /\|\s*[^|]+\s*\|\s*[^|]+\s*\|/m, // Markdown tables
      /\b(subject:|dear\s+\w+|best regards|sincerely|action items:|key takeaways:)\b/i,
      /\b(to-do list|project roadmap|executive summary)\b/i
    ],
    weight: 1.2
  },
  core: {
    keywords: [
      'nexus', 'nexus ai', 'who are you', 'what are you', 'your architecture', 'privacy',
      'on-device', 'local model', 'parameters', 'weights', 'checkpoint', 'fine-tune',
      'neuro-symbolic', 'tokenization', 'memory store', 'rag', 'offline', 'browser ai',
      'creator', 'system prompt', 'version', 'autonomous', 'client-side', 'zero cloud'
    ],
    patterns: [
      /\b(who (created|built|designed|are) you|what is nexus|how do you work)\b/i,
      /\b(local model|on-device neural|privacy guarantee|zero telemetry)\b/i
    ],
    weight: 1.4
  },
  chat: {
    keywords: [
      'hello', 'hi', 'hey', 'greetings', 'how are you', 'good morning', 'good evening',
      'thank you', 'thanks', 'cool', 'awesome', 'joke', 'story', 'poem', 'chat',
      'conversation', 'philosophy', 'opinion', 'feeling', 'funny', 'humor', 'quote',
      'advice', 'favorite', 'relax', 'friend', 'tell me about yourself', 'bye', 'see you'
    ],
    patterns: [
      /^(hi|hello|hey|greetings|howdy|what's up)\b/i,
      /\b(tell me a joke|write a poem|how's your day|nice to meet you)\b/i
    ],
    weight: 1.0
  }
};

// Common programming language & topic dictionary for high-precision tag extraction
const TOPIC_TAG_MAP: Record<string, string[]> = {
  // Programming & Dev
  'react': ['react', 'frontend', 'ui'],
  'typescript': ['typescript', 'javascript', 'types'],
  'python': ['python', 'backend', 'data'],
  'rust': ['rust', 'systems', 'memory-safe'],
  'sql': ['sql', 'database', 'queries'],
  'postgres': ['postgresql', 'database'],
  'tailwind': ['tailwind', 'css', 'styling'],
  'docker': ['docker', 'devops', 'containerization'],
  'git': ['git', 'version-control'],
  'graphql': ['graphql', 'api', 'data'],
  'api': ['api', 'rest', 'integration'],
  'async': ['async-await', 'concurrency'],
  'regex': ['regex', 'pattern-matching'],
  'hook': ['react-hooks', 'state'],
  'component': ['components', 'frontend'],
  'debug': ['debugging', 'troubleshooting'],
  'performance': ['performance', 'optimization'],
  'security': ['security', 'best-practices'],

  // Math & Reasoning
  'derivative': ['calculus', 'derivatives', 'math'],
  'integral': ['calculus', 'integrals', 'math'],
  'matrix': ['linear-algebra', 'matrices', 'math'],
  'probability': ['probability', 'statistics', 'math'],
  'algorithm': ['algorithms', 'computer-science'],
  'sorting': ['sorting', 'algorithms'],
  'binary search': ['binary-search', 'algorithms'],
  'big-o': ['complexity', 'big-o'],
  'logic': ['logic', 'reasoning'],

  // Productivity
  'summary': ['summarization', 'productivity'],
  'email': ['email', 'communication', 'drafting'],
  'meeting': ['meeting-notes', 'productivity'],
  'checklist': ['checklist', 'organization'],
  'roadmap': ['roadmap', 'planning'],
  'table': ['data-tables', 'formatting'],

  // Core & Chat
  'nexus': ['nexus-core', 'architecture', 'on-device'],
  'privacy': ['privacy', 'zero-cloud', 'local-ai'],
  'weights': ['neural-weights', 'training'],
  'joke': ['humor', 'creative', 'chat'],
  'poem': ['poetry', 'creative', 'literature']
};

/**
 * Analyzes prompt and response content to perform semantic classification,
 * confidence scoring, intent slug generation, and intelligent tag extraction.
 */
export function analyzeTrainingPairContent(
  prompt: string,
  response: string
): SemanticAnalysisResult {
  const combinedText = `${prompt}\n${response}`.trim();
  const lowerText = combinedText.toLowerCase();

  const scores: Record<SupportedCategory, number> = {
    core: 0,
    coding: 0,
    reasoning: 0,
    chat: 0,
    productivity: 0,
    custom: 0.1 // Base baseline
  };

  const detectedKeywords: string[] = [];

  // 1. Calculate domain scores based on keywords and regex rules
  (Object.keys(DOMAIN_PATTERNS) as (keyof typeof DOMAIN_PATTERNS)[]).forEach(cat => {
    const config = DOMAIN_PATTERNS[cat];
    let matchCount = 0;

    // Check keywords
    config.keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        const count = matches.length;
        matchCount += count;
        scores[cat] += count * 1.5;
        if (!detectedKeywords.includes(kw)) {
          detectedKeywords.push(kw);
        }
      }
    });

    // Check patterns
    config.patterns.forEach(pattern => {
      if (pattern.test(combinedText)) {
        matchCount += 2;
        scores[cat] += 4.0;
      }
    });

    // Apply category specific multiplier
    scores[cat] *= config.weight;
  });

  // 2. Determine primary winning category and normalized confidence
  let winner: SupportedCategory = 'custom';
  let highestScore = 0;
  let totalScore = 0;

  const categories = Object.keys(scores) as SupportedCategory[];
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    totalScore += scores[cat];
    if (scores[cat] > highestScore) {
      highestScore = scores[cat];
      winner = cat;
    }
  }

  // If score is negligible, default to chat or custom
  if (highestScore < 1.0) {
    if (prompt.trim().length < 30 && (lowerText.includes('hi') || lowerText.includes('hello') || lowerText.includes('how'))) {
      winner = 'chat';
      scores.chat = 2.0;
      highestScore = 2.0;
      totalScore += 2.0;
    } else {
      winner = 'custom';
    }
  }

  const bestCategory: SupportedCategory = winner;
  const confidence = totalScore > 0 ? Math.min(0.99, Math.max(0.65, highestScore / totalScore)) : 0.70;

  // Normalize categoryScores for percentages
  const normalizedScores: Record<SupportedCategory, number> = {
    core: 0,
    coding: 0,
    reasoning: 0,
    chat: 0,
    productivity: 0,
    custom: 0
  };

  if (totalScore > 0) {
    categories.forEach(cat => {
      normalizedScores[cat] = Math.round((scores[cat] / totalScore) * 100) / 100;
    });
  } else {
    normalizedScores.custom = 1.0;
  }

  // 3. Extract High-Quality Semantic Tags
  const tagSet = new Set<string>();
  tagSet.add(bestCategory);

  // Match topic tag rules
  Object.keys(TOPIC_TAG_MAP).forEach(keyword => {
    if (lowerText.includes(keyword)) {
      TOPIC_TAG_MAP[keyword].forEach(t => tagSet.add(t));
    }
  });

  // Extract key technical tokens / phrases from prompt
  const cleanPromptWords = prompt
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['what', 'when', 'where', 'which', 'could', 'would', 'should', 'about', 'explain', 'please'].includes(w));

  cleanPromptWords.slice(0, 3).forEach(w => {
    if (tagSet.size < 6 && w.length > 3) {
      tagSet.add(w);
    }
  });

  // Add category specific generic tag if list is small
  if (bestCategory === 'coding') tagSet.add('programming');
  else if (bestCategory === 'reasoning') tagSet.add('problem-solving');
  else if (bestCategory === 'productivity') tagSet.add('workflow');
  else if (bestCategory === 'core') tagSet.add('nexus-ai');

  const suggestedTags = Array.from(tagSet).slice(0, 6);

  // 4. Generate Semantic Intent Slug
  const primaryKeywords = detectedKeywords.slice(0, 2);
  const promptKeyTerm = cleanPromptWords[0] || 'query';
  let intentSlug = '';

  if (primaryKeywords.length > 0) {
    intentSlug = `${bestCategory}_${primaryKeywords.join('_').replace(/[^a-z0-9_]/gi, '')}`;
  } else {
    intentSlug = `${bestCategory}_${promptKeyTerm}`;
  }
  intentSlug = intentSlug.toLowerCase().replace(/_+/g, '_').slice(0, 32);

  // 5. Generate descriptive rationale explanation
  let rationale = '';
  if (bestCategory === 'coding') {
    rationale = `Detected code syntax, programming syntax/keywords (${detectedKeywords.slice(0, 4).join(', ') || 'logic blocks'}), and implementation patterns.`;
  } else if (bestCategory === 'reasoning') {
    rationale = `Detected quantitative formulas, step-by-step logical reasoning markers, or mathematical computation symbols.`;
  } else if (bestCategory === 'productivity') {
    rationale = `Detected structured document layout, summarization cues, action items, or professional communication framing.`;
  } else if (bestCategory === 'core') {
    rationale = `Identified direct queries regarding Nexus AI architecture, local parameters, privacy mechanics, or system identity.`;
  } else if (bestCategory === 'chat') {
    rationale = `Identified conversational greeting, casual dialogue, open-ended banter, or social interaction semantics.`;
  } else {
    rationale = `Specialized custom domain dataset with distinct user-defined concepts.`;
  }

  return {
    category: bestCategory,
    confidence,
    categoryScores: normalizedScores,
    intent: intentSlug,
    suggestedTags,
    rationale,
    detectedKeywords: detectedKeywords.slice(0, 6)
  };
}

/**
 * Batch analysis helper for multiple training pairs
 */
export function analyzeBatchTrainingPairs(
  pairs: TrainingPair[]
): Map<string, SemanticAnalysisResult> {
  const results = new Map<string, SemanticAnalysisResult>();
  pairs.forEach(pair => {
    const analysis = analyzeTrainingPairContent(pair.prompt, pair.response);
    results.set(pair.id, analysis);
  });
  return results;
}
