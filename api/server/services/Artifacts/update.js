const ARTIFACT_START = ':::artifact';
const ARTIFACT_UPDATE_START = ':::artifact-update';

/**
 * Check if a match at the given position is an artifact-update (not a regular artifact)
 * @param {string} text
 * @param {number} position
 * @returns {boolean}
 */
const isArtifactUpdate = (text, position) => {
  return text.slice(position, position + ARTIFACT_UPDATE_START.length) === ARTIFACT_UPDATE_START;
};

/**
 * Find the closing ::: for an artifact directive.
 * The closing marker must be a standalone ::: on its own line (preceded by newline or start-of-string)
 * and must NOT be inside a fenced code block.
 * @param {string} text
 * @param {number} searchFrom - position after the opening :::artifact line
 * @returns {number} position of closing :::, or -1
 */
const findClosingMarker = (text, searchFrom) => {
  let inCodeBlock = false;
  let pos = searchFrom;

  while (pos < text.length) {
    const lineEnd = text.indexOf('\n', pos);
    const line = lineEnd === -1 ? text.slice(pos) : text.slice(pos, lineEnd);
    const trimmed = line.trimStart();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    } else if (!inCodeBlock && trimmed === ':::') {
      return pos + (line.length - trimmed.length);
    }

    if (lineEnd === -1) {
      break;
    }
    pos = lineEnd + 1;
  }
  return -1;
};

/**
 * Find all artifact boundaries in the message, excluding artifact-update directives
 * @param {TMessage} message
 * @returns {Array<{start: number, end: number, source: 'content'|'text', partIndex?: number}>}
 */
const findAllArtifacts = (message) => {
  const artifacts = [];

  const findInText = (text, source, partIndex) => {
    let currentIndex = 0;
    let start = text.indexOf(ARTIFACT_START, currentIndex);

    while (start !== -1) {
      if (isArtifactUpdate(text, start)) {
        currentIndex = start + ARTIFACT_UPDATE_START.length;
        start = text.indexOf(ARTIFACT_START, currentIndex);
        continue;
      }

      const lineEnd = text.indexOf('\n', start);
      const contentStart = lineEnd !== -1 ? lineEnd + 1 : text.length;
      const closingPos = findClosingMarker(text, contentStart);
      const end = closingPos !== -1 ? closingPos + 3 : text.length;

      const entry = { start, end, source, text };
      if (partIndex != null) {
        entry.partIndex = partIndex;
      }
      artifacts.push(entry);

      currentIndex = end;
      start = text.indexOf(ARTIFACT_START, currentIndex);
    }
  };

  if (message.content?.length) {
    for (let i = 0; i < message.content.length; i++) {
      const part = message.content[i];
      if (part.type === 'text' && typeof part.text === 'string') {
        findInText(part.text, 'content', i);
      }
    }
  }

  if (!artifacts.length && message.text) {
    findInText(message.text, 'text');
  }

  return artifacts;
};

const replaceArtifactContent = (originalText, artifact, original, updated) => {
  const artifactContent = artifact.text.substring(artifact.start, artifact.end);

  const contentStart = artifactContent.indexOf('\n', artifactContent.indexOf(ARTIFACT_START)) + 1;
  const closingPos = findClosingMarker(artifactContent, contentStart);
  const contentEnd = closingPos !== -1 ? closingPos : artifactContent.length;

  if (contentStart <= 0) {
    return null;
  }

  // Check if there are code blocks - handle both ```\n and ```lang\n formats
  let codeBlockStart = artifactContent.indexOf('```', contentStart);
  const codeBlockEnd = artifactContent.lastIndexOf('\n```', contentEnd);

  // If we found opening backticks, find the actual newline (skipping any language identifier)
  if (codeBlockStart !== -1) {
    const newlineAfterBackticks = artifactContent.indexOf('\n', codeBlockStart);
    if (newlineAfterBackticks !== -1 && newlineAfterBackticks < contentEnd) {
      codeBlockStart = newlineAfterBackticks;
    } else {
      codeBlockStart = -1;
    }
  }

  // Determine where to look for the original content
  let searchStart, searchEnd;
  if (codeBlockStart !== -1) {
    // Code block starts - searchStart is right after the newline following ```[lang]
    searchStart = codeBlockStart + 1; // after the newline

    if (codeBlockEnd !== -1 && codeBlockEnd > codeBlockStart) {
      // Code block has proper ending
      searchEnd = codeBlockEnd;
    } else {
      // No closing backticks found or they're before the opening (shouldn't happen)
      // This might be an incomplete artifact - search to contentEnd
      searchEnd = contentEnd;
    }
  } else {
    // No code blocks at all
    searchStart = contentStart;
    searchEnd = contentEnd;
  }

  const innerContent = artifactContent.substring(searchStart, searchEnd);
  // Remove trailing newline from original for comparison
  const originalTrimmed = original.replace(/\n$/, '');
  const relativeIndex = innerContent.indexOf(originalTrimmed);

  if (relativeIndex === -1) {
    return null;
  }

  const absoluteIndex = artifact.start + searchStart + relativeIndex;
  const endText = originalText.substring(absoluteIndex + originalTrimmed.length);
  const hasTrailingNewline = endText.startsWith('\n');

  const updatedText =
    originalText.substring(0, absoluteIndex) + updated + (hasTrailingNewline ? '' : '\n') + endText;

  return updatedText.replace(/\n+(?=```\n:::)/g, '\n');
};

const ARTIFACT_END = ':::';

module.exports = {
  ARTIFACT_START,
  ARTIFACT_UPDATE_START,
  ARTIFACT_END,
  findAllArtifacts,
  findClosingMarker,
  replaceArtifactContent,
};
