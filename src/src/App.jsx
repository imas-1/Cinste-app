import React, { useState, useEffect, useCallback } from "react";
import { Coins, Plus, LogOut, Users, Receipt, ArrowRight, X } from "lucide-react";

const GROUP_KEY = "cinsteGroupV2";
const ENTRIES_KEY = "cinsteEntriesV2";
const DEFAULT_MEMBERS = ["Gabi", "Ionuț", "Andrei", "Cristi"];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });
}

export default function CinsteApp() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState(DEFAULT_MEMBERS);
  const [entries, setEntries] = useState([]);
  const [me, setMe] = useState(null);
  const [newMemberName, setNewMemberName] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [err, setErr] = useState("");
  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved", "error"

  const [form, setForm] = useState({
    amount: "",
    targets: [], // array of names, empty means "toți"
    note: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const g = await window.storage.get(GROUP_KEY, true);
      if (g && g.value) {
        const parsed = JSON.parse(g.value);
        setMembers(parsed.members && parsed.members.length ? parsed.members : DEFAULT_MEMBERS);
      } else {
        await window.storage.set(GROUP_KEY, JSON.stringify({ members: DEFAULT_MEMBERS }), true);
      }
    } catch (e) {
      setMembers(DEFAULT_MEMBERS);
    }
    try {
      const e = await window.storage.get(ENTRIES_KEY, true);
      if (e && e.value) setEntries(JSON.parse(e.value));
      else setEntries([]);
    } catch (e) {
      setEntries([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveMembers(next) {
    setMembers(next);
    try {
      await window.storage.set(GROUP_KEY, JSON.stringify({ members: next }), true);
    } catch (e) {
      setErr("Nu am putut salva grupul.");
    }
  }

  async function saveEntries(next) {
    setEntries(next);
    setSaveStatus("saving");
    if (!window.storage || typeof window.storage.set !== "function") {
      setSaveStatus("error");
      setErr("Stocarea nu e disponibilă în acest artifact.");
      return;
    }
    try {
      const res = await window.storage.set(ENTRIES_KEY, JSON.stringify(next), true);
      if (!res) throw new Error("no result returned");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 1500);
    } catch (e) {
      setSaveStatus("error");
      setErr("Eroare salvare: " + (e && e.message ? e.message : String(e)));
    }
  }

  async function addMember() {
    const n = newMemberName.trim();
    if (!n) return;
    if (members.includes(n)) {
      setErr("Numele există deja.");
      return;
    }
    await saveMembers([...members, n]);
    setNewMemberName("");
    setShowAddMember(false);
    setErr("");
  }

  async function submitEntry() {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      setErr("Introdu o sumă validă.");
      return;
    }
    const others = members.filter((m) => m !== me);
    const chosen = form.targets.length > 0 ? form.targets : others;
    if (chosen.length === 0) {
      setErr("Alege cel puțin o persoană.");
      return;
    }
    const isSplit = chosen.length > 1;
    const share = isSplit ? Math.round((amt / chosen.length) * 100) / 100 : amt;
    const newEntries = chosen.map((target) => ({
      id: uid(),
      from: me,
      to: target,
      amount: share,
      totalAmount: amt,
      splitAll: isSplit,
      splitCount: chosen.length,
      note: form.note.trim(),
      date: new Date().toISOString(),
    }));
    await saveEntries([...newEntries, ...entries]);
    setForm({ amount: "", targets: [], note: "" });
    setShowAddEntry(false);
    setErr("");
  }

  async function deleteEntry(id) {
    await saveEntries(entries.filter((e) => e.id !== id));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-900 font-serif text-lg tracking-wide animate-pulse">
          se deschide caietul de cinste…
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <LoginScreen
        members={members}
        onPick={setMe}
        onAddMember={() => setShowAddMember(true)}
        showAddMember={showAddMember}
        newMemberName={newMemberName}
        setNewMemberName={setNewMemberName}
        addMember={addMember}
        closeAdd={() => {
          setShowAddMember(false);
          setErr("");
        }}
        err={err}
      />
    );
  }

  const received = entries.filter((e) => e.to === me);
  const given = entries.filter((e) => e.from === me);
  const totalReceived = received.reduce((s, e) => s + e.amount, 0);
  const totalGiven = given.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-24">
      {/* Header */}
      <div className="border-b border-gray-300 px-5 pt-6 pb-5 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Caietul de cinste</p>
            <h1 className="font-serif text-2xl font-semibold text-gray-900 mt-0.5">
              Salut, {me}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === "saving" && (
              <span className="text-[11px] text-gray-500">se salvează…</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-[11px] text-green-600">salvat ✓</span>
            )}
            {saveStatus === "error" && (
              <span className="text-[11px] text-red-600">eroare</span>
            )}
            <button
              onClick={() => setMe(null)}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-full border border-gray-300"
            >
              <LogOut size={14} /> Ieși
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-gray-500">Ai primit</p>
            <p className="font-serif text-2xl font-semibold text-amber-600 mt-1">
              {totalReceived.toFixed(0)} lei
            </p>
          </div>
          <div className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-gray-500">Ai dat</p>
            <p className="font-serif text-2xl font-semibold text-gray-900 mt-1">
              {totalGiven.toFixed(0)} lei
            </p>
          </div>
        </div>
      </div>

      {err && (
        <div className="mx-5 mt-4 text-sm text-red-600 bg-red-50 border border-red-300 rounded-xl px-4 py-2.5">
          {err}
        </div>
      )}

      {/* Received */}
      <Section title="Cinste primită" icon={<Coins size={16} />} empty="Nimeni nu ți-a făcut cinste încă." items={received} deleteEntry={null} />

      {/* Given */}
      <Section title="Cinste dată" icon={<Receipt size={16} />} empty="Nu ai făcut cinste nimănui încă." items={given} deleteEntry={deleteEntry} givenView />

      {/* Group members */}
      <div className="px-5 mt-8">
        <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-3">
          <Users size={14} /> Grup ({members.length})
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <span
              key={m}
              className={`text-sm px-3 py-1.5 rounded-full border ${
                m === me
                  ? "border-amber-500 text-amber-600 bg-amber-500/10"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddEntry(true)}
        className="fixed bottom-6 right-6 bg-amber-500 text-gray-900 rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-black/40 active:scale-95 transition-transform"
        aria-label="Adaugă cinste"
      >
        <Plus size={26} />
      </button>

      {showAddEntry && (
        <AddEntryModal
          me={me}
          members={members}
          form={form}
          setForm={setForm}
          onSubmit={submitEntry}
          onClose={() => {
            setShowAddEntry(false);
            setErr("");
          }}
        />
      )}
    </div>
  );
}

function Section({ title, icon, empty, items, deleteEntry, givenView }) {
  return (
    <div className="px-5 mt-7">
      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-3">
        {icon} {title}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 italic">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <div
              key={e.id}
              className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5 flex-wrap">
                  {givenView ? (
                    <>
                      <span>lui {e.to}</span>
                      <ArrowRight size={12} className="text-gray-500" />
                    </>
                  ) : (
                    <>
                      <span>{e.from}</span>
                      <ArrowRight size={12} className="text-gray-500" />
                      <span>ție</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDate(e.date)}
                  {e.splitAll ? ` · din ${e.totalAmount.toFixed(0)} lei împărțit la grup` : ""}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-serif text-lg font-semibold text-amber-600">
                  {e.amount.toFixed(0)} lei
                </span>
                {deleteEntry && (
                  <button
                    onClick={() => deleteEntry(e.id)}
                    className="text-gray-500 hover:text-red-600 transition-colors"
                    aria-label="Șterge"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoginScreen({
  members,
  onPick,
  showAddMember,
  newMemberName,
  setNewMemberName,
  addMember,
  closeAdd,
  err,
}) {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col items-center justify-center px-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .font-serif { font-family: 'Fraunces', serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
      `}</style>
      <Coins size={34} className="text-amber-600 mb-3" />
      <h1 className="font-serif text-3xl font-semibold text-gray-900">Caietul de cinste</h1>
      <p className="text-gray-500 text-sm mt-2 text-center max-w-xs">
        Cine ești tu din grup? Alege-ți numele ca să vezi ce cinste ai primit și cui i-ai făcut.
      </p>

      <div className="mt-8 w-full max-w-xs space-y-2">
        {members.map((m) => (
          <button
            key={m}
            onClick={() => onPick(m)}
            className="w-full text-left px-4 py-3 rounded-2xl border border-gray-300 hover:border-amber-500 hover:bg-gray-50 transition-colors flex items-center justify-between"
          >
            <span className="font-medium">{m}</span>
            <ArrowRight size={16} className="text-gray-500" />
          </button>
        ))}
      </div>

      {!showAddMember ? (
        <button
          onClick={onPick.bind(null, null) && null}
          className="hidden"
        />
      ) : null}

      <AddMemberBlock
        showAddMember={showAddMember}
        newMemberName={newMemberName}
        setNewMemberName={setNewMemberName}
        addMember={addMember}
        closeAdd={closeAdd}
        err={err}
      />
    </div>
  );
}

