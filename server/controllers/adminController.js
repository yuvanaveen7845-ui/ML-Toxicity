const User = require('../models/User');
const Team = require('../models/Team');

// ==================== USER MANAGEMENT ====================

// @route   GET /api/admin/users
exports.getUsers = async (req, res) => {
    try {
        const { role, department, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (req.user.role === 'team_leader') {
            filter.role = 'staff'; // TLs can only see/manage staff
        } else if (role) {
            filter.role = role;
        }
        if (department) filter.department = department;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const users = await User.find(filter)
            .populate('team', 'name department')
            .sort('-createdAt')
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments(filter);

        res.json({
            success: true,
            data: users,
            pagination: { current: parseInt(page), pages: Math.ceil(total / parseInt(limit)), total }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   POST /api/admin/users
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, department, team } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const user = new User({
            name, email, password, role, department,
            team: team === '' ? null : team
        });
        await user.save();

        // If assigned to a team, add to team members
        if (team) {
            await Team.findByIdAndUpdate(team, { $addToSet: { members: user._id } });
        }

        res.status(201).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   PUT /api/admin/users/:id
exports.updateUser = async (req, res) => {
    try {
        const { name, role, department, team, isActive, password } = req.body;
        const requesterRole = req.user.role;
        const requesterTeam = req.user.team;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const oldTeam = user.team;

        // Security Check: Team Leaders can ONLY reassign staff to their own team
        if (requesterRole === 'team_leader') {
            if (user.role !== 'staff') {
                return res.status(403).json({ success: false, message: 'Team Leaders can only manage Staff members.' });
            }

            // TL can only add to THEIR team
            if (team && team.toString() !== requesterTeam.toString()) {
                return res.status(403).json({ success: false, message: 'You can only add users to your own team.' });
            }

            // Prevent TL from changing roles
            if (role && role !== 'staff') {
                return res.status(403).json({ success: false, message: 'Authorization denied for role modification.' });
            }
        }

        if (name) user.name = name;
        if (role && (requesterRole === 'hr' || requesterRole === 'ceo')) user.role = role;
        if (department !== undefined) user.department = department;
        if (team !== undefined) user.team = team === '' ? null : team;
        if (isActive !== undefined) user.isActive = isActive;
        if (password) user.password = password;

        await user.save();

        // Sync Team member lists if team changed
        if (team !== undefined && oldTeam?.toString() !== user.team?.toString()) {
            if (oldTeam) {
                await Team.findByIdAndUpdate(oldTeam, { $pull: { members: user._id } });
            }
            if (user.team) {
                await Team.findByIdAndUpdate(user.team, { $addToSet: { members: user._id } });
            }
        }

        await user.populate('team', 'name department');
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Remove from team
        if (user.team) {
            await Team.findByIdAndUpdate(user.team, { $pull: { members: user._id } });
        }

        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== TEAM MANAGEMENT ====================

// @route   GET /api/admin/teams
exports.getTeams = async (req, res) => {
    try {
        const teams = await Team.find()
            .populate('leader', 'name email')
            .populate('members', 'name email role')
            .sort('name');

        res.json({ success: true, data: teams });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   POST /api/admin/teams
exports.createTeam = async (req, res) => {
    try {
        const { name, department, leader, description } = req.body;

        const existingTeam = await Team.findOne({ name });
        if (existingTeam) {
            return res.status(400).json({ success: false, message: 'Team name already exists' });
        }

        const team = await Team.create({
            name, department, description,
            leader: leader === '' ? null : leader
        });

        // Update leader's team & role
        if (leader) {
            await User.findByIdAndUpdate(leader, { team: team._id, role: 'team_leader' });
            team.members.push(leader);
            await team.save();
        }

        res.status(201).json({ success: true, data: team });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   PUT /api/admin/teams/:id
exports.updateTeam = async (req, res) => {
    try {
        const { name, department, leader, description, isActive } = req.body;
        const oldTeamData = await Team.findById(req.params.id);
        if (!oldTeamData) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        const oldLeader = oldTeamData.leader;

        const update = {};
        if (name) update.name = name;
        if (department) update.department = department;
        if (leader !== undefined) update.leader = leader === '' ? null : leader;
        if (description !== undefined) update.description = description;
        if (isActive !== undefined) update.isActive = isActive;

        const team = await Team.findByIdAndUpdate(req.params.id, update, { new: true })
            .populate('leader', 'name email')
            .populate('members', 'name email role');

        // Sync User data if leader changed
        if (leader !== undefined && oldLeader?.toString() !== team.leader?._id?.toString()) {
            // Remove team reference from old leader
            if (oldLeader) {
                await User.findByIdAndUpdate(oldLeader, { team: null });
            }
            // Add team reference and role to new leader
            if (team.leader) {
                await User.findByIdAndUpdate(team.leader._id, {
                    team: team._id,
                    role: 'team_leader'
                });
                // Ensure leader is in members list
                await Team.findByIdAndUpdate(team._id, { $addToSet: { members: team.leader._id } });
            }
        }

        res.json({ success: true, data: team });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
