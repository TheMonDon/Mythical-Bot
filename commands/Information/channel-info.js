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
        { name: 'Name', value: infoChan.name, inLine: true },
        { name: 'ID', value: infoChan.id.toString(), inLine: true },
        { name: 'Type', value: ChannelType[msg.channel.type].toString(), inLine: true },
        { name: 'Position', value: infoChan.position.toString(), inLine: true }
      ]);
    if (infoChan.type === ChannelType.GuildText) embed.addFields([{ name: 'NSFW', value: infoChan.nsfw.toString(), inLine: true }]);
    if (infoChan.type === ChannelType.GuildVoice) {
      embed.addFields([
        { name: 'User Limit', value: infoChan.userLimit.toString(), inLine: true },
        { name: 'Bitrate', value: infoChan.bitrate.toString(), inLine: true }
      ]);
    }
    if (infoChan.type === ChannelType.GuildCategory) embed.addFields([{ name: 'Children', value: infoChan.children.size.toString(), inLine: true }]);
    embed.addFields([
      { name: 'Mention', value: `\`${infoChan}\``, inLine: true },
      { name: 'Created At', value: `${ca} \n(${time})`, inLine: true }
    ]);
    if (infoChan.parent) embed.addFields([{ name: 'Parent', value: `${infoChan.parent.name} \n\`${infoChan.parentId}\``, inLine: true }]);
    if (infoChan.type === ChannelType.GuildText) embed.addFields([{ name: 'Topic', value: infoChan.topic || 'None', inLine: false }]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ChannelInfo;
