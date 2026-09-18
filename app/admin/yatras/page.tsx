'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AdminShell, Modal } from '@/components/admin/admin-shell';
import { staffApi, ADMIN_TOKEN } from '@/lib/staff-client';
import { formatINR, formatDate } from '@/lib/format';
import { ItineraryDay, ItineraryItem, YatraView } from '@/lib/domain/types';

const toDateInput = (iso: string) => (iso ? iso.slice(0, 10) : '');
const fromDateInput = (d: string) => (d ? new Date(d + 'T00:00:00.000Z').toISOString() : new Date().toISOString());
const linesToArr = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

type FormState = Record<string, string | number | boolean>;

export default function AdminYatrasPage() {
  const [yatras, setYatras] = useState<YatraView[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<YatraView | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({});
  const [arrays, setArrays] = useState({ highlights: '', included: '', excluded: '', importantInfo: '' });
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);

  const load = () => {
    setLoading(true);
    staffApi<{ yatras: YatraView[] }>(ADMIN_TOKEN, '/admin/yatras').then((d) => setYatras(d.yatras)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', subtitle: '', destination: '', description: '', heroImage: '', startDate: '', endDate: '', durationDays: 1, durationNights: 0, startingPoint: '', reportingLocation: '', reportingTime: '', price: 0, capacity: 0, featured: false, status: 'DRAFT', tcVersion: '1.0' });
    setArrays({ highlights: '', included: '', excluded: '', importantInfo: '' });
    setItinerary([]);
    setOpen(true);
  };
  const openEdit = (y: YatraView) => {
    setEditing(y);
    setForm({ name: y.name, subtitle: y.subtitle, destination: y.destination, description: y.description, heroImage: y.heroImage, startDate: toDateInput(y.startDate), endDate: toDateInput(y.endDate), durationDays: y.durationDays, durationNights: y.durationNights, startingPoint: y.startingPoint, reportingLocation: y.reportingLocation, reportingTime: y.reportingTime, price: y.price, capacity: y.capacity, featured: y.featured, status: y.status, tcVersion: y.tcVersion });
    setArrays({ highlights: y.highlights.join('\n'), included: y.included.join('\n'), excluded: y.excluded.join('\n'), importantInfo: y.importantInfo.join('\n') });
    setItinerary(y.itinerary.map((day) => ({ day: day.day, title: day.title, items: day.items.map((item) => ({ time: item.time || '', title: item.title, description: item.description || '' })) })));
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      ...form,
      startDate: fromDateInput(String(form.startDate)),
      endDate: fromDateInput(String(form.endDate || form.startDate)),
      durationDays: Number(form.durationDays), durationNights: Number(form.durationNights),
      price: Number(form.price), capacity: Number(form.capacity),
      highlights: linesToArr(arrays.highlights), included: linesToArr(arrays.included),
      excluded: linesToArr(arrays.excluded), importantInfo: linesToArr(arrays.importantInfo),
      itinerary: itinerary.map((day, index) => ({ ...day, day: index + 1, title: day.title.trim(), items: day.items.filter((item) => item.title.trim()).map((item) => ({ time: item.time.trim(), title: item.title.trim(), ...((item.description || '').trim() ? { description: (item.description || '').trim() } : {}) })) })).filter((day) => day.title || day.items.length),
    };
    try {
      if (editing) await staffApi(ADMIN_TOKEN, `/admin/yatras/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await staffApi(ADMIN_TOKEN, '/admin/yatras', { method: 'POST', body: JSON.stringify(payload) });
      toast.success(editing ? 'Yatra updated' : 'Yatra created');
      setOpen(false); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const togglePublish = async (y: YatraView) => {
    try { await staffApi(ADMIN_TOKEN, `/admin/yatras/${y.id}/publish`, { method: 'POST', body: JSON.stringify({ published: y.status !== 'PUBLISHED' }) }); load(); }
    catch { toast.error('Could not update status'); }
  };

  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const updateDay = (index: number, patch: Partial<ItineraryDay>) => setItinerary((days) => days.map((day, i) => i === index ? { ...day, ...patch } : day));
  const updateItem = (dayIndex: number, itemIndex: number, patch: Partial<ItineraryItem>) => setItinerary((days) => days.map((day, i) => i === dayIndex ? { ...day, items: day.items.map((item, j) => j === itemIndex ? { ...item, ...patch } : item) } : day));
  const addDay = () => setItinerary((days) => [...days, { day: days.length + 1, title: '', items: [{ time: '', title: '', description: '' }] }]);
  const addItem = (dayIndex: number) => setItinerary((days) => days.map((day, i) => i === dayIndex ? { ...day, items: [...day.items, { time: '', title: '', description: '' }] } : day));

  return (
    <AdminShell title="Yatras">
      <div className="mb-4 flex justify-end">
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-brand-saffronDark"><Plus className="h-4 w-4" /> New Yatra</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Yatra</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Capacity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (<tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>) :
            yatras.map((y) => (
              <tr key={y.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><img src={y.heroImage} alt="" className="h-10 w-10 rounded object-cover" /><span className="font-medium text-slate-900">{y.name}</span></div></td>
                <td className="px-4 py-3 text-slate-600">{formatDate(y.startDate)}</td>
                <td className="px-4 py-3 text-slate-600">{formatINR(y.price)}</td>
                <td className="px-4 py-3 text-slate-600">{y.booked}/{y.capacity}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${y.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{y.status}</span></td>
                <td className="px-4 py-3"><div className="flex gap-2">
                  <button onClick={() => openEdit(y)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title="Edit"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => togglePublish(y)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title={y.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}>{y.status === 'PUBLISHED' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Yatra' : 'Create Yatra'} wide>
        <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <In label="Name" v={form.name} on={(v) => set('name', v)} full />
          <In label="Subtitle" v={form.subtitle} on={(v) => set('subtitle', v)} full />
          <In label="Destination" v={form.destination} on={(v) => set('destination', v)} />
          <In label="Hero image URL" v={form.heroImage} on={(v) => set('heroImage', v)} />
          <Ta label="Description" v={form.description} on={(v) => set('description', v)} full />
          <In label="Start date" type="date" v={form.startDate} on={(v) => set('startDate', v)} />
          <In label="End date" type="date" v={form.endDate} on={(v) => set('endDate', v)} />
          <In label="Duration days" type="number" v={form.durationDays} on={(v) => set('durationDays', v)} />
          <In label="Duration nights" type="number" v={form.durationNights} on={(v) => set('durationNights', v)} />
          <In label="Starting point" v={form.startingPoint} on={(v) => set('startingPoint', v)} />
          <In label="Reporting location" v={form.reportingLocation} on={(v) => set('reportingLocation', v)} />
          <In label="Reporting time" v={form.reportingTime} on={(v) => set('reportingTime', v)} />
          <In label="Price (INR)" type="number" v={form.price} on={(v) => set('price', v)} />
          <In label="Capacity" type="number" v={form.capacity} on={(v) => set('capacity', v)} />
          <In label="T&C version" v={form.tcVersion} on={(v) => set('tcVersion', v)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured</label>
          <label className="text-sm">Status
            <select className="gy-input mt-1" value={String(form.status)} onChange={(e) => set('status', e.target.value)}><option value="DRAFT">DRAFT</option><option value="PUBLISHED">PUBLISHED</option></select>
          </label>
          <Ta label="Highlights (one per line)" v={arrays.highlights} on={(v) => setArrays((a) => ({ ...a, highlights: v }))} full />
          <Ta label="Included (one per line)" v={arrays.included} on={(v) => setArrays((a) => ({ ...a, included: v }))} />
          <Ta label="Excluded (one per line)" v={arrays.excluded} on={(v) => setArrays((a) => ({ ...a, excluded: v }))} />
          <Ta label="Important info (one per line)" v={arrays.importantInfo} on={(v) => setArrays((a) => ({ ...a, importantInfo: v }))} full />
          <div className="sm:col-span-2 rounded-xl border border-brand-sand bg-brand-cream/40 p-4">
            <div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold text-slate-900">Itinerary</h3><p className="text-xs text-slate-500">Add each travel day and its activities.</p></div><button type="button" onClick={addDay} className="inline-flex items-center gap-1 rounded-lg bg-brand-saffron px-3 py-2 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5" /> Add day</button></div>
            <div className="space-y-4">{itinerary.map((day, dayIndex) => <div key={dayIndex} className="rounded-lg border border-slate-200 bg-white p-3"><div className="flex items-end gap-2"><label className="flex-1 text-xs font-semibold text-slate-600">Day {dayIndex + 1} title<input className="gy-input mt-1" value={day.title} placeholder="Arrival in Tirupati" onChange={e=>updateDay(dayIndex,{title:e.target.value})} /></label><button type="button" className="mb-1 rounded-md px-2 py-2 text-xs text-red-600 hover:bg-red-50" onClick={()=>setItinerary(days=>days.filter((_,i)=>i!==dayIndex))}>Remove day</button></div><div className="mt-3 space-y-2">{day.items.map((item,itemIndex)=><div key={itemIndex} className="grid gap-2 rounded-md bg-slate-50 p-2 sm:grid-cols-[120px_1fr_auto]"><input className="gy-input" placeholder="09:00 AM" aria-label={`Day ${dayIndex+1} activity ${itemIndex+1} time`} value={item.time} onChange={e=>updateItem(dayIndex,itemIndex,{time:e.target.value})}/><div className="space-y-2"><input className="gy-input" placeholder="Activity title" aria-label={`Day ${dayIndex+1} activity ${itemIndex+1} title`} value={item.title} onChange={e=>updateItem(dayIndex,itemIndex,{title:e.target.value})}/><input className="gy-input" placeholder="Optional details" aria-label={`Day ${dayIndex+1} activity ${itemIndex+1} description`} value={item.description || ''} onChange={e=>updateItem(dayIndex,itemIndex,{description:e.target.value})}/></div><button type="button" className="self-start rounded-md px-2 py-2 text-xs text-red-600 hover:bg-red-100" onClick={()=>setItinerary(days=>days.map((d,i)=>i===dayIndex?{...d,items:d.items.filter((_,j)=>j!==itemIndex)}:d))}>Remove</button></div>)}<button type="button" onClick={()=>addItem(dayIndex)} className="text-xs font-semibold text-brand-saffronDark">+ Add activity</button></div></div>)}</div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-saffron px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
        </div>
      </Modal>
    </AdminShell>
  );
}

function In({ label, v, on, type = 'text', full }: { label: string; v: string | number | boolean; on: (v: string) => void; type?: string; full?: boolean }) {
  return <label className={`text-sm ${full ? 'sm:col-span-2' : ''}`}>{label}<input type={type} className="gy-input mt-1" value={String(v ?? '')} onChange={(e) => on(e.target.value)} /></label>;
}
function Ta({ label, v, on, full, mono }: { label: string; v: string | number | boolean; on: (v: string) => void; full?: boolean; mono?: boolean }) {
  return <label className={`text-sm ${full ? 'sm:col-span-2' : ''}`}>{label}<textarea rows={3} className={`gy-input mt-1 ${mono ? 'font-mono text-xs' : ''}`} value={String(v ?? '')} onChange={(e) => on(e.target.value)} /></label>;
}
