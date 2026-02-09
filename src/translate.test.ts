import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { containsChinese, translateToJapanese, translateBatch } from './translate';

describe('translate', () => {
  describe('containsChinese', () => {
    it('should return true for Chinese text', () => {
      expect(containsChinese('修复登录问题')).toBe(true);
      expect(containsChinese('这是中文')).toBe(true);
    });

    it('should return false for Japanese text with hiragana', () => {
      expect(containsChinese('これは日本語です')).toBe(false);
      expect(containsChinese('ログイン修正')).toBe(false);
    });

    it('should return false for Japanese text with katakana', () => {
      expect(containsChinese('カタカナテスト')).toBe(false);
      expect(containsChinese('テスト完了')).toBe(false);
    });

    it('should return false for English text', () => {
      expect(containsChinese('Fix login page')).toBe(false);
      expect(containsChinese('Hello World')).toBe(false);
    });

    it('should return false for mixed Japanese and kanji', () => {
      expect(containsChinese('日本語テスト')).toBe(false);
      expect(containsChinese('完了しました')).toBe(false);
    });

    it('should return true for pure kanji (Chinese)', () => {
      expect(containsChinese('完成')).toBe(true);
      expect(containsChinese('修复')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(containsChinese('')).toBe(false);
    });
  });

  describe('translateToJapanese', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should return original text for non-Chinese', async () => {
      const text = 'Fix login page';
      const result = await translateToJapanese(text);
      expect(result).toBe(text);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return original text for Japanese', async () => {
      const text = 'ログインを修正';
      const result = await translateToJapanese(text);
      expect(result).toBe(text);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should call API for Chinese text', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([[['翻訳されたテキスト', '中文文本']]]),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await translateToJapanese('中文文本');
      
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toBe('翻訳されたテキスト');
    });

    it('should return original text on API error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const originalText = '中文文本';
      const result = await translateToJapanese(originalText);
      
      expect(result).toBe(originalText);
    });

    it('should return original text on network error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const originalText = '中文文本';
      const result = await translateToJapanese(originalText);
      
      expect(result).toBe(originalText);
    });

    it('should return original text on invalid response format', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const originalText = '中文文本';
      const result = await translateToJapanese(originalText);
      
      expect(result).toBe(originalText);
    });

    it('should return original text on empty response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([[[]]]),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const originalText = '中文文本';
      const result = await translateToJapanese(originalText);
      
      expect(result).toBe(originalText);
    });
  });

  describe('translateBatch', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should translate multiple texts', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([[['翻訳済み', '中文']]]),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const texts = ['English text', '中文文本', 'More English'];
      const results = await translateBatch(texts);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toBe('English text'); // Not translated
      expect(results[1]).toBe('翻訳済み'); // Translated
      expect(results[2]).toBe('More English'); // Not translated
    });

    it('should handle empty array', async () => {
      const results = await translateBatch([]);
      expect(results).toEqual([]);
    });
  });
});
