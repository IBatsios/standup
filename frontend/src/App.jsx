import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const RL = { owner: 'Owner', manager: 'Manager', team_lead: 'Team Lead', employee: 'Employee' };
const RH = { owner: 4, manager: 3, team_lead: 2, employee: 1 };
const SC = {
  working:  { label: 'Working Today',       icon: '🔧', color: '#f59e0b' },
  today:    { label: 'Completed Today',     icon: '✅', color: '#22c55e' },
  tomorrow: { label: 'Plans for Tomorrow',  icon: '📋', color: '#3b82f6' },
  future:   { label: 'Future Tasks',        icon: '🔮', color: '#a855f7' },
};
const TOPTS = []; for (let m = 0; m <= 480; m += 15) TOPTS.push(m);
const fmt = (mins) => { if (!mins) return '—'; const h = Math.floor(mins/60), m = mins%60; return h===0?`${m}m`:m===0?`${h}h`:`${h}h ${m}m`; };
const sumT = (tasks, f) => tasks.reduce((a,t) => a+(t[f]||0), 0);
const toDateStr = (d) => d.toISOString().slice(0,10);
const todayStr = () => toDateStr(new Date());
const slugify = (s) => s.toLowerCase().replace(/\s+/g,'.').replace(/[^a-z0-9.]/g,'');
const IB = { padding:'8px 10px', borderRadius:6, border:'1px solid rgba(148,163,184,0.2)', background:'rgba(15,23,42,0.6)', color:'#f1f5f9', fontSize:13, outline:'none', boxSizing:'border-box' };
const ROLES = ['owner','manager','team_lead','employee'];

