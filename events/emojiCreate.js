const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (emoji) {
    const logChan = db.get(`servers.${emoji.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${emoji.guild.id}.logs.log_system.emoji-created`);
    if (logSys !== 'enabled') return;

    const logChannel = emoji.guild.channels.cache.get(logChan);
    if (!logChannel.permissionsFor(this.client.user.id).has('SEND_MESSAGES')) return;

    const embed = new DiscordJS.MessageEmbed();
    embed.setTitle('Emoji Created');
    embed.setColor('#20fc3a');
    embed.setThumbnail(emoji.url);
    embed.addField('Name', emoji.name, true);
    embed.addField('Identifier', emoji.identifier, true);
    embed.addField('Is Animated?', emoji.animated, true);
    embed.setFooter(`ID: ${emoji.id}`);
    embed.setTimestamp();
    emoji.guild.channels.cache.get(logChan).send({ embeds: [embed] });

    db.add(`servers.${emoji.guild.id}.logs.emoji-created`, 1);
    db.add(`servers.${emoji.guild.id}.logs.all`, 1);
  }
};
