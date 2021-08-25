const Command = require('../../base/Command.js');
const { getMember, getJoinPosition } = require('../../util/Util.js');
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
    let infoMem = msg.member;

    if (text && text.length > 0) infoMem = getMember(msg, text.join(' '));

    if (!infoMem) {
      const fid = text.join(' ').replace('<@', '').replace('>', '');
      try {
        infoMem = await this.client.users.fetch(fid);
      } catch (err) {
        infoMem = msg.member;
      }
    }

    const presence = {
      online: '<:status_online:862228776234123294> Online',
      idle: '<:status_idle:862228796366258186>: Idle',
      dnd: '<:status_dnd:862228796367044608> Do Not Disturb',
      offline: '<:status_offline:862228796391948318> Offline',
      streaming: '<:status_streaming:862228796206874645> Streaming'
    };

    // User Flags / Badges
    const flags = {
      DISCORD_EMPLOYEE: '',
      PARTNERED_SERVER_OWNER: '',
      HYPESQUAD_EVENTS: '',
      BUGHUNTER_LEVEL_1: '',
      BUGHUNTER_LEVEL_2: '',
      TEAM_USER: '',
      HOUSE_BRILLIANCE: '<:house_brilliance:862241973271003156>',
      HOUSE_BALANCE: '<:house_balance:862242872362139648>',
      HOUSE_BRAVERY: '<:house_bravery:862241972765196309>',
      EARLY_SUPPORTER: '<:early_supporter_badge:862241973388836884>',
      EARLY_VERIFIED_BOT_DEVELOPER: '<:verified_developer_badge:862241973146353674>',
      VERIFIED_BOT: '<:verified_bot:862241973326839818>',
      DISCORD_CERTIFIED_MODERATOR: ''
    };

    // Guild Member
    if (msg.guild.members.cache.get(infoMem.id)) {
      // Time Stamps
      const joinPosition = await getJoinPosition(infoMem.id, msg.guild);
      const ts = moment(infoMem.user.createdAt);
      const ts2 = moment(infoMem.joinedAt);
      const caTime = ts.from(moment());
      const jaTime = ts2.from(moment());
      const ca = ts.format('MMM Do, YYYY');
      const ja = ts2.format('MMM Do, YYYY');

      // Role Stuff
      const roles = infoMem.roles.cache.sort((a, b) => b.position - a.position);
      let roles1 = roles.filter(r => r.id !== msg.guild.id)
        .array()
        .join(', ');
      if (roles1 === undefined || roles1.length === 0) roles1 = 'No Roles';
      // Badge Things
      const userBadges = infoMem.user.flags?.toArray() || '';
      let badgesArray = '';
      for (let i = 0; i < userBadges.length; i++) {
        badgesArray += flags[userBadges[i]];
      }

      const embed = new DiscordJS.MessageEmbed()
        .setTitle(`${infoMem.user.username}'s Info`)
        .setColor('RANDOM')
        .setThumbnail(infoMem.user.displayAvatarURL({ format: 'png', dynamic: true }))
        .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
        .addField('User Tag', infoMem.user.tag, true)
        .addField('Nickname', infoMem.displayName, true)
        .addField('User ID', infoMem.id, true)
        .addField('Status', presence[infoMem.user.presence.status], true)
        .addField('Joined Server', `${ja} \n (${jaTime})`, true)
        .addField('Account Created', `${ca} \n (${caTime})`, true)
        .addField('Join Position', `${Number(joinPosition).toLocaleString()}/${msg.guild.memberCount.toLocaleString()}`, true)
        .addField('Account Type', infoMem.user.bot ? ':robot: Bot' : ':person_standing: Human', true)
        .addField(`Badges [${userBadges?.length || 0}]`, badgesArray || 'No Badges', true)
        .addField('Roles', roles1, false);
      return msg.channel.send({ embeds: [embed] });
    }

    // not guild member
    const ts = moment(infoMem.createdAt);
    const ca = ts.format('MMM Do, YYYY');
    // Badge Things
    const userBadges = infoMem.flags?.toArray() || '';
    let badgesArray = '';
    for (let i = 0; i < userBadges.length; i++) {
      badgesArray += flags[userBadges[i]];
    }

    const embed = new DiscordJS.MessageEmbed()
      .setTitle(`${infoMem.username}'s Info`)
      .setColor('RANDOM')
      .setThumbnail(infoMem.displayAvatarURL({ format: 'png', dynamic: true }))
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .addField('User Tag', infoMem.tag, true)
      .addField('User ID', infoMem.id.toString(), true)
      .addField('Status', presence[infoMem.presence.status], true)
      .addField(`Badges [${userBadges?.length || 0}]`, badgesArray || 'No Badges', true)
      .addField('Account Type', infoMem.bot ? ':robot: Bot' : ':person_standing: Human', true)
      .addField('Account Created', ca, true);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = UserInfo;
