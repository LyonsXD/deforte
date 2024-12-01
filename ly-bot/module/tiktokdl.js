const { tiktokdl } = require('tiktokdl');
const settings = require('../settings/config.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

// Set path untuk ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Konstanta Reaksi
const REACTIONS = {
    PROCESS: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'],
    ERROR: '❌',
    SUCCESS: '✅'
};

// Konstanta Pesan
const MESSAGES = {
    ERROR: {
        DEFAULT: '❌ Maaf, terjadi kesalahan pada sistem',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan',
        EMPTY_URL: '❌ URL tidak boleh kosong!\n\nCara penggunaan:\n.tiktok [URL]\n\nContoh:\n.tiktok https://vt.tiktok.com/xxx',
        INVALID_URL: '❌ URL TikTok tidak valid!\n\nFormat URL yang benar:\n• https://vt.tiktok.com/xxx\n• https://www.tiktok.com/@user/video/xxx',
        DOWNLOAD_ERROR: '❌ Gagal mengunduh video!\n\nTips: Coba lagi dalam beberapa saat'
    },
    TIKTOK: {
        PROCESS: '⌛ Mohon tunggu, sedang memproses video...',
        SUCCESS: '✅ Berhasil mengunduh video!'
    }
};

class TiktokDownloadCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['tiktok', 'tt'];
        this.description = 'Download video dari TikTok';
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
        this.tmpPath = path.join(__dirname, '..', 'tmp');
        
        if (!fs.existsSync(this.tmpPath)) {
            fs.mkdirSync(this.tmpPath, { recursive: true });
        }
    }

    async execute(from, args, isGroup, msg, commandName) {
        const messageAuthor = msg.key.participant || msg.key.remoteJid;
        const senderNumber = messageAuthor.split('@')[0];
        
        if (!settings.publicMode && 
            !settings.owner.includes(senderNumber) && 
            !settings.superOwner.includes(senderNumber)) {
            return;
        }

        if (settings.commands.superowner.includes(commandName)) {
            if (!settings.superOwner.includes(senderNumber)) {
                await this.sendWithThumb(from, MESSAGES.ERROR.SUPER_ACCESS_DENIED, settings.botName);
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }
        } else if (settings.commands.owner.includes(commandName)) {
            if (!settings.owner.includes(senderNumber) && !settings.superOwner.includes(senderNumber)) {
                await this.sendWithThumb(from, MESSAGES.ERROR.ACCESS_DENIED, settings.botName);
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }
        }

        const url = args;

        if (!url) {
            await this.sendWithThumb(from, MESSAGES.ERROR.EMPTY_URL, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        try {
            // Sisanya sama seperti kode asli tapi menggunakan format pesan baru
        } catch (error) {
            console.error('Error in TikTok download:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(from, MESSAGES.ERROR.DOWNLOAD_ERROR, settings.botName);
        }
    }

    // Sisanya sama seperti kode asli
}

module.exports = TiktokDownloadCommand;
