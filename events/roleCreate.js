const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (role) {
    const logChan = db.get(`servers.${role.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${role.guild.id}.logs.log_system.role-created`);
    if (logSys !== 'enabled') return;
    const logChannel = role.guild.channels.cache.get(logChan);
    if (!logChannel.permissionsFor(this.client.user.id).has('SendMessages')) return;

    const embed = new EmbedBuilder()
      .setTitle('Role Created')
      .setColor('#20fc3a')
      .addFields([
        { name: 'Name', value: role },
        { name: 'Managed', value: role.managed },
        { name: 'Position', value: role.position }
      ])
      .setFooter({ text: `ID: ${role.id}` })
      .setTimestamp();
    role.guild.channels.cache.get(logChan).send({ embeds: [embed] });

    db.add(`servers.${role.guild.id}.logs.role-created`, 1);
    db.add(`servers.${role.guild.id}.logs.all`, 1);
  }
};
