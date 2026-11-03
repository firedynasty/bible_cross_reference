// EXCERPT from src/BibleApp.js lines 8297-8348 (as of 2026-11-02, pre-removal)
                {/* Expanded Cross-References View */}
                {expandedRefsData && (
                  <div className={`${showPane2Only ? 'max-w-[70ch] mx-auto' : ''} pb-8`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: `${fontScale * 1.1}em`, color: isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a5a5a' : '#333' }}>
                        Cross-References — {expandedRefsData.verseLabel}
                      </h3>
                      <button
                        onClick={() => setExpandedRefsData(null)}
                        style={{ width: 28, height: 28, fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: isDarkMode ? '#555' : isSepiaMode ? '#d4c9a8' : '#d0d0d0', color: isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a5a5a' : '#333' }}
                      >✕</button>
                    </div>
                    <div className="space-y-4">
                      {expandedRefsData.refs.map((ref, i) => {
                        const isPentateuch = ['gn','ge','ex','lv','nm','dt'].includes(ref.book);
                        const isIsaiah = ref.book === 'is';
                        const isOrange = ['ps','rm','hb','lk'].includes(ref.book);
                        const isNT = ['mt','mk','jo','act','1co','2co','gl','eph','ph','cl','1ts','2ts','1tm','2tm','tt','phm','jm','1pe','2pe','1jo','2jo','3jo','jd','re'].includes(ref.book);
                        const labelColor = isPentateuch ? (isDarkMode ? '#FCD34D' : '#92400E')
                          : isIsaiah ? (isDarkMode ? '#e8e8e6' : '#242422')
                          : isOrange ? (isDarkMode ? '#fb923c' : '#ea580c')
                          : isNT ? (isDarkMode ? '#86efac' : '#16a34a')
                          : (isDarkMode ? '#93c5fd' : '#2563eb');
                        return (
                          <div key={i} className={`p-3 rounded-md ${isDarkMode ? 'bg-gray-800' : ''}`} style={isSepiaMode ? { backgroundColor: '#e8ddc4' } : !isDarkMode ? { backgroundColor: '#f9fafb' } : {}}>
                            <a
                              href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(getBookName(ref.book) + ' ' + ref.chapter)}&version=NLT`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setRefContextMenu({ x: e.clientX, y: e.clientY, book: ref.book, chapter: ref.chapter, verse: ref.verse }); }}
                              title="Right-click for more options"
                              className="font-bold mb-1 hover:underline"
                              style={{ color: labelColor, padding: 0, fontSize: `${fontScale * 0.95}rem`, textDecoration: 'none' }}
                            >
                              {ref.label}
                            </a>
                            <p style={{ margin: '4px 0 0', fontSize: `${fontScale * 1.125}rem`, lineHeight: 1.6, color: isDarkMode ? '#d0d0d0' : isSepiaMode ? '#5a5a5a' : '#333' }}>
                              {ref.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {showStudyQModal && studyQData && (() => {
                  const bookName = selectedBook ? (selectedBook.book || getBookName(selectedBook.abbrev)) : '';
                  const bookQuestions = selectedBook && studyQData[selectedBook.abbrev];
                  const chapterQuestions = bookQuestions && bookQuestions[String(selectedChapter)];
                  // Build table of contents from all available books/chapters
                  const toc = Object.entries(studyQData).map(([abbrev, chapters]) => ({
                    abbrev,
