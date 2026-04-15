import { describe, expect, it } from 'vitest';
import { filterContent } from './contentFilter';

describe('filterContent', () => {
  it('allows normal friendly messages', () => {
    expect(filterContent('今天下课后一起去喝咖啡吗？')).toEqual({
      isBlocked: false,
      isWarning: false,
      reason: '',
      matchedKeywords: [],
    });
  });

  it('returns empty result for empty string', () => {
    expect(filterContent('')).toEqual({
      isBlocked: false,
      isWarning: false,
      reason: '',
      matchedKeywords: [],
    });
  });

  it('returns empty result for whitespace only input', () => {
    expect(filterContent('   \n   ')).toEqual({
      isBlocked: false,
      isWarning: false,
      reason: '',
      matchedKeywords: [],
    });
  });

  it('blocks abusive language', () => {
    const result = filterContent('你这人真的脑残');
    expect(result.isBlocked).toBe(true);
    expect(result.reason).toContain('侮辱');
    expect(result.matchedKeywords).toContain('脑残');
  });

  it('blocks sexual content', () => {
    const result = filterContent('要不要今晚出去开房');
    expect(result.isBlocked).toBe(true);
    expect(result.reason).toContain('色情');
    expect(result.matchedKeywords).toContain('开房');
  });

  it('blocks spam and contact exchange', () => {
    const result = filterContent('不如直接加微信聊吧');
    expect(result.isBlocked).toBe(true);
    expect(result.reason).toContain('引流');
    expect(result.matchedKeywords).toContain('加微信');
  });

  it('blocks fraud keywords', () => {
    const result = filterContent('这里有个刷单兼职日结的机会');
    expect(result.isBlocked).toBe(true);
    expect(result.reason).toContain('诈骗');
    expect(result.matchedKeywords).toEqual(expect.arrayContaining(['刷单', '兼职日结']));
  });

  it('detects chinese bypass variants with inserted symbols', () => {
    const result = filterContent('可以加 微*信 继续聊');
    expect(result.isBlocked).toBe(true);
    expect(result.matchedKeywords).toContain('加微信');
  });

  it('detects romanized bypass variants with spaces', () => {
    const result = filterContent('要不加 wei xin 说');
    expect(result.isBlocked).toBe(true);
    expect(result.matchedKeywords).toContain('加weixin');
  });

  it('detects qq variants with spaces', () => {
    const result = filterContent('你加 q q 我给你发图');
    expect(result.isBlocked).toBe(true);
    expect(result.matchedKeywords).toContain('加qq');
  });

  it('returns warning for phone number instead of blocking', () => {
    const result = filterContent('这是我的手机号 13812345678');
    expect(result).toEqual({
      isBlocked: false,
      isWarning: true,
      reason: '为了保护隐私，建议不要直接发送手机号等个人联系方式。',
      matchedKeywords: ['13812345678'],
    });
  });

  it('keeps blocking precedence over phone warnings', () => {
    const result = filterContent('加微信 13812345678');
    expect(result.isBlocked).toBe(true);
    expect(result.isWarning).toBe(false);
    expect(result.matchedKeywords).toContain('加微信');
  });

  it('handles very long safe messages', () => {
    const longMessage = '今天图书馆见面吗'.repeat(600);
    expect(filterContent(longMessage)).toEqual({
      isBlocked: false,
      isWarning: false,
      reason: '',
      matchedKeywords: [],
    });
  });

  it('handles very long messages containing a blocked phrase', () => {
    const longMessage = `${'正常聊天'.repeat(400)} 做任务赚钱 ${'继续聊天'.repeat(400)}`;
    const result = filterContent(longMessage);
    expect(result.isBlocked).toBe(true);
    expect(result.matchedKeywords).toContain('做任务赚钱');
  });

  it('deduplicates repeated matches', () => {
    const result = filterContent('加微信吧，真的，加微信聊更快');
    expect(result.matchedKeywords).toEqual(['加微信']);
  });
});
