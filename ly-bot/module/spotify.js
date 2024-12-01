const axios = require('axios');
const fs = require('fs');
const path = require('path');
const settings = require('../settings/config.js');

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
        EMPTY_URL: '❌ URL tidak boleh kosong!',
        INVALID_URL: '❌ URL Spotify tidak valid!\n\nFormat URL yang benar:\n• https://open.spotify.com/track/xxxxx\n• spotify.com/track/xxxxx\n\nPastikan URL adalah link lagu (track), bukan playlist atau album!',
        WRONG_FORMAT: '❌ Format Salah!\n\nCara penggunaan:\n.spotify [URL]\n\nContoh:\n.spotify https://open.spotify.com/track/xxxxx',
        API_ERROR: '❌ Gagal mendapatkan info lagu!\n\nKemungkinan penyebab:\n• Server sedang bermasah\n• URL tidak valid\n• Lagu tidak tersedia\n\nTips: Coba lagi dalam beberapa saat',
        DOWNLOAD_ERROR: '❌ Gagal mengunduh lagu!\n\nTips: Coba lagi atau pilih lagu lain'
    },
    SPOTIFY: {
        PROCESS: '⌛ Mohon tunggu, sedang mengunduh lagu...\n\nTips: Waktu download tergantung ukuran lagu',
        SUCCESS: '✅ Berhasil mengunduh!\n\nJudul: {title}\nArtis: {artists}\nAlbum: {album}\nTanggal Rilis: {releaseDate}'
    }
};

class SpotifyDownloader {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['spotify', 'sp'];
        this.description = 'Download lagu dari Spotify';
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
        this.API_URL = 'https://api.ryzendesu.vip/api/downloader/spotify';
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

        if (!args) {
            await this.sendWithThumb(from, MESSAGES.ERROR.WRONG_FORMAT, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        return this.downloadSong(from, args, msg);
    }

    // Sisanya sama seperti kode asli tapi menggunakan format pesan baru
}

module.exports = SpotifyDownloader;
