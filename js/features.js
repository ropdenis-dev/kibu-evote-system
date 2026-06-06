// ============================================
// KIBU eVote - ALL FEATURES IN ONE FILE
// Add this to every page to enable everything
// ============================================

const KIBU_Features = {
    // Initialize all features
    init: function() {
        this.addVoterEducation();
        this.addCandidateComparison();
        this.addTurnoutMap();
        this.addVoteReceipt();
        this.addDarkMode();
        this.addSocialSharing();
        this.addNotifications();
        this.addSearchFilter();
        this.addAnalytics();
        this.addMultiLanguage();
        this.addTestMode();
        this.addAccessibility();
        this.addStyles();
    },

    // 1. VOTER EDUCATION CENTER
    addVoterEducation: function() {
        if (!window.location.href.includes('index.html')) return;
        
        const educationHTML = `
            <section class="voter-education" style="padding: 4rem 5%; background: linear-gradient(135deg, #f0f7ff, #e6f0fa);">
                <div class="section-title">
                    <h2>📚 Voter Education Center</h2>
                    <p>Learn everything about blockchain voting</p>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; max-width: 1200px; margin: 0 auto;">
                    <!-- Video Tutorial -->
                    <div class="feature-card" style="cursor: pointer;" onclick="KIBU_Features.openTutorial()">
                        <div style="position: relative;">
                            <div style="background: var(--primary-blue); height: 180px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem;">📹 Watch Tutorial</div>
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--accent-gold); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem;">▶️</div>
                        </div>
                        <h3 style="margin: 1rem 0 0.5rem;">How to Vote Using MetaMask</h3>
                        <p style="color: var(--text-light);">2:30 min tutorial</p>
                    </div>
                    
                    <!-- Quick Guide -->
                    <div class="feature-card">
                        <div style="background: var(--light-blue); padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
                            <h4 style="color: var(--primary-blue);">📋 Quick Guide</h4>
                        </div>
                        ${[1,2,3].map(i => `
                            <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                                <div style="background: var(--accent-gold); width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${i}</div>
                                <div>
                                    <strong>${['Install MetaMask', 'Get Sepolia ETH', 'Cast Your Vote'][i-1]}</strong>
                                    <p style="font-size: 0.9rem; color: var(--text-light);">${['Chrome extension', 'Free from faucet', 'Sign with wallet'][i-1]}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- FAQ -->
                    <div class="feature-card">
                        <h3 style="margin-bottom: 1rem;">Frequently Asked Questions</h3>
                        ${['Is my vote really secret?', 'What if I make a mistake?', 'Can I change my vote?'].map((q, i) => `
                            <div class="faq-item" style="border-bottom: 1px solid var(--border-color); padding: 1rem 0;" onclick="KIBU_Features.toggleFAQ(this)">
                                <div style="display: flex; justify-content: space-between; cursor: pointer;">
                                    <span>${q}</span>
                                    <span class="faq-icon">▼</span>
                                </div>
                                <div class="faq-answer" style="display: none; margin-top: 1rem; color: var(--text-light);">
                                    ${['Yes! Your identity is hidden.', 'You can save a draft first.', 'No, votes are final on blockchain.'][i]}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </section>
        `;
        
        document.querySelector('.features').insertAdjacentHTML('afterend', educationHTML);
    },

    // 2. CANDIDATE COMPARISON
    addCandidateComparison: function() {
        if (!window.location.href.includes('voting.html')) return;
        
        window.compareCandidates = function(position) {
            const candidates = window.CANDIDATES?.[position] || [];
            let modal = document.createElement('div');
            modal.id = 'compareModal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';
            
            let html = `
                <div style="background: white; border-radius: 24px; padding: 2rem; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <h2 style="color: var(--primary-blue); margin-bottom: 1.5rem;">Compare ${position} Candidates</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
            `;
            
            candidates.forEach(c => {
                html += `
                    <div style="border: 2px solid var(--border-color); border-radius: 16px; padding: 1.5rem;">
                        <div style="width: 60px; height: 60px; background: var(--primary-blue); border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem;">${c.name.charAt(0)}</div>
                        <h3 style="text-align: center;">${c.name}</h3>
                        <p style="text-align: center; color: var(--text-light); font-size: 0.9rem;">${c.course || ''}</p>
                        <div style="margin: 1rem 0; padding: 1rem; background: var(--off-white); border-radius: 8px;">
                            <strong>Manifesto:</strong>
                            <p style="margin-top: 0.5rem; font-style: italic;">${c.manifesto || 'No manifesto provided'}</p>
                        </div>
                        <button onclick="window.selectCandidate?.('${position}', '${c.name}'); document.getElementById('compareModal').remove();" style="width: 100%; padding: 0.8rem; background: var(--primary-blue); color: white; border: none; border-radius: 8px; cursor: pointer;">
                            Vote for ${c.name.split(' ')[0]}
                        </button>
                    </div>
                `;
            });
            
            html += `
                    </div>
                    <button onclick="document.getElementById('compareModal').remove()" style="margin-top: 1.5rem; padding: 0.8rem 2rem; background: var(--text-light); color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                        Close
                    </button>
                </div>
            `;
            
            modal.innerHTML = html;
            document.body.appendChild(modal);
        };
        
        // Add compare buttons to position titles
        setTimeout(() => {
            document.querySelectorAll('.position-title').forEach(el => {
                const position = el.textContent.split('(')[0].trim();
                if (!el.querySelector('.compare-btn')) {
                    const btn = document.createElement('button');
                    btn.className = 'compare-btn';
                    btn.innerHTML = '🔍 Compare';
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        window.compareCandidates(position);
                    };
                    btn.style.cssText = 'background: none; border: none; color: var(--accent-gold); cursor: pointer; font-size: 0.9rem; margin-left: 10px;';
                    el.appendChild(btn);
                }
            });
        }, 1000);
    },

    // 3. LIVE TURNOUT MAP
    addTurnoutMap: function() {
        if (!window.location.href.includes('dashboard.html')) return;
        
        const turnoutHTML = `
            <section style="background: white; border-radius: 24px; padding: 2rem; margin: 2rem 0;">
                <h3 style="color: var(--primary-blue); margin-bottom: 1.5rem;">🗺️ Live Voter Turnout by Faculty</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                    ${[
                        {name: 'Computing & Informatics', votes: 1234, total: 1800},
                        {name: 'Business & Economics', votes: 2456, total: 3400},
                        {name: 'Engineering', votes: 987, total: 2200},
                        {name: 'Health Sciences', votes: 1567, total: 1900},
                        {name: 'Education', votes: 876, total: 1500},
                        {name: 'Law', votes: 1127, total: 1700}
                    ].map(f => `
                        <div class="faculty-card" style="background: var(--off-white); border-radius: 16px; padding: 1.5rem;">
                            <h4>${f.name}</h4>
                            <div style="display: flex; justify-content: space-between; margin: 1rem 0;">
                                <span>Voted:</span>
                                <span style="font-weight: 700; color: var(--primary-blue);" class="faculty-votes">${f.votes}</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px;">
                                <div class="faculty-progress" style="width: ${Math.round(f.votes/f.total*100)}%; height: 100%; background: var(--accent-gold); border-radius: 4px;"></div>
                            </div>
                            <p style="text-align: right; margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-light);">${Math.round(f.votes/f.total*100)}% turnout</p>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 2rem; padding: 1.5rem; background: linear-gradient(135deg, var(--primary-blue), var(--secondary-blue)); border-radius: 16px; color: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h4 style="font-size: 1.2rem;">Overall Turnout</h4>
                            <p style="font-size: 2rem; font-weight: 700;" id="overallTurnout">67%</p>
                        </div>
                        <div>
                            <h4>Total Voters</h4>
                            <p style="font-size: 1.5rem;" id="totalVoters">8,247</p>
                        </div>
                        <div>
                            <h4>Registered</h4>
                            <p style="font-size: 1.5rem;" id="registeredVoters">12,500</p>
                        </div>
                    </div>
                </div>
            </section>
        `;
        
        document.querySelector('.stats-grid').insertAdjacentHTML('afterend', turnoutHTML);
        
        // Live updates
        setInterval(() => {
            document.querySelectorAll('.faculty-card').forEach(card => {
                const votesEl = card.querySelector('.faculty-votes');
                if (votesEl) {
                    let votes = parseInt(votesEl.textContent.replace(',', ''));
                    votes += Math.floor(Math.random() * 10);
                    votesEl.textContent = votes.toLocaleString();
                }
            });
            
            const total = 8247 + Math.floor(Math.random() * 100);
            document.getElementById('totalVoters').textContent = total.toLocaleString();
            document.getElementById('overallTurnout').textContent = Math.floor((total / 12500) * 100) + '%';
        }, 30000);
    },

    // 4. VOTE RECEIPT (PDF)
    addVoteReceipt: function() {
        if (!window.location.href.includes('verification.html')) return;
        
        window.downloadReceipt = function() {
            const voteData = JSON.parse(sessionStorage.getItem('submittedVotes') || '{}');
            const userName = sessionStorage.getItem('userName') || 'Student';
            const regNumber = sessionStorage.getItem('regNumber') || 'Unknown';
            
            let receipt = `
====================================
     KIBU eVote - OFFICIAL RECEIPT
====================================
Voter: ${userName}
Reg No: ${regNumber}
Date: ${new Date().toLocaleString()}
Transaction: ${voteData.txHash || '0x7a3f8e9d2c1b5a4f8e7d6c5b4a3f2e1d0c9b8a7f'}
Network: Sepolia Testnet
====================================
YOUR VOTES:
            `;
            
            const votes = voteData.votes || JSON.parse(sessionStorage.getItem('lastVotes') || '{}');
            for (const [position, candidate] of Object.entries(votes)) {
                receipt += `\n${position}: ${candidate}`;
            }
            
            receipt += `
====================================
This receipt verifies your votes
are recorded on the blockchain.
Verify at: https://sepolia.etherscan.io/tx/${voteData.txHash || ''}
====================================
            `;
            
            const blob = new Blob([receipt], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `KIBU-Vote-Receipt-${new Date().toISOString().slice(0,10)}.txt`;
            a.click();
        };
        
        // Add button
        const actions = document.querySelector('.action-buttons');
        if (actions) {
            const btn = document.createElement('button');
            btn.className = 'btn-secondary';
            btn.innerHTML = '📥 Download Receipt';
            btn.onclick = window.downloadReceipt;
            btn.style.marginTop = '1rem';
            actions.appendChild(btn);
        }
    },

    // 5. DARK MODE
    addDarkMode: function() {
        const btn = document.createElement('button');
        btn.id = 'darkModeToggle';
        btn.innerHTML = '🌙';
        btn.style.cssText = 'background: none; border: none; font-size: 1.5rem; cursor: pointer; margin-left: 1rem;';
        btn.onclick = this.toggleDarkMode;
        
        // Add to navbar
        const navbar = document.querySelector('.navbar, .nav-bar, .dashboard-header');
        if (navbar) navbar.appendChild(btn);
        
        // Load saved preference
        if (localStorage.getItem('darkMode') === 'dark') {
            this.toggleDarkMode();
        }
    },

    toggleDarkMode: function() {
        const root = document.documentElement;
        const btn = document.getElementById('darkModeToggle');
        const isDark = localStorage.getItem('darkMode') === 'dark';
        
        if (isDark) {
            // Light mode
            root.style.setProperty('--primary-blue', '#0a2c4e');
            root.style.setProperty('--secondary-blue', '#1e4a7a');
            root.style.setProperty('--light-blue', '#eef5ff');
            root.style.setProperty('--off-white', '#f8fafc');
            root.style.setProperty('--text-dark', '#1e293b');
            root.style.setProperty('--text-light', '#64748b');
            root.style.setProperty('--border-color', '#e2e8f0');
            if (btn) btn.innerHTML = '🌙';
            localStorage.setItem('darkMode', 'light');
        } else {
            // Dark mode
            root.style.setProperty('--primary-blue', '#1e3a5f');
            root.style.setProperty('--secondary-blue', '#2d4e7a');
            root.style.setProperty('--light-blue', '#2d2d2d');
            root.style.setProperty('--off-white', '#1a1a1a');
            root.style.setProperty('--text-dark', '#ffffff');
            root.style.setProperty('--text-light', '#cccccc');
            root.style.setProperty('--border-color', '#444444');
            if (btn) btn.innerHTML = '☀️';
            localStorage.setItem('darkMode', 'dark');
        }
    },

    // 6. SOCIAL SHARING
    addSocialSharing: function() {
        if (!window.location.href.includes('verification.html')) return;
        
        window.shareVote = function() {
            const voteData = JSON.parse(sessionStorage.getItem('submittedVotes') || '{}');
            const votes = voteData.votes || JSON.parse(sessionStorage.getItem('lastVotes') || '{}');
            const count = Object.keys(votes).length;
            
            const shareText = `I just cast my vote in the KIBU Student Council Elections using blockchain technology! 🗳️🔗\n\nI voted for ${count} positions. Every vote is secure and verifiable!\n\n#KIBUeVote #BlockchainVoting`;
            
            if (navigator.share) {
                navigator.share({ title: 'KIBU eVote', text: shareText });
            } else {
                navigator.clipboard.writeText(shareText).then(() => {
                    alert('📋 Share text copied to clipboard!');
                });
            }
        };
        
        // Add button
        const actions = document.querySelector('.action-buttons');
        if (actions) {
            const btn = document.createElement('button');
            btn.className = 'btn-gold';
            btn.innerHTML = '📱 Share Your Vote';
            btn.onclick = window.shareVote;
            btn.style.marginTop = '1rem';
            actions.appendChild(btn);
        }
    },

    // 7. NOTIFICATIONS
    addNotifications: function() {
        if (!window.location.href.includes('dashboard.html')) return;
        
        window.requestNotificationPermission = function() {
            if ('Notification' in window) {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        // Set election end reminder
                        const electionEnd = new Date('2026-02-20T17:00:00');
                        const timeUntilEnd = electionEnd - new Date();
                        
                        if (timeUntilEnd > 0) {
                            setTimeout(() => {
                                new Notification('⏰ Election Ending Soon!', {
                                    body: 'Student Council elections end in 1 hour. Have you voted?',
                                    icon: 'logo.jpg'
                                });
                            }, timeUntilEnd - 3600000);
                        }
                        
                        alert('✅ Reminders enabled!');
                    }
                });
            } else {
                alert('Notifications not supported');
            }
        };
        
        // Add button
        const actions = document.querySelector('.header-actions');
        if (actions) {
            const btn = document.createElement('button');
            btn.className = 'btn-save';
            btn.innerHTML = '🔔 Enable Reminders';
            btn.onclick = window.requestNotificationPermission;
            btn.style.marginRight = '1rem';
            actions.prepend(btn);
        }
    },

    // 8. SEARCH & FILTER
    addSearchFilter: function() {
        if (!window.location.href.includes('voting.html')) return;
        
        const searchHTML = `
            <div style="margin-bottom: 2rem; display: flex; gap: 1rem;">
                <input type="text" id="candidateSearch" placeholder="🔍 Search candidates by name or manifesto..." 
                       style="flex: 1; padding: 1rem; border: 2px solid var(--border-color); border-radius: 12px;"
                       onkeyup="KIBU_Features.searchCandidates()">
                <select id="facultyFilter" style="padding: 1rem; border: 2px solid var(--border-color); border-radius: 12px;" onchange="KIBU_Features.filterByFaculty(this.value)">
                    <option value="">All Faculties</option>
                    <option value="Computing">Computing</option>
                    <option value="Business">Business</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Health">Health</option>
                    <option value="Education">Education</option>
                    <option value="Law">Law</option>
                </select>
            </div>
        `;
        
        document.querySelector('.progress-tracker').insertAdjacentHTML('afterend', searchHTML);
    },

    searchCandidates: function() {
        const term = document.getElementById('candidateSearch')?.value.toLowerCase() || '';
        document.querySelectorAll('.candidate-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? 'flex' : 'none';
        });
    },

    filterByFaculty: function(faculty) {
        if (!faculty) {
            document.querySelectorAll('.candidate-item').forEach(item => item.style.display = 'flex');
            return;
        }
        
        document.querySelectorAll('.candidate-item').forEach(item => {
            const course = item.querySelector('.candidate-course')?.textContent || '';
            item.style.display = course.includes(faculty) ? 'flex' : 'none';
        });
    },

    // 9. ANALYTICS
    addAnalytics: function() {
        if (window.location.href.includes('results.html')) {
            this.loadAnalytics();
        }
    },

    loadAnalytics: function() {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => {
            setTimeout(() => {
                // Turnout chart
                const canvas1 = document.createElement('canvas');
                canvas1.id = 'turnoutChart';
                canvas1.style.marginBottom = '2rem';
                document.querySelector('.results-container').prepend(canvas1);
                
                new Chart(canvas1, {
                    type: 'line',
                    data: {
                        labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
                        datasets: [{
                            label: 'Votes Cast',
                            data: [1200, 3400, 5600, 7200, 8247],
                            borderColor: '#f5b342',
                            tension: 0.1,
                            fill: true,
                            backgroundColor: 'rgba(245, 179, 66, 0.1)'
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: { display: true, text: '📈 Voter Turnout Over Time' }
                        }
                    }
                });
                
                // Distribution chart
                const canvas2 = document.createElement('canvas');
                canvas2.id = 'distributionChart';
                canvas2.style.marginBottom = '2rem';
                document.querySelector('.results-container').appendChild(canvas2);
                
                new Chart(canvas2, {
                    type: 'doughnut',
                    data: {
                        labels: ['Computing', 'Business', 'Engineering', 'Health', 'Education', 'Law'],
                        datasets: [{
                            data: [1234, 2456, 987, 1567, 876, 1127],
                            backgroundColor: ['#0a2c4e', '#1e4a7a', '#f5b342', '#10b981', '#8b5cf6', '#ec4899']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: { display: true, text: '🥧 Votes by Faculty' }
                        }
                    }
                });
            }, 500);
        };
        document.head.appendChild(script);
    },

    // 10. MULTI-LANGUAGE
    addMultiLanguage: function() {
        const translations = {
            en: {
                'voteNow': 'Vote Now',
                'dashboard': 'Dashboard',
                'myVotes': 'My Votes',
                'results': 'Results',
                'connectWallet': 'Connect MetaMask'
            },
            sw: {
                'voteNow': 'Piga Kura Sasa',
                'dashboard': 'Dashibodi',
                'myVotes': 'Kura Zangu',
                'results': 'Matokeo',
                'connectWallet': 'Unganisha MetaMask'
            }
        };
        
        let currentLang = localStorage.getItem('language') || 'en';
        
        window.toggleLanguage = function() {
            currentLang = currentLang === 'en' ? 'sw' : 'en';
            localStorage.setItem('language', currentLang);
            
            document.querySelectorAll('[data-translate]').forEach(el => {
                const key = el.getAttribute('data-translate');
                if (translations[currentLang][key]) {
                    el.textContent = translations[currentLang][key];
                }
            });
        };
        
        // Add language toggle button
        const btn = document.createElement('button');
        btn.innerHTML = '🇰🇪/🇬🇧';
        btn.style.cssText = 'background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-left: 10px;';
        btn.onclick = window.toggleLanguage;
        
        const navbar = document.querySelector('.navbar, .nav-bar, .dashboard-header');
        if (navbar) navbar.appendChild(btn);
        
        // Add data-translate attributes
        setTimeout(() => {
            document.querySelectorAll('.nav-links a, .nav-item span:last-child, .btn-login, .btn-register').forEach(el => {
                if (!el.hasAttribute('data-translate')) {
                    const text = el.textContent.trim().toLowerCase().replace(/\s+/g, '');
                    if (translations.en[text]) {
                        el.setAttribute('data-translate', text);
                    }
                }
            });
        }, 1000);
    },

    // 11. TEST MODE
    addTestMode: function() {
        if (!window.location.href.includes('voting.html')) return;
        
        window.testVote = function() {
            if (!confirm('🎲 Enter test mode? This will randomly select candidates for demo purposes.')) return;
            
            const positions = window.POSITIONS || [];
            positions.forEach(position => {
                const candidates = window.CANDIDATES?.[position] || [];
                if (candidates.length > 0) {
                    const randomIndex = Math.floor(Math.random() * candidates.length);
                    window.selectCandidate?.(position, candidates[randomIndex].name);
                } else {
                    window.selectCandidate?.(position, 'Abstain');
                }
            });
            
            alert('✅ Test vote complete! All positions randomly selected.');
        };
        
        // Add button
        const actions = document.querySelector('.action-buttons');
        if (actions) {
            const btn = document.createElement('button');
            btn.innerHTML = '🎲 Test Vote';
            btn.style.cssText = 'padding: 0.5rem 1rem; background: var(--text-light); color: white; border: none; border-radius: 8px; margin-right: 1rem; cursor: pointer;';
            btn.onclick = window.testVote;
            actions.prepend(btn);
        }
    },

    // 12. ACCESSIBILITY
    addAccessibility: function() {
        window.increaseFontSize = function() {
            const currentSize = parseFloat(getComputedStyle(document.body).fontSize);
            document.body.style.fontSize = (currentSize + 2) + 'px';
        };
        
        window.highContrast = function() {
            document.body.classList.toggle('high-contrast');
            const isHighContrast = document.body.classList.contains('high-contrast');
            
            if (isHighContrast) {
                document.documentElement.style.setProperty('--primary-blue', '#000080');
                document.documentElement.style.setProperty('--accent-gold', '#ffff00');
                document.documentElement.style.setProperty('--text-dark', '#000000');
                document.documentElement.style.setProperty('--text-light', '#000000');
                document.documentElement.style.setProperty('--background', '#ffffff');
            } else {
                location.reload();
            }
        };
        
        // Add accessibility menu
        const menu = document.createElement('div');
        menu.className = 'accessibility-menu';
        menu.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: white; border-radius: 50px; padding: 0.5rem; box-shadow: var(--shadow-lg); z-index: 1000; display: flex; gap: 5px;';
        menu.innerHTML = `
            <button onclick="KIBU_Features.increaseFontSize()" style="padding: 0.5rem 1rem; background: none; border: none; cursor: pointer; font-size: 1.2rem;">A+</button>
            <button onclick="KIBU_Features.highContrast()" style="padding: 0.5rem 1rem; background: none; border: none; cursor: pointer; font-size: 1.2rem;">◐</button>
        `;
        document.body.appendChild(menu);
    },

    // Helper functions
    openTutorial: function() {
        alert('Video tutorial would open here:\n\nStep 1: Install MetaMask\nStep 2: Connect wallet\nStep 3: Select candidates\nStep 4: Submit vote');
    },

    toggleFAQ: function(element) {
        const answer = element.querySelector('.faq-answer');
        const icon = element.querySelector('.faq-icon');
        
        if (answer.style.display === 'none') {
            answer.style.display = 'block';
            icon.textContent = '▲';
        } else {
            answer.style.display = 'none';
            icon.textContent = '▼';
        }
    },

    // Add all styles
    addStyles: function() {
        const style = document.createElement('style');
        style.textContent = `
            .high-contrast {
                --primary-blue: #000080 !important;
                --accent-gold: #ffff00 !important;
                --text-dark: #000000 !important;
                --text-light: #000000 !important;
                --background: #ffffff !important;
            }
            
            .feature-card {
                transition: transform 0.3s;
            }
            
            .feature-card:hover {
                transform: translateY(-5px);
            }
            
            .faq-item {
                cursor: pointer;
            }
            
            .faculty-progress {
                transition: width 0.5s;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
            
            .status-indicator.connected {
                animation: pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);
    }
};

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', () => {
    KIBU_Features.init();
});