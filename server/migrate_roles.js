const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const migrateRoles = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB - Starting Migration');

        // Migrate 'employee' to 'staff'
        const staffRes = await User.updateMany(
            { role: 'employee' },
            { $set: { role: 'staff' } }
        );
        console.log(`Migrated ${staffRes.modifiedCount} employees to staff.`);

        // Migrate 'admin' to 'hr' automatically, except for a specific CEO email if provided
        const adminRes = await User.updateMany(
            { role: 'admin' },
            { $set: { role: 'hr' } }
        );
        console.log(`Migrated ${adminRes.modifiedCount} admins to HR.`);

        // The user kit28.24bad188@gmail.com will be our CEO test account
        const ceoRes = await User.updateOne(
            { email: 'kit28.24bad188@gmail.com' },
            { $set: { role: 'ceo' } }
        );
        if (ceoRes.modifiedCount > 0) {
            console.log('Successfully set kit28.24bad188@gmail.com as CEO.');
        }

        console.log('Migration Complete');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateRoles();
