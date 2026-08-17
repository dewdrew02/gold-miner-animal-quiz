/**
 * supabase.js - Supabase Database & Cloud Storage Integration for Gold Miner Game
 * จัดการเชื่อมต่อฐานข้อมูล PostgreSQL, บันทึกประวัติผู้เล่น, ตารางคะแนน Leaderboard และอัปโหลดรูปถ่ายขึ้น Cloud Storage
 */

const SupabaseDB = {
    // กำหนดค่า Supabase Project URL และ Public Anon Key
    // สามารถนำ URL และ anon key จากหน้าแดชบอร์ด https://supabase.com มาใส่ที่นี่ได้
    SUPABASE_URL: window.SUPABASE_URL || 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co',
    SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',

    client: null,
    isReady: false,

    init() {
        // ตรวจสอบว่ามี Supabase JS library โหลดเข้ามาหรือยัง
        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            if (this.SUPABASE_URL && !this.SUPABASE_URL.includes('YOUR_SUPABASE_PROJECT_ID')) {
                try {
                    this.client = window.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
                    this.isReady = true;
                    console.log('✅ [Supabase]: Connected successfully to Database & Storage');
                } catch (err) {
                    console.warn('⚠️ [Supabase]: Error creating client:', err);
                }
            } else {
                console.info('ℹ️ [Supabase]: Ready for credentials. Configure SUPABASE_URL and SUPABASE_ANON_KEY in supabase.js or window object.');
            }
        }
    },

    /**
     * อัปโหลดรูปภาพใบหน้าของผู้เล่นขึ้น Supabase Storage (Bucket: player-photos)
     * หากยังไม่ได้ตั้งค่า Storage จะคืนค่า dataUrl เดิมเป็น Fallback
     */
    async uploadPhoto(dataUrl, playerName = 'player') {
        if (!this.isReady || !dataUrl || !dataUrl.startsWith('data:image')) {
            return dataUrl;
        }

        try {
            // แปลง Data URL เป็น Blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const cleanName = playerName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const fileName = `photo_${cleanName}_${Date.now()}.jpg`;

            const { data, error } = await this.client.storage
                .from('player-photos')
                .upload(fileName, blob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) {
                console.warn('⚠️ [Supabase Storage]: Failed to upload photo, fallback to Base64:', error.message);
                return dataUrl;
            }

            // ดึง Public URL ของรูปภาพ
            const { data: publicData } = this.client.storage
                .from('player-photos')
                .getPublicUrl(fileName);

            const publicUrl = publicData?.publicUrl || dataUrl;
            console.log('📸 [Supabase Storage]: Photo uploaded successfully ->', publicUrl);
            return publicUrl;
        } catch (e) {
            console.warn('⚠️ [Supabase Storage]: Exception uploading photo:', e);
            return dataUrl;
        }
    },

    /**
     * บันทึกข้อมูลประวัติผู้เล่น คะแนน ด่าน และรูปภาพลงในตาราง players
     */
    async savePlayerRecord(name, score, level, photoDataOrUrl, quizStats = {}) {
        const playerName = (name || '').trim() || 'ผู้เล่นนิรนาม';

        // 1. อัปโหลดรูปภาพขึ้น Cloud Storage ก่อน (ถ้ามี)
        let finalPhotoUrl = photoDataOrUrl;
        if (photoDataOrUrl && photoDataOrUrl.startsWith('data:image')) {
            finalPhotoUrl = await this.uploadPhoto(photoDataOrUrl, playerName);
        }

        const payload = {
            player_name: playerName,
            score: score || 0,
            level: level || 1,
            photo_url: finalPhotoUrl || null,
            quiz_correct_count: quizStats.correct || 0,
            quiz_total_count: quizStats.total || 0,
            created_at: new Date().toISOString()
        };

        if (this.isReady) {
            try {
                const { data, error } = await this.client
                    .from('players')
                    .insert([payload])
                    .select();

                if (error) {
                    console.warn('⚠️ [Supabase DB]: Insert error:', error.message);
                } else {
                    console.log('💾 [Supabase DB]: Player record saved to cloud:', data);
                }
            } catch (err) {
                console.warn('⚠️ [Supabase DB]: Exception saving record:', err);
            }
        }

        return payload;
    },

    /**
     * ดึงตารางคะแนนสูงสุด (Leaderboard) จาก Supabase
     */
    async fetchLeaderboard(limit = 5) {
        if (!this.isReady) return null;

        try {
            const { data, error } = await this.client
                .from('players')
                .select('player_name, score, level, photo_url, created_at')
                .order('score', { ascending: false })
                .limit(limit);

            if (error) {
                console.warn('⚠️ [Supabase DB]: Fetch leaderboard error:', error.message);
                return null;
            }

            if (data && data.length > 0) {
                return data.map(item => ({
                    name: item.player_name,
                    score: item.score,
                    level: item.level,
                    photo: item.photo_url,
                    date: item.created_at ? item.created_at.split('T')[0] : ''
                }));
            }
        } catch (e) {
            console.warn('⚠️ [Supabase DB]: Exception fetching leaderboard:', e);
        }

        return null;
    },

    /**
     * บันทึก Log การตอบคำถาม Quiz แต่ละข้อลงในตาราง quiz_logs
     */
    async logQuizAttempt(questionText, userAnswer, correctAnswer, isCorrect, timeSpentSeconds, playerName = '') {
        if (!this.isReady) return;

        try {
            const { error } = await this.client
                .from('quiz_logs')
                .insert([{
                    player_name: playerName || localStorage.getItem('goldminer_player_name') || 'ผู้เล่นนิรนาม',
                    question: questionText,
                    user_answer: userAnswer || '(หมดเวลา)',
                    correct_answer: correctAnswer,
                    is_correct: !!isCorrect,
                    time_spent_seconds: parseFloat(Number(timeSpentSeconds).toFixed(2)),
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.warn('⚠️ [Supabase DB]: Quiz log error:', error.message);
            }
        } catch (e) {
            console.warn('⚠️ [Supabase DB]: Quiz log exception:', e);
        }
    }
};

// Initialize Supabase Module
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SupabaseDB.init());
} else {
    SupabaseDB.init();
}
