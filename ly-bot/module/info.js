const os = require('os');
const fs = require('fs');
const path = require('path');
const settings = require('../settings/config.js');

const formatBytes = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};

const getFeatureStatus = (enabled) => {
    return enabled ? '✅ ON' : '❌ OFF';
};

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
        FAILED: '❌ Gagal menampilkan info:\n{error}'
    }
};

class InfoCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['info'];
        this.description = 'Menampilkan informasi bot';
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
            const features = settings.features;
            const infoText = `*BOT INFORMATION*\n\n` +
                `◦ *Name:* ${settings.botName}\n` +
                `◦ *Version:* ${settings.version}\n` +
                `◦ *Prefix:* ${settings.prefix}\n` +
                `◦ *Mode:* ${settings.publicMode ? 'Public ✅' : 'Self ❌'}\n\n` +
                
                `*OWNER INFO*\n` +
                `◦ *Super Owner:* ${settings.superOwner.join(', ')}\n` +
                `◦ *Owner:* ${settings.owner.join(', ')}\n\n` +
                
                `*GROUP FEATURES*\n` +
                `◦ *Anti Link:* ${getFeatureStatus(features.antilink.enabled)}\n` +
                `◦ *Welcome:* ${getFeatureStatus(features.welcome.enabled)}\n` +
                `◦ *Leave:* ${getFeatureStatus(features.leave.enabled)}\n\n` +
                
                `*MESSAGE FEATURES*\n` +
                `◦ *Message Verification:* ${getFeatureStatus(features.msgVerif.enabled)}\n` +
                `◦ *Message Ads:* ${getFeatureStatus(features.msgAds.enabled)}\n` +
                `◦ *Message Forward:* ${getFeatureStatus(features.msgForwarded.enabled)}\n\n` +
                
                `*AI FEATURES*\n` +
                `◦ *AI Assistant:* ${getFeatureStatus(features.aiAssistant.enabled)}\n` +
                `◦ *AI Model:* ${features.aiAssistant.v2.enabled ? features.aiAssistant.v2.model : features.aiAssistant.v1.model}\n` +
                `◦ *Max History:* ${features.aiAssistant.maxHistory} messages\n\n` +
                
                `*STICKER FEATURES*\n` +
                `◦ *Pack Name:* ${features.sticker.packname}\n` +
                `◦ *Author:* ${features.sticker.author}\n` +
                `◦ *Quality:* ${features.sticker.quality}%\n\n` +
                
                `*SOCIAL MEDIA*\n` +
                `◦ *Instagram:* ${features.msgAds.instagram}\n` +
                `◦ *YouTube:* ${features.msgAds.youtube}\n` +
                `◦ *GitHub:* ${features.msgAds.github}\n\n` +
                
                `${settings.footer}`;

            await this.sock.sendMessage(from, {
                text: infoText,
                contextInfo: {
                    externalAdReply: {
                        title: settings.botName,
                        body: settings.footer,
                        mediaType: 1,
                        thumbnail: fs.readFileSync(this.defaultThumb),
                        renderLargerThumbnail: false,
                        showAdAttribution: true
                    }
                }
            });

            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
        }
    }
}

module.exports = InfoCommand;
