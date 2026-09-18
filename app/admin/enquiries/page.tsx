'use client';
import {useEffect,useState} from 'react';
import {AdminShell} from '@/components/admin/admin-shell';
import {staffApi,ADMIN_TOKEN} from '@/lib/staff-client';
type Enquiry={id:string;fullName:string;mobile:string;email?:string;message:string;createdAt:string};
export default function Enquiries(){const [rows,setRows]=useState<Enquiry[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');useEffect(()=>{staffApi<{enquiries:Enquiry[]}>(ADMIN_TOKEN,'/admin/enquiries').then(d=>setRows(d.enquiries)).catch(()=>setError('Could not load enquiries')).finally(()=>setLoading(false));},[]);return <AdminShell title="Enquiries">{loading?<p>Loading enquiries…</p>:error?<p role="alert">{error}</p>:!rows.length?<p>No enquiries yet.</p>:<div className="space-y-4">{rows.map(e=><article key={e.id} className="rounded-xl bg-white p-5"><h2 className="font-semibold">{e.fullName}</h2><p>{e.mobile} · {e.email}</p><p className="whitespace-pre-wrap mt-3">{e.message}</p><time className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()}</time></article>)}</div>}</AdminShell>;}
