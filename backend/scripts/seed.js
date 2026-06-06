// backend/scripts/seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
const Student = require('../models/Student');
const Admin = require('../models/Admin');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const connectDB = require('../config/db');

// Sample students (39 students for 39 candidates)
const students = [
    // Chairperson candidates
    { firstName: 'Sarah', lastName: 'Wanjiku', regNumber: 'BIT/0025/23', email: 'sarah.wanjiku@kibu.ac.ke', phone: '+254712345601', faculty: 'School of Computing & Informatics', course: 'Information Technology', yearOfStudy: 3, password: 'Student@123' },
    { firstName: 'James', lastName: 'Kiprotich', regNumber: 'BIT/0034/22', email: 'james.kiprotich@kibu.ac.ke', phone: '+254712345602', faculty: 'School of Computing & Informatics', course: 'Computer Science', yearOfStudy: 4, password: 'Student@123' },
    { firstName: 'Grace', lastName: 'Akinyi', regNumber: 'BBA/0012/23', email: 'grace.akinyi@kibu.ac.ke', phone: '+254712345603', faculty: 'School of Business & Economics', course: 'Business Administration', yearOfStudy: 3, password: 'Student@123' },
    
    // Vice Chairperson candidates
    { firstName: 'Peter', lastName: 'Omondi', regNumber: 'LLB/0045/22', email: 'peter.omondi@kibu.ac.ke', phone: '+254712345604', faculty: 'School of Law', course: 'Law', yearOfStudy: 4, password: 'Student@123' },
    { firstName: 'Mary', lastName: 'Wangari', regNumber: 'EDU/0023/23', email: 'mary.wangari@kibu.ac.ke', phone: '+254712345605', faculty: 'School of Education', course: 'Education', yearOfStudy: 3, password: 'Student@123' },
    { firstName: 'John', lastName: 'Kiprotich', regNumber: 'BIT/0101/24', email: 'john.kiprotich@kibu.ac.ke', phone: '+254712345606', faculty: 'School of Computing & Informatics', course: 'Information Technology', yearOfStudy: 2, password: 'Student@123' },
    
    // Secretary General candidates
    { firstName: 'David', lastName: 'Mwangi', regNumber: 'BIT/0012/22', email: 'david.mwangi@kibu.ac.ke', phone: '+254712345607', faculty: 'School of Computing & Informatics', course: 'Information Technology', yearOfStudy: 4, password: 'Student@123' },
    { firstName: 'Lucy', lastName: 'Achieng', regNumber: 'JOU/0005/23', email: 'lucy.achieng@kibu.ac.ke', phone: '+254712345608', faculty: 'School of Education', course: 'Journalism', yearOfStudy: 3, password: 'Student@123' },
    { firstName: 'Michael', lastName: 'Odhiambo', regNumber: 'BBA/0033/22', email: 'michael.odhiambo@kibu.ac.ke', phone: '+254712345609', faculty: 'School of Business & Economics', course: 'Accounting', yearOfStudy: 4, password: 'Student@123' },
    
    // Treasurer candidates
    { firstName: 'Cynthia', lastName: 'Wanjiru', regNumber: 'BBA/0044/23', email: 'cynthia.wanjiru@kibu.ac.ke', phone: '+254712345610', faculty: 'School of Business & Economics', course: 'Economics', yearOfStudy: 3, password: 'Student@123' },
    { firstName: 'Brian', lastName: 'Kipkoech', regNumber: 'EDU/0055/22', email: 'brian.kipkoech@kibu.ac.ke', phone: '+254712345611', faculty: 'School of Education', course: 'Education', yearOfStudy: 4, password: 'Student@123' },
    { firstName: 'Faith', lastName: 'Chemutai', regNumber: 'SCI/0066/23', email: 'faith.chemutai@kibu.ac.ke', phone: '+254712345612', faculty: 'School of Health Sciences', course: 'Science', yearOfStudy: 3, password: 'Student@123' },
    
    // Academic Secretary candidates
    { firstName: 'Samuel', lastName: 'Kiprono', regNumber: 'ENG/0077/22', email: 'samuel.kiprono@kibu.ac.ke', phone: '+254712345613', faculty: 'School of Engineering', course: 'Engineering', yearOfStudy: 4, password: 'Student@123' },
    { firstName: 'Esther', lastName: 'Njeri', regNumber: 'BBA/0088/23', email: 'esther.njeri@kibu.ac.ke', phone: '+254712345614', faculty: 'School of Business & Economics', course: 'Business Administration', yearOfStudy: 3, password: 'Student@123' },
    { firstName: 'Kevin', lastName: 'Otieno', regNumber: 'LLB/0099/22', email: 'kevin.otieno@kibu.ac.ke', phone: '+254712345615', faculty: 'School of Law', course: 'Law', yearOfStudy: 4, password: 'Student@123' },
    
    // Accommodation & Security Secretary candidates
    { firstName: 'Janet', lastName: 'Akinyi', regNumber: 'EDU/0100/23', email: 'janet.akinyi@kibu.ac.ke', phone: '+254712345616', faculty: 'School of Education', course: 'Education', yearOfStudy: 3, password: 'Student@123' },
    { firstName: 'Robert', lastName: 'Kimani', regNumber: 'ART/0111/22', email: 'robert.kimani@kibu.ac.ke', phone: '+254712345617', faculty: 'School of Education', course: 'Arts', yearOfStudy: 4, password: 'Student@123' },
    { firstName: 'Catherine', lastName: 'Muthoni', regNumber: 'ART/0122/23', email: 'catherine.muthoni@kibu.ac.ke', phone: '+254712345618', faculty: 'School of Education', course: 'Arts', yearOfStudy: 3, password: 'Student@123' },
    
    // Special Interests Secretary candidates
    { firstName: 'Diana', lastName: 'Achieng', regNumber: 'ART/0133/22', email: 'diana.achieng@kibu.ac.ke', phone: '+254712345619', faculty: 'School of Education', course: 'Arts', yearOfStudy: 4, password: 'Student@123' },
    { firstName: 'Priscah', lastName: 'Jelagat', regNumber: 'ART/0144/23', email: 'priscah.jelagat@kibu.ac.ke', phone: '+254712345620', faculty: 'School of Education', course: 'Arts', yearOfStudy: 3, password: 'Student@123' },
    { firstName: 'Joseph', lastName: 'Njoroge', regNumber: 'ART/0155/22', email: 'joseph.njoroge@kibu.ac.ke', phone: '+254712345621', faculty: 'School of Education', course: 'Arts', yearOfStudy: 4, password: 'Student@123' },
    
    // FASS Academic Nominee candidates
    { firstName: 'Simon', lastName: 'Kipchoge', regNumber: 'ART/0166/23', email: 'simon.kipchoge@kibu.ac.ke', phone: '+254712345622', faculty: 'School of Education', course: 'Arts', yearOfStudy: 3, password: 'Student@123' },
    { firstName: 'Thomas', lastName: 'Mboya', regNumber: 'BBA/0177/21', email: 'thomas.mboya@kibu.ac.ke', phone: '+254712345623', faculty: 'School of Business & Economics', course: 'Business Administration', yearOfStudy: 5, password: 'Student@123' },
    { firstName: 'Rose', lastName: 'Auma', regNumber: 'BIT/0188/21', email: 'rose.auma@kibu.ac.ke', phone: '+254712345624', faculty: 'School of Computing & Informatics', course: 'Information Technology', yearOfStudy: 5, password: 'Student@123' },
    
    // FASS Female Nominee candidates
    { firstName: 'Daniel', lastName: 'Mwaura', regNumber: 'EDU/0199/21', email: 'daniel.mwaura@kibu.ac.ke', phone: '+254712345625', faculty: 'School of Education', course: 'Education', yearOfStudy: 5, password: 'Student@123' },
    { firstName: 'Monicah', lastName: 'Wanjiku', regNumber: 'LLB/0200/21', email: 'monicah.wanjiku@kibu.ac.ke', phone: '+254712345626', faculty: 'School of Law', course: 'Law', yearOfStudy: 5, password: 'Student@123' },
    { firstName: 'Jane', lastName: 'Atieno', regNumber: 'BBA/0211/22', email: 'jane.atieno@kibu.ac.ke', phone: '+254712345627', faculty: 'School of Business & Economics', course: 'Business Administration', yearOfStudy: 4, password: 'Student@123' },
    
    // FASS Male Nominee candidates
    { firstName: 'Paul', lastName: 'Mwangi', regNumber: 'BIT/0222/23', email: 'paul.mwangi@kibu.ac.ke', phone: '+254712345628', faculty: 'School of Computing & Informatics', course: 'Information Technology', yearOfStudy: 3, password: 'Student@123' },
    { firstName: 'John', lastName: 'Njue', regNumber: 'EDU/0233/24', email: 'john.njue@kibu.ac.ke', phone: '+254712345629', faculty: 'School of Education', course: 'Education', yearOfStudy: 2, password: 'Student@123' },
    { firstName: 'Alex', lastName: 'Otieno', regNumber: 'LLB/0244/25', email: 'alex.otieno@kibu.ac.ke', phone: '+254712345630', faculty: 'School of Law', course: 'Law', yearOfStudy: 1, password: 'Student@123' },
    
    // Evening & Weekend Nominee candidates
    { firstName: 'Beatrice', lastName: 'Akinyi', regNumber: 'BBA/0255/21', email: 'beatrice.akinyi@kibu.ac.ke', phone: '+254712345631', faculty: 'School of Business & Economics', course: 'Business Administration', yearOfStudy: 5, password: 'Student@123' },
    { firstName: 'Charles', lastName: 'Omondi', regNumber: 'BIT/0266/21', email: 'charles.omondi@kibu.ac.ke', phone: '+254712345632', faculty: 'School of Computing & Informatics', course: 'Information Technology', yearOfStudy: 5, password: 'Student@123' },
    { firstName: 'Dorcas', lastName: 'Wambui', regNumber: 'EDU/0277/22', email: 'dorcas.wambui@kibu.ac.ke', phone: '+254712345633', faculty: 'School of Education', course: 'Education', yearOfStudy: 4, password: 'Student@123' },
    
    // Part-Time candidates
    { firstName: 'Elijah', lastName: 'Kipchoge', regNumber: 'ENG/0288/23', email: 'elijah.kipchoge@kibu.ac.ke', phone: '+254712345634', faculty: 'School of Engineering', course: 'Engineering', yearOfStudy: 3, password: 'Student@123' },
    { firstName: 'Florence', lastName: 'Muthoni', regNumber: 'SCI/0299/23', email: 'florence.muthoni@kibu.ac.ke', phone: '+254712345635', faculty: 'School of Health Sciences', course: 'Science', yearOfStudy: 3, password: 'Student@123' },
    { firstName: 'George', lastName: 'Otieno', regNumber: 'LLB/0300/24', email: 'george.otieno@kibu.ac.ke', phone: '+254712345636', faculty: 'School of Law', course: 'Law', yearOfStudy: 2, password: 'Student@123' },
    
    // Postgraduate candidates
    { firstName: 'Sarah', lastName: 'Odhiambo', regNumber: 'PHD/0211/20', email: 'sarah.odhiambo@kibu.ac.ke', phone: '+254712345637', faculty: 'School of Computing & Informatics', course: 'PhD Computer Science', yearOfStudy: 3, password: 'Student@123' },
    { firstName: 'James', lastName: 'Kariuki', regNumber: 'MSC/0222/21', email: 'james.kariuki@kibu.ac.ke', phone: '+254712345638', faculty: 'School of Business & Economics', course: 'MSc Economics', yearOfStudy: 2, password: 'Student@123' },
    { firstName: 'Alice', lastName: 'Njeri', regNumber: 'PHD/0233/19', email: 'alice.njeri@kibu.ac.ke', phone: '+254712345639', faculty: 'School of Education', course: 'PhD Education', yearOfStudy: 4, password: 'Student@123' }
];

