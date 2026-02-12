const STORAGE_KEY = 'upsc_deck_v2';

// --- UTILS ---
const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// Updated to show "Mon, Feb 16"
const formatDate = (ts) => new Date(ts).toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
});


// --- MAIN CLASS ---
class StudyEngine {
    constructor() {
        try {
            // Attempt to load state
            const raw = localStorage.getItem(STORAGE_KEY);
            this.state = raw ? JSON.parse(raw) : this.getDefaultState();
            
            // Validation: If state is corrupted (missing critical keys), force reset
            if (!this.state.decks || !this.state.currentBatch) {
                throw new Error("Corrupted State");
            }
        } catch (e) {
            console.warn("⚠️ State corrupted or old. Resetting app...", e);
            this.state = this.getDefaultState();
            this.save();
        }

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

    getDefaultState() {
        return {
            active: false,
            decks: {}, 
            currentBatch: [],
            quizDate: null,
            rangeStr: ""
        };
    }

    init() {
        // Ensure decks exist for all subjects
        if (typeof SYLLABUS !== 'undefined') {
            Object.keys(SYLLABUS).forEach(sub => {
                // If subject missing from deck, refill it
                if (!this.state.decks[sub] || this.state.decks[sub].length === 0) {
                    this.refillDeck(sub);
                }
            });
        } else {
            alert("❌ ERROR: data.js not loaded. Check file names!");
        }
        
        this.render();
        setInterval(() => this.updateTimer(), 60000);
    }

    // --- ALGORITHM PART 1: THE WEIGHTED DECK ---
    refillDeck(subject) {
        let newDeck = [];
        const topics = SYLLABUS[subject];

        topics.forEach(t => {
            const count = t.w; 
            for(let i=0; i<count; i++) {
                newDeck.push(t);
            }
        });

        this.state.decks[subject] = shuffle(newDeck);
        this.save();
    }

drawNewBatch() {
        if (this.state.active) return; // Strict Mode: Block if active

        const subjects = Object.keys(SYLLABUS);
        const newBatch = [];
        let totalWeight = 0; // We now sum the weights

        subjects.forEach(sub => {
            // 1. Check if deck is empty, if so, refill
            if (this.state.decks[sub].length === 0) {
                this.refillDeck(sub);
            }

            // 2. Draw one card
            const card = this.state.decks[sub].pop();
            
            newBatch.push({
                subject: sub,
                name: card.t, 
                weight: card.w, 
                done: false 
            });

            // Accumulate weight for the deadline calculation
            totalWeight += card.w;
        });

        // 3. Schedule Logic (Sum of Weights)
        // Sum 1-10 = 2 Days | 11-14 = 3 Days | 15+ = 4 Days
        let daysToAdd = 2;
        
        if (totalWeight >= 11 && totalWeight <= 14) {
            daysToAdd = 3;
        } else if (totalWeight >= 15) {
            daysToAdd = 4;
        }

        const now = new Date();
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + daysToAdd);
        targetDate.setHours(9, 0, 0, 0); // 9 AM Fixed

        // 4. Update State
        this.state.active = true;
        this.state.currentBatch = newBatch;
        this.state.quizDate = targetDate.getTime();
        this.state.rangeStr = `Deadline: ${formatDate(targetDate)}`;

        this.save();
        this.render();
    }

    toggleTopic(idx) {
        this.state.currentBatch[idx].done = !this.state.currentBatch[idx].done;
        this.save();
        this.render(); 
    }

    completeBatch() {
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
        // Toggle Views
        if (this.state.active) {
            this.ui.start.style.display = 'none';
            this.ui.active.style.display = 'block';
        } else {
            this.ui.start.style.display = 'block';
            this.ui.active.style.display = 'none';
            return; 
        }

        this.updateTimer();

        // Render List
        this.ui.list.innerHTML = '';
        this.state.currentBatch.forEach((t, idx) => {
            const isChecked = t.done ? 'checked' : '';
            const rowClass = t.done ? 'topic-row done' : 'topic-row';
            
            // Note: input is disabled because the ROW CLICK handles the toggle
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

        // Finish Button Logic
        const allDone = this.state.currentBatch.every(t => t.done);
        this.ui.finishBtn.disabled = !allDone;
        this.ui.finishBtn.innerText = allDone ? "✅ Mark Batch Complete" : "🔒 Finish All Topics First";
        
        // Deck Stats
        const totalCards = this.state.decks ? Object.values(this.state.decks).reduce((a, b) => a + b.length, 0) : 0;
        this.ui.deckStat.innerText = `Cards remaining in deck: ${totalCards}`;
    }
}

// Global Instance
window.app = new StudyEngine();