const db = require('quick.db');
const { ChannelType, EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (channel) {
    if (channel.type === ChannelType.DM) return;

    const logChannelId = db.get(`servers.${channel.guild.id}.logs.channel`);
    if (!logChannelId) return;

    const logSystem = db.get(`servers.${channel.guild.id}.logs.logSystem.channel-created`);
    if (logSystem !== 'enabled') return;
    if (channel.name.startsWith('ticket-')) return;

    const chans = db.get(`servers.${channel.guild.id}.logs.noLogChans`) || [];
    if (chans.includes(channel.id)) return;

    const embed = new EmbedBuilder()
      .setTitle('Channel Created')
      .setColor('#20fc3a')
      .addFields([
        { name: 'Name', value: channel.name },
        { name: 'Category', value: channel.parent?.name || 'None' }
      ])
      .setFooter({ text: `ID: ${channel.id}` })
      .setTimestamp();
    channel.guild.channels.cache.get(logChannelId).send({ embeds: [embed] }).catch(() => {});

    db.add(`servers.${channel.guild.id}.logs.channel-created`, 1);
    db.add(`servers.${channel.guild.id}.logs.all`, 1);
  }
};
