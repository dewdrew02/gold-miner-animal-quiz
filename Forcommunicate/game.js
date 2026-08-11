// --- GLOBAL GAME OBJECT ---
const Game = {
    // Canvas & Overlays
    canvas: null,
    ctx: null,
    container: null,
    floatingLayer: null,
    
    // Core Game States: 'START', 'PLAYING', 'PAUSED', 'TRANSITION', 'SHOP', 'GAMEOVER'
    state: 'START',
    
    // Stats & Upgrades
    cash: 0,
    level: 1,
    targetScore: 650,
    timeLeft: 60,
    dynamite: 0,
    timerInterval: null,
    
    // Active Shop Items and temporary power-ups
    shopItems: [],
    hasStrengthDrink: false,
    hasClover: false,
    hasRockBook: false,
    hasDiamondPolish: false,
    questions: [],
    unusedQuestions: [],
    currentQuestion: null,
    quizTimerInterval: null,
    quizStartTime: null,
    
    // Gameplay Entities
    claw: {
        x: GAME_WIDTH / 2,
        y: DIRT_START_Y - 15,
        originX: GAME_WIDTH / 2,
        originY: DIRT_START_Y - 15,
        length: 50,
        minLength: 50,
        angle: 0, // In radians
        state: 'SWING', // 'SWING', 'SHOOT', 'RETRACT'
        swingDir: 1, // 1 for right, -1 for left
        swingSpeed: 0.015,
        shootSpeed: 6.5,
        baseRetractSpeed: 6,
        grabbedItem: null,
        hookSize: 14
    },
    items: [],
    particles: [],
    
    // Miner animations state
    minerState: 'IDLE', // 'IDLE', 'CRANKING', 'HAPPY', 'STRAINING', 'WORRIED'
    minerReactionTimer: 0,
    
    // Leaders
    highScores: [],

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.container = document.getElementById('gameContainer');
        this.floatingLayer = document.getElementById('floatingScoreLayer');
        
        this.loadHighScores();
        this.loadQuestions();
        this.setupEventListeners();
        this.resizeGame();
        this.renderMenuHighScores();
        
        // Add Enter Game transition
        document.getElementById('enterGameBtn').addEventListener('click', () => {
            this.hideAllOverlays();
            this.showOverlay('startOverlay');
            if (typeof AudioSynth !== 'undefined') {
                AudioSynth.startMusic();
            }
        });

        // Particle update loop runs inside main loop
        requestAnimationFrame((t) => this.loop(t));
    },

    loadQuestions() {
        fetch('questions.json')
            .then(res => res.json())
            .then(data => {
                this.questions = data;
                this.unusedQuestions = [...data];
                console.log("Loaded questions:", this.questions.length);
            })
            .catch(err => {
                console.warn("Could not load questions.json, loading fallback list.", err);
                this.loadFallbackQuestions();
            });
    },

    loadFallbackQuestions() {
        this.questions = [
            {
                "question": "What animal barks? (Woof! Woof!)",
                "options": ["Dog", "Cat", "Lion", "Fish"],
                "answer": "Dog"
            },
            {
                "question": "What animal meows? (Meow! Meow!)",
                "options": ["Bird", "Cat", "Cow", "Rabbit"],
                "answer": "Cat"
            },
            {
                "question": "Which animal has a very long neck?",
                "options": ["Frog", "Giraffe", "Dog", "Panda"],
                "answer": "Giraffe"
            },
            {
                "question": "Which animal has black and white stripes?",
                "options": ["Zebra", "Lion", "Monkey", "Dog"],
                "answer": "Zebra"
            },
            {
                "question": "Which animal loves to eat bananas and climb trees?",
                "options": ["Monkey", "Turtle", "Snake", "Sheep"],
                "answer": "Monkey"
            }
        ];
        this.unusedQuestions = [...this.questions];
    },

    resizeGame() {
        const w = GAME_WIDTH;
        const h = GAME_HEIGHT;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        // Scale seamlessly to fill full screen
        const scale = Math.min(windowWidth / w, windowHeight / h);
        this.container.style.transform = `scale(${scale})`;
        this.container.style.transformOrigin = 'center center';
    },

    setupEventListeners() {
        // Window Resize
        window.addEventListener('resize', () => this.resizeGame());
        window.addEventListener('load', () => this.resizeGame());

        // Keyboard inputs
        window.addEventListener('keydown', (e) => {
            if (this.state === 'PLAYING') {
                if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyS') {
                    this.shootClaw();
                    e.preventDefault();
                }
                if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                    this.useDynamite();
                    e.preventDefault();
                }
                if (e.code === 'KeyP') {
                    this.togglePause();
                    e.preventDefault();
                }
            } else if (this.state === 'MINIGAME') {
                if (typeof MiniGame !== 'undefined') {
                    MiniGame.handleInput(e);
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.state === 'MINIGAME') {
                if (typeof MiniGame !== 'undefined') {
                    MiniGame.handleKeyUp(e);
                }
            }
        });

        // Click/Touch on canvas to shoot claw or jump
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.state === 'PLAYING') {
                this.shootClaw();
            } else if (this.state === 'MINIGAME') {
                if (typeof MiniGame !== 'undefined') {
                    MiniGame.jump();
                }
            }
        });

        this.canvas.addEventListener('touchstart', (e) => {
            if (this.state === 'MINIGAME') {
                if (typeof MiniGame !== 'undefined') {
                    MiniGame.jump();
                }
                e.preventDefault();
            }
        }, { passive: false });

        // HTML Buttons linking
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePause();
        });
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('pauseRestartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('goShopBtn').addEventListener('click', () => {
            if (this.level === 1 && typeof MiniGame !== 'undefined') {
                MiniGame.start();
            } else {
                this.openShop();
            }
        });
        document.getElementById('nextLevelBtn').addEventListener('click', () => this.startNextLevel());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('dynamiteBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.state === 'PLAYING') this.useDynamite();
        });
        
        const saveScoreBtn = document.getElementById('saveScoreBtn');
        if (saveScoreBtn) {
            saveScoreBtn.addEventListener('click', () => this.saveCurrentScore());
        }

        // Music Volume Slider handling
        const musicVolSlider = document.getElementById('musicVolSlider');
        const musicVolText = document.getElementById('musicVolText');
        const pauseMusicVolSlider = document.getElementById('pauseMusicVolSlider');
        const pauseMusicVolText = document.getElementById('pauseMusicVolText');

        const updateMusicVolume = (val) => {
            const vol = parseFloat(val) / 100;
            if (typeof AudioSynth !== 'undefined') {
                AudioSynth.setMusicVolume(vol);
            }
            if (musicVolSlider) musicVolSlider.value = val;
            if (musicVolText) musicVolText.textContent = `${val}%`;
            if (pauseMusicVolSlider) pauseMusicVolSlider.value = val;
            if (pauseMusicVolText) pauseMusicVolText.textContent = `${val}%`;
            localStorage.setItem('goldminer_music_volume', val);
        };

        // Load saved volume if any
        const savedVolume = localStorage.getItem('goldminer_music_volume') || '30';
        updateMusicVolume(savedVolume);

        if (musicVolSlider) {
            musicVolSlider.addEventListener('input', (e) => updateMusicVolume(e.target.value));
        }
        if (pauseMusicVolSlider) {
            pauseMusicVolSlider.addEventListener('input', (e) => updateMusicVolume(e.target.value));
        }

        const startInput = document.getElementById('playerNameInputStart');
        if (startInput) {
            const savedName = localStorage.getItem('goldminer_player_name');
            if (savedName) startInput.value = savedName;
            
            startInput.addEventListener('input', () => {
                localStorage.setItem('goldminer_player_name', startInput.value.trim());
            });
        }

        const homeHandler = (e) => {
            if (e) e.stopPropagation();
            this.goToMainMenu();
        };
        const homeBtn = document.getElementById('homeBtn');
        if (homeBtn) homeBtn.addEventListener('click', homeHandler);
        const pauseHomeBtn = document.getElementById('pauseHomeBtn');
        if (pauseHomeBtn) pauseHomeBtn.addEventListener('click', homeHandler);
        const gameOverHomeBtn = document.getElementById('gameOverHomeBtn');
        if (gameOverHomeBtn) gameOverHomeBtn.addEventListener('click', homeHandler);
        const shopHomeBtn = document.getElementById('shopHomeBtn');
        if (shopHomeBtn) shopHomeBtn.addEventListener('click', homeHandler);
    },

    // --- GAME ENGINE LOOP ---
    loop(timestamp) {
        this.update(timestamp);
        this.draw(timestamp);
        requestAnimationFrame((t) => this.loop(t));
    },

    update(timestamp) {
        if (this.state === 'MINIGAME') {
            if (typeof MiniGame !== 'undefined') {
                MiniGame.update(timestamp);
            }
            return;
        }
        if (this.state !== 'PLAYING') return;

        // Update items (like gophers running)
        for (let item of this.items) {
            if (item.type === 'GOPHER' && !item.grabbed && !item.destroyed) {
                item.x += item.vx;
                // Bounce off boundaries
                if (item.x < 30 || item.x > GAME_WIDTH - 30) {
                    item.vx = -item.vx;
                    item.x += item.vx;
                }
            }
        }

        // Update Claw Physics
        const claw = this.claw;
        
        if (claw.state === 'SWING') {
            this.minerState = 'IDLE';
            claw.angle += claw.swingDir * claw.swingSpeed;
            // Angle limits -72 deg to +72 deg
            if (claw.angle > 1.25) {
                claw.angle = 1.25;
                claw.swingDir = -1;
            } else if (claw.angle < -1.25) {
                claw.angle = -1.25;
                claw.swingDir = 1;
            }
            
            // Sync claw position with minimal length along swing arc
            claw.x = claw.originX + Math.sin(claw.angle) * claw.minLength;
            claw.y = claw.originY + Math.cos(claw.angle) * claw.minLength;
        } 
        else if (claw.state === 'SHOOT') {
            this.minerState = 'IDLE';
            claw.x += Math.sin(claw.angle) * claw.shootSpeed;
            claw.y += Math.cos(claw.angle) * claw.shootSpeed;
            
            // Check out of bounds
            if (claw.x < 15 || claw.x > GAME_WIDTH - 15 || claw.y > GAME_HEIGHT - 15) {
                claw.state = 'RETRACT';
                claw.grabbedItem = null;
            } else {
                // Check collisions with ground items
                for (let item of this.items) {
                    if (item.destroyed || item.grabbed) continue;
                    
                    const dist = Math.hypot(claw.x - item.x, claw.y - item.y);
                    if (dist < claw.hookSize + item.radius) {
                        // Hook item!
                        AudioSynth.playGrabSound();
                        claw.state = 'RETRACT';
                        claw.grabbedItem = item;
                        item.grabbed = true;
                        
                        // If TNT barrel, explode instantly and lose game!
                        if (item.type === 'TNT') {
                            this.triggerTNTGameOver(item);
                        } else {
                            // Change miner state based on weight
                            if (item.weight > 4) {
                                this.setMinerState('STRAINING', 10000);
                            } else {
                                this.setMinerState('CRANKING', 10000);
                            }
                        }
                        break;
                    }
                }
            }
        } 
        else if (claw.state === 'RETRACT') {
            let speedMultiplier = 1.0;
            let totalWeight = 0;
            
            if (claw.grabbedItem) {
                totalWeight = claw.grabbedItem.weight;
                if (this.hasStrengthDrink) {
                    speedMultiplier = 1.45; // 45% faster pull
                }
            } else {
                // Empty return is fast
                speedMultiplier = 1.5; 
                this.setMinerState('CRANKING', 50);
            }
            
            // Reels sound effect
            const pullSpeed = (claw.baseRetractSpeed / (1 + totalWeight)) * speedMultiplier;
            AudioSynth.playReelSound(pullSpeed);
            
            // Vector calculation back to origin
            const dx = claw.originX - claw.x;
            const dy = claw.originY - claw.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < pullSpeed) {
                // Returned to origin!
                claw.x = claw.originX;
                claw.y = claw.originY;
                claw.state = 'SWING';
                
                if (claw.grabbedItem) {
                    this.collectItem(claw.grabbedItem);
                    claw.grabbedItem = null;
                }
                
                this.minerState = 'IDLE';
            } else {
                claw.x += (dx / dist) * pullSpeed;
                claw.y += (dy / dist) * pullSpeed;
                
                if (claw.grabbedItem) {
                    claw.grabbedItem.x = claw.x;
                    claw.grabbedItem.y = claw.y;
                }
            }
        }

        // Miner reaction timer
        if (this.minerReactionTimer > 0) {
            this.minerReactionTimer -= 16.67; // approx frame time
            if (this.minerReactionTimer <= 0) {
                this.minerState = 'IDLE';
            }
        }

        // Update Particles
        this.updateParticles();
    },

    draw(timestamp) {
        if (this.state === 'MINIGAME') {
            if (typeof MiniGame !== 'undefined') {
                MiniGame.draw(this.ctx, timestamp);
            }
            return;
        }
        const ctx = this.ctx;
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // 1. Draw Underground Background (layered dirt + details)
        this.drawBackground(ctx);
        
        // 2. Draw ground items
        this.drawItems(ctx);
        
        // 3. Draw Claw (Rope + Claw pincers)
        this.drawClaw(ctx);
        
        // 4. Draw Miner character + Winch platform
        drawMiner(ctx, this.minerState, timestamp);
        
        // 5. Draw Particle systems
        this.drawParticles(ctx);
    },

    // --- GAMEPLAY MECHANICS ---
    shootClaw() {
        if (this.claw.state === 'SWING') {
            this.claw.state = 'SHOOT';
            AudioSynth.playShootSound();
        }
    },

    useDynamite() {
        if (this.claw.state === 'RETRACT' && this.claw.grabbedItem) {
            if (this.dynamite > 0) {
                this.dynamite--;
                document.getElementById('dynamiteValue').textContent = this.dynamite;
                
                AudioSynth.playDynamiteSound();
                AudioSynth.playExplosionSound();
                
                // Smoke particle burst at claw position
                this.spawnExplosionParticles(this.claw.x, this.claw.y, 15);
                this.triggerScreenShake();
                
                // Score indicator showing destroyed text (optional)
                this.spawnFloatingScore(this.claw.x, this.claw.y - 20, '💥 BOOM!', 'score-red');
                
                // Destroy grabbed item
                this.claw.grabbedItem.destroyed = true;
                this.claw.grabbedItem = null;
                this.setMinerState('WORRIED', 1000);
                this.checkGoldCleared();
            } else {
                this.spawnFloatingScore(this.claw.x, this.claw.y - 20, 'No Dynamite!', 'score-red');
            }
        }
    },

    triggerTNTGameOver(tntItem) {
        tntItem.destroyed = true;
        AudioSynth.playExplosionSound();
        
        // Big explosion particles
        this.spawnExplosionParticles(tntItem.x, tntItem.y, 50);
        this.triggerScreenShake();
        
        // Destroy adjacent items in 135px radius
        const explosionRadius = 135;
        for (let item of this.items) {
            if (item.destroyed || item === tntItem) continue;
            
            const dist = Math.hypot(item.x - tntItem.x, item.y - tntItem.y);
            if (dist < explosionRadius) {
                item.destroyed = true;
                this.spawnExplosionParticles(item.x, item.y, 10);
                this.spawnFloatingScore(item.x, item.y - 15, '💥', 'score-red');
            }
        }
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.claw.grabbedItem = null;
        this.state = 'PAUSED';
        this.setMinerState('WORRIED', 3000);
        
        setTimeout(() => {
            this.autoSaveScore();
            this.showOverlay('gameOverOverlay');
            document.getElementById('finalScore').textContent = this.cash;
            document.getElementById('playerNameInput').value = '';
            document.getElementById('gameOverReason').textContent = '💥 คุณโดนระเบิด! Game Over';
        }, 700);
    },

    checkGoldCleared() {
        const remainingGold = this.items.filter(item => !item.destroyed && item.type.includes('GOLD')).length;
        if (remainingGold === 0) {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            setTimeout(() => {
                this.hideOverlay('quizOverlay');
                this.endLevel();
            }, 1000);
            return true;
        }
        return false;
    },

    collectItem(item) {
        if (item.destroyed) return;
        
        // If item is a rock (ROCK_L or ROCK_S), SKULL, or BONE, deduct money and DO NOT show quiz
        if (item.type.includes('ROCK') || item.type === 'SKULL' || item.type === 'BONE') {
            const penalty = item.value || 15;
            this.cash -= penalty;
            AudioSynth.playGrabSound();
            this.spawnFloatingScore(item.x, item.y - 25, `-$${penalty}`, 'score-red');
            this.setMinerState('WORRIED', 1200);
            item.destroyed = true;
            this.updateHUD();
            this.checkGoldCleared();
            return;
        }

        // Pause timer countdown
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Temporarily pause hook oscillation physics while answering the quiz
        this.state = 'PAUSED';
        this.triggerQuiz(item);
    },

    triggerQuiz(item) {
        if (!this.questions || this.questions.length === 0) {
            this.loadFallbackQuestions();
        }
        
        // Refill unused questions list if empty
        if (!this.unusedQuestions || this.unusedQuestions.length === 0) {
            this.unusedQuestions = [...this.questions];
        }
        
        // Select random question from unused questions
        const randIdx = Math.floor(Math.random() * this.unusedQuestions.length);
        const q = this.unusedQuestions[randIdx];
        this.currentQuestion = q;
        
        // Remove question from list so it doesn't repeat
        this.unusedQuestions.splice(randIdx, 1);
        
        const label = ITEM_TYPES[item.type].label;
        document.getElementById('quizItemSummary').innerHTML = `กำลังขุด: <strong style="color: #ffea00;">${label}</strong> (มูลค่า: <strong style="color: #ffea00;">$${item.value}</strong>)`;
        document.getElementById('quizQuestionText').textContent = q.question;
        
        const container = document.getElementById('quizChoicesContainer');
        container.innerHTML = '';
        
        const fb = document.getElementById('quizFeedbackPanel');
        fb.style.display = 'none';
        fb.className = '';
        
        // Render 4 options
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn-choice';
            btn.textContent = opt;
            btn.addEventListener('click', () => this.submitQuizAnswer(btn, opt, item));
            container.appendChild(btn);
        });
        
        // Setup 10-second Quiz Countdown Timer
        if (this.quizTimerInterval) {
            clearInterval(this.quizTimerInterval);
            this.quizTimerInterval = null;
        }

        const totalQuizTime = (typeof TimeStampManager !== 'undefined' && TimeStampManager.quizTimeLimit) ? TimeStampManager.quizTimeLimit : 10;
        this.quizStartTime = Date.now();
        
        const timerValEl = document.getElementById('quizTimerValue');
        const timerBarEl = document.getElementById('quizTimerBar');
        const timerBadgeEl = document.getElementById('quizTimerBadge');
        
        if (timerValEl) timerValEl.textContent = totalQuizTime;
        if (timerBarEl) {
            timerBarEl.style.width = '100%';
            timerBarEl.style.background = 'linear-gradient(90deg, #4cd964, #ffcc00, #ff3b30)';
        }
        if (timerBadgeEl) {
            timerBadgeEl.style.borderColor = '#ff4d4d';
            timerBadgeEl.style.color = '#ff4d4d';
        }

        this.quizTimerInterval = setInterval(() => {
            const elapsed = (Date.now() - this.quizStartTime) / 1000;
            const remaining = Math.max(0, totalQuizTime - elapsed);
            const remainingSec = Math.ceil(remaining);
            
            if (timerValEl) timerValEl.textContent = remainingSec;
            if (timerBarEl) {
                const percent = (remaining / totalQuizTime) * 100;
                timerBarEl.style.width = `${percent}%`;
            }

            if (remainingSec <= 3 && timerBadgeEl) {
                timerBadgeEl.style.borderColor = '#ff0000';
                timerBadgeEl.style.color = '#ff0000';
            }

            if (remaining <= 0) {
                clearInterval(this.quizTimerInterval);
                this.quizTimerInterval = null;
                this.handleQuizTimeout(item);
            }
        }, 100);

        this.showOverlay('quizOverlay');
    },

    handleQuizTimeout(item) {
        const q = this.currentQuestion;
        if (!q) return;

        // Disable all choice buttons and append (เฉลย) tag to the correct answer
        const buttons = document.querySelectorAll('.btn-choice');
        buttons.forEach(btn => {
            btn.disabled = true;
            if (btn.textContent.trim() === q.answer.trim()) {
                btn.classList.add('correct');
                btn.innerHTML = `${q.answer} <span style="color: #4cd964; font-weight: bold; margin-left: 8px;">✅ (เฉลย)</span>`;
            }
        });

        // Log timestamp event for timeout
        if (typeof TimeStampManager !== 'undefined') {
            TimeStampManager.logQuizEvent(q.question, null, q.answer, false, 10.0);
        }

        const fb = document.getElementById('quizFeedbackPanel');
        fb.style.display = 'block';
        fb.className = 'feedback-incorrect';
        fb.innerHTML = `⏰ หมดเวลา 10 วินาที! <br><span style="font-size: 22px; color: #ffea00;">เฉลยข้อที่ถูกต้องคือ: "${q.answer}"</span> 😢`;

        AudioSynth.playGrabSound(); // buzzer sound
        this.spawnFloatingScore(item.x, item.y - 25, `Time Out! ($0)`, 'score-red');
        this.setMinerState('WORRIED', 2000);

        item.destroyed = true;
        this.updateHUD();

        const goldCleared = this.checkGoldCleared();
        if (!goldCleared) {
            // Keep correct answer revealed on screen for 3 seconds before resuming
            setTimeout(() => {
                this.hideOverlay('quizOverlay');
                this.state = 'PLAYING';
                this.resumeTimer();
            }, 3000);
        }
    },

    submitQuizAnswer(clickedBtn, selectedOption, item) {
        if (this.quizTimerInterval) {
            clearInterval(this.quizTimerInterval);
            this.quizTimerInterval = null;
        }

        const q = this.currentQuestion;
        const isCorrect = selectedOption === q.answer;
        const timeSpent = this.quizStartTime ? (Date.now() - this.quizStartTime) / 1000 : 0;
        
        // Log timestamp event
        if (typeof TimeStampManager !== 'undefined') {
            TimeStampManager.logQuizEvent(q.question, selectedOption, q.answer, isCorrect, timeSpent);
        }
        
        // Disable choices and highlight correct option (เฉลย)
        const buttons = document.querySelectorAll('.btn-choice');
        buttons.forEach(btn => {
            btn.disabled = true;
            if (btn.textContent.trim() === q.answer.trim()) {
                btn.classList.add('correct');
                if (!isCorrect) {
                    btn.innerHTML = `${q.answer} <span style="color: #4cd964; font-weight: bold; margin-left: 8px;">✅ (เฉลย)</span>`;
                }
            } else if (btn === clickedBtn && !isCorrect) {
                btn.classList.add('incorrect');
                btn.innerHTML = `${selectedOption} <span style="color: #ff3b30; font-weight: bold; margin-left: 8px;">❌</span>`;
            }
        });
        
        const fb = document.getElementById('quizFeedbackPanel');
        fb.style.display = 'block';
        
        let finalVal = item.value;
        let scoreClass = 'score-yellow';
        
        if (item.type.includes('ROCK') && this.hasRockBook) {
            finalVal *= 3;
            scoreClass = 'score-green';
        }
        if (item.type === 'DIAMOND' && this.hasDiamondPolish) {
            finalVal = Math.floor(finalVal * 1.5);
            scoreClass = 'score-green';
        }
        
        if (isCorrect) {
            fb.className = 'feedback-correct';
            
            if (item.type === 'MYSTERY_BAG') {
                AudioSynth.playBagSound();
                const roll = Math.random();
                if (roll < 0.60) {
                    const minCash = this.hasClover ? 300 : 100;
                    const maxCash = this.hasClover ? 1200 : 700;
                    const randomVal = Math.floor(minCash + Math.random() * (maxCash - minCash));
                    this.cash += randomVal;
                    fb.textContent = `ตอบถูก! เปิดถุงสมบัติพบเงิน $${randomVal}! 💰`;
                    this.spawnFloatingScore(item.x, item.y - 25, `+$${randomVal}`, 'score-green');
                } else if (roll < 0.80) {
                    const count = this.hasClover ? 2 : 1;
                    this.dynamite += count;
                    document.getElementById('dynamiteValue').textContent = this.dynamite;
                    fb.textContent = `ตอบถูก! เปิดถุงสมบัติพบไดนาไมต์ +${count} ลูก! 🧨`;
                    this.spawnFloatingScore(item.x, item.y - 25, `+${count} Dynamite!`, 'score-green');
                } else {
                    this.hasStrengthDrink = true;
                    fb.textContent = `ตอบถูก! เปิดถุงสมบัติพบน้ำยาเพิ่มพลัง! 💪`;
                    this.spawnFloatingScore(item.x, item.y - 25, `Strength Drink!`, 'score-green');
                }
            } else {
                if (item.type === 'DIAMOND') {
                    AudioSynth.playDiamondSound();
                } else {
                    AudioSynth.playGoldSound(item.weight);
                }
                
                const reward = finalVal + 50; // $50 bonus for correct
                this.cash += reward;
                fb.textContent = `ตอบถูก! ได้รับเงิน $${finalVal} + โบนัสภาษาอังกฤษ $50! 🌟`;
                this.spawnFloatingScore(item.x, item.y - 25, `+$${reward}`, 'score-green');
            }
            
            this.setMinerState('HAPPY', 1500);
        } else {
            fb.className = 'feedback-incorrect';
            fb.innerHTML = `Incorrect! เฉลยข้อที่ถูกต้องคือ: <strong style="color: #ffea00;">"${q.answer}"</strong> 😢`;
            
            AudioSynth.playGrabSound(); // play buzzer
            this.spawnFloatingScore(item.x, item.y - 25, `$0 Lost!`, 'score-red');
            this.setMinerState('WORRIED', 1500);
        }
        
        item.destroyed = true;
        this.updateHUD();
        
        const goldCleared = this.checkGoldCleared();
        if (!goldCleared) {
            // Wait 2.5 seconds, then transition back to gameplay
            setTimeout(() => {
                this.hideOverlay('quizOverlay');
                this.state = 'PLAYING';
                this.resumeTimer();
            }, 2500);
        }
    },

    setMinerState(state, duration) {
        this.minerState = state;
        this.minerReactionTimer = duration;
    },

    // --- SCREEN EFFECTS & FLOATING SCORE ---
    triggerScreenShake() {
        this.container.classList.add('shake');
        setTimeout(() => {
            this.container.classList.remove('shake');
        }, 400);
    },

    spawnFloatingScore(x, y, text, cssClass = 'score-yellow') {
        const div = document.createElement('div');
        div.className = `floating-score ${cssClass}`;
        div.textContent = text;
        
        // Translate coords because layer is absolute in gameContainer
        div.style.left = `${x}px`;
        div.style.top = `${y}px`;
        
        this.floatingLayer.appendChild(div);
        
        setTimeout(() => {
            div.remove();
        }, 1200);
    },

    // --- PARTICLE SYSTEMS ---
    spawnExplosionParticles(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 8;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (Math.random() * 2), // upward bias
                size: 8 + Math.random() * 16,
                color: Math.random() < 0.4 ? '#ff9f1c' : (Math.random() < 0.7 ? '#e63946' : '#6c757d'),
                alpha: 1.0,
                decay: 0.015 + Math.random() * 0.02,
                type: Math.random() < 0.6 ? 'smoke' : 'spark',
                gravity: 0.1,
                spin: (Math.random() - 0.5) * 0.1,
                angle: Math.random() * Math.PI * 2
            });
        }
    },

    spawnShineParticles(x, y, color = '#ffffff') {
        if (Math.random() < 0.04) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: 0,
                vy: -0.2,
                size: 4 + Math.random() * 4,
                color,
                alpha: 1.0,
                decay: 0.02,
                type: 'shine',
                gravity: 0,
                spin: 0.05,
                angle: Math.random() * Math.PI
            });
        }
    },

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity || 0;
            p.angle += p.spin || 0;
            p.alpha -= p.decay;
            
            if (p.type === 'smoke') {
                p.size += 0.4; // smoke expands
            }
            
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    },

    drawParticles(ctx) {
        ctx.save();
        for (let p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.strokeStyle = p.color;
            
            if (p.type === 'smoke') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'spark') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'shine') {
                // Draw 4-point star shape
                ctx.beginPath();
                const s = p.size;
                ctx.moveTo(p.x - s, p.y);
                ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - s);
                ctx.quadraticCurveTo(p.x, p.y, p.x + s, p.y);
                ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + s);
                ctx.quadraticCurveTo(p.x, p.y, p.x - s, p.y);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }
        }
        ctx.restore();
    },

    // --- GAME STATE TRANSITIONS ---
    startGame() {
        AudioSynth.init();
        
        // Ensure name is saved immediately when starting
        const startInput = document.getElementById('playerNameInputStart');
        if (startInput) {
            const name = startInput.value.trim();
            if (name) {
                localStorage.setItem('goldminer_player_name', name);
            }
        }
        
        this.hideAllOverlays();
        this.showOverlay('checkpointOverlay');
    },

    startFromLevel(lvl) {
        AudioSynth.init();
        
        this.cash = 0;
        this.level = lvl;
        // Give dynamite if starting from higher checkpoint
        this.dynamite = (lvl > 1) ? (lvl - 1) * 2 : 0;
        this.targetScore = this.calculateTargetScore(lvl);
        
        // Reset inventory
        this.resetLevelUpgrades();
        
        // Reset unused questions list for a new game session
        this.unusedQuestions = [...this.questions];
        
        this.hideAllOverlays();
        this.startLevel();
    },

    startLevel() {
        this.timeLeft = 60;
        this.claw.state = 'SWING';
        this.claw.angle = 0;
        this.claw.length = this.claw.minLength;
        this.claw.grabbedItem = null;
        this.minerState = 'IDLE';
        
        this.generateItems();
        this.particles = [];
        
        this.updateHUD();
        this.state = 'PLAYING';
        
        this.resumeTimer();
    },

    resumeTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.state === 'PLAYING') {
                this.timeLeft--;
                document.getElementById('timeValue').textContent = this.timeLeft;
                
                // Danger flashing
                const timerBox = document.getElementById('timerBox');
                if (this.timeLeft <= 10) {
                    timerBox.classList.add('warning');
                } else {
                    timerBox.classList.remove('warning');
                }

                if (this.timeLeft <= 0) {
                    clearInterval(this.timerInterval);
                    this.endLevel();
                }
            }
        }, 1000);
    },

    endLevel() {
        this.state = 'PAUSED';
        
        if (this.cash >= this.targetScore) {
            if (this.level === 3) {
                // Game Completed!
                this.autoSaveScore();
                this.showOverlay('gameOverOverlay');
                
                const titleEl = document.querySelector('#gameOverOverlay .overlay-title');
                if (titleEl) {
                    titleEl.textContent = 'ยินดีด้วย! คุณผ่านครบทุกด่านแล้ว 🎉';
                    titleEl.style.color = '#4cd964';
                }
                const reasonEl = document.getElementById('gameOverReason');
                if (reasonEl) {
                    reasonEl.textContent = 'คุณขุดทองสำเร็จครบทั้ง 3 ด่านเรียบร้อยแล้ว!';
                }
                document.getElementById('finalScore').textContent = this.cash;
                
                const savedName = localStorage.getItem('goldminer_player_name') || '';
                document.getElementById('playerNameInput').value = savedName;
            } else {
                // Level cleared!
                if (typeof CheckpointManager !== 'undefined') {
                    CheckpointManager.unlockLevel(this.level + 1);
                }
                
                // Change the button text based on whether there's a minigame transition (only for Level 1 -> 2)
                const goShopBtn = document.getElementById('goShopBtn');
                if (goShopBtn) {
                    if (this.level === 1) {
                        goShopBtn.innerHTML = 'ขึ้นรถไฟไปด่านถัดไป 🚂';
                    } else {
                        goShopBtn.innerHTML = 'ไปยังร้านค้า 🛒';
                    }
                }
                
                this.showOverlay('nextLevelOverlay');
                document.getElementById('transitionCash').textContent = this.cash;
                document.getElementById('transitionTarget').textContent = this.targetScore;
            }
        } else {
            // Failed to reach goal!
            this.autoSaveScore();
            this.showOverlay('gameOverOverlay');
            
            const titleEl = document.querySelector('#gameOverOverlay .overlay-title');
            if (titleEl) {
                titleEl.textContent = 'GAME OVER';
                titleEl.style.color = '#ff3b30';
            }
            document.getElementById('finalScore').textContent = this.cash;
            
            const savedName = localStorage.getItem('goldminer_player_name') || '';
            document.getElementById('playerNameInput').value = savedName;
            
            // Check if high score
            const minScore = this.highScores.length >= 5 ? this.highScores[this.highScores.length - 1].score : 0;
            const isNewHighScore = this.cash > minScore || this.highScores.length < 5;
            document.getElementById('gameOverReason').textContent = `คุณทำคะแนนสะสมไม่ถึงเป้าหมายของด่าน ($${this.targetScore})`;
        }
    },

    openShop() {
        this.resetLevelUpgrades();
        this.hideAllOverlays();
        this.state = 'SHOP';
        
        document.getElementById('shopCashValue').textContent = this.cash;
        
        const nextLevelNum = this.level + 1;
        // Target calculation: e.g. L1:650, L2:1500, L3:2500, L4:3750, L5:5150
        const nextGoal = this.calculateTargetScore(nextLevelNum);
        document.getElementById('shopNextGoal').textContent = nextGoal;
        
        // Generate shop items list
        this.generateShopItems();
        this.renderShop();
        
        this.showOverlay('shopOverlay');
    },

    startNextLevel() {
        this.level++;
        this.targetScore = this.calculateTargetScore(this.level);
        
        // Keep strength/clover/polish active for ONE level, reset flags that expire.
        // The flags will be applied, then reset at the end of the next level or during next shop.
        
        this.hideAllOverlays();
        this.startLevel();
    },

    restartGame() {
        this.hideAllOverlays();
        this.startGame();
    },

    goToMainMenu() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.hideAllOverlays();
        this.state = 'START';
        this.renderMenuHighScores();
        this.showOverlay('startOverlay');
    },

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.showOverlay('pauseOverlay');
        } else if (this.state === 'PAUSED' && document.getElementById('pauseOverlay').classList.contains('active')) {
            this.state = 'PLAYING';
            this.hideAllOverlays();
        }
    },

    calculateTargetScore(lvl) {
        if (lvl === 1) return 650;
        if (lvl === 2) return 1500;
        if (lvl === 3) return 2600;
        if (lvl === 4) return 3800;
        if (lvl === 5) return 5100;
        return 5100 + (lvl - 5) * 1500; // scaling
    },

    resetLevelUpgrades() {
        this.hasStrengthDrink = false;
        this.hasClover = false;
        this.hasRockBook = false;
        this.hasDiamondPolish = false;
    },

    // --- LEADERBOARD & LOCAL STORAGE ---
    loadHighScores() {
        const stored = localStorage.getItem('goldMiner_highscores');
        if (stored) {
            try {
                this.highScores = JSON.parse(stored);
                // Remove previous default/mock scores
                this.highScores = this.highScores.filter(e => 
                    e.name !== 'Old Miner' && 
                    e.name !== 'Sourdough' && 
                    e.name !== 'Diggy' && 
                    e.name !== 'นักขุดรุ่นเก๋า' && 
                    e.name !== 'เซียนขุดทอง' && 
                    e.name !== 'นักขุดจิ๋ว'
                );
                this.saveHighScoresToStorage();
            } catch (e) {
                this.highScores = [];
            }
        } else {
            // Clean empty leaderboard (no old mock scores)
            this.highScores = [];
            this.saveHighScoresToStorage();
        }
    },

    saveHighScoresToStorage() {
        localStorage.setItem('goldMiner_highscores', JSON.stringify(this.highScores));
    },

    autoSaveScore() {
        // Read directly from the start screen input first
        const startInput = document.getElementById('playerNameInputStart');
        let name = startInput ? startInput.value.trim() : '';
        
        // If empty, fall back to localStorage
        if (!name) {
            name = localStorage.getItem('goldminer_player_name');
        } else {
            // Update localStorage with the latest name
            localStorage.setItem('goldminer_player_name', name);
        }
        
        if (!name) {
            name = 'คนขุดทอง'; // Default name
        }
        
        let customPhoto = null;
        if (typeof minerPhoto !== 'undefined' && minerPhoto.src && minerPhoto.src.length > 0) {
            customPhoto = minerPhoto.src;
        } else {
            customPhoto = localStorage.getItem('goldminer_custom_photo');
        }

        const record = {
            name: name,
            score: this.cash,
            level: this.level,
            photo: customPhoto || null,
            date: new Date().toISOString().split('T')[0]
        };
        
        let existingIndex = this.highScores.findIndex(e => e.name === name);
        if (existingIndex !== -1) {
            // Update if score is higher
            if (this.cash > this.highScores[existingIndex].score) {
                this.highScores[existingIndex].score = this.cash;
                this.highScores[existingIndex].level = Math.max(this.highScores[existingIndex].level, this.level);
                this.highScores[existingIndex].photo = customPhoto || this.highScores[existingIndex].photo;
                this.highScores[existingIndex].date = record.date;
            }
        } else {
            this.highScores.push(record);
        }
        
        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, 5);
        
        this.saveHighScoresToStorage();
        this.renderMenuHighScores();
    },

    saveCurrentScore() {
        const nameInput = document.getElementById('playerNameInput');
        const name = nameInput.value.trim() || 'ผู้เล่นนิรนาม';
        
        // Save current captured face photo Data URL
        let customPhoto = null;
        if (typeof minerPhoto !== 'undefined' && minerPhoto.src && minerPhoto.src.length > 0) {
            customPhoto = minerPhoto.src;
        } else {
            customPhoto = localStorage.getItem('goldminer_custom_photo');
        }

        const record = {
            name,
            score: this.cash,
            level: this.level,
            photo: customPhoto || null,
            date: new Date().toISOString().split('T')[0]
        };
        
        this.highScores.push(record);
        // Sort descending
        this.highScores.sort((a, b) => b.score - a.score);
        // Keep top 5
        this.highScores = this.highScores.slice(0, 5);
        
        this.saveHighScoresToStorage();
        this.renderMenuHighScores();
        
        // Disable input and show saved status
        nameInput.disabled = true;
        const saveBtn = document.getElementById('saveScoreBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'บันทึกแล้ว!';
    },

    renderMenuHighScores() {
        const container = document.getElementById('highScoresContainer');
        if (!container) return;
        container.innerHTML = '';
        
        if (!this.highScores || this.highScores.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #a3958c; padding: 24px 10px; font-size: 14px; line-height: 1.6;">
                    ยังไม่มีสถิติคะแนน<br>
                    <span style="color: #ffea00; font-size: 13px;">📷 ถ่ายรูปและเล่นเกมเพื่อชิงอันดับ 1! 🏆</span>
                </div>
            `;
            return;
        }

        const badges = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        this.highScores.forEach((entry, i) => {
            const div = document.createElement('div');
            div.className = 'high-score-item';
            
            const photoSrc = entry.photo || 'miner.png';
            const avatarHtml = `<img src="${photoSrc}" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #ffea00; object-fit: cover; background: #222;" onerror="this.src='miner.png'">`;

            div.innerHTML = `
                <div class="rank-badge" style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px; min-width: 24px; text-align: center;">${badges[i] || '🏅'}</span>
                    ${avatarHtml}
                    <span class="rank-name" style="font-weight: bold; color: #ffffff;">${entry.name}</span>
                </div>
                <div class="rank-level" style="color: #d4a373; font-size: 13px;">ด่าน ${entry.level}</div>
                <div class="rank-score" style="color: #ffea00; font-weight: bold; font-size: 16px;">$${entry.score}</div>
            `;
            container.appendChild(div);
        });
    },

    // --- SHOP LOGIC ---
    generateShopItems() {
        // Base shop items layout
        const itemsList = [
            { id: 'dynamite', name: 'ไดนาไมต์', price: 150, icon: '🧨', desc: 'กดปุ่ม ลูกศรขึ้น เพื่อระเบิดสมบัติที่ไม่ต้องการขณะดึง' },
            { id: 'strength', name: 'น้ำยาเพิ่มพลัง', price: 220, icon: '💪', desc: 'ดึงสมบัติหนักๆ ขึ้นมาได้เร็วขึ้น 45% ในด่านถัดไป' },
            { id: 'clover', name: 'คลอเวอร์นำโชค', price: 120, icon: '🍀', desc: 'เพิ่มโอกาสสุ่มได้เงินและของดีราคาแพงจากถุงปริศนา' },
            { id: 'rockbook', name: 'ตำราเรียนเรื่องหิน', price: 90, icon: '📖', desc: 'เพิ่มมูลค่าของก้อนหินทุกชนิดเป็น 3 เท่าในด่านถัดไป' },
            { id: 'polish', name: 'น้ำยาขัดเงาเพชร', price: 160, icon: '💎', desc: 'เพิ่มมูลค่าของเพชรขึ้นอีก 50% ในด่านถัดไป' }
        ];

        // Randomize price factor (0.8x to 1.3x)
        this.shopItems = itemsList.map(item => {
            const factor = 0.8 + Math.random() * 0.5;
            let finalPrice = Math.round(item.price * factor);
            
            // Limit minimum prices
            finalPrice = Math.max(finalPrice, 40);
            
            return {
                ...item,
                price: finalPrice,
                soldOut: false
            };
        });
        
        // Randomly make 1 item "Sold Out" from start to simulate real shop stock!
        if (Math.random() < 0.4) {
            const randIdx = Math.floor(Math.random() * this.shopItems.length);
            // Don't sell out dynamite, it's a staple!
            if (this.shopItems[randIdx].id !== 'dynamite') {
                this.shopItems[randIdx].soldOut = true;
            }
        }
    },

    renderShop() {
        const grid = document.getElementById('shopItemsGrid');
        grid.innerHTML = '';
        
        this.shopItems.forEach((item) => {
            const card = document.createElement('div');
            card.className = `shop-card ${item.soldOut ? 'sold-out' : ''}`;
            
            let isAffordable = this.cash >= item.price;
            let buttonText = 'ซื้อ';
            
            // Check if player already bought this (except dynamite)
            if (item.id === 'strength' && this.hasStrengthDrink) buttonText = 'มีแล้ว';
            if (item.id === 'clover' && this.hasClover) buttonText = 'มีแล้ว';
            if (item.id === 'rockbook' && this.hasRockBook) buttonText = 'มีแล้ว';
            if (item.id === 'polish' && this.hasDiamondPolish) buttonText = 'มีแล้ว';
            
            const btnDisabled = item.soldOut || !isAffordable || buttonText === 'มีแล้ว';
            
            card.innerHTML = `
                <div class="shop-item-icon">${item.icon}</div>
                <div class="shop-item-name">${item.name}</div>
                <div class="shop-item-desc">${item.desc}</div>
                <div class="shop-item-price">$${item.price}</div>
                <button class="btn-buy" ${btnDisabled ? 'disabled' : ''} onclick="Game.buyShopItem('${item.id}', ${item.price})">
                    ${buttonText}
                </button>
            `;
            
            grid.appendChild(card);
        });
    },

    buyShopItem(id, price) {
        if (this.cash >= price) {
            this.cash -= price;
            AudioSynth.playBuySound();
            
            if (id === 'dynamite') {
                this.dynamite++;
                document.getElementById('dynamiteValue').textContent = this.dynamite;
            } else {
                if (id === 'strength') this.hasStrengthDrink = true;
                if (id === 'clover') this.hasClover = true;
                if (id === 'rockbook') this.hasRockBook = true;
                if (id === 'polish') this.hasDiamondPolish = true;
                
                // Mark item as sold out in our list
                const shopItem = this.shopItems.find(i => i.id === id);
                if (shopItem) shopItem.soldOut = true;
            }
            
            // Re-render shop
            document.getElementById('shopCashValue').textContent = this.cash;
            this.updateHUD();
            this.renderShop();
        }
    },

    // --- PROCEDURAL LEVEL GENERATION ---
    generateItems() {
        this.items = [];
        
        // Standard item density based on level
        const levelFactor = this.level;
        
        // Spawn categories counts
        const counts = {
            GOLD_L: 1 + (Math.random() < 0.4 ? 1 : 0),
            GOLD_M: 2 + Math.floor(Math.random() * 2),
            GOLD_S: 3 + Math.floor(Math.random() * 2),
            GOLD_XS: 2 + Math.floor(Math.random() * 3),
            ROCK_L: 1 + Math.floor(levelFactor * 0.6),
            ROCK_S: 2 + Math.floor(levelFactor * 0.8),
            DIAMOND: 1 + Math.floor(levelFactor * 0.4),
            MYSTERY_BAG: 1 + Math.floor(levelFactor * 0.25),
            TNT: 1 + Math.floor(levelFactor * 0.5),
            BONE: 2 + Math.floor(levelFactor * 0.4),
            SKULL: 1 + Math.floor(levelFactor * 0.3),
            GOPHER: Math.min(1 + Math.floor(levelFactor * 0.3), 4)
        };

        // Limits to prevent too overcrowded canvas
        counts.TNT = Math.min(counts.TNT, 6);
        counts.ROCK_L = Math.min(counts.ROCK_L, 5);

        // Generate each category
        for (let type in counts) {
            const qty = counts[type];
            const def = ITEM_TYPES[type];
            
            for (let i = 0; i < qty; i++) {
                this.spawnSingleItem(type, def);
            }
        }
    },

    spawnSingleItem(type, def) {
        let attempts = 0;
        let spawned = false;
        
        while (attempts < 60 && !spawned) {
            attempts++;
            // Layout dimensions:
            // x: 40 to 920, y: 190 to 560
            const x = 40 + Math.random() * (GAME_WIDTH - 80);
            const y = 190 + Math.random() * (GAME_HEIGHT - 240);
            
            // Check distance from winch origin to prevent item spawning right on claw
            const distFromOrigin = Math.hypot(x - this.claw.originX, y - this.claw.originY);
            if (distFromOrigin < 150) continue;
            
            // Check overlapping with existing items
            let overlap = false;
            for (let other of this.items) {
                const itemDist = Math.hypot(x - other.x, y - other.y);
                if (itemDist < (def.radius + other.radius) * 1.35) {
                    overlap = true;
                    break;
                }
            }
            
            if (!overlap) {
                // Initialize Item values
                const item = {
                    type,
                    x,
                    y,
                    radius: def.radius,
                    weight: def.weight,
                    value: def.value,
                    grabbed: false,
                    destroyed: false,
                    angle: Math.random() * Math.PI * 2
                };
                
                // Specific item initializers
                if (type.includes('GOLD') || type.includes('ROCK')) {
                    // pre-generate vertex bumpy offsets so shape is consistent
                    const pointsCount = type.includes('L') ? 10 : 7;
                    item.points = [];
                    for (let p = 0; p < pointsCount; p++) {
                        // Max variation 15% of radius
                        item.points.push((Math.random() - 0.5) * def.radius * 0.3);
                    }
                    
                    // Shading colors
                    if (type.includes('GOLD')) {
                        item.color = type.includes('L') ? '#e5a93b' : '#ffea00';
                    } else {
                        item.color = Math.random() < 0.5 ? '#8d99ae' : '#7f5539';
                    }
                }
                
                if (type === 'GOPHER') {
                    // Moves horizontally
                    item.vx = (0.5 + Math.random() * 1.5) * (Math.random() < 0.5 ? 1 : -1);
                    // 35% chance gopher carries a diamond!
                    item.hasDiamond = Math.random() < 0.35;
                    if (item.hasDiamond) {
                        item.value += 500; // Adds diamond value
                        item.weight += 0.5; // Slightly heavier
                        item.vx *= 1.25; // Scurries faster!
                    }
                }
                
                this.items.push(item);
                spawned = true;
            }
        }
    },

    // --- HUD AND MODAL HELPERS ---
    updateHUD() {
        document.getElementById('cashValue').textContent = this.cash;
        document.getElementById('goalValue').textContent = `$${this.targetScore}`;
        document.getElementById('levelValue').textContent = this.level;
        document.getElementById('dynamiteValue').textContent = this.dynamite;
        document.getElementById('timeValue').textContent = this.timeLeft;
    },

    showOverlay(id) {
        document.getElementById(id).classList.add('active');
    },

    hideOverlay(id) {
        if (id === 'quizOverlay' && this.quizTimerInterval) {
            clearInterval(this.quizTimerInterval);
            this.quizTimerInterval = null;
        }
        document.getElementById(id).classList.remove('active');
    },

    hideAllOverlays() {
        if (this.quizTimerInterval) {
            clearInterval(this.quizTimerInterval);
            this.quizTimerInterval = null;
        }
        const overlays = document.querySelectorAll('.overlay');
        overlays.forEach(o => o.classList.remove('active'));
    },

    // --- RENDER ROUTINES ---
    drawBackground(ctx) {
        // 1. Sky/Surface Area (Top 130px)
        const skyGrad = ctx.createLinearGradient(0, 0, 0, DIRT_START_Y);
        skyGrad.addColorStop(0, '#ff9f1c'); // warm sunset orange
        skyGrad.addColorStop(1, '#ffbf69');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, GAME_WIDTH, DIRT_START_Y);
        
        // Draw some distant mountains in the background
        ctx.fillStyle = '#cc5a01';
        ctx.beginPath();
        ctx.moveTo(0, DIRT_START_Y);
        ctx.lineTo(150, 40);
        ctx.lineTo(300, DIRT_START_Y);
        ctx.lineTo(450, 60);
        ctx.lineTo(600, DIRT_START_Y);
        ctx.lineTo(750, 30);
        ctx.lineTo(960, DIRT_START_Y);
        ctx.closePath();
        ctx.fill();

        // 2. Ledge / Ground separator line
        ctx.fillStyle = '#8f4f1e';
        ctx.fillRect(0, DIRT_START_Y - 8, GAME_WIDTH, 8);
        
        // 3. Underground Area (Deep Dirt)
        // Draw layers of brown dirt
        const dirtGrad = ctx.createLinearGradient(0, DIRT_START_Y, 0, GAME_HEIGHT);
        dirtGrad.addColorStop(0, '#582f0e'); // rich brown
        dirtGrad.addColorStop(0.5, '#462507'); // deeper
        dirtGrad.addColorStop(1, '#331800'); // bottom-most dark brown
        ctx.fillStyle = dirtGrad;
        ctx.fillRect(0, DIRT_START_Y, GAME_WIDTH, GAME_HEIGHT - DIRT_START_Y);
        
        // Draw wavy lines to represent soil strata
        ctx.strokeStyle = '#2d1500';
        ctx.lineWidth = 4;
        ctx.beginPath();
        // Layer 1
        ctx.moveTo(0, 240);
        ctx.bezierCurveTo(240, 280, 480, 200, 720, 260);
        ctx.lineTo(960, 240);
        // Layer 2
        ctx.moveTo(0, 400);
        ctx.bezierCurveTo(300, 370, 600, 450, 960, 390);
        ctx.stroke();
        
        // Draw little pebbles/spots in the dirt for texture
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        for (let i = 0; i < 40; i++) {
            // Seeded or static-looking dots (can generate once if we want, or just draw random-looking coords using level-based math to keep it static!)
            const px = (Math.sin(i * 123.45) * 0.5 + 0.5) * GAME_WIDTH;
            const py = DIRT_START_Y + 30 + ((Math.cos(i * 987.6) * 0.5 + 0.5) * (GAME_HEIGHT - DIRT_START_Y - 50));
            const r = 2 + (i % 4);
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    drawItems(ctx) {
        for (let item of this.items) {
            if (item.destroyed) continue;
            
            // Draw diamond sparkles & gold glimmers
            if (!item.grabbed) {
                if (item.type === 'DIAMOND') {
                    this.spawnShineParticles(item.x, item.y, '#00f0ff');
                } else if (item.type.includes('GOLD')) {
                    this.spawnShineParticles(item.x, item.y, '#ffea00');
                }
            }

            const r = item.radius;
            
            ctx.save();
            
            if (item.type.includes('GOLD')) {
                // Irregular gold polygonal path
                ctx.beginPath();
                for (let i = 0; i < item.points.length; i++) {
                    const angle = (i / item.points.length) * Math.PI * 2;
                    const radiusOffset = item.points[i];
                    const px = item.x + Math.sin(angle) * (r + radiusOffset);
                    const py = item.y + Math.cos(angle) * (r + radiusOffset);
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                
                // Shiny gold gradient shading
                const grad = ctx.createRadialGradient(item.x - r*0.3, item.y - r*0.3, r*0.1, item.x, item.y, r);
                grad.addColorStop(0, '#fff3a8');
                grad.addColorStop(0.3, item.color);
                grad.addColorStop(1, '#8f5c00');
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.strokeStyle = '#573700';
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }
            else if (item.type.includes('ROCK')) {
                // Gray bumpy rock
                ctx.beginPath();
                for (let i = 0; i < item.points.length; i++) {
                    const angle = (i / item.points.length) * Math.PI * 2;
                    const radiusOffset = item.points[i];
                    const px = item.x + Math.sin(angle) * (r + radiusOffset);
                    const py = item.y + Math.cos(angle) * (r + radiusOffset);
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                
                const grad = ctx.createRadialGradient(item.x - r*0.3, item.y - r*0.3, r*0.1, item.x, item.y, r);
                grad.addColorStop(0, '#dedede');
                grad.addColorStop(0.4, item.color);
                grad.addColorStop(1, '#3a3a3a');
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.strokeStyle = '#242424';
                ctx.lineWidth = 2.5;
                ctx.stroke();
                
                // Draw cracked lines on the rock
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(item.x - r * 0.4, item.y - r * 0.2);
                ctx.lineTo(item.x + r * 0.2, item.y + r * 0.3);
                ctx.moveTo(item.x - r * 0.1, item.y + r * 0.4);
                ctx.lineTo(item.x + r * 0.4, item.y - r * 0.3);
                ctx.stroke();
            }
            else if (item.type === 'DIAMOND') {
                // Shiny cyan diamond gemstone
                ctx.beginPath();
                ctx.moveTo(item.x, item.y - r);
                ctx.lineTo(item.x + r, item.y - r * 0.3);
                ctx.lineTo(item.x + r * 0.5, item.y + r);
                ctx.lineTo(item.x - r * 0.5, item.y + r);
                ctx.lineTo(item.x - r, item.y - r * 0.3);
                ctx.closePath();
                
                const grad = ctx.createLinearGradient(item.x - r, item.y - r, item.x + r, item.y + r);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.3, '#38bdf8');
                grad.addColorStop(1, '#0284c7');
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.strokeStyle = '#e0f2fe';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                
                // draw diamond facets lines
                ctx.beginPath();
                ctx.moveTo(item.x - r, item.y - r * 0.3);
                ctx.lineTo(item.x + r, item.y - r * 0.3);
                ctx.moveTo(item.x - r * 0.5, item.y + r);
                ctx.lineTo(item.x - r * 0.5, item.y - r * 0.3);
                ctx.moveTo(item.x + r * 0.5, item.y + r);
                ctx.lineTo(item.x + r * 0.5, item.y - r * 0.3);
                ctx.moveTo(item.x, item.y - r);
                ctx.lineTo(item.x, item.y + r);
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.stroke();
            }
            else if (item.type === 'MYSTERY_BAG') {
                // Fabric sack
                // Bag base
                ctx.beginPath();
                ctx.arc(item.x, item.y + r * 0.25, r * 0.8, 0, Math.PI * 2);
                const grad = ctx.createRadialGradient(item.x - r*0.3, item.y, r*0.1, item.x, item.y, r);
                grad.addColorStop(0, '#f9c74f');
                grad.addColorStop(1, '#b07d0d');
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.strokeStyle = '#5f4304';
                ctx.lineWidth = 2.5;
                ctx.stroke();
                
                // Sack tied top ruffle
                ctx.beginPath();
                ctx.moveTo(item.x - r * 0.5, item.y - r * 0.35);
                ctx.quadraticCurveTo(item.x, item.y - r * 0.8, item.x + r * 0.5, item.y - r * 0.35);
                ctx.lineTo(item.x + r * 0.3, item.y - r * 0.1);
                ctx.lineTo(item.x - r * 0.3, item.y - r * 0.1);
                ctx.closePath();
                ctx.fillStyle = '#d4a373';
                ctx.fill();
                ctx.stroke();
                
                // Knot rope
                ctx.beginPath();
                ctx.ellipse(item.x, item.y - r * 0.2, r * 0.4, r * 0.1, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#ff3b30';
                ctx.fill();
                
                // Draw Red '?'
                ctx.font = `bold ${r * 1.15}px Fredoka`;
                ctx.fillStyle = '#e63946';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', item.x, item.y + r * 0.3);
            }
            else if (item.type === 'TNT') {
                // Wooden explosives barrel
                ctx.beginPath();
                ctx.ellipse(item.x, item.y, r * 0.85, r, 0, 0, Math.PI * 2);
                const grad = ctx.createRadialGradient(item.x - r*0.2, item.y, r*0.1, item.x, item.y, r);
                grad.addColorStop(0, '#f26419'); // fiery red-orange
                grad.addColorStop(1, '#861e08'); // dark crimson
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.strokeStyle = '#470a00';
                ctx.lineWidth = 2.5;
                ctx.stroke();
                
                // Black iron metal bands
                ctx.strokeStyle = '#1e1e1e';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.moveTo(item.x - r * 0.72, item.y - r * 0.5);
                ctx.lineTo(item.x + r * 0.72, item.y - r * 0.5);
                ctx.moveTo(item.x - r * 0.78, item.y + r * 0.5);
                ctx.lineTo(item.x + r * 0.78, item.y + r * 0.5);
                ctx.stroke();
                
                // TNT letters
                ctx.font = `bold ${r * 0.7}px Arial Black, sans-serif`;
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#000000';
                ctx.shadowBlur = 4;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('TNT', item.x, item.y);
                ctx.shadowBlur = 0; // reset
            }
            else if (item.type === 'BONE') {
                ctx.translate(item.x, item.y);
                ctx.rotate(item.angle);
                
                ctx.fillStyle = '#f5ebe0';
                ctx.strokeStyle = '#d5bdaf';
                ctx.lineWidth = 2;
                
                // Shaft
                ctx.fillRect(-r*0.7, -r*0.25, r*1.4, r*0.5);
                ctx.strokeRect(-r*0.7, -r*0.25, r*1.4, r*0.5);
                // Ends
                ctx.beginPath();
                ctx.arc(-r*0.7, -r*0.2, r*0.35, 0, Math.PI*2);
                ctx.arc(-r*0.7, r*0.2, r*0.35, 0, Math.PI*2);
                ctx.arc(r*0.7, -r*0.2, r*0.35, 0, Math.PI*2);
                ctx.arc(r*0.7, r*0.2, r*0.35, 0, Math.PI*2);
                ctx.fill();
                ctx.stroke();
            }
            else if (item.type === 'SKULL') {
                ctx.translate(item.x, item.y);
                
                ctx.fillStyle = '#f4f3ee';
                ctx.strokeStyle = '#bcb8b1';
                ctx.lineWidth = 2.5;
                
                // Bulbous cranium
                ctx.beginPath();
                ctx.arc(0, -r*0.15, r*0.75, 0, Math.PI*2);
                // Jaw structure
                ctx.rect(-r*0.35, r*0.4, r*0.7, r*0.45);
                ctx.fill();
                ctx.stroke();
                
                // Teeth slits
                ctx.beginPath();
                ctx.moveTo(-r*0.15, r*0.55); ctx.lineTo(-r*0.15, r*0.8);
                ctx.moveTo(0, r*0.55); ctx.lineTo(0, r*0.8);
                ctx.moveTo(r*0.15, r*0.55); ctx.lineTo(r*0.15, r*0.8);
                ctx.strokeStyle = '#8a817c';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Eyes & nasal cavities
                ctx.beginPath();
                ctx.arc(-r*0.22, -r*0.08, r*0.18, 0, Math.PI*2);
                ctx.arc(r*0.22, -r*0.08, r*0.18, 0, Math.PI*2);
                ctx.fillStyle = '#1e1e24';
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(0, r*0.12);
                ctx.lineTo(-r*0.08, r*0.25);
                ctx.lineTo(r*0.08, r*0.25);
                ctx.closePath();
                ctx.fillStyle = '#1e1e24';
                ctx.fill();
            }
            else if (item.type === 'GOPHER') {
                ctx.translate(item.x, item.y);
                if (item.vx < 0) ctx.scale(-1, 1); // Flip direction
                
                ctx.fillStyle = '#a06a42';
                ctx.strokeStyle = '#6f482b';
                ctx.lineWidth = 2;
                
                // Body
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 1.2, r * 0.9, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Cream belly
                ctx.beginPath();
                ctx.ellipse(r * 0.15, r * 0.15, r * 0.65, r * 0.48, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#e3c099';
                ctx.fill();
                
                // Head
                ctx.beginPath();
                ctx.arc(r * 0.7, -r * 0.35, r * 0.58, 0, Math.PI * 2);
                ctx.fillStyle = '#a06a42';
                ctx.fill();
                ctx.stroke();
                
                // Snout & Cheek
                ctx.beginPath();
                ctx.arc(r * 1.05, -r * 0.3, r * 0.12, 0, Math.PI * 2);
                ctx.fillStyle = '#ffcad4';
                ctx.fill();
                
                // Ears
                ctx.beginPath();
                ctx.arc(r * 0.42, -r * 0.88, r * 0.22, 0, Math.PI * 2);
                ctx.fillStyle = '#6f482b';
                ctx.fill();
                
                // Eye
                ctx.beginPath();
                ctx.arc(r * 0.78, -r * 0.45, r * 0.08, 0, Math.PI * 2);
                ctx.fillStyle = '#000000';
                ctx.fill();
                
                // Feet (simple circles)
                ctx.fillStyle = '#7a4e2d';
                ctx.beginPath();
                ctx.arc(-r*0.6, r*0.8, r*0.25, 0, Math.PI*2);
                ctx.arc(r*0.4, r*0.8, r*0.25, 0, Math.PI*2);
                ctx.fill();
                
                // Carry item logic
                if (item.hasDiamond) {
                    ctx.save();
                    ctx.translate(0, -r * 1.15);
                    ctx.scale(0.7, 0.7);
                    
                    const dr = 12;
                    ctx.beginPath();
                    ctx.moveTo(0, -dr);
                    ctx.lineTo(dr, -dr * 0.3);
                    ctx.lineTo(dr * 0.5, dr);
                    ctx.lineTo(-dr * 0.5, dr);
                    ctx.lineTo(-dr, -dr * 0.3);
                    ctx.closePath();
                    
                    const g = ctx.createLinearGradient(-dr, -dr, dr, dr);
                    g.addColorStop(0, '#fff');
                    g.addColorStop(1, '#00f0ff');
                    ctx.fillStyle = g;
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.restore();
                }
            }
            
            ctx.restore();
        }
    },

    drawClaw(ctx) {
        const ox = this.claw.originX;
        const oy = this.claw.originY;
        const cx = this.claw.x;
        const cy = this.claw.y;
        
        // Calculate exact angle of rope for synchronized rotation
        const ropeAngle = Math.atan2(cx - ox, cy - oy);
        
        // 1. Draw Rope
        ctx.strokeStyle = '#723d10';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        
        // Rope highlight coils (set dashes to look braided)
        ctx.strokeStyle = '#462406';
        ctx.lineWidth = 3.0;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.setLineDash([]); // Reset
        
        // 2. Draw Metal Hook head
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ropeAngle);
        
        // Dark steel connector
        ctx.fillStyle = '#495057';
        ctx.strokeStyle = '#212529';
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        ctx.arc(0, -6, 7, Math.PI, 0);
        ctx.rect(-7, -6, 14, 7);
        ctx.fill();
        ctx.stroke();
        
        // Determine pincer spread based on claw actions
        let spread = 0.5; // SWING (slightly open)
        if (this.claw.state === 'SHOOT') {
            spread = 0.95; // SHOOT (open wide)
        } else if (this.claw.state === 'RETRACT') {
            spread = this.claw.grabbedItem ? 0.15 : 0.4; // RETRACT (closed tight if holding)
        }
        
        // Pincer lines
        ctx.strokeStyle = '#adb5bd';
        ctx.lineWidth = 4.0;
        ctx.lineCap = 'round';
        
        // Left Pincer hook
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        // Bezier curving out and curving hook back inwards
        ctx.bezierCurveTo(
            -18 * Math.sin(spread), 12 * Math.cos(spread),
            -16 * Math.sin(spread), 24 * Math.cos(spread),
            -10, 24
        );
        ctx.bezierCurveTo(-5, 18, -2, 10, -2, 5);
        ctx.stroke();
        
        // Right Pincer hook
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.bezierCurveTo(
            18 * Math.sin(spread), 12 * Math.cos(spread),
            16 * Math.sin(spread), 24 * Math.cos(spread),
            10, 24
        );
        ctx.bezierCurveTo(5, 18, 2, 10, 2, 5);
        ctx.stroke();
        
        ctx.restore();
    }
};

// --- INITIALIZE GAME ON READY ---
window.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
