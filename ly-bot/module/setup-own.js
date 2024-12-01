const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
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
        WRONG_FORMAT: {
            PP: '⚠️ Format Salah!\n\nPenggunaan: Reply/kirim gambar dengan caption .setbotpp\nContoh: .setbotpp <reply gambar>',
            NAME: '⚠️ Format Salah!\n\nPenggunaan: .setbotname <nama baru>\nContoh: .setbotname Ly Bot\n\nNama bot saat ini: {currentName}',
            PREFIX: '⚠️ Format Salah!\n\nPenggunaan: .setprefix <prefix baru>\nContoh: .setprefix #\n\nPrefix saat ini: {currentPrefix}'
        },
        SAME: {
            NAME: '⚠️ Nama bot sudah {name}',
            PREFIX: '⚠️ Prefix bot sudah {prefix}'
        }
    },
    SUCCESS: {
        PP: '✅ Foto profil bot berhasil diubah!',
        NAME: '✅ Nama bot berhasil diubah!\n\n• Nama Lama: {oldName}\n• Nama Baru: {newName}',
        PREFIX: '✅ Prefix bot berhasil diubah!\n\n• Prefix Lama: {oldPrefix}\n• Prefix Baru: {newPrefix}\nSilahkan restart bot untuk menerapkan'
    }
};

class SettingsCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['setbotpp', 'setbotname', 'setprefix'];
        this.description = 'Mengatur pengaturan bot';
        this.configPath = path.join(__dirname, '../settings/config.js');
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
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

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        try {
            switch(commandName) {
                case 'setbotpp':
                    await this.handleSetBotPP(from, msg);
                    break;
                case 'setbotname':
                    await this.handleSetBotName(from, args, settings);
                    break;
                case 'setprefix':
                    await this.handleSetBotPrefix(from, args, settings);
                    break;
            }
        } catch (error) {
            console.error(`Error in ${commandName}:`, error);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
            await this.sendReaction(msg, REACTIONS.ERROR);
        }
    }

    // Sisanya sama seperti kode asli tapi menggunakan format pesan baru
}

module.exports = SettingsCommand;
module.exports = SettingsCommand;