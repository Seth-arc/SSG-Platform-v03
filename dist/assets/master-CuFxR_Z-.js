import{c as z,s as x,a as c,n as I,f as u,O as U,g as O,o as J,h as H,q as T,r as D,t as _,u as N,v as q,w as K,d as g,j as f}from"./main-BrkOTEy1.js";import{v as Q}from"./validation-Cw5-3A5v.js";import{c as v,f as h}from"./formatting-CMbm0mB5.js";import{s as W,c as X,a as k}from"./Modal-O3kyaPUL.js";import{d as S,e as Y,a as Z,b as ee,c as te,f as se,g as ie}from"./exportCsv-DCiubmPV.js";import"./supabase-BQbgwcOn.js";const d=z("GameMaster");function w(a){return a?new Date(a).getTime():0}function F(a="session"){return String(a).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"session"}function ne(a){return{session:a,gameState:null,participants:[],actions:[],requests:[],timeline:[]}}function ae(a={}){return typeof(a==null?void 0:a.is_active)=="boolean"?a.is_active:!0}function G(a=[]){return a.filter(e=>ae(e))}function E(a=[]){const e=a.length,t=G(a).length;return{total:e,connected:t}}function re(a=[]){const{total:e,connected:t}=E(a);return e===0?"No participants have joined this session.":t===e?`${t} connected participant${t===1?"":"s"}`:`${t} connected / ${e} total participants`}function b(a=[],e=[]){return Array.isArray(a)&&a.length>0?a:Array.isArray(e)&&e.length>0?e:Array.isArray(a)?a:Array.isArray(e)?e:[]}function oe(a=x){var s,i,n,r;const e=((s=a.getRole)==null?void 0:s.call(a))||((n=(i=a.getSessionData)==null?void 0:i.call(a))==null?void 0:n.role)||null,t=e==="white"&&((r=a.hasOperatorAccess)==null?void 0:r.call(a,U.GAME_MASTER,{role:"white"}));return{allowed:e==="white",role:e,cachedOperatorAccess:t}}function L(a=[]){return{activeSessions:a.length,totalParticipants:a.reduce((e,t)=>e+E(t.participants||[]).connected,0),totalActions:a.reduce((e,t)=>{var s;return e+(((s=t.actions)==null?void 0:s.length)||0)},0),pendingRequests:a.reduce((e,t)=>{var s;return e+(((s=t.requests)==null?void 0:s.filter(i=>i.status==="pending").length)||0)},0)}}function R(a=[],e=8){return a.flatMap(t=>(t.timeline||[]).map(s=>{var i,n;return{...s,sessionId:((i=t.session)==null?void 0:i.id)||null,sessionName:((n=t.session)==null?void 0:n.name)||"Unknown Session"}})).sort((t,s)=>w(s.created_at)-w(t.created_at)).slice(0,e)}function j(a=[],e=10){return a.flatMap(t=>G(t.participants||[]).map(s=>{var i,n;return{...s,sessionId:((i=t.session)==null?void 0:i.id)||null,sessionName:((n=t.session)==null?void 0:n.name)||"Unknown Session"}})).sort((t,s)=>w(s.heartbeat_at||s.joined_at)-w(t.heartbeat_at||t.joined_at)).slice(0,e)}function C(){return[{id:"exportJsonBtn",action:"json",successLabel:"JSON"},{id:"exportActionsCsvBtn",action:"csv-actions",successLabel:"Actions CSV"},{id:"exportRequestsCsvBtn",action:"csv-requests",successLabel:"RFIs CSV"},{id:"exportTimelineCsvBtn",action:"csv-timeline",successLabel:"Timeline CSV"},{id:"exportParticipantsCsvBtn",action:"csv-participants",successLabel:"Participants CSV"}]}function ce(a=null){return a!=null&&a.session?{disabled:!1,message:`JSON and CSV exports are ready for ${a.session.name}.`}:{disabled:!0,message:"Select a session before exporting JSON or CSV data."}}class de{constructor(){this.sessions=[],this.currentSessionId=null,this.sessionBundles=new Map,this.storeUnsubscribers=[]}async init(){if(d.info("Initializing Game Master interface"),!oe(x).allowed){d.warn("Blocked direct Game Master access without operator auth"),c("Game Master access requires operator authorization from the landing page.",{type:"error"}),I("index.html#operatorAccessSection",{replace:!0});return}try{const t=await u.requireOperatorGrant(U.GAME_MASTER,{role:"white"});x.setOperatorAuth(t)}catch(t){d.warn("Blocked Game Master access after failed server verification",t),x.clearOperatorAuth(),c("Game Master access requires a valid server-side operator grant.",{type:"error"}),I("index.html#operatorAccessSection",{replace:!0});return}if(!O().ready){d.error("Game Master page blocked: backend configuration is missing");return}this.bindEventListeners(),this.subscribeToLiveStores(),await this.loadSessions(),d.info("Game Master interface initialized")}bindEventListeners(){const e=document.getElementById("createSessionBtn");e&&e.addEventListener("click",()=>this.showCreateSessionModal());const t=document.getElementById("refreshDashboardBtn");t&&t.addEventListener("click",()=>this.loadSessions());const s=document.getElementById("participantsSessionSelect");s&&s.addEventListener("change",n=>{this.handleSessionSelectionChange(n.target.value)});const i=document.getElementById("exportSessionSelect");i&&i.addEventListener("change",n=>{this.handleSessionSelectionChange(n.target.value)}),C().forEach(({id:n,action:r})=>{const o=document.getElementById(n);o&&o.addEventListener("click",()=>{this.exportData(r)})})}async loadSessions(){const e=document.getElementById("sessionsList"),t=e?J(e,{message:"Loading sessions...",replace:!1}):null;try{if(this.sessions=await u.getActiveSessions()||[],t&&t.hide(),this.currentSessionId&&!this.sessions.some(s=>s.id===this.currentSessionId)){this.currentSessionId=null;const s=document.getElementById("sessionDetailSection"),i=document.getElementById("sessionsSection");s&&(s.style.display="none"),i&&(i.style.display="block")}this.renderSessionsList(),this.renderSessionSelectors(),await this.loadDashboardData(),await this.refreshSelectedSessionViews(),d.info(`Loaded ${this.sessions.length} sessions`)}catch(s){d.error("Failed to load sessions:",s),c("Failed to load sessions",{type:"error"}),t&&t.hide()}}async loadDashboardData(){if(this.sessions.length===0){this.sessionBundles=new Map,this.renderDashboardStats(L([])),this.renderRecentActivity([]),this.renderActiveParticipants([]);return}const e=await Promise.all(this.sessions.map(async t=>{try{return await u.fetchSessionBundle(t.id)}catch(s){return d.error("Failed to load session bundle for dashboard:",t.id,s),ne(t)}}));this.sessionBundles=new Map(e.map(t=>[t.session.id,t])),this.renderDashboardStats(L(e)),this.renderRecentActivity(R(e)),this.renderActiveParticipants(j(e))}async handleSessionSelectionChange(e){this.currentSessionId=e||null,await this.refreshSelectedSessionViews(),this.renderSessionsList()}async ensureSessionBundle(e){if(!e)return null;const t=this.sessionBundles.get(e);if(t)return t;const s=await u.fetchSessionBundle(e);return this.sessionBundles.set(e,s),s}async refreshSelectedSessionViews(){if(this.renderSessionSelectors(),!this.currentSessionId){await H.reset(),this.updateHeaderSessionState(null,null),this.renderParticipantsPanel(null),this.updateExportAvailability(null);return}try{const e=await this.ensureSessionBundle(this.currentSessionId);this.applySelectedLiveBundle(e),await H.initialize(this.currentSessionId),this.applySelectedLiveBundle(e)}catch(e){d.error("Failed to refresh selected session views:",e),c("Failed to refresh selected session views",{type:"error"})}}subscribeToLiveStores(){const e=()=>{this.applySelectedLiveBundle()};this.storeUnsubscribers.push(T.subscribe(e)),this.storeUnsubscribers.push(D.subscribe(e)),this.storeUnsubscribers.push(_.subscribe(e)),this.storeUnsubscribers.push(N.subscribe(e)),this.storeUnsubscribers.push(q.subscribe(e))}buildSelectedLiveBundle(e=null){if(!this.currentSessionId)return null;const t=this.sessionBundles.get(this.currentSessionId)||null,s=e||t||null,i=(e==null?void 0:e.session)||(t==null?void 0:t.session)||this.sessions.find(n=>n.id===this.currentSessionId)||null;return i?{session:i,gameState:T.getState()||(s==null?void 0:s.gameState)||null,participants:b(q.getAll(),s==null?void 0:s.participants),actions:b(D.getAll(),s==null?void 0:s.actions),requests:b(_.getAll(),s==null?void 0:s.requests),timeline:b(N.getAll(),s==null?void 0:s.timeline)}:null}applySelectedLiveBundle(e=null){if(!this.currentSessionId)return;const t=this.buildSelectedLiveBundle(e);if(!t)return;this.sessionBundles.set(this.currentSessionId,t);const s=[...this.sessionBundles.values()];this.renderDashboardStats(L(s)),this.renderRecentActivity(R(s)),this.renderActiveParticipants(j(s)),this.updateHeaderSessionState(t.session,t.gameState),this.renderParticipantsPanel(t),this.updateExportAvailability(t);const i=document.getElementById("sessionDetailSection");(i==null?void 0:i.style.display)!=="none"&&this.renderSessionDetails(t.session,t.participants,t.gameState,t.actions,t.requests)}updateHeaderSessionState(e,t){const s=document.getElementById("sessionName"),i=document.getElementById("headerMove"),n=document.getElementById("headerPhase");s&&(s.textContent=e?e.name:"No Session Selected"),i&&(i.textContent=(t==null?void 0:t.move)??"-"),n&&(n.textContent=t!=null&&t.phase?K(t.phase):"-")}renderSessionSelectors(){["participantsSessionSelect","exportSessionSelect"].forEach(e=>{const t=document.getElementById(e);if(!t)return;const s=this.currentSessionId||"";t.innerHTML=`
                <option value="">Select session</option>
                ${this.sessions.map(i=>{var r;const n=((r=i.metadata)==null?void 0:r.session_code)||"N/A";return`<option value="${i.id}">${this.escapeHtml(i.name)} (${n})</option>`}).join("")}
            `,t.value=this.sessions.some(i=>i.id===s)?s:""})}renderDashboardStats(e){const t=document.getElementById("statsGrid");t&&(t.innerHTML=`
            <div class="card stat-card">
                <span class="stat-label">Active Sessions</span>
                <span class="stat-value">${e.activeSessions}</span>
            </div>
            <div class="card stat-card">
                <span class="stat-label">Connected Participants</span>
                <span class="stat-value">${e.totalParticipants}</span>
            </div>
            <div class="card stat-card">
                <span class="stat-label">Actions Logged</span>
                <span class="stat-value">${e.totalActions}</span>
            </div>
            <div class="card stat-card">
                <span class="stat-label">Pending RFIs</span>
                <span class="stat-value">${e.pendingRequests}</span>
            </div>
        `)}renderRecentActivity(e){const t=document.getElementById("recentActivity");if(t){if(!e.length){t.innerHTML=`
                <div style="padding: var(--space-4); text-align: center; color: var(--color-text-muted);">
                    No recent activity has been recorded for active sessions.
                </div>
            `;return}t.innerHTML=e.map(s=>`
                <div style="padding: var(--space-4); border-bottom: 1px solid var(--color-border-light);">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-2);">
                        <div style="display: flex; gap: var(--space-2); align-items: center;">
                            ${v({text:s.type||"EVENT",variant:"info",size:"sm"}).outerHTML}
                            <span class="text-sm font-semibold">${this.escapeHtml(s.sessionName)}</span>
                        </div>
                        <span class="text-xs text-gray-500">${h(s.created_at)}</span>
                    </div>
                    <p class="text-sm">${this.escapeHtml(s.content||"No content provided")}</p>
                </div>
            `).join("")}}renderActiveParticipants(e){const t=document.getElementById("activeParticipants");if(t){if(!e.length){t.innerHTML=`
                <div style="padding: var(--space-4); text-align: center; color: var(--color-text-muted);">
                    No participants are currently connected.
                </div>
            `;return}t.innerHTML=e.map(s=>{const i=v({text:s.role||"unknown",variant:"primary",size:"sm"});return`
                <div style="padding: var(--space-4); border-bottom: 1px solid var(--color-border-light);">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-2);">
                        <div>
                            <p class="text-sm font-semibold">${this.escapeHtml(s.display_name||"Unknown")}</p>
                            <p class="text-xs text-gray-500">${this.escapeHtml(s.sessionName)}</p>
                        </div>
                        ${i.outerHTML}
                    </div>
                    <p class="text-xs text-gray-500">Last active ${h(s.heartbeat_at||s.joined_at)}</p>
                </div>
            `}).join("")}}renderSessionsList(){const e=document.getElementById("sessionsList");if(e){if(this.sessions.length===0){e.innerHTML=`
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">No Sessions</h3>
                    <p class="empty-state-message">Create your first session to get started</p>
                </div>
            `;return}e.innerHTML=this.sessions.map(t=>this.renderSessionCard(t)).join(""),this.sessions.forEach(t=>{const s=e.querySelector(`[data-session-id="${t.id}"]`);if(!s)return;const i=s.querySelector(".view-session-btn"),n=s.querySelector(".select-session-btn"),r=s.querySelector(".delete-session-btn");i&&i.addEventListener("click",()=>{this.viewSession(t.id)}),n&&n.addEventListener("click",()=>{this.handleSessionSelectionChange(t.id)}),r&&r.addEventListener("click",()=>{this.confirmDeleteSession(t.id)})})}}renderSessionCard(e){var r;const t=this.currentSessionId===e.id,s=v({text:e.status||"active",variant:e.status==="active"?"success":"default",size:"sm"}),i=t?v({text:"Selected",variant:"primary",size:"sm"}).outerHTML:"",n=((r=e.metadata)==null?void 0:r.session_code)||"N/A";return`
            <div class="session-card card card-bordered card-hoverable" data-session-id="${e.id}">
                <div class="session-card-header">
                    <div class="session-card-title-group">
                        <div style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;">
                            <h3 class="card-title">${this.escapeHtml(e.name)}</h3>
                            ${i}
                        </div>
                        <p class="card-subtitle">Code: <strong>${this.escapeHtml(n)}</strong></p>
                    </div>
                    ${s.outerHTML}
                </div>
                <div class="session-card-body">
                    <div class="session-meta">
                        <div class="session-meta-item">
                            <span class="session-meta-label">Status</span>
                            <span class="session-meta-value">${this.escapeHtml(e.status||"active")}</span>
                        </div>
                        <div class="session-meta-item">
                            <span class="session-meta-label">Created</span>
                            <span class="session-meta-value">${h(e.created_at)}</span>
                        </div>
                        <div class="session-meta-item">
                            <span class="session-meta-label">Updated</span>
                            <span class="session-meta-value">${h(e.updated_at)}</span>
                        </div>
                    </div>
                </div>
                <div class="session-card-actions">
                    <button class="btn btn-outline btn-sm select-session-btn">Select</button>
                    <button class="btn btn-primary btn-sm view-session-btn">View Details</button>
                    <button class="btn btn-danger btn-sm delete-session-btn">Delete</button>
                </div>
            </div>
        `}showCreateSessionModal(){const e=document.createElement("div");e.innerHTML=`
            <form id="createSessionForm">
                <div class="form-group">
                    <label class="form-label" for="sessionName">Session Name *</label>
                    <input type="text" id="sessionName" class="form-input" placeholder="e.g., Training Exercise Alpha" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="sessionCode">Session Code *</label>
                    <input type="text" id="sessionCode" class="form-input" placeholder="e.g., ALPHA2024" maxlength="20" required>
                    <p class="form-hint">Alphanumeric, 4-20 characters. Participants use this to join.</p>
                </div>
                <div class="form-group">
                    <label class="form-label" for="sessionDescription">Description</label>
                    <textarea id="sessionDescription" class="form-input form-textarea" rows="3" placeholder="Optional description..."></textarea>
                </div>
            </form>
        `;const t={current:null};t.current=W({title:"Create New Session",content:e,size:"md",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Create Session",variant:"primary",onClick:()=>(this.handleCreateSession(t.current),!1)}]})}async handleCreateSession(e){var o,m;const t=(e==null?void 0:e.element)||document,s=t.querySelector("#sessionName")||document.getElementById("sessionName"),i=t.querySelector("#sessionCode")||document.getElementById("sessionCode"),n=t.querySelector("#sessionDescription")||document.getElementById("sessionDescription");if(!((o=s==null?void 0:s.value)!=null&&o.trim())){c("Session name is required",{type:"error"}),s==null||s.focus();return}const r=Q((i==null?void 0:i.value)||"");if(r){c(r,{type:"error"}),i==null||i.focus();return}g({message:"Creating session..."});try{const p={name:s.value.trim(),session_code:i.value.trim().toUpperCase(),description:((m=n==null?void 0:n.value)==null?void 0:m.trim())||null,status:"active",move:1,phase:1},l=await u.createSession(p);c("Session created successfully",{type:"success"}),e&&typeof e.close=="function"?e.close():X(),this.currentSessionId=l.id,await this.loadSessions()}catch(p){d.error("Failed to create session:",p),c(p.message||"Failed to create session",{type:"error"})}finally{f()}}async viewSession(e){this.currentSessionId=e;const t=document.getElementById("sessionsSection"),s=document.getElementById("sessionDetailSection");t&&(t.style.display="none"),s&&(s.style.display="block"),this.renderSessionsList(),await this.refreshSelectedSessionViews()}renderSessionDetails(e,t,s,i=[],n=[]){var P;const r=document.getElementById("sessionDetailContent");if(!r)return;const o=((P=e.metadata)==null?void 0:P.session_code)||"N/A",m=(s==null?void 0:s.move)??1,p=(s==null?void 0:s.phase)??1,l=n.filter(y=>y.status==="pending").length,A=E(t);r.innerHTML=`
            <div class="session-detail-header" style="margin-bottom: var(--space-6);">
                <button class="btn btn-ghost btn-sm" id="backToListBtn">
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width: 1em; height: 1em;">
                        <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
                    </svg>
                    Back to Sessions
                </button>
                <h2 class="section-title" style="margin-top: var(--space-3);">${this.escapeHtml(e.name)}</h2>
                <p class="text-gray-500">Code: <strong>${this.escapeHtml(o)}</strong></p>
            </div>

            <div class="section-grid section-grid-4" style="margin-bottom: var(--space-6);">
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Current Move</h4>
                    <p class="text-2xl font-bold">${m}</p>
                </div>
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Current Phase</h4>
                    <p class="text-2xl font-bold">${p}</p>
                </div>
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Participants</h4>
                    <p class="text-2xl font-bold">${A.total}</p>
                    <p class="text-xs text-gray-500">${A.connected} currently connected</p>
                </div>
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Pending RFIs</h4>
                    <p class="text-2xl font-bold">${l}</p>
                </div>
            </div>

            <div class="card card-bordered" style="padding: var(--space-4);">
                <h3 class="text-base font-semibold mb-4">Participants</h3>
                <div id="participantsListDetail">
                    ${this.renderParticipantsTable(t,{includeActions:!0,sessionName:e.name})}
                </div>
            </div>

            <div class="card card-bordered" style="padding: var(--space-4); margin-top: var(--space-4);">
                <h3 class="text-base font-semibold mb-4">Session Activity Summary</h3>
                <div class="section-grid section-grid-3">
                    <div>
                        <p class="text-sm text-gray-500">Actions</p>
                        <p class="text-xl font-semibold">${i.length}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">RFIs</p>
                        <p class="text-xl font-semibold">${n.length}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Last Updated</p>
                        <p class="text-sm">${h(e.updated_at)}</p>
                    </div>
                </div>
            </div>
        `;const M=r.querySelector("#backToListBtn");M&&M.addEventListener("click",()=>{const y=document.getElementById("sessionsSection"),B=document.getElementById("sessionDetailSection");y&&(y.style.display="block"),B&&(B.style.display="none")}),this.bindParticipantRemovalControls(r,e,t)}renderParticipantsTable(e,{includeActions:t=!1,sessionName:s=""}={}){return e.length?`
            <table class="table" style="width: 100%;">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Active</th>
                        ${t?"<th>Actions</th>":""}
                    </tr>
                </thead>
                <tbody>
                    ${e.map(i=>{const n=v({text:i.is_active?"Active":"Inactive",variant:i.is_active?"success":"default",size:"sm"});return`
                            <tr>
                                <td>${this.escapeHtml(i.display_name||"Unknown")}</td>
                                <td>${this.escapeHtml(i.role||"Unknown")}</td>
                                <td>${n.outerHTML}</td>
                                <td>${i.heartbeat_at?h(i.heartbeat_at):"Never"}</td>
                                ${t?`
                                    <td>
                                        <button
                                            type="button"
                                            class="btn btn-danger btn-sm"
                                            data-remove-session-participant-id="${this.escapeHtml(i.id||"")}"
                                            aria-label="Remove ${this.escapeHtml(i.display_name||"participant")} from ${this.escapeHtml(s||"this session")}"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                `:""}
                            </tr>
                        `}).join("")}
                </tbody>
            </table>
        `:'<p class="text-muted">No participants have joined this session yet.</p>'}renderParticipantsPanel(e){var i;const t=document.getElementById("participantsSelectionState"),s=document.getElementById("participantsList");if(!(!t||!s)){if(!(e!=null&&e.session)){t.textContent="Select a session from Session Management to review live participant data.",s.style.display="flex",s.style.alignItems="center",s.style.justifyContent="center",s.style.minHeight="200px",s.innerHTML=`
                <p class="text-gray-500">Select a session from Session Management to view participants.</p>
            `;return}t.textContent=`Showing live participant data for ${e.session.name}.`,s.style.display="block",s.style.minHeight="auto",s.innerHTML=`
            <div style="padding: var(--space-4);">
                <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-4);">
                    <div>
                        <h3 class="text-base font-semibold">${this.escapeHtml(e.session.name)}</h3>
                        <p class="text-sm text-gray-500">Code ${this.escapeHtml(((i=e.session.metadata)==null?void 0:i.session_code)||"N/A")}</p>
                    </div>
                    <span class="text-sm text-gray-500">${re(e.participants)}</span>
                </div>
                <p class="text-xs text-gray-500" style="margin-bottom: var(--space-3);">
                    Remove clears a participant from the session immediately. They must join again to return.
                </p>
                ${this.renderParticipantsTable(e.participants,{includeActions:!0,sessionName:e.session.name})}
            </div>
        `,this.bindParticipantRemovalControls(s,e.session,e.participants)}}updateExportAvailability(e){const t=ce(e),s=document.getElementById("exportSelectionState");s&&(s.textContent=t.message),C().forEach(({id:i})=>{const n=document.getElementById(i);n&&(n.disabled=t.disabled)})}async confirmDeleteSession(e){const t=this.sessions.find(i=>i.id===e);if(!t)return;await k({title:"Delete Session",message:`Are you sure you want to delete "${t.name}"? This action cannot be undone and all associated data will be permanently deleted.`})&&await this.deleteSession(e)}bindParticipantRemovalControls(e,t,s=[]){if(!e||!(t!=null&&t.id))return;const i=new Map((Array.isArray(s)?s:[]).filter(n=>n==null?void 0:n.id).map(n=>[String(n.id),n]));e.querySelectorAll("[data-remove-session-participant-id]").forEach(n=>{n.addEventListener("click",()=>{const r=n.dataset.removeSessionParticipantId,o=i.get(String(r||""));if(!o){c("Participant seat data is no longer available. Refresh and try again.",{type:"error"});return}this.removeParticipantFromSession(t,o)})})}async removeParticipantFromSession(e,t){if(!(e!=null&&e.id)||!(t!=null&&t.id)){c("Participant selection is invalid.",{type:"error"});return}const s=t.display_name||"This participant",i=String(t.role||"unknown role").replace(/_/g," ");if(await k({title:"Remove Participant",message:`Remove ${s} (${i}) from ${e.name}? This clears the session seat immediately and requires a fresh join before the participant can return.`,confirmLabel:"Remove Participant",variant:"danger"})){g({message:`Removing ${s}...`});try{await u.removeSessionParticipant(e.id,t.id),this.sessionBundles.delete(e.id),await this.loadSessions(),c(`${s} was removed from ${e.name}.`,{type:"success"})}catch(r){d.error("Failed to remove participant:",r),c(r.message||"Failed to remove participant",{type:"error"})}finally{f()}}}async deleteSession(e){g({message:"Deleting session..."});try{await u.deleteSession(e),this.sessionBundles.delete(e),this.currentSessionId===e&&(this.currentSessionId=null),c("Session deleted successfully",{type:"success"}),await this.loadSessions()}catch(t){d.error("Failed to delete session:",t),c("Failed to delete session",{type:"error"})}finally{f()}}async exportData(e){var s,i,n,r;if(!this.currentSessionId){c("Select a session before exporting.",{type:"warning"});return}const t=C().find(o=>o.action===e);if(!t){c("Unsupported export action.",{type:"error"});return}g({message:"Preparing export..."});try{const o=this.buildSelectedLiveBundle()||await u.fetchSessionBundle(this.currentSessionId);this.sessionBundles.set(this.currentSessionId,o);const m=F(((s=o.session)==null?void 0:s.name)||this.currentSessionId),p=F(((n=(i=o.session)==null?void 0:i.metadata)==null?void 0:n.session_code)||((r=o.session)==null?void 0:r.id)||"session"),l=`esg-${m}-${p}`;switch(e){case"json":se(ie(o),`${l}.json`);break;case"csv-actions":S(te(o.actions),`${l}-actions.csv`);break;case"csv-requests":S(ee(o.requests),`${l}-rfis.csv`);break;case"csv-timeline":S(Z(o.timeline),`${l}-timeline.csv`);break;case"csv-participants":S(Y(o.participants),`${l}-participants.csv`);break;default:throw new Error(`Unhandled export action: ${e}`)}c(`${t.successLabel} export is ready.`,{type:"success"})}catch(o){d.error("Export failed:",o),c("Export failed",{type:"error"})}finally{f()}}escapeHtml(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}destroy(){this.storeUnsubscribers.forEach(e=>e==null?void 0:e()),this.storeUnsubscribers=[]}}const $=new de,V=typeof document<"u"&&!globalThis.__ESG_DISABLE_AUTO_INIT__;V&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{$.init()}):$.init());typeof window<"u"&&V&&window.addEventListener("beforeunload",()=>$.destroy());
//# sourceMappingURL=master-CuFxR_Z-.js.map
