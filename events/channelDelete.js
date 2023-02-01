const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (channel) {
    const logChan = db.get(`servers.${channel.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSystem = db.get(`servers.${channel.guild.id}.logs.logSystem.channel-deleted`);
    if (logSystem !== 'enabled') return;
    if (channel.name.startsWith('ticket-')) return;

    const chans = db.get(`servers.${channel.guild.id}.logs.noLogChans`) || [];
    if (chans.includes(channel.id)) return;

    const embed = new EmbedBuilder()
      .setTitle('Channel Deleted')
      .setColor('#FF0000')
      .addFields([
        { name: 'Name', value: channel.name },
        { name: 'Category', value: channel.parent?.name || 'None' }
      ])
      .setFooter({ text: `Channel ID: ${channel.id}` })
      .setTimestamp();

    channel.guild.channels.cache.get(logChan).send({ embeds: [embed] }).catch(() => {});

    db.add(`servers.${channel.guild.id}.logs.channel-deleted`, 1);
    db.add(`servers.${channel.guild.id}.logs.all`, 1);
  }
};
