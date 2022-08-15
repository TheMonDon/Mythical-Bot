const db = require('quick.db');
const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (channel, newChannel) {
    if (channel.type === ChannelType.DM) return;

    const logChan = db.get(`servers.${channel.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${channel.guild.id}.logs.logSystem.channel-updated`);
    if (logSys !== 'enabled') return;
    if (channel.name.startsWith('ticket-')) return;

    const chans = db.get(`servers.${channel.guild.id}.logs.noLogChans`) || [];
    if (chans.includes(channel.id)) return;

    const logChannel = channel.guild.channels.cache.get(logChan);
    if (!logChannel.permissionsFor(this.client.user.id).has('SendMessages')) return;

    if (channel === newChannel) return;

    let catUp;
    if (!channel.parent && newChannel.parent) {
      catUp = `Updated: ✅ \n New Category: ${newChannel.parent.name}`;
    } else if (!channel.parent && !newChannel.parent) {
      catUp = 'Updated: ❌';
    } else if (channel.parent && !newChannel.parent) {
      catUp = 'Updated: ✅ \n New Category: `None`';
    } else if (channel.parent !== newChannel.parent) {
      catUp = `Updated: ✅ \n New Category: ${newChannel.parent.name}`;
    } else if (channel.parent === newChannel.parent) {
      catUp = 'Updated: ❌';
    }

    const embed = new EmbedBuilder()
      .setTitle(`Channel ${channel.name} Updated`)
      .setColor('#EE82EE')
      .addFields([
        { name: 'Name', value: (channel.name === newChannel.name) ? 'Updated: ❌' : `Updated: ✅ \n New Name: ${newChannel.name}`, inline: true },
        { name: 'Topic', value: (channel.topic === newChannel.topic) ? 'Updated: ❌' : `Updated: ✅ \n New Topic: ${newChannel.topic}`, inline: true },
        { name: 'Category', value: catUp, inline: true }
      ])
      .setFooter({ text: `ID: ${newChannel.id}` })
      .setTimestamp();
    if (channel.type === ChannelType.GuildText) embed.addFields([{ name: 'Is NSFW?', value: (newChannel.nsfw) ? '✅' : '❌', inline: true }]);
    if ([ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) embed.addFields([{ name: 'Bitrate', value: (channel.bitrate === newChannel.bitrate) ? 'Updated: ❌' : `Updated: ✅ \n New Bitrate: ${newChannel.bitrate.toLocaleString()}`, inline: true }]);

    channel.guild.channels.cache.get(logChan).send({ embeds: [embed] });
    db.add(`servers.${channel.guild.id}.logs.channel-updated`, 1);
    db.add(`servers.${channel.guild.id}.logs.all`, 1);
  }
};
