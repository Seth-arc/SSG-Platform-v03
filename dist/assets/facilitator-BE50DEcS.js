import{s as x,x as ge,c as ve,a as f,n as te,m as ye,E as C,h as be,q as Se,r as O,t as k,y as q,u as I,f as b,d as $,j as L,F as se,G as re,H as ae,I as Ee,J as xe,K as Ae,L as Te,M as Ce,B as Oe,P as oe,N as ie,Q as ne,S as Re,U as Ie,V as $e}from"./main-CrkhqxlT.js";import{s as M,a as J}from"./Modal-O3kyaPUL.js";import{f as G,g as Le,c as H,b as le,d as K,a as j}from"./formatting-Tb8JsuUF.js";import{g as _e,d as Pe,f as ce,a as de,b as z,B as pe,e as ue,h as we,i as De,j as Ne,k as Fe,l as Be,m as qe,n as Me,s as We,T as He,c as je}from"./tribeStreetJournalEmbed-BL4UxpzV.js";import{a as Y,g as Ue,c as me,W as he,d as ke}from"./targeting-BfH83-vM.js";import{a as Ge}from"./validation-DpvMuYhw.js";const A=Object.freeze({UNREAD:"unread",ACKNOWLEDGED:"acknowledged",RESPONDED:"responded",DECLINED:"declined",IGNORED:"ignored"});A.ACKNOWLEDGED,A.RESPONDED,A.DECLINED,A.IGNORED;function ze(m=null){return m!=null&&m.metadata&&typeof m.metadata=="object"?m.metadata:{}}function Ve(m=null){if(!m||typeof m!="object")return null;const e=typeof m.status=="string"?m.status.trim().toLowerCase():"";return!e||!Object.values(A).includes(e)?null:{...m,status:e}}function Je(m=null){return Ve(ze(m).proposal_recipient_state)}function fe(m=null){var e;return((e=Je(m))==null?void 0:e.status)||A.UNREAD}function Ke(m=[]){return!Array.isArray(m)||m.length===0?0:m.reduce((e,t)=>fe(t)===A.UNREAD?e+1:e,0)}function Ye(m){switch(m){case A.ACKNOWLEDGED:return"Acknowledged";case A.RESPONDED:return"Responded";case A.DECLINED:return"Declined";case A.IGNORED:return"Ignored";case A.UNREAD:default:return"Unread"}}const S=ve("Facilitator"),Qe=new Set(["NOTE","MOMENT","QUOTE"]),Ze=20,w=3;function Z(m={}){return(m==null?void 0:m.created_at)||(m==null?void 0:m.updated_at)||(m==null?void 0:m.timestamp)||null}function V(m={}){const e=Z(m);if(!e)return 0;const t=new Date(e).getTime();return Number.isFinite(t)?t:0}function Xe(m={},e=null){var s;const t=(m==null?void 0:m.type)??(m==null?void 0:m.event_type)??null;return!!e&&(m==null?void 0:m.team)===e&&Qe.has(t)&&((s=m==null?void 0:m.metadata)==null?void 0:s.source)!=="notetaker_save"}function et(m=[],e=null){return[...m||[]].filter(t=>Xe(t,e)).sort((t,s)=>V(s)-V(t)).slice(0,Ze)}function tt({role:m,teamContext:e,observerTeamId:t=null}){return m===e.facilitatorRole?{allowed:!0,readOnly:!1,reason:null,roleSurface:"facilitator"}:m===e.scribeRole?{allowed:!0,readOnly:!1,reason:null,roleSurface:"scribe"}:m===C.ROLES.VIEWER&&t===e.teamId?{allowed:!0,readOnly:!0,reason:null,roleSurface:"viewer"}:m===C.ROLES.VIEWER?{allowed:!1,readOnly:!0,reason:"observer-team-mismatch",observerTeamId:t}:{allowed:!1,readOnly:!1,reason:"role-mismatch"}}class st{constructor(){this.actions=[],this.rfis=[],this.responses=[],this.receivedProposals=[],this.journalEntries=[],this.journalUpdates=[],this.verbaAiUpdates=[],this.timelineEvents=[],this.storeUnsubscribers=[],this.role=x.getRole(),this.roleSurface=null,this.isReadOnly=!1,this.teamContext=ge(),this.teamId=this.teamContext.teamId,this.teamLabel=this.teamContext.teamLabel}async init(){var r,a,i,o;S.info("Initializing Facilitator interface");const e=x.getSessionId();if(!e){f({message:"No session found. Please join a session first.",type:"error"}),setTimeout(()=>{te("")},2e3);return}this.role=x.getRole()||((r=x.getSessionData())==null?void 0:r.role);const t=((a=x.getSessionData())==null?void 0:a.team)||null,s=tt({role:this.role,teamContext:this.teamContext,observerTeamId:t});if(!s.allowed){const n=s.reason==="observer-team-mismatch"&&s.observerTeamId?ye(C.ROLES.VIEWER,{observerTeamId:s.observerTeamId}):"";f({message:s.reason==="observer-team-mismatch"?"Observer access is limited to the team selected when you joined the session.":`This page is only available to the ${this.teamLabel} Facilitator or Scribe role.`,type:"error"}),te(n||"",{replace:!0});return}this.isReadOnly=s.readOnly,this.roleSurface=s.roleSurface||null,await be.initialize(e,{participantId:((o=(i=x).getSessionParticipantId)==null?void 0:o.call(i))||null}),this.configureAccessMode(),this.bindEventListeners(),this.subscribeToLiveData(),this.syncActionsFromStore(),this.syncRfisFromStore(),this.syncResponsesFromStores(),this.syncReceivedProposalsFromStore(),this.syncWhiteCellUpdateSectionsFromStore(),this.syncTimelineFromStore(),S.info("Facilitator interface initialized")}isAllowedRole(e){return e===this.teamContext.facilitatorRole||e===this.teamContext.scribeRole||e===C.ROLES.VIEWER}isScribeSeat(){return(this.role||x.getRole())===this.teamContext.scribeRole}getCurrentLeadRole(){return this.isScribeSeat()?this.teamContext.scribeRole:this.teamContext.facilitatorRole}getCurrentLeadLabel(){return this.isScribeSeat()?this.teamContext.scribeLabel:this.teamContext.facilitatorLabel}getCurrentLeadSurfaceLabel(){return this.isScribeSeat()?"Scribe":"Facilitator"}configureAccessMode(){const e=document.getElementById("sessionRoleLabel"),t=document.getElementById("facilitatorModeNotice"),s=document.querySelectorAll('[data-write-control="true"]'),r=document.querySelector(".header-title"),a=document.getElementById("captureNavItem"),i=document.getElementById("captureSection"),o=document.querySelector("#actionsSection .section-description"),n=document.querySelector("#requestsSection .section-description"),l=document.querySelector("#responsesSection .section-description"),c=document.querySelector("#tribeStreetJournalSection .section-description"),h=document.querySelector("#verbaAiSection .section-description"),d=document.querySelector("#timelineSection .section-description");if(document.body.dataset.facilitatorMode=this.isReadOnly?"observer":this.isScribeSeat()?"scribe":"facilitator",e&&(e.textContent=this.isReadOnly?"Observer":this.getCurrentLeadSurfaceLabel()),r&&(r.textContent=this.isReadOnly?this.teamContext.observerLabel:this.getCurrentLeadLabel()),s.forEach(u=>{var p;u.hidden=this.isReadOnly,u.toggleAttribute("aria-hidden",this.isReadOnly),(p=u.querySelectorAll)==null||p.call(u,"button, input, select, textarea").forEach(g=>{g.disabled=this.isReadOnly,g.toggleAttribute("aria-disabled",this.isReadOnly)})}),a&&(a.hidden=this.isReadOnly),i&&this.isReadOnly&&(i.style.display="none"),o){const u=this.teamId==="green",p=this.teamId==="red";this.isReadOnly?u?o.textContent="Passive observer view of team proposals. Drafts are visible but cannot be created, edited, sent, or deleted.":p?o.textContent="Passive observer view of move responses. Entries are visible but cannot be created, edited, submitted, or deleted.":o.textContent="Passive observer view of facilitator actions. Drafts are visible but cannot be created, edited, submitted, or deleted.":u?o.textContent="Draft proposals and send them to the Blue or Red team.":p?o.textContent="Respond to Blue Team moves. White Cell reviews each response before it takes effect.":o.textContent="Draft actions, submit them to White Cell, and track adjudication results."}n&&(n.textContent=this.isReadOnly?"Passive observer view of RFIs and responses. Request submission is disabled in observer mode.":"Submit questions to White Cell and monitor the response status."),l&&(l.textContent=this.isReadOnly?"Passive feed of White Cell responses to this team.":"View responses to your RFIs and communications"),c&&(c.textContent=this.isReadOnly?"Passive feed of White Cell journal updates plus the latest team notes, moments, and quotes captured during the exercise.":"Review White Cell journal updates plus the latest team notes, moments, and quotes captured during the exercise."),h&&(h.textContent=this.isReadOnly?"Passive feed of White Cell Verba AI population sentiment updates.":"Review White Cell Verba AI population sentiment updates."),d&&(d.textContent=this.isReadOnly?"Passive session activity feed for the selected team.":"Chronological view of all events"),t&&(this.isReadOnly?(t.style.display="block",t.innerHTML=`
                    <h2 class="font-semibold mb-2">Observer Mode</h2>
                    <p class="text-sm text-gray-600">
                        This page is passive for the observer role. You can review facilitator actions,
                        White Cell responses, RFIs, and the timeline, but create, edit, submit, delete,
                        and capture paths are blocked in code and hidden in the interface.
                    </p>
                `):(t.style.display="none",t.innerHTML=""))}bindEventListeners(){var a;const e=document.getElementById("newActionBtn"),t=document.getElementById("newRfiBtn"),s=document.getElementById("captureForm");if(this.isReadOnly){e==null||e.setAttribute("aria-disabled","true"),t==null||t.setAttribute("aria-disabled","true"),(a=s==null?void 0:s.querySelectorAll)==null||a.call(s,"button, input, select, textarea").forEach(i=>{i.disabled=!0,i.setAttribute("aria-disabled","true")});return}e==null||e.addEventListener("click",()=>this.showCreateActionModal()),t==null||t.addEventListener("click",()=>this.showCreateRfiModal()),s==null||s.addEventListener("submit",i=>this.handleCaptureSubmit(i));const r=document.getElementById("receivedProposalsList");r==null||r.addEventListener("click",i=>{const o=i.target.closest("button[data-proposal-action]");if(!o||o.disabled)return;const n=o.dataset.proposalAction,l=o.dataset.proposalCommId;if(!n||!l)return;const c=this.receivedProposals.find(d=>d.id===l);if(!c)return;const h=this.handleReceivedProposalAction(n,c);h&&typeof h.catch=="function"&&h.catch(d=>{S.error("Failed to handle received proposal action:",d)})})}requireWriteAccess(){return this.isReadOnly?(f({message:"Observer mode is read-only on the facilitator page.",type:"error"}),!1):!0}getCurrentGameState(){var e;return Se.getState()||((e=x.getSessionData())==null?void 0:e.gameState)||{move:1,phase:1}}getBlueActionSequenceContext(e=null){const t=this.getCurrentGameState(),s=(e==null?void 0:e.move)||t.move||1,r=e!=null&&e.id?_e(this.actions,e):Pe(this.actions,this.teamId,s);return{move:s,actionNumber:r,label:ce({teamLabel:this.teamLabel,move:s,actionNumber:r})}}subscribeToLiveData(){this.storeUnsubscribers.push(O.subscribe(()=>{this.syncActionsFromStore()})),this.storeUnsubscribers.push(k.subscribe(()=>{this.syncRfisFromStore(),this.syncResponsesFromStores()})),this.storeUnsubscribers.push(q.subscribe(()=>{this.syncResponsesFromStores(),this.syncReceivedProposalsFromStore(),this.syncWhiteCellUpdateSectionsFromStore()})),this.storeUnsubscribers.push(I.subscribe(()=>{this.syncTimelineFromStore()}))}syncActionsFromStore(){this.actions=O.getByTeam(this.teamId),this.renderActionsList();const e=document.getElementById("actionsBadge");e&&(e.textContent=this.actions.length.toString())}syncRfisFromStore(){this.rfis=k.getByTeam(this.teamId),this.renderRfiList();const e=document.getElementById("rfiBadge");e&&(e.textContent=this.rfis.filter(t=>t.status==="pending").length.toString())}syncResponsesFromStores(){const e=k.getByTeam(this.teamId).filter(s=>s.status==="answered"&&s.response).map(s=>({id:s.id,kind:"rfi",created_at:s.responded_at||s.updated_at||s.created_at,title:s.query||s.question||"RFI response",content:s.response,status:s.status,priority:s.priority})),t=q.getAll().filter(s=>Y(s,this.teamContext)&&(s==null?void 0:s.type)!=="PROPOSAL_FORWARDED"&&!Ue(s)).map(s=>({id:s.id,kind:"communication",created_at:s.created_at,title:this.formatCommunicationTarget(s.to_role),content:s.content,type:s.type||"MESSAGE"}));this.responses=[...e,...t].sort((s,r)=>new Date(r.created_at)-new Date(s.created_at)),this.renderResponsesList()}syncReceivedProposalsFromStore(){this.receivedProposals=q.getAll().filter(e=>(e==null?void 0:e.type)==="PROPOSAL_FORWARDED"&&Y(e,this.teamContext)).sort((e,t)=>new Date(t.created_at)-new Date(e.created_at)),this.renderReceivedProposals()}syncWhiteCellUpdateSectionsFromStore(){const e=q.getAll().filter(t=>Y(t,this.teamContext)).sort((t,s)=>new Date(s.created_at)-new Date(t.created_at));this.journalUpdates=e.filter(t=>me(t,he.TRIBE_STREET_JOURNAL)),this.verbaAiUpdates=e.filter(t=>me(t,he.VERBA_AI_POPULATION_SENTIMENT)),this.renderTribeStreetJournalList(),this.renderVerbaAiList()}renderReceivedProposals(){const e=document.getElementById("receivedProposalsList"),t=document.getElementById("receivedProposalsBadge");if(t){const i=Ke(this.receivedProposals);t.textContent=i,t.hidden=i===0}if(!e)return;if(this.receivedProposals.length===0){e.innerHTML='<p class="text-sm text-gray-500">No proposals received yet.</p>';return}const s=i=>this.escapeHtml(i),r=i=>Array.isArray(i)&&i.length?i.join(", "):"Not specified",a=i=>{switch(i){case A.ACKNOWLEDGED:return"var(--color-success)";case A.RESPONDED:return"var(--color-primary-500)";case A.DECLINED:return"var(--color-error)";case A.IGNORED:return"var(--color-text-muted)";case A.UNREAD:default:return"var(--color-info-600)"}};e.innerHTML=this.receivedProposals.map(i=>{const o=i!=null&&i.metadata&&typeof i.metadata=="object"?i.metadata:{},n=o.proposal&&typeof o.proposal=="object"?o.proposal:{},l=n.title||"Untitled proposal",c=o.source_team||"green",h=c==="green"?"Green Team":c==="blue"?"Blue Team":c==="red"?"Red Team":c,d=o.outcome||"APPROVED",u=i.created_at,p=fe(i),g=Ye(p),v=p===A.UNREAD,E=s(i.id);return`
                <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-3); ${v?"border-left: 3px solid var(--color-info-600);":""}">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: flex-start; margin-bottom: var(--space-2);">
                        <div>
                            <p class="text-xs text-gray-500" style="margin: 0 0 2px; text-transform: uppercase; letter-spacing: 0.05em;">Forwarded from ${s(h)} · ${s(d)}</p>
                            <h3 class="font-semibold" style="margin: 0;">${s(l)}</h3>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;">
                            <span style="font-size: var(--text-xs); font-weight: var(--font-semibold); text-transform: uppercase; letter-spacing: 0.05em; color: ${a(p)};">${s(g)}</span>
                            <span class="text-xs text-gray-400">${s(G(u))}</span>
                        </div>
                    </div>
                    <dl style="display: grid; grid-template-columns: auto 1fr; column-gap: var(--space-3); row-gap: 4px; margin: var(--space-3) 0; font-size: var(--text-sm);">
                        <dt style="color: var(--color-text-muted); font-weight: var(--font-semibold);">Originators</dt>
                        <dd style="margin: 0;">${s(r(n.originators))}</dd>
                        <dt style="color: var(--color-text-muted); font-weight: var(--font-semibold);">Category</dt>
                        <dd style="margin: 0;">${s(n.category||"Not specified")}</dd>
                        <dt style="color: var(--color-text-muted); font-weight: var(--font-semibold);">Intended Partners</dt>
                        <dd style="margin: 0;">${s(n.intendedPartners||"Not specified")}</dd>
                        <dt style="color: var(--color-text-muted); font-weight: var(--font-semibold);">Focus Sector</dt>
                        <dd style="margin: 0;">${s(n.focusSector||"Not specified")}</dd>
                        <dt style="color: var(--color-text-muted); font-weight: var(--font-semibold);">Delivery</dt>
                        <dd style="margin: 0;">${s(n.delivery||"Not specified")}</dd>
                    </dl>
                    ${n.objective?`
                        <p class="text-sm" style="margin: 0 0 var(--space-2);"><strong>Objective:</strong> ${s(n.objective)}</p>
                    `:""}
                    ${n.timingAndConditions?`
                        <p class="text-sm" style="margin: 0 0 var(--space-2);"><strong>Timing &amp; Conditions:</strong> ${s(n.timingAndConditions)}</p>
                    `:""}
                    ${n.expectedOutcomes?`
                        <p class="text-sm" style="margin: 0 0 var(--space-3);"><strong>Expected Outcomes:</strong> ${s(n.expectedOutcomes)}</p>
                    `:""}
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; padding-top: var(--space-3); border-top: 1px solid var(--color-border-light);">
                        <button type="button" class="btn btn-secondary btn-sm" data-proposal-action="acknowledge" data-proposal-comm-id="${E}">Acknowledge</button>
                        <button type="button" class="btn btn-primary btn-sm" data-proposal-action="respond" data-proposal-comm-id="${E}">Respond</button>
                        <button type="button" class="btn btn-secondary btn-sm" data-proposal-action="decline" data-proposal-comm-id="${E}">Decline</button>
                        <button type="button" class="btn btn-secondary btn-sm" data-proposal-action="ignore" data-proposal-comm-id="${E}">Ignore</button>
                    </div>
                </div>
            `}).join("")}async persistProposalRecipientStatus(e,t,{timelineType:s,toastMessage:r,extraMetadata:a={},successMessage:i=null}={}){var n,l,c,h,d,u;if(!this.requireWriteAccess())return!1;if(!(e!=null&&e.id))return f({message:"Proposal not found.",type:"error"}),!1;let o=null;try{o=await b.updateProposalRecipientStatus(e.id,t,a),q.updateFromServer("UPDATE",o)}catch(p){return S.error("Failed to persist proposal recipient status:",p),f({message:p.message||"Failed to update proposal status",type:"error"}),!1}if(s)try{const p=x.getSessionId(),g=this.getCurrentGameState(),v=((l=(n=o==null?void 0:o.metadata)==null?void 0:n.proposal)==null?void 0:l.title)||((h=(c=e==null?void 0:e.metadata)==null?void 0:c.proposal)==null?void 0:h.title)||"Untitled proposal",E=await b.createTimelineEvent({session_id:p,type:s,content:`${i||r||"Proposal status updated"}: ${v}`,metadata:{related_id:((d=o==null?void 0:o.metadata)==null?void 0:d.source_proposal_id)||((u=e==null?void 0:e.metadata)==null?void 0:u.source_proposal_id)||null,role:this.role||this.getCurrentLeadRole(),communication_id:(o==null?void 0:o.id)||e.id,recipient_team:this.teamId,status:t,...a},team:this.teamId,move:g.move??1,phase:g.phase??1});I.updateFromServer("INSERT",E)}catch(p){S.error(`Failed to log ${t} timeline event:`,p)}return r&&f({message:r,type:"success"}),!0}handleReceivedProposalAction(e,t){switch(e){case"acknowledge":return this.persistProposalRecipientStatus(t,A.ACKNOWLEDGED,{timelineType:"PROPOSAL_ACKNOWLEDGED",toastMessage:"Proposal acknowledged"});case"decline":return this.persistProposalRecipientStatus(t,A.DECLINED,{timelineType:"PROPOSAL_DECLINED",toastMessage:"Proposal declined"});case"ignore":return this.persistProposalRecipientStatus(t,A.IGNORED,{timelineType:"PROPOSAL_IGNORED",toastMessage:"Proposal ignored"});case"respond":return this.showProposalResponseModal(t);default:return Promise.resolve(!1)}}showProposalResponseModal(e){var a,i;if(!this.requireWriteAccess())return Promise.resolve(!1);const t=((i=(a=e==null?void 0:e.metadata)==null?void 0:a.proposal)==null?void 0:i.title)||"Untitled proposal",s=document.createElement("div");s.innerHTML=`
            <form id="proposalResponseForm" novalidate>
                <p class="text-sm text-gray-500" style="margin: 0 0 var(--space-3);">
                    Responding to: <strong>${this.escapeHtml(t)}</strong><br>
                    Your response will be sent to White Cell for review.
                </p>
                <div class="form-group">
                    <label class="form-label" for="proposalResponseText">Response *</label>
                    <textarea
                        id="proposalResponseText"
                        class="form-input form-textarea"
                        rows="5"
                        placeholder="Your response..."
                    ></textarea>
                </div>
            </form>
        `;const r={current:null};return r.current=M({title:"Respond to Proposal",content:s,size:"md",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Send Response",variant:"primary",onClick:()=>{var n,l;const o=(l=(n=s.querySelector("#proposalResponseText"))==null?void 0:n.value)==null?void 0:l.trim();return o?(this.submitProposalResponse(e,o,r.current).catch(c=>{S.error("Failed to send proposal response:",c)}),!1):(f({message:"Response text is required.",type:"error"}),!1)}}]}),Promise.resolve(!0)}async submitProposalResponse(e,t,s){var a,i,o,n,l;const r=x.getSessionId();if(!r){f({message:"No session found",type:"error"});return}$({message:"Sending response..."});try{const c=this.getCurrentGameState(),h=((i=(a=e==null?void 0:e.metadata)==null?void 0:a.proposal)==null?void 0:i.title)||"Untitled proposal",d=await b.createCommunication({session_id:r,from_role:this.role||this.getCurrentLeadRole(),to_role:"white_cell",type:"PROPOSAL_RESPONSE",content:t,metadata:{source_proposal_id:((o=e==null?void 0:e.metadata)==null?void 0:o.source_proposal_id)||null,source_communication_id:e.id,source_team:((n=e==null?void 0:e.metadata)==null?void 0:n.source_team)||null,responder_team:this.teamId}});q.updateFromServer("INSERT",d);const u=await b.updateProposalRecipientStatus(e.id,A.RESPONDED,{response_communication_id:d.id,responded_at:new Date().toISOString()});q.updateFromServer("UPDATE",u);const p=await b.createTimelineEvent({session_id:r,type:"PROPOSAL_RESPONDED",content:`Responded to proposal: ${h}`,metadata:{related_id:((l=e==null?void 0:e.metadata)==null?void 0:l.source_proposal_id)||null,role:this.role||this.getCurrentLeadRole(),communication_id:e.id,response_communication_id:d.id,recipient_team:this.teamId,status:A.RESPONDED},team:this.teamId,move:c.move??1,phase:c.phase??1});I.updateFromServer("INSERT",p),f({message:"Response sent to White Cell",type:"success"}),s==null||s.close(),this.renderReceivedProposals()}catch(c){S.error("Failed to send proposal response:",c),f({message:c.message||"Failed to send response",type:"error"})}finally{L()}}syncTimelineFromStore(){const e=I.getAll().filter(t=>ke(t,this.teamContext)).slice(0,50);this.timelineEvents=e,this.journalEntries=et(e,this.teamId),this.renderTimeline(),this.renderTribeStreetJournalList()}renderActionsList(){const e=document.getElementById("actionsList");if(e){if(this.actions.length===0){e.innerHTML=`
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">
                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">No Actions Yet</h3>
                    <p class="empty-state-message">
                        ${this.isReadOnly?"No facilitator actions have been created yet.":"Create your first strategic action to start the draft to White Cell review flow."}
                    </p>
                </div>
            `;return}e.innerHTML=this.actions.map(t=>this.renderActionCard(t)).join(""),e.querySelectorAll(".edit-action-btn").forEach(t=>{t.addEventListener("click",()=>{const s=this.actions.find(r=>r.id===t.dataset.actionId);s&&this.showEditActionModal(s)})}),e.querySelectorAll(".submit-action-btn").forEach(t=>{t.addEventListener("click",()=>{const s=this.actions.find(r=>r.id===t.dataset.actionId);s&&this.confirmSubmitAction(s)})}),e.querySelectorAll(".delete-action-btn").forEach(t=>{t.addEventListener("click",()=>{const s=this.actions.find(r=>r.id===t.dataset.actionId);s&&this.confirmDeleteAction(s)})})}}renderActionCard(e){const t=de(e),s=t.title,r=t.expectedOutcomes||"No expected outcomes",a=z(t.focusCountries),i=this.isBlueTeamActionWizardEnabled(e)?this.getBlueActionSequenceContext(e).label:`Move ${e.move||1} | Phase ${e.phase||1}`,o=e.status||C.ACTION_STATUS.DRAFT,n=!this.isReadOnly&&se(e),l=!this.isReadOnly&&re(e),c=!this.isReadOnly&&ae(e),h=e.outcome?Le(e.outcome).outerHTML:"",d=t.hasBlueActionDetails&&t.enforcementTimeline?H({text:t.enforcementTimeline,variant:"info",size:"sm",rounded:!0}).outerHTML:le(e.priority||"NORMAL").outerHTML,u=t.hasBlueActionDetails?`
                ${t.objective?`
                    <p class="text-xs text-gray-500" style="margin-bottom: var(--space-2);">
                        <strong>Objective:</strong> ${this.escapeHtml(t.objective)}
                    </p>
                `:""}
                <p class="text-xs text-gray-500" style="margin-bottom: var(--space-2);">
                    <strong>Lever:</strong> ${this.escapeHtml(t.lever||"Not specified")} |
                    <strong>Implementation:</strong> ${this.escapeHtml(t.implementation||"Not specified")} |
                    <strong>Supply Chain Focus:</strong> ${this.escapeHtml(t.supplyChainFocus||"Not specified")}
                </p>
                <p class="text-xs text-gray-500">
                    <strong>Focus Countries:</strong> ${this.escapeHtml(a)} |
                    <strong>Sector:</strong> ${this.escapeHtml(t.sector||"Not specified")} |
                    <strong>Timeline:</strong> ${this.escapeHtml(t.enforcementTimeline||"Not specified")}
                </p>
                <p class="text-xs text-gray-500" style="margin-top: var(--space-2);">
                    <strong>Coordinated:</strong> ${this.escapeHtml(z(t.coordinated,"None selected"))} |
                    <strong>Informed:</strong> ${this.escapeHtml(z(t.informed,"None selected"))}
                </p>
            `:`
                ${e.ally_contingencies?`
                    <p class="text-xs text-gray-500" style="margin-bottom: var(--space-2);">
                        <strong>Ally Contingencies:</strong> ${this.escapeHtml(e.ally_contingencies)}
                    </p>
                `:""}
                <p class="text-xs text-gray-500">
                    <strong>Targets:</strong> ${this.escapeHtml(a)} |
                    <strong>Sector:</strong> ${this.escapeHtml(e.sector||"Not specified")} |
                    <strong>Exposure:</strong> ${this.escapeHtml(e.exposure_type||"Not specified")}
                </p>
            `;let p=`
            <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                Draft actions can be edited, submitted, or deleted by the active team-lead seat.
            </p>
        `;return Ee(e)?p=`
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    Submitted to White Cell ${e.submitted_at?G(e.submitted_at):""}.
                    This action is now read-only for facilitator and scribe seats until adjudication.
                </p>
            `:xe(e)?p=`
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    White Cell adjudicated this action ${e.adjudicated_at?G(e.adjudicated_at):""}.
                </p>
            `:this.isReadOnly&&(p=`
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    Observer mode is read-only. Draft actions are visible but cannot be changed from this page.
                </p>
            `),`
            <div class="card card-bordered" data-action-id="${e.id}" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-3);">
                    <div>
                        <h3 class="card-title">${this.escapeHtml(s)}</h3>
                        <p class="card-subtitle text-sm text-gray-500">
                            ${this.escapeHtml(e.mechanism||"No mechanism")} | ${this.escapeHtml(i)}
                        </p>
                    </div>
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: flex-end;">
                        ${K(o).outerHTML}
                        ${d}
                        ${h}
                    </div>
                </div>

                <div class="card-body">
                    <p class="text-sm mb-3">${this.escapeHtml(r)}</p>
                    ${u}
                    ${e.adjudication_notes?`
                        <p class="text-xs text-gray-500" style="margin-top: var(--space-2);">
                            <strong>Adjudication Notes:</strong> ${this.escapeHtml(e.adjudication_notes)}
                        </p>
                    `:""}
                    ${p}
                </div>

                ${n||l||c?`
                    <div class="card-actions" style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
                        ${n?`
                            <button class="btn btn-secondary btn-sm edit-action-btn" data-action-id="${e.id}">
                                Edit Draft
                            </button>
                        `:""}
                        ${l?`
                            <button class="btn btn-primary btn-sm submit-action-btn" data-action-id="${e.id}">
                                Submit to White Cell
                            </button>
                        `:""}
                        ${c?`
                            <button class="btn btn-ghost btn-sm text-error delete-action-btn" data-action-id="${e.id}">
                                Delete Draft
                            </button>
                        `:""}
                    </div>
                `:""}
            </div>
        `}showCreateActionModal(){if(!this.requireWriteAccess())return;if(this.isBlueTeamActionWizardEnabled()){this.showBlueActionWizard();return}if(this.isGreenTeamProposalEnabled()){this.showGreenProposalModal();return}if(this.isRedTeamResponseEnabled()){this.showRedResponseModal();return}const e=this.createActionFormContent(),t={current:null};t.current=M({title:"Create New Action",content:e,size:"lg",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Save Draft",variant:"primary",onClick:()=>(this.handleCreateAction(t.current).catch(s=>{S.error("Failed to create action:",s)}),!1)}]})}showEditActionModal(e){if(!this.requireWriteAccess())return;if(!se(e)){f({message:"Only draft actions can be edited.",type:"error"});return}if(this.isBlueTeamActionWizardEnabled(e)){this.showBlueActionWizard(e);return}if(this.isGreenTeamProposalEnabled(e)){this.showGreenProposalModal(e);return}if(this.isRedTeamResponseEnabled(e)){this.showRedResponseModal(e);return}const t=this.createActionFormContent(e),s={current:null};s.current=M({title:"Edit Draft Action",content:t,size:"lg",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Save Changes",variant:"primary",onClick:()=>(this.handleUpdateAction(s.current,e.id).catch(r=>{S.error("Failed to update action:",r)}),!1)}]})}isBlueTeamActionWizardEnabled(e=null){return this.teamId==="blue"&&(!e||!e.team||e.team===this.teamId)}isGreenTeamProposalEnabled(e=null){return this.teamId==="green"&&(!e||!e.team||e.team===this.teamId)}isRedTeamResponseEnabled(e=null){return this.teamId==="red"&&(!e||!e.team||e.team===this.teamId)}showRedResponseModal(e=null){const t=!!(e!=null&&e.id),s=this.createRedResponseContent(e||{},{isEdit:t}),r={current:null};r.current=M({title:t?"Edit Move Response":"New Move Response",content:s,size:"xl"}),this.bindRedResponseModal(s,r.current,{actionId:(e==null?void 0:e.id)||null,isEdit:t})}createRedResponseContent(e={},{isEdit:t=!1}={}){const s=document.createElement("div"),r=Ae(e),a=r.title==="Untitled response"?"":r.title;return s.innerHTML=`
            <form id="redResponseForm" novalidate>
                <div class="form-group">
                    <label class="form-label" for="responseTitle">Response Title *</label>
                    <input
                        id="responseTitle"
                        class="form-input"
                        type="text"
                        placeholder="Enter a concise title for this response"
                        value="${this.escapeHtml(a)}"
                        maxlength="200"
                    >
                </div>

                <div class="form-group">
                    <label class="form-label" for="responseStrategicAssessment">Strategic Assessment *</label>
                    <textarea
                        id="responseStrategicAssessment"
                        class="form-input form-textarea"
                        rows="4"
                        placeholder="What is Blue (and partners) trying to achieve this move? What patterns, priorities, or vulnerabilities do you assess?"
                    >${this.escapeHtml(r.strategicAssessment)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="responseStrategy">Response Strategy *</label>
                    <textarea
                        id="responseStrategy"
                        class="form-input form-textarea"
                        rows="3"
                        placeholder="What is your overarching approach this move? (Deter, Disrupt, Shape, etc.)"
                    >${this.escapeHtml(r.responseStrategy)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="responseKeyActions">Key Actions *</label>
                    <textarea
                        id="responseKeyActions"
                        class="form-input form-textarea"
                        rows="4"
                        placeholder="What specific actions are you taking in response?"
                    >${this.escapeHtml(r.keyActions)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="responseTargets">Targets / Pressure Points *</label>
                    <textarea
                        id="responseTargets"
                        class="form-input form-textarea"
                        rows="3"
                        placeholder="Who or what are you trying to influence?"
                    >${this.escapeHtml(r.targetsAndPressurePoints)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="responseDeliveryChannel">Delivery Channel *</label>
                    <textarea
                        id="responseDeliveryChannel"
                        class="form-input form-textarea"
                        rows="3"
                        placeholder="How are these actions executed? (state policy, informal pressure, misinformation)"
                    >${this.escapeHtml(r.deliveryChannel)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="responseExpectedEffect">Expected Effect &amp; System Impact *</label>
                    <textarea
                        id="responseExpectedEffect"
                        class="form-input form-textarea"
                        rows="4"
                        placeholder="What outcomes do you expect, and how do they interact with BLUE / GREEN actors?"
                    >${this.escapeHtml(r.expectedEffect)}</textarea>
                </div>

                <div style="display: flex; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
                    <button type="button" class="btn btn-secondary" data-response-nav="cancel">Cancel</button>
                    <button type="button" class="btn btn-primary" data-response-nav="submit">
                        ${t?"Save Changes":"Submit for White Cell Review"}
                    </button>
                </div>
            </form>
        `,s}bindRedResponseModal(e,t,{actionId:s=null,isEdit:r=!1}={}){var i,o,n,l;const a=e.querySelector("#redResponseForm");(i=e.querySelector('[data-response-nav="cancel"]'))==null||i.addEventListener("click",()=>{t==null||t.close()}),(o=e.querySelector('[data-response-nav="submit"]'))==null||o.addEventListener("click",()=>{this.submitRedResponse(t,a,{actionId:s,isEdit:r}).catch(c=>{S.error("Failed to submit Red Team move response:",c)})}),(l=(n=a.querySelector("#responseTitle"))==null?void 0:n.focus)==null||l.call(n)}getRedResponseData(e){var t,s,r,a,i,o,n,l,c,h,d,u,p,g;return{title:((s=(t=e.querySelector("#responseTitle"))==null?void 0:t.value)==null?void 0:s.trim())||"",strategicAssessment:((a=(r=e.querySelector("#responseStrategicAssessment"))==null?void 0:r.value)==null?void 0:a.trim())||"",responseStrategy:((o=(i=e.querySelector("#responseStrategy"))==null?void 0:i.value)==null?void 0:o.trim())||"",keyActions:((l=(n=e.querySelector("#responseKeyActions"))==null?void 0:n.value)==null?void 0:l.trim())||"",targetsAndPressurePoints:((h=(c=e.querySelector("#responseTargets"))==null?void 0:c.value)==null?void 0:h.trim())||"",deliveryChannel:((u=(d=e.querySelector("#responseDeliveryChannel"))==null?void 0:d.value)==null?void 0:u.trim())||"",expectedEffect:((g=(p=e.querySelector("#responseExpectedEffect"))==null?void 0:p.value)==null?void 0:g.trim())||""}}validateRedResponse(e){return e.title?e.strategicAssessment?e.responseStrategy?e.keyActions?e.targetsAndPressurePoints?e.deliveryChannel?e.expectedEffect?null:"Expected Effect & System Impact is required.":"Delivery Channel is required.":"Targets / Pressure Points is required.":"Key Actions is required.":"Response Strategy is required.":"Strategic Assessment is required.":"Response Title is required."}buildRedResponsePayload(e){return{goal:e.title,mechanism:Ce,sector:null,exposure_type:null,priority:"NORMAL",targets:[],expected_outcomes:e.expectedEffect,ally_contingencies:Te({strategicAssessment:e.strategicAssessment,responseStrategy:e.responseStrategy,keyActions:e.keyActions,targetsAndPressurePoints:e.targetsAndPressurePoints,deliveryChannel:e.deliveryChannel})}}async submitRedResponse(e,t,{actionId:s=null,isEdit:r=!1}={}){if(!this.requireWriteAccess())return;const a=this.getRedResponseData(t),i=this.validateRedResponse(a);if(i){f({message:i,type:"error"});return}const o=x.getSessionId();if(!o){f({message:"No session found",type:"error"});return}$({message:"Submitting response for White Cell review..."});try{const n=this.getCurrentGameState(),l=this.buildRedResponsePayload(a);let c;r&&s?(c=await b.updateDraftAction(s,l),O.updateFromServer("UPDATE",c)):(c=await b.createAction({...l,session_id:o,client_id:x.getClientId(),team:this.teamId,status:C.ACTION_STATUS.SUBMITTED,move:n.move??1,phase:n.phase??1}),O.updateFromServer("INSERT",c));const h=await b.createTimelineEvent({session_id:o,type:"ACTION_SUBMITTED",content:`Move response submitted for White Cell review: ${c.goal||"Untitled response"}`,metadata:{related_id:c.id,role:this.role||this.getCurrentLeadRole(),move_response:!0,review_stage:"white_cell_review"},team:this.teamId,move:c.move??n.move??1,phase:c.phase??n.phase??1});I.updateFromServer("INSERT",h),f({message:r?"Move response updated.":"Move response submitted for White Cell review.",type:"success"}),e==null||e.close()}catch(n){S.error("Failed to submit Red move response:",n),f({message:n.message||"Failed to submit response",type:"error"})}finally{L()}}showGreenProposalModal(e=null){const t=!!(e!=null&&e.id),s=this.createGreenProposalContent(e||{},{isEdit:t}),r={current:null};r.current=M({title:t?"Edit Proposal":"New Proposal",content:s,size:"xl"}),this.bindGreenProposalModal(s,r.current,{actionId:(e==null?void 0:e.id)||null,isEdit:t})}createGreenProposalContent(e={},{isEdit:t=!1}={}){const s=document.createElement("div"),r=Oe(e),a=!!r.category&&!oe.includes(r.category),i=!!r.focusSector&&!ie.includes(r.focusSector),o=!!r.delivery&&!ne.includes(r.delivery),n=a?"Other":r.category||"",l=i?"Other":r.focusSector||"",c=o?"Other":r.delivery||"",h=(u,p="",g="Select an option")=>`
            <option value="">${g}</option>
            ${u.map(v=>`
                <option value="${v}" ${p===v?"selected":""}>${v}</option>
            `).join("")}
        `,d=u=>{const p=`proposalOriginator${u.replace(/[^a-z0-9]+/gi,"")}`;return`
                <label class="form-check" for="${p}">
                    <input
                        id="${p}"
                        class="form-checkbox"
                        type="checkbox"
                        data-proposal-originator="true"
                        value="${u}"
                        ${r.originators.includes(u)?"checked":""}
                    >
                    <span class="form-check-label">${u}</span>
                </label>
            `};return s.innerHTML=`
            <form id="greenProposalForm" novalidate>
                <div class="form-group">
                    <label class="form-label" for="proposalTitle">Proposal Title *</label>
                    <input
                        id="proposalTitle"
                        class="form-input"
                        type="text"
                        value="${this.escapeHtml(r.title==="Untitled proposal"?"":r.title)}"
                        maxlength="200"
                    >
                </div>

                <div class="form-group">
                    <span class="form-label">Originator *</span>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-2);">
                        ${Re.map(d).join("")}
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="proposalObjective">Objective *</label>
                    <textarea
                        id="proposalObjective"
                        class="form-input form-textarea"
                        rows="3"
                    >${this.escapeHtml(r.objective)}</textarea>
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="proposalCategory">Proposal Category *</label>
                        <select
                            id="proposalCategory"
                            class="form-select"
                            data-proposal-other-target="proposalCategoryOther"
                        >
                            ${h(oe,n,"Select category")}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="proposalIntendedPartners">Intended Partner(s) *</label>
                        <input
                            id="proposalIntendedPartners"
                            class="form-input"
                            type="text"
                            placeholder="Country(s) or alliance(s)"
                            value="${this.escapeHtml(r.intendedPartners)}"
                            maxlength="200"
                        >
                    </div>
                </div>

                <div
                    class="form-group"
                    id="proposalCategoryOtherGroup"
                    ${n==="Other"?"":"hidden"}
                >
                    <label class="form-label" for="proposalCategoryOther">Other Category *</label>
                    <input
                        id="proposalCategoryOther"
                        class="form-input"
                        type="text"
                        value="${this.escapeHtml(a?r.category:"")}"
                        maxlength="120"
                    >
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="proposalFocusSector">Focus Sector(s) *</label>
                        <select
                            id="proposalFocusSector"
                            class="form-select"
                            data-proposal-other-target="proposalFocusSectorOther"
                        >
                            ${h(ie,l,"Select sector")}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="proposalDelivery">Delivery *</label>
                        <select
                            id="proposalDelivery"
                            class="form-select"
                            data-proposal-other-target="proposalDeliveryOther"
                        >
                            ${h(ne,c,"Select delivery")}
                        </select>
                    </div>
                </div>

                <div
                    class="form-group"
                    id="proposalFocusSectorOtherGroup"
                    ${l==="Other"?"":"hidden"}
                >
                    <label class="form-label" for="proposalFocusSectorOther">Other Sector *</label>
                    <input
                        id="proposalFocusSectorOther"
                        class="form-input"
                        type="text"
                        value="${this.escapeHtml(i?r.focusSector:"")}"
                        maxlength="120"
                    >
                </div>

                <div
                    class="form-group"
                    id="proposalDeliveryOtherGroup"
                    ${c==="Other"?"":"hidden"}
                >
                    <label class="form-label" for="proposalDeliveryOther">Other Delivery *</label>
                    <input
                        id="proposalDeliveryOther"
                        class="form-input"
                        type="text"
                        value="${this.escapeHtml(o?r.delivery:"")}"
                        maxlength="120"
                    >
                </div>

                <div class="form-group">
                    <label class="form-label" for="proposalTimingConditions">Timing &amp; Conditions *</label>
                    <textarea
                        id="proposalTimingConditions"
                        class="form-input form-textarea"
                        rows="3"
                        placeholder="When does this take effect, and under what conditions?"
                    >${this.escapeHtml(r.timingAndConditions)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="proposalExpectedOutcomes">Expected Outcome(s) &amp; Duration Assessment *</label>
                    <textarea
                        id="proposalExpectedOutcomes"
                        class="form-input form-textarea"
                        rows="4"
                        placeholder="Expected effect outcome(s) and short / long term duration assessment"
                    >${this.escapeHtml(r.expectedOutcomes)}</textarea>
                </div>

                <div style="display: flex; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
                    <button type="button" class="btn btn-secondary" data-proposal-nav="cancel">Cancel</button>
                    <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; justify-content: flex-end;">
                        <button type="button" class="btn btn-primary" data-proposal-nav="sendBlue">Send to Blue Team</button>
                        <button type="button" class="btn btn-primary" data-proposal-nav="sendRed">Send to Red Team</button>
                    </div>
                </div>
            </form>
        `,s}bindGreenProposalModal(e,t,{actionId:s=null,isEdit:r=!1}={}){var o,n,l,c,h;const a=e.querySelector("#greenProposalForm"),i=(d,u,p)=>{const g=a.querySelector(`#${d}`),v=a.querySelector(`#${u}`),E=a.querySelector(`#${p}`);!g||!v||g.addEventListener("change",()=>{const _=g.value==="Other";v.hidden=!_,!_&&E&&(E.value="")})};i("proposalCategory","proposalCategoryOtherGroup","proposalCategoryOther"),i("proposalFocusSector","proposalFocusSectorOtherGroup","proposalFocusSectorOther"),i("proposalDelivery","proposalDeliveryOtherGroup","proposalDeliveryOther"),(o=e.querySelector('[data-proposal-nav="cancel"]'))==null||o.addEventListener("click",()=>{t==null||t.close()}),(n=e.querySelector('[data-proposal-nav="sendBlue"]'))==null||n.addEventListener("click",()=>{this.submitGreenProposal(t,a,{recipientTeam:"blue",actionId:s,isEdit:r}).catch(d=>{S.error("Failed to send proposal to Blue Team:",d)})}),(l=e.querySelector('[data-proposal-nav="sendRed"]'))==null||l.addEventListener("click",()=>{this.submitGreenProposal(t,a,{recipientTeam:"red",actionId:s,isEdit:r}).catch(d=>{S.error("Failed to send proposal to Red Team:",d)})}),(h=(c=a.querySelector("#proposalTitle"))==null?void 0:c.focus)==null||h.call(c)}getGreenProposalData(e){var l,c,h,d,u,p,g,v,E,_,B,P,D,N,F,y,T,R,W;const t=Array.from(e.querySelectorAll('[data-proposal-originator="true"]:checked')).map(U=>U.value),s=((l=e.querySelector("#proposalCategory"))==null?void 0:l.value)||"",r=((h=(c=e.querySelector("#proposalCategoryOther"))==null?void 0:c.value)==null?void 0:h.trim())||"",a=((d=e.querySelector("#proposalFocusSector"))==null?void 0:d.value)||"",i=((p=(u=e.querySelector("#proposalFocusSectorOther"))==null?void 0:u.value)==null?void 0:p.trim())||"",o=((g=e.querySelector("#proposalDelivery"))==null?void 0:g.value)||"",n=((E=(v=e.querySelector("#proposalDeliveryOther"))==null?void 0:v.value)==null?void 0:E.trim())||"";return{title:((B=(_=e.querySelector("#proposalTitle"))==null?void 0:_.value)==null?void 0:B.trim())||"",originators:t,objective:((D=(P=e.querySelector("#proposalObjective"))==null?void 0:P.value)==null?void 0:D.trim())||"",categorySelect:s,categoryOther:r,category:s==="Other"?r:s,intendedPartners:((F=(N=e.querySelector("#proposalIntendedPartners"))==null?void 0:N.value)==null?void 0:F.trim())||"",sectorSelect:a,sectorOther:i,focusSector:a==="Other"?i:a,deliverySelect:o,deliveryOther:n,delivery:o==="Other"?n:o,timingAndConditions:((T=(y=e.querySelector("#proposalTimingConditions"))==null?void 0:y.value)==null?void 0:T.trim())||"",expectedOutcomes:((W=(R=e.querySelector("#proposalExpectedOutcomes"))==null?void 0:R.value)==null?void 0:W.trim())||""}}validateGreenProposal(e){return e.title?e.originators.length?e.objective?e.categorySelect?e.categorySelect==="Other"&&!e.categoryOther?"Please enter the custom category.":e.intendedPartners?e.sectorSelect?e.sectorSelect==="Other"&&!e.sectorOther?"Please enter the custom sector.":e.deliverySelect?e.deliverySelect==="Other"&&!e.deliveryOther?"Please enter the custom delivery.":e.timingAndConditions?e.expectedOutcomes?null:"Expected Outcome(s) is required.":"Timing & Conditions is required.":"Delivery is required.":"Focus Sector is required.":"Intended Partner(s) is required.":"Proposal Category is required.":"Objective is required.":"Select at least one Originator.":"Proposal Title is required."}buildGreenProposalPayload(e,{recipientTeam:t}){return{goal:e.title,mechanism:$e,sector:e.focusSector,exposure_type:null,priority:"NORMAL",targets:[],expected_outcomes:e.expectedOutcomes,ally_contingencies:Ie({originators:e.originators,objective:e.objective,category:e.category,intendedPartners:e.intendedPartners,delivery:e.delivery,timingAndConditions:e.timingAndConditions,recipientTeam:t})}}async submitGreenProposal(e,t,{recipientTeam:s,actionId:r=null,isEdit:a=!1}={}){if(!this.requireWriteAccess())return;const i=this.getGreenProposalData(t),o=this.validateGreenProposal(i);if(o){f({message:o,type:"error"});return}const n=x.getSessionId();if(!n){f({message:"No session found",type:"error"});return}const l=s==="blue"?"Blue Team":"Red Team";$({message:"Submitting proposal for White Cell review..."});try{const c=this.getCurrentGameState(),h=this.buildGreenProposalPayload(i,{recipientTeam:s});let d;a&&r?(d=await b.updateDraftAction(r,h),O.updateFromServer("UPDATE",d)):(d=await b.createAction({...h,session_id:n,client_id:x.getClientId(),team:this.teamId,status:C.ACTION_STATUS.SUBMITTED,move:c.move??1,phase:c.phase??1}),O.updateFromServer("INSERT",d));const u=await b.createTimelineEvent({session_id:n,type:"ACTION_SUBMITTED",content:`Proposal submitted for White Cell review (intended recipient: ${l}): ${d.goal||"Untitled proposal"}`,metadata:{related_id:d.id,role:this.role||this.getCurrentLeadRole(),recipient_team:s,proposal:!0,review_stage:"white_cell_review"},team:this.teamId,move:d.move??c.move??1,phase:d.phase??c.phase??1});I.updateFromServer("INSERT",u),f({message:`Proposal submitted for White Cell review. It will be forwarded to ${l} once approved.`,type:"success"}),e==null||e.close()}catch(c){S.error("Failed to send proposal:",c),f({message:c.message||"Failed to submit proposal",type:"error"})}finally{L()}}showBlueActionWizard(e=null){const t=!!(e!=null&&e.id),s=this.getBlueActionSequenceContext(e),r=this.createBlueActionWizardContent(e||{},{isEdit:t,sequenceContext:s}),a={current:null};a.current=M({title:t?"Edit Blue Team Action":"Take Action",content:r,size:"xl"}),this.bindBlueActionWizard(r,a.current,{actionId:(e==null?void 0:e.id)||null,sequenceContext:s})}createBlueActionWizardContent(e={},{isEdit:t=!1,sequenceContext:s=null}={}){const r=document.createElement("div"),a=de(e),i=e.goal||e.title||"",o=!!e.sector&&!pe.includes(e.sector),n=!!a.implementation&&!ue.includes(a.implementation),l=o?"Other":e.sector||"",c=n?"Other":a.implementation||"",h=(s==null?void 0:s.label)||ce({teamLabel:this.teamLabel,move:(e==null?void 0:e.move)||this.getCurrentGameState().move||1,actionNumber:null}),d=(p,g="",v="Select an option")=>`
            <option value="">${v}</option>
            ${p.map(E=>`
                <option value="${E}" ${g===E?"selected":""}>${E}</option>
            `).join("")}
        `,u=(p,g,v=[])=>{const E=`${p}${g.replace(/[^a-z0-9]+/gi,"")}`;return`
                <label class="form-check" for="${E}">
                    <input
                        id="${E}"
                        class="form-checkbox"
                        type="checkbox"
                        data-blue-action-checkbox="${p}"
                        value="${g}"
                        ${v.includes(g)?"checked":""}
                    >
                    <span class="form-check-label">${g}</span>
                </label>
            `};return r.innerHTML=`
            <form id="blueActionWizardForm" novalidate>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4);">
                    <div>
                        <p class="text-xs text-gray-500" id="blueActionWizardStepLabel">Page 1 of ${w}</p>
                        <h3 class="font-semibold" style="margin: 0;">Blue Team Action Builder</h3>
                        <p class="text-sm text-gray-500" id="blueActionWizardSequenceLabel" style="margin: var(--space-2) 0 0;">${this.escapeHtml(h)}</p>
                    </div>
                    <div aria-hidden="true" style="display: flex; gap: var(--space-2);">
                        ${Array.from({length:w},(p,g)=>`
                            <span
                                data-blue-action-step="${g}"
                                style="width: 28px; height: 4px; border-radius: 999px; background: ${g===0?"var(--color-primary-500)":"var(--color-gray-200)"};"
                            ></span>
                        `).join("")}
                    </div>
                </div>

                <section data-blue-action-page="0">
                    <div class="section-grid section-grid-2">
                        <div class="form-group">
                            <label class="form-label" for="actionTitle">Action Title *</label>
                            <input
                                id="actionTitle"
                                class="form-input"
                                type="text"
                                value="${this.escapeHtml(i)}"
                                maxlength="200"
                            >
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="actionInstrument">Instrument of Power *</label>
                            <select id="actionInstrument" class="form-select">
                                ${d(Fe,e.mechanism||"","Select instrument")}
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="actionObjective">Objective *</label>
                        <textarea
                            id="actionObjective"
                            class="form-input form-textarea"
                            rows="4"
                            aria-describedby="actionObjectiveHint"
                        >${this.escapeHtml(a.objective)}</textarea>
                        <p class="form-hint" id="actionObjectiveHint">State the objective this action is meant to achieve.</p>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="actionLever">Lever *</label>
                        <select id="actionLever" class="form-select">
                            ${d(Be,a.lever||"","Select lever")}
                        </select>
                    </div>
                </section>

                <section data-blue-action-page="1" hidden>
                    <div class="section-grid section-grid-2">
                        <div class="form-group">
                            <label class="form-label" for="actionBlueSector">Sector *</label>
                            <select id="actionBlueSector" class="form-select" data-blue-action-other-target="actionBlueSectorOther">
                                ${d(pe,l,"Select sector")}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="actionSupplyChainFocus">Supply Chain Focus *</label>
                            <select id="actionSupplyChainFocus" class="form-select">
                                ${d(qe,e.exposure_type||"","Select supply chain focus")}
                            </select>
                        </div>
                    </div>

                    <div
                        class="form-group"
                        id="actionBlueSectorOtherGroup"
                        ${l==="Other"?"":"hidden"}
                    >
                        <label class="form-label" for="actionBlueSectorOther">Other Sector *</label>
                        <input
                            id="actionBlueSectorOther"
                            class="form-input"
                            type="text"
                            value="${this.escapeHtml(o?e.sector:"")}"
                            maxlength="120"
                        >
                    </div>

                    <div class="section-grid section-grid-2">
                        <div class="form-group">
                            <label class="form-label" for="actionImplementation">Implementation *</label>
                            <select id="actionImplementation" class="form-select" data-blue-action-other-target="actionImplementationOther">
                                ${d(ue,c,"Select implementation")}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="actionEnforcementTimeline">Enforcement Timeline *</label>
                            <select id="actionEnforcementTimeline" class="form-select">
                                ${d(Me,a.enforcementTimeline||"","Select timeline")}
                            </select>
                        </div>
                    </div>

                    <div
                        class="form-group"
                        id="actionImplementationOtherGroup"
                        ${c==="Other"?"":"hidden"}
                    >
                        <label class="form-label" for="actionImplementationOther">Other Implementation *</label>
                        <input
                            id="actionImplementationOther"
                            class="form-input"
                            type="text"
                            value="${this.escapeHtml(n?a.implementation:"")}"
                            maxlength="120"
                        >
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="actionFocusCountries">Focus Countries *</label>
                        <select id="actionFocusCountries" class="form-select" multiple size="5">
                            ${we.map(p=>`
                                <option value="${p}" ${a.focusCountries.includes(p)?"selected":""}>${p}</option>
                            `).join("")}
                        </select>
                        <p class="form-hint">Hold Ctrl (Windows) or Command (Mac) to select multiple countries.</p>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="actionExpectedOutcomes">Expected Outcomes *</label>
                        <textarea
                            id="actionExpectedOutcomes"
                            class="form-input form-textarea"
                            rows="5"
                            aria-describedby="actionExpectedOutcomesHint"
                        >${this.escapeHtml(e.expected_outcomes||"")}</textarea>
                        <p class="form-hint" id="actionExpectedOutcomesHint">What do you expect the outcome to be and when do you expect it to be achieved?</p>
                    </div>
                </section>

                <section data-blue-action-page="2" hidden>
                    <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-4);">
                        <h4 class="font-semibold" style="margin: 0 0 var(--space-2);">Review</h4>
                        <div id="blueActionSummary" class="text-sm text-gray-500"></div>
                    </div>

                    <div class="section-grid section-grid-2">
                        <div class="card card-bordered" style="padding: var(--space-4);">
                            <h4 class="font-semibold" style="margin: 0 0 var(--space-3);">Coordinated</h4>
                            <div style="display: grid; gap: var(--space-3);">
                                ${De.map(p=>u("coordinated",p,a.coordinated)).join("")}
                            </div>
                        </div>
                        <div class="card card-bordered" style="padding: var(--space-4);">
                            <h4 class="font-semibold" style="margin: 0 0 var(--space-3);">Informed</h4>
                            <div style="display: grid; gap: var(--space-3);">
                                ${Ne.map(p=>u("informed",p,a.informed)).join("")}
                            </div>
                        </div>
                    </div>
                </section>

                <div style="display: flex; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
                    <button type="button" class="btn btn-secondary" data-blue-action-nav="cancel">Cancel</button>
                    <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" data-blue-action-nav="back">Back</button>
                        <button type="button" class="btn btn-secondary" data-blue-action-nav="next">Next</button>
                        ${t?'<button type="button" class="btn btn-primary" data-blue-action-nav="saveChanges">Save Changes</button>':`
                                <button type="button" class="btn btn-secondary" data-blue-action-nav="saveDraft">Save Draft</button>
                                <button type="button" class="btn btn-primary" data-blue-action-nav="submit">Submit</button>
                            `}
                    </div>
                </div>
            </form>
        `,r}bindBlueActionWizard(e,t,{actionId:s=null,sequenceContext:r=null}={}){var D,N,F;const a=e.querySelector("#blueActionWizardForm"),i=Array.from(e.querySelectorAll("[data-blue-action-page]")),o=e.querySelector("#blueActionWizardStepLabel"),n=e.querySelector("#blueActionWizardSequenceLabel"),l=Array.from(e.querySelectorAll("[data-blue-action-step]")),c=e.querySelector('[data-blue-action-nav="back"]'),h=e.querySelector('[data-blue-action-nav="next"]'),d=e.querySelector('[data-blue-action-nav="saveDraft"]'),u=e.querySelector('[data-blue-action-nav="submit"]'),p=e.querySelector('[data-blue-action-nav="saveChanges"]'),g=e.querySelector("#blueActionSummary");let v=0;const E=(y,T,R)=>{const W=a.querySelector(`#${y}`),U=a.querySelector(`#${T}`),X=a.querySelector(`#${R}`),ee=(W==null?void 0:W.value)==="Other";X&&(X.hidden=!ee),U&&!ee&&(U.value="")},_=()=>{const y=this.getBlueActionWizardData(a);g.innerHTML=`
                <p><strong>Sequence:</strong> ${this.escapeHtml((r==null?void 0:r.label)||"")}</p>
                <p><strong>Title:</strong> ${this.escapeHtml(y.actionTitle||"Not specified")}</p>
                <p><strong>Objective:</strong> ${this.escapeHtml(y.objective||"Not specified")}</p>
                <p><strong>Instrument:</strong> ${this.escapeHtml(y.instrumentOfPower||"Not specified")} | <strong>Lever:</strong> ${this.escapeHtml(y.lever||"Not specified")}</p>
                <p><strong>Sector:</strong> ${this.escapeHtml(y.sector||"Not specified")} | <strong>Supply Chain Focus:</strong> ${this.escapeHtml(y.supplyChainFocus||"Not specified")}</p>
                <p><strong>Implementation:</strong> ${this.escapeHtml(y.implementation||"Not specified")} | <strong>Timeline:</strong> ${this.escapeHtml(y.enforcementTimeline||"Not specified")}</p>
                <p><strong>Focus Countries:</strong> ${this.escapeHtml(z(y.focusCountries))}</p>
                <p><strong>Expected Outcomes:</strong> ${this.escapeHtml(y.expectedOutcomes||"Not specified")}</p>
            `},B=()=>{var T,R;const y=(T=i[v])==null?void 0:T.querySelector("input, select, textarea, button");(R=y==null?void 0:y.focus)==null||R.call(y)},P=()=>{i.forEach((y,T)=>{y.hidden=T!==v}),l.forEach((y,T)=>{y.style.background=T<=v?"var(--color-primary-500)":"var(--color-gray-200)"}),o&&(o.textContent=`Page ${v+1} of ${w}`),n&&(r!=null&&r.label)&&(n.textContent=r.label),c&&(c.hidden=v===0),h&&(h.hidden=v===w-1),d&&(d.hidden=v!==w-1),u&&(u.hidden=v!==w-1),p&&(p.hidden=v!==w-1),v===w-1&&_(),B()};(D=a.querySelector("#actionBlueSector"))==null||D.addEventListener("change",()=>{E("actionBlueSector","actionBlueSectorOther","actionBlueSectorOtherGroup")}),(N=a.querySelector("#actionImplementation"))==null||N.addEventListener("change",()=>{E("actionImplementation","actionImplementationOther","actionImplementationOtherGroup")}),(F=e.querySelector('[data-blue-action-nav="cancel"]'))==null||F.addEventListener("click",()=>{t==null||t.close()}),c==null||c.addEventListener("click",()=>{v=Math.max(0,v-1),P()}),h==null||h.addEventListener("click",()=>{const y=this.getBlueActionWizardData(a),T=this.validateBlueActionWizardPage(y,v);if(T){f({message:T,type:"error"});return}v=Math.min(w-1,v+1),P()}),d==null||d.addEventListener("click",()=>{this.saveBlueActionDraft(t,a).catch(y=>{S.error("Failed to save Blue team draft action:",y)})}),u==null||u.addEventListener("click",()=>{this.submitBlueActionFromWizard(t,a).catch(y=>{S.error("Failed to submit Blue team action from wizard:",y)})}),p==null||p.addEventListener("click",()=>{this.saveBlueActionChanges(t,a,s).catch(y=>{S.error("Failed to update Blue team draft action:",y)})}),P()}getBlueActionWizardData(e){var l,c,h,d,u,p,g,v,E,_,B,P,D,N,F,y,T;const t=Array.from(((l=e.querySelector("#actionFocusCountries"))==null?void 0:l.selectedOptions)||[]).map(R=>R.value),s=Array.from(e.querySelectorAll('[data-blue-action-checkbox="coordinated"]:checked')).map(R=>R.value),r=Array.from(e.querySelectorAll('[data-blue-action-checkbox="informed"]:checked')).map(R=>R.value),a=((c=e.querySelector("#actionBlueSector"))==null?void 0:c.value)||"",i=((h=e.querySelector("#actionImplementation"))==null?void 0:h.value)||"",o=((u=(d=e.querySelector("#actionBlueSectorOther"))==null?void 0:d.value)==null?void 0:u.trim())||"",n=((g=(p=e.querySelector("#actionImplementationOther"))==null?void 0:p.value)==null?void 0:g.trim())||"";return{actionTitle:((E=(v=e.querySelector("#actionTitle"))==null?void 0:v.value)==null?void 0:E.trim())||"",objective:((B=(_=e.querySelector("#actionObjective"))==null?void 0:_.value)==null?void 0:B.trim())||"",instrumentOfPower:((P=e.querySelector("#actionInstrument"))==null?void 0:P.value)||"",lever:((D=e.querySelector("#actionLever"))==null?void 0:D.value)||"",sector:a==="Other"?o:a,sectorSelectValue:a,sectorOther:o,supplyChainFocus:((N=e.querySelector("#actionSupplyChainFocus"))==null?void 0:N.value)||"",implementation:i==="Other"?n:i,implementationSelectValue:i,implementationOther:n,focusCountries:t,enforcementTimeline:((F=e.querySelector("#actionEnforcementTimeline"))==null?void 0:F.value)||"",expectedOutcomes:((T=(y=e.querySelector("#actionExpectedOutcomes"))==null?void 0:y.value)==null?void 0:T.trim())||"",coordinated:s,informed:r}}validateBlueActionWizardPage(e,t){if(t===0){if(!e.actionTitle)return"Action Title is required.";if(!e.objective)return"Objective is required.";if(!e.instrumentOfPower)return"Instrument of Power is required.";if(!e.lever)return"Lever is required."}if(t===1){if(!e.sectorSelectValue)return"Sector is required.";if(e.sectorSelectValue==="Other"&&!e.sectorOther)return"Please enter the custom sector.";if(!e.supplyChainFocus)return"Supply Chain Focus is required.";if(!e.implementationSelectValue)return"Implementation is required.";if(e.implementationSelectValue==="Other"&&!e.implementationOther)return"Please enter the custom implementation.";if(!e.focusCountries.length)return"Select at least one focus country.";if(!e.enforcementTimeline)return"Enforcement Timeline is required.";if(!e.expectedOutcomes)return"Expected Outcomes is required."}return null}buildBlueActionPayload(e){return{goal:e.actionTitle,mechanism:e.instrumentOfPower,sector:e.sector,exposure_type:e.supplyChainFocus,priority:"NORMAL",targets:e.focusCountries,expected_outcomes:e.expectedOutcomes,ally_contingencies:We({objective:e.objective,lever:e.lever,implementation:e.implementation,enforcementTimeline:e.enforcementTimeline,coordinated:e.coordinated,informed:e.informed})}}async saveBlueActionDraft(e,t){if(!this.requireWriteAccess())return;const s=this.getBlueActionWizardData(t),r=this.validateBlueActionWizardPage(s,0),a=this.validateBlueActionWizardPage(s,1),i=x.getSessionId();if(r||a){f({message:r||a,type:"error"});return}if(!i){f({message:"No session found",type:"error"});return}$({message:"Saving draft..."});try{const o=this.getCurrentGameState(),n=await b.createAction({...this.buildBlueActionPayload(s),session_id:i,client_id:x.getClientId(),team:this.teamId,status:C.ACTION_STATUS.DRAFT,move:o.move??1,phase:o.phase??1});O.updateFromServer("INSERT",n);const l=await b.createTimelineEvent({session_id:i,type:"ACTION_CREATED",content:`Draft action created: ${n.goal||"Untitled action"}`,metadata:{related_id:n.id,role:this.role||this.getCurrentLeadRole()},team:this.teamId,move:n.move??1,phase:n.phase??1});I.updateFromServer("INSERT",l),f({message:"Draft action saved",type:"success"}),e==null||e.close()}catch(o){S.error("Failed to create Blue team draft action:",o),f({message:o.message||"Failed to save draft action",type:"error"})}finally{L()}}async saveBlueActionChanges(e,t,s){if(!this.requireWriteAccess())return;const r=this.getBlueActionWizardData(t),a=this.validateBlueActionWizardPage(r,0),i=this.validateBlueActionWizardPage(r,1);if(a||i){f({message:a||i,type:"error"});return}$({message:"Updating draft..."});try{const o=await b.updateDraftAction(s,this.buildBlueActionPayload(r));O.updateFromServer("UPDATE",o),f({message:"Draft action updated",type:"success"}),e==null||e.close()}catch(o){S.error("Failed to update Blue team draft action:",o),f({message:o.message||"Failed to update draft action",type:"error"})}finally{L()}}async submitBlueActionFromWizard(e,t){if(!this.requireWriteAccess())return;const s=this.getBlueActionWizardData(t),r=this.validateBlueActionWizardPage(s,0),a=this.validateBlueActionWizardPage(s,1),i=x.getSessionId(),o=this.getBlueActionSequenceContext();if(r||a){f({message:r||a,type:"error"});return}if(!i){f({message:"No session found",type:"error"});return}if(await J({title:"Confirm Action",message:`Submit ${o.label} to White Cell? It will appear as submitted immediately after confirmation.`,confirmLabel:"Submit",variant:"primary"})){$({message:"Submitting action..."});try{const l=this.getCurrentGameState(),c=await b.createAction({...this.buildBlueActionPayload(s),session_id:i,client_id:x.getClientId(),team:this.teamId,status:C.ACTION_STATUS.DRAFT,move:l.move??1,phase:l.phase??1});O.updateFromServer("INSERT",c);const h=await b.createTimelineEvent({session_id:i,type:"ACTION_CREATED",content:`Draft action created: ${c.goal||"Untitled action"}`,metadata:{related_id:c.id,role:this.role||this.getCurrentLeadRole()},team:this.teamId,move:c.move??1,phase:c.phase??1});I.updateFromServer("INSERT",h);const d=await b.submitAction(c.id);O.updateFromServer("UPDATE",d);const u=await b.createTimelineEvent({session_id:d.session_id,type:"ACTION_SUBMITTED",content:`Action submitted to White Cell: ${d.goal||"Untitled action"}`,metadata:{related_id:d.id,role:this.role||this.getCurrentLeadRole()},team:this.teamId,move:d.move??1,phase:d.phase??1});I.updateFromServer("INSERT",u),f({message:"Action submitted to White Cell",type:"success"}),e==null||e.close()}catch(l){S.error("Failed to submit Blue team action:",l),f({message:l.message||"Failed to submit action",type:"error"})}finally{L()}}}createActionFormContent(e={}){const t=document.createElement("div"),s=Array.isArray(e.targets)?e.targets:e.target?[e.target]:[],r=C.MECHANISMS.map(l=>`<option value="${l}" ${e.mechanism===l?"selected":""}>${l}</option>`).join(""),a=C.SECTORS.map(l=>`<option value="${l}" ${e.sector===l?"selected":""}>${l}</option>`).join(""),i=C.EXPOSURE_TYPES.map(l=>`<option value="${l}" ${e.exposure_type===l?"selected":""}>${l}</option>`).join(""),o=C.TARGETS.map(l=>`<option value="${l}" ${s.includes(l)?"selected":""}>${l}</option>`).join(""),n=C.PRIORITY.map(l=>`<option value="${l}" ${(e.priority||"NORMAL")===l?"selected":""}>${l}</option>`).join("");return t.innerHTML=`
            <form id="actionForm">
                <div class="form-group">
                    <label class="form-label" for="actionGoal">Goal *</label>
                    <textarea id="actionGoal" class="form-input form-textarea" rows="3" required>${this.escapeHtml(e.goal||e.title||"")}</textarea>
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="actionMechanism">Mechanism *</label>
                        <select id="actionMechanism" class="form-select" required>
                            <option value="">Select mechanism</option>
                            ${r}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="actionSector">Sector *</label>
                        <select id="actionSector" class="form-select" required>
                            <option value="">Select sector</option>
                            ${a}
                        </select>
                    </div>
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="actionExposureType">Exposure Type</label>
                        <select id="actionExposureType" class="form-select">
                            <option value="">Select exposure type</option>
                            ${i}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="actionPriority">Priority</label>
                        <select id="actionPriority" class="form-select">
                            ${n}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="actionTargets">Targets *</label>
                    <select id="actionTargets" class="form-select" multiple size="5" required>
                        ${o}
                    </select>
                    <p class="form-hint">Hold Ctrl (Windows) or Command (Mac) to select multiple.</p>
                </div>

                <div class="form-group">
                    <label class="form-label" for="actionExpectedOutcomes">Expected Outcomes *</label>
                    <textarea id="actionExpectedOutcomes" class="form-input form-textarea" rows="4" required>${this.escapeHtml(e.expected_outcomes||e.description||"")}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="actionAllyContingencies">Ally Contingencies *</label>
                    <textarea id="actionAllyContingencies" class="form-input form-textarea" rows="3" required>${this.escapeHtml(e.ally_contingencies||"")}</textarea>
                </div>
            </form>
        `,t}getActionFormData(){var r,a,i,o,n,l,c,h,d,u;const e=document.getElementById("actionTargets"),t={goal:(a=(r=document.getElementById("actionGoal"))==null?void 0:r.value)==null?void 0:a.trim(),mechanism:(i=document.getElementById("actionMechanism"))==null?void 0:i.value,sector:(o=document.getElementById("actionSector"))==null?void 0:o.value,exposure_type:((n=document.getElementById("actionExposureType"))==null?void 0:n.value)||null,priority:((l=document.getElementById("actionPriority"))==null?void 0:l.value)||"NORMAL",targets:e?Array.from(e.selectedOptions).map(p=>p.value):[],expected_outcomes:(h=(c=document.getElementById("actionExpectedOutcomes"))==null?void 0:c.value)==null?void 0:h.trim(),ally_contingencies:(u=(d=document.getElementById("actionAllyContingencies"))==null?void 0:d.value)==null?void 0:u.trim()},s=Ge(t);return s.valid?t:(f({message:s.errors[0]||"Action validation failed",type:"error"}),null)}async handleCreateAction(e){if(!this.requireWriteAccess())return;const t=this.getActionFormData();if(!t)return;const s=x.getSessionId();if(!s){f({message:"No session found",type:"error"});return}$({message:"Saving draft..."});try{const r=this.getCurrentGameState(),a=await b.createAction({...t,session_id:s,client_id:x.getClientId(),team:this.teamId,status:C.ACTION_STATUS.DRAFT,move:r.move??1,phase:r.phase??1});O.updateFromServer("INSERT",a);const i=await b.createTimelineEvent({session_id:s,type:"ACTION_CREATED",content:`Draft action created: ${a.goal||"Untitled action"}`,metadata:{related_id:a.id,role:this.role||this.getCurrentLeadRole()},team:this.teamId,move:a.move??1,phase:a.phase??1});I.updateFromServer("INSERT",i),f({message:"Draft action saved",type:"success"}),e==null||e.close()}catch(r){S.error("Failed to create action:",r),f({message:r.message||"Failed to save draft action",type:"error"})}finally{L()}}async handleUpdateAction(e,t){if(!this.requireWriteAccess())return;const s=this.getActionFormData();if(s){$({message:"Updating draft..."});try{const r=await b.updateDraftAction(t,s);O.updateFromServer("UPDATE",r),f({message:"Draft action updated",type:"success"}),e==null||e.close()}catch(r){S.error("Failed to update action:",r),f({message:r.message||"Failed to update draft action",type:"error"})}finally{L()}}}async confirmSubmitAction(e){if(!this.requireWriteAccess())return;if(!re(e)){f({message:"Only draft actions can be submitted.",type:"error"});return}const t=this.isBlueTeamActionWizardEnabled(e)?this.getBlueActionSequenceContext(e).label:"this draft";await J({title:"Submit Action",message:`Submit ${t} to White Cell for review? After submission it becomes read-only for facilitator and scribe seats.`,confirmLabel:"Submit",variant:"primary"})&&await this.submitAction(e.id)}async submitAction(e){if(this.requireWriteAccess()){$({message:"Submitting action..."});try{const t=await b.submitAction(e);O.updateFromServer("UPDATE",t);const s=await b.createTimelineEvent({session_id:t.session_id,type:"ACTION_SUBMITTED",content:`Action submitted to White Cell: ${t.goal||"Untitled action"}`,metadata:{related_id:t.id,role:this.role||this.getCurrentLeadRole()},team:this.teamId,move:t.move??1,phase:t.phase??1});I.updateFromServer("INSERT",s),f({message:"Action submitted to White Cell",type:"success"})}catch(t){S.error("Failed to submit action:",t),f({message:t.message||"Failed to submit action",type:"error"})}finally{L()}}}async confirmDeleteAction(e){if(!this.requireWriteAccess())return;if(!ae(e)){f({message:"Only draft actions can be deleted.",type:"error"});return}await J({title:"Delete Draft Action",message:"Delete this draft action? This cannot be undone.",confirmLabel:"Delete",variant:"danger"})&&await this.deleteAction(e.id)}async deleteAction(e){if(this.requireWriteAccess()){$({message:"Deleting draft..."});try{await b.deleteDraftAction(e),O.updateFromServer("DELETE",{id:e}),f({message:"Draft action deleted",type:"success"})}catch(t){S.error("Failed to delete action:",t),f({message:t.message||"Failed to delete draft action",type:"error"})}finally{L()}}}renderRfiList(){const e=document.getElementById("rfiList");if(e){if(this.rfis.length===0){e.innerHTML=`
                <div class="empty-state">
                    <h3 class="empty-state-title">No RFIs</h3>
                    <p class="empty-state-message">
                        ${this.isReadOnly?`No ${this.teamLabel} RFIs have been submitted yet.`:"Submit a request for information to White Cell when the team needs clarification."}
                    </p>
                </div>
            `;return}e.innerHTML=this.rfis.map(t=>{const s=t.query||t.question||"";return`
                <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                    <div class="card-header" style="display: flex; justify-content: space-between; gap: var(--space-2);">
                        <span class="text-sm font-semibold">${this.escapeHtml(s)}</span>
                        <div style="display: flex; gap: var(--space-2);">
                            ${K(t.status||"pending").outerHTML}
                            ${le(t.priority||"NORMAL").outerHTML}
                        </div>
                    </div>
                    ${Array.isArray(t.categories)&&t.categories.length?`
                        <p class="text-xs text-gray-500 mt-2"><strong>Categories:</strong> ${this.escapeHtml(t.categories.join(", "))}</p>
                    `:""}
                    ${t.response?`
                        <div class="mt-3 p-3 bg-gray-50 rounded">
                            <strong>Response:</strong> ${this.escapeHtml(t.response)}
                        </div>
                    `:""}
                    <p class="text-xs text-gray-400 mt-2">${G(t.created_at)}</p>
                </div>
            `}).join("")}}showCreateRfiModal(){if(!this.requireWriteAccess())return;const e=document.createElement("div"),t=C.PRIORITY.map(a=>`<option value="${a}">${a}</option>`).join(""),s=C.RFI_CATEGORIES.map(a=>`<option value="${a}">${a}</option>`).join("");e.innerHTML=`
            <form id="rfiForm">
                <div class="form-group">
                    <label class="form-label" for="rfiQuestion">Question *</label>
                    <textarea id="rfiQuestion" class="form-input form-textarea" rows="4" required></textarea>
                </div>
                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="rfiPriority">Priority *</label>
                        <select id="rfiPriority" class="form-select" required>
                            <option value="">Select priority</option>
                            ${t}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="rfiCategories">Categories *</label>
                        <select id="rfiCategories" class="form-select" multiple size="4" required>
                            ${s}
                        </select>
                        <p class="form-hint">Hold Ctrl (Windows) or Command (Mac) to select multiple.</p>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="rfiContext">Context</label>
                    <textarea id="rfiContext" class="form-input form-textarea" rows="3"></textarea>
                </div>
            </form>
        `;const r={current:null};r.current=M({title:"Submit Request for Information",content:e,size:"md",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Submit RFI",variant:"primary",onClick:()=>(this.handleCreateRfi(r.current).catch(a=>{S.error("Failed to submit RFI:",a)}),!1)}]})}async handleCreateRfi(e){var n,l,c,h,d;if(!this.requireWriteAccess())return;const t=(l=(n=document.getElementById("rfiQuestion"))==null?void 0:n.value)==null?void 0:l.trim(),s=(h=(c=document.getElementById("rfiContext"))==null?void 0:c.value)==null?void 0:h.trim(),r=(d=document.getElementById("rfiPriority"))==null?void 0:d.value,a=document.getElementById("rfiCategories"),i=a?Array.from(a.selectedOptions).map(u=>u.value):[];if(!t){f({message:"Question is required",type:"error"});return}if(!r){f({message:"Priority is required",type:"error"});return}if(!i.length){f({message:"Select at least one category",type:"error"});return}const o=x.getSessionId();if(o){$({message:"Submitting RFI..."});try{const u=this.getCurrentGameState(),p=s?`${t}

Context: ${s}`:t,g=await b.createRequest({session_id:o,team:this.teamId,client_id:x.getClientId(),query:p,priority:r,categories:i,move:u.move??1,phase:u.phase??1});k.updateFromServer("INSERT",g);const v=await b.createTimelineEvent({session_id:o,type:"RFI_CREATED",content:`${this.teamLabel} submitted an RFI to White Cell.`,metadata:{related_id:g.id,role:this.role||this.getCurrentLeadRole()},team:this.teamId,move:g.move??1,phase:g.phase??1});I.updateFromServer("INSERT",v),f({message:"RFI submitted successfully",type:"success"}),e==null||e.close()}catch(u){S.error("Failed to submit RFI:",u),f({message:u.message||"Failed to submit RFI",type:"error"})}finally{L()}}}renderResponsesList(){const e=document.getElementById("responsesList");if(e){if(this.responses.length===0){e.innerHTML=`
                <div class="empty-state">
                    <h3 class="empty-state-title">No Responses Yet</h3>
                    <p class="empty-state-message">White Cell responses and team-lead communications will appear here.</p>
                </div>
            `;return}e.innerHTML=this.responses.map(t=>{const s=t.kind==="rfi"?K("answered").outerHTML:H({text:t.type,variant:"info",size:"sm",rounded:!0}).outerHTML;return`
                <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); margin-bottom: var(--space-2);">
                        <div>
                            <h3 class="font-semibold">${this.escapeHtml(t.title)}</h3>
                            <p class="text-xs text-gray-400">${j(t.created_at)}</p>
                        </div>
                        ${s}
                    </div>
                    <p class="text-sm">${this.escapeHtml(t.content||"")}</p>
                </div>
            `}).join("")}}renderTribeStreetJournalList(){const e=document.getElementById("tribeStreetJournalList");if(!e)return;this.renderTribeStreetJournalEmbed();const t=[...this.journalUpdates.map(s=>({kind:"white_cell_update",created_at:s.created_at,content:s.content,type:s.type||"GUIDANCE",metadata:s.metadata||{},to_role:s.to_role})),...this.journalEntries.map(s=>({...s,kind:"team_capture"}))].sort((s,r)=>V(r)-V(s));if(t.length===0){e.innerHTML=`
                <div class="empty-state">
                    <h3 class="empty-state-title">No Journal Entries Yet</h3>
                    <p class="empty-state-message">White Cell journal updates and team captures will appear here.</p>
                </div>
            `;return}e.innerHTML=`
            ${t.map(s=>{var n;if(s.kind==="white_cell_update"){const l=Z(s);return`
                    <div class="card card-bordered" style="padding: var(--space-3); margin-bottom: var(--space-3); border-left: 3px solid var(--color-primary-500);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-2);">
                            <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
                                ${H({text:"WHITE CELL UPDATE",variant:"primary",size:"sm",rounded:!0}).outerHTML}
                                <span class="text-xs text-gray-500">${this.escapeHtml(this.formatCommunicationTarget(s.to_role))}</span>
                            </div>
                            <span class="text-xs text-gray-400">${l?j(l):"Time unavailable"}</span>
                        </div>
                        <p class="text-sm">${this.escapeHtml(s.content||"")}</p>
                    </div>
                `}const r=s.type||s.event_type||"NOTE",a={NOTE:"default",MOMENT:"warning",QUOTE:"info"}[r]||"default",i=((n=s.metadata)==null?void 0:n.actor)||this.getCurrentLeadLabel(),o=Z(s);return`
                <div class="card card-bordered" style="padding: var(--space-3); margin-bottom: var(--space-3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-2);">
                        <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
                            ${H({text:r,variant:a,size:"sm",rounded:!0}).outerHTML}
                            <span class="text-xs text-gray-500">${this.escapeHtml(i)}</span>
                        </div>
                        <span class="text-xs text-gray-400">${o?j(o):"Time unavailable"}</span>
                    </div>
                    <p class="text-sm">${this.escapeHtml(s.content||s.description||"")}</p>
                    <p class="text-xs text-gray-400" style="margin-top: var(--space-2);">Move ${s.move||1} | Phase ${s.phase||1}</p>
                </div>
            `}).join("")}
        `}renderTribeStreetJournalEmbed(){var t,s;const e=document.getElementById("tribeStreetJournalEmbed");!e||(t=e.innerHTML)!=null&&t.includes(He)||(e.innerHTML=je({title:`${((s=this.teamContext)==null?void 0:s.teamLabel)||this.teamLabel||"Team"} Tribe Street Journal live site`}))}renderVerbaAiList(){const e=document.getElementById("verbaAiList");if(e){if(this.verbaAiUpdates.length===0){e.innerHTML=`
                <div class="empty-state">
                    <h3 class="empty-state-title">No Verba AI Updates Yet</h3>
                    <p class="empty-state-message">White Cell Verba AI population sentiment updates will appear here.</p>
                </div>
            `;return}e.innerHTML=this.verbaAiUpdates.map(t=>`
            <div class="card card-bordered" style="padding: var(--space-3); margin-bottom: var(--space-3); border-left: 3px solid var(--color-success);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-2);">
                    <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
                        ${H({text:"VERBA AI",variant:"success",size:"sm",rounded:!0}).outerHTML}
                        <span class="text-xs text-gray-500">${this.escapeHtml(this.formatCommunicationTarget(t.to_role))}</span>
                    </div>
                    <span class="text-xs text-gray-400">${j(t.created_at)}</span>
                </div>
                <p class="text-sm">${this.escapeHtml(t.content||"")}</p>
            </div>
        `).join("")}}renderTimeline(){const e=document.getElementById("timelineList");if(e){if(this.timelineEvents.length===0){e.innerHTML=`
                <div class="empty-state">
                    <h3 class="empty-state-title">No Timeline Events</h3>
                    <p class="empty-state-message">Session activity will appear here as the exercise progresses.</p>
                </div>
            `;return}e.innerHTML=this.timelineEvents.map(t=>`
            <div class="timeline-event" style="display: flex; gap: var(--space-3); padding: var(--space-3); border-bottom: 1px solid var(--color-gray-200);">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary-500); margin-top: 6px; flex-shrink: 0;"></div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-2);">
                        ${H({text:t.type||"EVENT",size:"sm",rounded:!0}).outerHTML}
                        <span class="text-xs text-gray-400">${j(t.created_at)}</span>
                    </div>
                    <p class="text-sm mt-1">${this.escapeHtml(t.content||t.description||"")}</p>
                    <p class="text-xs text-gray-400 mt-1">${this.escapeHtml(this.formatTeamLabel(t.team))} | Move ${t.move||1} | Phase ${t.phase||1}</p>
                </div>
            </div>
        `).join("")}}async handleCaptureSubmit(e){var i,o;if(e.preventDefault(),!this.requireWriteAccess())return;const t=(i=document.querySelector('input[name="captureType"]:checked'))==null?void 0:i.value,s=document.getElementById("captureContent"),r=(o=s==null?void 0:s.value)==null?void 0:o.trim();if(!r){f({message:"Please enter content",type:"error"});return}const a=x.getSessionId();if(a){$({message:"Saving observation..."});try{const n=this.getCurrentGameState(),l=await b.createTimelineEvent({session_id:a,type:t,content:r,metadata:{role:this.role||this.getCurrentLeadRole()},team:this.teamId,move:n.move??1,phase:n.phase??1});I.updateFromServer("INSERT",l),f({message:"Observation saved",type:"success"}),s&&(s.value="")}catch(n){S.error("Failed to save capture:",n),f({message:"Failed to save observation",type:"error"})}finally{L()}}}formatCommunicationTarget(e){return{all:"White Cell communication to all teams",[this.teamId]:`White Cell communication to ${this.teamLabel}`,[this.teamContext.facilitatorRole]:`White Cell communication to ${this.teamContext.facilitatorLabel}`,[this.teamContext.scribeRole]:`White Cell communication to ${this.teamContext.scribeLabel}`}[e]||e||"White Cell communication"}formatTeamLabel(e){return e===this.teamId?this.teamLabel:e==="white_cell"?"White Cell":e||""}escapeHtml(e){if(typeof e!="string")return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}destroy(){this.storeUnsubscribers.forEach(e=>e==null?void 0:e()),this.storeUnsubscribers=[]}}const Q=new st,rt=typeof document<"u"&&typeof window<"u"&&!globalThis.__ESG_DISABLE_AUTO_INIT__;rt&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>Q.init()):Q.init(),window.addEventListener("beforeunload",()=>Q.destroy()));
//# sourceMappingURL=facilitator-BE50DEcS.js.map
