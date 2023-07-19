const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(sticker) {
    const guild = this.client.guilds.cache.get(sticker.guildId);

    const logChan = db.get(`servers.${guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${guild.id}.logs.logSystem.sticker`);
    if (logSys !== 'enabled') return;

    const embed = new EmbedBuilder()
      .setTitle('Sticker Deleted')
      .setColor(this.client.getSettings(guild).embedErrorColor)
      .setThumbnail(sticker.url)
      .addFields([
        { name: 'Name', value: sticker.name },
        { name: 'Sticker ID', value: sticker.id },
        { name: 'Description', value: sticker.description },
        { name: 'Tags', value: sticker.tags },
      ])
      .setTimestamp();

    guild.channels.cache
      .get(logChan)
      .send({ embeds: [embed] })
      .catch(() => {});

    db.add(`servers.${guild.id}.logs.sticker`, 1);
    db.add(`servers.${guild.id}.logs.all`, 1);
  }
};
