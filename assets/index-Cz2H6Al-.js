import{l,f as p,a as d,b as m}from"./utils-BlWKg9bF.js";import{c as b,a as f}from"./chart-helpers-N1I38Jz2.js";async function g(){try{const[a,t,e]=await Promise.all([l("metadata.json"),l("summary-all-races.json"),l("candidates-list.json")]);y(a),h(t,e),x(t),C(t),$(e)}catch(a){console.error("Failed to load data:",a),document.getElementById("error-banner").classList.remove("hidden")}}function y(a){const t=document.getElementById("status-bar");if(!t)return;const e=p(a.last_updated);t.textContent=`Last updated: ${e}`}function h(a,t){const{totals:e}=a;i("stat-total-raised",d(e.total_raised,!0)),i("stat-total-contributions",d(e.total_contributions)),i("stat-itemized-pct",`${(e.total_itemized/e.total_contributions*100).toFixed(1)}%`),i("stat-unique-candidates",t.length.toLocaleString())}function x(a){const t=document.getElementById("chart-contributor-type");if(!t)return;const e=a.by_contributor_type,s=["individual","corporate","committee","self","unitemized"],o=[],r=[];for(const n of s)e[n]&&(o.push(n.charAt(0).toUpperCase()+n.slice(1)),r.push(e[n].count));for(const[n,c]of Object.entries(e))s.includes(n)||(o.push(n),r.push(c.count));b(t,{labels:o,values:r})}function C(a){const t=document.getElementById("chart-contribution-size");if(!t)return;const e=a.by_contribution_size,s=["small","medium","large","mega"],o={small:"Small (<$100)",medium:"Medium (<$1K)",large:"Large (<$10K)",mega:"Mega (≥$10K)"},r=[],n=[];for(const c of s)e[c]&&(r.push(o[c]||c),n.push(e[c].count));f(t,{labels:r,values:n,label:"Contributions"})}function $(a){const t=document.getElementById("top10-body");if(!t)return;const e=a.slice(0,10),s="/follow-the-money-in/".replace(/\/$/,"");t.innerHTML=e.map((o,r)=>`
        <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
            <td class="py-3 px-4 text-gray-400 text-sm">${r+1}</td>
            <td class="py-3 px-4">
                <a href="${s}/candidate.html?id=${encodeURIComponent(o.id)}" class="text-blue-400 hover:text-blue-300 font-medium">
                    ${u(_(o.name))}
                </a>
            </td>
            <td class="py-3 px-4 text-right font-mono text-green-400">${m(o.total_raised)}</td>
            <td class="py-3 px-4 text-right text-gray-300">${o.total_contributions.toLocaleString()}</td>
            <td class="py-3 px-4 text-center">
                <span class="inline-block px-2 py-0.5 rounded text-xs uppercase tracking-wide
                    ${o.source==="fec"?"bg-purple-900 text-purple-300":"bg-blue-900 text-blue-300"}">
                    ${u(o.source)}
                </span>
            </td>
        </tr>
    `).join("")}function i(a,t){const e=document.getElementById(a);e&&(e.textContent=t)}function u(a){return String(a).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function _(a){return a.toLowerCase().replace(/\b\w/g,t=>t.toUpperCase())}g();
