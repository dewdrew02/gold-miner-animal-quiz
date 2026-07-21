// --- CAMEROLL / WEBCAM PHOTO CAPTURE MODULE ---
// This module manages taking webcam face photos or uploading custom images
// to replace the miner character's face in Gold Miner game.

const Cameroll = {
    stream: null,
    videoEl: null,
    canvasEl: null,
    modalEl: null,

    init() {
        this.videoEl = document.getElementById('camerollVideo');
        this.canvasEl = document.getElementById('camerollCanvas');
        this.modalEl = document.getElementById('camerollModal');

        // Restore custom photo from LocalStorage if available
        try {
            const savedPhoto = localStorage.getItem('goldminer_custom_photo');
            if (savedPhoto && typeof minerPhoto !== 'undefined') {
                minerPhoto.src = savedPhoto;
                this.updateAvatarPreviews(savedPhoto);
            }
        } catch (e) {
            console.warn("Could not load saved photo from LocalStorage", e);
        }

        // Attach UI event handlers
        const openBtnIntro = document.getElementById('openCameraBtnIntro');
        if (openBtnIntro) {
            openBtnIntro.addEventListener('click', () => this.openCameraModal());
        }

        const openBtnStart = document.getElementById('openCameraBtnStart');
        if (openBtnStart) {
            openBtnStart.addEventListener('click', () => this.openCameraModal());
        }

        const snapBtn = document.getElementById('snapPhotoBtn');
        if (snapBtn) {
            snapBtn.addEventListener('click', () => this.takePhoto());
        }

        const closeBtn = document.getElementById('closeCameraBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeCameraModal());
        }

        const fileInput = document.getElementById('camerollFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
    },

    async openCameraModal() {
        if (!this.modalEl) return;
        this.modalEl.classList.add('active');

        const msg = document.getElementById('camerollStatusMsg');
        if (msg) msg.textContent = 'กำลังเปิดกล้อง...';

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 360 }, height: { ideal: 360 }, facingMode: 'user' },
                audio: false
            });
            if (this.videoEl) {
                this.videoEl.srcObject = this.stream;
                await this.videoEl.play();
            }
            if (msg) msg.textContent = 'จัดใบหน้าให้อยู่กึ่งกลาง แล้วกด ถ่ายรูปภาพ';
        } catch (err) {
            console.warn("Could not access webcam stream:", err);
            if (msg) {
                msg.textContent = '⚠️ ไม่สามารถเปิดกล้องได้ (หรือปฏิเสธสิทธิ์) คุณสามารถเลือกไฟล์รูปภาพจากเครื่องแทนได้';
            }
        }
    },

    takePhoto() {
        if (!this.videoEl || !this.canvasEl) return;

        const ctx = this.canvasEl.getContext('2d');
        const vW = this.videoEl.videoWidth || 320;
        const vH = this.videoEl.videoHeight || 320;
        const size = Math.min(vW, vH);

        this.canvasEl.width = 250;
        this.canvasEl.height = 250;

        const startX = (vW - size) / 2;
        const startY = (vH - size) / 2;

        // Mirror horizontally so the preview matches natural reflection
        ctx.save();
        ctx.translate(250, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(this.videoEl, startX, startY, size, size, 0, 0, 250, 250);
        ctx.restore();

        const dataUrl = this.canvasEl.toDataURL('image/png');
        this.applyMinerPhoto(dataUrl);
        this.closeCameraModal();
    },

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.applyMinerPhoto(e.target.result);
            this.closeCameraModal();
        };
        reader.readAsDataURL(file);
    },

    applyMinerPhoto(dataUrl) {
        if (typeof minerPhoto !== 'undefined') {
            minerPhoto.src = dataUrl;
        }
        try {
            localStorage.setItem('goldminer_custom_photo', dataUrl);
        } catch (e) {
            console.warn("Could not save photo DataURL to LocalStorage", e);
        }
        this.updateAvatarPreviews(dataUrl);
    },

    updateAvatarPreviews(dataUrl) {
        const previews = document.querySelectorAll('.miner-avatar-img');
        previews.forEach(img => {
            img.src = dataUrl;
            img.style.display = 'block';
        });
    },

    closeCameraModal() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoEl) {
            this.videoEl.srcObject = null;
        }
        if (this.modalEl) {
            this.modalEl.classList.remove('active');
        }
    }
};

// Auto initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
    Cameroll.init();
});
