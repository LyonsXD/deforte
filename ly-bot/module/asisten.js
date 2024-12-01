const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const axios = require('axios');
const settings = require('../settings/config.js');

// Path Constants
const CONTEXT_PATH = path.join(__dirname, '..', 'fann-context', 'asisten');
const USER_DATA_PATH = path.join(__dirname, '..', 'user-data');

// Buat folder jika belum ada
if (!fs.existsSync(CONTEXT_PATH)) fs.mkdirSync(CONTEXT_PATH, { recursive: true });
if (!fs.existsSync(USER_DATA_PATH)) fs.mkdirSync(USER_DATA_PATH, { recursive: true });

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
        WRONG_FORMAT: '❌ Format Salah! Gunakan: .asisten on/off',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan'
    },
    SUCCESS: {
        ENABLED: '✅ AI Asisten berhasil diaktifkan',
        DISABLED: '✅ AI Asisten berhasil dinonaktifkan',
        CHAR_CHANGED: '✅ Berhasil mengganti karakter menjadi {character}',
        CHAR_RESET: '✅ Berhasil mereset karakter ke default'
    },
    CHARACTER: {
        NOT_FOUND: '❌ Karakter tidak ditemukan!\n\nKarakter yang tersedia:\n• {characters}',
        INFO: '*AI Response*\n*Character:* {character}\n\n{response}'
    }
};

const DEFAULT_CHARACTER = {
    name: 'default',
    personality: "aku asisten chat yg natural bgt. jawab singkat, padat, gk pake emoji. gaya bahasanya kek org asli yg ngetik cepet. aku bs diajak ngobrol santai, serius, atau bercanda. aku pny kepribadian sendiri jd bs ngerti perasaan kamu dan bs ngasih respon yg sesuai",
    speaking_style: `pake singkatan:
- dengan = dgn
- yang = yg
- enggak/tidak = gk
- kapan = kpn
- sama = sm
- sama dengan = sm dgn
- bagaimana = gmn
- gimana = gmn
- seperti = kyk
- kayak = kyk
- untuk = utk
- sudah = udh
- belum = blm
- saja = aja
- bisa = bs
- jadi = jd
- kalau = klo
- atau = ato
- tapi = tp
- juga = jg
- sekarang = skrg
- nanti = nti
- masih = msh
- memang = emg
- kenapa = knp
- karena = krn
- tentang = ttg
- sampai = smp
- sedang = lg
- lagi = lg
- punya = pny
- mungkin = mgkn

pake huruf kecil semua, gk usah baku, santai tp tetep sopan, baru bisa becanda dikit, darkjokes, dan bisa typo , tapi jawaban selalu bqener gk bisa slah , bisa marah bisa ngerasain sedih sebel karena user, kayak cewe bisa ngambek..`
};

// Fann

class AssistantCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['asisten', 'a'];
        this.description = 'AI Asisten dengan berbagai karakter';
        this.configPath = path.join(__dirname, '..', 'settings', 'config.js');
        this.chatHistory = new Map();
        this.maxHistory = 100;
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
        this.userCharacters = new Map();
        this.loadUserCharacters();
    }

    loadUserCharacters() {
        try {
            const userDataFile = path.join(USER_DATA_PATH, 'characters.json');
            
            // Buat file baru jika belum ada
            if (!fs.existsSync(userDataFile)) {
                fs.writeFileSync(userDataFile, JSON.stringify({}, null, 2));
                this.userCharacters = new Map();
                return;
            }

            // Baca file yang ada
            const fileContent = fs.readFileSync(userDataFile, 'utf8');
            
            // Cek apakah file kosong
            if (!fileContent.trim()) {
                fs.writeFileSync(userDataFile, JSON.stringify({}, null, 2));
                this.userCharacters = new Map();
                return;
            }

            // Parse JSON dengan error handling
            try {
                const data = JSON.parse(fileContent);
                this.userCharacters = new Map(Object.entries(data));
            } catch (parseError) {
                console.error('Error parsing characters.json:', parseError);
                // Reset file jika corrupt
                fs.writeFileSync(userDataFile, JSON.stringify({}, null, 2));
                this.userCharacters = new Map();
            }
        } catch (error) {
            console.error('Error in loadUserCharacters:', error);
            this.userCharacters = new Map();
        }
    }

    saveUserCharacters() {
        const userDataFile = path.join(USER_DATA_PATH, 'characters.json');
        const data = Object.fromEntries(this.userCharacters);
        fs.writeFileSync(userDataFile, JSON.stringify(data, null, 2));
    }

    getCharacterContext(character) {
        try {
            const contextFile = path.join(CONTEXT_PATH, `${character}.js`);
            if (!fs.existsSync(contextFile)) {
                return DEFAULT_CHARACTER;
            }
            
            const context = require(contextFile);
            if (!context.personality || !context.speaking_style) {
                return DEFAULT_CHARACTER;
            }
            
            return context;
        } catch (error) {
            console.error('Error loading character context:', error);
            return DEFAULT_CHARACTER;
        }
    }

    getAvailableCharacters() {
        try {
            return fs.readdirSync(CONTEXT_PATH)
                .filter(file => file.endsWith('.js'))
                .map(file => {
                    const character = require(path.join(CONTEXT_PATH, file));
                    return {
                        name: character.name,
                        description: character.description || ''
                    };
                });
        } catch (error) {
            console.error('Error getting characters:', error);
            return [];
        }
    }

    async handleCharacterChange(sender, character) {
        if (character === 'reset') {
            this.userCharacters.delete(sender);
            this.saveUserCharacters();
            return MESSAGES.CHAR_RESET;
        }

        const characters = this.getAvailableCharacters();
        const characterExists = characters.some(c => 
            c.name.toLowerCase() === character.toLowerCase()
        );
        
        if (!characterExists) {
            const charList = characters
                .map(c => `• ${c.name}${c.description ? ` - ${c.description}` : ''}`)
                .join('\n');
            return MESSAGES.CHAR_NOT_FOUND.replace('{characters}', charList);
        }

        this.userCharacters.set(sender, character.toLowerCase());
        this.saveUserCharacters();
        return MESSAGES.CHAR_CHANGED.replace('{character}', character);
    }

    async processAIResponse(text, senderId) {
        const character = this.userCharacters.get(senderId) || 'default';
        const context = this.getCharacterContext(character);
        
        let history = this.chatHistory.get(senderId) || [];
        history.push(`User: ${text}`);
        
        if (history.length > this.maxHistory) {
            history = history.slice(-this.maxHistory);
        }

        const prompt = `${context.personality}\n\n${context.speaking_style}\n\nhistory chat:\n${history.join("\n")}\n\nkasih respon utk pesan terakhir.`;

        // Sisanya sama seperti kode asli
    }

    async sendReaction(msg, emoji) {
        await this.sock.sendMessage(msg.key.remoteJid, {
            react: {
                text: emoji,
                key: msg.key
            }
        });
    }

    async sendWithThumb(from, text, title) {
        await this.sock.sendMessage(from, {
            text: text,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: settings.footer,
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
        
        // Langsung return tanpa respon jika mode self dan bukan owner
        if (!settings.publicMode && 
            !settings.owner.includes(senderNumber) && 
            !settings.superOwner.includes(senderNumber)) {
            return;
        }

        // Cek level command
        if (settings.commands.superowner.includes(commandName)) {
            if (!settings.superOwner.includes(senderNumber)) {
                await this.sendWithThumb(from, MESSAGES.SUPER_OWNER_ONLY, settings.botName, "ᴀᴋꜱᴇꜱ ᴅɪᴛᴏʟᴀᴋ");
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }
        } else if (settings.commands.owner.includes(commandName)) {
            if (!settings.owner.includes(senderNumber) && !settings.superOwner.includes(senderNumber)) {
                await this.sendWithThumb(from, MESSAGES.OWNER_ONLY, settings.botName, "ᴀᴋꜱᴇꜱ ᴅɪᴛᴏʟᴀᴋ");
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }
        }

        await this.sendReaction(msg, '⏳');

        try {
            const command = Array.isArray(args) ? args[0]?.toLowerCase() : args?.toLowerCase();
            
            // Tampilkan help message jika command help atau tidak ada command
            if (!command || command === 'help') {
                await this.sendWithThumb(from, HELP_MESSAGES.PRIVATE_CHAT, "ᴀꜱɪꜱᴛᴇɴ ᴍᴇɴᴜ");
                await this.sendReaction(msg, '✅');
                return;
            }

            // Cek jika command untuk ganti karakter
            if (command?.startsWith('-')) {
                const character = command.slice(1);
                const result = await this.handleCharacterChange(sender, character);
                await this.sendWithThumb(from, result, "ᴀꜱɪꜱᴛᴇɴ ꜱᴇᴛᴛɪɴɢꜱ");
                await this.sendReaction(msg, result.includes('❌') ? REACTIONS.ERROR : REACTIONS.SUCCESS);
                return;
            }

            // Cek command on/off
            if (command !== 'on' && command !== 'off') {
                await this.sendWithThumb(from, MESSAGES.WRONG_FORMAT, "ꜰᴏʀᴍᴀᴛ ꜱᴀʟᴀʜ");
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }

            const isEnabled = command === 'on';
            settings.features.aiAssistant.enabled = isEnabled;

            // Simpan perubahan ke config
            const configContent = `module.exports = ${JSON.stringify(settings, null, 2)}`;
            fs.writeFileSync(this.configPath, configContent);
            delete require.cache[require.resolve('../settings/config.js')];

            await this.sendWithThumb(
                from,
                `${MESSAGES.SUCCESS}${isEnabled ? 'ᴅɪᴀᴋᴛɪꜰᴋᴀɴ' : 'ᴅɪɴᴏɴᴀᴋᴛɪꜰᴋᴀɴ'}`,
                "ᴀꜱɪꜱᴛᴇɴ ꜱᴇᴛᴛɪɴɢꜱ"
            );
            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error in assistant:', error);
            await this.sendWithThumb(from, `${MESSAGES.ERROR}${error.message}`, "ᴇʀʀᴏʀ ᴏᴄᴄᴜʀʀᴇᴅ");
            await this.sendReaction(msg, REACTIONS.ERROR);
        }
    }

    async handleMessage(msg) {
        // Cek master switch dan v1 enabled
        if (!settings.features.aiAssistant.enabled || 
            !settings.features.aiAssistant.v1.enabled || 
            settings.features.aiAssistant.version !== 'v1') return;
        
        const senderId = msg.key.remoteJid;
        
        // Abaikan semua kecuali chat pribadi
        if (!senderId.endsWith('@s.whatsapp.net')) return;
        
        const senderNumber = senderId.split('@')[0];
        
        // Cek mode self
        if (!settings.publicMode) {
            if (!settings.owner.includes(senderNumber) && !settings.superOwner.includes(senderNumber)) {
                await this.sendWithThumb(senderId, MESSAGES.ERROR.SELF_MODE, settings.botName);
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }
        }
        
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        
        // Skip jika:
        // 1. Pesan kosong
        // 2. Pesan dari bot sendiri
        // 3. Pesan mengandung tag AI
        // 4. Pesan adalah command
        if (!text || 
            msg.key.fromMe ||
            text.includes('> AI by:') || 
            text.startsWith(settings.prefix)) return;
        
        try {
            console.log(chalk.cyan('\n======== ASISTEN DEBUG ========'));
            console.log(chalk.yellow('-> Pesan:'), chalk.white(text));
            
            await this.sock.sendPresenceUpdate('composing', senderId);
            
            const character = this.userCharacters.get(senderId) || 'default';
            const context = this.getCharacterContext(character);
            
            let history = this.chatHistory.get(senderId) || [];
            history.push(`User: ${text}`);
            
            if (history.length > this.maxHistory) {
                history = history.slice(-this.maxHistory);
            }

            const prompt = `${context.personality}\n\n${context.speaking_style}\n\nhistory chat:\n${history.join("\n")}\n\nkasih respon utk pesan terakhir.`;

            const response = await axios.get('https://api.ryzendesu.vip/api/ai/blackbox', {
                params: {
                    chat: prompt,
                    options: 'claude-3.5-sonnet'
                },
                headers: { 'Accept': 'application/json' },
                timeout: 30000
            });

            if (response.data?.response) {
                const aiResp = response.data.response;
                history.push(`Assistant: ${aiResp}`);
                this.chatHistory.set(senderId, history);
                
                const characterName = character === 'default' ? 'Default' : character.charAt(0).toUpperCase() + character.slice(1);
                
                await this.sock.sendMessage(senderId, {
                    text: `${aiResp}\n\n> AI by: Fann-LY\n> Character: ${characterName}`
                });
            }
        } catch (error) {
            console.log(chalk.yellow('-> Error:'), chalk.red(error.message));
        }
        console.log(chalk.cyan('================================\n'));
    }
}

module.exports = AssistantCommand;
