import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX, HiOutlineClipboardCopy, HiOutlineRefresh, HiOutlineEye, HiOutlineEyeOff, HiOutlineSwitchHorizontal } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';

const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const specials = '!@#$%&*';
    let password = '';
    for (let i = 0; i < 8; i++) password += chars[Math.floor(Math.random() * chars.length)];
    password += specials[Math.floor(Math.random() * specials.length)];
    password += Math.floor(Math.random() * 10);
    return password.split('').sort(() => Math.random() - 0.5).join('');
};

const UserManagement = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff', department: '', team: '' });
    const [showPassword, setShowPassword] = useState(false);

    // Bulk selection state
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [bulkTeamId, setBulkTeamId] = useState('');

    // Credentials modal state (for new users)
    const [showCredentials, setShowCredentials] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState({ name: '', email: '', password: '', role: '' });

    // Reset Password modal state (for existing users)
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetData, setResetData] = useState({ name: '', password: '' });

    // Teleport modal state (HR/CEO only)
    const [teleportTarget, setTeleportTarget] = useState(null); // {_id, name, team}
    const [teleportTeamId, setTeleportTeamId] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersRes, teamsRes] = await Promise.all([
                adminAPI.getUsers(),
                adminAPI.getTeams()
            ]);
            setUsers(usersRes.data.data);
            setTeams(teamsRes.data.data);
            setSelectedUsers(new Set()); // Reset selection on load
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingUser(null);
        const autoPassword = generatePassword();
        setForm({
            name: '',
            email: '',
            password: autoPassword,
            role: 'staff',
            department: user?.role === 'team_leader' ? user.department : '',
            team: user?.role === 'team_leader' ? (user.team?._id || user.team) : ''
        });
        setShowPassword(true);
        setShowModal(true);
    };

    const openEdit = (user) => {
        setEditingUser(user);
        setForm({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            department: user.department || '',
            team: user.team?._id || ''
        });
        setShowPassword(false);
        setShowModal(true);
    };

    const handleResetPassword = async (userId, name) => {
        if (!window.confirm(`Are you sure you want to reset the password for ${name}?`)) return;

        const newPassword = generatePassword();
        try {
            await adminAPI.resetPassword(userId, newPassword);
            setResetData({ name, password: newPassword });
            setShowResetModal(true);
            toast.success('Password reset successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reset password');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                const updateData = { ...form };
                if (!updateData.password) delete updateData.password;
                await adminAPI.updateUser(editingUser._id, updateData);
                toast.success('User updated');
                setShowModal(false);
            } else {
                await adminAPI.createUser(form);
                // Save credentials and show the credentials modal
                setCreatedCredentials({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    role: form.role.replace('_', ' ')
                });
                setShowModal(false);
                setShowCredentials(true);
            }
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await adminAPI.deleteUser(userId);
            toast.success('User deleted');
            loadData();
        } catch (err) {
            toast.error('Failed to delete user');
        }
    };

    const openTeleport = (u) => {
        setTeleportTarget(u);
        setTeleportTeamId(u.team?._id || '');
    };

    const handleTeleport = async () => {
        if (!teleportTarget) return;
        try {
            const res = await adminAPI.teleportUser(teleportTarget._id, teleportTeamId || '');
            toast.success(res.data.message);
            setTeleportTarget(null);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Teleport failed');
        }
    };

    const toggleSelectUser = (id) => {
        const newSet = new Set(selectedUsers);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedUsers(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(users.map(u => u._id)));
        }
    };

    const handleBulkAssign = async () => {
        if (selectedUsers.size === 0) return toast.error('No users selected');
        if (!bulkTeamId) return toast.error('Please select a team to assign to');
        if (!window.confirm(`Are you sure you want to assign ${selectedUsers.size} users to this team?`)) return;

        setLoading(true);
        try {
            await adminAPI.bulkAssignUsers(Array.from(selectedUsers), bulkTeamId === 'none' ? '' : bulkTeamId);
            toast.success('Users successfully assigned');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to assign users');
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const copyAllCredentials = () => {
        const text = `WorkShield Login Credentials\n\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nRole: ${createdCredentials.role}\nLogin URL: ${window.location.origin}/login`;
        navigator.clipboard.writeText(text);
        toast.success('All credentials copied');
    };

    const getRoleBadge = (role) => {
        const cls = (role === 'ceo' || role === 'hr') ? 'high' : role === 'team_leader' ? 'moderate' : 'healthy';
        return <span className={`risk-badge ${cls}`}>{role.replace('_', ' ')}</span>;
    };

    if (loading) {
        return <Layout><div className="loading-spinner"><div className="spinner" /></div></Layout>;
    }

    return (
        <Layout>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>User Management</h1>
                    <p>{user?.role === 'team_leader' ? 'Manage your team members' : 'Manage user accounts and role assignments'}</p>
                </div>
                {(user?.role === 'hr' || user?.role === 'ceo' || user?.role === 'team_leader') && (
                    <button className="btn btn-primary" onClick={openCreate}>
                        <HiOutlinePlus /> {user?.role === 'team_leader' ? 'Add Staff' : 'Add User'}
                    </button>
                )}
            </div>

            {(user?.role === 'hr' || user?.role === 'ceo') && selectedUsers.size > 0 && (
                <div style={{ background: 'var(--color-bg-tertiary)', padding: '12px 20px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--color-border)' }}>
                    <span style={{ fontWeight: 500 }}>{selectedUsers.size} selected</span>
                    <select className="form-input" style={{ width: 'auto', padding: '6px 12px' }} value={bulkTeamId} onChange={e => setBulkTeamId(e.target.value)}>
                        <option value="">Select Team to Assign...</option>
                        {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                        <option value="none">Remove from Team (Unassign)</option>
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={handleBulkAssign}>Assign</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUsers(new Set())}>Cancel</button>
                </div>
            )}

            <div className="card">
                <div className="data-table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                {(user?.role === 'hr' || user?.role === 'ceo') && (
                                    <th style={{ width: '40px' }}>
                                        <input type="checkbox" checked={users.length > 0 && selectedUsers.size === users.length} onChange={toggleSelectAll} />
                                    </th>
                                )}
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Team</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u._id} style={selectedUsers.has(u._id) ? { background: 'rgba(13, 148, 136, 0.05)' } : {}}>
                                    {(user?.role === 'hr' || user?.role === 'ceo') && (
                                        <td>
                                            <input type="checkbox" checked={selectedUsers.has(u._id)} onChange={() => toggleSelectUser(u._id)} />
                                        </td>
                                    )}
                                    <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{u.name}</td>
                                    <td>{u.email}</td>
                                    <td>{getRoleBadge(u.role)}</td>
                                    <td>{u.department || '—'}</td>
                                    <td>{u.team?.name || '—'}</td>
                                    <td><span className={`risk-badge ${u.isActive ? 'healthy' : 'high'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} title="Edit User"><HiOutlinePencil /></button>
                                            {(user?.role === 'hr' || user?.role === 'ceo') && (
                                                <>
                                                    {u.role === 'staff' && (
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => openTeleport(u)}
                                                            title="Teleport to another team"
                                                            style={{ color: 'var(--color-accent)' }}
                                                        >
                                                            <HiOutlineSwitchHorizontal />
                                                        </button>
                                                    )}
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleResetPassword(u._id, u.name)} title="Reset Password"><HiOutlineRefresh /></button>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(u._id)} title="Delete User"><HiOutlineTrash /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><HiOutlineX /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. John Doe" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required disabled={!!editingUser} placeholder="e.g. john@company.com" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className="form-input"
                                            value={form.password}
                                            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                            required={!editingUser}
                                            minLength={6}
                                            placeholder={editingUser ? 'Leave blank to keep current' : 'Auto-generated password'}
                                            style={{ paddingRight: '40px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                                background: 'none', border: 'none', color: 'var(--color-text-muted)',
                                                cursor: 'pointer', fontSize: '1.1rem', padding: '2px'
                                            }}
                                        >
                                            {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                                        </button>
                                    </div>
                                    {!editingUser && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setForm(p => ({ ...p, password: generatePassword() }))}
                                            title="Generate new password"
                                            style={{ flexShrink: 0 }}
                                        >
                                            <HiOutlineRefresh />
                                        </button>
                                    )}
                                </div>
                                {!editingUser && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', marginTop: '4px', display: 'block' }}>
                                        Credentials will be shown after creation — save them for the user.
                                    </span>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select
                                    className="form-input"
                                    value={form.role}
                                    onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                                    disabled={user?.role === 'team_leader'}
                                >
                                    <option value="staff">Staff</option>
                                    <option value="team_leader">Team Leader</option>
                                    <option value="hr">HR Administrator</option>
                                    {user?.role === 'ceo' && <option value="ceo">CEO</option>}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <input
                                    className="form-input"
                                    value={form.department}
                                    onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                                    placeholder="e.g. Engineering"
                                    disabled={user?.role === 'team_leader'}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Team</label>
                                <select className="form-input" value={form.team} onChange={e => setForm(p => ({ ...p, team: e.target.value }))} disabled={user?.role === 'team_leader'}>
                                    <option value="">No Team</option>
                                    {teams.filter(t => user?.role !== 'team_leader' || t._id === user?.team?._id || t._id === user?.team).map(t => (
                                        <option key={t._id} value={t._id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingUser ? 'Update' : 'Create User'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Credentials Display Modal */}
            {showCredentials && (
                <div className="modal-overlay" onClick={() => setShowCredentials(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>✅ User Created Successfully</h2>
                            <button className="modal-close" onClick={() => setShowCredentials(false)}><HiOutlineX /></button>
                        </div>

                        <div style={{
                            background: 'var(--color-accent-light)',
                            border: '1px solid rgba(13,148,136,0.2)',
                            borderRadius: 'var(--radius-md)',
                            padding: '14px 16px',
                            marginBottom: '20px',
                            fontSize: '0.82rem',
                            color: 'var(--color-accent)'
                        }}>
                            ⚠️ Save these credentials now. The password cannot be retrieved later.
                        </div>

                        <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '20px' }}>
                            <div style={{ marginBottom: '14px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>{createdCredentials.name}</div>
                            </div>
                            <div style={{ marginBottom: '14px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</span>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px', textTransform: 'capitalize' }}>{createdCredentials.role}</div>
                            </div>
                            <div style={{ marginBottom: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
                                    <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(createdCredentials.email)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                                        <HiOutlineClipboardCopy /> Copy
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-accent)', marginTop: '2px', fontFamily: 'monospace' }}>{createdCredentials.email}</div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</span>
                                    <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(createdCredentials.password)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                                        <HiOutlineClipboardCopy /> Copy
                                    </button>
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-warning)', marginTop: '2px', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{createdCredentials.password}</div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={copyAllCredentials}>
                                <HiOutlineClipboardCopy /> Copy All Credentials
                            </button>
                            <button className="btn btn-primary" onClick={() => setShowCredentials(false)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Reset Password Modal */}
            {showResetModal && (
                <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>✅ Password Reset Successfully</h2>
                            <button className="modal-close" onClick={() => setShowResetModal(false)}><HiOutlineX /></button>
                        </div>

                        <div style={{
                            background: 'var(--color-warning-light)',
                            border: '1px solid rgba(245,158,11,0.2)',
                            borderRadius: 'var(--radius-md)',
                            padding: '14px 16px',
                            marginBottom: '20px',
                            fontSize: '0.82rem',
                            color: 'var(--color-warning)'
                        }}>
                            ⚠️ The new password for <strong>{resetData.name}</strong> has been generated. Provide it to the user now.
                        </div>

                        <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '20px' }}>
                            <div style={{ marginBottom: '14px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</span>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>{resetData.name}</div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</span>
                                    <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(resetData.password)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                                        <HiOutlineClipboardCopy /> Copy
                                    </button>
                                </div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-warning)', marginTop: '2px', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{resetData.password}</div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={() => setShowResetModal(false)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Teleport Modal */}
            {teleportTarget && (
                <div className="modal-overlay" onClick={() => setTeleportTarget(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>⚡ Teleport Staff Member</h2>
                            <button className="modal-close" onClick={() => setTeleportTarget(null)}><HiOutlineX /></button>
                        </div>

                        <div style={{
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            padding: '14px 16px',
                            marginBottom: '20px'
                        }}>
                            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                Moving <strong style={{ color: 'var(--color-text-primary)' }}>{teleportTarget.name}</strong> from{' '}
                                <strong style={{ color: 'var(--color-accent)' }}>{teleportTarget.team?.name || 'No Team'}</strong>{' '}
                                to a new team.
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Destination Team</label>
                            <select
                                className="form-input"
                                value={teleportTeamId}
                                onChange={e => setTeleportTeamId(e.target.value)}
                            >
                                <option value="">— Remove from all teams —</option>
                                {teams.map(t => (
                                    <option key={t._id} value={t._id}>{t.name} ({t.department})</option>
                                ))}
                            </select>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setTeleportTarget(null)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleTeleport}
                                style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
                            >
                                <HiOutlineSwitchHorizontal /> Teleport
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default UserManagement;
