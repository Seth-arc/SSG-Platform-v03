const m="Blue Team Action Details",d=Object.freeze(["Diplomatic","Informational","Military","Economic"]),b=Object.freeze(["Sanctions","Export Controls","Investment Screening","Trade Measures","Financial Restrictions","Industrial Policy","Infrastructure Access"]),g=Object.freeze(["Biotechnology","Agriculture","Telecommunications","Other"]),E=Object.freeze(["Extraction","Refinement","Distribution","Advanced Manufacturing"]),O=Object.freeze(["Legislative","Executive Order","Other"]),T=Object.freeze(["PRC","Russia","EU","France","UK","ROK","ASEAN","Japan"]),A=Object.freeze(["3 months","6 months","12 months"]),_=Object.freeze(["Legislative","Executive"]),I=Object.freeze(["Corporate","Allied"]);function i(e){return typeof e=="string"?e.replace(/\s+/g," ").trim():""}function l(e=[]){return Array.isArray(e)?e.map(r=>i(r)).filter(Boolean):[]}function u(e={}){return Array.isArray(e.targets)?e.targets:e.target?[e.target]:[]}function v(e={}){const r=l(e.coordinated),t=l(e.informed);return[m,`Objective: ${i(e.objective)}`,`Lever: ${i(e.lever)}`,`Implementation: ${i(e.implementation)}`,`Enforcement Timeline: ${i(e.enforcementTimeline)}`,`Coordinated: ${r.length?r.join(", "):"None selected"}`,`Informed: ${t.length?t.join(", "):"None selected"}`].join(`
`)}function p(e=""){if(typeof e!="string"||!e.startsWith(m))return null;try{const r=e.slice(m.length).split(`
`).map(s=>s.trim()).filter(Boolean),t=Object.fromEntries(r.map(s=>{const c=s.indexOf(":");return c===-1?null:[s.slice(0,c).trim(),s.slice(c+1).trim()]}).filter(Boolean)),o=t.Coordinated==="None selected"?"":t.Coordinated,n=t.Informed==="None selected"?"":t.Informed;return{objective:i(t.Objective),lever:i(t.Lever),implementation:i(t.Implementation),enforcementTimeline:i(t["Enforcement Timeline"]),coordinated:l(o?o.split(","):[]),informed:l(n?n.split(","):[])}}catch{return null}}function N(e={}){const r=p(e.ally_contingencies);return{hasBlueActionDetails:!!r,title:e.goal||e.title||"Untitled action",objective:(r==null?void 0:r.objective)||i(e.description),instrumentOfPower:e.mechanism||"",lever:(r==null?void 0:r.lever)||"",sector:e.sector||"",supplyChainFocus:e.exposure_type||"",implementation:(r==null?void 0:r.implementation)||"",focusCountries:u(e),enforcementTimeline:(r==null?void 0:r.enforcementTimeline)||"",expectedOutcomes:e.expected_outcomes||e.description||"",coordinated:(r==null?void 0:r.coordinated)||[],informed:(r==null?void 0:r.informed)||[],legacyNotes:r?"":i(e.ally_contingencies)}}function y(e=[],r="Not specified"){return Array.isArray(e)&&e.length?e.join(", "):r}function a(e={}){const r=e.created_at||e.updated_at||"",t=new Date(r).getTime();return Number.isFinite(t)?t:0}function h(e=[],r={}){if(!(r!=null&&r.team)||!(r!=null&&r.move))return null;const o=[...e||[]].filter(n=>(n==null?void 0:n.team)===r.team&&(n==null?void 0:n.move)===r.move).sort((n,s)=>{const c=a(n)-a(s);return c!==0?c:String((n==null?void 0:n.id)||"").localeCompare(String((s==null?void 0:s.id)||""))}).findIndex(n=>(n==null?void 0:n.id)===r.id);return o===-1?null:o+1}function S(e=[],r="",t=null){return!r||!t?null:e.filter(o=>(o==null?void 0:o.team)===r&&(o==null?void 0:o.move)===t).length+1}function C({teamLabel:e="Team",move:r=null,actionNumber:t=null}={}){const o=r?`Move ${r}`:"Move",n=t?`Action ${t}`:"Action";return`${e} | ${o} | ${n}`}const f="https://tribestreetjournal.com/";function L({title:e="Tribe Street Journal live site"}={}){return`
        <div class="card card-bordered" style="padding: var(--space-3); margin-bottom: var(--space-4);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-3); flex-wrap: wrap;">
                <div>
                    <h3 class="text-sm" style="margin: 0 0 var(--space-1); font-weight: 600;">tribestreetjournal.com</h3>
                    <p class="text-xs text-gray-500" style="margin: 0;">
                        Embedded live view of Tribe Street Journal. If the site is blocked from loading in a frame,
                        use the direct link to open it in a new tab.
                    </p>
                </div>
                <a
                    class="btn btn-secondary btn-sm"
                    href="${f}"
                    target="_blank"
                    rel="noopener noreferrer"
                >Open in new tab</a>
            </div>
            <div style="border: 1px solid var(--color-gray-200, #e5e7eb); border-radius: 12px; overflow: hidden; background: #ffffff; min-height: 640px;">
                <iframe
                    src="${f}"
                    title="${e}"
                    loading="lazy"
                    referrerpolicy="strict-origin-when-cross-origin"
                    style="display: block; width: 100%; min-height: 640px; height: 70vh; border: 0; background: #ffffff;"
                ></iframe>
            </div>
        </div>
    `}export{g as B,f as T,N as a,y as b,L as c,S as d,O as e,C as f,h as g,T as h,_ as i,I as j,d as k,b as l,E as m,A as n,v as s};
//# sourceMappingURL=tribeStreetJournalEmbed-BL4UxpzV.js.map
