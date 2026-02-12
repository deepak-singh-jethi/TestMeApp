class SyllabusRenderer {
    constructor() {
        this.container = document.getElementById('syllabus-grid');
    }

    render(globalState) {
        if (!this.container) return;
        this.container.innerHTML = '';

        Object.keys(SYLLABUS).forEach(subject => {
            const subjectData = SYLLABUS[subject];
            const remainingCards = globalState.decks[subject] || [];

            // 1. Calculate Subject Level Stats
            let totalWeight = 0;
            let currentWeight = 0;

            // 2. Build Topic Detail List
            let topicsHTML = '<div class="topic-list">';
            
            subjectData.forEach(topic => {
                // Max copies of this card (e.g., Weight 3 = 3 copies)
                const maxCopies = topic.w;
                
                // How many copies represent "Total Work" in weight units
                totalWeight += maxCopies;

                // How many are left in the deck?
                const leftInDeck = remainingCards.filter(c => c.t === topic.t).length;
                currentWeight += leftInDeck;

                // Topic Progress
                const percent = Math.round(((maxCopies - leftInDeck) / maxCopies) * 100);
                
                // Status Class
                let statusClass = 'pending';
                if (percent === 100) statusClass = 'completed';
                else if (percent > 0) statusClass = 'in-progress';

                topicsHTML += `
                    <div class="topic-item ${statusClass}">
                        <div class="topic-info">
                            <span class="topic-name">${topic.t}</span>
                            <span class="topic-meta">Weight ${topic.w} • ${leftInDeck} left</span>
                        </div>
                        <div class="topic-visual">
                            <div class="mini-progress-bar">
                                <div class="mini-fill" style="width: ${percent}%"></div>
                            </div>
                            <span class="topic-percent">${percent}%</span>
                        </div>
                    </div>
                `;
            });
            topicsHTML += '</div>';

            // 3. Subject Overall Progress
            const subjectPercent = Math.round(((totalWeight - currentWeight) / totalWeight) * 100);

            // 4. Create Card HTML
            const card = document.createElement('div');
            card.className = 'syllabus-card';
            card.innerHTML = `
                <div class="syl-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <div class="syl-title-row">
                        <h3>${subject}</h3>
                        <span class="syl-badge">${subjectPercent}% Done</span>
                    </div>
                    <div class="main-progress-track">
                        <div class="main-progress-fill" style="width: ${subjectPercent}%"></div>
                    </div>
                    <div class="expand-hint">▼ View Details</div>
                </div>
                <div class="syl-body">
                    ${topicsHTML}
                </div>
            `;

            this.container.appendChild(card);
        });
    }
}

// Export instance
window.syllabusViewer = new SyllabusRenderer();