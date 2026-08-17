// --- GAME CONSTANTS & CONFIGURATION ---
const GAME_WIDTH = 960;
const GAME_HEIGHT = 600;
const DIRT_START_Y = 130;

const ITEM_TYPES = {
    GOLD_L: { radius: 45, weight: 6.5, value: 500, label: 'ทองคำใหญ่' },
    GOLD_M: { radius: 30, weight: 3.2, value: 250, label: 'ทองคำกลาง' },
    GOLD_S: { radius: 18, weight: 1.2, value: 100, label: 'ทองคำเล็ก' },
    GOLD_XS: { radius: 10, weight: 0.6, value: 50, label: 'ทองคำจิ๋ว' },
    ROCK_L: { radius: 35, weight: 8.0, value: 20, label: 'หินก้อนใหญ่' },
    ROCK_S: { radius: 20, weight: 4.0, value: 10, label: 'หินก้อนเล็ก' },
    DIAMOND: { radius: 12, weight: 0.3, value: 500, label: 'เพชรล้ำค่า' },
    MYSTERY_BAG: { radius: 18, weight: 1.5, value: 0, label: 'ถุงสมบัติปริศนา' },
    TNT: { radius: 22, weight: 1.2, value: 0, label: 'ถังระเบิด TNT' },
    BONE: { radius: 16, weight: 1.2, value: 15, label: 'ชิ้นส่วนกระดูก' },
    SKULL: { radius: 20, weight: 2.0, value: 25, label: 'หัวกะโหลก' },
    GOPHER: { radius: 18, weight: 1.2, value: 20, label: 'ตัวตุ่นขุดดิน' }
};
