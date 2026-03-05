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
        let { name, email, password, role, department, team } = req.body;

        // Apply Team Leader restrictions
        if (req.user.role === 'team_leader') {
            role = 'staff'; // Enforce staff role
            team = req.user.team; // Enforce TL's team
            department = req.user.department; // Match TL's department

            if (!team) {
                return res.status(400).json({ success: false, message: 'You must be assigned to a team to create staff members' });
            }
        }

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

// @route   PUT /api/admin/users/bulk-assign
// @desc    Assign multiple users to a team (teleporting them if already on another team)
exports.bulkAssignUsers = async (req, res) => {
    try {
        const { userIds, teamId } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide an array of user IDs' });
        }

        let targetTeamId = teamId === '' ? null : teamId;

        if (targetTeamId) {
            const teamExists = await Team.findById(targetTeamId);
            if (!teamExists) {
                return res.status(404).json({ success: false, message: 'Team not found' });
            }
        }

        // Process each user individually to handle pulling from their old team
        const users = await User.find({ _id: { $in: userIds } });

        for (const user of users) {
            // If they are already in a team and it's different from the target team
            if (user.team && (!targetTeamId || user.team.toString() !== targetTeamId.toString())) {
                // Pull them out of the old team
                await Team.findByIdAndUpdate(user.team, { $pull: { members: user._id } });
            }
        }

        // Update all users' team reference
        await User.updateMany(
            { _id: { $in: userIds } },
            { $set: { team: targetTeamId } }
        );

        // If assigning to a real team, add them to the team's members array
        if (targetTeamId) {
            await Team.findByIdAndUpdate(targetTeamId, { $addToSet: { members: { $each: userIds } } });
        }

        res.json({ success: true, message: `Successfully updated team assignment for ${userIds.length} users` });
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
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const requesterRole = req.user.role;
        const targetRole = targetUser.role;

        // Role-based deletion logic
        let allowed = false;

        if (requesterRole === 'ceo') {
            allowed = true; // CEO can delete anyone
        } else if (requesterRole === 'hr') {
            // HR can delete Team Leaders and Staff
            if (targetRole === 'team_leader' || targetRole === 'staff') {
                allowed = true;
            }
        } else if (requesterRole === 'team_leader') {
            // Team Leader can only delete Staff
            if (targetRole === 'staff') {
                allowed = true;
            }
        }

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: `As ${requesterRole.toUpperCase()}, you are not authorized to delete a ${targetRole.toUpperCase()}.`
            });
        }

        await User.findByIdAndDelete(req.params.id);

        // Remove from team
        if (targetUser.team) {
            await Team.findByIdAndUpdate(targetUser.team, { $pull: { members: targetUser._id } });
        }

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   PUT /api/admin/users/:id/reset-password
exports.resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        const user = await User.findById(req.params.id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // CEO can reset anyone; HR can reset non-CEO
        if (req.user.role === 'hr' && user.role === 'ceo') {
            return res.status(403).json({ success: false, message: 'HR cannot reset CEO password' });
        }

        // Set new password — pre-save hook in User model will hash it once correctly
        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: `Password reset successfully for ${user.name}` });
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
