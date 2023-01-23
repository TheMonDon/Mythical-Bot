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
      .setTitle(`Channel "${channel.name}" Updated`)
      .setColor('#EE82EE')
      .setFooter({ text: `Channel ID: ${newChannel.id}` })
      .setTimestamp();

    if (channel.name !== newChannel.name) embed.addFields([{ name: 'Name', value: `Updated: ✅ \nNew Name: ${newChannel.name}`, inline: true }]);

    if (channel.topic !== newChannel.topic) embed.addFields([{ name: 'Topic', value: `Updated: ✅ \nOld Topic: ${channel.topic} \nNew Topic: ${newChannel.topic}`, inline: true }]);

    if (catUp !== 'Updated: ❌') embed.addFields([{ name: 'Category', value: catUp, inline: true }]);

    if (channel.type === ChannelType.GuildText) {
      if (channel.nsfw !== newChannel.nsfw) embed.addFields([{ name: 'NSFW', value: `Updated: ✅ \nNew NSFW Type: ${newChannel.nsfw}`, inline: true }]);
    }

    if ([ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) {
      if (channel.bitrate !== newChannel.bitrate) embed.addFields([{ name: 'Bitrate', value: `Updated: ✅ \nNew Bitrate Level: ${newChannel.bitrate.toLocaleString()}`, inline: true }]);
    }

    if (embed.fields?.length === 0) return;

    channel.guild.channels.cache.get(logChan).send({ embeds: [embed] }).catch(() => {});

    db.add(`servers.${channel.guild.id}.logs.channel-updated`, 1);
    db.add(`servers.${channel.guild.id}.logs.all`, 1);
  }
};
