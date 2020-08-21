const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (rolebefore, roleafter) {
    const logChan = db.get(`servers.${roleafter.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${roleafter.guild.id}.logs.log_system.role-updated`);
    if (logSys !== 'enabled') return;

    if (rolebefore.name === roleafter.name && rolebefore.hexColor === roleafter.hexColor) return;

    const embed = new DiscordJS.MessageEmbed();
    embed.setTitle(`Role "${rolebefore.name}" Updated`);
    embed.setColor(roleafter.hexColor);
    embed.addField('Name', (rolebefore.name == roleafter.name) ? 'Updated: :x:' : `Updated: ✅ \n New Name: ${roleafter.name}`, true);
    embed.addField('Color', (rolebefore.hexColor == roleafter.hexColor) ? 'Updated: :x:' : `Updated: ✅ \n New Color: ${roleafter.hexColor}`, true);
    embed.setFooter(`ID: ${roleafter.id}`);
    embed.setTimestamp();
    roleafter.guild.channels.cache.get(logChan).send(embed);
    db.add(`servers.${roleafter.guild.id}.logs.role-updated`, 1);
    db.add(`servers.${roleafter.guild.id}.logs.all`, 1);
  }
};

