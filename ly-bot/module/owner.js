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
        WRONG_FORMAT: '❌ Format Salah!\n\nPenggunaan: .{command} nomor\nContoh: .{command} 628776220xxxx',
        ALREADY_OWNER: '❌ Nomor tersebut sudah terdaftar sebagai owner!',
        NOT_OWNER: '❌ Nomor tersebut tidak terdaftar sebagai owner!',
        CANNOT_DELETE_SUPER: '❌ Tidak dapat menghapus Super Owner!',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan'
    },
    SUCCESS: {
        ADD: '✅ Berhasil menambahkan @{number} sebagai owner bot',
        DELETE: '✅ Berhasil menghapus @{number} dari daftar owner'
    }
};

class OwnerCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['owner', 'addowner', 'delowner', 'listowner'];
        this.description = 'Mengelola daftar owner bot';
        this.configPath = path.join(__dirname, '../settings/config.js');
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
                case 'owner':
                    await this.handleOwner(from);
                    break;
                case 'addowner':
                    await this.handleAddOwner(from, args, settings, msg);
                    break;
                case 'delowner':
                    await this.handleDelOwner(from, args, settings, msg);
                    break;
                case 'listowner':
                    await this.handleListOwner(from, settings);
                    break;
            }
            await this.sendReaction(msg, REACTIONS.SUCCESS);
        } catch (error) {
            console.error('Error in owner command:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.DEFAULT + '\n' + error.message,
                settings.botName
            );
        }
    }

    async handleOwner(from) {
        const vcard = 'BEGIN:VCARD\n' +
                     'VERSION:3.0\n' +
                     `FN:${settings.botName} Owner\n` +
                     `ORG:${settings.author};\n` +
                     `TEL;type=CELL;type=VOICE;waid=${settings.superOwner[0]}:+${settings.superOwner[0]}\n` +
                     'END:VCARD';

        await this.sock.sendMessage(from, { 
            contacts: { 
                displayName: `${settings.botName} Owner`, 
                contacts: [{ vcard }] 
            }
        });
    }

    async handleAddOwner(from, args, settings, msg) {
        if (!args) {
            await this.sock.sendMessage(from, {
                text: '⚠️ Format salah!\n\nPenggunaan: .addowner nomor\nContoh: .addowner 628776220xxxx'
            });
            return;
        }

        const number = args.replace(/[^0-9]/g, '');
        if (settings.owner.includes(number)) {
            await this.sock.sendMessage(from, {
                text: '⚠️ Nomor tersebut sudah terdaftar sebagai owner!'
            });
            return;
        }

        settings.owner.push(number);
        fs.writeFileSync(this.configPath, `module.exports = ${JSON.stringify(settings, null, 2)}`);
        
        await this.sock.sendMessage(from, {
            text: `✅ Berhasil menambahkan @${number} sebagai owner bot`,
            mentions: [`${number}@s.whatsapp.net`]
        });
    }

    async handleDelOwner(from, args, settings, msg) {
        if (!args) {
            await this.sock.sendMessage(from, {
                text: '⚠️ Format salah!\n\nPenggunaan: .delowner nomor\nContoh: .delowner 628776220xxxx'
            });
            return;
        }

        const number = args.replace(/[^0-9]/g, '');
        const index = settings.owner.indexOf(number);
        
        if (index === -1) {
            await this.sock.sendMessage(from, {
                text: '⚠️ Nomor tersebut tidak terdaftar sebagai owner!'
            });
            return;
        }

        if (settings.superOwner.includes(number)) {
            await this.sock.sendMessage(from, {
                text: '❌ Tidak dapat menghapus Super Owner!'
            });
            return;
        }

        settings.owner.splice(index, 1);
        fs.writeFileSync(this.configPath, `module.exports = ${JSON.stringify(settings, null, 2)}`);

        await this.sock.sendMessage(from, {
            text: `✅ Berhasil menghapus @${number} dari daftar owner`,
            mentions: [`${number}@s.whatsapp.net`]
        });
    }

    async handleListOwner(from, settings) {
        let text = '*DAFTAR OWNER BOT*\n\n';
        text += '*Super Owner:*\n';
        settings.superOwner.forEach((number, i) => {
            text += `${i + 1}. @${number}\n`;
        });
        
        text += '\n*Owner:*\n';
        settings.owner.forEach((number, i) => {
            if (!settings.superOwner.includes(number)) {
                text += `${i + 1}. @${number}\n`;
            }
        });

        await this.sock.sendMessage(from, {
            text: text,
            mentions: [...settings.superOwner, ...settings.owner].map(num => `${num}@s.whatsapp.net`)
        });
    }
}

module.exports = OwnerCommand;
