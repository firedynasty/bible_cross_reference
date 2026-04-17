import { useEffect } from "react";

const DEFAULT_REFERENCES = {
  "Women of the Bible": [
    { name: "Sarah", note: "wife of Abraham", url: "https://www.britannica.com/biography/Sarah" },
    { name: "Hagar", note: "mother of Ishmael", url: "https://www.britannica.com/biography/Hagar-biblical-figure" },
    { name: "Rebekah", note: "wife of Isaac", url: "https://www.britannica.com/biography/Rebekah-biblical-figure" },
    { name: "Rachel", note: "beloved of Jacob", url: "https://www.britannica.com/biography/Rachel-biblical-figure" },
    { name: "Leah", note: "mother of Judah", url: "https://www.britannica.com/biography/Leah-biblical-figure" },
    { name: "Ruth", note: "the Moabite", url: "https://www.britannica.com/biography/Ruth-biblical-figure" },
    { name: "Hannah", note: "mother of Samuel", url: "https://www.britannica.com/biography/Hannah-Old-Testament-figure" },
    { name: "Abigail", note: "wife of David", url: "https://www.britannica.com/biography/Abigail" },
    { name: "Esther", note: "queen of Persia", url: "https://www.britannica.com/biography/Esther-biblical-figure" },
  ],
  "New Testament": [
    { name: "The Good Samaritan", note: "parable, Luke 10", url: "https://www.britannica.com/topic/parable-of-the-Good-Samaritan" },
    { name: "Saint Stephen", note: "first martyr, Acts 7", url: "https://www.britannica.com/biography/Saint-Stephen" },
  ],
};

export default function FurtherReadingModal({ open, onClose, references = DEFAULT_REFERENCES }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Further reading"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-medium">Further reading</h2>
            <p className="text-xs text-gray-500">Britannica articles</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="px-5 py-4">
          {Object.entries(references).map(([section, items]) => (
            <section key={section} className="mb-4 last:mb-0">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                {section}
              </p>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <li key={item.url}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-gray-50"
                    >
                      <span>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-500"> — {item.note}</span>
                      </span>
                      <span className="text-gray-400" aria-hidden>↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
