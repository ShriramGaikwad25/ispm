var domains = [
  {domain:'us.corp.local', connectorName:'Falcon Relay', forest:'corp-us.local', admin:'Michael Chen', email:'michael.chen@company.com', country:'United States', status:'Active', health:'Healthy', vault:'US-AD-OCI-Vault', vaultStatus:'Validated', version:'4.8.2', latest:'4.8.2', lastSync:'8 min ago', heartbeat:'1 min ago', lastRecon:'8 min ago', lastProv:'11 min ago', errors:0, progress:100},
  {domain:'ca.corp.local', connectorName:'Maple Bridge', forest:'corp-ca.local', admin:'Sophie Martin', email:'sophie.martin@company.com', country:'Canada', status:'Active', health:'Healthy', vault:'NA-Shared-CyberArk', vaultStatus:'Validated', version:'4.8.2', latest:'4.8.2', lastSync:'12 min ago', heartbeat:'2 min ago', lastRecon:'12 min ago', lastProv:'18 min ago', errors:0, progress:100},
  {domain:'uk.corp.local', connectorName:'Harbor Sentinel', forest:'emea-main.local', admin:'Oliver Grant', email:'oliver.grant@company.com', country:'United Kingdom', status:'Active', health:'Warning', vault:'UK-HashiCorp-Vault', vaultStatus:'Validated', version:'4.7.9', latest:'4.8.2', lastSync:'15 min ago', heartbeat:'1 min ago', lastRecon:'15 min ago', lastProv:'21 min ago', errors:1, progress:100},
  {domain:'de.corp.local', connectorName:'Ironvale Node', forest:'emea-main.local', admin:'Lena Fischer', email:'lena.fischer@company.com', country:'Germany', status:'Error', health:'Critical', vault:'DE-AD-OCI-Vault', vaultStatus:'Validation Failed', version:'4.8.2', latest:'4.8.2', lastSync:'2 hrs ago', heartbeat:'4 min ago', lastRecon:'2 hrs ago', lastProv:'2 hrs ago', errors:6, progress:100},
  {domain:'in.corp.local', connectorName:'Monsoon Gateway', forest:'corp-in.local', admin:'Arjun Mehta', email:'arjun.mehta@company.com', country:'India', status:'Active', health:'Healthy', vault:'IN-AD-CyberArk', vaultStatus:'Validated', version:'4.8.2', latest:'4.8.2', lastSync:'6 min ago', heartbeat:'1 min ago', lastRecon:'6 min ago', lastProv:'9 min ago', errors:0, progress:100},
  {domain:'br.corp.local', connectorName:'Amber Horizon', forest:'corp-br.local', admin:'Ana Souza', email:'ana.souza@company.com', country:'Brazil', status:'Setup in Progress', health:'Pending', vault:'Not Registered', vaultStatus:'Missing', version:'—', latest:'4.8.2', lastSync:'—', heartbeat:'—', lastRecon:'—', lastProv:'—', errors:0, progress:55}
];

var vaults = [
  {name:'US-AD-OCI-Vault', provider:'OCI Vault', domains:'us.corp.local', owner:'Michael Chen', path:'secret/ad/us-prod', status:'Validated', validated:'Today, 1:22 PM'},
  {name:'NA-Shared-CyberArk', provider:'CyberArk', domains:'ca.corp.local', owner:'Sophie Martin', path:'safe/na/ad-ca', status:'Validated', validated:'Today, 12:51 PM'},
  {name:'UK-HashiCorp-Vault', provider:'HashiCorp Vault', domains:'uk.corp.local', owner:'Oliver Grant', path:'kv/ad/uk/service', status:'Validated', validated:'Today, 12:44 PM'},
  {name:'DE-AD-OCI-Vault', provider:'OCI Vault', domains:'de.corp.local', owner:'Lena Fischer', path:'secret/ad/de-prod', status:'Validation Failed', validated:'Today, 11:58 AM'},
  {name:'IN-AD-CyberArk', provider:'CyberArk', domains:'in.corp.local', owner:'Arjun Mehta', path:'safe/apac/ad-in', status:'Validated', validated:'Today, 1:06 PM'}
];

