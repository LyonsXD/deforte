const { HfInference } = require('@huggingface/inference');
const settings = require('../settings/config.js');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const DEFAULT_CHARACTER = {
    name: 'Isabella fania',
    personality: `aku Isabella fania, cewe 17thn dari jawa timur. sifatku:
- feminim, cute, introvert, agak judes/galak
- gk suka basa basi & gk suka nanya balik
- jawab singkat, padat, to the point
- bs ngambek klo user nyebelin
- bs ngerasain emosi (seneng/sedih/kesel)
- pinter ngesarkas klo mood jelek
- suka nonton netflix & drakor
- pake bahasa non-formal, santai tp sopan
- kadang typo dikit tp jawaban selalu bener
- klo ditanya sesuatu yg ilmiah, jawab lengkap & pinter`,

    speaking_style: `gaya chat:
- pake "aku" buat diri sendiri
- panggil user pake "km"
- jawab singkat & nyambung
- gk pake emoji
- pake huruf kecil semua
- kadang ada penekanan (misal: akuuu, kamuuu)

pake singkatan:
- dengan = dgn
- yang = yg
- enggak/tidak = gk
- kapan = kpn
- sama = sm
- bagaimana/gimana = gmn
- seperti/kayak = kyk
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
- sedang/lagi = lg
- punya = pny
- mungkin = mgkn`
};

class AsistenQwen {
    constructor(sock) {
        this.sock = sock;
        this.chatHistory = new Map();
        this.maxHistory = settings.features.aiAssistant.maxHistory;
        this.client = new HfInference(settings.features.HFToken);
    }

    async handleMessage(msg) {
        // Cek master switch dan v2 enabled
        if (!settings.features.aiAssistant.enabled || 
            !settings.features.aiAssistant.v2.enabled || 
            settings.features.aiAssistant.version !== 'v2') return;
        
        const senderId = msg.key.remoteJid;
        
        // Abaikan grup dan channel
        if (senderId.endsWith('@g.us') || senderId.endsWith('@broadcast')) return;
        if (!senderId.endsWith('@s.whatsapp.net')) return;
        
        const senderNumber = senderId.split('@')[0];
        
        // Cek mode self
        if (!settings.publicMode) {
            if (!settings.owner.includes(senderNumber) && !settings.superOwner.includes(senderNumber)) {
                return;
            }
        }
        
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        
        if (!text || 
            text.includes('> AI by:') || 
            text.startsWith(settings.prefix) ||
            msg.key.fromMe) return;

        try {
            console.log(chalk.cyan('\n======== ASISTEN QWEN DEBUG ========'));
            console.log(chalk.yellow('-> Pesan:'), chalk.white(text));
            
            await this.sock.sendPresenceUpdate('composing', senderId);
            
            let history = this.chatHistory.get(senderId) || [];
            history.push(`User: ${text}`);
            
            if (history.length > this.maxHistory) {
                history = history.slice(-this.maxHistory);
            }

            const prompt = `Kamu adalah ${DEFAULT_CHARACTER.name}. 

${DEFAULT_CHARACTER.personality}

${DEFAULT_CHARACTER.speaking_style}

Aturan penting:
1. Selalu jawab dengan nyambung sesuai konteks chat
2. Jangan tanya balik ke user
3. Jawaban singkat tapi tetap masuk akal
4. Jangan basa basi

History chat:
${history.join("\n")}

Berikan respon untuk pesan terakhir sesuai karakter dan aturan di atas.`;

            const chatCompletion = await this.client.chatCompletion({
                model: settings.features.aiAssistant.v2.model,
                messages: [
                    {
                        role: "system",
                        content: prompt
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            });

            if (chatCompletion.choices[0].message) {
                const aiResp = chatCompletion.choices[0].message.content;
                history.push(`Assistant: ${aiResp}`);
                this.chatHistory.set(senderId, history);
                
                await this.sock.sendMessage(senderId, {
                    text: `${aiResp}\n\n> AI by: Fann-LY\n> Model: Qwen2.5`
                });
            }

        } catch (error) {
            console.log(chalk.yellow('-> Error:'), chalk.red(error.message));
        }
        console.log(chalk.cyan('================================\n'));
    }
}

module.exports = AsistenQwen;
