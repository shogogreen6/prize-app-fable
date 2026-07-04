/**
 * 作品名のゆるいマッチング用正規化。
 * NFKC → 小文字化 → 空白・記号除去 → カタカナをひらがなに畳み込み。
 */
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　]/g, "")
    .replace(/[ー\-–—・、。，．「」『』!！?？:：;；/／\\()（）[\]【】〜~"'&＆*＊#＃]/g, "")
    .replace(/[ァ-ヶ]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60),
    );
}
