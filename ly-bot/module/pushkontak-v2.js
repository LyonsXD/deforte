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
        WRONG_FORMAT: '❌ Format Salah!\n\nPenggunaan: .push2 idgrup|pesan|delay\nContoh: .push2 1234567890@g.us|halo|3000',
        INVALID_DELAY: '❌ Delay minimal 1000ms (1 detik)!',
        FAILED: '❌ Gagal melakukan push:\n{error}'
    },
    PUSH: {
        STARTED: '*Push Started*\n\n*Grup:* {group}\n*Total:* {total} member\n*Delay:* {delay} detik\n*Estimasi:* {estimate}',
        PROGRESS: '*Push Progress*\n\n*Grup:* {group}\n*Progress:* {progress}%\n*Berhasil:* {success}\n*Gagal:* {failed}',
        COMPLETED: '*Push Completed*\n\n*Grup:* {group}\n*Berhasil:* {success}\n*Gagal:* {failed}\n*Total Waktu:* {duration}'
    }
};

class PushKontakV2Command {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['pushkontak-v2', 'pkv2', 'pushkontakv2'];
        this.description = 'Push kontak versi 2';
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
        this.startTime = null;
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

    async sendWithThumb(from, text, title, body = '') {
        await this.sock.sendMessage(from, {
            text: text,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: body || settings.footer,
                    mediaType: 1,
                    thumbnail: fs.readFileSync(this.defaultThumb),
                    renderLargerThumbnail: false,
                    showAdAttribution: true
                }
            }
        });
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

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        // Sisanya sama seperti kode asli tapi menggunakan format pesan baru
    }
}

module.exports = PushKontakV2Command;
