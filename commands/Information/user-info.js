const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
require('moment-duration-format');
const moment = require('moment');

class UserInfo extends Command {
  constructor(client) {
    super(client, {
      name: 'user-info',
      description: 'Gives some useful user information',
      usage: 'user-info [user]',
      category: 'Information',
      aliases: ['ui', 'userinfo'],
    });
  }

  async run(msg, args) {
    let infoMem;
    let fetchedUser;

    if (args?.length > 0) {
      // Try to fetch the member from the provided text
      infoMem = await this.client.util.getMember(msg, args.join(' ').toLowerCase());
    }

    if (!infoMem) {
      // If no member is found, attempt to fetch the user by ID
      const findId = args?.join(' ').toLowerCase().replace(/<@|>/g, '');
      if (findId) {
        try {
          fetchedUser = await this.client.users.fetch(findId, { force: true });
          infoMem = fetchedUser;
        } catch (_) {}
      }
    }

    // Default to the author if no user/member is found
    if (!infoMem) {
      infoMem = msg.guild ? msg.member : msg.author;
    }

    // Get the user object
    if (!fetchedUser) {
      fetchedUser = await this.client.users.fetch(infoMem.user?.id || infoMem.id, { force: true });
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
    if (msg.guild && msg.guild.members.cache.get(infoMem.id)) {
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
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
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
