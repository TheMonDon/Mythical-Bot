const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (role) {
    const logChan = db.get(`servers.${role.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${role.guild.id}.logs.log_system.role-deleted`);
    if (logSys !== 'enabled') return;
    const logChannel = role.guild.channels.cache.get(logChan);
    if (!logChannel.permissionsFor(this.client.user.id).has('SEND_MESSAGES')) return;

    const embed = new DiscordJS.MessageEmbed();
    embed.setTitle('Role Deleted');
    embed.setColor(role.hexColor);
    embed.addField('Name', role.name, true);
    embed.addField('Managed', role.managed, true);
    embed.addField('Position', role.position, true);
    embed.setFooter(`ID: ${role.id}`);
    embed.setTimestamp();
    role.guild.channels.cache.get(logChan).send(embed);
    db.add(`servers.${role.guild.id}.logs.role-deleted`, 1);
    db.add(`servers.${role.guild.id}.logs.all`, 1);
  }
};

