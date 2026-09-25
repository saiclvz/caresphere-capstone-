import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import api from './api/axios';
import QRCode from 'qrcode';
import KPIDashboard from './components/KPIDashboard';
import ChildHealthProfile from './components/ChildHealthProfile';
import QRResolver from './components/QRResolver';

void KPIDashboard;
void ChildHealthProfile;
void QRResolver;

const ROLES = {
  admin: {
    label: 'Administrator',
    modules: ['dashboard', 'children', 'inventory', 'visitors', 'activity', 'settings'],
  },
  staff: {
    label: 'Staff',
    modules: ['dashboard', 'children', 'inventory', 'visitors', 'settings'],
  },
  health: {
    label: 'Health-authorized user',
    modules: ['dashboard', 'children', 'activity', 'settings'],
  },
  visitor: {
    label: 'QR Visitor / Donor',
    modules: ['dashboard', 'visitors', 'settings'],
  },
  donor: {
    label: 'Donor',
    modules: ['dashboard', 'visitors', 'settings'],
  },
};

const DEMO_USERS = [
  { username: 'admin', password: 'Admin#2026', role: 'admin', name: 'A. Fernandez' },
  { username: 'staff', password: 'Staff#2026', role: 'staff', name: 'J. Santos' },
  { username: 'health', password: 'Health#2026', role: 'health', name: 'M. Cruz' },
];

const MFA_CODE = '123456';
const INACTIVITY_TIMEOUT_SECONDS = 3 * 60;

const CHILDREN = [
  { id: 'CS-2091', name: 'Ana D.', age: 9, dob: 'Apr 14, 2017', sex: 'Female', room: 'Room 4', admission: 'Jun 2, 2023', status: 'Active', caseWorker: 'J. Santos', guardian: 'None on file — ward of the state', origin: 'Barangay San Isidro, Quezon City', health: { bloodType: 'O+', allergies: 'Peanuts', conditions: 'Mild asthma', medications: 'Salbutamol inhaler as needed', lastVisit: 'Sep 12, 2026' } },
  { id: 'CS-2088', name: 'Miguel R.', age: 11, dob: 'Nov 2, 2014', sex: 'Male', room: 'Room 2', admission: 'Jan 18, 2022', status: 'Active', caseWorker: 'M. Cruz', guardian: 'Aunt — L. Reyes (monthly visitation)', origin: 'Barangay Bagong Silangan, Quezon City', health: { bloodType: 'A+', allergies: 'None recorded', conditions: 'Seasonal allergies', medications: 'None', lastVisit: 'Aug 29, 2026' } },
  { id: 'CS-2075', name: 'Liza T.', age: 7, dob: 'Feb 27, 2019', sex: 'Female', room: 'Room 1', admission: 'Aug 9, 2024', status: 'Active', caseWorker: 'J. Santos', guardian: 'None on file — ward of the state', origin: 'Barangay Payatas, Quezon City', health: { bloodType: 'B+', allergies: 'None recorded', conditions: 'None recorded', medications: 'Multivitamin', lastVisit: 'Sep 5, 2026' } },
  { id: 'CS-2069', name: 'Josh M.', age: 12, dob: 'May 30, 2013', sex: 'Male', room: 'Room 3', admission: 'Mar 4, 2021', status: 'Active', caseWorker: 'R. Bautista', guardian: 'Grandmother — E. Marquez', origin: 'Barangay Fairview, Quezon City', health: { bloodType: 'AB+', allergies: 'Shellfish', conditions: 'None recorded', medications: 'None', lastVisit: 'Jul 18, 2026' } },
];

const INVENTORY = [
  { item: 'Rice (kg)', stock: 48, min: 20 },
  { item: 'Powdered Milk (cans)', stock: 6, min: 10 },
  { item: 'Children Vitamins (bottles)', stock: 14, min: 15 },
  { item: 'First Aid Kits', stock: 3, min: 5 },
  { item: 'School Supplies (sets)', stock: 22, min: 10 },
];

const STAFF = [
  { name: 'J. Santos', role: 'Caregiver', shift: '6AM–2PM' },
  { name: 'M. Cruz', role: 'Nurse', shift: '2PM–10PM' },
  { name: 'R. Bautista', role: 'Caregiver', shift: '10PM–6AM' },
];

const VISITORS = [
  { name: 'Hope Foundation Inc.', purpose: 'Donation drop-off', time: '9:14 AM' },
  { name: 'D. Alonzo', purpose: 'Volunteer orientation', time: '10:02 AM' },
];

