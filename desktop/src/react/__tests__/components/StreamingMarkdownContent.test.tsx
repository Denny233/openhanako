// @vitest-environment jsdom

import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  StreamingMarkdownContent,
  isTypewriterEligibleMarkdownSource,
} from '../../components/chat/StreamingMarkdownContent';

describe('StreamingMarkdownContent', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame');
    vi.spyOn(window, 'cancelAnimationFrame');
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders each streaming prose flush immediately and marks the new tail chunk for fade', () => {
    const { container, rerender } = render(
      <StreamingMarkdownContent source="旧正文" html="<p>旧正文</p>" active />,
    );

    expect(container.textContent?.trim()).toBe('旧正文');

    rerender(
      <StreamingMarkdownContent source="旧正文新正文继续出现" html="<p>旧正文新正文继续出现</p>" active />,
    );

    const text = container.textContent?.trim() || '';
    expect(text).toBe('旧正文新正文继续出现');
    expect(container.querySelector('[data-stream-tail-chunk="true"]')?.textContent).toBe('新正文继续出现');
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('does not replay the tail fade when the streaming prose target has not changed', () => {
    const source = '这是一段足够长的普通正文';
    const { container, rerender } = render(
      <StreamingMarkdownContent source={source} html={`<p>${source}</p>`} active />,
    );

    const firstTail = container.querySelector('[data-stream-tail-chunk="true"]');
    expect(firstTail?.textContent).toBe(source);

    rerender(
      <StreamingMarkdownContent source={source} html={`<p>${source}</p>`} active />,
    );

    expect(container.textContent?.trim()).toBe(source);
    expect(container.querySelector('[data-stream-tail-chunk="true"]')).toBe(firstTail);
  });

  it('marks the full newly rendered prose chunk for fade when prose is long enough', () => {
    const source = '这是一段足够长的普通正文';
    const { container } = render(
      <StreamingMarkdownContent source={source} html={`<p>${source}</p>`} active />,
    );

    expect(container.querySelector('[data-stream-tail-chunk="true"]')?.textContent).toBe(source);
  });

  it('does not typewriter complex markdown blocks', () => {
    const source = '```ts\nconst x = 1;\n```';
    const html = '<pre><code>const x = 1;</code></pre>';

    const { container } = render(
      <StreamingMarkdownContent source={source} html={html} active />,
    );

    expect(container.textContent).toContain('const x = 1;');
    expect(container.querySelector('[data-stream-tail-chunk="true"]')).toBeNull();
    expect(container.querySelector('[class*="streamMarkdownBlockEnter"]')).not.toBeNull();
  });

  it('does not typewriter backtick-sensitive inline markdown while streaming', () => {
    const source = '这里有 `inline code`，后续文字也要稳定显示。';
    const html = '<p>这里有 <code>inline code</code>，后续文字也要稳定显示。</p>';

    expect(isTypewriterEligibleMarkdownSource(source)).toBe(false);

    const { container } = render(
      <StreamingMarkdownContent source={source} html={html} active />,
    );

    expect(container.textContent).toContain('后续文字也要稳定显示。');
    expect(container.querySelector('[data-stream-tail-chunk="true"]')).toBeNull();
    expect(container.querySelector('[class*="streamMarkdownBlockEnter"]')).not.toBeNull();
  });

  it('keeps stream motion off React animation frames and limits CSS to opacity or tiny transforms', () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), 'desktop/src/react/components/chat/Chat.module.css'),
      'utf8',
    );
    const animations = fs.readFileSync(
      path.join(process.cwd(), 'desktop/src/animations.css'),
      'utf8',
    );
    const tailBlock = css.match(/\.streamTailChunk\s*\{(?<body>[^}]*)\}/)?.groups?.body || '';
    const cardBlock = css.match(/\.mediaGenerationCard\s*\{(?<body>[^}]*)\}/)?.groups?.body || '';
    const toolBlock = Array.from(css.matchAll(/\.toolGroup::before\s*\{(?<body>[^}]*)\}/g))
      .map(match => match.groups?.body || '')
      .find(body => body.includes('hana-tool-bar-in')) || '';

    expect(tailBlock).toContain('hana-stream-tail-in');
    expect(tailBlock).not.toContain('requestAnimationFrame');
    expect(cardBlock).toContain('hana-chat-soft-up-in');
    expect(toolBlock).toContain('hana-tool-bar-in');
    expect(animations).toContain('@keyframes hana-stream-tail-in');
    expect(animations).toContain('@keyframes hana-chat-soft-down-in');
    expect(animations).toContain('@keyframes hana-chat-soft-up-in');
    expect(animations).toContain('@keyframes hana-tool-bar-in');
  });
});