// Move button definitions per section
const MOVE_OPTIONS = {
  working:  [
    { label:'→ Tomorrow', targetSection:'tomorrow', color:'#3b82f6' },
    { label:'→ Future',   targetSection:'future',   color:'#a855f7' },
  ],
  today:    [
    { label:'→ Working',  targetSection:'working',  color:'#f59e0b' },
    { label:'→ Tomorrow', targetSection:'tomorrow', color:'#3b82f6' },
    { label:'→ Future',   targetSection:'future',   color:'#a855f7' },
  ],
  tomorrow: [
    { label:'→ Today',   targetSection:'working',  color:'#f59e0b' },
    { label:'→ Future',  targetSection:'future',   color:'#a855f7' },
  ],
  future:   [
    { label:'→ Today',    targetSection:'working',  color:'#f59e0b' },
    { label:'→ Tomorrow', targetSection:'tomorrow', color:'#3b82f6' },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function userTeamIds(u) {
  if (u.team_memberships?.length > 0) return u.team_memberships.map(m => m.team_id);
  if (u.team_ids?.length > 0) return u.team_ids;
  if (u.team_id) return [u.team_id];
  return [];
}
function userRoleInTeam(u, teamId) {
  const m = u.team_memberships?.find(m => m.team_id === teamId);
  return m?.role || u.role;
}
function canEditCheck(cu, tu, users, teams) {
  if (!cu || !tu) return false; if (cu === tu) return true;
  const c = users.find(u => u.id === cu), t = users.find(u => u.id === tu);
  if (!c || !t) return false;
  if (c.role === 'owner') return true;
  if (c.role === 'manager') {
    const mt = teams.filter(x => x.manager_id === cu);
    const mtIds = mt.map(x => x.id); const leadIds = mt.map(x => x.lead_id).filter(Boolean);
    return leadIds.includes(tu) || userTeamIds(t).some(tid => mtIds.includes(tid));
  }
  if (c.role === 'team_lead') {
    const ledTeamIds = teams.filter(x => x.lead_id === cu).map(x => x.id);
    const allLeadTeams = [...new Set([...ledTeamIds, ...userTeamIds(c)])];
    return userTeamIds(t).some(tid => allLeadTeams.includes(tid)) && RH[t.role] < RH[c.role];
  }
  return false;
}
function getVisibleUsers(cu, users, teams, activeTeamId) {
  const c = users.find(u => u.id === cu); if (!c) return [];
  if (c.role === 'owner') return users;
  if (c.role === 'manager') {
    const mt = teams.filter(t => t.manager_id === cu);
    const mtIds = mt.map(t => t.id); const leadIds = mt.map(t => t.lead_id).filter(Boolean);
    return users.filter(u => u.id === cu || leadIds.includes(u.id) || userTeamIds(u).some(tid => mtIds.includes(tid)));
  }
  if (c.role === 'team_lead') {
    const ledTeamIds = teams.filter(t => t.lead_id === cu).map(t => t.id);
    const allTeamIds = [...new Set([...ledTeamIds, ...userTeamIds(c)])];
    const filterIds = activeTeamId ? [activeTeamId] : allTeamIds;
    return users.filter(u => u.id === cu || userTeamIds(u).some(tid => filterIds.includes(tid)));
  }
  return users.filter(u => u.id === cu);
}

// ─── CalendarPicker ───────────────────────────────────────────────────────────
function CalendarPicker({ selectedDate, onChange, onClose }) {
  const [view, setView] = useState(() => { const d = selectedDate ? new Date(selectedDate+'T00:00:00') : new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const today = todayStr(); const { year, month } = view;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const cells = []; for (let i=0;i<firstDay;i++) cells.push(null); for (let d=1;d<=daysInMonth;d++) cells.push(d);
  const pick = (d) => { const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; onChange(ds); onClose(); };
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', top:52, right:24, background:'#1e293b', border:'1px solid rgba(148,163,184,0.15)', borderRadius:14, padding:16, boxShadow:'0 20px 50px rgba(0,0,0,0.5)', width:280 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <button onClick={()=>setView(v=>{const d=new Date(v.year,v.month-1);return{year:d.getFullYear(),month:d.getMonth()}})} style={{ background:'none',border:'none',color:'#94a3b8',fontSize:16,cursor:'pointer',padding:'4px 8px',borderRadius:6 }}>‹</button>
          <span style={{ color:'#f1f5f9', fontSize:14, fontWeight:600 }}>{MONTHS[month]} {year}</span>
          <button onClick={()=>setView(v=>{const d=new Date(v.year,v.month+1);return{year:d.getFullYear(),month:d.getMonth()}})} style={{ background:'none',border:'none',color:'#94a3b8',fontSize:16,cursor:'pointer',padding:'4px 8px',borderRadius:6 }}>›</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
          {DAYS.map(d=><div key={d} style={{ textAlign:'center',color:'#475569',fontSize:11,fontWeight:600,padding:'4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
          {cells.map((d,i)=>{
            if(!d) return <div key={i}/>;
            const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isToday=ds===today, isSel=ds===selectedDate;
            return <button key={i} onClick={()=>pick(d)} style={{ padding:'7px 0',borderRadius:8,border:'none',background:isSel?'#6366f1':isToday?'rgba(99,102,241,0.2)':'transparent',color:isSel?'#fff':isToday?'#818cf8':'#cbd5e1',fontSize:13,fontWeight:isToday||isSel?700:400,cursor:'pointer' }}
              onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='rgba(148,163,184,0.1)'}}
              onMouseLeave={e=>{e.currentTarget.style.background=isSel?'#6366f1':isToday?'rgba(99,102,241,0.2)':'transparent'}}>{d}</button>;
          })}
        </div>
        {selectedDate!==today && <button onClick={()=>{onChange(today);onClose();}} style={{ marginTop:10,width:'100%',padding:'8px 0',borderRadius:8,border:'1px solid rgba(99,102,241,0.3)',background:'transparent',color:'#818cf8',fontSize:12,fontWeight:600,cursor:'pointer' }}>Jump to Today</button>}
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [uid,setUid]=useState(''); const [pw,setPw]=useState(''); const [err,setErr]=useState(''); const [loading,setLoading]=useState(false);
  const go = async () => { if(!uid){setErr('Enter your user ID');return;} setLoading(true);setErr(''); try{const user=await api.login(uid,pw);onLogin(user);}catch(e){setErr(e.message||'Login failed');}finally{setLoading(false);} };
  return (
    <div style={{ minHeight:'100vh',background:'linear-gradient(135deg,#0f172a,#1e293b,#0f172a)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'rgba(30,41,59,0.8)',backdropFilter:'blur(20px)',border:'1px solid rgba(148,163,184,0.1)',borderRadius:20,padding:'48px 40px',width:380,boxShadow:'0 25px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign:'center',marginBottom:36 }}><div style={{ fontSize:40,marginBottom:8 }}>📊</div><h1 style={{ color:'#f1f5f9',fontSize:24,fontWeight:700,margin:0 }}>StandUp</h1><p style={{ color:'#94a3b8',fontSize:14,marginTop:6 }}>Daily Task Dashboard</p></div>
        <div style={{ marginBottom:20 }}><label style={{ color:'#94a3b8',fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:8 }}>User ID</label><input value={uid} onChange={e=>{setUid(e.target.value);setErr('');}} placeholder="e.g. firstname.lastname" style={{ ...IB,width:'100%',padding:'12px 14px',borderRadius:10 }} /></div>
        <div style={{ marginBottom:28 }}><label style={{ color:'#94a3b8',fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:8 }}>Password</label><input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&go()} placeholder="Enter password" style={{ ...IB,width:'100%',padding:'12px 14px',borderRadius:10 }} /></div>
        {err && <p style={{ color:'#f87171',fontSize:13,margin:'-12px 0 16px',textAlign:'center' }}>{err}</p>}
        <button onClick={go} disabled={loading} style={{ width:'100%',padding:'13px 0',borderRadius:10,border:'none',background:'linear-gradient(135deg,#3b82f6,#6366f1)',color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer',opacity:loading?0.7:1 }}>{loading?'Signing in…':'Sign In'}</button>
      </div>
    </div>
  );
}

// ─── TimePicker ───────────────────────────────────────────────────────────────
function TPick({ value, onChange, style: xs }) {
  return <select value={value||0} onChange={e=>onChange(parseInt(e.target.value))} style={{ ...IB,padding:'6px 8px',fontSize:12,width:90,cursor:'pointer',...xs }}>
    <option value={0}>0m</option>{TOPTS.filter(v=>v>0).map(m=><option key={m} value={m}>{fmt(m)}</option>)}
  </select>;
}

// ─── Task History Modal ───────────────────────────────────────────────────────
function TaskHistoryModal({ taskId, users, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.getTaskHistory(taskId).then(setData).catch(console.error); }, [taskId]);

  const downloadCSV = () => {
    if (!data) return;
    const createdRecord = data.history.find(h => h.action === 'created');
    const createdBy = createdRecord ? (createdRecord.user_name || createdRecord.user_id || 'Unknown') : 'Unknown';
    const rows = [['Task','Created By','Date','Action','From','To','Time Spent','Note']];
    const history = data.history;
    const skipIdx = new Set();
    history.forEach((h, i) => {
      if (skipIdx.has(i)) return;
      if (h.action === 'created') {
        rows.push([data.task.text, createdBy, new Date(h.created_at).toLocaleString(), 'created', h.user_name||h.user_id||'Unknown', '', '', h.note||'']);
      } else if (h.action === 'handoff') {
        const receivedIdx = history.findIndex((r, j) => j > i && r.action === 'received' && !skipIdx.has(j));
        const received = receivedIdx >= 0 ? history[receivedIdx] : null;
        if (received) skipIdx.add(receivedIdx);
        rows.push([data.task.text, createdBy, new Date(h.created_at).toLocaleString(), 'handoff', h.user_name||h.user_id||'Unknown', received?(received.user_name||received.user_id||'Unknown'):'', fmt(h.time_spent)==='—'?'0':fmt(h.time_spent), h.note||'']);
      } else if (h.action === 'received') {
        rows.push([data.task.text, createdBy, new Date(h.created_at).toLocaleString(), 'received', '', h.user_name||h.user_id||'Unknown', '', h.note||'']);
      } else {
        rows.push([data.task.text, createdBy, new Date(h.created_at).toLocaleString(), h.action, h.user_name||h.user_id||'Unknown', '', fmt(h.time_spent)==='—'?'0':fmt(h.time_spent), h.note||'']);
      }
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `task-${data.task.id}-${data.task.text.slice(0,30).replace(/\s+/g,'-').replace(/[^a-zA-Z0-9-]/g,'')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const actionColor = { created:'#22c55e', handoff:'#f59e0b', received:'#3b82f6', updated:'#94a3b8' };
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20 }} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:'#1e293b',border:'1px solid rgba(148,163,184,0.15)',borderRadius:16,padding:'28px',width:'100%',maxWidth:520,maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 25px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <h3 style={{ color:'#f1f5f9',fontSize:16,fontWeight:700,margin:0 }}>📋 Task History</h3>
          <div style={{ display:'flex',gap:8 }}>
            <button onClick={downloadCSV} style={{ background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,color:'#818cf8',fontSize:12,fontWeight:600,padding:'6px 12px',cursor:'pointer' }}>⬇ CSV</button>
            <button onClick={onClose} style={{ background:'none',border:'none',color:'#64748b',fontSize:20,cursor:'pointer',lineHeight:1 }}>×</button>
          </div>
        </div>
        {data ? (
          <>
            <div style={{ background:'rgba(15,23,42,0.4)',borderRadius:10,padding:'12px 14px',marginBottom:14 }}>
              <div style={{ color:'#e2e8f0',fontSize:14,fontWeight:600 }}>{data.task.text}</div>
              {data.task.url && <a href={data.task.url} target="_blank" rel="noreferrer" style={{ color:'#60a5fa',fontSize:12,textDecoration:'none' }}>{data.task.url}</a>}
            </div>
            <div style={{ overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:6 }}>
              {data.history.length === 0 && <p style={{ color:'#475569',fontSize:13,fontStyle:'italic' }}>No history yet</p>}
              {data.history.map((h,i) => (
                <div key={i} style={{ display:'flex',gap:12,padding:'10px 12px',background:'rgba(15,23,42,0.4)',borderRadius:8,alignItems:'flex-start' }}>
                  <div style={{ width:8,height:8,borderRadius:'50%',background:actionColor[h.action]||'#94a3b8',marginTop:5,flexShrink:0 }} />
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                      <span style={{ color:'#e2e8f0',fontSize:13,fontWeight:600 }}>{h.user_name||h.user_id}</span>
                      <span style={{ background:`${actionColor[h.action]||'#94a3b8'}22`,color:actionColor[h.action]||'#94a3b8',fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,textTransform:'uppercase' }}>{h.action}</span>
                      {h.time_spent > 0 && <span style={{ color:'#64748b',fontSize:11 }}>⏱ {fmt(h.time_spent)}</span>}
                    </div>
                    {h.note && <div style={{ color:'#94a3b8',fontSize:12,marginTop:3 }}>{h.note}</div>}
                    <div style={{ color:'#475569',fontSize:11,marginTop:2 }}>{new Date(h.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : <div style={{ color:'#94a3b8',fontSize:13,textAlign:'center',padding:40 }}>Loading…</div>}
      </div>
    </div>
  );
}

// ─── Handoff Modal ────────────────────────────────────────────────────────────
function HandoffModal({ task, users, allUsers, currentUserId, teams, onHandoff, onClose }) {
  const [toUser, setToUser] = useState('');
  const [timeSpent, setTimeSpent] = useState(task.actual_time || 0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const taskOwnerTeams = userTeamIds((allUsers || users).find(u => u.id === task.user_id) || {});
  const eligible = (allUsers || users)
    .filter(u => u.id !== currentUserId)
    .filter(u => {
      const cu = users.find(u2 => u2.id === currentUserId);
      if (cu && (cu.role === 'owner' || cu.role === 'manager')) return true;
      return userTeamIds(u).some(tid => taskOwnerTeams.includes(tid));
    });
  const go = async () => {
    if (!toUser) { setErr('Select a recipient'); return; }
    setSaving(true); setErr('');
    try { await api.handoffTask(task.id, { to_user_id: toUser, time_spent: timeSpent, note }); onHandoff(); onClose(); }
    catch(e) { setErr(e.message||'Handoff failed'); setSaving(false); }
  };
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20 }} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:'#1e293b',border:'1px solid rgba(148,163,184,0.15)',borderRadius:16,padding:'28px',width:'100%',maxWidth:420,boxShadow:'0 25px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
          <h3 style={{ color:'#f1f5f9',fontSize:16,fontWeight:700,margin:0 }}>🔁 Hand Off Task</h3>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'#64748b',fontSize:20,cursor:'pointer',lineHeight:1 }}>×</button>
        </div>
        <div style={{ background:'rgba(15,23,42,0.4)',borderRadius:8,padding:'10px 12px',marginBottom:16,color:'#e2e8f0',fontSize:13 }}>{task.text}</div>
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <div><label style={{ color:'#64748b',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:6 }}>Hand off to</label>
            <select value={toUser} onChange={e=>setToUser(e.target.value)} style={{ ...IB,width:'100%',padding:'10px 12px',cursor:'pointer' }}><option value="">Select person…</option>{eligible.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div><label style={{ color:'#64748b',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:6 }}>Time you spent</label><TPick value={timeSpent} onChange={setTimeSpent} /></div>
          <div><label style={{ color:'#64748b',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:6 }}>Handoff note (optional)</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="What's the current status?" style={{ ...IB,width:'100%',padding:'10px 12px',minHeight:80,resize:'vertical' }} /></div>
        </div>
        {err && <p style={{ color:'#f87171',fontSize:13,marginTop:10,marginBottom:0 }}>{err}</p>}
        <div style={{ display:'flex',gap:8,marginTop:20,justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px',borderRadius:8,border:'1px solid rgba(148,163,184,0.2)',background:'transparent',color:'#94a3b8',fontSize:13,cursor:'pointer' }}>Cancel</button>
          <button onClick={go} disabled={saving} style={{ padding:'9px 18px',borderRadius:8,border:'none',background:'#f59e0b',color:'#000',fontSize:13,fontWeight:700,cursor:'pointer',opacity:saving?0.7:1 }}>{saving?'Handing off…':'Hand Off'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── TaskSection ──────────────────────────────────────────────────────────────
function TaskSection({ sKey, tasks, canE, clients, users, allUsers, teams, currentUserId, currentUserRole, onAdd, onRem, onUpd, onMove, onHandoff, selectedDate }) {
  const [adding, setAdding] = useState(false);
  const [nt, setNt] = useState({ text:'', client_id:'', expected_time:0, url:'' });
  const [eIdx, setEIdx] = useState(-1);
  const [ef, setEf] = useState({});
  const [handoffTask, setHandoffTask] = useState(null);
  const [historyTaskId, setHistoryTaskId] = useState(null);
  const iRef = useRef(null); const eRef = useRef(null);
  const cfg = SC[sKey];
  const isT = sKey === 'working' || sKey === 'today';
  const isCompleted = sKey === 'today';
  const isHigherRole = currentUserRole === 'owner' || currentUserRole === 'manager' || currentUserRole === 'team_lead';
  const isViewingToday = selectedDate === todayStr();
  useEffect(() => { if (adding && iRef.current) iRef.current.focus(); }, [adding]);
  useEffect(() => { if (eIdx >= 0 && eRef.current) eRef.current.focus(); }, [eIdx]);
  const doAdd = () => { if (nt.text.trim()) { onAdd(sKey, { text:nt.text.trim(), client_id:nt.client_id||null, expected_time:nt.expected_time, actual_time:null, url:nt.url||null }); setNt({ text:'',client_id:'',expected_time:0,url:'' }); setAdding(false); } };
  const doUpd = (task) => { if (ef.text?.trim()) onUpd(task.id, ef); setEIdx(-1); };
  const tExp = sumT(tasks,'expected_time'); const tAct = isT ? sumT(tasks,'actual_time') : null;
  const canHandoff = () => canE && isT && (!isCompleted || isHigherRole);
  const moveOptions = (isViewingToday && canE) ? (MOVE_OPTIONS[sKey] || []) : [];

  return (
    <div style={{ background:'rgba(30,41,59,0.5)',border:'1px solid rgba(148,163,184,0.08)',borderRadius:14,padding:'20px 22px',marginBottom:16,borderLeft:`3px solid ${cfg.color}` }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
        <h3 style={{ color:'#e2e8f0',fontSize:15,fontWeight:600,margin:0 }}><span style={{ marginRight:8 }}>{cfg.icon}</span>{cfg.label}</h3>
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          {tExp>0 && <span style={{ color:'#64748b',fontSize:11 }}>⏱ {fmt(tExp)}{isT&&tAct>0&&<span style={{ color:tAct>tExp?'#f87171':'#22c55e',marginLeft:4 }}>→ {fmt(tAct)}</span>}</span>}
          <span style={{ background:`${cfg.color}22`,color:cfg.color,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20 }}>{tasks.length}</span>
        </div>
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
        {tasks.map((task,idx) => (
          <div key={task.id} style={{ borderRadius:8,background:'rgba(15,23,42,0.4)',transition:'background 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(15,23,42,0.7)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(15,23,42,0.4)'}>
            {eIdx===idx ? (
              <div style={{ padding:'10px 12px',display:'flex',flexDirection:'column',gap:8,border:'1px solid rgba(99,102,241,0.3)',borderRadius:8 }}>
                <input ref={eRef} value={ef.text} onChange={e=>setEf({...ef,text:e.target.value})} onKeyDown={e=>{if(e.key==='Enter')doUpd(task);if(e.key==='Escape')setEIdx(-1);}} style={{ ...IB,width:'100%' }} />
                <input value={ef.url||''} onChange={e=>setEf({...ef,url:e.target.value})} placeholder="Ticket URL (optional)" style={{ ...IB,width:'100%',fontSize:12 }} />
                <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
                  <select value={ef.client_id||''} onChange={e=>setEf({...ef,client_id:e.target.value||null})} style={{ ...IB,fontSize:12,padding:'6px 8px',width:130,cursor:'pointer' }}><option value="">No client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  <div style={{ display:'flex',alignItems:'center',gap:4 }}><span style={{ color:'#64748b',fontSize:11 }}>Est:</span><TPick value={ef.expected_time} onChange={v=>setEf({...ef,expected_time:v})} /></div>
                  {isT && <div style={{ display:'flex',alignItems:'center',gap:4 }}><span style={{ color:'#64748b',fontSize:11 }}>Actual:</span><TPick value={ef.actual_time} onChange={v=>setEf({...ef,actual_time:v})} /></div>}
                </div>
                <div style={{ display:'flex',gap:6 }}>
                  <button onClick={()=>doUpd(task)} style={{ background:cfg.color,color:'#fff',border:'none',borderRadius:6,padding:'6px 12px',fontSize:12,cursor:'pointer',fontWeight:600 }}>Save</button>
                  <button onClick={()=>setEIdx(-1)} style={{ background:'rgba(148,163,184,0.2)',color:'#94a3b8',border:'none',borderRadius:6,padding:'6px 12px',fontSize:12,cursor:'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ padding:'8px 12px' }}>
                <div style={{ display:'flex',alignItems:'flex-start',gap:10 }}>
                  <span style={{ color:cfg.color,fontSize:8,marginTop:6,flexShrink:0 }}>●</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <span style={{ color:'#cbd5e1',fontSize:13,lineHeight:1.5 }}>{task.text}</span>
                    <div style={{ display:'flex',gap:8,marginTop:4,flexWrap:'wrap',alignItems:'center' }}>
                      {task.client_id && <span style={{ background:'rgba(59,130,246,0.15)',color:'#60a5fa',fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:4 }}>{clients.find(c=>c.id===task.client_id)?.name||task.client_id}</span>}
                      {task.url && <a href={task.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ background:'rgba(148,163,184,0.1)',color:'#94a3b8',fontSize:10,padding:'2px 7px',borderRadius:4,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:3 }}>🔗 Link</a>}
                      {task.expected_time>0 && <span style={{ color:'#64748b',fontSize:11 }}>⏱ {fmt(task.expected_time)}</span>}
                      {isT&&task.actual_time>0 && <span style={{ color:task.actual_time>task.expected_time?'#f87171':'#22c55e',fontSize:11,fontWeight:600 }}>→ {fmt(task.actual_time)}</span>}
                      {isT&&!task.actual_time&&canE && <button onClick={()=>onUpd(task.id,{actual_time:task.expected_time||15})} style={{ background:'rgba(34,197,94,0.15)',color:'#22c55e',border:'none',borderRadius:4,padding:'2px 7px',fontSize:10,cursor:'pointer',fontWeight:600 }}>+ Log time</button>}
                      {isCompleted&&task.actual_time>0&&canE && <button onClick={()=>onUpd(task.id,{actual_time:0})} style={{ background:'rgba(248,113,113,0.1)',color:'#f87171',border:'none',borderRadius:4,padding:'2px 7px',fontSize:10,cursor:'pointer',fontWeight:600 }}>↩ Undo</button>}
                    </div>
                    {moveOptions.length > 0 && (
                      <div style={{ display:'flex',gap:5,marginTop:6,flexWrap:'wrap' }}>
                        {moveOptions.map(opt=>(
                          <button key={opt.targetSection} onClick={()=>onMove(task.id, opt.targetSection)}
                            style={{ background:`${opt.color}18`,color:opt.color,border:`1px solid ${opt.color}44`,borderRadius:5,padding:'2px 8px',fontSize:10,fontWeight:600,cursor:'pointer',transition:'background 0.12s,border-color 0.12s' }}
                            onMouseEnter={e=>{e.currentTarget.style.background=`${opt.color}30`;e.currentTarget.style.borderColor=`${opt.color}80`;}}
                            onMouseLeave={e=>{e.currentTarget.style.background=`${opt.color}18`;e.currentTarget.style.borderColor=`${opt.color}44`;}}>{opt.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex',gap:4,flexShrink:0,opacity:0.3,transition:'opacity 0.15s' }} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.3}>
                    <button onClick={()=>setHistoryTaskId(task.id)} title="View history" style={{ background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:13,padding:'2px 4px' }}>📋</button>
                    {canHandoff() && <button onClick={()=>setHandoffTask(task)} title="Hand off" style={{ background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:13,padding:'2px 4px' }}>🔁</button>}
                    {canE && <button onClick={()=>{setEIdx(idx);setEf({text:task.text,client_id:task.client_id||'',expected_time:task.expected_time||0,actual_time:task.actual_time,url:task.url||''});}} style={{ background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:13,padding:'2px 4px' }}>✏️</button>}
                    {canE && <button onClick={()=>onRem(task.id)} style={{ background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:13,padding:'2px 4px' }}>🗑️</button>}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {tasks.length===0 && <p style={{ color:'#475569',fontSize:13,fontStyle:'italic',margin:'4px 0',paddingLeft:18 }}>No tasks yet</p>}
      </div>
      {canE && (adding ? (
        <div style={{ marginTop:10,background:'rgba(15,23,42,0.4)',borderRadius:10,padding:12,display:'flex',flexDirection:'column',gap:8,border:`1px solid ${cfg.color}44` }}>
          <input ref={iRef} value={nt.text} onChange={e=>setNt({...nt,text:e.target.value})} onKeyDown={e=>{if(e.key==='Enter')doAdd();if(e.key==='Escape'){setAdding(false);setNt({text:'',client_id:'',expected_time:0,url:''});}}} placeholder="Task description…" style={{ ...IB,width:'100%' }} />
          <input value={nt.url} onChange={e=>setNt({...nt,url:e.target.value})} placeholder="Ticket URL (optional)" style={{ ...IB,width:'100%',fontSize:12 }} />
          <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
            <select value={nt.client_id} onChange={e=>setNt({...nt,client_id:e.target.value})} style={{ ...IB,fontSize:12,padding:'6px 8px',width:130,cursor:'pointer' }}><option value="">No client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <div style={{ display:'flex',alignItems:'center',gap:4 }}><span style={{ color:'#64748b',fontSize:11 }}>Est:</span><TPick value={nt.expected_time} onChange={v=>setNt({...nt,expected_time:v})} /></div>
          </div>
          <div style={{ display:'flex',gap:6 }}>
            <button onClick={doAdd} style={{ background:cfg.color,color:'#fff',border:'none',borderRadius:8,padding:'8px 14px',fontSize:13,fontWeight:600,cursor:'pointer' }}>Add</button>
            <button onClick={()=>{setAdding(false);setNt({text:'',client_id:'',expected_time:0,url:''});}} style={{ background:'rgba(148,163,184,0.15)',color:'#94a3b8',border:'none',borderRadius:8,padding:'8px 12px',fontSize:13,cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setAdding(true)} style={{ marginTop:10,width:'100%',padding:'8px 0',borderRadius:8,border:'1px dashed rgba(148,163,184,0.2)',background:'transparent',color:'#64748b',fontSize:13,cursor:'pointer' }}
          onMouseEnter={e=>{e.target.style.borderColor=cfg.color;e.target.style.color=cfg.color;}} onMouseLeave={e=>{e.target.style.borderColor='rgba(148,163,184,0.2)';e.target.style.color='#64748b';}}>+ Add Task</button>
      ))}
      {handoffTask && <HandoffModal task={handoffTask} users={users} allUsers={allUsers} teams={teams} currentUserId={currentUserId} onHandoff={onHandoff} onClose={()=>setHandoffTask(null)} />}
      {historyTaskId && <TaskHistoryModal taskId={historyTaskId} users={users} onClose={()=>setHistoryTaskId(null)} />}
    </div>
  );
}

// ─── UserCard ─────────────────────────────────────────────────────────────────
function UCard({ user, isSel, onClick, tc, teamId }) {
  const rc = { owner:'#f59e0b', manager:'#3b82f6', team_lead:'#22c55e', employee:'#94a3b8' };
  const displayRole = teamId ? userRoleInTeam(user, teamId) : user.role;
  return (
    <button onClick={onClick} style={{ width:'100%',textAlign:'left',padding:'12px 14px',borderRadius:10,border:isSel?'1px solid rgba(99,102,241,0.5)':'1px solid transparent',background:isSel?'rgba(99,102,241,0.1)':'transparent',cursor:'pointer',transition:'all 0.15s',display:'flex',alignItems:'center',gap:12 }}
      onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='rgba(148,163,184,0.05)';}} onMouseLeave={e=>{e.currentTarget.style.background=isSel?'rgba(99,102,241,0.1)':'transparent';}}>
      <div style={{ width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${rc[displayRole]}44,${rc[displayRole]}22)`,display:'flex',alignItems:'center',justifyContent:'center',color:rc[displayRole],fontWeight:700,fontSize:14,flexShrink:0,border:`1px solid ${rc[displayRole]}33` }}>{user.name.split(' ').map(n=>n[0]).join('')}</div>
      <div style={{ flex:1,minWidth:0 }}><div style={{ color:'#e2e8f0',fontSize:13,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{user.name}</div><div style={{ color:rc[displayRole],fontSize:11,fontWeight:500 }}>{RL[displayRole]}</div></div>
      {tc && <div style={{ display:'flex',gap:4,flexShrink:0 }}>{Object.entries(SC).map(([k,c])=><span key={k} style={{ background:`${c.color}22`,color:c.color,fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:10 }}>{tc[k]||0}</span>)}</div>}
    </button>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
const ADMIN_TABS = ['Users','Teams','Clients'];
function AdminField({ label, children }) {
  return <div style={{ display:'flex',flexDirection:'column',gap:4 }}><label style={{ color:'#64748b',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em' }}>{label}</label>{children}</div>;
}
function AdminRow({ children, onEdit, onDelete }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,background:'rgba(15,23,42,0.4)',marginBottom:6 }}
      onMouseEnter={e=>e.currentTarget.style.background='rgba(15,23,42,0.7)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(15,23,42,0.4)'}>
      <div style={{ flex:1,minWidth:0 }}>{children}</div>
      <div style={{ display:'flex',gap:4,flexShrink:0 }}>
        {onEdit && <button onClick={onEdit} style={{ background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:13,padding:'3px 6px',borderRadius:4 }} onMouseEnter={e=>e.currentTarget.style.background='rgba(148,163,184,0.1)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>✏️</button>}
        {onDelete && <button onClick={onDelete} style={{ background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:13,padding:'3px 6px',borderRadius:4 }} onMouseEnter={e=>e.currentTarget.style.background='rgba(248,113,113,0.1)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>🗑️</button>}
      </div>
    </div>
  );
}
function AdminModal({ title, onClose, onSave, saveLabel, saveColor, children, err }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20 }} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:'#1e293b',border:'1px solid rgba(148,163,184,0.15)',borderRadius:16,padding:'28px',width:'100%',maxWidth:440,boxShadow:'0 25px 60px rgba(0,0,0,0.5)',maxHeight:'90vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
          <h3 style={{ color:'#f1f5f9',fontSize:17,fontWeight:700,margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'#64748b',fontSize:20,cursor:'pointer',lineHeight:1 }}>×</button>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>{children}</div>
        {err && <p style={{ color:'#f87171',fontSize:13,marginTop:12,marginBottom:0 }}>{err}</p>}
        <div style={{ display:'flex',gap:8,marginTop:24,justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px',borderRadius:8,border:'1px solid rgba(148,163,184,0.2)',background:'transparent',color:'#94a3b8',fontSize:13,cursor:'pointer' }}>Cancel</button>
          <button onClick={onSave} style={{ padding:'9px 18px',borderRadius:8,border:'none',background:saveColor||'#6366f1',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer' }}>{saveLabel||'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ curUser, users, teams, clients, onRefresh }) {
  const [tab, setTab] = useState('Users');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const ib = { ...IB, width:'100%', padding:'10px 12px' };
  const sel = { ...IB, width:'100%', padding:'10px 12px', cursor:'pointer' };
  const F = (k,v) => setForm(f=>({...f,[k]:v}));
  const openModal = (type, data={}) => { setForm(data); setErr(''); setModal(type); };
  const closeModal = () => { setModal(null); setForm({}); setErr(''); };
  const withSave = async (fn) => { setSaving(true);setErr(''); try{await fn();closeModal();onRefresh();}catch(e){setErr(e.message||'Error saving');}finally{setSaving(false);} };
  const roleColor = { owner:'#f59e0b', manager:'#3b82f6', team_lead:'#22c55e', employee:'#94a3b8' };
  const saveUser = () => withSave(async () => {
    if (!form.name?.trim()) throw new Error('Name is required');
    if (!form.role) throw new Error('Role is required');
    if (form._new) {
      if (!form.id?.trim()) throw new Error('User ID is required');
      if (!form.password?.trim()) throw new Error('Password is required');
      await api.createUser({ id:form.id.trim(), name:form.name.trim(), role:form.role, team_memberships:form.team_memberships||[], password:form.password });
    } else {
      const update = { name:form.name.trim(), role:form.role, team_memberships:form.team_memberships||[] };
      if (form.password?.trim()) update.password = form.password;
      await api.updateUser(form.id, update);
    }
  });
  const saveTeam = () => withSave(async () => {
    if (!form.name?.trim()) throw new Error('Team name is required');
    if (form._new) { if (!form.id?.trim()) throw new Error('Team ID is required'); await api.createTeam({ id:form.id.trim(), name:form.name.trim(), manager_id:form.manager_id||null, lead_id:form.lead_id||null }); }
    else await api.updateTeam(form.id, { name:form.name.trim(), manager_id:form.manager_id||null, lead_id:form.lead_id||null });
  });
  const saveClient = () => withSave(async () => {
    if (!form.name?.trim()) throw new Error('Client name is required');
    if (form._new) { if (!form.id?.trim()) throw new Error('Client ID is required'); await api.createClient({ id:form.id.trim(), name:form.name.trim() }); }
    else await api.updateClient(form.id, { name:form.name.trim() });
  });
  return (
    <div>
      <div style={{ display:'flex',gap:6,marginBottom:24,padding:'4px',background:'rgba(15,23,42,0.4)',borderRadius:10,border:'1px solid rgba(148,163,184,0.08)',width:'fit-content' }}>
        {ADMIN_TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 20px',borderRadius:8,border:'none',background:tab===t?'rgba(99,102,241,0.2)':'transparent',color:tab===t?'#818cf8':'#64748b',fontSize:13,fontWeight:tab===t?600:400,cursor:'pointer' }}>{t}</button>)}
      </div>
      {tab==='Users' && (
        <div style={{ background:'rgba(30,41,59,0.5)',border:'1px solid rgba(148,163,184,0.08)',borderRadius:14,padding:'20px 22px',marginBottom:20,borderLeft:'3px solid #6366f1' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
            <h3 style={{ color:'#e2e8f0',fontSize:15,fontWeight:600,margin:0 }}>👤 Users</h3>
            <button onClick={()=>openModal('user',{_new:true,id:'',name:'',role:'employee',team_memberships:[],password:''})} style={{ background:'#6366f1',color:'#fff',border:'none',borderRadius:8,padding:'7px 14px',fontSize:12,fontWeight:600,cursor:'pointer' }}>+ New User</button>
          </div>
          {users.map(u=>(
            <AdminRow key={u.id} onEdit={()=>openModal('user',{...u,team_memberships:u.team_memberships||(u.team_ids||[]).map(tid=>({team_id:tid,role:'employee'})),password:''})} onDelete={u.id!==curUser.id?()=>setConfirm({label:`Delete "${u.name}"?`,onConfirm:async()=>{await api.deleteUser(u.id);onRefresh();}}):null}>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:32,height:32,borderRadius:8,background:`${roleColor[u.role]}22`,display:'flex',alignItems:'center',justifyContent:'center',color:roleColor[u.role],fontWeight:700,fontSize:11,flexShrink:0 }}>{u.name.split(' ').map(n=>n[0]).join('')}</div>
                <div><div style={{ color:'#e2e8f0',fontSize:13,fontWeight:600 }}>{u.name}</div>
                  <div style={{ display:'flex',gap:6,marginTop:2,flexWrap:'wrap' }}>
                    <span style={{ color:'#64748b',fontSize:11 }}>{u.id}</span>
                    <span style={{ background:`${roleColor[u.role]}22`,color:roleColor[u.role],fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:4 }}>{RL[u.role]}</span>
                    {userTeamIds(u).map(tid=>{const tn=teams.find(t=>t.id===tid)?.name;return tn?<span key={tid} style={{ background:'rgba(99,102,241,0.15)',color:'#818cf8',fontSize:10,padding:'1px 6px',borderRadius:4 }}>{tn}</span>:null;})}
                  </div>
                </div>
              </div>
            </AdminRow>
          ))}
        </div>
      )}
      {tab==='Teams' && (
        <div style={{ background:'rgba(30,41,59,0.5)',border:'1px solid rgba(148,163,184,0.08)',borderRadius:14,padding:'20px 22px',marginBottom:20,borderLeft:'3px solid #22c55e' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
            <h3 style={{ color:'#e2e8f0',fontSize:15,fontWeight:600,margin:0 }}>🏢 Teams</h3>
            <button onClick={()=>openModal('team',{_new:true,id:'',name:'',manager_id:'',lead_id:''})} style={{ background:'#22c55e',color:'#fff',border:'none',borderRadius:8,padding:'7px 14px',fontSize:12,fontWeight:600,cursor:'pointer' }}>+ New Team</button>
          </div>
          {teams.map(t=>{
            const mgr=users.find(u=>u.id===t.manager_id); const lead=users.find(u=>u.id===t.lead_id);
            const members=users.filter(u=>userTeamIds(u).includes(t.id));
            return <AdminRow key={t.id} onEdit={()=>openModal('team',{...t})} onDelete={()=>setConfirm({label:`Delete team "${t.name}"?`,onConfirm:async()=>{await api.deleteTeam(t.id);onRefresh();}})}>
              <div><div style={{ color:'#e2e8f0',fontSize:13,fontWeight:600 }}>{t.name}</div>
                <div style={{ display:'flex',gap:8,marginTop:3,flexWrap:'wrap',alignItems:'center' }}>
                  <span style={{ color:'#64748b',fontSize:11 }}>{t.id}</span>
                  {mgr&&<span style={{ color:'#64748b',fontSize:11 }}>Manager: <span style={{ color:'#3b82f6' }}>{mgr.name}</span></span>}
                  {lead&&<span style={{ color:'#64748b',fontSize:11 }}>Lead: <span style={{ color:'#22c55e' }}>{lead.name}</span></span>}
                  <span style={{ background:'rgba(148,163,184,0.1)',color:'#94a3b8',fontSize:10,padding:'1px 6px',borderRadius:4 }}>{members.length} member{members.length!==1?'s':''}</span>
                </div>
              </div>
            </AdminRow>;
          })}
        </div>
      )}
      {tab==='Clients' && (
        <div style={{ background:'rgba(30,41,59,0.5)',border:'1px solid rgba(148,163,184,0.08)',borderRadius:14,padding:'20px 22px',marginBottom:20,borderLeft:'3px solid #f59e0b' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
            <h3 style={{ color:'#e2e8f0',fontSize:15,fontWeight:600,margin:0 }}>🏷️ Clients</h3>
            <button onClick={()=>openModal('client',{_new:true,id:'',name:''})} style={{ background:'#f59e0b',color:'#fff',border:'none',borderRadius:8,padding:'7px 14px',fontSize:12,fontWeight:600,cursor:'pointer' }}>+ New Client</button>
          </div>
          {clients.map(c=><AdminRow key={c.id} onEdit={()=>openModal('client',{...c})} onDelete={()=>setConfirm({label:`Delete client "${c.name}"?`,onConfirm:async()=>{await api.deleteClient(c.id);onRefresh();}})}>
            <div><div style={{ color:'#e2e8f0',fontSize:13,fontWeight:600 }}>{c.name}</div><span style={{ color:'#64748b',fontSize:11 }}>{c.id}</span></div>
          </AdminRow>)}
        </div>
      )}
      {modal==='user' && <AdminModal title={form._new?'Add User':`Edit ${form.name}`} onClose={closeModal} onSave={saving?null:saveUser} saveLabel={saving?'Saving…':form._new?'Create User':'Save'} saveColor="#6366f1" err={err}>
        {form._new && <AdminField label="User ID"><input value={form.id} onChange={e=>F('id',e.target.value)} placeholder="e.g. jane.smith" style={ib} /></AdminField>}
        <AdminField label="Full Name"><input value={form.name||''} onChange={e=>{F('name',e.target.value);if(form._new)F('id',slugify(e.target.value));}} placeholder="Jane Smith" style={ib} /></AdminField>
        <AdminField label="Global Role"><select value={form.role||'employee'} onChange={e=>F('role',e.target.value)} style={sel}>{ROLES.map(r=><option key={r} value={r}>{RL[r]}</option>)}</select></AdminField>
        <AdminField label="Team Memberships">
          <div style={{ display:'flex',flexDirection:'column',gap:6,maxHeight:180,overflowY:'auto',padding:'8px',background:'rgba(15,23,42,0.4)',borderRadius:8,border:'1px solid rgba(148,163,184,0.2)' }}>
            {teams.length===0 && <span style={{ color:'#475569',fontSize:12 }}>No teams yet</span>}
            {teams.map(t=>{
              const memberships=form.team_memberships||[];
              const existing=memberships.find(m=>m.team_id===t.id);
              const checked=!!existing;
              return <div key={t.id} style={{ display:'flex',alignItems:'center',gap:8 }}>
                <input type="checkbox" checked={checked} onChange={()=>{const cur=memberships.filter(m=>m.team_id!==t.id);F('team_memberships',checked?cur:[...cur,{team_id:t.id,role:'employee'}]);}} style={{ accentColor:'#6366f1',flexShrink:0 }} />
                <span style={{ color:checked?'#e2e8f0':'#64748b',fontSize:13,flex:1 }}>{t.name}</span>
                {checked && <select value={existing.role} onChange={e=>{const cur=memberships.map(m=>m.team_id===t.id?{...m,role:e.target.value}:m);F('team_memberships',cur);}} style={{ ...IB,fontSize:11,padding:'3px 6px',width:100,cursor:'pointer' }}>{ROLES.map(r=><option key={r} value={r}>{RL[r]}</option>)}</select>}
              </div>;
            })}
          </div>
        </AdminField>
        <AdminField label={form._new?'Password':'New Password (blank = keep)'}><input type="password" value={form.password||''} onChange={e=>F('password',e.target.value)} placeholder={form._new?'Set password…':'Leave blank to keep'} style={ib} /></AdminField>
      </AdminModal>}
      {modal==='team' && <AdminModal title={form._new?'Add Team':`Edit ${form.name}`} onClose={closeModal} onSave={saving?null:saveTeam} saveLabel={saving?'Saving…':form._new?'Create Team':'Save'} saveColor="#22c55e" err={err}>
        {form._new && <AdminField label="Team ID"><input value={form.id} onChange={e=>F('id',e.target.value)} placeholder="e.g. engineering" style={ib} /></AdminField>}
        <AdminField label="Team Name"><input value={form.name||''} onChange={e=>{F('name',e.target.value);if(form._new)F('id',slugify(e.target.value));}} placeholder="Engineering" style={ib} /></AdminField>
        <AdminField label="Manager"><select value={form.manager_id||''} onChange={e=>F('manager_id',e.target.value)} style={sel}><option value="">No manager</option>{users.filter(u=>u.role==='manager'||u.role==='owner').map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></AdminField>
        <AdminField label="Team Lead"><select value={form.lead_id||''} onChange={e=>F('lead_id',e.target.value)} style={sel}><option value="">No lead</option>{users.filter(u=>u.role==='team_lead'||u.role==='manager').map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></AdminField>
      </AdminModal>}
      {modal==='client' && <AdminModal title={form._new?'Add Client':`Edit ${form.name}`} onClose={closeModal} onSave={saving?null:saveClient} saveLabel={saving?'Saving…':form._new?'Create Client':'Save'} saveColor="#f59e0b" err={err}>
        {form._new && <AdminField label="Client ID"><input value={form.id} onChange={e=>F('id',e.target.value)} placeholder="e.g. acme-corp" style={ib} /></AdminField>}
        <AdminField label="Client Name"><input value={form.name||''} onChange={e=>{F('name',e.target.value);if(form._new)F('id',slugify(e.target.value));}} placeholder="Acme Corp" style={ib} /></AdminField>
      </AdminModal>}
      {confirm && <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20 }}>
        <div style={{ background:'#1e293b',border:'1px solid rgba(248,113,113,0.3)',borderRadius:14,padding:'28px',maxWidth:380,width:'100%' }}>
          <div style={{ fontSize:32,marginBottom:12,textAlign:'center' }}>⚠️</div>
          <p style={{ color:'#e2e8f0',fontSize:14,textAlign:'center',lineHeight:1.6,margin:'0 0 20px' }}>{confirm.label}</p>
          <div style={{ display:'flex',gap:8,justifyContent:'center' }}>
            <button onClick={()=>setConfirm(null)} style={{ padding:'9px 20px',borderRadius:8,border:'1px solid rgba(148,163,184,0.2)',background:'transparent',color:'#94a3b8',fontSize:13,cursor:'pointer' }}>Cancel</button>
            <button onClick={async()=>{await confirm.onConfirm();setConfirm(null);}} style={{ padding:'9px 20px',borderRadius:8,border:'none',background:'#ef4444',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer' }}>Delete</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [curUser, setCurUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [ledTeams, setLedTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [clients, setClients] = useState([]);
  const [viewUser, setViewUser] = useState(null);
  const [tasks, setTasks] = useState({ today:[], tomorrow:[], future:[] });
  const [taskCounts, setTaskCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showCal, setShowCal] = useState(false);
  const [teammates, setTeammates] = useState([]);

  // Restore session — always reset to today
  useEffect(() => {
    (async () => {
      if (api.isLoggedIn()) {
        try { const me = await api.getMe(); if (me) { setCurUser(me); setViewUser(me.id); setSelectedDate(todayStr()); } } catch {}
      }
      setLoading(false);
    })();
  }, []);

  const loadAll = useCallback(async () => {
    if (!curUser) return;
    try {
      const [u, t, c] = await Promise.all([api.getUsers(), api.getTeams(), api.getClients()]);
      setUsers(u); setTeams(t); setClients(c);
      if (curUser.role === 'team_lead') {
        const lt = await api.getLedTeams(); setLedTeams(lt);
        if (lt.length > 0 && !activeTeamId) setActiveTeamId(lt[0].id);
      }
      const tm = await api.getTeammates(); setTeammates(tm);
      const visible = getVisibleUsers(curUser.id, u, t);
      const counts = {};
      await Promise.all(visible.map(async vu => {
        try { const vt = await api.getTasks(vu.id); counts[vu.id] = { today:vt.today?.length||0, tomorrow:vt.tomorrow?.length||0, future:vt.future?.length||0 }; }
        catch { counts[vu.id] = { today:0, tomorrow:0, future:0 }; }
      }));
      setTaskCounts(counts);
    } catch (err) { console.error('Load error:', err); }
  }, [curUser]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadTasks = useCallback(async () => {
    if (!viewUser) return;
    try { const t = await api.getTasks(viewUser, selectedDate); setTasks(t); }
    catch { setTasks({ today:[], tomorrow:[], future:[] }); }
  }, [viewUser, selectedDate]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleLogin = async (user) => {
    setCurUser(user); setViewUser(user.id); setSelectedDate(todayStr());
    try { await api.dailyPromotion(); } catch (e) { console.warn('Daily promotion failed:', e.message); }
  };

  const handleLogout = () => {
    api.logout(); setCurUser(null); setViewUser(null); setShowAdmin(false);
    setUsers([]); setTeams([]); setClients([]); setSelectedDate(todayStr());
  };

  const handleAddTask = async (section, taskData) => {
    try {
      const backendSection = section === 'working' ? 'today' : section;
      await api.createTask({ user_id:viewUser, section:backendSection, selected_date:selectedDate, ...taskData });
      await loadTasks(); await loadAll();
    } catch (err) { console.error('Add task error:', err); }
  };

  const handleRemoveTask = async (taskId) => {
    try { await api.deleteTask(taskId); await loadTasks(); await loadAll(); } catch (err) { console.error(err); }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try { await api.updateTask(taskId, updates); await loadTasks(); } catch (err) { console.error(err); }
  };

  // Move task between all four sections bidirectionally
  const handleMoveTask = async (taskId, targetSection) => {
    try {
      const backendSection = targetSection === 'working' ? 'today' : targetSection;
      await api.updateTask(taskId, { section: backendSection });
      await loadTasks(); await loadAll();
    } catch (err) { console.error('Move task error:', err); }
  };

  if (loading) return <div style={{ minHeight:'100vh',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8' }}>Loading…</div>;
  if (!curUser) return <Login onLogin={handleLogin} />;

  const visible = getVisibleUsers(curUser.id, users, teams, activeTeamId);
  const vud = users.find(u => u.id === viewUser);
  const canE = canEditCheck(curUser.id, viewUser, users, teams);
  const isAdmin = curUser.role === 'owner' || curUser.role === 'manager';
  const allMyTeams = curUser.role === 'owner' ? teams : curUser.role === 'manager' ? teams.filter(t => t.manager_id === curUser.id) : ledTeams;
  const byTeam = {}; const noTeam = [];
  visible.forEach(u => {
    const tids = userTeamIds(u).filter(tid => { if (!teams.find(t => t.id === tid)) return false; if (activeTeamId) return tid === activeTeamId; return true; });
    if (tids.length > 0) { tids.forEach(tid => { if (!byTeam[tid]) byTeam[tid] = []; if (!byTeam[tid].find(x=>x.id===u.id)) byTeam[tid].push(u); }); }
    else if (!activeTeamId) { noTeam.push(u); }
  });

  const tExp = sumT(tasks.today||[], 'expected_time');
  const tAct = sumT(tasks.today||[], 'actual_time');
  const fourSectionTasks = {
    working:  (tasks.today||[]).filter(t => !t.actual_time || t.actual_time === 0),
    today:    (tasks.today||[]).filter(t => t.actual_time > 0),
    tomorrow: tasks.tomorrow||[],
    future:   tasks.future||[],
  };

  return (
    <div style={{ minHeight:'100vh',background:'linear-gradient(135deg,#0f172a,#1e293b,#0f172a)',fontFamily:"'DM Sans','Segoe UI',sans-serif",display:'flex' }}>
      <div style={{ width:sideOpen?280:0,minHeight:'100vh',background:'rgba(15,23,42,0.6)',borderRight:'1px solid rgba(148,163,184,0.08)',transition:'width 0.3s',overflow:'hidden',flexShrink:0,display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'20px 16px 12px',borderBottom:'1px solid rgba(148,163,184,0.08)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}><span style={{ fontSize:24 }}>📊</span><div><h2 style={{ color:'#f1f5f9',fontSize:17,fontWeight:700,margin:0 }}>StandUp</h2><p style={{ color:'#64748b',fontSize:11,margin:0 }}>Daily Task Dashboard</p></div></div>
          <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'rgba(99,102,241,0.08)' }}>
            <div style={{ width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12 }}>{curUser.name.split(' ').map(n=>n[0]).join('')}</div>
            <div style={{ flex:1 }}><div style={{ color:'#e2e8f0',fontSize:13,fontWeight:600 }}>{curUser.name}</div><div style={{ color:'#818cf8',fontSize:11 }}>{RL[curUser.role]}</div></div>
          </div>
          {allMyTeams.length > 1 && (
            <div style={{ marginTop:10 }}>
              <div style={{ color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6 }}>Filter by Team</div>
              <div style={{ display:'flex',flexDirection:'column',gap:3 }}>
                <button onClick={()=>setActiveTeamId(null)} style={{ width:'100%',textAlign:'left',padding:'7px 10px',borderRadius:7,border:!activeTeamId?'1px solid rgba(148,163,184,0.3)':'1px solid transparent',background:!activeTeamId?'rgba(148,163,184,0.08)':'transparent',color:!activeTeamId?'#e2e8f0':'#64748b',fontSize:12,cursor:'pointer' }}>All Teams</button>
                {allMyTeams.map(t=><button key={t.id} onClick={()=>setActiveTeamId(t.id)} style={{ width:'100%',textAlign:'left',padding:'7px 10px',borderRadius:7,border:activeTeamId===t.id?'1px solid rgba(34,197,94,0.4)':'1px solid transparent',background:activeTeamId===t.id?'rgba(34,197,94,0.08)':'transparent',color:activeTeamId===t.id?'#22c55e':'#64748b',fontSize:12,cursor:'pointer' }}>🏢 {t.name}</button>)}
              </div>
            </div>
          )}
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'12px 8px' }}>
          {noTeam.length>0 && <div style={{ marginBottom:8 }}>{noTeam.sort((a,b)=>RH[b.role]-RH[a.role]).map(u=><UCard key={u.id} user={u} isSel={viewUser===u.id} onClick={()=>{setViewUser(u.id);setShowAdmin(false);}} tc={taskCounts[u.id]} />)}</div>}
          {Object.entries(byTeam).map(([tid,us])=><div key={tid} style={{ marginBottom:12 }}>
            <div style={{ padding:'6px 14px',marginBottom:4,color:'#64748b',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em' }}>{teams.find(t=>t.id===tid)?.name}</div>
            {us.sort((a,b)=>RH[userRoleInTeam(b,tid)]-RH[userRoleInTeam(a,tid)]).map(u=><UCard key={u.id} user={u} isSel={viewUser===u.id} onClick={()=>{setViewUser(u.id);setShowAdmin(false);}} tc={taskCounts[u.id]} teamId={tid} />)}
          </div>)}
        </div>
        <div style={{ padding:'12px 16px',borderTop:'1px solid rgba(148,163,184,0.08)',display:'flex',flexDirection:'column',gap:6 }}>
          {isAdmin && <button onClick={()=>setShowAdmin(!showAdmin)} style={{ width:'100%',padding:'9px 0',borderRadius:8,border:'1px solid rgba(148,163,184,0.15)',background:showAdmin?'rgba(99,102,241,0.1)':'transparent',color:showAdmin?'#818cf8':'#64748b',fontSize:13,fontWeight:500,cursor:'pointer' }}>⚙️ Admin Panel</button>}
          <button onClick={handleLogout} style={{ width:'100%',padding:'9px 0',borderRadius:8,border:'1px solid rgba(148,163,184,0.1)',background:'transparent',color:'#64748b',fontSize:13,cursor:'pointer' }}>Sign Out</button>
        </div>
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ padding:'16px 24px',borderBottom:'1px solid rgba(148,163,184,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,position:'relative' }}>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <button onClick={()=>setSideOpen(!sideOpen)} style={{ background:'none',border:'none',color:'#94a3b8',fontSize:20,cursor:'pointer',padding:'4px 8px',borderRadius:6 }}>{sideOpen?'◀':'▶'}</button>
            {vud && <div>
              <h1 style={{ color:'#f1f5f9',fontSize:20,fontWeight:700,margin:0 }}>{vud.name}</h1>
              <p style={{ color:'#64748b',fontSize:13,margin:0 }}>{RL[vud.role]}{(()=>{const tnames=userTeamIds(vud).map(tid=>teams.find(t=>t.id===tid)?.name).filter(Boolean);return tnames.length>0?` · ${tnames.join(', ')}`:''})()}{canE&&viewUser!==curUser.id&&<span style={{ color:'#22c55e',marginLeft:8 }}>● Can edit</span>}{!canE&&viewUser!==curUser.id&&<span style={{ color:'#64748b',marginLeft:8 }}>👁 View only</span>}</p>
            </div>}
          </div>
          <div style={{ display:'flex',gap:12,alignItems:'center' }}>
            {tExp>0 && <div style={{ color:'#64748b',fontSize:12 }}><span>Today: </span><span style={{ color:'#e2e8f0',fontWeight:600 }}>{fmt(tAct)}</span><span> / {fmt(tExp)}</span></div>}
            <button onClick={()=>setShowCal(!showCal)} style={{ background:showCal?'rgba(99,102,241,0.15)':'transparent',border:'1px solid '+(showCal?'rgba(99,102,241,0.4)':'rgba(148,163,184,0.15)'),borderRadius:8,color:selectedDate!==todayStr()?'#818cf8':'#94a3b8',fontSize:12,fontWeight:selectedDate!==todayStr()?600:400,cursor:'pointer',padding:'6px 12px',display:'flex',alignItems:'center',gap:6 }}>
              📅 {selectedDate!==todayStr() ? new Date(selectedDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',year:'numeric'})}
            </button>
          </div>
          {showCal && <CalendarPicker selectedDate={selectedDate} onChange={setSelectedDate} onClose={()=>setShowCal(false)} />}
        </div>
        <div style={{ padding:24,maxWidth:showAdmin?860:720,margin:'0 auto' }}>
          {showAdmin
            ? <AdminPanel curUser={curUser} users={users} teams={teams} clients={clients} onRefresh={loadAll} />
            : viewUser
              ? Object.keys(SC).map(k =>
                  <TaskSection key={k} sKey={k} tasks={fourSectionTasks[k]||[]} canE={canE&&selectedDate>=todayStr()} clients={clients} users={visible} allUsers={curUser.role==='employee'?teammates:users} teams={teams} currentUserId={curUser.id} currentUserRole={curUser.role} onAdd={handleAddTask} onRem={handleRemoveTask} onUpd={handleUpdateTask} onMove={handleMoveTask} onHandoff={loadTasks} selectedDate={selectedDate} />
                )
              : <div style={{ textAlign:'center',color:'#475569',paddingTop:80 }}><p style={{ fontSize:40 }}>👈</p><p>Select a team member</p></div>}
        </div>
      </div>
    </div>
  );
}
