const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

class UserInfo extends Command {
  constructor(client) {
    super(client, {
      name: 'user-info',
      description: 'Gives some useful user information',
      usage: 'user-info [user]',
      category: 'Information',
      aliases: ['ui', 'userinfo'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let infoMem = msg.member;
    let fetchedUser;

    // If text is provided, try to get the member
    if (args?.length > 0) infoMem = await this.client.util.getMember(msg, args.join(' ').toLowerCase());

    if (!infoMem) {
      // If no member is found, try to get the user by ID
      const findId = args.join(' ').toLowerCase().replace(/<@|>/g, '');
      try {
        infoMem = await this.client.users.fetch(findId, { force: true });
      } catch (err) {
        // If no user is found, use the author
        infoMem = msg.member;
        fetchedUser = await infoMem.user.fetch();
      }
    } else {
      // If a member is found, fetch the user
      fetchedUser = await infoMem.user.fetch();
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
      OldCertifiedModerator: '<:certifiedModerator:879967930534740008>',
      ActiveDeveloper: '<:ActiveDeveloper:1062978324894330930>',
      CertifiedModerator: '<:ModeratorProgramsAlumni:1108517824617525308>',
    };

    // If the user is a guild member
    if (msg.guild.members.cache.get(infoMem.id)) {
      const joinPosition = await this.client.util.getJoinPosition(infoMem.id, msg.guild);

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
      const roles1 = [...roles.filter((r) => r.id !== msg.guild.id).values()].join(', ');

      // Create array of user flags / badges
      const userBadges = infoMem.user.flags?.toArray() || '';
      let badgesArray = '';
      for (let i = 0; i < userBadges.length; i++) {
        badgesArray += flags[userBadges[i]];
      }

      const color = fetchedUser.hexAccentColor?.toString().toUpperCase() || msg.settings.embedColor;
      const embed = new EmbedBuilder()
        .setTitle(`${infoMem.user.tag}'s Info`)
        .setColor(color)
        .setThumbnail(infoMem.user.displayAvatarURL({ size: 4096, extension: 'png' }))
        .setImage(fetchedUser.bannerURL({ size: 1024, extension: 'png' }))
        .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
        .addFields([
          { name: 'Username', value: `${infoMem.user.tag} (${infoMem})`, inline: true },
          { name: 'Nickname', value: infoMem.displayName, inline: true },
          { name: 'User ID', value: infoMem.id, inline: true },
          { name: 'Joined Server', value: `${joinedAtFullDate} \n (${joinedAtDurationFrom})`, inline: true },
          { name: 'Account Created', value: `${createdAtFullDate} \n (${createdAtDurationFrom})`, inline: true },
          {
            name: 'Join Position',
            value: `${Number(joinPosition)?.toLocaleString()}/${msg.guild.memberCount.toLocaleString()}`,
            inline: true,
          },
          { name: 'Account Type', value: infoMem.user.bot ? ':robot: Bot' : ':person_standing: Human', inline: true },
          { name: `Badges [${userBadges?.length || 0}]`, value: badgesArray || 'No Badges', inline: true },
          {
            name: 'Accent Color',
            value: fetchedUser.hexAccentColor?.toString().toUpperCase() || 'None',
            inline: true,
          },
        ]);

      if (roles1) embed.addFields({ name: 'Roles', value: roles1, inline: false });

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

    const color = infoMem.hexAccentColor?.toString().toUpperCase() || msg.settings.embedColor;

    const embed = new EmbedBuilder()
      .setTitle(`${infoMem.tag}'s Info`)
      .setColor(color)
      .setThumbnail(infoMem.displayAvatarURL({ extension: 'png', size: 4096 }))
      .setImage(infoMem.bannerURL({ extension: 'png', size: 1024 }))
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .addFields([
        { name: 'Username', value: `${infoMem.tag} (${infoMem})`, inline: true },
        { name: 'User ID', value: infoMem.id.toString(), inline: true },
        { name: `Badges [${userBadges?.length || 0}]`, value: badgesArray || 'No Badges', inline: true },
        { name: 'Account Type', value: infoMem.bot ? ':robot: Bot' : ':person_standing: Human', inline: true },
        { name: 'Account Created', value: createdAt, inline: true },
        { name: 'Accent Color', value: infoMem.hexAccentColor?.toString().toUpperCase() || 'None', inline: true },
      ]);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = UserInfo;
