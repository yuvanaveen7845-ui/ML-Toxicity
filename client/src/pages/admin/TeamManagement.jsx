import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineX, HiOutlineUserGroup } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';

const TeamManagement = () => {
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [form, setForm] = useState({ name: '', department: '', leader: '', description: '' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [teamsRes, usersRes] = await Promise.all([adminAPI.getTeams(), adminAPI.getUsers()]);
            setTeams(teamsRes.data.data);
            setUsers(usersRes.data.data);
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingTeam(null);
        setForm({ name: '', department: '', leader: '', description: '' });
        setShowModal(true);
    };

    const openEdit = (team) => {
        setEditingTeam(team);
        setForm({ name: team.name, department: team.department, leader: team.leader?._id || '', description: team.description || '' });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTeam) {
                await adminAPI.updateTeam(editingTeam._id, form);
                toast.success('Team updated');
            } else {
                await adminAPI.createTeam(form);
                toast.success('Team created');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        }
    };

    if (loading) return <Layout><div className="loading-spinner"><div className="spinner" /></div></Layout>;

    return (
        <Layout>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Team Management</h1>
                    <p>Organize teams and assign leadership</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Create Team</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                {teams.map(team => (
                    <div key={team._id} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text-heading)' }}>{team.name}</h3>
                                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{team.department}</p>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(team)}><HiOutlinePencil /></button>
                        </div>

                        {team.description && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>{team.description}</p>
                        )}

                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Leader</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--color-text-primary)' }}>{team.leader?.name || 'Unassigned'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Members</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                                    <HiOutlineUserGroup style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                    {team.members?.length || 0}
                                </span>
                            </div>

                            {team.members?.length > 0 && (
                                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {team.members.map(m => (
                                        <span key={m._id} style={{ fontSize: '0.7rem', background: 'var(--color-bg-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                            {m.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {teams.length === 0 && (
                    <div className="card empty-state">
                        <HiOutlineUserGroup style={{ fontSize: '3rem', opacity: 0.3 }} />
                        <h3>No teams yet</h3>
                        <p>Create your first team to get started</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingTeam ? 'Edit Team' : 'Create Team'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><HiOutlineX /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Team Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. Frontend Team" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <input className="form-input" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} required placeholder="e.g. Engineering" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Team Leader</label>
                                <select className="form-input" value={form.leader} onChange={e => setForm(p => ({ ...p, leader: e.target.value }))}>
                                    <option value="">Select Leader</option>
                                    {users.filter(u => u.role !== 'hr' && u.role !== 'ceo').map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." style={{ minHeight: '80px' }} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingTeam ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default TeamManagement;
