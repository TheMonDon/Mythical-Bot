const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(sticker) {
    const logChan = db.get(`servers.${sticker.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${sticker.guild.id}.logs.logSystem.sticker-deleted`);
    if (logSys !== 'enabled') return;

    const embed = new EmbedBuilder()
      .setTitle('Sticker Deleted')
      .setColor('#ff0000')
      .setThumbnail(sticker.url)
      .addFields([
        { name: 'Name', value: sticker.name },
        { name: 'Identifier', value: sticker.identifier },
        { name: 'Was Animated?', value: sticker.animated },
      ])
      .setFooter({ text: `sticker ID: ${sticker.id}` })
      .setTimestamp();

    sticker.guild.channels.cache
      .get(logChan)
      .send({ embeds: [embed] })
      .catch(() => {});

    db.add(`servers.${sticker.guild.id}.logs.sticker-deleted`, 1);
    db.add(`servers.${sticker.guild.id}.logs.all`, 1);
  }
};
