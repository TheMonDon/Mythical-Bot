const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (channel) {
    if (!channel) return;
    if (channel.type === 'dm') return;

    const logChan = db.get(`servers.${channel.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${channel.guild.id}.logs.log_system.channel-created`);
    if (logSys !== 'enabled') return;
    if (channel.name.startsWith('ticket-')) return;

    const chans = db.get(`servers.${channel.guild.id}.logs.noLogChans`) || [];
    if (chans.includes(channel.id)) return;

    const logChannel = channel.guild.channels.cache.get(logChan);
    if (!logChannel.permissionsFor(this.client.user.id).has('SEND_MESSAGES')) return;

    const embed = new DiscordJS.MessageEmbed()
      .setTitle('Channel Created')
      .setColor('#20fc3a')
      .addField('Name', channel.name, true)
      .addField('Category', channel.parent?.name || 'None', true)
      .setFooter({ text: `ID: ${channel.id}` })
      .setTimestamp();
    channel.guild.channels.cache.get(logChan).send({ embeds: [embed] });

    db.add(`servers.${channel.guild.id}.logs.channel-created`, 1);
    db.add(`servers.${channel.guild.id}.logs.all`, 1);
  }
};
