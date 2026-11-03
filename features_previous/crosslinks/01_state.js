// EXCERPT from src/BibleApp.js lines 1514-1514 (as of 2026-11-02, pre-removal)
  const [crossReferences, setCrossReferences] = useState({});
  const [showCrossRef, setShowCrossRef] = useState(null);
  const [expandedRefsData, setExpandedRefsData] = useState(null); // { verseLabel, refs: [{label, text}] }
  const [refContextMenu, setRefContextMenu] = useState(null); // { x, y, book, chapter, verse }
  const [isViewingCrossRef, setIsViewingCrossRef] = useState(false);
  const [lastCrossRef, setLastCrossRef] = useState(null); // { book, chapter, verse, label }
