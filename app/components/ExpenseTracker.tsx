"use client";

import { useState } from "react";

interface Expense {
  id: number;
  paidBy: string;
  description: string;
  amountOre: number;
  sharedBy: string[] | null;
}

interface Settlement {
  from: string;
  to: string;
  amountOre: number;
}

interface Props {
  tripId: string;
  participantNames: string[];
  initialExpenses: Expense[];
}

function calcSettlements(
  expenseList: Expense[],
  allNames: string[],
): Settlement[] {
  if (allNames.length === 0) return [];

  const balance: Record<string, number> = {};
  for (const name of allNames) balance[name] = 0;

  for (const exp of expenseList) {
    const participants = exp.sharedBy ?? allNames;
    if (participants.length === 0) continue;
    const share = exp.amountOre / participants.length;
    for (const name of participants) {
      if (balance[name] === undefined) balance[name] = 0;
      balance[name] -= share;
    }
    if (balance[exp.paidBy] !== undefined) {
      balance[exp.paidBy] += exp.amountOre;
    }
  }

  const debtors = Object.entries(balance)
    .filter(([, b]) => b < -0.5)
    .map(([name, b]) => ({ name, amt: -b }))
    .sort((a, b) => b.amt - a.amt);

  const creditors = Object.entries(balance)
    .filter(([, b]) => b > 0.5)
    .map(([name, b]) => ({ name, amt: b }))
    .sort((a, b) => b.amt - a.amt);

  const settlements: Settlement[] = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const transfer = Math.min(debtors[di].amt, creditors[ci].amt);
    settlements.push({
      from: debtors[di].name,
      to: creditors[ci].name,
      amountOre: Math.round(transfer),
    });
    debtors[di].amt -= transfer;
    creditors[ci].amt -= transfer;
    if (debtors[di].amt < 0.5) di++;
    if (creditors[ci].amt < 0.5) ci++;
  }
  return settlements;
}

function kr(ore: number) {
  return (ore / 100).toLocaleString("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function ExpenseTracker({
  tripId,
  participantNames,
  initialExpenses,
}: Props) {
  const [expenseList, setExpenseList] = useState<Expense[]>(initialExpenses);
  const [paidBy, setPaidBy] = useState(participantNames[0] ?? "");
  const [description, setDescription] = useState("");
  const [amountKr, setAmountKr] = useState("");
  const [sharedBy, setSharedBy] = useState<Set<string>>(
    new Set(participantNames),
  );
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const settlements = calcSettlements(expenseList, participantNames);
  const totalOre = expenseList.reduce((s, e) => s + e.amountOre, 0);

  function toggleShared(name: string) {
    setSharedBy((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function openForm() {
    setSharedBy(new Set(participantNames));
    setPaidBy(participantNames[0] ?? "");
    setDescription("");
    setAmountKr("");
    setError(null);
    setShowForm(true);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (sharedBy.size === 0) {
      setError("Velg minst én person som deler utgiften");
      return;
    }
    const amountOre = Math.round(parseFloat(amountKr.replace(",", ".")) * 100);
    if (!paidBy || !description.trim() || isNaN(amountOre) || amountOre <= 0) {
      setError("Fyll ut alle felt");
      return;
    }
    setAdding(true);
    try {
      const isAll =
        sharedBy.size === participantNames.length &&
        participantNames.every((n) => sharedBy.has(n));
      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidBy,
          description,
          amountOre,
          sharedBy: isAll ? null : Array.from(sharedBy),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt");
        return;
      }
      setExpenseList((prev) => [...prev, data]);
      setShowForm(false);
    } catch {
      setError("Kunne ikke lagre utlegg");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="bg-amber-50 rounded-lg mx-3 mb-3 overflow-hidden border border-amber-100">
      <div className="px-3 pt-2 pb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-800">
          💰 Utlegg & oppgjør
        </p>
        {totalOre > 0 && (
          <span className="text-[10px] text-amber-600">
            Totalt: {kr(totalOre)}
          </span>
        )}
      </div>

      {expenseList.length > 0 && (
        <ul className="divide-y divide-amber-100 border-t border-amber-100">
          {expenseList.map((exp) => {
            const shared = exp.sharedBy ?? participantNames;
            return (
              <li
                key={exp.id}
                className="px-3 py-1.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="text-xs text-gray-800 font-medium">
                    {exp.description}
                  </span>
                  <span className="text-[10px] text-gray-500 ml-1.5">
                    betalt av {exp.paidBy}
                  </span>
                  {exp.sharedBy && (
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      Deles av: {shared.join(", ")}
                    </p>
                  )}
                </div>
                <span className="text-xs font-semibold text-amber-800 shrink-0">
                  {kr(exp.amountOre)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {settlements.length > 0 && (
        <div className="px-3 py-2 border-t border-amber-100 bg-amber-100/50">
          <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide mb-1">
            Oppgjør
          </p>
          <ul className="space-y-0.5">
            {settlements.map((s, i) => (
              <li key={i} className="text-xs text-amber-900">
                {s.from} → {s.to}:{" "}
                <span className="font-semibold">{kr(s.amountOre)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {participantNames.length === 0 ? (
        <p className="px-3 pb-2 text-[10px] text-amber-600">
          Meld deg på turen for å legge til utlegg.
        </p>
      ) : showForm ? (
        <form
          onSubmit={handleAdd}
          className="px-3 pb-3 pt-2 border-t border-amber-100 space-y-2"
        >
          <div className="flex gap-2">
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              aria-label="Betalt av"
              className="flex-1 border border-amber-200 rounded px-2 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {participantNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={amountKr}
              onChange={(e) => setAmountKr(e.target.value)}
              placeholder="Beløp (kr)"
              aria-label="Beløp i kroner"
              min="1"
              step="1"
              required
              className="w-28 border border-amber-200 rounded px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Hva ble kjøpt?"
            aria-label="Beskrivelse"
            maxLength={100}
            required
            className="w-full border border-amber-200 rounded px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <fieldset>
            <legend className="text-[10px] text-amber-700 font-medium mb-1">
              Deles av
            </legend>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {participantNames.map((n) => (
                <label
                  key={n}
                  className="flex items-center gap-1 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={sharedBy.has(n)}
                    onChange={() => toggleShared(n)}
                    className="accent-amber-600"
                    aria-label={n}
                  />
                  <span className="text-xs text-gray-700">{n}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p className="text-[10px] text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 text-xs py-1.5 rounded border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={adding}
              className="flex-1 text-xs py-1.5 rounded bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {adding ? "Lagrer…" : "Legg til"}
            </button>
          </div>
        </form>
      ) : (
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={openForm}
            className="text-[10px] px-2 py-1 rounded-full bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
          >
            + Legg til utlegg
          </button>
        </div>
      )}
    </div>
  );
}