function badge(value){
  const v = String(value).toLowerCase();
  let cls='neutral';
  if(v.includes('healthy')||v==='active'||v==='validated'||v==='current'||v==='mandatory') cls='success';
  else if(v.includes('warning')||v.includes('progress')||v.includes('pending')||v.includes('upgrade')||v.includes('draft')) cls='warning';
  else if(v.includes('critical')||v.includes('error')||v.includes('failed')||v.includes('missing')) cls='danger';
  else if(v.includes('invitation')) cls='info';
  return `<span class="status ${cls}">${value}</span>`;
}

function renderOverview(){
  document.getElementById('overviewDomainRows').innerHTML = domains.map((d,i)=>`<tr onclick="openDomainDrawer(${i})"><td>${d.connectorName}</td><td><strong>${d.domain}</strong><br><span style="color:var(--muted);font-size:10px">${d.forest}</span></td><td>${d.admin}</td><td>${d.country}</td><td>${badge(d.status)}</td><td>${d.vault}</td><td>${d.version}</td></tr>`).join('');
}

function renderVaults(){
  document.getElementById('vaultRows').innerHTML=vaults.map(v=>`<tr><td><strong>${v.name}</strong></td><td>${v.provider}</td><td>${v.domains}</td><td>${v.owner}</td><td>${v.path}</td><td>${badge(v.status)}</td><td>${v.validated}</td><td><button class="btn small" onclick="event.stopPropagation();toast('Vault validation started for ${v.name}')">Validate</button></td></tr>`).join('');
}

function renderOperations(){
  document.getElementById('operationsRows').innerHTML=domains.map((d,i)=>`<tr onclick="openDomainDrawer(${i})"><td><strong>${d.domain}</strong></td><td>${badge(d.health)}</td><td>${d.heartbeat}</td><td>${d.lastRecon}</td><td>${d.lastProv}</td><td>${d.errors}</td><td>${d.version}</td><td>${d.latest}</td><td>${d.version===d.latest?badge('Current'):d.version==='—'?badge('Pending Setup'):badge('Upgrade Available')}</td></tr>`).join('');
}

function openDomainDrawer(i){
  const d=domains[i];
  document.getElementById('drawerTitle').textContent=d.domain;
  document.getElementById('drawerSubtitle').textContent=`${d.country} · ${d.forest}`;
  document.getElementById('drawerBody').innerHTML=`
    <div class="detail-block"><h4>Domain Summary</h4><div class="detail-row"><span>Domain administrator</span><strong>${d.admin}</strong></div><div class="detail-row"><span>Connector status</span>${badge(d.status)}</div><div class="detail-row"><span>Health</span>${badge(d.health)}</div><div class="detail-row"><span>Installed version</span><strong>${d.version}</strong></div></div>
    <div class="detail-block"><h4>Onboarding</h4><div class="detail-row"><span>Progress</span><strong>${d.progress}%</strong></div><div class="progress" style="width:100%;margin:8px 0 12px"><span style="width:${d.progress}%"></span></div><button class="btn soft" style="width:100%" onclick="toast('Individual connector setup opened')">Open Connector Setup</button></div>
    <div class="detail-block"><h4>Routing & Naming</h4><div class="detail-row"><span>Country routing</span><strong>${d.country}</strong></div><div class="detail-row"><span>Email policy</span><strong>Global · Enforced</strong></div><div class="detail-row"><span>UPN policy</span><strong>Global · Enforced</strong></div><div class="detail-row"><span>SAM policy</span><strong>Global · Enforced</strong></div></div>
    <div class="detail-block"><h4>Vault</h4><div class="detail-row"><span>Registered vault</span><strong>${d.vault}</strong></div><div class="detail-row"><span>Status</span>${badge(d.vaultStatus)}</div><button class="btn" style="width:100%;margin-top:8px" onclick="toast('Vault validation initiated')">Validate Vault</button></div>
    <div class="detail-block"><h4>Operations</h4><div class="detail-row"><span>Last heartbeat</span><strong>${d.heartbeat}</strong></div><div class="detail-row"><span>Last reconciliation</span><strong>${d.lastRecon}</strong></div><div class="detail-row"><span>Last provisioning</span><strong>${d.lastProv}</strong></div><div class="detail-row"><span>Pending errors</span><strong>${d.errors}</strong></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn" onclick="toast('Administrator notification sent')">Notify Admin</button><button class="btn danger" onclick="toast('Connector disabled')">Disable</button></div>`;
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerBackdrop').classList.add('open');
}
function closeDrawer(){ document.getElementById('drawer').classList.remove('open'); document.getElementById('drawerBackdrop').classList.remove('open'); }

