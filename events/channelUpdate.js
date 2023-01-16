const db = require('quick.db');
const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (channel, newChannel) {
    if (channel === newChannel) return;
    if (channel.parent === newChannel.parent && channel.name === newChannel.name && channel.topic === newChannel.topic && channel.nsfw === newChannel.nsfw && channel.bitrate === newChannel.bitrate) return;
    if (channel.type === ChannelType.DM) return;

    const logChan = db.get(`servers.${channel.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${channel.guild.id}.logs.logSystem.channel-updated`);
    if (logSys !== 'enabled') return;
    if (channel.name.startsWith('ticket-')) return;

    const chans = db.get(`servers.${channel.guild.id}.logs.noLogChans`) || [];
    if (chans.includes(channel.id)) return;

    let catUp;
    if (!channel.parent && newChannel.parent) {
      catUp = `Updated: ✅ \nNew Category: ${newChannel.parent.name}`;
    } else if (!channel.parent && !newChannel.parent) {
      catUp = 'Updated: ❌';
    } else if (channel.parent && !newChannel.parent) {
      catUp = 'Updated: ✅ \nNew Category: `None`';
    } else if (channel.parent !== newChannel.parent) {
      catUp = `Updated: ✅ \nNew Category: ${newChannel.parent.name}`;
    } else if (channel.parent === newChannel.parent) {
      catUp = 'Updated: ❌';
    }

    const embed = new EmbedBuilder()
      .setTitle(`Channel ${channel.name} Updated`)
      .setColor('#EE82EE')
      .addFields([
        { name: 'Name', value: (channel.name === newChannel.name) ? 'Updated: ❌' : `Updated: ✅ \nNew Name: ${newChannel.name}`, inline: true },
        { name: 'Topic', value: (channel.topic === newChannel.topic) ? 'Updated: ❌' : `Updated: ✅ \nNew Topic: ${newChannel.topic}`, inline: true },
        { name: 'Category', value: catUp, inline: true }
      ])
      .setFooter({ text: `ID: ${newChannel.id}` })
      .setTimestamp();
    if (channel.type === ChannelType.GuildText) embed.addFields([{ name: 'Is NSFW?', value: (newChannel.nsfw) ? '✅' : '❌', inline: true }]);
    if ([ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) embed.addFields([{ name: 'Bitrate', value: (channel.bitrate === newChannel.bitrate) ? 'Updated: ❌' : `Updated: ✅ \nNew Bitrate: ${newChannel.bitrate.toLocaleString()}`, inline: true }]);

    channel.guild.channels.cache.get(logChan).send({ embeds: [embed] }).catch(() => {});

    db.add(`servers.${channel.guild.id}.logs.channel-updated`, 1);
    db.add(`servers.${channel.guild.id}.logs.all`, 1);
  }
};
