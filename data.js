/* ================= Supabase ================= */
/* The only file that talks to Supabase. The publishable key is safe in a browser; row-level security is the real gate. */
const SUPABASE_URL = 'https://arwxzzpvzsuzdiwbjgmj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xxSEXExeTwBiS3ETSgMhLA_Xde90rP9';
/* null when the CDN script could not load (offline); the demo keeps working without it */
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

/* every call throws an Error with a readable message, so screens can show it as-is */
const sbNeed = () => { if (!sb) throw new Error('Cannot reach the server. Check your internet connection and reload.'); };
const sbRpc = async (fn, args) => { sbNeed(); const { data, error } = await sb.rpc(fn, args); if (error) throw new Error(error.message); return data; };

const DB = {
  async session() { if (!sb) return null; const { data } = await sb.auth.getSession(); return data.session; },
  async signUp(email, password, fullName) {
    sbNeed();
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) throw new Error(error.message);
    return data.session;   // null when the project still asks for email confirmation
  },
  async signIn(email, password) { sbNeed(); const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw new Error(error.message); },
  async signOut() { if (sb) await sb.auth.signOut(); },
  /* { state, company_id, company_name, role, expires_at, reject_reason } — see my_workspace() in 0004_onboarding.sql */
  workspace: () => sbRpc('my_workspace'),
  registerCompany: f => sbRpc('register_company', {
    p_name: f.company, p_full_name: f.name, p_legal_name: f.legal, p_category: f.category,
    p_state: f.state, p_state_code: f.stateCode, p_gstin: f.gstin, p_phone: f.phone, p_city: f.city,
  }),
  activateLicense: key => sbRpc('activate_license', { p_key: key }),

  /* the company row, its document counters and its team, for enterLive() */
  async loadWorkspace(companyId) {
    sbNeed();
    const [co, counters, members, perms] = await Promise.all([
      sb.from('companies').select('*').eq('id', companyId).single(),
      sb.from('doc_counters').select('kind, prefix, next_no').eq('company_id', companyId),
      sb.from('company_members').select('id, user_id, role, status, invited_email, extra, profiles!company_members_user_id_fkey(full_name, email)').eq('company_id', companyId).neq('status', 'removed').order('created_at'),
      sb.from('role_permissions').select('role, permission, allowed').eq('company_id', companyId),
    ]);
    for (const r of [co, counters, members, perms]) if (r.error) throw new Error(r.error.message);
    return { company: co.data, counters: counters.data, members: members.data, perms: perms.data };
  },

  /* platform admin console — see 0004_onboarding.sql and 0005_admin_access.sql */
  adminList: () => sbRpc('admin_list_companies'),
  adminApprove: (id, days) => sbRpc('admin_approve_company', { p_company: id, p_days: days }),
  adminReject: (id, reason) => sbRpc('admin_reject_company', { p_company: id, p_reason: reason }),
  adminExtend: (id, days) => sbRpc('admin_extend_license', { p_company: id, p_days: days }),
  adminSetActive: (id, on) => sbRpc('admin_set_company_active', { p_company: id, p_active: on }),
  adminDelete: id => sbRpc('admin_delete_company', { p_company: id }),

  /* reaches the project's auth endpoint; resolves to { ok, signups } or { ok: false, error } */
  async ping() {
    if (!sb) return { ok: false, error: 'Supabase library did not load. Check your internet connection.' };
    try {
      const r = await fetch(SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: SUPABASE_KEY } });
      if (!r.ok) return { ok: false, error: 'Supabase answered ' + r.status };
      const j = await r.json();
      return { ok: true, signups: !j.disable_signup };
    } catch (e) { return { ok: false, error: e.message }; }
  },
};
