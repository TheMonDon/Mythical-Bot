const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (rolebefore, roleafter) {
    if (rolebefore === roleafter) return;
    if (rolebefore.name === roleafter.name && rolebefore.hexColor === roleafter.hexColor) return;

    const logChan = db.get(`servers.${roleafter.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSystem = db.get(`servers.${roleafter.guild.id}.logs.logSystem.role-updated`);
    if (logSystem !== 'enabled') return;

    const embed = new EmbedBuilder()
      .setTitle(`Role "${rolebefore.name}" Updated`)
      .setColor(roleafter.hexColor)
      .addFields([
        { name: 'Name', value: (rolebefore.name === roleafter.name) ? 'Updated: ❌' : `Updated: ✅ \nNew Name: ${roleafter.name}` },
        { name: 'Color', value: (rolebefore.hexColor === roleafter.hexColor) ? 'Updated: ❌' : `Updated: ✅ \nNew Color: ${roleafter.hexColor}` }
      ])
      .setFooter({ text: `ID: ${roleafter.id}` })
      .setTimestamp();
    roleafter.guild.channels.cache.get(logChan).send({ embeds: [embed] }).catch(() => {});

    db.add(`servers.${roleafter.guild.id}.logs.role-updated`, 1);
    db.add(`servers.${roleafter.guild.id}.logs.all`, 1);
  }
};
