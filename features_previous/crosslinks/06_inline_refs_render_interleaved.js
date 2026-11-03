// EXCERPT from src/BibleApp.js lines 7525-7620 (as of 2026-11-02, pre-removal)
                      return interleavedVerses.map((item, index) => {
                        const refKey = `${selectedBook.abbrev}-${selectedChapter}-${item.verseNumber}`;
                        const hasReference = item.type === 'primary' && crossReferences[refKey] && crossReferences[refKey].length > 0;

                        return (
                          <div
                            key={`${item.type}-${item.verseNumber}-${index}`}
                            id={item.type === 'primary' ? `verse-${item.verseNumber}` : `right-pane-verse-${item.verseNumber}`}
                            className={`leading-relaxed p-3 rounded-md transition-colors ${
                              highlightedVerses.includes(item.verseNumber)
                                ? (isDarkMode ? 'bg-yellow-900' : 'bg-yellow-200')
                                : item.type === 'primary'
                                  ? (isDarkMode ? 'bg-gray-800' : 'bg-blue-50')
                                  : (isDarkMode ? 'bg-gray-700' : 'bg-gray-50')
                            } ${hasReference ? (isDarkMode ? 'hover:bg-blue-900' : 'hover:bg-blue-100') : ''}`}
                            style={{ fontSize: `${fontScale * 1.125}rem`, ...(highlightedVerses.includes(item.verseNumber) ? { borderLeft: '4px solid #eab308' } : {}) }}
                          >
                            <p className="flex">
                              <span
                                title={item.type === 'primary' ? 'View commentary' : 'Read verse aloud (TTS)'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.type === 'primary') {
                                    setVerseModalData({
                                      verseLabel: `${getBookName(selectedBook.abbrev)} ${selectedChapter}:${item.verseNumber}`,
                                      verseText: item.text,
                                      bookAbbrev: selectedBook.abbrev,
                                      chapter: selectedChapter,
                                      verseNumber: item.verseNumber,
                                    });
                                  } else {
                                    handleVerseTts(item.verseNumber, item.text, rightPaneTranslation);
                                  }
                                }}
                                className={`font-bold mr-4 cursor-pointer hover:opacity-70 ${speakingPaneVerse === item.verseNumber ? (isDarkMode ? 'text-green-400' : 'text-green-600') : (isDarkMode ? 'text-blue-400' : 'text-blue-600')}`}
                              >
                                {item.verseNumber}
                              </span>
                              <span className="flex-1">{selectedTranslation === 'he_heb_strong.json' && item.type === 'primary' ? renderWithStrongs(item.text, showGlosses) : renderWithGlosses(item.type === 'secondary' && showPane2Syllables ? syllabifyText(item.text) : item.text, showGlosses)}</span>
                              <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                ({item.translation})
                              </span>
                            </p>

                            {/* Cross-references — always visible for primary pane */}
                            {hasReference && (
                              <div className={`mt-2 pl-8 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`} style={{ fontSize: `${fontScale * 0.85}rem` }}>
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
                                  onClick={() => handleExpandRefs(refKey, item.verseNumber)}
                                  className={`ml-1 inline-flex items-center ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-700'}`}
                                  title="Show all cross-reference verses in pane 2"
                                >
                                  <Link className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Chapter Navigation */}
