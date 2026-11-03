// EXCERPT from src/BibleApp.js lines 5780-5806 (as of 2026-11-02, pre-removal)
  // Handle expanding all cross-references for a verse into pane 2
  const handleExpandRefs = (refKey, verseNumber) => {
    const refs = crossReferences[refKey];
    if (!refs || refs.length === 0) return;
    const sourceData = rightPaneBibleData || bibleData || [];
    const results = refs.map(ref => {
      const book = sourceData.find(b => b.abbrev === ref.book);
      let verseText = '';
      if (book && book.chapters[ref.chapter - 1]) {
        const verses = book.chapters[ref.chapter - 1];
        if (verses[ref.verse - 1]) {
          const v = verses[ref.verse - 1];
          verseText = typeof v === 'string' ? v : (v.text || v.verse || String(v));
        }
      }
      return {
        label: `${getBookName(ref.book)} ${ref.chapter}:${ref.verse}`,
        text: verseText || '(verse not found in current translation)',
        book: ref.book,
        chapter: ref.chapter,
        verse: ref.verse
      };
    });
    const bookName = selectedBook ? getBookName(selectedBook.abbrev) : '';
    setExpandedRefsData({
      verseLabel: `${bookName} ${selectedChapter}:${verseNumber}`,
      refs: results
