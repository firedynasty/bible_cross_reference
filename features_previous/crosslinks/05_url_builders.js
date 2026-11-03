// EXCERPT from src/BibleApp.js lines 3120-3131 (as of 2026-11-02, pre-removal)
  // Build a BibleGateway deep link for a cross-reference {book, chapter, verse}
  const getRefBibleGatewayUrl = (ref) => {
    const bgBook = (abbrevToBookName[ref.book] || getBookName(ref.book)).replace(/ /g, '%20');
    return `https://www.biblegateway.com/passage/?search=${bgBook}%20${ref.chapter}&version=WEB#v${ref.verse}`;
  };

  // Build an in-app deep link for a cross-reference {book, chapter, verse}
  // Uses the same ?bookname&chapter[:verse] convention as the deep-link loader above.
  const getRefVercelBibleUrl = (ref) => {
    const token = (abbrevToBookName[ref.book] || getBookName(ref.book)).toLowerCase().replace(/\s+/g, '');
    const chapterVerse = ref.verse ? `${ref.chapter}:${ref.verse}` : `${ref.chapter}`;
    return `${window.location.origin}${window.location.pathname}?${token}&${chapterVerse}`;
