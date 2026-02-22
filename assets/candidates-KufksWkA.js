import{l as g,b}from"./utils-BsX6Nj1N.js";import{f as h,s as E,p as $}from"./filter-engine-9wJXWWGS.js";const u=25;let p=[],f="",l="total_raised",c="desc",r=1;async function S(){try{p=await g("candidates-list.json");const t=await g("summary-all-races.json").then(n=>n.totals.total_contributions).catch(()=>null);L(p.length,t),v(),i()}catch(t){console.error("Failed to load candidates:",t),document.getElementById("error-banner").classList.remove("hidden")}}function L(t,n){const o=document.getElementById("coverage-note");if(o)if(n){const e=(t/n*100).toFixed(0);o.textContent=`Showing ${t.toLocaleString()} candidates with itemized contributions. Approximately ${e}% of total contributions are attributed to named candidates.`}else o.textContent=`Showing ${t.toLocaleString()} candidates with itemized contributions.`}function v(){var o,e;const t=document.getElementById("search-input");t&&t.addEventListener("input",a=>{f=a.target.value,r=1,i()}),document.querySelectorAll("[data-sort]").forEach(a=>{a.addEventListener("click",()=>{const s=a.dataset.sort;l===s?c=c==="desc"?"asc":"desc":(l=s,c=s==="name"?"asc":"desc"),r=1,i()})}),(o=document.getElementById("prev-btn"))==null||o.addEventListener("click",()=>{r>1&&(r--,i())}),(e=document.getElementById("next-btn"))==null||e.addEventListener("click",()=>{const{totalPages:a}=m();r<a&&(r++,i())})}function m(){const t=h(p,{query:f}),n=E(t,{field:l,dir:c});return $(n,{page:r,perPage:u})}function i(){const{items:t,totalPages:n,totalItems:o,page:e}=m();B(t),w(e,n,o),C()}function B(t){const n=document.getElementById("candidates-body");if(!n)return;if(t.length===0){n.innerHTML='<tr><td colspan="6" class="py-10 text-center text-gray-500">No candidates match your search.</td></tr>';return}const o="/follow-the-money-in/".replace(/\/$/,"");n.innerHTML=t.map(e=>`
        <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
            <td class="py-3 px-4">
                <a href="${o}/candidate.html?id=${encodeURIComponent(e.id)}"
                   class="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                    ${d(I(e.name))}
                </a>
            </td>
            <td class="py-3 px-4 text-right font-mono text-green-400">${b(e.total_raised)}</td>
            <td class="py-3 px-4 text-left text-gray-300">${e.office?d(e.office):'<span class="text-gray-600">—</span>'}</td>
            <td class="py-3 px-4 text-left text-gray-300">${e.district?d(e.district):'<span class="text-gray-600">—</span>'}</td>
            <td class="py-3 px-4 text-right text-gray-300">${e.total_contributions.toLocaleString()}</td>
            <td class="py-3 px-4 text-center">
                <span class="inline-block px-2 py-0.5 rounded text-xs uppercase tracking-wide
                    ${e.source==="fec"?"bg-purple-900 text-purple-300":"bg-blue-900 text-blue-300"}">
                    ${d(e.source)}
                </span>
            </td>
        </tr>
    `).join("")}function w(t,n,o){const e=document.getElementById("pagination-info"),a=document.getElementById("prev-btn"),s=document.getElementById("next-btn");if(e){const y=(t-1)*u+1,x=Math.min(t*u,o);e.textContent=o>0?`Showing ${y}–${x} of ${o.toLocaleString()}`:"No results"}a&&(a.disabled=t<=1),s&&(s.disabled=t>=n)}function C(){document.querySelectorAll("[data-sort]").forEach(t=>{const n=t.dataset.sort,o=t.querySelector(".sort-indicator");o&&(n===l?o.textContent=c==="desc"?" ↓":" ↑":o.textContent="")})}function d(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function I(t){return t.toLowerCase().replace(/\b\w/g,n=>n.toUpperCase())}S();
