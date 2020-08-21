const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (channel) {
    const logChan = db.get(`servers.${channel.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${channel.guild.id}.logs.log_system.channel-deleted`);
    if (logSys !== 'enabled') return;
    if (channel.name.startsWith('ticket-')) return;

    const chans = db.get(`servers.${channel.guild.id}.logs.noLogChans`);
    if (chans.includes(channel.id)) return;

    const embed = new DiscordJS.MessageEmbed()
      .setTitle('Channel Deleted')
      .setColor('RED')
      .addField('Name', channel.name, true)
      .addField('Category', (channel.parent && channel.parent.name) ? channel.parent.name : 'None', true)
      .setFooter(`ID: ${channel.id}`)
      .setTimestamp();
    channel.guild.channels.cache.get(logChan).send(embed);
    db.add(`servers.${channel.guild.id}.logs.channel-deleted`, 1);
    db.add(`servers.${channel.guild.id}.logs.all`, 1);
  }
};
