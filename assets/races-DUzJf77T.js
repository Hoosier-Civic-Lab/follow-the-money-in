import{l as d,b as u}from"./utils-BsX6Nj1N.js";const f="/follow-the-money-in/".replace(/\/$/,"");let s=[],a="total_raised",c="desc";async function g(){var t,r,e;try{s=await d("races-list.json"),m(),s.length===0?(t=document.getElementById("empty-state"))==null||t.classList.remove("hidden"):((r=document.getElementById("races-table-container"))==null||r.classList.remove("hidden"),p(),l())}catch(o){console.error("Failed to load races:",o),(e=document.getElementById("error-banner"))==null||e.classList.remove("hidden")}}function m(){const t=document.getElementById("coverage-note");t&&(s.length===0?t.textContent="No enriched races available. Run the candidate enrichment pipeline to populate this page.":t.textContent=`Showing ${s.length.toLocaleString()} race${s.length!==1?"s":""} with candidate office data.`)}function p(){document.querySelectorAll("[data-sort]").forEach(t=>{t.addEventListener("click",()=>{const r=t.dataset.sort;a===r?c=c==="desc"?"asc":"desc":(a=r,c=r==="office"?"asc":"desc"),l()})})}function l(){const t=y(s);h(t),b()}function y(t){return[...t].sort((r,e)=>{let o=r[a],n=e[a];return a==="total_raised"?(o=parseFloat(o)||0,n=parseFloat(n)||0):a==="total_contributions"||a==="candidate_count"?(o=Number(o)||0,n=Number(n)||0):(o=String(o||"").toLowerCase(),n=String(n||"").toLowerCase()),o<n?c==="asc"?-1:1:o>n?c==="asc"?1:-1:0})}function h(t){const r=document.getElementById("races-body");r&&(r.innerHTML=t.map(e=>`
        <tr class="border-b border-gray-700 hover:bg-gray-750 transition-colors">
            <td class="py-3 px-4">
                <a href="${f}/race.html?id=${encodeURIComponent(e.id)}"
                   class="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                    ${i(e.office)}
                </a>
            </td>
            <td class="py-3 px-4 text-gray-300">${e.district?i(e.district):'<span class="text-gray-600">—</span>'}</td>
            <td class="py-3 px-4 text-right font-mono text-green-400">${u(e.total_raised)}</td>
            <td class="py-3 px-4 text-right text-gray-300">${e.total_contributions.toLocaleString()}</td>
            <td class="py-3 px-4 text-right text-gray-300">${e.candidate_count}</td>
        </tr>
    `).join(""))}function b(){document.querySelectorAll("[data-sort]").forEach(t=>{const r=t.dataset.sort,e=t.querySelector(".sort-indicator");e&&(e.textContent=r===a?c==="desc"?" ↓":" ↑":"")})}function i(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}g();
