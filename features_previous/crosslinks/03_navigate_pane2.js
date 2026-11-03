// EXCERPT from src/BibleApp.js lines 5656-5702 (as of 2026-11-02, pre-removal)
  // Handle click on a cross-reference — navigate pane 2 only
  const handleCrossRefNavigate = (ref) => {
    // Find the book in the right pane Bible data
    const book = (rightPaneBibleData || bibleData || []).find(b => b.abbrev === ref.book);
    if (book) {
      // Push current pane 2 state (including any open concordance) to history before navigating
      setPane2History(h => [...h, { book: pane2Book, chapter: pane2Chapter, concordance: strongsConcordance }]);
      // Update pane 2 independently
      setPane2Book(book);
      setPane2Chapter(ref.chapter);

      // Mark that we're viewing a cross-reference
      setIsViewingCrossRef(true);

      // Remember last cross-ref for the jump-back button
      setLastCrossRef({ book: ref.book, chapter: ref.chapter, verse: ref.verse, label: `${getBookName(ref.book)} ${ref.chapter}:${ref.verse}` });

      // Auto-add to ref history
      setRefHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].parsed.abbrev === ref.book) return prev;
        const label = `${getBookName(ref.book)} ${ref.chapter}`;
        return [...prev, { raw: label, parsed: { abbrev: ref.book, chapter: ref.chapter } }];
      });

      // Scroll pane 2 to the referenced verse — disable scroll sync to prevent pane 1 from moving
      const scrollToVerse = (verseNum, attempts = 0) => {
        const el = document.getElementById(`right-pane-verse-${verseNum}`);
        const pane = kjvContentRef.current;
        if (el && pane) {
          // Disable scroll sync for the duration of this scroll
          isManuallyScrolling.current = true;
          const elRect = el.getBoundingClientRect();
          const paneRect = pane.getBoundingClientRect();
          const offset = elRect.top - paneRect.top + pane.scrollTop - pane.clientHeight / 3;
          pane.scrollTo({ top: offset, behavior: 'smooth' });
          el.style.backgroundColor = isDarkMode ? '#b45309' : '#fef9c3';
          el.style.color = isDarkMode ? '#fffbeb' : '';
          setTimeout(() => { el.style.backgroundColor = ''; el.style.color = ''; }, 3000);
          // Re-enable scroll sync after smooth scroll completes (~600ms)
          setTimeout(() => { isManuallyScrolling.current = false; }, 800);
        } else if (attempts < 5) {
          setTimeout(() => scrollToVerse(verseNum, attempts + 1), 150);
        }
      };
      setTimeout(() => scrollToVerse(ref.verse), 300);
    }
  };
