const mongoose = require('mongoose');
require('dotenv').config();

async function startElection() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Election = require('./models/Election');
    const election = await Election.findOne({ status: 'draft' });
    if (!election) {
        console.log('No draft election found');
        process.exit();
    }
    election.status = 'active';
    election.startDate = new Date();
    election.endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await election.save();
    console.log('Election started:', election.title);
    process.exit();
}
startElection();