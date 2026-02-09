/**
 * Translation module - Translate Chinese text to Japanese
 * Uses free Google Translate API (no key required)
 */

/**
 * Check if text contains Chinese characters
 */
export function containsChinese(text: string): boolean {
  // Match Chinese characters (CJK Unified Ideographs)
  // Exclude Japanese-specific characters (Hiragana, Katakana)
  const chineseRegex = /[\u4e00-\u9fff]/;
  const hasChineseChars = chineseRegex.test(text);
  
  // If it has Hiragana or Katakana, it's likely Japanese
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
  const hasJapaneseChars = japaneseRegex.test(text);
  
  // Only consider it Chinese if it has Chinese chars but no Japanese chars
  return hasChineseChars && !hasJapaneseChars;
}

/**
 * Translate text from Chinese to Japanese using free Google Translate API
 */
export async function translateToJapanese(text: string): Promise<string> {
  if (!containsChinese(text)) {
    return text;
  }

  try {
    // Use Google Translate free API
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=ja&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      console.error(`Translation API error: ${response.status}`);
      return text; // Return original on error
    }

    const data = await response.json() as [[[string, string]]];
    
    // Extract translated text from response
    // Response format: [[[translated, original], ...], ...]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }

    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original on error
  }
}

/**
 * Translate multiple texts in batch
 */
export async function translateBatch(texts: string[]): Promise<string[]> {
  const results: string[] = [];
  
  for (const text of texts) {
    const translated = await translateToJapanese(text);
    results.push(translated);
  }
  
  return results;
}
