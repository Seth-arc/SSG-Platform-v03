import{s as S,w as ce,x as le,c as de,a as d,n as Q,m as me,E as x,h as ue,q as pe,r as I,t as H,y as Z,u as O,z as X,A as K,B as ee,C as he,D as fe,d as $,f as A,j as R}from"./main-BYET35L_.js";import{s as W,a as P}from"./Modal-O3kyaPUL.js";import{a as ge,c as M,b as te,f as U,d as k,e as z}from"./formatting-QmcNEoUH.js";import{g as be,a as ye,f as se,b as ie,c as D,B as ae,d as re,e as ve,h as Se,i as Ae,j as xe,k as Ee,l as Te,m as Ce,s as Ie}from"./blueActionDetails-BFb7nCS4.js";import{a as Oe}from"./validation-BnFSv1Ez.js";const v=de("Facilitator"),$e=new Set(["NOTE","MOMENT","QUOTE"]),Re=20,L=3;function ne(p={}){return(p==null?void 0:p.created_at)||(p==null?void 0:p.updated_at)||(p==null?void 0:p.timestamp)||null}function oe(p={}){const e=ne(p);if(!e)return 0;const t=new Date(e).getTime();return Number.isFinite(t)?t:0}function Le(p={},e=null){var s;const t=(p==null?void 0:p.type)??(p==null?void 0:p.event_type)??null;return!!e&&(p==null?void 0:p.team)===e&&$e.has(t)&&((s=p==null?void 0:p.metadata)==null?void 0:s.source)!=="notetaker_save"}function Be(p=[],e=null){return[...p||[]].filter(t=>Le(t,e)).sort((t,s)=>oe(s)-oe(t)).slice(0,Re)}function _e({role:p,teamContext:e,observerTeamId:t=null}){return p===e.facilitatorRole?{allowed:!0,readOnly:!1,reason:null}:p===x.ROLES.VIEWER&&t===e.teamId?{allowed:!0,readOnly:!0,reason:null}:p===x.ROLES.VIEWER?{allowed:!1,readOnly:!0,reason:"observer-team-mismatch",observerTeamId:t}:{allowed:!1,readOnly:!1,reason:"role-mismatch"}}class Fe{constructor(){this.actions=[],this.rfis=[],this.responses=[],this.journalEntries=[],this.timelineEvents=[],this.storeUnsubscribers=[],this.role=S.getRole(),this.isReadOnly=!1,this.teamContext=ce(),this.teamId=this.teamContext.teamId,this.teamLabel=this.teamContext.teamLabel,this.responseTargets=le(this.teamId)}async init(){var a,i,n,o;v.info("Initializing Facilitator interface");const e=S.getSessionId();if(!e){d({message:"No session found. Please join a session first.",type:"error"}),setTimeout(()=>{Q("")},2e3);return}this.role=S.getRole()||((a=S.getSessionData())==null?void 0:a.role);const t=((i=S.getSessionData())==null?void 0:i.team)||null,s=_e({role:this.role,teamContext:this.teamContext,observerTeamId:t});if(!s.allowed){const c=s.reason==="observer-team-mismatch"&&s.observerTeamId?me(x.ROLES.VIEWER,{observerTeamId:s.observerTeamId}):"";d({message:s.reason==="observer-team-mismatch"?"Observer access is limited to the team selected when you joined the session.":`This page is only available to the ${this.teamLabel} Facilitator or Observer role.`,type:"error"}),Q(c||"",{replace:!0});return}this.isReadOnly=s.readOnly,await ue.initialize(e,{participantId:((o=(n=S).getSessionParticipantId)==null?void 0:o.call(n))||null}),this.configureAccessMode(),this.bindEventListeners(),this.subscribeToLiveData(),this.syncActionsFromStore(),this.syncRfisFromStore(),this.syncResponsesFromStores(),this.syncTimelineFromStore(),v.info("Facilitator interface initialized")}isAllowedRole(e){return e===this.teamContext.facilitatorRole||e===x.ROLES.VIEWER}configureAccessMode(){const e=document.getElementById("sessionRoleLabel"),t=document.getElementById("facilitatorModeNotice"),s=document.querySelectorAll('[data-write-control="true"]'),a=document.querySelector(".header-title"),i=document.getElementById("captureNavItem"),n=document.getElementById("captureSection"),o=document.querySelector("#actionsSection .section-description"),c=document.querySelector("#requestsSection .section-description"),r=document.querySelector("#responsesSection .section-description"),h=document.querySelector("#tribeStreetJournalSection .section-description"),b=document.querySelector("#timelineSection .section-description");document.body.dataset.facilitatorMode=this.isReadOnly?"observer":"facilitator",e&&(e.textContent=this.isReadOnly?"Observer":"Facilitator"),a&&(a.textContent=this.isReadOnly?this.teamContext.observerLabel:this.teamContext.facilitatorLabel),s.forEach(l=>{var f;l.hidden=this.isReadOnly,l.toggleAttribute("aria-hidden",this.isReadOnly),(f=l.querySelectorAll)==null||f.call(l,"button, input, select, textarea").forEach(m=>{m.disabled=this.isReadOnly,m.toggleAttribute("aria-disabled",this.isReadOnly)})}),i&&(i.hidden=this.isReadOnly),n&&this.isReadOnly&&(n.style.display="none"),o&&(o.textContent=this.isReadOnly?"Passive observer view of facilitator actions. Drafts are visible but cannot be created, edited, submitted, or deleted.":"Draft actions, submit them to White Cell, and track adjudication results."),c&&(c.textContent=this.isReadOnly?"Passive observer view of RFIs and responses. Request submission is disabled in observer mode.":"Submit questions to White Cell and monitor the response status."),r&&(r.textContent=this.isReadOnly?"Passive feed of White Cell responses to this team.":"View responses to your RFIs and communications"),h&&(h.textContent=this.isReadOnly?"Passive feed of the latest team notes, moments, and quotes captured during the exercise.":"Review the latest team notes, moments, and quotes captured during the exercise."),b&&(b.textContent=this.isReadOnly?"Passive session activity feed for the selected team.":"Chronological view of all events"),t&&(this.isReadOnly?(t.style.display="block",t.innerHTML=`
                    <h2 class="font-semibold mb-2">Observer Mode</h2>
                    <p class="text-sm text-gray-600">
                        This page is passive for the observer role. You can review facilitator actions,
                        White Cell responses, RFIs, and the timeline, but create, edit, submit, delete,
                        and capture paths are blocked in code and hidden in the interface.
                    </p>
                `):(t.style.display="block",t.innerHTML=`
                    <h2 class="font-semibold mb-2">Action Lifecycle</h2>
                    <p class="text-sm text-gray-600">
                        Draft actions stay editable until you submit them to White Cell. Submitted
                        actions become read-only and remain in review until White Cell adjudicates them.
                    </p>
                `))}bindEventListeners(){var a;const e=document.getElementById("newActionBtn"),t=document.getElementById("newRfiBtn"),s=document.getElementById("captureForm");if(this.isReadOnly){e==null||e.setAttribute("aria-disabled","true"),t==null||t.setAttribute("aria-disabled","true"),(a=s==null?void 0:s.querySelectorAll)==null||a.call(s,"button, input, select, textarea").forEach(i=>{i.disabled=!0,i.setAttribute("aria-disabled","true")});return}e==null||e.addEventListener("click",()=>this.showCreateActionModal()),t==null||t.addEventListener("click",()=>this.showCreateRfiModal()),s==null||s.addEventListener("submit",i=>this.handleCaptureSubmit(i))}requireWriteAccess(){return this.isReadOnly?(d({message:"Observer mode is read-only on the facilitator page.",type:"error"}),!1):!0}getCurrentGameState(){var e;return pe.getState()||((e=S.getSessionData())==null?void 0:e.gameState)||{move:1,phase:1}}getBlueActionSequenceContext(e=null){const t=this.getCurrentGameState(),s=(e==null?void 0:e.move)||t.move||1,a=e!=null&&e.id?be(this.actions,e):ye(this.actions,this.teamId,s);return{move:s,actionNumber:a,label:se({teamLabel:this.teamLabel,move:s,actionNumber:a})}}subscribeToLiveData(){this.storeUnsubscribers.push(I.subscribe(()=>{this.syncActionsFromStore()})),this.storeUnsubscribers.push(H.subscribe(()=>{this.syncRfisFromStore(),this.syncResponsesFromStores()})),this.storeUnsubscribers.push(Z.subscribe(()=>{this.syncResponsesFromStores()})),this.storeUnsubscribers.push(O.subscribe(()=>{this.syncTimelineFromStore()}))}syncActionsFromStore(){this.actions=I.getByTeam(this.teamId),this.renderActionsList();const e=document.getElementById("actionsBadge");e&&(e.textContent=this.actions.length.toString())}syncRfisFromStore(){this.rfis=H.getByTeam(this.teamId),this.renderRfiList();const e=document.getElementById("rfiBadge");e&&(e.textContent=this.rfis.filter(t=>t.status==="pending").length.toString())}syncResponsesFromStores(){const e=H.getByTeam(this.teamId).filter(s=>s.status==="answered"&&s.response).map(s=>({id:s.id,kind:"rfi",created_at:s.responded_at||s.updated_at||s.created_at,title:s.query||s.question||"RFI response",content:s.response,status:s.status,priority:s.priority})),t=Z.getAll().filter(s=>s.from_role==="white_cell"&&this.responseTargets.has(s.to_role)).map(s=>({id:s.id,kind:"communication",created_at:s.created_at,title:this.formatCommunicationTarget(s.to_role),content:s.content,type:s.type||"MESSAGE"}));this.responses=[...e,...t].sort((s,a)=>new Date(a.created_at)-new Date(s.created_at)),this.renderResponsesList()}syncTimelineFromStore(){const e=O.getAll().filter(t=>[this.teamId,"white_cell"].includes(t.team)).slice(0,50);this.timelineEvents=e,this.journalEntries=Be(e,this.teamId),this.renderTimeline(),this.renderTribeStreetJournalList()}renderActionsList(){const e=document.getElementById("actionsList");if(e){if(this.actions.length===0){e.innerHTML=`
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
            `;return}e.innerHTML=this.actions.map(t=>this.renderActionCard(t)).join(""),e.querySelectorAll(".edit-action-btn").forEach(t=>{t.addEventListener("click",()=>{const s=this.actions.find(a=>a.id===t.dataset.actionId);s&&this.showEditActionModal(s)})}),e.querySelectorAll(".submit-action-btn").forEach(t=>{t.addEventListener("click",()=>{const s=this.actions.find(a=>a.id===t.dataset.actionId);s&&this.confirmSubmitAction(s)})}),e.querySelectorAll(".delete-action-btn").forEach(t=>{t.addEventListener("click",()=>{const s=this.actions.find(a=>a.id===t.dataset.actionId);s&&this.confirmDeleteAction(s)})})}}renderActionCard(e){const t=ie(e),s=t.title,a=t.expectedOutcomes||"No expected outcomes",i=D(t.focusCountries),n=this.isBlueTeamActionWizardEnabled(e)?this.getBlueActionSequenceContext(e).label:`Move ${e.move||1} | Phase ${e.phase||1}`,o=e.status||x.ACTION_STATUS.DRAFT,c=!this.isReadOnly&&X(e),r=!this.isReadOnly&&K(e),h=!this.isReadOnly&&ee(e),b=e.outcome?ge(e.outcome).outerHTML:"",l=t.hasBlueActionDetails&&t.enforcementTimeline?M({text:t.enforcementTimeline,variant:"info",size:"sm",rounded:!0}).outerHTML:te(e.priority||"NORMAL").outerHTML,f=t.hasBlueActionDetails?`
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
                    <strong>Focus Countries:</strong> ${this.escapeHtml(i)} |
                    <strong>Sector:</strong> ${this.escapeHtml(t.sector||"Not specified")} |
                    <strong>Timeline:</strong> ${this.escapeHtml(t.enforcementTimeline||"Not specified")}
                </p>
                <p class="text-xs text-gray-500" style="margin-top: var(--space-2);">
                    <strong>Coordinated:</strong> ${this.escapeHtml(D(t.coordinated,"None selected"))} |
                    <strong>Informed:</strong> ${this.escapeHtml(D(t.informed,"None selected"))}
                </p>
            `:`
                ${e.ally_contingencies?`
                    <p class="text-xs text-gray-500" style="margin-bottom: var(--space-2);">
                        <strong>Ally Contingencies:</strong> ${this.escapeHtml(e.ally_contingencies)}
                    </p>
                `:""}
                <p class="text-xs text-gray-500">
                    <strong>Targets:</strong> ${this.escapeHtml(i)} |
                    <strong>Sector:</strong> ${this.escapeHtml(e.sector||"Not specified")} |
                    <strong>Exposure:</strong> ${this.escapeHtml(e.exposure_type||"Not specified")}
                </p>
            `;let m=`
            <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                Draft actions can be edited, submitted, or deleted by the facilitator.
            </p>
        `;return he(e)?m=`
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    Submitted to White Cell ${e.submitted_at?U(e.submitted_at):""}.
                    This action is now read-only for facilitators until adjudication.
                </p>
            `:fe(e)?m=`
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    White Cell adjudicated this action ${e.adjudicated_at?U(e.adjudicated_at):""}.
                </p>
            `:this.isReadOnly&&(m=`
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    Observer mode is read-only. Draft actions are visible but cannot be changed from this page.
                </p>
            `),`
            <div class="card card-bordered" data-action-id="${e.id}" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-3);">
                    <div>
                        <h3 class="card-title">${this.escapeHtml(s)}</h3>
                        <p class="card-subtitle text-sm text-gray-500">
                            ${this.escapeHtml(e.mechanism||"No mechanism")} | ${this.escapeHtml(n)}
                        </p>
                    </div>
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: flex-end;">
                        ${k(o).outerHTML}
                        ${l}
                        ${b}
                    </div>
                </div>

                <div class="card-body">
                    <p class="text-sm mb-3">${this.escapeHtml(a)}</p>
                    ${f}
                    ${e.adjudication_notes?`
                        <p class="text-xs text-gray-500" style="margin-top: var(--space-2);">
                            <strong>Adjudication Notes:</strong> ${this.escapeHtml(e.adjudication_notes)}
                        </p>
                    `:""}
                    ${m}
                </div>

                ${c||r||h?`
                    <div class="card-actions" style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
                        ${c?`
                            <button class="btn btn-secondary btn-sm edit-action-btn" data-action-id="${e.id}">
                                Edit Draft
                            </button>
                        `:""}
                        ${r?`
                            <button class="btn btn-primary btn-sm submit-action-btn" data-action-id="${e.id}">
                                Submit to White Cell
                            </button>
                        `:""}
                        ${h?`
                            <button class="btn btn-ghost btn-sm text-error delete-action-btn" data-action-id="${e.id}">
                                Delete Draft
                            </button>
                        `:""}
                    </div>
                `:""}
            </div>
        `}showCreateActionModal(){if(!this.requireWriteAccess())return;if(this.isBlueTeamActionWizardEnabled()){this.showBlueActionWizard();return}const e=this.createActionFormContent(),t={current:null};t.current=W({title:"Create New Action",content:e,size:"lg",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Save Draft",variant:"primary",onClick:()=>(this.handleCreateAction(t.current).catch(s=>{v.error("Failed to create action:",s)}),!1)}]})}showEditActionModal(e){if(!this.requireWriteAccess())return;if(!X(e)){d({message:"Only draft actions can be edited.",type:"error"});return}if(this.isBlueTeamActionWizardEnabled(e)){this.showBlueActionWizard(e);return}const t=this.createActionFormContent(e),s={current:null};s.current=W({title:"Edit Draft Action",content:t,size:"lg",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Save Changes",variant:"primary",onClick:()=>(this.handleUpdateAction(s.current,e.id).catch(a=>{v.error("Failed to update action:",a)}),!1)}]})}isBlueTeamActionWizardEnabled(e=null){return this.teamId==="blue"&&(!e||!e.team||e.team===this.teamId)}showBlueActionWizard(e=null){const t=!!(e!=null&&e.id),s=this.getBlueActionSequenceContext(e),a=this.createBlueActionWizardContent(e||{},{isEdit:t,sequenceContext:s}),i={current:null};i.current=W({title:t?"Edit Blue Team Action":"Take Action",content:a,size:"xl"}),this.bindBlueActionWizard(a,i.current,{actionId:(e==null?void 0:e.id)||null,sequenceContext:s})}createBlueActionWizardContent(e={},{isEdit:t=!1,sequenceContext:s=null}={}){const a=document.createElement("div"),i=ie(e),n=e.goal||e.title||"",o=!!e.sector&&!ae.includes(e.sector),c=!!i.implementation&&!re.includes(i.implementation),r=o?"Other":e.sector||"",h=c?"Other":i.implementation||"",b=(s==null?void 0:s.label)||se({teamLabel:this.teamLabel,move:(e==null?void 0:e.move)||this.getCurrentGameState().move||1,actionNumber:null}),l=(m,y="",g="Select an option")=>`
            <option value="">${g}</option>
            ${m.map(T=>`
                <option value="${T}" ${y===T?"selected":""}>${T}</option>
            `).join("")}
        `,f=(m,y,g=[])=>{const T=`${m}${y.replace(/[^a-z0-9]+/gi,"")}`;return`
                <label class="form-check" for="${T}">
                    <input
                        id="${T}"
                        class="form-checkbox"
                        type="checkbox"
                        data-blue-action-checkbox="${m}"
                        value="${y}"
                        ${g.includes(y)?"checked":""}
                    >
                    <span class="form-check-label">${y}</span>
                </label>
            `};return a.innerHTML=`
            <form id="blueActionWizardForm" novalidate>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4);">
                    <div>
                        <p class="text-xs text-gray-500" id="blueActionWizardStepLabel">Page 1 of ${L}</p>
                        <h3 class="font-semibold" style="margin: 0;">Blue Team Action Builder</h3>
                        <p class="text-sm text-gray-500" id="blueActionWizardSequenceLabel" style="margin: var(--space-2) 0 0;">${this.escapeHtml(b)}</p>
                    </div>
                    <div aria-hidden="true" style="display: flex; gap: var(--space-2);">
                        ${Array.from({length:L},(m,y)=>`
                            <span
                                data-blue-action-step="${y}"
                                style="width: 28px; height: 4px; border-radius: 999px; background: ${y===0?"var(--color-primary-500)":"var(--color-gray-200)"};"
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
                                value="${this.escapeHtml(n)}"
                                maxlength="200"
                            >
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="actionInstrument">Instrument of Power *</label>
                            <select id="actionInstrument" class="form-select">
                                ${l(xe,e.mechanism||"","Select instrument")}
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
                        >${this.escapeHtml(i.objective)}</textarea>
                        <p class="form-hint" id="actionObjectiveHint">State the objective this action is meant to achieve.</p>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="actionLever">Lever *</label>
                        <select id="actionLever" class="form-select">
                            ${l(Ee,i.lever||"","Select lever")}
                        </select>
                    </div>
                </section>

                <section data-blue-action-page="1" hidden>
                    <div class="section-grid section-grid-2">
                        <div class="form-group">
                            <label class="form-label" for="actionBlueSector">Sector *</label>
                            <select id="actionBlueSector" class="form-select" data-blue-action-other-target="actionBlueSectorOther">
                                ${l(ae,r,"Select sector")}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="actionSupplyChainFocus">Supply Chain Focus *</label>
                            <select id="actionSupplyChainFocus" class="form-select">
                                ${l(Te,e.exposure_type||"","Select supply chain focus")}
                            </select>
                        </div>
                    </div>

                    <div
                        class="form-group"
                        id="actionBlueSectorOtherGroup"
                        ${r==="Other"?"":"hidden"}
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
                                ${l(re,h,"Select implementation")}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="actionEnforcementTimeline">Enforcement Timeline *</label>
                            <select id="actionEnforcementTimeline" class="form-select">
                                ${l(Ce,i.enforcementTimeline||"","Select timeline")}
                            </select>
                        </div>
                    </div>

                    <div
                        class="form-group"
                        id="actionImplementationOtherGroup"
                        ${h==="Other"?"":"hidden"}
                    >
                        <label class="form-label" for="actionImplementationOther">Other Implementation *</label>
                        <input
                            id="actionImplementationOther"
                            class="form-input"
                            type="text"
                            value="${this.escapeHtml(c?i.implementation:"")}"
                            maxlength="120"
                        >
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="actionFocusCountries">Focus Countries *</label>
                        <select id="actionFocusCountries" class="form-select" multiple size="5">
                            ${ve.map(m=>`
                                <option value="${m}" ${i.focusCountries.includes(m)?"selected":""}>${m}</option>
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
                                ${Se.map(m=>f("coordinated",m,i.coordinated)).join("")}
                            </div>
                        </div>
                        <div class="card card-bordered" style="padding: var(--space-4);">
                            <h4 class="font-semibold" style="margin: 0 0 var(--space-3);">Informed</h4>
                            <div style="display: grid; gap: var(--space-3);">
                                ${Ae.map(m=>f("informed",m,i.informed)).join("")}
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
        `,a}bindBlueActionWizard(e,t,{actionId:s=null,sequenceContext:a=null}={}){var _,F,N;const i=e.querySelector("#blueActionWizardForm"),n=Array.from(e.querySelectorAll("[data-blue-action-page]")),o=e.querySelector("#blueActionWizardStepLabel"),c=e.querySelector("#blueActionWizardSequenceLabel"),r=Array.from(e.querySelectorAll("[data-blue-action-step]")),h=e.querySelector('[data-blue-action-nav="back"]'),b=e.querySelector('[data-blue-action-nav="next"]'),l=e.querySelector('[data-blue-action-nav="saveDraft"]'),f=e.querySelector('[data-blue-action-nav="submit"]'),m=e.querySelector('[data-blue-action-nav="saveChanges"]'),y=e.querySelector("#blueActionSummary");let g=0;const T=(u,E,C)=>{const j=i.querySelector(`#${u}`),V=i.querySelector(`#${E}`),J=i.querySelector(`#${C}`),Y=(j==null?void 0:j.value)==="Other";J&&(J.hidden=!Y),V&&!Y&&(V.value="")},q=()=>{const u=this.getBlueActionWizardData(i);y.innerHTML=`
                <p><strong>Sequence:</strong> ${this.escapeHtml((a==null?void 0:a.label)||"")}</p>
                <p><strong>Title:</strong> ${this.escapeHtml(u.actionTitle||"Not specified")}</p>
                <p><strong>Objective:</strong> ${this.escapeHtml(u.objective||"Not specified")}</p>
                <p><strong>Instrument:</strong> ${this.escapeHtml(u.instrumentOfPower||"Not specified")} | <strong>Lever:</strong> ${this.escapeHtml(u.lever||"Not specified")}</p>
                <p><strong>Sector:</strong> ${this.escapeHtml(u.sector||"Not specified")} | <strong>Supply Chain Focus:</strong> ${this.escapeHtml(u.supplyChainFocus||"Not specified")}</p>
                <p><strong>Implementation:</strong> ${this.escapeHtml(u.implementation||"Not specified")} | <strong>Timeline:</strong> ${this.escapeHtml(u.enforcementTimeline||"Not specified")}</p>
                <p><strong>Focus Countries:</strong> ${this.escapeHtml(D(u.focusCountries))}</p>
                <p><strong>Expected Outcomes:</strong> ${this.escapeHtml(u.expectedOutcomes||"Not specified")}</p>
            `},w=()=>{var E,C;const u=(E=n[g])==null?void 0:E.querySelector("input, select, textarea, button");(C=u==null?void 0:u.focus)==null||C.call(u)},B=()=>{n.forEach((u,E)=>{u.hidden=E!==g}),r.forEach((u,E)=>{u.style.background=E<=g?"var(--color-primary-500)":"var(--color-gray-200)"}),o&&(o.textContent=`Page ${g+1} of ${L}`),c&&(a!=null&&a.label)&&(c.textContent=a.label),h&&(h.hidden=g===0),b&&(b.hidden=g===L-1),l&&(l.hidden=g!==L-1),f&&(f.hidden=g!==L-1),m&&(m.hidden=g!==L-1),g===L-1&&q(),w()};(_=i.querySelector("#actionBlueSector"))==null||_.addEventListener("change",()=>{T("actionBlueSector","actionBlueSectorOther","actionBlueSectorOtherGroup")}),(F=i.querySelector("#actionImplementation"))==null||F.addEventListener("change",()=>{T("actionImplementation","actionImplementationOther","actionImplementationOtherGroup")}),(N=e.querySelector('[data-blue-action-nav="cancel"]'))==null||N.addEventListener("click",()=>{t==null||t.close()}),h==null||h.addEventListener("click",()=>{g=Math.max(0,g-1),B()}),b==null||b.addEventListener("click",()=>{const u=this.getBlueActionWizardData(i),E=this.validateBlueActionWizardPage(u,g);if(E){d({message:E,type:"error"});return}g=Math.min(L-1,g+1),B()}),l==null||l.addEventListener("click",()=>{this.saveBlueActionDraft(t,i).catch(u=>{v.error("Failed to save Blue team draft action:",u)})}),f==null||f.addEventListener("click",()=>{this.submitBlueActionFromWizard(t,i).catch(u=>{v.error("Failed to submit Blue team action from wizard:",u)})}),m==null||m.addEventListener("click",()=>{this.saveBlueActionChanges(t,i,s).catch(u=>{v.error("Failed to update Blue team draft action:",u)})}),B()}getBlueActionWizardData(e){var r,h,b,l,f,m,y,g,T,q,w,B,_,F,N,u,E;const t=Array.from(((r=e.querySelector("#actionFocusCountries"))==null?void 0:r.selectedOptions)||[]).map(C=>C.value),s=Array.from(e.querySelectorAll('[data-blue-action-checkbox="coordinated"]:checked')).map(C=>C.value),a=Array.from(e.querySelectorAll('[data-blue-action-checkbox="informed"]:checked')).map(C=>C.value),i=((h=e.querySelector("#actionBlueSector"))==null?void 0:h.value)||"",n=((b=e.querySelector("#actionImplementation"))==null?void 0:b.value)||"",o=((f=(l=e.querySelector("#actionBlueSectorOther"))==null?void 0:l.value)==null?void 0:f.trim())||"",c=((y=(m=e.querySelector("#actionImplementationOther"))==null?void 0:m.value)==null?void 0:y.trim())||"";return{actionTitle:((T=(g=e.querySelector("#actionTitle"))==null?void 0:g.value)==null?void 0:T.trim())||"",objective:((w=(q=e.querySelector("#actionObjective"))==null?void 0:q.value)==null?void 0:w.trim())||"",instrumentOfPower:((B=e.querySelector("#actionInstrument"))==null?void 0:B.value)||"",lever:((_=e.querySelector("#actionLever"))==null?void 0:_.value)||"",sector:i==="Other"?o:i,sectorSelectValue:i,sectorOther:o,supplyChainFocus:((F=e.querySelector("#actionSupplyChainFocus"))==null?void 0:F.value)||"",implementation:n==="Other"?c:n,implementationSelectValue:n,implementationOther:c,focusCountries:t,enforcementTimeline:((N=e.querySelector("#actionEnforcementTimeline"))==null?void 0:N.value)||"",expectedOutcomes:((E=(u=e.querySelector("#actionExpectedOutcomes"))==null?void 0:u.value)==null?void 0:E.trim())||"",coordinated:s,informed:a}}validateBlueActionWizardPage(e,t){if(t===0){if(!e.actionTitle)return"Action Title is required.";if(!e.objective)return"Objective is required.";if(!e.instrumentOfPower)return"Instrument of Power is required.";if(!e.lever)return"Lever is required."}if(t===1){if(!e.sectorSelectValue)return"Sector is required.";if(e.sectorSelectValue==="Other"&&!e.sectorOther)return"Please enter the custom sector.";if(!e.supplyChainFocus)return"Supply Chain Focus is required.";if(!e.implementationSelectValue)return"Implementation is required.";if(e.implementationSelectValue==="Other"&&!e.implementationOther)return"Please enter the custom implementation.";if(!e.focusCountries.length)return"Select at least one focus country.";if(!e.enforcementTimeline)return"Enforcement Timeline is required.";if(!e.expectedOutcomes)return"Expected Outcomes is required."}return null}buildBlueActionPayload(e){return{goal:e.actionTitle,mechanism:e.instrumentOfPower,sector:e.sector,exposure_type:e.supplyChainFocus,priority:"NORMAL",targets:e.focusCountries,expected_outcomes:e.expectedOutcomes,ally_contingencies:Ie({objective:e.objective,lever:e.lever,implementation:e.implementation,enforcementTimeline:e.enforcementTimeline,coordinated:e.coordinated,informed:e.informed})}}async saveBlueActionDraft(e,t){if(!this.requireWriteAccess())return;const s=this.getBlueActionWizardData(t),a=this.validateBlueActionWizardPage(s,0),i=this.validateBlueActionWizardPage(s,1),n=S.getSessionId();if(a||i){d({message:a||i,type:"error"});return}if(!n){d({message:"No session found",type:"error"});return}$({message:"Saving draft..."});try{const o=this.getCurrentGameState(),c=await A.createAction({...this.buildBlueActionPayload(s),session_id:n,client_id:S.getClientId(),team:this.teamId,status:x.ACTION_STATUS.DRAFT,move:o.move??1,phase:o.phase??1});I.updateFromServer("INSERT",c);const r=await A.createTimelineEvent({session_id:n,type:"ACTION_CREATED",content:`Draft action created: ${c.goal||"Untitled action"}`,metadata:{related_id:c.id,role:this.role||this.teamContext.facilitatorRole},team:this.teamId,move:c.move??1,phase:c.phase??1});O.updateFromServer("INSERT",r),d({message:"Draft action saved",type:"success"}),e==null||e.close()}catch(o){v.error("Failed to create Blue team draft action:",o),d({message:o.message||"Failed to save draft action",type:"error"})}finally{R()}}async saveBlueActionChanges(e,t,s){if(!this.requireWriteAccess())return;const a=this.getBlueActionWizardData(t),i=this.validateBlueActionWizardPage(a,0),n=this.validateBlueActionWizardPage(a,1);if(i||n){d({message:i||n,type:"error"});return}$({message:"Updating draft..."});try{const o=await A.updateDraftAction(s,this.buildBlueActionPayload(a));I.updateFromServer("UPDATE",o),d({message:"Draft action updated",type:"success"}),e==null||e.close()}catch(o){v.error("Failed to update Blue team draft action:",o),d({message:o.message||"Failed to update draft action",type:"error"})}finally{R()}}async submitBlueActionFromWizard(e,t){if(!this.requireWriteAccess())return;const s=this.getBlueActionWizardData(t),a=this.validateBlueActionWizardPage(s,0),i=this.validateBlueActionWizardPage(s,1),n=S.getSessionId(),o=this.getBlueActionSequenceContext();if(a||i){d({message:a||i,type:"error"});return}if(!n){d({message:"No session found",type:"error"});return}if(await P({title:"Confirm Action",message:`Submit ${o.label} to White Cell? It will appear as submitted immediately after confirmation.`,confirmLabel:"Submit",variant:"primary"})){$({message:"Submitting action..."});try{const r=this.getCurrentGameState(),h=await A.createAction({...this.buildBlueActionPayload(s),session_id:n,client_id:S.getClientId(),team:this.teamId,status:x.ACTION_STATUS.DRAFT,move:r.move??1,phase:r.phase??1});I.updateFromServer("INSERT",h);const b=await A.createTimelineEvent({session_id:n,type:"ACTION_CREATED",content:`Draft action created: ${h.goal||"Untitled action"}`,metadata:{related_id:h.id,role:this.role||this.teamContext.facilitatorRole},team:this.teamId,move:h.move??1,phase:h.phase??1});O.updateFromServer("INSERT",b);const l=await A.submitAction(h.id);I.updateFromServer("UPDATE",l);const f=await A.createTimelineEvent({session_id:l.session_id,type:"ACTION_SUBMITTED",content:`Action submitted to White Cell: ${l.goal||"Untitled action"}`,metadata:{related_id:l.id,role:this.role||this.teamContext.facilitatorRole},team:this.teamId,move:l.move??1,phase:l.phase??1});O.updateFromServer("INSERT",f),d({message:"Action submitted to White Cell",type:"success"}),e==null||e.close()}catch(r){v.error("Failed to submit Blue team action:",r),d({message:r.message||"Failed to submit action",type:"error"})}finally{R()}}}createActionFormContent(e={}){const t=document.createElement("div"),s=Array.isArray(e.targets)?e.targets:e.target?[e.target]:[],a=x.MECHANISMS.map(r=>`<option value="${r}" ${e.mechanism===r?"selected":""}>${r}</option>`).join(""),i=x.SECTORS.map(r=>`<option value="${r}" ${e.sector===r?"selected":""}>${r}</option>`).join(""),n=x.EXPOSURE_TYPES.map(r=>`<option value="${r}" ${e.exposure_type===r?"selected":""}>${r}</option>`).join(""),o=x.TARGETS.map(r=>`<option value="${r}" ${s.includes(r)?"selected":""}>${r}</option>`).join(""),c=x.PRIORITY.map(r=>`<option value="${r}" ${(e.priority||"NORMAL")===r?"selected":""}>${r}</option>`).join("");return t.innerHTML=`
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
                            ${a}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="actionSector">Sector *</label>
                        <select id="actionSector" class="form-select" required>
                            <option value="">Select sector</option>
                            ${i}
                        </select>
                    </div>
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="actionExposureType">Exposure Type</label>
                        <select id="actionExposureType" class="form-select">
                            <option value="">Select exposure type</option>
                            ${n}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="actionPriority">Priority</label>
                        <select id="actionPriority" class="form-select">
                            ${c}
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
        `,t}getActionFormData(){var a,i,n,o,c,r,h,b,l,f;const e=document.getElementById("actionTargets"),t={goal:(i=(a=document.getElementById("actionGoal"))==null?void 0:a.value)==null?void 0:i.trim(),mechanism:(n=document.getElementById("actionMechanism"))==null?void 0:n.value,sector:(o=document.getElementById("actionSector"))==null?void 0:o.value,exposure_type:((c=document.getElementById("actionExposureType"))==null?void 0:c.value)||null,priority:((r=document.getElementById("actionPriority"))==null?void 0:r.value)||"NORMAL",targets:e?Array.from(e.selectedOptions).map(m=>m.value):[],expected_outcomes:(b=(h=document.getElementById("actionExpectedOutcomes"))==null?void 0:h.value)==null?void 0:b.trim(),ally_contingencies:(f=(l=document.getElementById("actionAllyContingencies"))==null?void 0:l.value)==null?void 0:f.trim()},s=Oe(t);return s.valid?t:(d({message:s.errors[0]||"Action validation failed",type:"error"}),null)}async handleCreateAction(e){if(!this.requireWriteAccess())return;const t=this.getActionFormData();if(!t)return;const s=S.getSessionId();if(!s){d({message:"No session found",type:"error"});return}$({message:"Saving draft..."});try{const a=this.getCurrentGameState(),i=await A.createAction({...t,session_id:s,client_id:S.getClientId(),team:this.teamId,status:x.ACTION_STATUS.DRAFT,move:a.move??1,phase:a.phase??1});I.updateFromServer("INSERT",i);const n=await A.createTimelineEvent({session_id:s,type:"ACTION_CREATED",content:`Draft action created: ${i.goal||"Untitled action"}`,metadata:{related_id:i.id,role:this.role||this.teamContext.facilitatorRole},team:this.teamId,move:i.move??1,phase:i.phase??1});O.updateFromServer("INSERT",n),d({message:"Draft action saved",type:"success"}),e==null||e.close()}catch(a){v.error("Failed to create action:",a),d({message:a.message||"Failed to save draft action",type:"error"})}finally{R()}}async handleUpdateAction(e,t){if(!this.requireWriteAccess())return;const s=this.getActionFormData();if(s){$({message:"Updating draft..."});try{const a=await A.updateDraftAction(t,s);I.updateFromServer("UPDATE",a),d({message:"Draft action updated",type:"success"}),e==null||e.close()}catch(a){v.error("Failed to update action:",a),d({message:a.message||"Failed to update draft action",type:"error"})}finally{R()}}}async confirmSubmitAction(e){if(!this.requireWriteAccess())return;if(!K(e)){d({message:"Only draft actions can be submitted.",type:"error"});return}const t=this.isBlueTeamActionWizardEnabled(e)?this.getBlueActionSequenceContext(e).label:"this draft";await P({title:"Submit Action",message:`Submit ${t} to White Cell for review? After submission it becomes read-only for facilitators.`,confirmLabel:"Submit",variant:"primary"})&&await this.submitAction(e.id)}async submitAction(e){if(this.requireWriteAccess()){$({message:"Submitting action..."});try{const t=await A.submitAction(e);I.updateFromServer("UPDATE",t);const s=await A.createTimelineEvent({session_id:t.session_id,type:"ACTION_SUBMITTED",content:`Action submitted to White Cell: ${t.goal||"Untitled action"}`,metadata:{related_id:t.id,role:this.role||this.teamContext.facilitatorRole},team:this.teamId,move:t.move??1,phase:t.phase??1});O.updateFromServer("INSERT",s),d({message:"Action submitted to White Cell",type:"success"})}catch(t){v.error("Failed to submit action:",t),d({message:t.message||"Failed to submit action",type:"error"})}finally{R()}}}async confirmDeleteAction(e){if(!this.requireWriteAccess())return;if(!ee(e)){d({message:"Only draft actions can be deleted.",type:"error"});return}await P({title:"Delete Draft Action",message:"Delete this draft action? This cannot be undone.",confirmLabel:"Delete",variant:"danger"})&&await this.deleteAction(e.id)}async deleteAction(e){if(this.requireWriteAccess()){$({message:"Deleting draft..."});try{await A.deleteDraftAction(e),I.updateFromServer("DELETE",{id:e}),d({message:"Draft action deleted",type:"success"})}catch(t){v.error("Failed to delete action:",t),d({message:t.message||"Failed to delete draft action",type:"error"})}finally{R()}}}renderRfiList(){const e=document.getElementById("rfiList");if(e){if(this.rfis.length===0){e.innerHTML=`
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
                            ${k(t.status||"pending").outerHTML}
                            ${te(t.priority||"NORMAL").outerHTML}
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
                    <p class="text-xs text-gray-400 mt-2">${U(t.created_at)}</p>
                </div>
            `}).join("")}}showCreateRfiModal(){if(!this.requireWriteAccess())return;const e=document.createElement("div"),t=x.PRIORITY.map(i=>`<option value="${i}">${i}</option>`).join(""),s=x.RFI_CATEGORIES.map(i=>`<option value="${i}">${i}</option>`).join("");e.innerHTML=`
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
        `;const a={current:null};a.current=W({title:"Submit Request for Information",content:e,size:"md",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Submit RFI",variant:"primary",onClick:()=>(this.handleCreateRfi(a.current).catch(i=>{v.error("Failed to submit RFI:",i)}),!1)}]})}async handleCreateRfi(e){var c,r,h,b,l;if(!this.requireWriteAccess())return;const t=(r=(c=document.getElementById("rfiQuestion"))==null?void 0:c.value)==null?void 0:r.trim(),s=(b=(h=document.getElementById("rfiContext"))==null?void 0:h.value)==null?void 0:b.trim(),a=(l=document.getElementById("rfiPriority"))==null?void 0:l.value,i=document.getElementById("rfiCategories"),n=i?Array.from(i.selectedOptions).map(f=>f.value):[];if(!t){d({message:"Question is required",type:"error"});return}if(!a){d({message:"Priority is required",type:"error"});return}if(!n.length){d({message:"Select at least one category",type:"error"});return}const o=S.getSessionId();if(o){$({message:"Submitting RFI..."});try{const f=this.getCurrentGameState(),m=s?`${t}

Context: ${s}`:t,y=await A.createRequest({session_id:o,team:this.teamId,client_id:S.getClientId(),query:m,priority:a,categories:n,move:f.move??1,phase:f.phase??1});H.updateFromServer("INSERT",y);const g=await A.createTimelineEvent({session_id:o,type:"RFI_CREATED",content:`${this.teamLabel} submitted an RFI to White Cell.`,metadata:{related_id:y.id,role:this.role||this.teamContext.facilitatorRole},team:this.teamId,move:y.move??1,phase:y.phase??1});O.updateFromServer("INSERT",g),d({message:"RFI submitted successfully",type:"success"}),e==null||e.close()}catch(f){v.error("Failed to submit RFI:",f),d({message:f.message||"Failed to submit RFI",type:"error"})}finally{R()}}}renderResponsesList(){const e=document.getElementById("responsesList");if(e){if(this.responses.length===0){e.innerHTML=`
                <div class="empty-state">
                    <h3 class="empty-state-title">No Responses Yet</h3>
                    <p class="empty-state-message">White Cell responses and facilitator-directed communications will appear here.</p>
                </div>
            `;return}e.innerHTML=this.responses.map(t=>{const s=t.kind==="rfi"?k("answered").outerHTML:M({text:t.type,variant:"info",size:"sm",rounded:!0}).outerHTML;return`
                <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); margin-bottom: var(--space-2);">
                        <div>
                            <h3 class="font-semibold">${this.escapeHtml(t.title)}</h3>
                            <p class="text-xs text-gray-400">${z(t.created_at)}</p>
                        </div>
                        ${s}
                    </div>
                    <p class="text-sm">${this.escapeHtml(t.content||"")}</p>
                </div>
            `}).join("")}}renderTribeStreetJournalList(){const e=document.getElementById("tribeStreetJournalList");if(e){if(this.journalEntries.length===0){e.innerHTML=`
                <div class="empty-state">
                    <h3 class="empty-state-title">No Journal Entries Yet</h3>
                    <p class="empty-state-message">Team notes, moments, and quotes captured during the exercise will appear here.</p>
                </div>
            `;return}e.innerHTML=this.journalEntries.map(t=>{var o;const s=t.type||t.event_type||"NOTE",a={NOTE:"default",MOMENT:"warning",QUOTE:"info"}[s]||"default",i=((o=t.metadata)==null?void 0:o.actor)||this.teamContext.facilitatorLabel,n=ne(t);return`
                <div class="card card-bordered" style="padding: var(--space-3); margin-bottom: var(--space-3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-2);">
                        <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
                            ${M({text:s,variant:a,size:"sm",rounded:!0}).outerHTML}
                            <span class="text-xs text-gray-500">${this.escapeHtml(i)}</span>
                        </div>
                        <span class="text-xs text-gray-400">${n?z(n):"Time unavailable"}</span>
                    </div>
                    <p class="text-sm">${this.escapeHtml(t.content||t.description||"")}</p>
                    <p class="text-xs text-gray-400" style="margin-top: var(--space-2);">Move ${t.move||1} | Phase ${t.phase||1}</p>
                </div>
            `}).join("")}}renderTimeline(){const e=document.getElementById("timelineList");if(e){if(this.timelineEvents.length===0){e.innerHTML=`
                <div class="empty-state">
                    <h3 class="empty-state-title">No Timeline Events</h3>
                    <p class="empty-state-message">Session activity will appear here as the exercise progresses.</p>
                </div>
            `;return}e.innerHTML=this.timelineEvents.map(t=>`
            <div class="timeline-event" style="display: flex; gap: var(--space-3); padding: var(--space-3); border-bottom: 1px solid var(--color-gray-200);">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary-500); margin-top: 6px; flex-shrink: 0;"></div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-2);">
                        ${M({text:t.type||"EVENT",size:"sm",rounded:!0}).outerHTML}
                        <span class="text-xs text-gray-400">${z(t.created_at)}</span>
                    </div>
                    <p class="text-sm mt-1">${this.escapeHtml(t.content||t.description||"")}</p>
                    <p class="text-xs text-gray-400 mt-1">${this.escapeHtml(this.formatTeamLabel(t.team))} | Move ${t.move||1} | Phase ${t.phase||1}</p>
                </div>
            </div>
        `).join("")}}async handleCaptureSubmit(e){var n,o;if(e.preventDefault(),!this.requireWriteAccess())return;const t=(n=document.querySelector('input[name="captureType"]:checked'))==null?void 0:n.value,s=document.getElementById("captureContent"),a=(o=s==null?void 0:s.value)==null?void 0:o.trim();if(!a){d({message:"Please enter content",type:"error"});return}const i=S.getSessionId();if(i){$({message:"Saving observation..."});try{const c=this.getCurrentGameState(),r=await A.createTimelineEvent({session_id:i,type:t,content:a,metadata:{role:this.role||this.teamContext.facilitatorRole},team:this.teamId,move:c.move??1,phase:c.phase??1});O.updateFromServer("INSERT",r),d({message:"Observation saved",type:"success"}),s&&(s.value="")}catch(c){v.error("Failed to save capture:",c),d({message:"Failed to save observation",type:"error"})}finally{R()}}}formatCommunicationTarget(e){return{all:"White Cell communication to all teams",[this.teamId]:`White Cell communication to ${this.teamLabel}`,[this.teamContext.facilitatorRole]:`White Cell communication to ${this.teamContext.facilitatorLabel}`}[e]||e||"White Cell communication"}formatTeamLabel(e){return e===this.teamId?this.teamLabel:e==="white_cell"?"White Cell":e||""}escapeHtml(e){if(typeof e!="string")return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}destroy(){this.storeUnsubscribers.forEach(e=>e==null?void 0:e()),this.storeUnsubscribers=[]}}const G=new Fe,Ne=typeof document<"u"&&typeof window<"u"&&!globalThis.__ESG_DISABLE_AUTO_INIT__;Ne&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>G.init()):G.init(),window.addEventListener("beforeunload",()=>G.destroy()));
//# sourceMappingURL=facilitator-B07tFxuz.js.map
