const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(oldEmoji, newEmoji) {
    if (oldEmoji.name === newEmoji.name && oldEmoji.identifier === newEmoji.identifier) return;

    const logChan = db.get(`servers.${oldEmoji.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${oldEmoji.guild.id}.logs.logSystem.emoji`);
    if (logSys !== 'enabled') return;

    const embed = new EmbedBuilder()
      .setTitle('Emoji Updated')
      .setColor(this.client.getSettings(oldEmoji.guild).embedSuccessColor)
      .setThumbnail(oldEmoji.url)
      .setTimestamp()
      .addFields([
        { name: 'Emoji ID', value: oldEmoji.id, inline: true },
        { name: 'Is Animated?', value: oldEmoji.animated ? 'True' : 'False', inline: true },
      ]);

    if (oldEmoji.name !== newEmoji.name)
      embed.addFields([
        { name: 'Old Name', value: oldEmoji.name, inline: true },
        { name: 'New Name', value: newEmoji.name, inline: true },
      ]);

    if (oldEmoji.identifier !== newEmoji.identifier)
      embed.addFields([
        { name: 'Old Identifier', value: oldEmoji.identifier, inline: true },
        { name: 'New Identifier', value: newEmoji.identifier, inline: true },
      ]);

    oldEmoji.guild.channels.cache
      .get(logChan)
      .send({ embeds: [embed] })
      .catch(() => {});

    db.add(`servers.${oldEmoji.guild.id}.logs.emoji`, 1);
    db.add(`servers.${oldEmoji.guild.id}.logs.all`, 1);
  }
};
