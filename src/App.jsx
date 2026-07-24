import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Papa from "papaparse";
import { RefreshCw, AlertTriangle, CheckCircle2, Loader2, Search, X, ChevronDown } from "lucide-react";

const DATA_PA_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTkR8KkJN0h2go9xG9rE1JQ-f-jBB7Ne8ssTo5jFftGDtbhz0lpLnp4Q3ssDcyRXHjuTDxx7euPVlhy/pub?gid=1909267783&single=true&output=csv";
const OUTPUT_LINE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTkR8KkJN0h2go9xG9rE1JQ-f-jBB7Ne8ssTo5jFftGDtbhz0lpLnp4Q3ssDcyRXHjuTDxx7euPVlhy/pub?gid=1104084961&single=true&output=csv";

// ---------- helpers ----------
function parseNumber(raw) {
  if (raw === undefined || raw === null) return NaN;
  let s = String(raw).trim();
  if (s === "") return NaN;
  s = s.replace(/[^\d,.\-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    s = s.replace(/,/g, "");
  }
  return parseFloat(s);
}

function parseDateFlexible(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }
  const d2 = new Date(s);
  return isNaN(d2.getTime()) ? null : d2;
}

function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtDateID(d) {
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtNum(n, digits = 1) {
  if (n === null || n === undefined || isNaN(n)) return "-";
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

async function fetchCSV(url) {
  const res = await fetch(`${url}&_t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Gagal mengambil data (${res.status})`);
  const text = await res.text();
  return text;
}

// ---------- gauge ----------
function EfficiencyGauge({ value }) {
  const clamped = Math.max(0, Math.min(150, value || 0));
  const angle = (clamped / 150) * 180 - 90; // -90..90
  const zone =
    value >= 95 ? "good" : value >= 80 ? "warn" : "bad";
  const zoneColor =
    zone === "good"
      ? "var(--acc-good)"
      : zone === "warn"
      ? "var(--acc-warn)"
      : "var(--acc-bad)";

  const describeArc = (startAngle, endAngle, r = 90) => {
    const toRad = (a) => ((a - 90) * Math.PI) / 180;
    const start = {
      x: 110 + r * Math.cos(toRad(startAngle)),
      y: 110 + r * Math.sin(toRad(startAngle)),
    };
    const end = {
      x: 110 + r * Math.cos(toRad(endAngle)),
      y: 110 + r * Math.sin(toRad(endAngle)),
    };
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg viewBox="0 0 220 130" width="260" height="150">
        <path d={describeArc(-90, 6)} stroke="var(--acc-bad)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d={describeArc(6, 42)} stroke="var(--acc-warn)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d={describeArc(42, 90)} stroke="var(--acc-good)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "110px 110px", transition: "transform 0.35s cubic-bezier(.4,1.4,.6,1)" }}>
          <line x1="110" y1="110" x2="110" y2="34" stroke="var(--text-hi)" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="110" cy="110" r="7" fill="var(--text-hi)" />
        </g>
      </svg>
      <div style={{ marginTop: "-6px", textAlign: "center" }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "2.6rem",
            fontWeight: 700,
            color: zoneColor,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {isNaN(value) ? "—" : `${fmtNum(value, 1)}%`}
        </div>
        <div style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "var(--text-mid)", marginTop: "4px", textTransform: "uppercase" }}>
          Estimasi Efisiensi
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div
      style={{
        background: "var(--bg-panel-alt)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "10px 14px",
        minWidth: "110px",
      }}
    >
      <div style={{ fontSize: "0.65rem", color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.05rem", color: "var(--text-hi)", marginTop: "2px" }}>
        {value}
      </div>
    </div>
  );
}

function SearchableSelect({ value, onChange, options, placeholder, style }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const blurTimeout = useRef(null);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  const commit = (val) => {
    onChange(val);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => {
      setOpen(false);
      setQuery("");
    }, 120);
  };

  const handleFocus = () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setOpen(true);
    setHighlight(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlight]) commit(filtered[highlight]);
    } else if (e.key === "Escape") {
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", ...style }}>
      <div style={{ position: "relative" }}>
        <Search
          size={15}
          color="var(--text-mid)"
          style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        />
        <input
          ref={inputRef}
          value={open ? query : value || ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
            if (!open) setOpen(true);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: "100%",
            background: "var(--bg-panel-alt)",
            border: "1px solid var(--border)",
            color: "var(--text-hi)",
            borderRadius: "9px",
            padding: "11px 34px 11px 34px",
            fontSize: "0.9rem",
            boxSizing: "border-box",
          }}
        />
        {value && !open && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onChange("");
              setQuery("");
            }}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "var(--text-mid)",
              cursor: "pointer",
              display: "flex",
              padding: "2px",
            }}
            aria-label="Hapus pilihan"
          >
            <X size={14} />
          </button>
        )}
        {!value && (
          <ChevronDown
            size={15}
            color="var(--text-mid)"
            style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
        )}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--bg-panel-alt)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            maxHeight: "220px",
            overflowY: "auto",
            zIndex: 20,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "12px 14px", fontSize: "0.8rem", color: "var(--text-mid)" }}>Tidak ditemukan</div>
          ) : (
            filtered.map((opt, i) => (
              <div
                key={opt}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(opt);
                }}
                style={{
                  padding: "10px 14px",
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  background: i === highlight ? "var(--bg-panel)" : "transparent",
                  color: opt === value ? "var(--acc-teal)" : "var(--text-hi)",
                  borderBottom: i !== filtered.length - 1 ? "1px solid var(--border)" : "none",
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StageLabel({ n, title, done }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
      <div
        style={{
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.8rem",
          fontWeight: 700,
          background: done ? "var(--acc-teal)" : "var(--bg-panel-alt)",
          color: done ? "var(--bg-base)" : "var(--text-mid)",
          border: done ? "none" : "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {done ? <CheckCircle2 size={15} /> : n}
      </div>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1rem", fontWeight: 600, color: "var(--text-hi)", margin: 0 }}>
        {title}
      </h2>
    </div>
  );
}

// ---------- main app ----------
export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const [paRows, setPaRows] = useState([]);
  const [outputRows, setOutputRows] = useState([]); // {tanggal(Date), tanggalRaw, line, outputPerJam}
  const [optRows, setOptRows] = useState([]); // {tanggal(Date), tanggalRaw, line, jumlahOpt}

  const [selectedStyle, setSelectedStyle] = useState("");
  const [selectedLine, setSelectedLine] = useState("");
  const [overrideDate, setOverrideDate] = useState(""); // yyyy-mm-dd, optional manual pick

  const [estOutput, setEstOutput] = useState("");
  const [estMP, setEstMP] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [paText, outText] = await Promise.all([fetchCSV(DATA_PA_URL), fetchCSV(OUTPUT_LINE_URL)]);

      const paParsed = Papa.parse(paText, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
      const cleanPA = paParsed.data
        .filter((r) => r.STYLE && String(r.STYLE).trim() !== "")
        .map((r) => ({
          buyer: r.BUYER?.trim() || "-",
          style: r.STYLE.trim(),
          pa100: parseNumber(r["PA 100%"]),
          targetJam: parseNumber(r["TARGET/JAM"]),
          mp: parseNumber(r.MP),
          paBalance: parseNumber(r["PA BALANCE"]),
        }));
      setPaRows(cleanPA);

      // OUTPUT LINE sheet has two side-by-side tables separated by a blank column
      const outParsed = Papa.parse(outText, { header: false, skipEmptyLines: false });
      const rows = outParsed.data;
      const outArr = [];
      const optArr = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const tglRaw = row[0];
        const line1 = row[1];
        const outputPerJam = row[2];
        const tglRaw2 = row[4];
        const line2 = row[5];
        const jumlahOpt = row[6];

        if (tglRaw && line1) {
          const d = parseDateFlexible(tglRaw);
          if (d)
            outArr.push({
              tanggal: d,
              tanggalRaw: tglRaw,
              line: String(line1).trim(),
              outputPerJam: parseNumber(outputPerJam),
            });
        }
        if (tglRaw2 && line2) {
          const d2 = parseDateFlexible(tglRaw2);
          if (d2)
            optArr.push({
              tanggal: d2,
              tanggalRaw: tglRaw2,
              line: String(line2).trim(),
              jumlahOpt: parseNumber(jumlahOpt),
            });
        }
      }
      setOutputRows(outArr);
      setOptRows(optArr);
      setLastSync(new Date());
    } catch (e) {
      setError(e.message || "Gagal memuat data dari Google Sheet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const styleList = useMemo(() => [...new Set(paRows.map((r) => r.style))], [paRows]);
  const lineList = useMemo(() => {
    const fromOut = outputRows.map((r) => r.line);
    const fromOpt = optRows.map((r) => r.line);
    return [...new Set([...fromOut, ...fromOpt])].sort();
  }, [outputRows, optRows]);

  const paInfo = useMemo(() => paRows.find((r) => r.style === selectedStyle) || null, [paRows, selectedStyle]);

  const targetDate = useMemo(() => {
    if (overrideDate) {
      const [y, m, d] = overrideDate.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return y;
  }, [overrideDate]);

  const h1 = useMemo(() => {
    if (!selectedLine) return null;
    const o = outputRows.find((r) => r.line === selectedLine && sameDay(r.tanggal, targetDate));
    const j = optRows.find((r) => r.line === selectedLine && sameDay(r.tanggal, targetDate));
    if (!o && !j) return { found: false };
    const outputPerJam = o?.outputPerJam;
    const jumlahOpt = j?.jumlahOpt;
    const paH1 = outputPerJam && jumlahOpt ? outputPerJam / jumlahOpt : NaN;
    const effH1 = paInfo && paInfo.paBalance ? (paH1 / paInfo.paBalance) * 100 : NaN;
    return { found: true, outputPerJam, jumlahOpt, paH1, effH1 };
  }, [selectedLine, outputRows, optRows, targetDate, paInfo]);

  const estimasiEff = useMemo(() => {
    const out = parseNumber(estOutput);
    const mp = parseNumber(estMP);
    if (!paInfo || !paInfo.paBalance || isNaN(out) || isNaN(mp) || mp === 0) return NaN;
    return (out / mp / paInfo.paBalance) * 100;
  }, [estOutput, estMP, paInfo]);

  return (
    <div
      style={{
        "--bg-base": "#10151A",
        "--bg-panel": "#171F26",
        "--bg-panel-alt": "#1F2830",
        "--border": "#2A343C",
        "--text-hi": "#EAF0F2",
        "--text-mid": "#8393A0",
        "--acc-teal": "#3ECF8E",
        "--acc-warn": "#F0A93B",
        "--acc-bad": "#E0555A",
        "--acc-good": "#3ECF8E",
        background: "var(--bg-base)",
        minHeight: "100%",
        color: "var(--text-hi)",
        fontFamily: "'Inter', sans-serif",
        padding: "0",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');
        input, select { font-family: 'Inter', sans-serif; }
        select option { background: #1F2830; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: #2A343C; border-radius: 4px; }
      `}</style>

      {/* header */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.01em" }}>
            Kalkulator Efisiensi — Sewing
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", marginTop: "2px" }}>
            Estimasi efisiensi line real-time berbasis PA Balance
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-mid)", display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: error ? "var(--acc-bad)" : "var(--acc-teal)",
                display: "inline-block",
              }}
            />
            {loading ? "Menyinkronkan..." : error ? "Gagal sinkron" : `Sinkron ${lastSync ? lastSync.toLocaleTimeString("id-ID") : ""}`}
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              background: "var(--bg-panel-alt)",
              border: "1px solid var(--border)",
              color: "var(--text-hi)",
              borderRadius: "8px",
              padding: "7px 12px",
              fontSize: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: loading ? "default" : "pointer",
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "24px" }}>
        {error && (
          <div
            style={{
              background: "rgba(224,85,90,0.1)",
              border: "1px solid var(--acc-bad)",
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
              fontSize: "0.85rem",
            }}
          >
            <AlertTriangle size={16} color="var(--acc-bad)" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <div style={{ fontWeight: 600 }}>Data tidak bisa dimuat</div>
              <div style={{ color: "var(--text-mid)", marginTop: "2px" }}>{error}</div>
            </div>
          </div>
        )}

        {loading && !paRows.length ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", color: "var(--text-mid)", gap: "10px" }}>
            <Loader2 className="spin" size={24} style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: "0.85rem" }}>Memuat data dari Google Sheet...</div>
          </div>
        ) : (
          <>
            {/* STAGE 1 */}
            <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
              <StageLabel n={1} title="Pilih Style" done={!!paInfo} />
              <SearchableSelect
                value={selectedStyle}
                onChange={setSelectedStyle}
                options={styleList}
                placeholder="Ketik untuk cari style..."
                style={{ marginBottom: paInfo ? "16px" : 0 }}
              />

              {paInfo && (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <StatPill label="Buyer" value={paInfo.buyer} />
                  <StatPill label="PA 100%" value={fmtNum(paInfo.pa100, 0)} />
                  <StatPill label="Target/Jam" value={fmtNum(paInfo.targetJam, 0)} />
                  <StatPill label="MP" value={fmtNum(paInfo.mp, 0)} />
                  <StatPill label="PA Balance" value={fmtNum(paInfo.paBalance, 2)} />
                </div>
              )}
            </div>

            {/* STAGE 2 */}
            <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
              <StageLabel n={2} title="Pilih Line" done={!!h1 && h1.found} />
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
                <SearchableSelect
                  value={selectedLine}
                  onChange={setSelectedLine}
                  options={lineList}
                  placeholder="Ketik untuk cari line..."
                  style={{ flex: "1 1 180px" }}
                />
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  style={{
                    background: "var(--bg-panel-alt)",
                    border: "1px solid var(--border)",
                    color: "var(--text-hi)",
                    borderRadius: "9px",
                    padding: "11px 12px",
                    fontSize: "0.85rem",
                  }}
                  title="Default: H-1 (kemarin). Ubah jika perlu tanggal lain."
                />
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-mid)", marginBottom: "12px" }}>
                Menampilkan data tanggal <strong style={{ color: "var(--text-hi)" }}>{fmtDateID(targetDate)}</strong>
                {!overrideDate && " (H-1 otomatis)"}
              </div>

              {selectedLine && h1 && !h1.found && (
                <div style={{ fontSize: "0.8rem", color: "var(--acc-warn)", display: "flex", gap: "8px", alignItems: "center" }}>
                  <AlertTriangle size={14} /> Data tidak ditemukan untuk line & tanggal ini. Coba pilih tanggal lain.
                </div>
              )}

              {selectedLine && h1 && h1.found && (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <StatPill label="Output/Jam" value={fmtNum(h1.outputPerJam, 0)} />
                  <StatPill label="Jumlah Opt" value={fmtNum(h1.jumlahOpt, 0)} />
                  <StatPill label="PA H-1" value={fmtNum(h1.paH1, 2)} />
                  <StatPill label="Eff H-1" value={`${fmtNum(h1.effH1, 1)}%`} />
                </div>
              )}
            </div>

            {/* STAGE 3 */}
            <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
              <StageLabel n={3} title="Input Estimasi" done={false} />
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 160px" }}>
                  <label style={{ fontSize: "0.7rem", color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Estimasi Output</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={estOutput}
                    onChange={(e) => setEstOutput(e.target.value)}
                    placeholder="0"
                    style={{
                      width: "100%",
                      marginTop: "6px",
                      background: "var(--bg-panel-alt)",
                      border: "1px solid var(--border)",
                      color: "var(--text-hi)",
                      borderRadius: "9px",
                      padding: "11px 12px",
                      fontSize: "1rem",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                </div>
                <div style={{ flex: "1 1 160px" }}>
                  <label style={{ fontSize: "0.7rem", color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: "0.06em" }}>MP Aktual</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={estMP}
                    onChange={(e) => setEstMP(e.target.value)}
                    placeholder="0"
                    style={{
                      width: "100%",
                      marginTop: "6px",
                      background: "var(--bg-panel-alt)",
                      border: "1px solid var(--border)",
                      color: "var(--text-hi)",
                      borderRadius: "9px",
                      padding: "11px 12px",
                      fontSize: "1rem",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                </div>
              </div>

              {!paInfo ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-mid)", fontSize: "0.85rem" }}>
                  Pilih style terlebih dahulu untuk menghitung efisiensi
                </div>
              ) : (
                <EfficiencyGauge value={estimasiEff} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