const MEALS = [
  { date: 'Sep 24', meal: 'Breakfast', menu: 'Rice porridge, banana, milk' },
  { date: 'Sep 24', meal: 'Lunch', menu: 'Chicken adobo, rice, vegetables' },
  { date: 'Sep 23', meal: 'Dinner', menu: 'Fish tinola, rice' },
];

const ACTIVITY = [
  { time: '08:42', user: 'A. Fernandez', action: 'Reviewed child records', entity: 'Children' },
  { time: '08:15', user: 'M. Cruz', action: 'Logged medication follow-up', entity: 'Health' },
  { time: '07:58', user: 'J. Santos', action: 'Updated stock count', entity: 'Inventory' },
  { time: '07:26', user: 'System', action: 'Visitor check-in confirmed', entity: 'Visitors' },
];

const DONATION_HISTORY = [
  { date: 'Sep 18, 2026', reference: 'DON-1048', amount: '₱12,000', status: 'Received' },
  { date: 'Aug 30, 2026', reference: 'DON-0986', amount: '₱8,500', status: 'Received' },
  { date: 'Jul 12, 2026', reference: 'DON-0914', amount: '₱5,000', status: 'Received' },
];

const CHILD_NEEDS = [
  { need: 'School supplies', detail: 'Notebooks, pencils, and art materials', priority: 'High' },
  { need: 'Children vitamins', detail: 'Monthly wellness supply', priority: 'Medium' },
  { need: 'Rice and pantry staples', detail: 'Next two-week meal cycle', priority: 'Medium' },
];

