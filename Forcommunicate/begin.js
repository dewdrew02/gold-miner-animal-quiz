/**
 * begin.js - Gold Miner Cover & Entry Screen Module
 * จัดการหน้าแรกสุด (Cover Splash Screen) แสดงรูปปกเกมและปุ่ม ENTRY ก่อนเข้าสู่หน้าหลักของเกม
 */

const BeginScreen = {
    overlayId: 'beginOverlay',

    init() {
        this.injectStyles();
        this.renderOverlay();
        this.bindEvents();
    },

    injectStyles() {
        if (document.getElementById('begin-screen-styles')) return;
        const style = document.createElement('style');
        style.id = 'begin-screen-styles';
        style.textContent = `
            .begin-cover-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #0f0906;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                align-items: center;
                overflow: hidden;
                opacity: 1;
                transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                border-radius: 16px;
            }

            .begin-cover-overlay.begin-fade-out {
                opacity: 0;
                transform: scale(1.05);
                pointer-events: none;
            }

            .begin-bg-image {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                animation: beginZoomBreath 12s infinite alternate ease-in-out;
                filter: brightness(0.95);
            }

            @keyframes beginZoomBreath {
                0% { transform: scale(1); }
                100% { transform: scale(1.04); }
            }

            .begin-vignette {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.85) 100%),
                            linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0) 100%);
                pointer-events: none;
            }

            .begin-ui-container {
                position: relative;
                z-index: 10;
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-bottom: 28px;
                animation: beginButtonFloatIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
            }

            @keyframes beginButtonFloatIn {
                0% {
                    opacity: 0;
                    transform: translateY(40px) scale(0.9);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .btn-begin-entry {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 14px;
                background: linear-gradient(135deg, #ffe066 0%, #ffb703 40%, #fb8500 100%);
                border: 3px solid #fff5cc;
                border-bottom: 7px solid #9e4b00;
                border-radius: 50px;
                padding: 14px 54px;
                color: #2b1300;
                font-family: 'Fredoka', sans-serif, system-ui;
                font-size: 28px;
                font-weight: 800;
                letter-spacing: 2px;
                cursor: pointer;
                box-shadow: 0 12px 35px rgba(251, 133, 0, 0.65), 0 0 30px rgba(255, 224, 102, 0.6);
                transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                animation: entryPulseGlow 2s infinite ease-in-out;
                user-select: none;
            }

            .btn-begin-entry .entry-icon {
                font-size: 32px;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
                animation: pickaxeSwing 1.8s infinite ease-in-out;
            }

            .btn-begin-entry .entry-text-group {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                text-align: left;
            }

            .btn-begin-entry .entry-main-text {
                font-size: 26px;
                font-weight: 900;
                line-height: 1;
                text-shadow: 0 1px 2px rgba(255, 255, 255, 0.6), 0 2px 4px rgba(0, 0, 0, 0.3);
            }

            .btn-begin-entry .entry-sub-text {
                font-size: 13px;
                font-weight: 700;
                color: #4a2800;
                letter-spacing: 0.5px;
                margin-top: 3px;
            }

            .btn-begin-entry:hover {
                transform: translateY(-5px) scale(1.06);
                box-shadow: 0 18px 45px rgba(251, 133, 0, 0.85), 0 0 45px rgba(255, 224, 102, 0.8);
                filter: brightness(1.08);
            }

            .btn-begin-entry:active {
                transform: translateY(3px) scale(0.98);
                border-bottom-width: 3px;
                box-shadow: 0 5px 15px rgba(251, 133, 0, 0.5);
            }

            @keyframes entryPulseGlow {
                0%, 100% {
                    box-shadow: 0 10px 30px rgba(251, 133, 0, 0.6), 0 0 25px rgba(255, 224, 102, 0.4);
                }
                50% {
                    box-shadow: 0 14px 45px rgba(251, 133, 0, 0.9), 0 0 40px rgba(255, 224, 102, 0.8);
                }
            }

            @keyframes pickaxeSwing {
                0%, 100% { transform: rotate(0deg); }
                30% { transform: rotate(-20deg); }
                60% { transform: rotate(15deg); }
            }
        `;
        document.head.appendChild(style);
    },

    renderOverlay() {
        let overlay = document.getElementById(this.overlayId);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = this.overlayId;
            overlay.className = 'begin-cover-overlay active';

            overlay.innerHTML = `
                <!-- Background Cover Poster Image -->
                <img src="cover.jpg" alt="Gold Miner Game Cover" class="begin-bg-image" id="beginCoverImg">
                
                <!-- Atmospheric Vignette Overlay -->
                <div class="begin-vignette"></div>

                <!-- Entry Button Container -->
                <div class="begin-ui-container">
                    <button id="entryBtn" class="btn-begin-entry" title="เข้าสู่หน้าแรกของเกม">
                        <span class="entry-icon">⛏️</span>
                        <div class="entry-text-group">
                            <span class="entry-main-text">ENTRY</span>
                            <span class="entry-sub-text">เข้าสู่เกมขุดทอง 🚀</span>
                        </div>
                    </button>
                </div>
            `;

            const container = document.getElementById('gameContainer') || document.body;
            container.appendChild(overlay);
        }
    },

    bindEvents() {
        const entryBtn = document.getElementById('entryBtn');
        if (entryBtn) {
            entryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.enterGame();
            });
        }
    },

    enterGame() {
        const overlay = document.getElementById(this.overlayId);
        if (overlay) {
            overlay.classList.add('begin-fade-out');

            // Unlock and start Audio on first user interaction
            if (typeof AudioSynth !== 'undefined') {
                try {
                    AudioSynth.init();
                    if (AudioSynth.playUpgrade) AudioSynth.playUpgrade();
                    AudioSynth.startMusic();
                } catch(e) {
                    console.warn("Audio start on entry:", e);
                }
            }

            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.classList.remove('active');
                overlay.classList.remove('begin-fade-out');

                // Show the start overlay (Main Menu)
                const startOverlay = document.getElementById('startOverlay');
                if (startOverlay) {
                    startOverlay.classList.add('active');
                }
            }, 500);
        }
    },

    show() {
        const overlay = document.getElementById(this.overlayId);
        if (overlay) {
            // Hide other overlays
            document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
            overlay.style.display = 'flex';
            overlay.classList.remove('begin-fade-out');
            overlay.classList.add('active');
        }
    }
};

// Initialize BeginScreen as soon as DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BeginScreen.init());
} else {
    BeginScreen.init();
}
