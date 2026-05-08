const TURER = [
  {
    id: 1,
    name: "Besseggen",
    omrade: "Jotunheimen",
    varighet: "1 dag",
    vanskelighet: "Middels",
    sesonger: ["vår", "sommer", "høst"],
    popularitet: 5,
    beskrivelse: "Norges mest kjente dagstур — ryggen mellom Gjende og Bessvatnet.",
  },
  {
    id: 2,
    name: "Galdhøpiggen",
    omrade: "Jotunheimen",
    varighet: "1 dag",
    vanskelighet: "Krevende",
    sesonger: ["sommer"],
    popularitet: 5,
    beskrivelse: "Topptur til Norges høyeste fjell (2469 moh).",
  },
  {
    id: 3,
    name: "Preikestolen",
    omrade: "Ryfylke",
    varighet: "1 dag",
    vanskelighet: "Enkel",
    sesonger: ["vår", "sommer", "høst"],
    popularitet: 5,
    beskrivelse: "Fjellplatå 604 meter rett over Lysefjorden — spektakulær utsikt.",
  },
  {
    id: 4,
    name: "Hardangervidda på tvers",
    omrade: "Hardangervidda",
    varighet: "5–7 dager",
    vanskelighet: "Middels",
    sesonger: ["vår", "sommer"],
    popularitet: 4,
    beskrivelse: "Klassisk viddeovergang fra Haukeliseter til Finse med DNT-hytter.",
  },
  {
    id: 5,
    name: "Rondane rundtur",
    omrade: "Rondane",
    varighet: "3–4 dager",
    vanskelighet: "Middels",
    sesonger: ["vår", "sommer", "høst"],
    popularitet: 4,
    beskrivelse: "Rundtur blant ti topper over 2000 moh i Norges første nasjonalpark.",
  },
  {
    id: 6,
    name: "Trollheimen-traversering",
    omrade: "Trollheimen",
    varighet: "3–4 dager",
    vanskelighet: "Middels",
    sesonger: ["vår", "sommer"],
    popularitet: 3,
    beskrivelse: "Stille natur og flotte DNT-hytter i Midt-Norge.",
  },
];

function getSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "vår";
  if (month >= 6 && month <= 8) return "sommer";
  if (month >= 9 && month <= 11) return "høst";
  return "vinter";
}

const VANSKELIGHET_COLOR: Record<string, string> = {
  Enkel: "bg-green-100 text-green-800",
  Middels: "bg-yellow-100 text-yellow-800",
  Krevende: "bg-red-100 text-red-800",
};

export default function TurforslaggerList() {
  const season = getSeason();
  const anbefalte = TURER.filter((t) => t.sesonger.includes(season)).sort(
    (a, b) => b.popularitet - a.popularitet
  );

  const seasonLabel: Record<string, string> = {
    vår: "🌱 Vår",
    sommer: "☀️ Sommer",
    høst: "🍂 Høst",
    vinter: "❄️ Vinter",
  };

  return (
    <aside className="w-80 shrink-0 h-full overflow-y-auto bg-white border-r border-gray-100 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          Anbefalte turer · {seasonLabel[season]}
        </p>
      </div>
      <ul className="flex-1 divide-y divide-gray-50">
        {anbefalte.map((tur) => (
          <li key={tur.id} className="px-4 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-semibold text-sm text-gray-900 leading-snug">
                {tur.name}
              </p>
              <span className="text-yellow-500 text-xs shrink-0">
                {"★".repeat(tur.popularitet)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              {tur.omrade} · {tur.varighet}
            </p>
            <p className="text-xs text-gray-600 mb-2 leading-relaxed">
              {tur.beskrivelse}
            </p>
            <span
              className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${VANSKELIGHET_COLOR[tur.vanskelighet]}`}
            >
              {tur.vanskelighet}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
