const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(rolebefore, roleafter) {
    if (rolebefore === roleafter) return;
    if (rolebefore.name === roleafter.name && rolebefore.hexColor === roleafter.hexColor) return;

    const logChan = await db.get(`servers.${roleafter.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSystem = await db.get(`servers.${roleafter.guild.id}.logs.logSystem.role-updated`);
    if (logSystem !== 'enabled') return;

    const embed = new EmbedBuilder()
      .setTitle(`Role "${rolebefore.name}" Updated`)
      .setColor(roleafter.hexColor)
      .setFooter({ text: `ID: ${roleafter.id}` })
      .setTimestamp();

    if (rolebefore.name !== roleafter.name)
      embed.addFields([{ name: 'New Name', value: roleafter.name, inline: true }]);
    if (rolebefore.hexColor !== roleafter.hexColor)
      embed.addFields([
        { name: 'Old Color', value: rolebefore.hexColor.toString(), inline: true },
        { name: 'New Color', value: roleafter.hexColor.toString(), inline: true },
      ]);

    if (embed.fields?.length === 0) return;

    roleafter.guild.channels.cache
      .get(logChan)
      .send({ embeds: [embed] })
      .catch(() => {});

    await db.add(`servers.${roleafter.guild.id}.logs.role-updated`, 1);
    await db.add(`servers.${roleafter.guild.id}.logs.all`, 1);
  }
};
