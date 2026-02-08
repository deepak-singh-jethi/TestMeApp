const STORAGE_KEY = 'upsc_deck_v2';

// --- UTILS ---
const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const formatDate = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// --- MAIN CLASS ---
class StudyEngine {
    constructor() {
        // Load State or Initialize Empty
        this.state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
            active: false,
            decks: {}, // Stores the remaining cards for each subject
            currentBatch: [],
            quizDate: null,
            rangeStr: ""
        };

        this.ui = {
            start: document.getElementById('start-view'),
            active: document.getElementById('active-view'),
            list: document.getElementById('topic-list'),
            timer: document.getElementById('timer-display'),
            badge: document.getElementById('status-badge'),
            finishBtn: document.getElementById('finish-btn'),
            deckStat: document.getElementById('deck-status')
        };

        this.init();
    }

    init() {
        // Ensure decks exist for all subjects
        Object.keys(SYLLABUS).forEach(sub => {
            if (!this.state.decks[sub] || this.state.decks[sub].length === 0) {
                this.refillDeck(sub);
            }
        });
        
        this.render();
        setInterval(() => this.updateTimer(), 60000);
    }

    // --- THE ALGORITHM: WEIGHTED DECK ---
    refillDeck(subject) {
        let newDeck = [];
        const topics = SYLLABUS[subject];

        topics.forEach(t => {
            // W3 = Add 3 times, W2 = 2 times, W1 = 1 time
            const count = t.w; 
            for(let i=0; i<count; i++) {
                newDeck.push(t);
            }
        });

        // Shuffle deeply
        this.state.decks[subject] = shuffle(newDeck);
        this.save();
    }

    drawNewBatch() {
        if (this.state.active) return; // Strict Mode: Block if active

        const subjects = Object.keys(SYLLABUS);
        const newBatch = [];
        let maxWeight = 0;

        subjects.forEach(sub => {
            // 1. Check if deck is empty, if so, refill
            if (this.state.decks[sub].length === 0) {
                this.refillDeck(sub);
            }

            // 2. Draw one card (Pop removes it from deck)
            const card = this.state.decks[sub].pop();
            
            newBatch.push({
                subject: sub,
                name: card.t, // 't' from data.js
                weight: card.w, // 'w' from data.js
                done: false // For checkboxes
            });

            if (card.w > maxWeight) maxWeight = card.w;
        });

        // 3. Schedule Logic (Heaviest topic dictates time)
        let minDays, maxDays;
        if (maxWeight === 1) { minDays = 1; maxDays = 1; }
        else if (maxWeight === 2) { minDays = 2; maxDays = 3; }
        else { minDays = 3; maxDays = 5; }

        const now = new Date();
        const daysToAdd = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + daysToAdd);
        targetDate.setHours(9, 0, 0, 0); // 9 AM Fixed

        // 4. Update State
        this.state.active = true;
        this.state.currentBatch = newBatch;
        this.state.quizDate = targetDate.getTime();
        
        // Range String for UI
        const d1 = new Date(); d1.setDate(now.getDate() + minDays);
        const d2 = new Date(); d2.setDate(now.getDate() + maxDays);
        this.state.rangeStr = `${formatDate(d1)} - ${formatDate(d2)}`;

        this.save();
        this.render();
    }

    toggleTopic(idx) {
        this.state.currentBatch[idx].done = !this.state.currentBatch[idx].done;
        this.save();
        this.render(); // Re-render to update checkbox visual
    }

    completeBatch() {
        // Strict Check: Are all checked?
        const allDone = this.state.currentBatch.every(t => t.done);
        if(!allDone) {
            alert("❌ Discipline Check: You cannot finish until all topics are done.");
            return;
        }

        if(!confirm("✅ Confirm: You have revised these topics and are ready for the next set?")) return;

        this.state.active = false;
        this.state.currentBatch = [];
        this.save();
        this.render();
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }

    // --- UI RENDERING ---
    updateTimer() {
        if(!this.state.active) return;
        
        const now = Date.now();
        const diff = this.state.quizDate - now;
        const hours = diff / (1000 * 60 * 60);

        if (hours > 24) {
            this.ui.timer.innerText = this.state.rangeStr;
            this.ui.timer.className = "timer-text neutral";
            this.ui.badge.innerText = "Scheduled Window";
            this.ui.badge.className = "badge neutral";
        } else if (hours > -12) {
            this.ui.timer.innerText = "⚠️ QUIZ ACTIVE";
            this.ui.timer.className = "timer-text alert";
            this.ui.badge.innerText = "Time to Test";
            this.ui.badge.className = "badge alert";
        } else {
            this.ui.timer.innerText = "OVERDUE";
            this.ui.timer.className = "timer-text alert";
            this.ui.badge.innerText = "Missed Deadline";
        }
    }

    render() {
        // Toggle Screens
        if (this.state.active) {
            this.ui.start.style.display = 'none';
            this.ui.active.style.display = 'block';
        } else {
            this.ui.start.style.display = 'block';
            this.ui.active.style.display = 'none';
            return; // Stop rendering active view
        }

        this.updateTimer();

        // Render List with Checkboxes
        this.ui.list.innerHTML = '';
        this.state.currentBatch.forEach((t, idx) => {
            const isChecked = t.done ? 'checked' : '';
            const rowClass = t.done ? 'topic-row done' : 'topic-row';
            
            this.ui.list.innerHTML += `
                <div class="${rowClass}" onclick="app.toggleTopic(${idx})">
                    <div class="check-col">
                        <input type="checkbox" ${isChecked} disabled> 
                    </div>
                    <div class="info-col">
                        <div class="sub">${t.subject}</div>
                        <div class="name">${t.name}</div>
                    </div>
                    <div class="weight-col">
                        <span class="w-tag w-${t.weight}">W${t.weight}</span>
                    </div>
                </div>
            `;
        });

        // Button Logic
        const allDone = this.state.currentBatch.every(t => t.done);
        this.ui.finishBtn.disabled = !allDone;
        this.ui.finishBtn.innerText = allDone ? "✅ Mark Batch Complete" : "🔒 Finish All Topics First";
        
        // Debug Info
        const totalCards = Object.values(this.state.decks).reduce((a, b) => a + b.length, 0);
        this.ui.deckStat.innerText = `Cards remaining in deck: ${totalCards}`;
    }
}

// Global Instance
window.app = new StudyEngine();