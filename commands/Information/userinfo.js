const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

class UserInfo extends Command {
  constructor (client) {
    super(client, {
      name: 'userinfo',
      description: 'Gives some useful user information',
      usage: 'userlinfo',
      category: 'Information',
      aliases: ['ui'],
      guildOnly: true
    });
  }

  async run (msg, text) { // eslint-disable-line no-unused-vars
    const server = msg.guild;
    let infoMem;

    if (!text || text.length < 1) {
      infoMem = msg.member;
    } else {
      infoMem = msg.mentions.members.first() || server.members.cache.find(m => m.id === `${text.join(' ')}`) || server.members.cache.find(m => m.displayName.toUpperCase() === `${text.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toUpperCase() === `${text.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toLowerCase()
        .includes(`${text.join(' ').toLowerCase()}`));
    }

    if (!infoMem) {
      const f_id = text.join(' ').replace('<@', '').replace('>', '');
      try {
        infoMem = await this.client.users.fetch(f_id);
      } catch (err) {
        infoMem = msg.member;
      }
    }


    if (server.member(infoMem)) {
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
        .addField('Account Created',  `${ca} \n (${caTime})`, true)
        .addField('Join Position', `${Number(joinPosition).toLocaleString()}`, true)
        .addField('Roles', roles1, false);
      msg.channel.send(embed);
    } else {
      //not guild member
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
      msg.channel.send(embed);
    }
    async function getJoinPosition (id, guild) {
      if (!guild.member(id)) return;

      await guild.members.fetch();
      const array = guild.members.cache.array();
      array.sort((a, b) => a.joinedAt - b.joinedAt);

      const result = array.map((m, i) => ({
        index: i,
        id: m.user.id
      }))
        .find((m) => m.id === id);
      return (result && result.index) || null;
    }
  }
}

module.exports = UserInfo;
