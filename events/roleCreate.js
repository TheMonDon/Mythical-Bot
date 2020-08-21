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

    const embed = new DiscordJS.MessageEmbed();
    embed.setTitle('Role Created');
    embed.setColor('#20fc3a');
    embed.addField('Name', role, true);
    embed.addField('Managed', role.managed, true);
    embed.addField('Position', role.position, true);
    embed.setFooter(`ID: ${role.id}`);
    embed.setTimestamp();
    role.guild.channels.cache.get(logChan).send(embed);
    db.add(`servers.${role.guild.id}.logs.role-created`, 1);
    db.add(`servers.${role.guild.id}.logs.all`, 1);
  }
};

