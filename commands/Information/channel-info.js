const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

class Stats extends Command {
  constructor(client) {
    super(client, {
      name: 'channel-info',
      description: 'Gives some useful channel information',
      usage: 'channel-info',
      category: 'Information',
      aliases: ['ci', 'channelinfo'],
      guildOnly: true
    });
  }

  async run(msg, text) {
    const server = msg.guild;
    let infoChan;

    if (!text || text.length < 1) {
      infoChan = msg.channel;
    } else {
      infoChan = msg.mentions.channels.first() ||
        server.channels.cache.find(c => c.id === `${text.join(' ')}`) ||
        server.channels.cache.find(c => c.name.toLowerCase() === `${text.join(' ').toLowerCase()}`) ||
        server.channels.cache.find(c => c.name.toLowerCase().includes(`${text.join(' ').toLowerCase()}`)) ||
        this.client.channels.cache.find(c => c.id === `${text.join(' ')}`) ||
        this.client.channels.cache.find(c => c.name.toLowerCase().includes(`${text.join(' ').toLowerCase()}`));
    }

    const then = moment(infoChan.createdAt);
    const time = then.from(moment());
    const ca = then.format('MMM Do, YYYY');

    const embed = new DiscordJS.MessageEmbed()
      .setTitle('Channel Information')
      .setColor('RANDOM')
      .setAuthor(msg.author.username, msg.author.displayAvatarURL())
      .addField('Name', infoChan.name, true)
      .addField('ID', infoChan.id, true)
      .addField('Type', infoChan.type, true)
      .addField('Position', infoChan.position, true);
    if (infoChan.guild != msg.guild) embed.addField('Server', infoChan.guild.name, true);
    if (infoChan.type === 'text') embed.addField('NSFW', infoChan.nsfw ? true : false, true);
    if (infoChan.type === 'voice') {
      embed.addField('User Limit', infoChan.userLimit, true);
      embed.addField('Bitrate', infoChan.bitrate, true);
    }
    if (infoChan.type === 'category') embed.addField('Children', infoChan.children.size, true);
    embed.addField('Mention', `\`${infoChan}\``, true);
    embed.addField('Created At', `${ca} \n (${time})`, true);
    if (infoChan.parent) embed.addField('Parent', `${infoChan.parent.name} \n \`${infoChan.parentID}\``, true);
    if (infoChan.type == 'text') embed.addField('Topic', `${(infoChan.topic) || 'None'}`, false);

    msg.channel.send(embed);
  }
}

module.exports = Stats;
