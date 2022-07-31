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

    // User Flags / Badges
    const flags = {
      DISCORD_EMPLOYEE: '<:DiscordEmployee:879966587816386591>',
      PARTNERED_SERVER_OWNER: '<:partnered_server_owner:879967015119519756>',
      HYPESQUAD_EVENTS: '<:hypesquad_events:879966257355587654>',
      BUGHUNTER_LEVEL_1: '<:BugHunter:879966295829913601>',
      BUGHUNTER_LEVEL_2: '<:BugHunterLvl2:879966322434388009>',
      TEAM_USER: '',
      HOUSE_BRILLIANCE: '<:house_brilliance:862241973271003156>',
      HOUSE_BALANCE: '<:house_balance:862242872362139648>',
      HOUSE_BRAVERY: '<:house_bravery:862241972765196309>',
      EARLY_SUPPORTER: '<:early_supporter_badge:862241973388836884>',
      EARLY_VERIFIED_BOT_DEVELOPER: '<:verified_developer_badge:862241973146353674>',
      VERIFIED_BOT: '<:verified_bot:862241973326839818>',
      DISCORD_CERTIFIED_MODERATOR: '<:certifiedModerator:879967930534740008>'
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
      let roles1 = [...roles.filter(r => r.id !== msg.guild.id).values()].join(', ');
      if (roles1 === undefined || roles1.length === 0) roles1 = 'No Roles';

      // Badge Things
      const userBadges = infoMem.user.flags?.toArray() || '';
      let badgesArray = '';
      for (let i = 0; i < userBadges.length; i++) {
        badgesArray += flags[userBadges[i]];
      }

      const embed = new DiscordJS.EmbedBuilder()
        .setTitle(`${infoMem.user.username}'s Info`)
        .setColor('#0099CC')
        .setThumbnail(infoMem.user.displayAvatarURL({ format: 'png', dynamic: true }))
        .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
        .addFields([
          { name: 'User Tag', value: infoMem.user.tag },
          { name: 'Nickname', value: infoMem.displayName },
          { name: 'User ID', value: infoMem.id },
          { name: 'Joined Server', value: `${ja} \n (${jaTime})` },
          { name: 'Account Created', value: `${ca} \n (${caTime})` },
          { name: 'Join Position', value: `${Number(joinPosition).toLocaleString()}/${msg.guild.members.memberCount.toLocaleString()}` },
          { name: 'Account Type', value: infoMem.user.bot ? ':robot: Bot' : ':person_standing: Human' },
          { name: `Badges [${userBadges?.length || 0}]`, value: badgesArray || 'No Badges' },
          { name: 'Roles', value: roles1 }
        ]);
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

    const embed = new DiscordJS.EmbedBuilder()
      .setTitle(`${infoMem.username}'s Info`)
      .setColor('#0099CC')
      .setThumbnail(infoMem.displayAvatarURL({ format: 'png', dynamic: true }))
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .addFields([
        { name: 'User Tag', value: infoMem.tag },
        { name: 'User ID', value: infoMem.id.toString() },
        { name: `Badges [${userBadges?.length || 0}]`, value: badgesArray || 'No Badges' },
        { name: 'Account Type', value: infoMem.bot ? ':robot: Bot' : ':person_standing: Human' },
        { name: 'Account Created', value: ca }
      ]);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = UserInfo;
