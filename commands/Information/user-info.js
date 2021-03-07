const Command = require('../../base/Command.js');
const { getMember, getJoinPosition } = require('../../base/Util.js');
const DiscordJS = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

class UserInfo extends Command {
  constructor (client) {
    super(client, {
      name: 'user-info',
      description: 'Gives some useful user information',
      usage: 'user-info [user]',
      category: 'Information',
      aliases: ['ui', 'userinfo'],
      guildOnly: true
    });
  }

  async run (msg, text) {
    const server = msg.guild;
    let infoMem;

    if (!text || text.length < 1) {
      infoMem = msg.member;
    } else {
      infoMem = getMember(msg, text.join(' '));
    }

    if (!infoMem) {
      const fid = text.join(' ').replace('<@', '').replace('>', '');
      try {
        infoMem = await this.client.users.fetch(fid);
      } catch (err) {
        infoMem = msg.member;
      }
    }

    if (server.member(infoMem)) {
      // Guild Member
      const joinPosition = await getJoinPosition(infoMem.id, msg.guild);
      const ts = moment(infoMem.user.createdAt);
      const ts2 = moment(infoMem.joinedAt);
      const caTime = ts.from(moment());
      const jaTime = ts2.from(moment());
      const ca = ts.format('MMM Do, YYYY');
      const ja = ts2.format('MMM Do, YYYY');
      const roles = infoMem.roles.cache.sort((a, b) => b.position - a.position);
      let roles1 = roles.filter(r => r.id !== msg.guild.id)
        .array()
        .join(', ');
      if (roles1 === undefined || roles1.length === 0) {
        roles1 = 'No Roles';
      }
      const embed = new DiscordJS.MessageEmbed()
        .setTitle(`${infoMem.user.username}'s Info`)
        .setColor('RANDOM')
        .setThumbnail(infoMem.user.displayAvatarURL({ format: 'png', dynamic: true }))
        .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
        .addField('User Tag', infoMem.user.tag, true)
        .addField('Nickname', infoMem.displayName, true)
        .addField('User ID', infoMem.id, true)
        .addField('Status', infoMem.user.presence.status, true)
        .addField('Joined Server', `${ja} \n (${jaTime})`, true)
        .addField('Account Created', `${ca} \n (${caTime})`, true)
        .addField('Join Position', `${Number(joinPosition).toLocaleString()}`, true)
        .addField('Roles', roles1, false);
      return msg.channel.send(embed);
    } else {
      // not guild member
      const ts = moment(infoMem.createdAt);
      const ca = ts.format('MMM Do, YYYY');
      const embed = new DiscordJS.MessageEmbed()
        .setTitle(`${infoMem.username}'s Info`)
        .setColor('RANDOM')
        .setThumbnail(infoMem.displayAvatarURL({ format: 'png', dynamic: true }))
        .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
        .addField('User Tag', infoMem.tag)
        .addField('User ID', infoMem.id)
        .addField('Is Bot?', infoMem.bot)
        .addField('Account Created', ca);
      return msg.channel.send(embed);
    }
  }
}

module.exports = UserInfo;
