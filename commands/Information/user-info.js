const Command = require('../../base/Command.js');
const { getMember, getJoinPosition } = require('../../util/Util.js');
const { EmbedBuilder } = require('discord.js');
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

    if (text?.length > 0) infoMem = getMember(msg, text.join(' ').toLowerCase());

    if (!infoMem) {
      const fid = text.join(' ').toLowerCase().replace('<@', '').replace('>', '');
      try {
        infoMem = await this.client.users.fetch(fid);
      } catch (err) {
        infoMem = msg.member;
        infoMem.user.fetch();
      }
    } else {
      infoMem.user.fetch();
    }

    // User Flags / Badges
    const flags = {
      Staff: '<:DiscordEmployee:879966587816386591>',
      Partner: '<:partnered_server_owner:879967015119519756>',
      Hypesquad: '<:hypesquad_events:879966257355587654>',
      BugHunterLevel1: '<:BugHunter:879966295829913601>',
      BugHunterLevel2: '<:BugHunterLvl2:879966322434388009>',
      HypeSquadOnlineHouse3: '<:house_balance:862242872362139648>',
      HypeSquadOnlineHouse2: '<:house_brilliance:862241973271003156>',
      HypeSquadOnlineHouse1: '<:house_bravery:862241972765196309>',
      PremiumEarlySupporter: '<:early_supporter_badge:862241973388836884>',
      VerifiedDeveloper: '<:verified_developer_badge:862241973146353674>',
      VerifiedBot: '<:verified_bot:862241973326839818>',
      CertifiedModerator: '<:certifiedModerator:879967930534740008>',
      BotHTTPInteractions: '',
      Quarantined: '',
      Spammer: '',
      TeamPseudoUser: ''
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

      const embed = new EmbedBuilder()
        .setTitle(`${infoMem.user.username}'s Info`)
        .setColor('#0099CC')
        .setThumbnail(infoMem.user.displayAvatarURL({ format: 'png', dynamic: true }))
        .setImage(infoMem.user.bannerURL())
        .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
        .addFields([
          { name: 'User Tag', value: `${infoMem.user.tag} (${infoMem})`, inline: true },
          { name: 'Nickname', value: infoMem.displayName, inline: true },
          { name: 'User ID', value: infoMem.id, inline: true },
          { name: 'Joined Server', value: `${ja} \n (${jaTime})`, inline: true },
          { name: 'Account Created', value: `${ca} \n (${caTime})`, inline: true },
          { name: 'Join Position', value: `${Number(joinPosition)?.toLocaleString()}/${msg.guild.memberCount.toLocaleString()}`, inline: true },
          { name: 'Account Type', value: infoMem.user.bot ? ':robot: Bot' : ':person_standing: Human', inline: true },
          { name: `Badges [${userBadges?.length || 0}]`, value: badgesArray || 'No Badges', inline: true },
          { name: 'Accent Color', value: infoMem.user.hexAccentColor?.toString().toUpperCase() || 'None', inline: true },
          { name: 'Roles', value: roles1, inline: false }
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

    const embed = new EmbedBuilder()
      .setTitle(`${infoMem.username}'s Info`)
      .setColor('#0099CC')
      .setThumbnail(infoMem.displayAvatarURL({ format: 'png', dynamic: true }))
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setImage(infoMem.bannerURL())
      .addFields([
        { name: 'User Tag', value: `${infoMem.tag} (${infoMem})`, inline: true },
        { name: 'User ID', value: infoMem.id.toString(), inline: true },
        { name: `Badges [${userBadges?.length || 0}]`, value: badgesArray || 'No Badges', inline: true },
        { name: 'Account Type', value: infoMem.bot ? ':robot: Bot' : ':person_standing: Human', inline: true },
        { name: 'Account Created', value: ca, inline: true },
        { name: 'Accent Color', value: infoMem.hexAccentColor?.toString().toUpperCase() || 'None', inline: true }
      ]);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = UserInfo;
