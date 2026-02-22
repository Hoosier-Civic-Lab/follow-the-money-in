import{l as g,b}from"./utils-BsX6Nj1N.js";import{f as h,s as $,p as E}from"./filter-engine-9wJXWWGS.js";const u=25;let p=[],f="",l="total_raised",d="desc",o=1;async function L(){try{p=await g("candidates-list.json");const t=await g("summary-all-races.json").then(n=>n.totals.total_contributions).catch(()=>null);S(p.length,t),w(),i()}catch(t){console.error("Failed to load candidates:",t),document.getElementById("error-banner").classList.remove("hidden")}}function S(t,n){const a=document.getElementById("coverage-note");if(a)if(n){const e=(t/n*100).toFixed(0);a.textContent=`Showing ${t.toLocaleString()} candidates with itemized contributions. Approximately ${e}% of total contributions are attributed to named candidates.`}else a.textContent=`Showing ${t.toLocaleString()} candidates with itemized contributions.`}function w(){var a,e;const t=document.getElementById("search-input");t&&t.addEventListener("input",r=>{f=r.target.value,o=1,i()}),document.querySelectorAll("[data-sort]").forEach(r=>{r.addEventListener("click",()=>{const s=r.dataset.sort;l===s?d=d==="desc"?"asc":"desc":(l=s,d=s==="name"?"asc":"desc"),o=1,i()})}),(a=document.getElementById("prev-btn"))==null||a.addEventListener("click",()=>{o>1&&(o--,i())}),(e=document.getElementById("next-btn"))==null||e.addEventListener("click",()=>{const{totalPages:r}=m();o<r&&(o++,i())})}function m(){const t=h(p,{query:f}),n=$(t,{field:l,dir:d});return E(n,{page:o,perPage:u})}function i(){const{items:t,totalPages:n,totalItems:a,page:e}=m();B(t),C(e,n,a),v()}function B(t){const n=document.getElementById("candidates-body");if(!n)return;if(t.length===0){n.innerHTML='<tr><td colspan="7" class="py-10 text-center text-gray-500">No candidates match your search.</td></tr>';return}const a="/follow-the-money-in/".replace(/\/$/,"");n.innerHTML=t.map(e=>`
        <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
            <td class="py-3 px-4">
                <a href="${a}/candidate.html?id=${encodeURIComponent(e.id)}"
                   class="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                    ${c(I(e.name))}
                </a>
            </td>
            <td class="py-3 px-4 text-right font-mono text-green-400">${b(e.total_raised)}</td>
            <td class="py-3 px-4 text-left text-gray-300">${e.office?c(e.office):'<span class="text-gray-600">—</span>'}</td>
            <td class="py-3 px-4 text-left text-gray-300">${e.district?c(e.district):'<span class="text-gray-600">—</span>'}</td>
            <td class="py-3 px-4 text-left">${P(e.party)}</td>
            <td class="py-3 px-4 text-right text-gray-300">${e.total_contributions.toLocaleString()}</td>
            <td class="py-3 px-4 text-center">
                <span class="inline-block px-2 py-0.5 rounded text-xs uppercase tracking-wide
                    ${e.source==="fec"?"bg-purple-900 text-purple-300":"bg-blue-900 text-blue-300"}">
                    ${c(e.source)}
                </span>
            </td>
        </tr>
    `).join("")}function C(t,n,a){const e=document.getElementById("pagination-info"),r=document.getElementById("prev-btn"),s=document.getElementById("next-btn");if(e){const x=(t-1)*u+1,y=Math.min(t*u,a);e.textContent=a>0?`Showing ${x}–${y} of ${a.toLocaleString()}`:"No results"}r&&(r.disabled=t<=1),s&&(s.disabled=t>=n)}function v(){document.querySelectorAll("[data-sort]").forEach(t=>{const n=t.dataset.sort,a=t.querySelector(".sort-indicator");a&&(n===l?a.textContent=d==="desc"?" ↓":" ↑":a.textContent="")})}function c(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function I(t){return t.toLowerCase().replace(/\b\w/g,n=>n.toUpperCase())}function P(t){return t?`<span class="inline-block px-2 py-0.5 rounded text-xs ${t.toLowerCase().startsWith("rep")?"bg-red-900 text-red-300":t.toLowerCase().startsWith("dem")?"bg-blue-900 text-blue-300":"bg-gray-700 text-gray-300"}">${c(t)}</span>`:'<span class="text-gray-600">—</span>'}L();
