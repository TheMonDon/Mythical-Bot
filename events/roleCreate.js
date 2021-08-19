const db = require('quick.db');
const DiscordJS = require('discord.js');

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
    if (!logChannel.permissionsFor(this.client.user.id).has('SEND_MESSAGES')) return;

    const embed = new DiscordJS.MessageEmbed()
      .setTitle('Role Created')
      .setColor('#20fc3a')
      .addField('Name', role, true)
      .addField('Managed', role.managed, true)
      .addField('Position', role.position, true)
      .setFooter(`ID: ${role.id}`)
      .setTimestamp();
    role.guild.channels.cache.get(logChan).send({ embeds: [embed] });

    db.add(`servers.${role.guild.id}.logs.role-created`, 1);
    db.add(`servers.${role.guild.id}.logs.all`, 1);
  }
};
