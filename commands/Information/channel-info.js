const Command = require('../../base/Command.js');
const { getChannel, toProperCase } = require('../../util/Util.js');
const DiscordJS = require('discord.js');
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

    const embed = new DiscordJS.MessageEmbed()
      .setTitle('Channel Information')
      .setColor('RANDOM')
      .setAuthor(msg.author.username, msg.author.displayAvatarURL())
      .addField('Name', infoChan.name, true)
      .addField('ID', infoChan.id.toString(), true)
      .addField('Type', toProperCase(infoChan.type), true)
      .addField('Position', infoChan.position.toString(), true);
    if (infoChan.type === 'GUILD_TEXT') embed.addField('NSFW', infoChan.nsfw, true);
    if (infoChan.type === 'GUILD_VOICE') {
      embed.addField('User Limit', infoChan.userLimit.toString(), true);
      embed.addField('Bitrate', infoChan.bitrate.toString(), true);
    }
    if (infoChan.type === 'GUILD_CATEGORY') embed.addField('Children', infoChan.children.size.toString(), true);
    embed.addField('Mention', `\`${infoChan}\``, true);
    embed.addField('Created At', `${ca} \n(${time})`, true);
    if (infoChan.parent) embed.addField('Parent', `${infoChan.parent.name} \n\`${infoChan.parentID}\``, true);
    if (infoChan.type === 'GUILD_TEXT') embed.addField('Topic', infoChan.topic || 'None', false);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ChannelInfo;
