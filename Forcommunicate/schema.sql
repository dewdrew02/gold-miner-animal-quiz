-- ==============================================================================
-- GOLD MINER GAME - SUPABASE SQL SCHEMA
-- คัดลอกคำสั่ง SQL ทั้งหมดด้านล่างนี้ไปวางในหน้า Supabase SQL Editor แล้วกด RUN
-- ==============================================================================

-- 1. สร้างตาราง players สำหรับเก็บประวัติผู้เล่น คะแนน ด่าน และลิงก์รูปภาพ
CREATE TABLE IF NOT EXISTS public.players (
    id BIGSERIAL PRIMARY KEY,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    photo_url TEXT,
    quiz_correct_count INTEGER DEFAULT 0,
    quiz_total_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- สร้าง Index เพื่อให้ดึงตารางคะแนนสูงสุด (Leaderboard) ได้อย่างรวดเร็ว
CREATE INDEX IF NOT EXISTS idx_players_score ON public.players (score DESC);

-- 2. เปิดระบบสิทธิ์ความปลอดภัย (Row Level Security - RLS)
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- อนุญาตให้อ่านข้อมูลตารางคะแนนได้ทุกคน
CREATE POLICY "Allow public read players" ON public.players
    FOR SELECT USING (true);

-- อนุญาตให้บันทึกคะแนนผู้เล่นใหม่ได้ทุกคน
CREATE POLICY "Allow public insert players" ON public.players
    FOR INSERT WITH CHECK (true);


-- 3. สร้างตาราง quiz_logs สำหรับเก็บประวัติการตอบคำถามภาษาอังกฤษ
CREATE TABLE IF NOT EXISTS public.quiz_logs (
    id BIGSERIAL PRIMARY KEY,
    player_name TEXT,
    question TEXT,
    user_answer TEXT,
    correct_answer TEXT,
    is_correct BOOLEAN,
    time_spent_seconds NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.quiz_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert quiz_logs" ON public.quiz_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read quiz_logs" ON public.quiz_logs
    FOR SELECT USING (true);

-- ==============================================================================
-- 4. ตั้งค่า STORAGE BUCKET สำหรับเก็บรูปภาพผู้เล่น (ทำผ่านหน้า Dashboard ได้เช่นกัน):
--    - ไปที่เมนู "Storage" ใน Supabase
--    - กด "New bucket" ตั้งชื่อว่า "player-photos"
--    - ติ๊กเปิด "Public bucket" เป็น ON แล้วกด Save
-- ==============================================================================
