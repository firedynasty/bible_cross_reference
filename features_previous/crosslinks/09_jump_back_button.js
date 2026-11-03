// EXCERPT from src/BibleApp.js lines 8528-8537 (as of 2026-11-02, pre-removal)
                      {lastCrossRef && (
                        <button
                          onClick={() => handleCrossRefNavigate(lastCrossRef)}
                          className={`text-xs px-2 py-1 rounded mr-2 font-semibold ${isDarkMode ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600' : 'bg-gray-100 text-blue-700 hover:bg-gray-200'}`}
                          title="Jump pane 2 back to last cross-reference"
                        >
                          {lastCrossRef.label}
                        </button>
                      )}
                    </div>
