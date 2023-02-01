const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (emoji) {
    const logChan = db.get(`servers.${emoji.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${emoji.guild.id}.logs.logSystem.emoji-deleted`);
    if (logSys !== 'enabled') return;

    const embed = new EmbedBuilder()
      .setTitle('Emoji Deleted')
      .setColor('#ff0000')
      .setThumbnail(emoji.url)
      .addFields([
        { name: 'Name', value: emoji.name },
        { name: 'Identifier', value: emoji.identifier },
        { name: 'Was Animated?', value: emoji.animated }
      ])
      .setFooter({ text: `Emoji ID: ${emoji.id}` })
      .setTimestamp();

    emoji.guild.channels.cache.get(logChan).send({ embeds: [embed] }).catch(() => {});

    db.add(`servers.${emoji.guild.id}.logs.emoji-deleted`, 1);
    db.add(`servers.${emoji.guild.id}.logs.all`, 1);
  }
};
