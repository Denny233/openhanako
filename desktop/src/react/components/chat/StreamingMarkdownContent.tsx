import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { splitGraphemes } from '../../utils/grapheme';
import type { LinkOpenContext } from '../../utils/link-open';
import { MarkdownContent } from './MarkdownContent';
import styles from './Chat.module.css';

interface Props {
  html: string;
  source?: string;
  active?: boolean;
  className?: string;
  linkContext?: LinkOpenContext;
}

const COMPLEX_MARKDOWN_PATTERNS = [
  /(^|\n)\s*(```|~~~)/,
  /(^|\n)\s*\$\$/,
  /(^|\n)\s*\\\[/,
  /(^|\n)\s*\|.*\|/,
  /(^|\n)\s{4,}\S/,
  /(^|\n)\s*<[^>\n]+>/,
];
const BACKTICK_SENSITIVE_MARKDOWN = /`/;
function cx(...parts: Array<string | false | null | undefined>): string | undefined {
  const value = parts.filter(Boolean).join(' ');
  return value || undefined;
}

export function isTypewriterEligibleMarkdownSource(source: string): boolean {
  if (!source.trim()) return false;
  if (BACKTICK_SENSITIVE_MARKDOWN.test(source)) return false;
  return !COMPLEX_MARKDOWN_PATTERNS.some((pattern) => pattern.test(source));
}

function countNewTailGraphemes(previous: string | null, current: string): number {
  if (!current) return 0;
  const newText = previous && current.startsWith(previous)
    ? current.slice(previous.length)
    : current;
  return splitGraphemes(newText).length;
}

export const StreamingMarkdownContent = memo(function StreamingMarkdownContent({
  html,
  source,
  active = false,
  className,
  linkContext,
}: Props) {
  const shouldAnimateStream = !!source && active;
  const shouldAnimateTail = shouldAnimateStream && isTypewriterEligibleMarkdownSource(source);
  const shouldAnimateBlock = shouldAnimateStream && !shouldAnimateTail;
  const previousVisibleSourceRef = useRef<string | null>(null);
  const tailFadeCount = useMemo(
    () => shouldAnimateTail
      ? countNewTailGraphemes(previousVisibleSourceRef.current, source || '')
      : 0,
    [shouldAnimateTail, source],
  );
  const blockMotionKey = shouldAnimateBlock ? `stream-block-${source.length}:${html.length}` : undefined;

  useLayoutEffect(() => {
    previousVisibleSourceRef.current = shouldAnimateStream ? (source || null) : null;
  }, [shouldAnimateStream, source]);

  return (
    <MarkdownContent
      key={blockMotionKey}
      html={html}
      className={cx(className, shouldAnimateBlock && styles.streamMarkdownBlockEnter)}
      tailFadeCount={tailFadeCount}
      linkContext={linkContext}
    />
  );
});
