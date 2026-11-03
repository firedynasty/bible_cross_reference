// EXCERPT from src/BibleApp.js lines 12442-12494 (as of 2026-11-02, pre-removal)
      {/* Right-click context menu for cross-reference links: choose BibleGateway or in-app (Vercel-Bible) */}
      {refContextMenu && (
        <div
          onClick={() => setRefContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setRefContextMenu(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10300 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: Math.min(refContextMenu.y, window.innerHeight - 96),
              left: Math.min(refContextMenu.x, window.innerWidth - 190),
              zIndex: 10301, minWidth: 170,
              background: isDarkMode ? '#2d3148' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#3a3f5c' : '#e5e7eb'}`,
              borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              padding: 5, display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            <button
              onClick={() => { window.open(getRefBibleGatewayUrl(refContextMenu), '_blank'); setRefContextMenu(null); }}
              style={{
                textAlign: 'left', padding: '7px 10px', borderRadius: 6, border: 'none',
                background: 'transparent', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                color: isDarkMode ? '#e0e0e0' : '#1a1a1a',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? '#3a3f5c' : '#f3f4f6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Open in BibleGateway
            </button>
            <button
              onClick={() => { window.open(getRefVercelBibleUrl(refContextMenu), '_blank'); setRefContextMenu(null); }}
              style={{
                textAlign: 'left', padding: '7px 10px', borderRadius: 6, border: 'none',
                background: 'transparent', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                color: isDarkMode ? '#e0e0e0' : '#1a1a1a',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? '#3a3f5c' : '#f3f4f6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Open in Vercel-Bible
            </button>
          </div>
        </div>
      )}

      {/* Outline Modal */}
      {showOutlineModal && (() => {
        const oBook = pane2Book || selectedBook;
        const oChapter = pane2Chapter || selectedChapter;
        const oBookName = oBook ? (oBook.book || oBook.abbrev) : '';