function testNaming(){
  const first=document.getElementById('testFirst').value.trim().toLowerCase().replace(/[^a-z]/g,'')||'alex';
  const last=document.getElementById('testLast').value.trim().toLowerCase().replace(/[^a-z]/g,'')||'morgan';
  const collision=document.getElementById('testCollision').value==='yes';
  const suffix=collision?'2':'';
  const email=`${first}.${last}${suffix}@company.com`;
  const upn=`${first}.${last}${suffix}@corp.company`;
  const sam=`${first[0]}${last}${suffix}`.slice(0,20);
  document.getElementById('namingResult').innerHTML=`<strong>Email:</strong> ${email}<br><strong>UPN:</strong> ${upn}<br><strong>SAM Account Name:</strong> ${sam}<br><strong>Collision handling:</strong> ${collision?'Conflict detected and fallback sequence applied':'No conflict detected'}<br><strong>Uniqueness scope:</strong> All registered AD domains`;
}

function openModal(id){
  document.getElementById(id).classList.add('open');
  if(id==='bulkInviteModal') resetBulkInviteModal();
}
function resetBulkInviteModal(){
  const fileInput = document.getElementById('bulkInviteFile');
  fileInput.value = '';
  const label = document.getElementById('bulkInviteFileName');
  label.textContent = 'No file chosen';
  label.classList.remove('file-ready');
  const result = document.getElementById('bulkInviteResult');
  result.style.display = 'none';
  result.innerHTML = '';
}
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
function addDomain(){
  const action=document.getElementById('newOnboardingAction')?.value||'Send invitation';
  if(action==='Create connector directly'){
    window.location.href='/settings/app-inventory/add-application?appType='+encodeURIComponent('Active Directory Domain');
    return;
  }
  const domain=document.getElementById('newDomainName').value||'new.domain.local';
  const admin=document.getElementById('newAdminName').value||'Assigned Administrator';
  const country=document.getElementById('newCountry').value||'Unassigned';
  domains.push({domain,connectorName:domain,forest:'Pending',admin,email:document.getElementById('newAdminEmail').value||'pending@company.com',country,status:'Invitation Sent',health:'Pending',vault:'Not Registered',vaultStatus:'Missing',version:'—',latest:'4.8.2',lastSync:'—',heartbeat:'—',lastRecon:'—',lastProv:'—',errors:0,progress:10});
  renderAll(); closeModal('addDomainModal'); toast('Domain added and invitation prepared');
}

function handleBulkInviteFile(input){
  const file = input.files && input.files[0];
  const label = document.getElementById('bulkInviteFileName');
  label.textContent = file ? file.name : 'No file chosen';
  label.classList.toggle('file-ready', !!file);
}

function sendBulkInvites(){
  const fileInput = document.getElementById('bulkInviteFile');
  const file = fileInput.files && fileInput.files[0];
  const result = document.getElementById('bulkInviteResult');
  result.style.display = 'block';
  result.innerHTML = file
    ? `<strong>Invitations sent.</strong><br>Bulk invitations were queued from <strong>${file.name}</strong>.`
    : `<strong>No file uploaded.</strong><br>Choose a filled invitation file before sending.`;
}

function toast(message){
  const el=document.getElementById('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>el.classList.remove('show'),2400);
}

function activateView(id){
  document.querySelectorAll('.gadcm .view').forEach(v=>v.classList.toggle('active',v.id===id));
  document.querySelectorAll('.gadcm .nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===id));
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('.gadcm .nav-item').forEach(n=>n.addEventListener('click',()=>activateView(n.dataset.view)));
document.querySelectorAll('.gadcm [data-nav]').forEach(n=>n.addEventListener('click',()=>activateView(n.dataset.nav)));
document.querySelectorAll('.gadcm .modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));

function renderAll(){ renderOverview(); renderVaults(); renderOperations(); }
renderAll();