function avatarColor(name) {
  const palette = ['#1E8C82', '#0F2A4A', '#B8860B', '#6C63A6', '#B3452E', '#2E6DA4', '#4A7856'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

function initials(name) {
  return name
    .replace(/[^A-Za-z ]/g, '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function Avatar({ name, size = 'sm' }) {
  return (
    <div className={`avatar avatar-${size}`} style={{ background: avatarColor(name) }}>
      {initials(name)}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="kpi">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('cs_user') || 'null'));
  const [authTab, setAuthTab] = useState('login');
  const [activeView, setActiveView] = useState('dashboard');
  const lastActivity = React.useRef(Date.now());

  const role = user?.role || 'staff';

  React.useEffect(() => {
    if (!user) return undefined;

    const markActivity = () => {
      lastActivity.current = Date.now();
    };

    markActivity();
    const activityEvents = ['keydown', 'mousedown', 'mousemove', 'scroll', 'touchstart'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity));

    const timer = setInterval(() => {
      const inactiveSeconds = Math.floor((Date.now() - lastActivity.current) / 1000);
      if (inactiveSeconds >= INACTIVITY_TIMEOUT_SECONDS) {
        if (localStorage.getItem('cs_token')) void api.post('/auth/logout').catch(() => {});
        setUser(null);
        localStorage.removeItem('cs_user');
        localStorage.removeItem('cs_token');
        setAuthTab('login');
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity));
    };
  }, [user]);

  const handleLogin = (userAccount) => {
    setUser(userAccount);
    localStorage.setItem('cs_user', JSON.stringify(userAccount));
    lastActivity.current = Date.now();
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    if (localStorage.getItem('cs_token')) void api.post('/auth/logout').catch(() => {});
    setUser(null);
    localStorage.removeItem('cs_user');
    localStorage.removeItem('cs_token');
    setAuthTab('login');
  };

  if (!user) {
    return <AuthScreen authTab={authTab} setAuthTab={setAuthTab} onLogin={handleLogin} />;
  }

  return (
    <div id="app-shell">
      <nav className="sidebar">
        <div className="brand-block">
          <div className="brand">Care<span>Sphere</span></div>
          <span className="brand-subtitle">Child Welfare Operations</span>
        </div>

        {[
          ['dashboard', 'Dashboard'],
          ['children', 'Children'],
          ['inventory', 'Inventory'],
          ['visitors', 'Visitors'],
          ['activity', 'Activity'],
          ['settings', 'Settings'],
        ]
          .filter(([id]) => ROLES[role].modules.includes(id))
          .map(([id, label]) => (
            <div
              key={id}
              className={`navitem ${activeView === id ? 'active' : ''}`}
              onClick={() => setActiveView(id)}
            >
              {label}
            </div>
          ))}

        <button className="logout-btn" onClick={handleLogout}>Log out</button>
      </nav>

      <main className="main-panel">
        <header className="topbar">
          <div id="whoami" className="whoami">
            <Avatar name={user.name} />
            <div>
              <strong>{user.name}</strong>
              <div className="session">{ROLES[user.role].label}</div>
            </div>
          </div>

        </header>

        <div className="content">
          {activeView === 'dashboard' && <DashboardView user={user} />}
          {activeView === 'children' && <ChildrenView />}
          {activeView === 'inventory' && <InventoryView />}
          {activeView === 'visitors' && <VisitorsView />}
          {activeView === 'activity' && <ActivityView />}
          {activeView === 'settings' && <SettingsView user={user} setUser={setUser} />}
        </div>
      </main>
    </div>
  );
}

function AuthScreen({ authTab, setAuthTab, onLogin }) {
  const [loginType, setLoginType] = useState('admin');
  const [loginUser, setLoginUser] = useState('admin');
  const [loginPass, setLoginPass] = useState('Admin#2026');
  const [signupName, setSignupName] = useState('');
  const [signupUser, setSignupUser] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [signupPass2, setSignupPass2] = useState('');
  const [signupRole, setSignupRole] = useState('staff');
  const [signupCode, setSignupCode] = useState('');
  const [error, setError] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPurpose, setVisitorPurpose] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [mfaCode, setMfaCode] = useState('');

  const submitLogin = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { username: loginUser, password: loginPass });
      if (data.user.role.toLowerCase() !== loginType) {
        setError(`This account is not an ${loginType} account.`);
        return;
      }
      if (data.mfaRequired) {
        setPendingUser({ ...data.user, role: data.user.role.toLowerCase(), mfaChallenge: data.challengeToken });
        setError('');
        setMfaCode('');
        return;
      }
      onLogin({ ...data.user, role: data.user.role.toLowerCase() });
      return;
    } catch {
      // Keep the offline prototype accounts available when SQL Server is not configured.
    }
    const found = DEMO_USERS.find((u) => u.username === loginUser && u.password === loginPass);
    if (!found || found.role !== loginType) {
      setError('Invalid credentials.');
      return;
    }

    if (found.role === 'admin') {
      setPendingUser(found);
      setError('');
      setMfaCode('');
      return;
    }

    onLogin(found);
  };

  const verifyMfa = async (event) => {
    event.preventDefault();
    if (!pendingUser) return;

    if (pendingUser.mfaChallenge) {
      try {
        const { data } = await api.post('/auth/mfa/verify', { challengeToken: pendingUser.mfaChallenge, code: mfaCode });
        setError('');
        onLogin({ ...data.user, role: data.user.role.toLowerCase() });
        setPendingUser(null);
        setMfaCode('');
      } catch {
        setError('Incorrect MFA code or expired challenge.');
      }
      return;
    }

    if (mfaCode !== MFA_CODE) {
      setError('Incorrect MFA code.');
      return;
    }

    setError('');
    onLogin(pendingUser);
    setPendingUser(null);
    setMfaCode('');
  };

  const submitSignup = (event) => {
    event.preventDefault();
    if (!signupName || !signupUser || !signupPass) {
      setError('All fields are required.');
      return;
    }
    if (signupPass !== signupPass2) {
      setError('Passwords do not match.');
      return;
    }
    if (signupRole === 'admin' && signupCode !== 'NTC-ADMIN-2026') {
      setError('Admin invitation code is invalid.');
      return;
    }
    DEMO_USERS.push({ username: signupUser, password: signupPass, role: signupRole, name: signupName });
    setError('');
    setAuthTab('login');
    setLoginUser(signupUser);
    setLoginPass(signupPass);
  };

  const submitVisitor = (event) => {
    event.preventDefault();
    if (!visitorName || !visitorPurpose) {
      setError('Please enter your name and purpose of visit.');
      return;
    }
    onLogin({ username: `visitor-${Date.now()}`, role: 'visitor', name: visitorName });
  };

  return (
    <div id="authScreen">
      <div className="authbox">
        <h1>CareSphere</h1>
        <div className="sub">Child Registry & Welfare Home Operations</div>

        <div className="authtabs">
          <div className={authTab === 'login' ? 'active' : ''} onClick={() => setAuthTab('login')}>Login</div>
          <div className={authTab === 'signup' ? 'active' : ''} onClick={() => setAuthTab('signup')}>Sign up</div>
          <div className={authTab === 'visitor' ? 'active' : ''} onClick={() => setAuthTab('visitor')}>Visitor</div>
        </div>

        {error && <div className="err">{error}</div>}

        {pendingUser ? (
          <form onSubmit={verifyMfa}>
            <div className="notice">Admin MFA required. Use code: 123456</div>
            <div className="field">
              <label>Authentication code</label>
              <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="123456" />
            </div>
            <button type="submit" className="btn full">Verify MFA</button>
            <button type="button" className="btn secondary full" onClick={() => setPendingUser(null)}>
              Back to login
            </button>
          </form>
        ) : authTab === 'login' ? (
          <form onSubmit={submitLogin}>
            <div className="login-role-tabs" aria-label="Login type">
              <button type="button" className={loginType === 'admin' ? 'active' : ''} onClick={() => { setLoginType('admin'); setLoginUser('admin'); setLoginPass('Admin#2026'); setError(''); }}>Administrator</button>
              <button type="button" className={loginType === 'staff' ? 'active' : ''} onClick={() => { setLoginType('staff'); setLoginUser('staff'); setLoginPass('Staff#2026'); setError(''); }}>Staff</button>
            </div>
            <div className="auth-mode-title">{loginType === 'admin' ? 'Administrator login' : 'Staff login'}</div>
            <div className="field">
              <label>Username</label>
              <input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <div className="pwd-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                />
                <button type="button" className="pwd-toggle" onClick={() => setShowPass((s) => !s)}>
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button type="submit" className="btn full">Sign in</button>
          </form>
        ) : authTab === 'signup' ? (
          <form onSubmit={submitSignup}>
            <div className="field">
              <label>Full name</label>
              <input value={signupName} onChange={(e) => setSignupName(e.target.value)} />
            </div>
            <div className="field">
              <label>Username</label>
              <input value={signupUser} onChange={(e) => setSignupUser(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={signupPass} onChange={(e) => setSignupPass(e.target.value)} />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input type="password" value={signupPass2} onChange={(e) => setSignupPass2(e.target.value)} />
            </div>
            <div className="field">
              <label>Role</label>
              <select value={signupRole} onChange={(e) => setSignupRole(e.target.value)} className="role-select">
                <option value="staff">Staff</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            {signupRole === 'admin' && (
              <div className="field">
                <label>Admin invitation code</label>
                <input value={signupCode} onChange={(e) => setSignupCode(e.target.value)} />
              </div>
            )}
            <div className="pwhint">Strong password: 8+ chars, uppercase, number, symbol.</div>
            <button type="submit" className="btn full">Create account</button>
          </form>
        ) : (
          <form onSubmit={submitVisitor}>
            <div className="field">
              <label>Name</label>
              <input value={visitorName} onChange={(e) => setVisitorName(e.target.value)} />
            </div>
            <div className="field">
              <label>Purpose</label>
              <input value={visitorPurpose} onChange={(e) => setVisitorPurpose(e.target.value)} />
            </div>
            <button type="submit" className="btn full">Check in</button>
          </form>
        )}

        <div className="demo">
          <b>Demo accounts</b>
          <div>admin / Admin#2026</div>
          <div>staff / Staff#2026</div>
          <div>health / Health#2026</div>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ user }) {
  if (user.role === 'visitor' || user.role === 'donor') return <VisitorDashboard user={user} />;

  const lowStockItems = INVENTORY.filter((item) => item.stock <= item.min);
  const healthCoverage = CHILDREN.filter((child) => child.health).length;
  const inventoryUnits = INVENTORY.reduce((total, item) => total + item.stock, 0);
  const stats = [
    { label: 'Children in care', value: CHILDREN.length },
    { label: 'Health profiles', value: `${healthCoverage}/${CHILDREN.length}` },
    { label: 'Inventory units', value: inventoryUnits },
    { label: 'Low-stock alerts', value: lowStockItems.length },
    { label: 'Today visitors', value: VISITORS.length },
    { label: 'Monthly donations', value: '₱48.2K' },
  ];

  return (
    <>
      <h2>Operations Dashboard</h2>
      <div className="pagedesc">Welcome back, {user.name}. Here is the current operational snapshot.</div>

      <div className="grid kpi-grid">
        {stats.map((stat) => (
          <Stat key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="content-grid">
        <div className="card">
          <h3>Low-stock alerts</h3>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.map((item) => (
                <tr key={item.item}>
                  <td>{item.item}</td>
                  <td>{item.stock} units</td>
                  <td><span className="low">Low</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Child registry and health</h3>
          <div className="summary-list">
            <div><span>Active child records</span><strong>{CHILDREN.length}</strong></div>
            <div><span>Health profiles available</span><strong>{healthCoverage}</strong></div>
            <div><span>Protected QR policy</span><strong>3-minute expiry</strong></div>
            <div><span>Access model</span><strong>RBAC protected</strong></div>
          </div>
        </div>

        <div className="card">
          <h3>Daily operations</h3>
          <div className="summary-list">
            <div><span>Visitor records</span><strong>{VISITORS.length}</strong></div>
            <div><span>Staff on duty</span><strong>{STAFF.length}</strong></div>
            <div><span>Meal deliveries logged</span><strong>{MEALS.length}</strong></div>
            <div><span>Donation tracking</span><strong>Active</strong></div>
          </div>
        </div>

        <div className="card">
          <h3>Recent audit activity</h3>
          <div className="summary-list audit-summary">
            {ACTIVITY.slice(0, 4).map((entry) => (
              <div key={`${entry.time}-${entry.action}`}><span>{entry.time} · {entry.user}</span><strong>{entry.action}</strong></div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function VisitorDashboard({ user }) {
  return (
    <>
      <h2>Donor & Visitor Dashboard</h2>
      <div className="pagedesc">Welcome, {user.name}. Your donation history and current child support needs are shown below.</div>

      <div className="content-grid">
        <div className="card">
          <h3>Donation history</h3>
          <table>
            <thead><tr><th>Date</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{DONATION_HISTORY.map((donation) => (
              <tr key={donation.reference}><td>{donation.date}</td><td>{donation.reference}</td><td>{donation.amount}</td><td><span className="ok-badge">{donation.status}</span></td></tr>
            ))}</tbody>
          </table>
        </div>

        <div className="card">
          <h3>Children needing help</h3>
          <div className="summary-list">
            {CHILD_NEEDS.map((item) => (
              <div key={item.need}><span><strong>{item.need}</strong><br />{item.detail}</span><b className={item.priority === 'High' ? 'low' : 'ok-badge'}>{item.priority}</b></div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ChildrenView() {
  const [selectedChild, setSelectedChild] = useState(null);
  const [profileTab, setProfileTab] = useState('overview');
  const [protectedQr, setProtectedQr] = useState(null);
  const [qrSeconds, setQrSeconds] = useState(0);

  React.useEffect(() => {
    if (!protectedQr) return undefined;
    const timer = setInterval(() => {
      setQrSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [protectedQr]);

  const openChild = (child) => {
    setSelectedChild(child);
    setProfileTab('overview');
    setProtectedQr(null);
    setQrSeconds(0);
  };

  const generateProtectedQr = async () => {
    const token = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const resolverUrl = `${window.location.origin}/qr/resolve?token=${encodeURIComponent(token)}`;
    const dataUrl = await QRCode.toDataURL(resolverUrl, { margin: 1, width: 260 });
    sessionStorage.setItem(`cs_qr:${token}`, JSON.stringify({ child: selectedChild, expiresAt: new Date(Date.now() + 180000).toISOString() }));
    setProtectedQr(dataUrl);
    setQrSeconds(180);
    setProfileTab('qr');
  };

  return (
    <>
      <h2>Children</h2>
      <div className="pagedesc">Current child records and case status.</div>

      <div className="child-list">
        {CHILDREN.map((child) => (
          <button key={child.id} className="child-card clickable" onClick={() => openChild(child)}>
            <Avatar name={child.name} size="lg" />
            <div className="meta">
              <b>{child.name}</b>
              <span>{child.id}</span>
            </div>
          </button>
        ))}
      </div>

      {selectedChild && (
        <div className="profile-modal-overlay" onClick={() => setSelectedChild(null)}>
          <div className="profile-modal" onClick={(event) => event.stopPropagation()}>
            <div className="profile-header">
              <div className="profile-title-wrap">
                <Avatar name={selectedChild.name} size="lg" />
                <div>
                  <h3>{selectedChild.name}</h3>
                  <div className="profile-id">{selectedChild.id}</div>
                </div>
              </div>
              <button className="close-button" onClick={() => setSelectedChild(null)}>Close</button>
            </div>

            <div className="profile-tabs">
              <button className={profileTab === 'overview' ? 'active' : ''} onClick={() => setProfileTab('overview')}>Overview</button>
              <button className={profileTab === 'health' ? 'active' : ''} onClick={() => setProfileTab('health')}>Health history</button>
              <button className={profileTab === 'qr' ? 'active' : ''} onClick={() => setProfileTab('qr')}>Protected QR</button>
            </div>

            {profileTab === 'overview' && <>
              <div className="profile-grid">
                <div><span>Age</span><strong>{selectedChild.age}</strong></div>
                <div><span>Sex</span><strong>{selectedChild.sex}</strong></div>
                <div><span>Room</span><strong>{selectedChild.room}</strong></div>
                <div><span>Status</span><strong>{selectedChild.status}</strong></div>
                <div><span>DOB</span><strong>{selectedChild.dob}</strong></div>
                <div><span>Admission</span><strong>{selectedChild.admission}</strong></div>
              </div>
              <div className="profile-section">
                <h4>Case details</h4>
                <p><strong>Case worker:</strong> {selectedChild.caseWorker}</p>
                <p><strong>Guardian:</strong> {selectedChild.guardian}</p>
                <p><strong>Origin:</strong> {selectedChild.origin}</p>
              </div>
            </>}

            {profileTab === 'health' && <div className="profile-health">
              <div className="health-status"><span>Health history</span><strong>Last reviewed {selectedChild.health.lastVisit}</strong></div>
              <div className="profile-grid">
                <div><span>Blood type</span><strong>{selectedChild.health.bloodType}</strong></div>
                <div><span>Allergies</span><strong>{selectedChild.health.allergies}</strong></div>
                <div><span>Conditions</span><strong>{selectedChild.health.conditions}</strong></div>
                <div><span>Medications</span><strong>{selectedChild.health.medications}</strong></div>
              </div>
              <div className="profile-section"><h4>Health record history</h4><p>Routine wellness review completed by the assigned health worker. Records are access-controlled.</p></div>
            </div>}

            {profileTab === 'qr' && <div className="qr-panel">
              {protectedQr ? <>
                <img src={protectedQr} alt="Protected child profile QR code" />
                <p>Expires in <strong>{Math.floor(qrSeconds / 60)}:{String(qrSeconds % 60).padStart(2, '0')}</strong></p>
                {qrSeconds === 0 && <p className="low">QR expired. Generate a new protected code.</p>}
              </> : <p>Generate a three-minute protected QR code for server-validated access.</p>}
              <button className="btn" onClick={generateProtectedQr}>Generate Protected QR</button>
            </div>}
          </div>
        </div>
      )}
    </>
  );
}

function InventoryView() {
  return (
    <>
      <h2>Inventory</h2>
      <div className="pagedesc">Monitor stock safety thresholds and replenishment needs.</div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Current Stock</th>
              <th>Minimum Threshold</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {INVENTORY.map((item) => (
              <tr key={item.item}>
                <td>{item.item}</td>
                <td>{item.stock}</td>
                <td>{item.min}</td>
                <td>
                  {item.stock <= item.min ? <span className="low">Low stock</span> : <span className="ok-badge">OK</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function VisitorsView() {
  return (
    <>
      <h2>Visitors</h2>
      <div className="pagedesc">Recent in-person records and check-ins.</div>

      <QRResolver />

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {VISITORS.map((visitor) => (
              <tr key={visitor.name}>
                <td>{visitor.name}</td>
                <td>{visitor.purpose}</td>
                <td>{visitor.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ActivityView() {
  return (
    <>
      <h2>Activity Log</h2>
      <div className="pagedesc">Audit trail of the most recent operations across the system.</div>

      <div className="card log">
        {ACTIVITY.map((entry) => (
          <div key={`${entry.time}-${entry.action}`}>
            <span>{entry.time}</span> · <strong>{entry.user}</strong> · {entry.action} · {entry.entity}
          </div>
        ))}
      </div>
    </>
  );
}

function SettingsView({ user, setUser }) {
  const [name, setName] = useState(user.name);
  const [profileMsg, setProfileMsg] = useState('');

  const saveProfile = () => {
    const updatedUser = { ...user, name };
    setUser(updatedUser);
    localStorage.setItem('cs_user', JSON.stringify(updatedUser));
    setProfileMsg('Profile updated.');
  };

  return (
    <>
      <h2>Account Settings</h2>
      <div className="pagedesc">Manage profiles and password restrictions for the current operator.</div>

      <div className="card settings-card">
        <div className="field">
          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label>Username</label>
          <input value={user.username} readOnly />
        </div>

        <div className="field">
          <label>Role</label>
          <input value={ROLES[user.role].label} readOnly />
        </div>

        <button className="btn" onClick={saveProfile}>Save profile</button>
        {profileMsg && <div className="ok-msg">{profileMsg}</div>}
      </div>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
