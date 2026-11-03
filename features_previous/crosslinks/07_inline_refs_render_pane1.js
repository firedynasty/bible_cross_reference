// EXCERPT from src/BibleApp.js lines 7878-7957 (as of 2026-11-02, pre-removal)
                      .map(({ verse, verseNumber }, displayIndex) => {
                    const refKey = `${selectedBook.abbrev}-${selectedChapter}-${verseNumber}`;
                    const hasReference = crossReferences[refKey] && crossReferences[refKey].length > 0;

                    return (
                      <div
                        key={verseNumber}
                        id={`verse-${verseNumber}`}
                        className={`leading-relaxed p-4 rounded-md transition-colors ${
                          hasReference
                            ? isDarkMode ? 'hover:bg-blue-900' : 'hover:bg-blue-50'
                            : ''
                        }`}
                        style={{ fontSize: `${fontScale * 1.125}rem` }}
                      >
                        <p className="flex">
                          <span
                            title="View commentary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVerseModalData({
                                verseLabel: `${getBookName(selectedBook.abbrev)} ${selectedChapter}:${verseNumber}`,
                                verseText: verse,
                                bookAbbrev: selectedBook.abbrev,
                                chapter: selectedChapter,
                                verseNumber,
                              });
                            }}
                            className={`font-bold mr-4 cursor-pointer hover:opacity-70 ${speakingPaneVerse === verseNumber ? (isDarkMode ? 'text-green-400' : 'text-green-600') : (isDarkMode ? 'text-blue-400' : 'text-blue-600')}`}
                          >{verseNumber}</span>
                          <span className="flex-1">{selectedTranslation === 'he_heb_strong.json' ? renderWithStrongs(verse, showGlosses) : renderWithGlosses(verse, showGlosses)}</span>
                        </p>

                        {/* Cross-references — always visible */}
                        {hasReference && (
                          <div className={`mt-2 pl-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ fontSize: `${fontScale * 0.85}rem` }}>
                            <span className="font-medium mr-1">Refs:</span>
                            {crossReferences[refKey].map((ref, i) => {
                              const isPentateuch = ['gn','ge','ex','lv','nm','dt'].includes(ref.book);
                              const isIsaiah = ref.book === 'is';
                              const isOrange = ['ps','rm','hb','lk'].includes(ref.book);
                              const isNT = ['mt','mk','jo','act','1co','2co','gl','eph','ph','cl','1ts','2ts','1tm','2tm','tt','phm','jm','1pe','2pe','1jo','2jo','3jo','jd','re'].includes(ref.book);
                              return (
                              <button
                                key={i}
                                onClick={() => window.open(getRefBibleGatewayUrl(ref), '_blank')}
                                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setRefContextMenu({ x: e.clientX, y: e.clientY, book: ref.book, chapter: ref.chapter, verse: ref.verse }); }}
                                title="Right-click for more options"
                                className={`mr-2 ${
                                  isPentateuch || isIsaiah
                                    ? 'hover:opacity-80'
                                    : isOrange
                                      ? (isDarkMode ? 'text-orange-300 hover:text-orange-200' : 'text-orange-600 hover:text-orange-800')
                                      : isNT
                                        ? (isDarkMode ? 'text-green-300 hover:text-green-200' : 'text-green-600 hover:text-green-800')
                                        : (isDarkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800')
                                }`}
                                style={
                                  isPentateuch ? { color: isDarkMode ? '#FCD34D' : '#92400E' }
                                  : isIsaiah ? { color: isDarkMode ? '#e8e8e6' : '#242422' }
                                  : undefined
                                }
                              >
                                {getBookName(ref.book)} {ref.chapter}:{ref.verse}{i < crossReferences[refKey].length - 1 ? ',' : ''}
                              </button>
                              );
                            })}
                            <button
                              onClick={() => handleExpandRefs(refKey, verseNumber)}
                              className={`ml-1 inline-flex items-center ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-700'}`}
                              title="Show all cross-reference verses in pane 2"
                            >
                              <Link className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                      })
                  }
