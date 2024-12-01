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
        WRONG_FORMAT: '❌ Format Salah! Ketik .panduan untuk melihat panduan!',
        FAILED: '❌ Gagal mengubah mode:\n{error}'
    },
    SELF: {
        SUCCESS: '✅ Bot berhasil diubah ke mode self\n\nSekarang bot hanya merespon owner.'
    }
};

class SelfCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['self'];
        this.description = 'Mengubah mode bot ke self';
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
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        try {
            // Set public mode = false untuk self mode
            const config = {...settings, publicMode: false};
            
            // Update config.js
            const configPath = path.join(__dirname, '..', 'settings', 'config.js');
            fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)}`);
            
            // Reload config
            delete require.cache[require.resolve('../settings/config.js')];
            Object.assign(settings, require('../settings/config.js'));

            await this.sendWithThumb(from, MESSAGES.SELF.SUCCESS, settings.botName);
            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error in self:', error);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
            await this.sendReaction(msg, REACTIONS.ERROR);
        }
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

    async sendWithThumb(from, text, title = settings.botName, body = '') {
        let thumb;
        try {
            thumb = fs.readFileSync(this.defaultThumb);
        } catch (err) {
            thumb = Buffer.from('');
        }

        await this.sock.sendMessage(from, {
            text: text,
            contextInfo: {
                forwardingScore: settings.features.msgForwarded.enabled ? settings.features.msgForwarded.score : 0,
                isForwarded: settings.features.msgForwarded.enabled,
                externalAdReply: {
                    title: title,
                    body: body || settings.footer,
                    mediaType: 1,
                    thumbnail: thumb,
                    renderLargerThumbnail: false,
                    showAdAttribution: true
                }
            }
        });
    }
}

module.exports = SelfCommand;