const electionPositions = [
    { positionId: 0, title: 'Chairperson', description: 'Leads the student council' },
    { positionId: 1, title: 'Vice Chairperson', description: 'Assists the chairperson' },
    { positionId: 2, title: 'Secretary General', description: 'Manages records' },
    { positionId: 3, title: 'Treasurer', description: 'Handles finances' },
    { positionId: 4, title: 'Academic Secretary', description: 'Academic affairs' },
    { positionId: 5, title: 'Accommodation & Security Secretary', description: 'Housing and safety' },
    { positionId: 6, title: 'Special Interests Secretary', description: 'Special interest groups' },
    { positionId: 7, title: 'FASS – Academic Nominee', description: 'FASS representative' },
    { positionId: 8, title: 'FASS – Female Nominee', description: 'Women representative' },
    { positionId: 9, title: 'FASS – Male Nominee', description: 'Men representative' },
    { positionId: 10, title: 'Evening & Weekend Nominee', description: 'Evening students' },
    { positionId: 11, title: 'Part-Time', description: 'Part-time students' },
    { positionId: 12, title: 'Postgraduate', description: 'Postgraduate students' }
];

// 39 candidates (3 per position)
const candidates = [
    // Position 0: Chairperson (3 candidates)
    { name: 'Sarah Wanjiku', regNumber: 'BIT/0025/23', course: 'Information Technology', yearOfStudy: 3, faculty: 'School of Computing & Informatics', manifesto: 'Improving campus facilities and student welfare programs.', positionId: 0, positionTitle: 'Chairperson', candidateId: 0 },
    { name: 'James Kiprotich', regNumber: 'BIT/0034/22', course: 'Computer Science', yearOfStudy: 4, faculty: 'School of Computing & Informatics', manifesto: 'Digital innovation and tech improvements.', positionId: 0, positionTitle: 'Chairperson', candidateId: 1 },
    { name: 'Grace Akinyi', regNumber: 'BBA/0012/23', course: 'Business Administration', yearOfStudy: 3, faculty: 'School of Business & Economics', manifesto: 'Sustainability and environmental initiatives.', positionId: 0, positionTitle: 'Chairperson', candidateId: 2 },
    
    // Position 1: Vice Chairperson (3 candidates)
    { name: 'Peter Omondi', regNumber: 'LLB/0045/22', course: 'Law', yearOfStudy: 4, faculty: 'School of Law', manifesto: 'Student rights advocacy and legal support.', positionId: 1, positionTitle: 'Vice Chairperson', candidateId: 0 },
    { name: 'Mary Wangari', regNumber: 'EDU/0023/23', course: 'Education', yearOfStudy: 3, faculty: 'School of Education', manifesto: 'Academic excellence and peer tutoring.', positionId: 1, positionTitle: 'Vice Chairperson', candidateId: 1 },
    { name: 'John Kiprotich', regNumber: 'BIT/0101/24', course: 'Information Technology', yearOfStudy: 2, faculty: 'School of Computing & Informatics', manifesto: 'Student welfare and engagement.', positionId: 1, positionTitle: 'Vice Chairperson', candidateId: 2 },
    
    // Position 2: Secretary General (3 candidates)
    { name: 'David Mwangi', regNumber: 'BIT/0012/22', course: 'Information Technology', yearOfStudy: 4, faculty: 'School of Computing & Informatics', manifesto: 'Transparent communication and digital records.', positionId: 2, positionTitle: 'Secretary General', candidateId: 0 },
    { name: 'Lucy Achieng', regNumber: 'JOU/0005/23', course: 'Journalism', yearOfStudy: 3, faculty: 'School of Education', manifesto: 'Amplifying student voices through media.', positionId: 2, positionTitle: 'Secretary General', candidateId: 1 },
    { name: 'Michael Odhiambo', regNumber: 'BBA/0033/22', course: 'Accounting', yearOfStudy: 4, faculty: 'School of Business & Economics', manifesto: 'Efficient record keeping and documentation.', positionId: 2, positionTitle: 'Secretary General', candidateId: 2 },
    
    // Position 3: Treasurer (3 candidates)
    { name: 'Cynthia Wanjiru', regNumber: 'BBA/0044/23', course: 'Economics', yearOfStudy: 3, faculty: 'School of Business & Economics', manifesto: 'Financial transparency and budget management.', positionId: 3, positionTitle: 'Treasurer', candidateId: 0 },
    { name: 'Brian Kipkoech', regNumber: 'EDU/0055/22', course: 'Education', yearOfStudy: 4, faculty: 'School of Education', manifesto: 'Responsible fund allocation.', positionId: 3, positionTitle: 'Treasurer', candidateId: 1 },
    { name: 'Faith Chemutai', regNumber: 'SCI/0066/23', course: 'Science', yearOfStudy: 3, faculty: 'School of Health Sciences', manifesto: 'Maximizing student funds for impact.', positionId: 3, positionTitle: 'Treasurer', candidateId: 2 },
    
    // Position 4: Academic Secretary (3 candidates)
    { name: 'Samuel Kiprono', regNumber: 'ENG/0077/22', course: 'Engineering', yearOfStudy: 4, faculty: 'School of Engineering', manifesto: 'Improving academic resources and study spaces.', positionId: 4, positionTitle: 'Academic Secretary', candidateId: 0 },
    { name: 'Esther Njeri', regNumber: 'BBA/0088/23', course: 'Business Administration', yearOfStudy: 3, faculty: 'School of Business & Economics', manifesto: 'Academic support programs.', positionId: 4, positionTitle: 'Academic Secretary', candidateId: 1 },
    { name: 'Kevin Otieno', regNumber: 'LLB/0099/22', course: 'Law', yearOfStudy: 4, faculty: 'School of Law', manifesto: 'Exam reforms and academic advocacy.', positionId: 4, positionTitle: 'Academic Secretary', candidateId: 2 },
    
    // Position 5: Accommodation & Security Secretary (3 candidates)
    { name: 'Janet Akinyi', regNumber: 'EDU/0100/23', course: 'Education', yearOfStudy: 3, faculty: 'School of Education', manifesto: 'Safe and secure accommodation.', positionId: 5, positionTitle: 'Accommodation & Security Secretary', candidateId: 0 },
    { name: 'Robert Kimani', regNumber: 'ART/0111/22', course: 'Arts', yearOfStudy: 4, faculty: 'School of Education', manifesto: 'Campus security improvements.', positionId: 5, positionTitle: 'Accommodation & Security Secretary', candidateId: 1 },
    { name: 'Catherine Muthoni', regNumber: 'ART/0122/23', course: 'Arts', yearOfStudy: 3, faculty: 'School of Education', manifesto: 'Hostel facilities upgrade.', positionId: 5, positionTitle: 'Accommodation & Security Secretary', candidateId: 2 },
    
    // Position 6: Special Interests Secretary (3 candidates)
    { name: 'Diana Achieng', regNumber: 'ART/0133/22', course: 'Arts', yearOfStudy: 4, faculty: 'School of Education', manifesto: 'Representing special interest groups.', positionId: 6, positionTitle: 'Special Interests Secretary', candidateId: 0 },
    { name: 'Priscah Jelagat', regNumber: 'ART/0144/23', course: 'Arts', yearOfStudy: 3, faculty: 'School of Education', manifesto: 'Minority representation.', positionId: 6, positionTitle: 'Special Interests Secretary', candidateId: 1 },
    { name: 'Joseph Njoroge', regNumber: 'ART/0155/22', course: 'Arts', yearOfStudy: 4, faculty: 'School of Education', manifesto: 'Disability inclusion.', positionId: 6, positionTitle: 'Special Interests Secretary', candidateId: 2 },
    
    // Position 7: FASS Academic Nominee (3 candidates)
    { name: 'Simon Kipchoge', regNumber: 'ART/0166/23', course: 'Arts', yearOfStudy: 3, faculty: 'School of Education', manifesto: 'Arts advocacy and representation.', positionId: 7, positionTitle: 'FASS – Academic Nominee', candidateId: 0 },
    { name: 'Thomas Mboya', regNumber: 'BBA/0177/21', course: 'Business Administration', yearOfStudy: 5, faculty: 'School of Business & Economics', manifesto: 'FASS academic excellence.', positionId: 7, positionTitle: 'FASS – Academic Nominee', candidateId: 1 },
    { name: 'Rose Auma', regNumber: 'BIT/0188/21', course: 'Information Technology', yearOfStudy: 5, faculty: 'School of Computing & Informatics', manifesto: 'FASS student representation.', positionId: 7, positionTitle: 'FASS – Academic Nominee', candidateId: 2 },
    
    // Position 8: FASS Female Nominee (3 candidates)
    { name: 'Daniel Mwaura', regNumber: 'EDU/0199/21', course: 'Education', yearOfStudy: 5, faculty: 'School of Education', manifesto: 'Women empowerment in FASS.', positionId: 8, positionTitle: 'FASS – Female Nominee', candidateId: 0 },
    { name: 'Monicah Wanjiku', regNumber: 'LLB/0200/21', course: 'Law', yearOfStudy: 5, faculty: 'School of Law', manifesto: 'Female leadership in FASS.', positionId: 8, positionTitle: 'FASS – Female Nominee', candidateId: 1 },
    { name: 'Jane Atieno', regNumber: 'BBA/0211/22', course: 'Business Administration', yearOfStudy: 4, faculty: 'School of Business & Economics', manifesto: 'Gender equality in FASS.', positionId: 8, positionTitle: 'FASS – Female Nominee', candidateId: 2 },
    
    // Position 9: FASS Male Nominee (3 candidates)
    { name: 'Paul Mwangi', regNumber: 'BIT/0222/23', course: 'Information Technology', yearOfStudy: 3, faculty: 'School of Computing & Informatics', manifesto: 'Male mentorship in FASS.', positionId: 9, positionTitle: 'FASS – Male Nominee', candidateId: 0 },
    { name: 'John Njue', regNumber: 'EDU/0233/24', course: 'Education', yearOfStudy: 2, faculty: 'School of Education', manifesto: 'Male student voice in FASS.', positionId: 9, positionTitle: 'FASS – Male Nominee', candidateId: 1 },
    { name: 'Alex Otieno', regNumber: 'LLB/0244/25', course: 'Law', yearOfStudy: 1, faculty: 'School of Law', manifesto: 'Men\'s issues in FASS.', positionId: 9, positionTitle: 'FASS – Male Nominee', candidateId: 2 },
    
    // Position 10: Evening & Weekend Nominee (3 candidates)
    { name: 'Beatrice Akinyi', regNumber: 'BBA/0255/21', course: 'Business Administration', yearOfStudy: 5, faculty: 'School of Business & Economics', manifesto: 'Evening students representation.', positionId: 10, positionTitle: 'Evening & Weekend Nominee', candidateId: 0 },
    { name: 'Charles Omondi', regNumber: 'BIT/0266/21', course: 'Information Technology', yearOfStudy: 5, faculty: 'School of Computing & Informatics', manifesto: 'Weekend classes advocacy.', positionId: 10, positionTitle: 'Evening & Weekend Nominee', candidateId: 1 },
    { name: 'Dorcas Wambui', regNumber: 'EDU/0277/22', course: 'Education', yearOfStudy: 4, faculty: 'School of Education', manifesto: 'Part-time student support.', positionId: 10, positionTitle: 'Evening & Weekend Nominee', candidateId: 2 },
    
    // Position 11: Part-Time (3 candidates)
    { name: 'Elijah Kipchoge', regNumber: 'ENG/0288/23', course: 'Engineering', yearOfStudy: 3, faculty: 'School of Engineering', manifesto: 'Part-time flexibility.', positionId: 11, positionTitle: 'Part-Time', candidateId: 0 },
    { name: 'Florence Muthoni', regNumber: 'SCI/0299/23', course: 'Science', yearOfStudy: 3, faculty: 'School of Health Sciences', manifesto: 'Part-time resources.', positionId: 11, positionTitle: 'Part-Time', candidateId: 1 },
    { name: 'George Otieno', regNumber: 'LLB/0300/24', course: 'Law', yearOfStudy: 2, faculty: 'School of Law', manifesto: 'Part-time student rights.', positionId: 11, positionTitle: 'Part-Time', candidateId: 2 },
    
    // Position 12: Postgraduate (3 candidates)
    { name: 'Sarah Odhiambo', regNumber: 'PHD/0211/20', course: 'PhD Computer Science', yearOfStudy: 3, faculty: 'School of Computing & Informatics', manifesto: 'Research support and funding.', positionId: 12, positionTitle: 'Postgraduate', candidateId: 0 },
    { name: 'James Kariuki', regNumber: 'MSC/0222/21', course: 'MSc Economics', yearOfStudy: 2, faculty: 'School of Business & Economics', manifesto: 'Postgraduate welfare.', positionId: 12, positionTitle: 'Postgraduate', candidateId: 1 },
    { name: 'Alice Njeri', regNumber: 'PHD/0233/19', course: 'PhD Education', yearOfStudy: 4, faculty: 'School of Education', manifesto: 'Postgraduate research resources.', positionId: 12, positionTitle: 'Postgraduate', candidateId: 2 }
];

