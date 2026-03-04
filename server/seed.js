const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Team = require('./models/Team');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@workshield.com' });
        if (existingAdmin) {
            console.log('Admin user already exists. Skipping seed.');
            process.exit(0);
        }

        // Create Admin
        const admin = await User.create({
            name: 'HR Administrator',
            email: 'admin@workshield.com',
            password: 'admin123',
            role: 'admin',
            department: 'Human Resources'
        });
        console.log('✅ Admin created: admin@workshield.com / admin123');

        // Create Team Leader
        const leader = await User.create({
            name: 'Sarah Johnson',
            email: 'sarah@workshield.com',
            password: 'leader123',
            role: 'team_leader',
            department: 'Engineering'
        });
        console.log('✅ Team Leader created: sarah@workshield.com / leader123');

        // Create Employee
        const employee = await User.create({
            name: 'James Wilson',
            email: 'james@workshield.com',
            password: 'employee123',
            role: 'employee',
            department: 'Engineering'
        });
        console.log('✅ Employee created: james@workshield.com / employee123');

        // Create Team
        const team = await Team.create({
            name: 'Engineering Alpha',
            department: 'Engineering',
            leader: leader._id,
            members: [leader._id, employee._id],
            description: 'Frontend and backend engineering team'
        });

        // Update users with team
        await User.findByIdAndUpdate(leader._id, { team: team._id });
        await User.findByIdAndUpdate(employee._id, { team: team._id });

        console.log('✅ Team created: Engineering Alpha');
        console.log('\n🎉 Seed data created successfully!\n');
        console.log('Login credentials:');
        console.log('  Admin:       admin@workshield.com / admin123');
        console.log('  Team Leader: sarah@workshield.com / leader123');
        console.log('  Employee:    james@workshield.com / employee123');

        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error.message);
        process.exit(1);
    }
};

seedData();
