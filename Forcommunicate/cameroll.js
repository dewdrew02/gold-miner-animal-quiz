// --- CAMEROLL / WEBCAM PHOTO CAPTURE MODULE ---
// This module manages taking webcam face photos or uploading custom images
// to replace the miner character's face in Gold Miner game with a confirmation step.

const Cameroll = {
    stream: null,
    videoEl: null,
    canvasEl: null,
    modalEl: null,
    previewImgEl: null,
    pendingDataUrl: null,

    init() {
        this.videoEl = document.getElementById('camerollVideo');
        this.canvasEl = document.getElementById('camerollCanvas');
        this.modalEl = document.getElementById('camerollModal');
        this.previewImgEl = document.getElementById('camerollPreviewImg');

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

        // Confirmation control event handlers
        const confirmBtn = document.getElementById('confirmPhotoBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirmPhoto());
        }

        const retakeBtn = document.getElementById('retakePhotoBtn');
        if (retakeBtn) {
            retakeBtn.addEventListener('click', () => this.retakePhoto());
        }

        const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
        if (cancelConfirmBtn) {
            cancelConfirmBtn.addEventListener('click', () => this.closeCameraModal());
        }
    },

    async openCameraModal() {
        if (!this.modalEl) return;
        this.resetUIState();
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
        this.showConfirmation(dataUrl);
    },

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.showConfirmation(e.target.result);
        };
        reader.readAsDataURL(file);
    },

    showConfirmation(dataUrl) {
        this.pendingDataUrl = dataUrl;

        // Freeze and show captured photo preview image
        if (this.previewImgEl) {
            this.previewImgEl.src = dataUrl;
            this.previewImgEl.style.display = 'block';
        }
        if (this.videoEl) {
            this.videoEl.style.display = 'none';
        }

        // Toggle UI buttons
        const captureControls = document.getElementById('cameraCaptureControls');
        const confirmControls = document.getElementById('cameraConfirmControls');
        if (captureControls) captureControls.style.display = 'none';
        if (confirmControls) confirmControls.style.display = 'flex';

        const msg = document.getElementById('camerollStatusMsg');
        if (msg) {
            msg.style.color = '#ffea00';
            msg.textContent = '✨ คุณชอบรูปนี้ใช่ไหมครับ?';
        }
    },

    confirmPhoto() {
        if (!this.pendingDataUrl) return;

        this.applyMinerPhoto(this.pendingDataUrl);

        // Reset level progress to level 1 and lock other levels
        if (typeof CheckpointManager !== 'undefined') {
            CheckpointManager.resetProgress();
        }

        const msg = document.getElementById('camerollStatusMsg');
        if (msg) {
            msg.style.color = '#4cd964';
            msg.textContent = '✅ บันทึกรูปตัวละครเรียบร้อย!';
        }

        setTimeout(() => {
            this.closeCameraModal();
        }, 500);
    },

    retakePhoto() {
        this.pendingDataUrl = null;

        // Hide preview image and re-enable live video feed
        if (this.previewImgEl) {
            this.previewImgEl.style.display = 'none';
        }
        if (this.videoEl) {
            this.videoEl.style.display = 'block';
        }

        // Toggle UI buttons back to normal
        const captureControls = document.getElementById('cameraCaptureControls');
        const confirmControls = document.getElementById('cameraConfirmControls');
        if (captureControls) captureControls.style.display = 'flex';
        if (confirmControls) confirmControls.style.display = 'none';

        const msg = document.getElementById('camerollStatusMsg');
        if (msg) {
            msg.style.color = '#ffb703';
            msg.textContent = 'จัดใบหน้าให้อยู่กึ่งกลาง แล้วกด ถ่ายรูปภาพ';
        }
    },

    resetUIState() {
        this.pendingDataUrl = null;
        if (this.previewImgEl) {
            this.previewImgEl.style.display = 'none';
        }
        if (this.videoEl) {
            this.videoEl.style.display = 'block';
        }

        const captureControls = document.getElementById('cameraCaptureControls');
        const confirmControls = document.getElementById('cameraConfirmControls');
        if (captureControls) captureControls.style.display = 'flex';
        if (confirmControls) confirmControls.style.display = 'none';
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
        this.resetUIState();
        if (this.modalEl) {
            this.modalEl.classList.remove('active');
        }
    }
};

// Auto initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
    Cameroll.init();
});
