const SUGGESTION_TITLES = [
  '추천 질문',
  '추천 선택지',
  '다음에 해볼 수 있는 질문',
  '다음 질문',
  '다음 액션',
  '추천 액션',
] as const;

const BULLET_PREFIX_PATTERN = /^[-•*]\s+/;

export interface ParsedChatMessageContent {
  body: string;
  suggestions: string[];
}

const isSuggestionTitle = (title: string) => {
  const normalized = title.trim().replace(/\s+/g, '');
  return SUGGESTION_TITLES.some((candidate) => candidate.replace(/\s+/g, '') === normalized);
};

const normalizeSuggestionLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  if (!BULLET_PREFIX_PATTERN.test(trimmed)) {
    return null;
  }

  const normalized = trimmed.replace(BULLET_PREFIX_PATTERN, '').trim();
  return normalized || null;
};

export const parseChatMessageContent = (content: string): ParsedChatMessageContent => {
  const rawSections = content
    .split(/\n(?=###\s)/)
    .map((section) => section.trim())
    .filter(Boolean);

  if (rawSections.length === 0) {
    return {
      body: content.trim(),
      suggestions: [],
    };
  }

  const bodySections: string[] = [];
  const suggestions: string[] = [];

  rawSections.forEach((section) => {
    const lines = section.split('\n').map((line) => line.trimEnd());
    const [titleLine, ...rest] = lines;

    if (titleLine.startsWith('### ')) {
      const title = titleLine.replace(/^###\s*/, '').trim();

      if (isSuggestionTitle(title)) {
        rest.forEach((line) => {
          const suggestion = normalizeSuggestionLine(line);
          if (suggestion) {
            suggestions.push(suggestion);
          }
        });
        return;
      }
    }

    bodySections.push(section);
  });

  const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, 6);

  return {
    body: bodySections.join('\n\n').trim(),
    suggestions: uniqueSuggestions,
  };
};
