import crypto from 'node:crypto';
import { getTermsRepository } from '@/lib/repositories/terms.repository';
import { Yatra } from '@/lib/domain/types';
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function getTerms(y:Yatra,version=y.tcVersion) {
 const repo=getTermsRepository(); const existing=await repo.find(y.id,version);
 if(existing) return existing;
 if(version!==y.tcVersion) throw new Error('Terms version not found');
 const html=termsHtml(escapeHtml(y.name),escapeHtml(y.tcVersion));
 return repo.create({id:crypto.randomUUID(),yatraId:y.id,version:y.tcVersion,html,contentHash:crypto.createHash('sha256').update(html).digest('hex')});
}
function termsHtml(yatraName: string, version: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Terms & Conditions \u00b7 ${yatraName}</title>
<style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 20px;color:#26190f;line-height:1.7}
h1{font-size:28px}h2{font-size:18px;margin-top:28px}small{color:#7a6a58}
.badge{display:inline-block;background:#D9761E;color:#fff;padding:4px 12px;border-radius:999px;font-family:Arial;font-size:12px}
button{margin-top:24px;background:#D9761E;color:#fff;border:0;padding:10px 18px;border-radius:8px;font-size:14px;cursor:pointer}
@media print{button{display:none}}</style></head>
<body>
<span class="badge">GokulamYatras</span>
<h1>Terms &amp; Conditions</h1>
<small>${yatraName} \u00b7 Version ${version}</small>
<h2>1. Booking &amp; Payment</h2><p>All bookings are subject to availability and are confirmed only upon successful payment. Prices are per traveller in Indian Rupees.</p>
<h2>2. Travellers &amp; Identification</h2><p>Every traveller must carry a valid government-issued photo identification. Details provided at booking must match the identification presented at reporting.</p>
<h2>3. Itinerary Changes</h2><p>GokulamYatras may adjust the itinerary, timings or accommodation due to weather, temple administration, or circumstances beyond our control, while preserving the spirit of the yatra.</p>
<h2>4. Cancellation &amp; Refunds</h2><p>Cancellation charges apply based on the notice period before departure. Certain third-party costs may be non-refundable.</p>
<h2>5. Conduct &amp; Safety</h2><p>Travellers are expected to follow coordinator instructions and temple guidelines. GokulamYatras is not liable for losses arising from a traveller's failure to comply.</p>
<h2>6. Health</h2><p>Travellers should disclose medical conditions relevant to the journey. Some yatras involve treks or high altitudes requiring reasonable fitness.</p>
<h2>7. Consent</h2><p>By accepting these Terms &amp; Conditions during booking, you confirm you have read and understood them for this specific yatra and version.</p>
<button onclick="window.print()">Print / Save as PDF</button>
</body></html>`;
}

