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
    const color = msg.settings.embedColor;

    // If text is provided, try to get the member
    if (text?.length > 0) infoMem = await getMember(msg, text.join(' ').toLowerCase());

    if (!infoMem) {
      // If no member is found, try to get the user by ID
      const fid = text.join(' ').toLowerCase().replace('<@', '').replace('>', '');
      try {
        infoMem = await this.client.users.fetch(fid);
      } catch (err) {
        // If no user is found, use the author
        infoMem = msg.member;
        infoMem.user.fetch();
      }
    } else {
      // If a member is found, fetch the user
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

    // If the user is a guild member
    if (msg.guild.members.cache.get(infoMem.id)) {
      const joinPosition = await getJoinPosition(infoMem.id, msg.guild);

      // Created At timestamp
      const createdAtTimestamp = moment(infoMem.user.createdAt);
      const createdAtDurationFrom = createdAtTimestamp.from(moment());
      const createdAtFullDate = createdAtTimestamp.format('dddd, MMMM Do, YYYY, h:mm a');

      // Joined At timestamp
      const joinedAtTimestamp = moment(infoMem.joinedAt);
      const joinedAtDurationFrom = joinedAtTimestamp.from(moment());
      const joinedAtFullDate = joinedAtTimestamp.format('dddd, MMMM Do, YYYY, h:mm a');

      // Create array of roles
      const roles = infoMem.roles.cache.sort((a, b) => b.position - a.position);
      let roles1 = [...roles.filter(r => r.id !== msg.guild.id).values()].join(', ');
      if (roles1 === undefined || roles1.length === 0) roles1 = 'No Roles';

      // Create array of user flags / badges
      const userBadges = infoMem.user.flags?.toArray() || '';
      let badgesArray = '';
      for (let i = 0; i < userBadges.length; i++) {
        badgesArray += flags[userBadges[i]];
      }

      const embed = new EmbedBuilder()
        .setTitle(`${infoMem.user.username}'s Info`)
        .setColor(color)
        .setThumbnail(infoMem.user.displayAvatarURL({ format: 'png', dynamic: true }))
        .setImage(infoMem.user.bannerURL())
        .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
        .addFields([
          { name: 'User Tag', value: `${infoMem.user.tag} (${infoMem})`, inline: true },
          { name: 'Nickname', value: infoMem.displayName, inline: true },
          { name: 'User ID', value: infoMem.id, inline: true },
          { name: 'Joined Server', value: `${joinedAtFullDate} \n (${joinedAtDurationFrom})`, inline: true },
          { name: 'Account Created', value: `${createdAtFullDate} \n (${createdAtDurationFrom})`, inline: true },
          { name: 'Join Position', value: `${Number(joinPosition)?.toLocaleString()}/${msg.guild.memberCount.toLocaleString()}`, inline: true },
          { name: 'Account Type', value: infoMem.user.bot ? ':robot: Bot' : ':person_standing: Human', inline: true },
          { name: `Badges [${userBadges?.length || 0}]`, value: badgesArray || 'No Badges', inline: true },
          { name: 'Accent Color', value: infoMem.user.hexAccentColor?.toString().toUpperCase() || 'None', inline: true },
          { name: 'Roles', value: roles1, inline: false }
        ]);

      return msg.channel.send({ embeds: [embed] });
    }

    // Otherwise, if the user is not a guild member

    // Created At timestamp
    const timestamp = moment(infoMem.createdAt);
    const createdAt = timestamp.format('dddd, MMMM Do, YYYY, h:mm a');

    // Create array of user flags / badges
    const userBadges = infoMem.flags?.toArray() || '';
    let badgesArray = '';
    for (let i = 0; i < userBadges.length; i++) {
      badgesArray += flags[userBadges[i]];
    }

    const embed = new EmbedBuilder()
      .setTitle(`${infoMem.username}'s Info`)
      .setColor(color)
      .setThumbnail(infoMem.displayAvatarURL({ format: 'png', dynamic: true }))
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setImage(infoMem.bannerURL())
      .addFields([
        { name: 'User Tag', value: `${infoMem.tag} (${infoMem})`, inline: true },
        { name: 'User ID', value: infoMem.id.toString(), inline: true },
        { name: `Badges [${userBadges?.length || 0}]`, value: badgesArray || 'No Badges', inline: true },
        { name: 'Account Type', value: infoMem.bot ? ':robot: Bot' : ':person_standing: Human', inline: true },
        { name: 'Account Created', value: createdAt, inline: true },
        { name: 'Accent Color', value: infoMem.hexAccentColor?.toString().toUpperCase() || 'None', inline: true }
      ]);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = UserInfo;
