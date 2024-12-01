const fs = require('fs');
const path = require('path');
const settings = require('../settings/config.js');

class TutorialCommand {
    constructor(sock) {
        this.sock = sock;
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
    }

    async execute(from, args, isGroup, msg) {
        try {
            // Baca thumbnail
            let thumb;
            try {
                thumb = fs.readFileSync(this.defaultThumb);
            } catch (err) {
                console.log('Thumbnail not found, using default empty buffer');
                thumb = Buffer.from('');
            }

            // Definisi tutorialText
            const tutorialText = `*\`PANDUAN PENGGUNAAN\`*

*\`PUSH KONTAK\`*
• *${settings.prefix}ᴘᴜꜱʜᴋᴏɴᴛᴀᴋ-ᴠ1*
  ᴘᴜꜱʜ ᴋᴇ ꜱᴇᴍᴜᴀ ᴍᴇᴍʙᴇʀ ɢʀᴜᴘ
  *Format:* ${settings.prefix}pushkontak-v1 Pesan|DelayMs
  *Ex:* ${settings.prefix}pushkontak-v1 Halo|5000

• *${settings.prefix}ᴘᴜꜱʜᴋᴏɴᴛᴀᴋ-ᴠ2*
  ᴘᴜꜱʜ ᴠɪᴀ ɪᴅ ɢʀᴜᴘ
  *Format:* ${settings.prefix}pushkontak-v2 idgroup|Pesan|DelayMs
  *Ex:* ${settings.prefix}pushkontak-v2 123@g.us|Hi|5000

• *${settings.prefix}ᴘᴜꜱʜᴋᴏɴᴛᴀᴋ-ᴠ3*
  ᴘᴜꜱʜ ᴅᴇɴɢᴀɴ ᴅᴇʟᴀʏ ʀᴀɴᴅᴏᴍ
  *Format:* ${settings.prefix}pushkontak-v3 Pesan|MinDelay|MaxDelay
  *Ex:* ${settings.prefix}pushkontak-v3 Hi|1000|3000

• *${settings.prefix}ᴘᴜꜱʜᴋᴏɴᴛᴀᴋ-ᴠ4*
  ᴋᴏᴍʙɪɴᴀꜱɪ ᴠ2 ᴅᴀɴ ᴠ3
  *Format:* ${settings.prefix}pushkontak-v4 idgroup|Pesan|MinDelay|MaxDelay
  *Ex:* ${settings.prefix}pushkontak-v4 123@g.us|Hi|1000|3000

*\`GROUP MENU\`*
• *${settings.prefix}ꜱᴀᴠᴇᴋᴏɴᴛᴀᴋ-ᴠ1*
  ꜱᴀᴠᴇ ᴍᴇᴍʙᴇʀ ɢʀᴜᴘ ᴋᴇ ᴠᴄꜰ
  *Format:* ${settings.prefix}savekontak-v1
  ꜰɪʟᴇ ᴅɪᴋɪʀɪᴍ ᴋᴇ ᴏᴡɴᴇʀ

• *${settings.prefix}ꜱᴀᴠᴇᴋᴏɴᴛᴀᴋ-ᴠ2*
  ꜱᴀᴠᴇ ᴍᴇᴍʙᴇʀ ɢʀᴜᴘ ᴋᴇ ᴠᴄꜰ ᴠɪᴀ ɪᴅ ɢʀᴜᴘ
  *Format:* ${settings.prefix}savekontak-v2 <idgroup>
  ꜰɪʟᴇ ᴅɪᴋɪʀɪᴍ ᴋᴇ ᴏᴡɴᴇʀ

*\`ADMIN MENU\`*
• *${settings.prefix}ᴘʀᴏᴍᴏᴛᴇ/ᴅᴇᴍᴏᴛᴇ*
  ᴍᴇɴᴀɪᴋᴋᴀɴ/ᴍᴇɴᴜʀᴜɴᴋᴀɴ ᴊᴀʙᴀᴛᴀɴ ᴀᴅᴍɪɴ
  *Format:* ${settings.prefix}promote @tag
  *Format:* ${settings.prefix}demote @tag

• *${settings.prefix}ᴀɴᴛɪʟɪɴᴋ ᴏɴ/ᴏꜰꜰ*
  ᴍᴇɴɢᴀᴋᴛɪꜰᴋᴀɴ/ᴍᴇɴᴏɴᴀᴋᴛɪꜰᴋᴀɴ ᴀɴᴛɪʟɪɴᴋ
  *Format:* ${settings.prefix}antilink on/off

*\`AI CHAT MENU\`*
• *${settings.prefix}ɢᴘᴛ4ᴏ*
  ᴄʜᴀᴛ ᴅᴇɴɢᴀɴ ɢᴘᴛ-4 ᴏᴘᴇɴᴀɪ
  *Format:* ${settings.prefix}gpt4o Pertanyaan

• *${settings.prefix}ᴄʟᴀᴜᴅᴇ*
  ᴄʜᴀᴛ ᴅᴇɴɢᴀɴ ᴄʟᴀᴜᴅᴇ 3.5 ꜱᴏɴɴᴇᴛ
  *Format:* ${settings.prefix}claude Pertanyaan

*\`AI IMAGE MENU\`*
• *${settings.prefix}ᴛᴇxᴛ2ɪᴍɢ*
  ɢᴇɴᴇʀᴀᴛᴇ ɢᴀᴍʙᴀʀ ᴅᴀʀɪ ᴛᴇᴋꜱ
  *Format:* ${settings.prefix}text2img Prompt

• *${settings.prefix}ᴡᴀɪꜰᴜ*
  ɢᴇɴᴇʀᴀᴛᴇ ɢᴀᴍʙᴀʀ ᴡᴀɪꜰᴜ
  *Format:* ${settings.prefix}waifu Prompt

*\`TOOLS MENU\`*
• *${settings.prefix}ᴘᴀꜱᴛᴇʙɪɴ*
  ᴍᴇᴍʙᴜᴀᴛ ᴘᴀꜱᴛᴇ ᴅɪ ᴘᴀꜱᴛᴇʙɪɴ
  *Format:* ${settings.prefix}pastebin <text>

• *${settings.prefix}ɪɴꜰᴏ*
  ᴍᴇɴɢᴇᴄᴇᴋ ɪɴꜰᴏ ᴛᴇɴᴛᴀɴɢ ʙᴏᴛ
  *Format:* ${settings.prefix}info

*\`CATATAN\`*
• ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ʙᴏᴛ
• 1 ᴅᴇᴛɪᴋ = 1000ᴍꜱ
• ᴅᴇʟᴀʏ ᴍɪɴɪᴍᴀʟ 1000ᴍꜱ
• ᴍᴀx ᴅᴇʟᴀʏ > ᴍɪɴ ᴅᴇʟᴀʏ`;

            // Kirim pesan panduan
            await this.sock.sendMessage(from, {
                text: tutorialText,
                contextInfo: {
                    externalAdReply: {
                        title: settings.botName,
                        body: "ᴘᴀɴᴅᴜᴀɴ ʙᴏᴛ",
                        mediaType: 3,
                        thumbnail: thumb,
                        renderLargerThumbnail: false,
                        showAdAttribution: true
                    }
                }
            });

        } catch (error) {
            console.error('Error panduan:', error);
            
            // Error message dengan thumbnail
            let thumb;
            try {
                thumb = fs.readFileSync(this.defaultThumb);
            } catch (err) {
                thumb = Buffer.from('');
            }

            await this.sock.sendMessage(from, {
                text: `❌ ɢᴀɢᴀʟ ᴍᴇɴᴀᴍᴘɪʟᴋᴀɴ ᴘᴀɴᴅᴜᴀɴ, ᴀʟᴀꜱᴀɴ ᴇʀʀᴏʀ: ${error.message}`,
                contextInfo: {
                    externalAdReply: {
                        title: settings.botName,
                        body: "ᴇʀʀᴏʀ ᴏᴄᴄᴜʀʀᴇᴅ",
                        mediaType: 3,
                        thumbnail: thumb,
                        renderLargerThumbnail: false,
                        showAdAttribution: true
                    }
                }
            });
        }
    }
}

module.exports = TutorialCommand;
