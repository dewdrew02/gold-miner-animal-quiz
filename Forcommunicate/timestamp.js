// --- TIMESTAMP & QUIZ TIMER MODULE ---
// This module handles timing, timestamping, logging, and storage for quiz sessions.

const TimeStampManager = {
    // Default time limit for answering each quiz question (in seconds)
    quizTimeLimit: 10,

    // Array to store all quiz attempt logs
    logs: [],

    /**
     * Get current formatted date-time string (YYYY-MM-DD HH:mm:ss)
     */
    getCurrentTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },

    /**
     * Get current ISO string format
     */
    getISOTimestamp() {
        return new Date().toISOString();
    },

    /**
     * Record a quiz event entry with timestamps, response time, and accuracy
     */
    logQuizEvent(questionText, selectedAnswer, correctAnswer, isCorrect, timeSpentSeconds) {
        const record = {
            id: Date.now(),
            timestamp: this.getCurrentTimestamp(),
            isoTimestamp: this.getISOTimestamp(),
            question: questionText,
            userAnswer: selectedAnswer ? selectedAnswer : '(Time Out / หมดเวลา)',
            correctAnswer: correctAnswer,
            isCorrect: isCorrect,
            timeSpentSeconds: parseFloat(timeSpentSeconds.toFixed(2)),
            status: isCorrect ? 'CORRECT' : (selectedAnswer ? 'INCORRECT' : 'TIMEOUT')
        };

        this.logs.push(record);
        this.saveLogsToStorage();
        console.log("⏱️ [TimeStamp Logged]:", record);
        return record;
    },

    /**
     * Save logs array to LocalStorage
     */
    saveLogsToStorage() {
        try {
            localStorage.setItem('gold_miner_quiz_timestamps', JSON.stringify(this.logs));
        } catch (e) {
            console.warn("Could not save timestamp logs to LocalStorage", e);
        }
    },

    /**
     * Load logs array from LocalStorage
     */
    loadLogsFromStorage() {
        try {
            const stored = localStorage.getItem('gold_miner_quiz_timestamps');
            if (stored) {
                this.logs = JSON.parse(stored);
            }
        } catch (e) {
            this.logs = [];
        }
        return this.logs;
    },

    /**
     * Clear all recorded timestamp logs
     */
    clearLogs() {
        this.logs = [];
        localStorage.removeItem('gold_miner_quiz_timestamps');
    }
};

// Auto-initialize saved timestamp logs on script load
TimeStampManager.loadLogsFromStorage();