async function seedData() {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await Student.deleteMany({});
        await Admin.deleteMany({});
        await Election.deleteMany({});
        await Candidate.deleteMany({});
        console.log('🗑️  Cleared existing data');

        // Create Admin
        const adminPassword = await bcrypt.hash('Admin@123', 10);
        const admin = await Admin.create({
            name: 'Super Admin',
            email: 'admin@kibu.ac.ke',
            password: adminPassword,
            role: 'super_admin',
            permissions: {
                canCreateElections: true,
                canAddCandidates: true,
                canStartVoting: true,
                canEndVoting: true,
                canPublishResults: true,
                canManageAdmins: true,
                canViewAnalytics: true
            }
        });
        console.log('✅ Created admin account');

        // Create Students (39 students)
        for (const student of students) {
            await Student.create(student);
        }
        console.log(`✅ Created ${students.length} students`);

        // Create Election
        const now = new Date();
        const election = await Election.create({
            title: 'Student Council Elections 2026',
            description: 'Vote for your student leaders',
            academicYear: '2025/2026',
            startDate: now,
            endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            status: 'active',
            positions: electionPositions,
            createdBy: admin._id
        });
        console.log('✅ Created election');

        // Create Candidates (39 candidates)
        for (const candidate of candidates) {
            await Candidate.create({
                ...candidate,
                electionId: election._id,
                voteCount: 0,
                isActive: true,
                isApproved: true,
                approvedBy: admin._id,
                approvedAt: new Date()
            });
        }
        console.log(`✅ Created ${candidates.length} candidates (3 per position)`);

        console.log('\n🎉 Seeding completed successfully!');
        console.log('=================================');
        console.log('Admin Login:');
        console.log('  Email: admin@kibu.ac.ke');
        console.log('  Password: Admin@123');
        console.log('\nStudent Login (use any reg number):');
        console.log('  Example: BIT/0025/23');
        console.log('  Password: Student@123');
        console.log('=================================');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

seedData();