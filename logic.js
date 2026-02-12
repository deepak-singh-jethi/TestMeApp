const STORAGE_KEY = 'upsc_deck_v3'; // Incremented version

// --- UTILS ---
const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const formatDate = (ts) => new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// --- MAIN CLASS ---
class StudyEngine {
    constructor() {
        this.state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
            active: false,
            decks: {}, 
            currentBatch: [],
            quizDate: null,
            rangeStr: ""
        };

        // Cache DOM elements
        this.ui = {
            homeView: document.getElementById('home-view'),
            syllabusView: document.getElementById('syllabus-view'),
            start: document.getElementById('start-view'),
            active: document.getElementById('active-view'),
            list: document.getElementById('topic-list'),
            timer: document.getElementById('timer-display'),
            finishBtn: document.getElementById('finish-btn'),
            totalLeft: document.getElementById('total-left'),
            totalDone: document.getElementById('total-done'),
            syllabusGrid: document.getElementById('syllabus-grid'),
            navBtns: document.querySelectorAll('.nav-btn')
        };

        this.init();
    }

    init() {
        // Ensure decks exist
        Object.keys(SYLLABUS).forEach(sub => {
            if (!this.state.decks[sub] || this.state.decks[sub].length === 0) {
                this.refillDeck(sub);
            }
        });
        
        this.render();
        this.renderStats(); // Update dashboard numbers
        setInterval(() => this.updateTimer(), 60000);
    }

    refillDeck(subject) {
        let newDeck = [];
        const topics = SYLLABUS[subject];
        topics.forEach(t => {
            const count = t.w; 
            for(let i=0; i<count; i++) newDeck.push(t);
        });
        this.state.decks[subject] = shuffle(newDeck);
        this.save();
    }

    drawNewBatch() {
        if (this.state.active) return; 

        const subjects = Object.keys(SYLLABUS);
        const newBatch = [];
        let totalWeight = 0;

        subjects.forEach(sub => {
            if (this.state.decks[sub].length === 0) this.refillDeck(sub);
            const card = this.state.decks[sub].pop();
            newBatch.push({ subject: sub, name: card.t, weight: card.w, done: false });
            totalWeight += card.w;
        });

        // Time Calculation
        let daysToAdd = 2;
        if (totalWeight >= 11 && totalWeight <= 14) daysToAdd = 3;
        else if (totalWeight >= 15) daysToAdd = 4;

        const now = new Date();
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + daysToAdd);
        targetDate.setHours(9, 0, 0, 0);

        this.state.active = true;
        this.state.currentBatch = newBatch;
        this.state.quizDate = targetDate.getTime();
        this.state.rangeStr = `${formatDate(targetDate)}`;

        this.save();
        this.render();
        this.renderStats();
    }

    toggleTopic(idx) {
        this.state.currentBatch[idx].done = !this.state.currentBatch[idx].done;
        this.save();
        this.render();
    }

    completeBatch() {
        const allDone = this.state.currentBatch.every(t => t.done);
        if(!allDone) {
            alert("❌ Finish all topics first!");
            return;
        }
        if(!confirm("✅ Mark batch as done?")) return;

        this.state.active = false;
        this.state.currentBatch = [];
        this.save();
        this.render();
        this.renderStats();
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }

    // --- NAVIGATION ---
    showHome() {
        this.ui.homeView.style.display = 'block';
        this.ui.syllabusView.style.display = 'none';
        this.updateNav(0);
    }

    showSyllabus() {
        this.ui.homeView.style.display = 'none';
        this.ui.syllabusView.style.display = 'block';
        this.renderSyllabusView();
        this.updateNav(1);
    }
    
    updateNav(idx) {
        this.ui.navBtns.forEach((btn, i) => {
            if(i === idx) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    // --- RENDERING ---
    updateTimer() {
        if(!this.state.active) return;
        this.ui.timer.innerText = this.state.rangeStr;
    }

    renderStats() {
        // Calculate total cards in full cycle vs current deck
        let totalCardsInCycle = 0;
        let currentCardsLeft = 0;

        Object.keys(SYLLABUS).forEach(sub => {
            // Full Cycle
            SYLLABUS[sub].forEach(t => totalCardsInCycle += t.w);
            // Remaining
            currentCardsLeft += this.state.decks[sub].length;
        });

        const completed = totalCardsInCycle - currentCardsLeft;
        
        this.ui.totalLeft.innerText = currentCardsLeft;
        this.ui.totalDone.innerText = completed;
    }

    render() {
        // Home Screen Logic
        if (this.state.active) {
            this.ui.start.style.display = 'none';
            this.ui.active.style.display = 'block';
        } else {
            this.ui.start.style.display = 'block';
            this.ui.active.style.display = 'none';
            return; 
        }

        this.updateTimer();

        this.ui.list.innerHTML = '';
        this.state.currentBatch.forEach((t, idx) => {
            const isChecked = t.done ? 'checked' : '';
            const rowClass = t.done ? 'topic-row done' : 'topic-row';
            
            this.ui.list.innerHTML += `
                <div class="${rowClass}" onclick="app.toggleTopic(${idx})">
                    <div class="check-col">
                        <input type="checkbox" ${isChecked}> 
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

        const allDone = this.state.currentBatch.every(t => t.done);
        this.ui.finishBtn.disabled = !allDone;
    }

  renderSyllabusView() {
        // Use the new modular renderer
        if (window.syllabusViewer) {
            window.syllabusViewer.render(this.state);
        } else {
            console.error("Syllabus Renderer not loaded");
        }
    }
}

window.app = new StudyEngine();