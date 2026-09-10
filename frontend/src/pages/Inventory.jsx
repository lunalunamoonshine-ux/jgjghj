import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PackagePlus, Trash2, AlertTriangle, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Inventory() {
  const [ings, setIngs] = useState([]);
  const [moves, setMoves] = useState([]);
  const [usage, setUsage] = useState([]);
  const [tab, setTab] = useState("stock");
  const { user } = useAuth();
  const mgr = ["admin", "manager"].includes(user?.role);

  const load = useCallback(async () => {
    const [i, m, u] = await Promise.all([api.get("/ingredients"), api.get("/inventory/movements?limit=40"), api.get("/inventory/usage")]);
    setIngs(i.data); setMoves(m.data); setUsage(u.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (ing, type) => {
    const qty = parseFloat(prompt(`${type === "restock" ? "Restock" : "Wastage"} qty (${ing.unit})`));
    if (!qty || qty <= 0) return;
    const extra = type === "wastage" ? { reason: prompt("Reason", "spillage") || "" } : { note: prompt("Note", "supplier delivery") || "" };
    await api.post(`/ingredients/${ing.id}/${type}`, { qty, ...extra });
    toast.success(`${type === "restock" ? "Restocked" : "Wastage logged"}: ${ing.name} ${qty}${ing.unit}`);
    load();
  };

  const addIng = async () => {
    const name = prompt("Ingredient name"); if (!name) return;
    const unit = prompt("Unit (ml / g / pcs)", "ml");
    const qty = parseFloat(prompt("Opening qty", "0") || "0");
    const par = parseFloat(prompt("Par level (low-stock threshold)", "0") || "0");
    await api.post("/ingredients", { name, unit, qty, par_level: par });
    toast.success("Ingredient added"); load();
  };

  const lowCount = ings.filter((i) => i.low).length;

  return (
    <div data-testid="inventory-management-panel">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display font-black text-3xl">Inventory</h1>
          <p className="text-xs font-mono text-[var(--muted)] uppercase tracking-widest mt-1">
            auto-deduct on paid sale · log every restock & spill or counts drift
            {lowCount > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-[var(--rose)]/15 text-[var(--rose)] font-bold" data-testid="low-stock-count">{lowCount} LOW</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 bg-[var(--surface-2)] rounded-lg">
            {[["stock", "Stock"], ["moves", "Log"], ["usage", "Usage"]].map(([k, l]) => (
              <button key={k} data-testid={`inv-tab-${k}`} onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${tab === k ? "bg-[var(--cyan)] text-black" : "text-[var(--muted)]"}`}>{l}</button>
            ))}
          </div>
          {mgr && <button data-testid="add-ingredient-btn" onClick={addIng} className="btn-neon px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={16} /> Ingredient</button>}
        </div>
      </div>

      {tab === "stock" && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
          {ings.map((i) => (
            <div key={i.id} data-testid={`ingredient-${i.id}`} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{i.name}</span>
                  {i.low && <span className="px-2 py-0.5 rounded-full bg-[var(--rose)]/15 text-[var(--rose)] text-[9px] font-mono font-bold uppercase flex items-center gap-1" data-testid={`low-badge-${i.id}`}><AlertTriangle size={10} /> Low</span>}
                </div>
                <div className="text-xs font-mono text-[var(--muted)]">par {i.par_level}{i.unit}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`font-mono font-bold text-lg ${i.low ? "text-[var(--rose)]" : ""}`} data-testid={`ing-qty-${i.id}`}>
                  {i.qty}<span className="text-xs text-[var(--muted)] ml-0.5">{i.unit}</span>
                </span>
                <button data-testid={`restock-${i.id}`} onClick={() => act(i, "restock")}
                  className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-xs font-bold flex items-center gap-1"><PackagePlus size={12} /> Restock</button>
                <button data-testid={`wastage-${i.id}`} onClick={() => act(i, "wastage")}
                  className="px-3 py-1.5 rounded-lg bg-[var(--rose)]/15 text-[var(--rose)] text-xs font-bold flex items-center gap-1"><Trash2 size={12} /> Wastage</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "moves" && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
          {moves.map((m) => (
            <div key={m.id} className="p-3 flex justify-between text-sm">
              <span>{m.name} <span className="text-[var(--muted)] text-xs">· {m.type} · {m.by}{m.ref ? ` · ${String(m.ref).slice(0, 20)}` : ""}</span></span>
              <span className={`font-mono font-bold ${m.delta < 0 ? "text-[var(--rose)]" : "text-[var(--emerald)]"}`}>{m.delta > 0 ? "+" : ""}{m.delta}</span>
            </div>
          ))}
          {moves.length === 0 && <div className="p-8 text-center text-[var(--muted)] text-sm">No movements yet</div>}
        </div>
      )}

      {tab === "usage" && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
          <div className="p-3 grid grid-cols-3 text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]"><span>Ingredient</span><span>Sold</span><span>Wasted</span></div>
          {usage.map((u) => (
            <div key={u.ingredient_id} className="p-3 grid grid-cols-3 text-sm">
              <span className="font-medium">{u.name}</span>
              <span className="font-mono text-[var(--amber)]">{u.sold}</span>
              <span className="font-mono text-[var(--rose)]">{u.wasted}</span>
            </div>
          ))}
          {usage.length === 0 && <div className="p-8 text-center text-[var(--muted)] text-sm">No usage yet — pay a sale first</div>}
        </div>
      )}
    </div>
  );
}
