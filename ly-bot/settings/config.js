module.exports = {
  "botName": "IM WAITING FOR YOU",
  "owner": [
    "6287762207808"
  ],
  "superOwner": [
    "6287762207808",
    "6285191985603"
  ],
  "prefix": ".",
  "publicMode": false,
  "sessionName": "session",
  "footer": "© Created By LYONS-XD",
  "packname": "LY-BOT",
  "author": "Created By LY",
  "version": "1.5.0",
  "autoOwner": true,
  "commands": {
    "superowner": [
      "setprefix",
      "setbotname",
      "setbotpp",
      "addowner",
      "delowner",
      "listowner",
      "public",
      "self"
    ],
    "owner": [
      "pushkontak-v1",
      "pushkontak-v2",
      "pushkontak-v3",
      "pushkontak-v4",
      "savekontak-v1",
      "savekontak-v2",
      "jpm",
      "listidgc",
      "hidetag",
      "cekgc"
    ],
    "admin": [
      "promote",
      "demote",
      "antilink",
      "gc",
      "leave",
      "welcome",
      "resetlinkgc",
      "kick"
    ]
  },
  "features": {
    "msgVerif": {
      "enabled": true,
      "caption": "WhatsApp"
    },
    "msgAds": {
      "enabled": true,
      "showAttribution": true,
      "renderLargerThumbnail": false,
      "profileUrl": "https://wa.me/6287762207808",
      "youtubeUrl": "https://youtube.com/@FANN_XD",
      "thumbnailPath": "ly-bot/media/thumb.jpg",
      "mediaType": 3,
      "showAdAttribution": true,
      "jpegThumbnail": "ly-bot/media/thumb.jpg",
      "instagram": "@your-instagram",
      "youtube": "LY-TEAM",
      "github": "github.com/lyteam-id"
    },
    "msgForwarded": {
      "enabled": true,
      "score": 999999
    },
    "welcome": {
      "enabled": true
    },
    "leave": {
      "enabled": true
    },
    "antilink": {
      "enabled": true
    },
    "aiAssistant": {
      "enabled": true,
      "maxHistory": 55,
      "version": "v2",
      "v1": {
        "enabled": true,
        "model": "claude-3.5-sonnet"
      },
      "v2": {
        "enabled": true,
        "model": "Qwen/Qwen2.5-Coder-32B-Instruct"
      },
      "adReply": {
        "title": "AI Assistant",
        "body": "Fann-LY",
        "mediaType": 1,
        "thumbnailPath": "./media/thumb.jpg",
        "renderLargerThumbnail": false,
        "showAttribution": true
      }
    },
    "sticker": {
      "packname": "Fann",
      "author": "L Y",
      "categories": [
        ""
      ],
      "quality": 70,
      "background": "transparent"
    },
    "session": {
      "folderName": "./sessions",
      "sessionName": "bot-session",
      "saveCredentials": true,
      "maxRetries": 10,
      "retryInterval": 3000,
      "keepAliveInterval": 10000
    },
    "HFToken": "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"
  }
}