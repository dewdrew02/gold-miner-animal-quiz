// --- MINER CHARACTER RENDERER ---
const minerPhoto = new Image();
minerPhoto.src = 'miner.png';

function drawMiner(ctx, state, time) {
    const mx = GAME_WIDTH / 2;
    const my = 95;
    
    // 1. Mine Cart Box
    ctx.fillStyle = '#6f4e37'; // rich wood brown
    ctx.fillRect(mx - 65, my, 130, 24);
    ctx.strokeStyle = '#4a3325';
    ctx.lineWidth = 3;
    ctx.strokeRect(mx - 65, my, 130, 24);
    
    // Diagonal wood planks inside cart
    ctx.beginPath();
    ctx.moveTo(mx - 35, my); ctx.lineTo(mx - 50, my + 24);
    ctx.moveTo(mx, my); ctx.lineTo(mx - 15, my + 24);
    ctx.moveTo(mx + 35, my); ctx.lineTo(mx + 20, my + 24);
    ctx.strokeStyle = '#4a3325';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Cart wheels
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(mx - 45, my + 24, 12, 0, Math.PI * 2);
    ctx.arc(mx + 45, my + 24, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#121212';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // 2. Miner Body (Sits in the cart)
    ctx.fillStyle = '#22577a'; // blue jacket
    ctx.beginPath();
    ctx.arc(mx, my - 13, 20, Math.PI, 0);
    ctx.fill();
    
    // 3. Head (User's custom photo or default cartoon avatar)
    if (minerPhoto.complete && minerPhoto.naturalWidth > 0) {
        ctx.save();
        const headX = mx;
        const headY = my - 44;
        const headRadius = 38; // Increased from 24 to 38 for a bigger face!
        
        // Circular clip for miner's face
        ctx.beginPath();
        ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        ctx.clip();
        
        // Draw photo centered
        const aspect = minerPhoto.naturalWidth / minerPhoto.naturalHeight;
        let drawW = headRadius * 2.3;
        let drawH = drawW / aspect;
        ctx.drawImage(minerPhoto, headX - drawW / 2, headY - drawH / 2 + 2, drawW, drawH);
        ctx.restore();
        
        // Golden border ring around custom photo head
        ctx.beginPath();
        ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Miner Hard Hat on top of photo
        ctx.fillStyle = '#ff9f1c';
        ctx.beginPath();
        ctx.ellipse(headX, headY - headRadius + 4, headRadius * 1.05, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d46a00';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(headX, headY - headRadius, 16, Math.PI, 0);
        ctx.fill();
        ctx.stroke();

        // Mining Helmet Lamp
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(headX, headY - headRadius - 5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        // Fallback default cartoon face
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(mx, my - 36, 13, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#f8f9fa';
        ctx.beginPath();
        ctx.arc(mx, my - 27, 11, 0, Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mx - 6, my - 26, 6, 0, Math.PI * 2);
        ctx.arc(mx + 6, my - 26, 6, 0, Math.PI * 2);
        ctx.arc(mx, my - 22, 7, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#f28482';
        ctx.beginPath();
        ctx.arc(mx + 4, my - 34, 4.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#1e1b18';
        if (state === 'WORRIED') {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(mx - 5, my - 38, 4, 0, Math.PI*2);
            ctx.arc(mx + 7, my - 38, 4, 0, Math.PI*2);
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(mx - 5, my - 38, 1.8, 0, Math.PI*2);
            ctx.arc(mx + 7, my - 38, 1.8, 0, Math.PI*2);
            ctx.fill();
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(mx - 4, my - 27);
            ctx.quadraticCurveTo(mx, my - 30, mx + 4, my - 27);
            ctx.stroke();
        } 
        else if (state === 'STRAINING') {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(mx - 9, my - 41); ctx.lineTo(mx - 2, my - 37);
            ctx.moveTo(mx + 9, my - 41); ctx.lineTo(mx + 2, my - 37);
            ctx.stroke();
            
            ctx.fillStyle = '#520000';
            ctx.beginPath();
            ctx.arc(mx, my - 26, 4.5, 0, Math.PI, true);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(mx - 3, my - 28, 6, 2);
            
            ctx.fillStyle = '#4cc9f0';
            const phase = (time / 200) % 2;
            ctx.beginPath();
            ctx.arc(mx - 21, my - 38 + phase * 8, 2.5, 0, Math.PI*2);
            ctx.arc(mx + 21, my - 34 + phase * 8, 2.5, 0, Math.PI*2);
            ctx.fill();
        } 
        else if (state === 'HAPPY') {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(mx - 5, my - 37, 3.5, Math.PI, 0);
            ctx.arc(mx + 7, my - 37, 3.5, Math.PI, 0);
            ctx.stroke();
            
            ctx.fillStyle = '#a70000';
            ctx.beginPath();
            ctx.arc(mx, my - 27, 7, 0, Math.PI);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(mx - 4, my - 27, 8, 2);
        } 
        else {
            ctx.beginPath();
            ctx.arc(mx - 5, my - 38, 2, 0, Math.PI * 2);
            ctx.arc(mx + 7, my - 38, 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(mx, my - 32, 4, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.stroke();
        }
    }
    
    // 4. Miner Hat
    ctx.fillStyle = '#f77f00'; // high-vis orange
    ctx.beginPath();
    ctx.arc(mx, my - 52, 13, Math.PI, 0);
    ctx.fill();
    // Visor rim
    ctx.fillStyle = '#fcbf49';
    ctx.fillRect(mx - 17, my - 54, 28, 3.5);
    
    // Headlamp on hat
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(mx, my - 57, 4, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Headlamp beam glow
    if (state !== 'WORRIED') {
        const glowGrad = ctx.createRadialGradient(mx, my-57, 1, mx, my-57, 25);
        glowGrad.addColorStop(0, 'rgba(255, 255, 230, 0.5)');
        glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(mx, my-57, 25, 0, Math.PI*2);
        ctx.fill();
    }
    
    // 5. Winch Wheel (Centered Left)
    const wx = mx - 54;
    const wy = my - 8;
    
    ctx.strokeStyle = '#3d3d3d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(wx, wy, 15, 0, Math.PI * 2);
    ctx.stroke();
    
    // Winch spokes
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(wx - 15, wy); ctx.lineTo(wx + 15, wy);
    ctx.moveTo(wx, wy - 15); ctx.lineTo(wx, wy + 15);
    ctx.stroke();
    
    // Winch core
    ctx.fillStyle = '#ffbe0b';
    ctx.beginPath();
    ctx.arc(wx, wy, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Handle crank rotation calculations
    let crankAngle = 0;
    if (state === 'CRANKING' || state === 'STRAINING') {
        crankAngle = (time / 140) % (Math.PI * 2);
    }
    
    // Handle peg
    const pegX = wx + Math.cos(crankAngle) * 11.5;
    const pegY = wy + Math.sin(crankAngle) * 11.5;
    ctx.fillStyle = '#d62828';
    ctx.beginPath();
    ctx.arc(pegX, pegY, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // 6. Miner arm cranking/winch interaction
    ctx.strokeStyle = '#22577a';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    
    // Hand 1: to the handle peg
    ctx.beginPath();
    ctx.moveTo(mx - 12, my - 22); // Shoulder
    ctx.lineTo(pegX, pegY);
    ctx.stroke();
    
    // Hand 2: holding the descending rope
    ctx.beginPath();
    ctx.moveTo(mx + 12, my - 22); // Shoulder
    ctx.lineTo(mx, my - 3); // holding rope center
    ctx.stroke();
    
    ctx.fillStyle = '#ffd166'; // flesh hand
    ctx.beginPath();
    ctx.arc(pegX, pegY, 3.5, 0, Math.PI*2);
    ctx.arc(mx, my - 3, 3.5, 0, Math.PI*2);
    ctx.fill();
}
