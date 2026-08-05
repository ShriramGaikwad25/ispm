"use client";

import React, { useEffect, useRef } from "react";

const BODY_HTML = `
<div class="tabbar">
  <button type="button" class="nav-item active" data-view="overview"><span class="nav-icon icon-overview">◫</span>Overview</button>
  <button type="button" class="nav-item" data-view="naming"><span class="nav-icon icon-naming">Aa</span>Naming &amp; Uniqueness</button>
  <button type="button" class="nav-item" data-view="vaults"><span class="nav-icon icon-vaults">▣</span>Vault Management</button>
  <button type="button" class="nav-item" data-view="operations"><span class="nav-icon icon-operations">⚙</span>Operations &amp; Upgrades</button>
</div>

<section class="content">
  <div class="view active" id="overview">
    <div class="page-header">
      <div>
        <h2>Global AD Configuration</h2>
        <p>Manage enterprise-wide AD domain onboarding, routing, naming, vault references, connector health, and upgrade coordination from one centralized control plane.</p>
      </div>
      <div class="actions">
        <button class="btn" onclick="openModal('bulkInviteModal')">Send Bulk Invites</button>
        <button class="btn primary" onclick="openModal('addDomainModal')">Add AD Domain</button>
      </div>
    </div>

    <div class="grid-4">
      <div class="card metric"><div class="label">Registered Domains</div><div class="value">2</div></div>
      <div class="card metric"><div class="label">Active Connectors</div><div class="value">2</div></div>
      <div class="card metric"><div class="label">Pending Setup</div><div class="value">1</div><div class="meta"><span class="dot" style="background:#b7791f"></span>Invitation accepted</div></div>
      <div class="card metric"><div class="label">Attention Required</div><div class="value">0</div><div class="meta"><span class="dot" style="background:#c33c54"></span>No errors or upgrades pending</div></div>
    </div>

    <div class="section card section-card">
      <div class="section-title">
        <div><h3>AD Domain Estate</h3><p>Operational view across registered domain connectors</p></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Connector Name</th><th>Domain</th><th>Admin</th><th>Region</th><th>Status</th><th>Vault</th><th>Version</th></tr></thead>
          <tbody id="overviewDomainRows"></tbody>
        </table>
      </div>
    </div>

    <div class="section grid-2">
      <div class="card policy-card">
        <div class="policy-head"><h4>Global Naming</h4><span class="status success">Enforced</span></div>
        <div class="policy-list">
          <div class="policy-row"><span>Email uniqueness</span><strong>All domains</strong></div>
          <div class="policy-row"><span>UPN uniqueness</span><strong>All domains</strong></div>
          <div class="policy-row"><span>SAM uniqueness</span><strong>All domains</strong></div>
        </div>
      </div>
      <div class="card policy-card">
        <div class="policy-head"><h4>Vault Coverage</h4><span class="status warning">5 of 6 valid</span></div>
        <div class="policy-list">
          <div class="policy-row"><span>Registered vaults</span><strong>5</strong></div>
          <div class="policy-row"><span>Shared vaults</span><strong>1</strong></div>
          <div class="policy-row"><span>Validation issues</span><strong>1</strong></div>
        </div>
      </div>
    </div>
  </div>

  <div class="view" id="naming">
    <div class="page-header">
      <div><h2>Naming &amp; Uniqueness</h2><p>Maintain mandatory enterprise naming policies for Email, UPN, and SAM Account Name. All identifiers are checked across all registered AD domains.</p></div>
      <div class="actions"><button class="btn" onclick="toast('Policy history opened')">View History</button><button class="btn primary" onclick="toast('Naming policies saved')">Save Policies</button></div>
    </div>
    <div class="grid-3">
      <div class="card policy-card"><div class="policy-head"><h4>Email Address</h4><span class="status success">Mandatory</span></div><div class="policy-list"><div class="policy-row"><span>Pattern</span><strong>first.last@company.com</strong></div><div class="policy-row"><span>Collision sequence</span><strong>first.last2, first.last3</strong></div><div class="policy-row"><span>Uniqueness scope</span><strong>All AD domains</strong></div><div class="policy-row"><span>Reservation window</span><strong>30 minutes</strong></div></div></div>
      <div class="card policy-card"><div class="policy-head"><h4>UPN</h4><span class="status success">Mandatory</span></div><div class="policy-list"><div class="policy-row"><span>Pattern</span><strong>first.last@corp.company</strong></div><div class="policy-row"><span>Collision sequence</span><strong>Numeric suffix</strong></div><div class="policy-row"><span>Uniqueness scope</span><strong>All AD domains</strong></div><div class="policy-row"><span>Normalization</span><strong>Lowercase, ASCII</strong></div></div></div>
      <div class="card policy-card"><div class="policy-head"><h4>SAM Account Name</h4><span class="status success">Mandatory</span></div><div class="policy-list"><div class="policy-row"><span>Pattern</span><strong>first initial + surname</strong></div><div class="policy-row"><span>Maximum length</span><strong>20 characters</strong></div><div class="policy-row"><span>Uniqueness scope</span><strong>All AD domains</strong></div><div class="policy-row"><span>Reserved names</span><strong>Policy list enforced</strong></div></div></div>
    </div>
    <div class="section grid-2">
      <div class="card section-card">
        <div class="section-title"><div><h3>Test Naming Policy</h3><p>Preview generated identifiers and collision handling</p></div></div>
        <div class="form-grid"><div class="field"><label>First name</label><input id="testFirst" value="Alex"></div><div class="field"><label>Last name</label><input id="testLast" value="Morgan"></div><div class="field"><label>Country</label><select id="testCountry"><option>United States</option><option>Canada</option><option>United Kingdom</option><option>Germany</option><option>India</option><option>Brazil</option></select></div><div class="field"><label>Simulate collision</label><select id="testCollision"><option value="yes">Yes</option><option value="no">No</option></select></div></div>
        <div style="margin-top:12px"><button class="btn primary" onclick="testNaming()">Generate Preview</button></div>
        <div id="namingResult" class="test-result">Enter sample identity data to preview generated values.</div>
      </div>
      <div class="card section-card">
        <div class="section-title"><div><h3>Global Uniqueness Service</h3><p>Centralized index used by all domain connectors</p></div></div>
        <div class="policy-list"><div class="policy-row"><span>Indexed accounts</span><strong>186,420</strong></div><div class="policy-row"><span>Participating domains</span><strong>6 of 6</strong></div><div class="policy-row"><span>Active reservations</span><strong>14</strong></div><div class="policy-row"><span>Last index refresh</span><strong>4 minutes ago</strong></div><div class="policy-row"><span>Average lookup time</span><strong>118 ms</strong></div></div>
      </div>
    </div>
  </div>

  <div class="view" id="vaults">
    <div class="page-header">
      <div><h2>Vault Management</h2><p>Allow delegated domain administrators to register one vault per domain while providing centralized visibility and validation status to the IAM team.</p></div>
      <div class="actions"><button class="btn" onclick="toast('Vault report exported')">Export</button><button class="btn primary" onclick="openModal('addVaultModal')">Register Vault</button></div>
    </div>
    <div class="grid-4">
      <div class="card metric"><div class="label">Registered Vaults</div><div class="value">5</div><div class="meta">One shared across two domains</div></div>
      <div class="card metric"><div class="label">Validated</div><div class="value">4</div><div class="meta">Runtime credential access confirmed</div></div>
      <div class="card metric"><div class="label">Validation Failed</div><div class="value">1</div><div class="meta">Germany domain</div></div>
      <div class="card metric"><div class="label">Unregistered</div><div class="value">1</div><div class="meta">Brazil setup in progress</div></div>
    </div>
    <div class="section card section-card">
      <div class="section-title"><div><h3>Vault Registry</h3><p>Secret values are never stored or displayed in KeyForge</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>Vault Name</th><th>Provider</th><th>Domains</th><th>Owner</th><th>Secret Reference</th><th>Status</th><th>Last Validated</th><th>Actions</th></tr></thead><tbody id="vaultRows"></tbody></table></div>
    </div>
  </div>

  <div class="view" id="operations">
    <div class="page-header">
      <div><h2>Operations &amp; Upgrades</h2><p>Monitor connector heartbeat, reconciliation, provisioning activity, operational errors, and domain-admin initiated upgrades.</p></div>
      <div class="actions"><button class="btn" onclick="toast('Upgrade notifications sent')">Send Upgrade Notifications</button><button class="btn primary" onclick="toast('Global health check started')">Run Health Check</button></div>
    </div>
    <div class="grid-4">
      <div class="card metric"><div class="label">Healthy</div><div class="value">4</div><div class="meta">Heartbeat and jobs current</div></div>
      <div class="card metric"><div class="label">Warnings</div><div class="value">1</div><div class="meta">Upgrade available</div></div>
      <div class="card metric"><div class="label">Critical</div><div class="value">1</div><div class="meta">Vault validation failure</div></div>
      <div class="card metric"><div class="label">Pending Operations</div><div class="value">9</div><div class="meta">Across all domain connectors</div></div>
    </div>
    <div class="section card section-card">
      <div class="section-title"><div><h3>Connector Operations</h3><p>Operational status across registered domain connectors</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>Domain</th><th>Health</th><th>Heartbeat</th><th>Last Reconciliation</th><th>Last Provisioning</th><th>Pending Errors</th><th>Installed</th><th>Latest</th><th>Upgrade</th></tr></thead><tbody id="operationsRows"></tbody></table></div>
    </div>
  </div>
</section>

<div class="drawer-backdrop" id="drawerBackdrop" onclick="closeDrawer()"></div>
<aside class="drawer" id="drawer">
  <div class="drawer-head"><div><h3 id="drawerTitle">Domain Details</h3><p id="drawerSubtitle">Connector summary and operations</p></div><button class="close" onclick="closeDrawer()">✕</button></div>
  <div class="drawer-body" id="drawerBody"></div>
</aside>

<div class="modal-backdrop" id="addDomainModal">
  <div class="modal"><div class="modal-head"><h3>Add AD Domain</h3><button class="close" onclick="closeModal('addDomainModal')">✕</button></div><div class="modal-body"><div class="form-grid"><div class="field full-width"><label>Application Name</label><input id="newDomainName" placeholder="e.g. apac.company.local"></div><div class="field"><label>Domain administrator</label><input id="newAdminName" placeholder="Full name"></div><div class="field"><label>Administrator email</label><input id="newAdminEmail" placeholder="name@company.com"></div><div class="field"><label>Region</label><input id="newCountry" placeholder="Region value"></div><div class="field"><label>Onboarding action</label><select id="newOnboardingAction"><option>Send invitation</option><option>Create connector directly</option></select></div></div></div><div class="modal-foot"><button class="btn" onclick="closeModal('addDomainModal')">Cancel</button><button class="btn primary" onclick="addDomain()">Add Domain</button></div></div>
</div>

<div class="modal-backdrop" id="bulkInviteModal">
  <div class="modal"><div class="modal-head"><h3>Send Bulk Invitations</h3><button class="close" onclick="closeModal('bulkInviteModal')">✕</button></div><div class="modal-body"><p style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:0">Send onboarding invitations to domain administrators for all selected draft or pending domains.</p><div class="bulk-file-card">
        <div class="bulk-file-row">
          <div class="bulk-file-icon template"><span>⬇</span></div>
          <div class="bulk-file-text"><strong>Bulk invite template</strong><span>Download the sample file and fill in your invitation list</span></div>
          <a class="btn small" href="/global-ad-config-management/bulk-invite-sample.xlsx" download>Download</a>
        </div>
        <div class="bulk-file-divider"></div>
        <div class="bulk-file-row">
          <div class="bulk-file-icon upload"><span>⬆</span></div>
          <div class="bulk-file-text"><strong>Upload filled file</strong><span id="bulkInviteFileName">No file chosen</span></div>
          <input type="file" id="bulkInviteFile" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleBulkInviteFile(this)">
          <button class="btn small" onclick="document.getElementById('bulkInviteFile').click()">Choose File</button>
        </div>
      </div><div id="bulkInviteResult" class="test-result" style="display:none"></div></div><div class="modal-foot"><button class="btn" onclick="closeModal('bulkInviteModal')">Cancel</button><button class="btn primary" onclick="sendBulkInvites()">Send Invitations</button></div></div>
</div>


<div class="modal-backdrop" id="addVaultModal">
  <div class="modal"><div class="modal-head"><h3>Register Vault</h3><button class="close" onclick="closeModal('addVaultModal')">✕</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>Vault name</label><input placeholder="Friendly name"></div><div class="field"><label>Provider</label><select><option>OCI Vault</option><option>CyberArk</option><option>HashiCorp Vault</option><option>Azure Key Vault</option></select></div><div class="field"><label>Associated domain</label><select><option>br.corp.local</option><option>de.corp.local</option><option>us.corp.local</option></select></div><div class="field"><label>Secret reference/path</label><input placeholder="vault/path/secret"></div></div></div><div class="modal-foot"><button class="btn" onclick="closeModal('addVaultModal')">Cancel</button><button class="btn primary" onclick="closeModal('addVaultModal');toast('Vault registration saved')">Register &amp; Validate</button></div></div>
</div>

<div class="toast" id="toast"></div>
`;

export default function GlobalAdConfigManagementPage() {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/global-ad-config-management/styles.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "/global-ad-config-management/app.js";
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="flex flex-col w-full gadcm">
      <div ref={bodyRef} dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
    </div>
  );
}
