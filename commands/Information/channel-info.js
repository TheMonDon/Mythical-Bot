const Command = require('../../base/Command.js');
const { getChannel } = require('../../util/Util.js');
const { ChannelType, EmbedBuilder } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

class ChannelInfo extends Command {
  constructor (client) {
    super(client, {
      name: 'channel-info',
      description: 'Gives some useful channel information',
      usage: 'channel-info [channel]',
      category: 'Information',
      aliases: ['ci', 'channelinfo'],
      guildOnly: true
    });
  }

  async run (msg, text) {
    let infoChan = msg.channel;

    if (text && text.length > 0) infoChan = getChannel(msg, text.join(' '));

    if (!infoChan) return msg.reply('That is not a valid channel.');

    const then = moment(infoChan.createdAt);
    const time = then.from(moment());
    const ca = then.format('MMM Do, YYYY');

    const embed = new EmbedBuilder()
      .setTitle('Channel Information')
      .setColor('#0099CC')
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .addFields([
        { name: 'Name', value: infoChan.name, inline: true },
        { name: 'ID', value: infoChan.id.toString(), inline: true },
        { name: 'Type', value: ChannelType[msg.channel.type].toString(), inline: true },
        { name: 'Position', value: infoChan.position.toString(), inline: true }
      ]);
    if (infoChan.type === ChannelType.GuildText) embed.addFields([{ name: 'NSFW', value: infoChan.nsfw.toString(), inline: true }]);
    if (infoChan.type === ChannelType.GuildVoice) {
      embed.addFields([
        { name: 'User Limit', value: infoChan.userLimit.toString(), inline: true },
        { name: 'Bitrate', value: infoChan.bitrate.toString(), inline: true }
      ]);
    }
    if (infoChan.type === ChannelType.GuildCategory) embed.addFields([{ name: 'Children', value: infoChan.children.size.toString(), inline: true }]);
    embed.addFields([
      { name: 'Mention', value: `\`${infoChan}\``, inline: true },
      { name: 'Created At', value: `${ca} \n(${time})`, inline: true }
    ]);
    if (infoChan.parent) embed.addFields([{ name: 'Parent', value: `${infoChan.parent.name} \n\`${infoChan.parentId}\``, inline: true }]);
    if (infoChan.type === ChannelType.GuildText) embed.addFields([{ name: 'Topic', value: infoChan.topic || 'None', inline: false }]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ChannelInfo;
