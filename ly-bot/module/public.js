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
        WRONG_FORMAT: '❌ Format Salah!\n\nCara Penggunaan:\n.public on/off',
        FAILED: '❌ Gagal mengubah mode:\n{error}'
    },
    SUCCESS: {
        PUBLIC: '✅ Bot berhasil diubah ke mode public\n\nSekarang semua user bisa menggunakan bot.',
        SELF: '✅ Bot berhasil diubah ke mode self\n\nSekarang hanya owner yang bisa menggunakan bot.'
    }
};

class PublicCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['public'];
        this.description = 'Mengubah mode bot ke public/self';
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
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        try {
            const mode = args[0]?.toLowerCase();
            const isPublic = mode === 'on';
            
            const config = {...settings, publicMode: isPublic};
            const configPath = path.join(__dirname, '..', 'settings', 'config.js');
            
            fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)}`);
            delete require.cache[require.resolve('../settings/config.js')];
            Object.assign(settings, require('../settings/config.js'));

            await this.sendWithThumb(
                from, 
                isPublic ? MESSAGES.SUCCESS.PUBLIC : MESSAGES.SUCCESS.SELF,
                settings.botName
            );
            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error in public command:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
        }
    }
}

module.exports = PublicCommand;
