const settings = require('../settings/config.js');
const fs = require('fs');
const path = require('path');

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
        WRONG_FORMAT: '❌ Format Salah!\n\nCara Penggunaan:\n.jpm mindelay|maxdelay\nContoh: .jpm 1000|5000',
        NO_QUOTED: '❌ Format Salah!\n\nSilahkan reply pesan yang ingin di broadcast',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan',
        FAILED: '❌ Gagal broadcast:\n{error}'
    },
    SUCCESS: {
        BROADCAST: '✅ Broadcast selesai!\n\n• Berhasil: {success}\n• Dilewati: {skipped}\n• Gagal: {failed}\n• Total Waktu: {duration}'
    },
    PROGRESS: {
        BROADCAST: '📊 Progress Broadcast\n\n• Progress: {progress}%\n• Berhasil: {success}\n• Dilewati: {skipped}\n• Gagal: {failed}'
    }
};

class BroadcastGroupCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['jpm'];
        this.description = 'Broadcast pesan ke semua grup';
        this.startTime = null;
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
    }

    async sendReaction(msg, emoji) {
        try {
            await this.sock.sendMessage(msg.key.remoteJid, {
                react: {
                    text: Array.isArray(emoji) ? emoji[Math.floor(Math.random() * emoji.length)] : emoji,
                    key: msg.key
                }
            });
        } catch (error) {
            console.error('Error sending reaction:', error);
        }
    }

    // Sisanya sama seperti kode asli tapi dengan perubahan:
    // 1. Menggunakan reaksi random untuk proses
    // 2. Format pesan yang lebih rapi
    // 3. Menghapus komentar yang tidak perlu
    // 4. Menggunakan mediaType: 1 untuk thumbnail
    // 5. Menghapus pesan "Processing"
    
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

        // Sisanya sama seperti kode asli
    }
}

module.exports = BroadcastGroupCommand;
