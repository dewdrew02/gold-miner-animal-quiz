// --- MINECART RUNNER TRANSITION MINI-GAME ---
// This module implements a side-scrolling 2D transition runner game between levels with slopes and pits.

// Extend AudioSynth with custom mini-game sounds
if (typeof AudioSynth !== 'undefined') {
    AudioSynth.playJumpSound = function() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.18);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
        
        osc.start();
        osc.stop(now + 0.18);
    };

    AudioSynth.playMiniGameHitSound = function() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.35);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        
        osc.start();
        osc.stop(now + 0.35);
    };

    AudioSynth.playFallingSound = function() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.55);
        
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.55);
        
        osc.start();
        osc.stop(now + 0.55);
    };
}

const MiniGame = {
    active: false,
    cash: 0,
    startCash: 0,
    distance: 0,
    targetDistance: 1000, // Duration ticks (~16.6s at 60fps)
    scrollSpeed: 4.2, // Slower train speed as requested! (was 6.5)
    totalScrollOffset: 0,
    
    // Player State
    player: {
        x: 150,
        y: 447, // Dynamic, sits on track (wheels baseline at trackY)
        vy: 0,
        width: 84,
        height: 85,
        state: 'RUNNING', // 'RUNNING', 'JUMPING', 'DUCKING', 'FALLING'
        duckingRequested: false,
        invulnFrames: 0
    },
    
    items: [],
    obstacles: [],
    pits: [],
    particles: [],
    
    // Statistics for summary screen
    statGoldCollected: 0,
    statObstaclesHit: 0,
    
    // Parallax background offsets
    bgOffsets: {
        sky: 0,
        farCave: 0,
        pillars: 0,
        tracks: 0
    },
    
    screenShake: 0,

    init() {
        const startBtn = document.getElementById('startMinigameBtn');
        if (startBtn) {
            startBtn.onclick = () => {
                this.begin();
            };
        }
        
        const finishBtn = document.getElementById('finishMinigameBtn');
        if (finishBtn) {
            finishBtn.onclick = () => {
                this.completeAndGoToShop();
            };
        }
    },

    start() {
        if (typeof Game === 'undefined') return;
        
        Game.hideAllOverlays();
        Game.state = 'MINIGAME_INTRO';
        
        const hud = document.getElementById('hud');
        if (hud) hud.style.display = 'none';
        
        Game.showOverlay('minigameIntroOverlay');
    },

    begin() {
        if (typeof Game === 'undefined') return;
        Game.hideAllOverlays();
        
        this.active = true;
        this.distance = 0;
        this.totalScrollOffset = 0;
        this.cash = Game.cash;
        this.startCash = Game.cash;
        this.statGoldCollected = 0;
        this.statObstaclesHit = 0;
        this.screenShake = 0;
        
        this.player.y = this.getTrackY(this.player.x) - 33;
        this.player.vy = 0;
        this.player.state = 'RUNNING';
        this.player.duckingRequested = false;
        this.player.invulnFrames = 0;
        
        this.items = [];
        this.obstacles = [];
        this.particles = [];
        this.pits = [];
        
        this.bgOffsets.sky = 0;
        this.bgOffsets.farCave = 0;
        this.bgOffsets.pillars = 0;
        this.bgOffsets.tracks = 0;
        
        this.generatePatterns();
        
        Game.state = 'MINIGAME';
    },

    // Slope system calculations:
    // Tracks follow a dynamic wave based on screen x and total scroll offset.
    getTrackY(screenX) {
        let worldX = screenX + this.totalScrollOffset;
        let wave1 = Math.sin(worldX / 260) * 40; // Broad hills
        let wave2 = Math.cos(worldX / 120) * 12; // Small bumps
        return 470 + wave1 + wave2;
    },

    getCeilingY(screenX) {
        let worldX = screenX + this.totalScrollOffset;
        let wave1 = Math.sin(worldX / 320) * 22;
        return 130 + wave1;
    },

    // Check if a world position is inside a pit gap
    isPit(worldX) {
        for (let pit of this.pits) {
            if (worldX >= pit.start && worldX <= pit.end) {
                return true;
            }
        }
        return false;
    },

    generatePatterns() {
        // Setup Pits in world coordinates (where railway tracks are broken)
        // Tracks length goes up to ~4500px at current scroll speed
        this.pits = [
            { start: 1400, end: 1540 },
            { start: 2600, end: 2740 },
            { start: 3800, end: 3940 }
        ];

        let currentX = 960 + 200; // start spawning off-screen
        const endX = 1000 * this.scrollSpeed - 300;
        
        let alternate = false;
        
        while (currentX < endX) {
            // Avoid spawning items or obstacles inside/near pits
            let nearPit = false;
            for (let pit of this.pits) {
                if (currentX > pit.start - 240 && currentX < pit.end + 240) {
                    nearPit = true;
                    break;
                }
            }
            
            if (nearPit) {
                currentX += 100; // Skip generation in pit zones
                continue;
            }
            
            let roll = Math.random();
            if (roll < 0.55) {
                // Spawn obstacle (Ground Rock, TNT Crate, or Ceiling Stalactite)
                let randType = Math.random();
                let type = randType < 0.35 ? 'ROCK' : (randType < 0.70 ? 'STALACTITE' : 'TNT');
                if (type === 'ROCK') {
                    this.obstacles.push({
                        x: currentX,
                        width: 44,
                        height: 44,
                        type: 'ROCK'
                    });
                } else if (type === 'TNT') {
                    this.obstacles.push({
                        x: currentX,
                        width: 44,
                        height: 44,
                        type: 'TNT'
                    });
                } else {
                    this.obstacles.push({
                        x: currentX,
                        width: 44,
                        height: 90,
                        type: 'STALACTITE'
                    });
                }
                currentX += 240 + Math.random() * 150;
            } else {
                // Spawn gold line
                let count = 3 + Math.floor(Math.random() * 3);
                // Alternate between -45 (aligned with train body) and -130 (floating in the air)
                let relativeGoldY = alternate ? -130 : -45;
                alternate = !alternate;
                
                for (let i = 0; i < count; i++) {
                    this.items.push({
                        x: currentX + i * 45,
                        relativeY: relativeGoldY,
                        radius: 12,
                        value: 50,
                        collected: false
                    });
                }
                currentX += count * 45 + 160 + Math.random() * 100;
            }
        }
    },

    jump() {
        if (this.player.state !== 'JUMPING' && this.player.state !== 'DUCKING' && this.player.state !== 'FALLING') {
            this.player.state = 'JUMPING';
            this.player.vy = -14.0;
            if (typeof AudioSynth !== 'undefined') {
                AudioSynth.playJumpSound();
            }
            this.spawnDustParticles(this.player.x, this.getTrackY(this.player.x), 6);
        }
    },

    handleInput(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            this.jump();
            e.preventDefault();
        }
        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            this.player.duckingRequested = true;
            if (this.player.state === 'RUNNING') {
                this.player.state = 'DUCKING';
            }
            e.preventDefault();
        }
    },

    handleKeyUp(e) {
        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            this.player.duckingRequested = false;
            if (this.player.state === 'DUCKING') {
                this.player.state = 'RUNNING';
            }
        }
    },

    handleHit(obs) {
        let isTNT = obs && obs.type === 'TNT';
        this.player.invulnFrames = isTNT ? 90 : 75;
        this.screenShake = isTNT ? 30 : 15;
        
        let penalty = isTNT ? 150 : 100;
        this.statObstaclesHit += penalty;
        this.cash = Math.max(0, this.cash - penalty);
        
        if (typeof AudioSynth !== 'undefined') {
            AudioSynth.playMiniGameHitSound();
            if (isTNT) {
                setTimeout(() => AudioSynth.playMiniGameHitSound(), 120);
            }
        }
        
        this.spawnExplosionParticles(this.player.x, this.player.y - 30, isTNT ? 30 : 15);
        this.spawnFloatingFX(isTNT ? `TNT! -$${penalty}` : `-$${penalty}`, this.player.x, this.player.y - 80, '#ff4d4d');
    },

    handlePitFall() {
        this.statObstaclesHit += 150;
        this.cash = Math.max(0, this.cash - 150);
        this.screenShake = 25;
        
        if (typeof AudioSynth !== 'undefined') {
            AudioSynth.playFallingSound();
            setTimeout(() => {
                AudioSynth.playMiniGameHitSound();
            }, 300);
        }
        
        // Spawn huge puff of smoke where they respawn
        let trackY = this.getTrackY(this.player.x);
        let respawnY = trackY - 33;
        this.spawnExplosionParticles(this.player.x, trackY, 20);
        this.spawnFloatingFX(`ตกหลุม -$150`, this.player.x, trackY - 60, '#ff3b30');
        
        // Reset player state back on track
        this.player.y = respawnY;
        this.player.vy = 0;
        this.player.state = 'RUNNING';
        this.player.invulnFrames = 90; // longer invulnerability after pit fall
    },

    update(timestamp) {
        if (!this.active) return;
        
        // 1. Tick Progress
        this.distance += 1;
        this.totalScrollOffset += this.scrollSpeed;
        if (this.distance >= this.targetDistance) {
            this.finish();
            return;
        }
        
        // 2. Invulnerability Timer
        if (this.player.invulnFrames > 0) {
            this.player.invulnFrames--;
        }
        
        // 3. Screen Shake decay
        if (this.screenShake > 0) {
            this.screenShake *= 0.9;
            if (this.screenShake < 0.5) this.screenShake = 0;
        }
        
        // 4. Parallax Background offsets
        this.bgOffsets.sky = (this.bgOffsets.sky - this.scrollSpeed * 0.15) % 960;
        this.bgOffsets.farCave = (this.bgOffsets.farCave - this.scrollSpeed * 0.45) % 960;
        this.bgOffsets.pillars = (this.bgOffsets.pillars - this.scrollSpeed * 0.85) % (320 * 4);
        this.bgOffsets.tracks = (this.bgOffsets.tracks - this.scrollSpeed) % 80;
        
        // 5. Update Player physics/states
        let targetTrackY = this.getTrackY(this.player.x);
        
        // Fall into Pit check:
        // If center of cart is over a pit world coordinate and player is not jumping
        let playerWorldX = this.player.x + this.totalScrollOffset;
        let overPit = this.isPit(playerWorldX);
        
        if (overPit && this.player.state !== 'JUMPING' && this.player.state !== 'FALLING') {
            this.player.state = 'FALLING';
            this.player.vy = 4;
        }
        
        if (this.player.state === 'FALLING') {
            this.player.vy += 0.5; // fall velocity
            this.player.y += this.player.vy;
            
            // Check if went below screen
            if (this.player.y > 600) {
                this.handlePitFall();
            }
        } else if (this.player.state === 'JUMPING') {
            this.player.vy += 0.62; // gravity
            this.player.y += this.player.vy;
            
            // Land back on track (even if sloped)
            if (this.player.y >= targetTrackY - 33) {
                this.player.y = targetTrackY - 33;
                this.player.vy = 0;
                this.player.state = this.player.duckingRequested ? 'DUCKING' : 'RUNNING';
                this.spawnDustParticles(this.player.x, targetTrackY, 4);
            }
        } else {
            // Stand or Duck following sloped ground height
            this.player.y = targetTrackY - 33;
            if (this.player.state === 'DUCKING' && !this.player.duckingRequested) {
                this.player.state = 'RUNNING';
            }
        }
        
        // 6. Update Scrolling Items and Bounding Box check
        // Player horizontal range: x=150, width=50 (125 to 175) - shrunk for easier dodging!
        let px1 = 125;
        let px2 = 175;
        let py1, py2;
        
        if (this.player.state === 'DUCKING') {
            // Cart box only, miner is crouched
            py1 = this.player.y + 4;
            py2 = this.player.y + 18;
        } else {
            // Normal cart + miner body
            py1 = this.player.y - 42;
            py2 = this.player.y + 18;
        }
        
        // Update Gold Items
        for (let item of this.items) {
            if (item.collected) continue;
            item.x -= this.scrollSpeed;
            
            let itemY = this.getTrackY(item.x) + item.relativeY;
            let playerCenterY = (py1 + py2) / 2;
            let dist = Math.hypot(150 - item.x, playerCenterY - itemY);
            let collisionThreshold = (this.player.state === 'DUCKING' ? 24 : 42) + item.radius;
            
            if (dist < collisionThreshold) {
                item.collected = true;
                this.cash += item.value;
                this.statGoldCollected += item.value;
                
                if (typeof AudioSynth !== 'undefined') {
                    AudioSynth.playGoldSound(1.2);
                }
                
                this.spawnGoldSparkles(item.x, itemY, 8);
                this.spawnFloatingFX(`+$${item.value}`, item.x, itemY - 20, '#ffea00');
            }
        }
        
        // Update Obstacles
        for (let obs of this.obstacles) {
            obs.x -= this.scrollSpeed;
            
            if (this.player.invulnFrames > 0) continue;
            if (this.player.state === 'FALLING') continue;
            
            let obsY1 = (obs.type === 'ROCK' || obs.type === 'TNT') ? (this.getTrackY(obs.x) - obs.height) : this.getCeilingY(obs.x);
            let obsY2 = obsY1 + obs.height;
            
            let overlapX = (px1 < obs.x + obs.width) && (px2 > obs.x);
            let overlapY = (py1 < obsY2) && (py2 > obsY1);
            
            if (overlapX && overlapY) {
                this.handleHit(obs);
            }
        }
        
        // 7. Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Auto smoke trail
        if (Math.random() < 0.25 && this.player.state !== 'FALLING') {
            this.particles.push({
                x: this.player.x - 38,
                y: this.player.y + 10,
                vx: -1 - Math.random() * 2,
                vy: -Math.random() * 1.5,
                size: 3 + Math.random() * 5,
                color: 'rgba(180, 180, 180, 0.4)',
                life: 30 + Math.floor(Math.random() * 20),
                maxLife: 50
            });
        }
    },

    draw(ctx, timestamp) {
        ctx.save();
        if (this.screenShake > 0) {
            let dx = (Math.random() - 0.5) * this.screenShake;
            let dy = (Math.random() - 0.5) * this.screenShake;
            ctx.translate(dx, dy);
        }
        
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // 1. Parallax background support pillars, ceiling and tracks
        this.drawBackgroundLayers(ctx);
        
        // 2. Draw Obstacles
        this.drawObstacles(ctx);
        
        // 3. Draw Gold Coins
        this.drawItems(ctx);
        
        // 4. Draw Particles
        this.drawParticles(ctx);
        
        // Draw headlight and headlamp glows (Torch effect)
        this.drawLights(ctx);
        
        // 5. Draw Minecart and Miner (with slope rotation!)
        this.drawPlayer(ctx, timestamp);
        
        // 6. Draw HUD (Progress + Cash display)
        this.drawHUD(ctx);
        
        ctx.restore();
    },

    drawLights(ctx) {
        const px = this.player.x;
        const py = this.player.y;
        const isDucking = (this.player.state === 'DUCKING');
        
        let hx = px;
        let hy = py - 36;
        if (isDucking) {
            hy = py + 3 - 10;
        }
        
        // Calculate slope rotation angle
        let slope = (this.getTrackY(px + 6) - this.getTrackY(px - 6)) / 12;
        let angle = Math.atan(slope);
        
        ctx.save();
        
        // 1. Headlamp Radial glow (warm ambient light around head)
        let headGlow = ctx.createRadialGradient(hx, hy, 5, hx, hy, 160);
        headGlow.addColorStop(0, 'rgba(255, 236, 179, 0.45)');
        headGlow.addColorStop(0.3, 'rgba(255, 236, 179, 0.12)');
        headGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = headGlow;
        ctx.beginPath();
        ctx.arc(hx, hy, 160, 0, Math.PI * 2);
        ctx.fill();
        
        // 2. Forward headlight cone (spreading light beam)
        ctx.translate(px, py + 11);
        if (this.player.state === 'FALLING') {
            ctx.rotate(0.35);
        } else {
            ctx.rotate(angle);
        }
        
        let fx = 42;
        let fy = 0;
        
        let beamGrad = ctx.createLinearGradient(fx, fy, fx + 350, fy);
        beamGrad.addColorStop(0, 'rgba(255, 243, 176, 0.35)');
        beamGrad.addColorStop(0.2, 'rgba(255, 243, 176, 0.18)');
        beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = beamGrad;
        
        ctx.beginPath();
        ctx.moveTo(fx, fy - 6);
        ctx.lineTo(fx + 350, fy - 75);
        ctx.lineTo(fx + 350, fy + 75);
        ctx.lineTo(fx, fy + 12);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    },

    drawBackgroundLayers(ctx) {
        // Base deep ground dirt background
        ctx.fillStyle = '#2c1a11';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Parallax Cave far layer (drawn as wave)
        ctx.fillStyle = 'rgba(28, 16, 9, 0.5)';
        for (let i = 0; i < 2; i++) {
            let ox = (this.bgOffsets.farCave + i * 960) % 1920;
            ctx.beginPath();
            ctx.moveTo(ox, 130);
            ctx.quadraticCurveTo(ox + 240, 180, ox + 480, 140);
            ctx.quadraticCurveTo(ox + 720, 200, ox + 960, 130);
            ctx.lineTo(ox + 960, GAME_HEIGHT);
            ctx.lineTo(ox, GAME_HEIGHT);
            ctx.closePath();
            ctx.fill();
        }
        
        // Support wood pillars stretching to adapt to sloped heights
        ctx.fillStyle = '#3a2315';
        ctx.strokeStyle = '#22140c';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
            let px = (this.bgOffsets.pillars + i * 320) % (320 * 4);
            let worldPillarX = px + this.totalScrollOffset;
            if (this.isPit(worldPillarX)) continue; // Don't draw pillars in a pit gap
            
            let cy = this.getCeilingY(px);
            let ty = this.getTrackY(px);
            
            // Vertical adapt pillar
            ctx.fillRect(px - 14, cy, 28, ty - cy);
            ctx.strokeRect(px - 14, cy, 28, ty - cy);
            
            // Top diagonal wood brackets
            ctx.beginPath();
            ctx.moveTo(px - 14, cy + 60);
            ctx.lineTo(px - 50, cy);
            ctx.lineTo(px - 34, cy);
            ctx.lineTo(px - 14, cy + 30);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(px + 14, cy + 60);
            ctx.lineTo(px + 50, cy);
            ctx.lineTo(px + 34, cy);
            ctx.lineTo(px + 14, cy + 30);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        
        // Ground Dirt Bed (Slice by slice to omit pits cleanly)
        for (let sx = 0; sx < GAME_WIDTH; sx += 8) {
            let wx = sx + this.totalScrollOffset;
            let ty = this.getTrackY(sx);
            
            if (this.isPit(wx)) {
                // Pit: draw deep dark background
                ctx.fillStyle = '#0a0503';
                ctx.fillRect(sx, ty - 10, 8, GAME_HEIGHT);
                
                // Draw some glowing red/orange lava at the bottom!
                let lavaGrad = ctx.createLinearGradient(sx, 500, sx, 600);
                lavaGrad.addColorStop(0, 'rgba(255, 69, 0, 0)');
                lavaGrad.addColorStop(0.5, 'rgba(255, 69, 0, 0.8)');
                lavaGrad.addColorStop(1, '#ff3b30');
                ctx.fillStyle = lavaGrad;
                ctx.fillRect(sx, 500, 8, 100);
                
                // Pit side stone wall detailing
                ctx.fillStyle = '#1c0f08';
                if (!this.isPit(wx - 8)) {
                    ctx.fillRect(sx, ty - 10, 3, GAME_HEIGHT); // left wall edge
                }
                if (!this.isPit(wx + 8)) {
                    ctx.fillRect(sx + 5, ty - 10, 3, GAME_HEIGHT); // right wall edge
                }
            } else {
                // Solid ground dirt bed
                ctx.fillStyle = '#2c1a11';
                ctx.fillRect(sx, ty - 10, 8, GAME_HEIGHT);
                
                // Ground rock base
                ctx.fillStyle = '#1c0f08';
                ctx.fillRect(sx, ty + 12, 8, GAME_HEIGHT);
            }
        }
        
        // Draw Rails continuously, broken at pits
        ctx.strokeStyle = '#7a7a7a';
        ctx.lineWidth = 4;
        let drawingLine = false;
        for (let sx = 0; sx < GAME_WIDTH; sx += 5) {
            let wx = sx + this.totalScrollOffset;
            let ty = this.getTrackY(sx);
            
            if (this.isPit(wx)) {
                if (drawingLine) {
                    ctx.stroke();
                    drawingLine = false;
                }
            } else {
                if (!drawingLine) {
                    ctx.beginPath();
                    ctx.moveTo(sx, ty);
                    drawingLine = true;
                } else {
                    ctx.lineTo(sx, ty);
                }
            }
        }
        if (drawingLine) ctx.stroke();
        
        // Draw wooden ties along slopes (only on solid ground)
        ctx.fillStyle = '#4a2c16';
        ctx.strokeStyle = '#23150a';
        ctx.lineWidth = 1.5;
        let tieSpacing = 80;
        let startWorldTie = Math.floor(this.totalScrollOffset / tieSpacing) * tieSpacing;
        for (let wx = startWorldTie; wx < this.totalScrollOffset + GAME_WIDTH + 80; wx += tieSpacing) {
            if (this.isPit(wx)) continue;
            
            let sx = wx - this.totalScrollOffset;
            let sy = this.getTrackY(sx);
            
            // Calculate slope angle
            let slope = (this.getTrackY(sx + 5) - this.getTrackY(sx - 5)) / 10;
            let angle = Math.atan(slope);
            
            ctx.save();
            ctx.translate(sx, sy + 5);
            ctx.rotate(angle);
            ctx.fillRect(-12, 0, 24, 8);
            ctx.strokeRect(-12, 0, 24, 8);
            ctx.restore();
        }
        
        // Draw solid rock Ceiling (jagged outline)
        ctx.fillStyle = '#1c0f08';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let sx = 0; sx <= GAME_WIDTH; sx += 10) {
            ctx.lineTo(sx, this.getCeilingY(sx));
        }
        ctx.lineTo(GAME_WIDTH, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#0a0503';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, this.getCeilingY(0));
        for (let sx = 10; sx <= GAME_WIDTH; sx += 10) {
            ctx.lineTo(sx, this.getCeilingY(sx));
        }
        ctx.stroke();

        // Draw caution warning signs at the start of each pit
        for (let pit of this.pits) {
            let signX = pit.start - this.totalScrollOffset - 30;
            if (signX > -50 && signX < GAME_WIDTH + 50) {
                let signY = this.getTrackY(signX + this.totalScrollOffset);
                ctx.save();
                ctx.translate(signX, signY);
                
                // Wood Post
                ctx.fillStyle = '#6f4e37';
                ctx.fillRect(-3, -25, 6, 25);
                
                // Diamond board (yellow)
                ctx.translate(0, -32);
                ctx.rotate(Math.PI / 4);
                ctx.fillStyle = '#ffcc00';
                ctx.fillRect(-10, -10, 20, 20);
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(-10, -10, 20, 20);
                
                // Exclamation mark
                ctx.rotate(-Math.PI / 4);
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('!', 0, 0);
                
                ctx.restore();
            }
        }
    },

    drawObstacles(ctx) {
        for (let obs of this.obstacles) {
            if (obs.x + obs.width < 0 || obs.x > GAME_WIDTH) continue;
            
            let y = (obs.type === 'ROCK' || obs.type === 'TNT') ? (this.getTrackY(obs.x) - obs.height) : this.getCeilingY(obs.x);
            
            if (obs.type === 'ROCK') {
                ctx.fillStyle = '#8c8c8c';
                ctx.strokeStyle = '#525252';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(obs.x, y + obs.height);
                ctx.lineTo(obs.x + 5, y + 15);
                ctx.lineTo(obs.x + obs.width / 2, y);
                ctx.lineTo(obs.x + obs.width - 8, y + 10);
                ctx.lineTo(obs.x + obs.width, y + obs.height);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                ctx.strokeStyle = '#6e6e6e';
                ctx.beginPath();
                ctx.moveTo(obs.x + 12, y + 25);
                ctx.lineTo(obs.x + 22, y + 10);
                ctx.stroke();
            } else if (obs.type === 'TNT') {
                ctx.fillStyle = '#d62828';
                ctx.strokeStyle = '#780000';
                ctx.lineWidth = 2.5;
                ctx.fillRect(obs.x, y, obs.width, obs.height);
                ctx.strokeRect(obs.x, y, obs.width, obs.height);
                
                // Yellow bands
                ctx.fillStyle = '#fcbf49';
                ctx.fillRect(obs.x, y + 10, obs.width, 4);
                ctx.fillRect(obs.x, y + 30, obs.width, 4);
                
                // Text
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('TNT', obs.x + obs.width / 2, y + obs.height / 2);
            } else {
                ctx.fillStyle = '#634737';
                ctx.strokeStyle = '#3d2b21';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(obs.x, y);
                ctx.lineTo(obs.x + obs.width, y);
                ctx.lineTo(obs.x + obs.width - 8, y + 30);
                ctx.lineTo(obs.x + obs.width / 2 + 3, y + obs.height);
                ctx.lineTo(obs.x + 8, y + 25);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                ctx.strokeStyle = '#4f392d';
                ctx.beginPath();
                ctx.moveTo(obs.x + obs.width / 2, y + 15);
                ctx.lineTo(obs.x + obs.width / 2, y + obs.height - 10);
                ctx.stroke();
            }
        }
    },

    drawItems(ctx) {
        for (let item of this.items) {
            if (item.collected || item.x + item.radius < 0 || item.x - item.radius > GAME_WIDTH) continue;
            
            let itemY = this.getTrackY(item.x) + item.relativeY;
            let angle = (Date.now() / 250) % (Math.PI * 2);
            let widthScale = Math.abs(Math.sin(angle));
            
            ctx.save();
            ctx.translate(item.x, itemY);
            ctx.scale(widthScale, 1.0);
            
            ctx.fillStyle = '#ffea00';
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
            ctx.beginPath();
            ctx.arc(0, 0, item.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    },

    drawPlayer(ctx, timestamp) {
        if (this.player.invulnFrames > 0 && Math.floor(this.player.invulnFrames / 4) % 2 === 0) {
            return;
        }
        
        const px = this.player.x;
        const py = this.player.y;
        const isDucking = (this.player.state === 'DUCKING');
        
        // Calculate dynamic track slope at player x
        let slope = (this.getTrackY(px + 6) - this.getTrackY(px - 6)) / 12;
        let angle = Math.atan(slope);
        
        ctx.save();
        ctx.translate(px, py);
        
        if (this.player.state === 'FALLING') {
            ctx.rotate(0.35); // tilt forward while plummeting
        } else {
            ctx.rotate(angle);
        }
        
        // --- Draw minecart elements relative to translated origin (0, 0) ---
        // 1. Mine Cart Wood Box
        ctx.fillStyle = '#6f4e37';
        ctx.fillRect(-42, 0, 84, 22);
        ctx.strokeStyle = '#4a3325';
        ctx.lineWidth = 3;
        ctx.strokeRect(-42, 0, 84, 22);
        
        // Planks detailing
        ctx.beginPath();
        ctx.moveTo(-20, 0); ctx.lineTo(-35, 22);
        ctx.moveTo(20, 0); ctx.lineTo(5, 22);
        ctx.strokeStyle = '#4a3325';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // 2. Rolling wheels
        let wheelAngle = (timestamp / 50) % (Math.PI * 2);
        ctx.fillStyle = '#2b2b2b';
        ctx.strokeStyle = '#121212';
        
        const drawWheel = (wx, wy) => {
            ctx.save();
            ctx.translate(wx, wy);
            ctx.rotate(wheelAngle);
            ctx.beginPath();
            ctx.arc(0, 0, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.stroke();
            
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-11, 0); ctx.lineTo(11, 0);
            ctx.moveTo(0, -11); ctx.lineTo(0, 11);
            ctx.stroke();
            
            ctx.fillStyle = '#999';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };
        
        drawWheel(-28, 22);
        drawWheel(28, 22);
        
        // 3. Draw Miner character
        if (isDucking) {
            let headY = 3;
            if (typeof minerPhoto !== 'undefined' && minerPhoto.complete && minerPhoto.naturalWidth > 0) {
                ctx.save();
                const headRadius = 24;
                ctx.beginPath();
                ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
                ctx.clip();
                const aspect = minerPhoto.naturalWidth / minerPhoto.naturalHeight;
                let drawW = headRadius * 2.3;
                let drawH = drawW / aspect;
                ctx.drawImage(minerPhoto, -drawW / 2, headY - drawH / 2 + 2, drawW, drawH);
                ctx.restore();
                
                ctx.beginPath();
                ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffea00';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else {
                ctx.fillStyle = '#ffd166';
                ctx.beginPath();
                ctx.arc(0, headY, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1e1b18';
                ctx.beginPath();
                ctx.arc(-4, headY - 1, 1.8, 0, Math.PI * 2);
                ctx.arc(4, headY - 1, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.fillStyle = '#f77f00';
            ctx.beginPath();
            ctx.arc(0, headY - 10, 11, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = '#fcbf49';
            ctx.fillRect(-14, headY - 11, 28, 2.5);
        } else {
            // Normal Stand/Ride posture
            ctx.fillStyle = '#22577a';
            ctx.beginPath();
            ctx.arc(0, -8, 18, Math.PI, 0);
            ctx.fill();
            
            let headY = -36;
            if (typeof minerPhoto !== 'undefined' && minerPhoto.complete && minerPhoto.naturalWidth > 0) {
                ctx.save();
                const headRadius = 30;
                ctx.beginPath();
                ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
                ctx.clip();
                const aspect = minerPhoto.naturalWidth / minerPhoto.naturalHeight;
                let drawW = headRadius * 2.3;
                let drawH = drawW / aspect;
                ctx.drawImage(minerPhoto, -drawW / 2, headY - drawH / 2 + 2, drawW, drawH);
                ctx.restore();
                
                ctx.beginPath();
                ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffea00';
                ctx.lineWidth = 3;
                ctx.stroke();
                
                ctx.fillStyle = '#ff9f1c';
                ctx.beginPath();
                ctx.ellipse(0, headY - headRadius + 4, headRadius * 1.05, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, headY - headRadius, 13, Math.PI, 0);
                ctx.fill();
            } else {
                ctx.fillStyle = '#ffd166';
                ctx.beginPath();
                ctx.arc(0, headY, 13, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#1e1b18';
                ctx.beginPath();
                ctx.arc(-5, headY - 2, 2, 0, Math.PI * 2);
                ctx.arc(5, headY - 2, 2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, headY + 3, 3, 0, Math.PI);
                ctx.stroke();
                
                ctx.fillStyle = '#f77f00';
                ctx.beginPath();
                ctx.arc(0, headY - 11, 12, Math.PI, 0);
                ctx.fill();
                ctx.fillStyle = '#fcbf49';
                ctx.fillRect(-16, headY - 12, 28, 3.5);
            }
            
            // Arms
            ctx.strokeStyle = '#22577a';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-10, -18);
            ctx.lineTo(-28, 1);
            ctx.moveTo(10, -18);
            ctx.lineTo(28, 1);
            ctx.stroke();
            
            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.arc(-28, 1, 3.5, 0, Math.PI * 2);
            ctx.arc(28, 1, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    },

    drawParticles(ctx) {
        for (let p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.life / p.maxLife;
            
            if (p.text) {
                ctx.font = 'bold 20px Arial';
                ctx.fillStyle = p.color;
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    },

    drawHUD(ctx) {
        const startX = GAME_WIDTH / 2 - 200;
        const width = 400;
        const progress = Math.min(1.0, this.distance / this.targetDistance);
        
        // Progress Track
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(startX, 24, width, 14);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeRect(startX, 24, width, 14);
        
        // Fill Progress
        const fillGrad = ctx.createLinearGradient(startX, 0, startX + width, 0);
        fillGrad.addColorStop(0, '#ff9f1c');
        fillGrad.addColorStop(1, '#ffea00');
        ctx.fillStyle = fillGrad;
        ctx.fillRect(startX + 2, 26, (width - 4) * progress, 10);
        
        // Icon
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚂', startX + width * progress, 31);
        ctx.fillText('🏁', startX + width + 10, 31);
        
        ctx.fillStyle = '#e2d4c9';
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        let progressMeters = Math.floor(progress * 1500);
        ctx.fillText(`ระยะทางอีก: ${1500 - progressMeters} เมตร`, GAME_WIDTH / 2, 54);
        
        // Cash total
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(GAME_WIDTH - 200, 16, 180, 42);
        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(GAME_WIDTH - 200, 16, 180, 42);
        
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#ffea00';
        ctx.textAlign = 'right';
        ctx.fillText(`$${this.cash}`, GAME_WIDTH - 32, 38);
        
        ctx.font = '13px Arial';
        ctx.fillStyle = '#ffb703';
        ctx.textAlign = 'left';
        ctx.fillText('เงินสะสม', GAME_WIDTH - 190, 41);
    },

    spawnGoldSparkles(x, y, count) {
        for (let i = 0; i < count; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = 1 + Math.random() * 3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5,
                size: 2 + Math.random() * 4,
                color: '#ffea00',
                life: 20 + Math.floor(Math.random() * 15),
                maxLife: 35
            });
        }
    },

    spawnDustParticles(x, y, count) {
        for (let i = 0; i < count; i++) {
            let speed = 0.5 + Math.random() * 1.5;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 40,
                y: y - 5,
                vx: -this.scrollSpeed * 0.3 + (Math.random() - 0.5) * 2,
                vy: -Math.random() * 1.5,
                size: 3 + Math.random() * 5,
                color: 'rgba(160, 120, 90, 0.5)',
                life: 15 + Math.floor(Math.random() * 15),
                maxLife: 30
            });
        }
    },

    spawnExplosionParticles(x, y, count) {
        for (let i = 0; i < count; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = 2 + Math.random() * 5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 8,
                color: Math.random() < 0.6 ? '#ff9f1c' : (Math.random() < 0.5 ? '#d62828' : '#777'),
                life: 25 + Math.floor(Math.random() * 20),
                maxLife: 45
            });
        }
    },

    spawnFloatingFX(text, x, y, color) {
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: -1.2,
            size: 1,
            color: color,
            text: text,
            life: 45,
            maxLife: 45
        });
    },

    finish() {
        this.active = false;
        
        if (typeof Game === 'undefined') return;
        
        Game.state = 'MINIGAME_OUTRO';
        if (typeof AudioSynth !== 'undefined') {
            AudioSynth.playBuySound();
        }
        
        document.getElementById('minigameGoldEarned').textContent = this.statGoldCollected;
        document.getElementById('minigameObstaclesPenalty').textContent = this.statObstaclesHit;
        document.getElementById('minigameNetCash').textContent = this.cash;
        
        Game.showOverlay('minigameOutroOverlay');
    },

    completeAndGoToShop() {
        if (typeof Game === 'undefined') return;
        this.active = false;
        
        Game.cash = this.cash;
        Game.hideAllOverlays();
        
        const hud = document.getElementById('hud');
        if (hud) hud.style.display = 'flex';
        
        Game.openShop();
    }
};

window.addEventListener('load', () => {
    MiniGame.init();
});
