// --- CHECKPOINT / LEVEL SELECTION MODULE ---
const CheckpointManager = {
    maxUnlockedLevel: 1,

    levels: [
        {
            level: 1,
            name: 'ด่านที่ 1',
            subtitle: 'มือใหม่ขุดทอง',
            icon: '🌾',
            target: 650,
            time: 60,
            badge: '🟢 ง่าย',
            badgeClass: 'easy',
            desc: 'ฝึกฝนขุดทองและตอบคำถามภาษาอังกฤษเกี่ยวกับสัตว์'
        },
        {
            level: 2,
            name: 'ด่านที่ 2',
            subtitle: 'หุบเขาเพชรล้ำค่า',
            icon: '💎',
            target: 1500,
            time: 60,
            badge: '🟡 ปานกลาง',
            badgeClass: 'medium',
            desc: 'ขุมทรัพย์หนาแน่นขึ้น เพิ่มเพชรและถุงสมบัติปริศนา'
        },
        {
            level: 3,
            name: 'ด่านที่ 3',
            subtitle: 'ถ้ำลาวามหาขุมทรัพย์',
            icon: '🌋',
            target: 2600,
            time: 60,
            badge: '🔴 ยาก',
            badgeClass: 'hard',
            desc: 'ด่านสุดท้าทาย! ระวังระเบิด TNT และตัวตุ่นขุดดิน'
        }
    ],

    init() {
        // Load max unlocked level from localStorage
        try {
            const saved = localStorage.getItem('goldminer_max_unlocked_level');
            if (saved) {
                this.maxUnlockedLevel = Math.max(1, parseInt(saved, 10) || 1);
            } else {
                this.maxUnlockedLevel = 1;
            }
        } catch (e) {
            this.maxUnlockedLevel = 1;
        }

        const backBtn = document.getElementById('checkpointBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (typeof Game !== 'undefined') {
                    Game.hideAllOverlays();
                    Game.showOverlay('startOverlay');
                }
            });
        }

        this.updateUI();
    },

    unlockLevel(lvl) {
        if (lvl > this.maxUnlockedLevel && lvl <= 3) {
            this.maxUnlockedLevel = lvl;
            try {
                localStorage.setItem('goldminer_max_unlocked_level', this.maxUnlockedLevel);
            } catch (e) {
                console.warn("Could not save unlocked level to storage", e);
            }
            this.updateUI();
        }
    },

    updateUI() {
        this.levels.forEach(item => {
            const card = document.getElementById(`checkpointCard${item.level}`);
            if (!card) return;

            const isUnlocked = item.level <= this.maxUnlockedLevel;

            if (isUnlocked) {
                card.className = 'checkpoint-card';
                card.innerHTML = `
                    <div class="checkpoint-badge ${item.badgeClass}">${item.badge}</div>
                    <div class="checkpoint-icon">${item.icon}</div>
                    <div class="checkpoint-title">${item.name}</div>
                    <div class="checkpoint-sub">${item.subtitle}</div>
                    <div class="checkpoint-desc">${item.desc}</div>
                    <div class="checkpoint-info">
                        <span>เป้าหมาย: <strong style="color:#ffea00">$${item.target.toLocaleString()}</strong></span>
                        <span>เวลา: <strong>${item.time} วินาที</strong></span>
                    </div>
                    <button class="btn-checkpoint">เล่นด่าน ${item.level} 🚀</button>
                `;
            } else {
                card.className = 'checkpoint-card locked';
                card.innerHTML = `
                    <div class="checkpoint-badge locked">🔒 ล็อกอยู่</div>
                    <div class="checkpoint-icon" style="filter: grayscale(1); opacity: 0.5;">🔒</div>
                    <div class="checkpoint-title" style="color: #aaaaaa;">${item.name}</div>
                    <div class="checkpoint-sub" style="color: #888888;">${item.subtitle}</div>
                    <div class="checkpoint-desc" style="color: #777777;">${item.desc}</div>
                    <div class="checkpoint-info" style="opacity: 0.6;">
                        <span>เป้าหมาย: <strong>$${item.target.toLocaleString()}</strong></span>
                        <span>เวลา: <strong>${item.time} วินาที</strong></span>
                    </div>
                    <button class="btn-checkpoint locked" disabled>🔒 ต้องผ่านด่าน ${item.level - 1} ก่อน</button>
                `;
            }
        });
    },

    showCheckpointMenu() {
        this.updateUI();
        if (typeof Game !== 'undefined') {
            Game.hideAllOverlays();
            Game.showOverlay('checkpointOverlay');
        }
    },

    selectLevel(levelNum) {
        if (levelNum > this.maxUnlockedLevel) {
            const card = document.getElementById(`checkpointCard${levelNum}`);
            if (card) {
                card.classList.add('shake-card');
                setTimeout(() => card.classList.remove('shake-card'), 400);
            }
            const msgEl = document.getElementById('checkpointNoticeMsg');
            if (msgEl) {
                msgEl.textContent = `🔒 ด่านที่ ${levelNum} ถูกล็อกอยู่! ต้องผ่านด่านที่ ${levelNum - 1} ก่อนนะครับ`;
                msgEl.style.display = 'block';
                setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
            }
            return;
        }

        console.log("Selected Checkpoint Level:", levelNum);
        if (typeof Game !== 'undefined') {
            Game.startFromLevel(levelNum);
        }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    CheckpointManager.init();
});