function AddMemberBlock({ showAddMember, newMemberName, setNewMemberName, addMember, closeAdd, err }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 w-full max-w-xs">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full text-sm text-gray-500 hover:text-amber-600 transition-colors flex items-center justify-center gap-1.5 py-2"
        >
          <Plus size={14} /> Nu ești în listă? Adaugă-te
        </button>
      ) : (
        <div className="rounded-2xl border border-gray-300 bg-gray-50 p-4">
          <input
            autoFocus
            value={newMemberName}
            onChange={(ev) => setNewMemberName(ev.target.value)}
            onKeyDown={(ev) => ev.key === "Enter" && addMember()}
            placeholder="Numele tău"
            className="w-full bg-transparent border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500"
          />
          {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
          <div className="flex gap-2 mt-3">
            <button
              onClick={addMember}
              className="flex-1 bg-amber-500 text-gray-900 text-sm font-medium rounded-xl py-2"
            >
              Adaugă
            </button>
            <button
              onClick={() => {
                setOpen(false);
                closeAdd();
              }}
              className="px-4 text-sm text-gray-500 rounded-xl border border-gray-300"
            >
              Renunță
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddEntryModal({ me, members, form, setForm, onSubmit, onClose }) {
  const others = members.filter((m) => m !== me);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-20 px-0 sm:px-4">
      <div className="bg-gray-50 border border-gray-300 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-5 pb-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-gray-900">Fă cinste</h2>
          <button onClick={onClose} className="text-gray-500">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Sumă (lei)</p>
        <input
          type="number"
          inputMode="decimal"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          placeholder="ex: 80"
          className="w-full bg-transparent border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 text-lg font-serif focus:outline-none focus:border-amber-500 mb-4"
        />

        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Cui</p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setForm({ ...form, mode: "all", target: "" })}
            className={`flex-1 py-2 rounded-xl text-sm border ${
              form.mode === "all"
                ? "border-amber-500 text-amber-600 bg-amber-500/10"
                : "border-gray-300 text-gray-600"
            }`}
          >
            La toată gașca
          </button>
          <button
            onClick={() => setForm({ ...form, mode: "one" })}
            className={`flex-1 py-2 rounded-xl text-sm border ${
              form.mode === "one"
                ? "border-amber-500 text-amber-600 bg-amber-500/10"
                : "border-gray-300 text-gray-600"
            }`}
          >
            Unei singure persoane
          </button>
        </div>

        {form.mode === "one" && (
          <div className="flex flex-wrap gap-2 mb-4">
            {others.map((m) => (
              <button
                key={m}
                onClick={() => setForm({ ...form, target: m })}
                className={`px-3 py-1.5 rounded-full text-sm border ${
                  form.target === m
                    ? "border-amber-500 text-amber-600 bg-amber-500/10"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {form.mode === "all" && others.length > 0 && form.amount && (
          <p className="text-xs text-gray-500 mb-4">
            Se împarte egal: {(parseFloat(form.amount || 0) / others.length).toFixed(1)} lei ×{" "}
            {others.length} persoane
          </p>
        )}

        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Notă (opțional)</p>
        <input
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="ex: bere la terasă"
          className="w-full bg-transparent border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 mb-5"
        />

        <button
          onClick={onSubmit}
          className="w-full bg-amber-500 text-gray-900 font-medium rounded-xl py-3"
        >
          Salvează cinstea
        </button>
      </div>
    </div>
  );
}
