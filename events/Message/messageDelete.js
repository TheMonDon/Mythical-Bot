const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(msg) {
    if (msg.author.bot) return;
    if (!msg.guild) return;

    const logChan = db.get(`servers.${msg.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${msg.guild.id}.logs.logSystem.message-deleted`);
    if (logSys !== 'enabled') return;

    const chans = db.get(`servers.${msg.guild.id}.logs.noLogChans`) || [];
    if (chans.includes(msg.channel.id)) return;

    // Check if a game is being played by message author (hangman, connect4, etc)
    const current = this.client.games.get(msg.channel.id);
    if (current && ['connect4', 'hangman', 'wordle'].includes(current.name) && current.user === msg.author.id) return;

    let delby;
    if (msg.guild.members.me.permissions.has('ViewAuditLog')) {
      msg.guild
        .fetchAuditLogs()
        .then((audit) => {
          delby = audit.entries.first().executor;
        })
        .catch(console.error);
    }

    try {
      const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
      const embed = new EmbedBuilder()
        .setTitle('Message Deleted')
        .setColor('#FF0000')
        .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
        .setThumbnail(msg.author.displayAvatarURL())
        .addFields([
          { name: 'Channel', value: `<#${msg.channel.id}>` },
          { name: 'Message Author', value: `${msg.author} (${authorName})` },
        ])
        .setFooter({ text: `Message ID: ${msg.id}` })
        .setTimestamp();

      if (msg.content) embed.setDescription(`**Content:**\n${msg.content}`);
      if (msg.attachments?.size > 0) {
        const attachmentString = msg.attachments.map((attachment) => `[${attachment.name}](${attachment.url})\n`);
        embed.addFields([{ name: 'Attachments', value: attachmentString.join('').slice(0, 1_024) }]);
      }

      if (msg.stickers?.size > 0) {
        const stickerString = msg.stickers.map((sticker) => `[${sticker.name}](${sticker.url})\n`);
        embed.addFields([{ name: 'Stickers', value: stickerString.join('').slice(0, 1_024) }]);
      }

      if (delby && msg.author !== delby) embed.addFields([{ name: 'Deleted By', value: delby }]);
      if (msg.mentions.users.size >= 1)
        embed.addFields([{ name: 'Mentioned Users', value: `${[...msg.mentions.users.values()]}` }]);

      msg.guild.channels.cache
        .get(logChan)
        .send({ embeds: [embed] })
        .catch(() => {});

      db.add(`servers.${msg.guild.id}.logs.message-deleted`, 1);
      db.add(`servers.${msg.guild.id}.logs.all`, 1);
    } catch (err) {
      console.error(err);
    }
  }
};
