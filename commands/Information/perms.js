const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

class Permissions extends Command {
  constructor(client) {
    super(client, {
      name: 'permissions',
      description: 'List the permissions that a member or role has',
      usage: 'permissions [member | role]',
      category: 'Information',
      aliases: ['perms'],
      examples: ['permissions @TheMonDon', 'permissions Admin'],
      guildOnly: true,
    });
  }

  async run(msg, args, level) {
    let infoMemOrRole = msg.member;

    // If a user is mentioned, fetch them and set them as the infoMemOrRole
    if (args?.length > 0) {
      await msg.guild.members.fetch();
      infoMemOrRole = await this.client.util.getMember(msg, args.join(' '));
    }

    if (!infoMemOrRole) {
      await msg.guild.roles.fetch();
      infoMemOrRole = this.client.util.getRole(msg, args.join(' '));
      if (!infoMemOrRole) return msg.channel.send('That member or role was not found, please try again.');
    }

    // Emojis to use for the permissions
    const yes = '<:approved:622961998807826432>';
    const no = '<:denied:622961970093752320>';

    // Function to check if the user has a permission
    function has(perm) {
      return infoMemOrRole.permissions.has(perm);
    }

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setFooter({ text: `Requested by: ${msg.member.displayName}` })
      .setTimestamp()
      .addFields([
        {
          name: '➢ __General Server Permissions:__',
          value: stripIndents`
          \`View Channels\`| ${has('ViewChannel') ? yes : no}
          \`Manage Channels\`| ${has('ManageChannels') ? yes : no}
          \`Manage Roles\`| ${has('ManageRoles') ? yes : no}
          \`Manage Emojis, Stickers, and sounds\`| ${has('ManageEmojisAndStickers') ? yes : no}
          \`View Audit Log\`| ${has('ViewAuditLog') ? yes : no}
          \`View Server Insights\`| ${has('ViewGuildInsights') ? yes : no}
          \`Manage Webhooks\`| ${has('ManageWebhooks') ? yes : no}
          \`Manage Server\`| ${has('ManageGuild') ? yes : no}
          `,
          inline: true,
        },
        {
          name: '➢ __Membership Permissions:__',
          value: stripIndents`
          \`Create Invite\`| ${has('CreateInstantInvite') ? yes : no}
          \`Change Nickname\`| ${has('ChangeNickname') ? yes : no}
          \`Manage Nicknames\`| ${has('ManageNicknames') ? yes : no}
          \`Kick Members\`| ${has('KickMembers') ? yes : no}
          \`Ban Members\`| ${has('BanMembers') ? yes : no}
          \`Timeout Members\`| ${has('ModerateMembers') ? yes : no}
          `,
          inline: true,
        },
        {
          name: '➢ __Text Channel Permissions:__',
          value: stripIndents`
          \`Send Messages\`| ${has('SendMessages') ? yes : no}
          \`Create Public Threads\`| ${has('CreatePublicThreads') ? yes : no}
          \`Create Private Threads\`| ${has('CreatePrivateThreads') ? yes : no}
          \`Embed Links\`| ${has('EmbedLinks') ? yes : no}
          \`Attach Files\`| ${has('AttachFiles') ? yes : no}
          \`Add Reactions\`| ${has('AddReactions') ? yes : no}
          \`Use External Emojis\`| ${has('UseExternalEmojis') ? yes : no}
          \`Use External Stickers\`| ${has('UseExternalStickers') ? yes : no}
          \`Mention @everyone, @here, and All Roles\`| ${has('MentionEveryone') ? yes : no}
          \`Manage Messages\`| ${has('ManageMessages') ? yes : no}
          \`Manage Threads\`| ${has('ManageThreads') ? yes : no}
          \`Read Message History\`| ${has('ReadMessageHistory') ? yes : no}
          \`Send Text-to-Speech Messages\`| ${has('SendTTSMessages') ? yes : no}
          \`Send Voice Messages\`| ${has('SendVoiceMessages') ? yes : no}
          \`Create Polls\`| ${has('SendPolls') ? yes : no}
          `,
          inline: true,
        },
        {
          name: '➢ __Voice Permissions:__',
          value: stripIndents`
          \`Connect\`| ${has('Connect') ? yes : no}
          \`Speak\`| ${has('Speak') ? yes : no}
          \`Video\`| ${has('Stream') ? yes : no}
          \`Use Voice Activity\`| ${has('UseVAD') ? yes : no}
          \`Priority Speaker\`| ${has('PrioritySpeaker') ? yes : no}
          \`Mute Members\`| ${has('MuteMembers') ? yes : no}
          \`Deafen Members\`| ${has('DeafenMembers') ? yes : no}
          \`Move Members\`| ${has('MoveMembers') ? yes : no}
          `,
          inline: true,
        },
        {
          name: '➢ __Apps Permissions__',
          value: stripIndents`
          \`Use Application Commands\`| ${has('UseApplicationCommands') ? yes : no}
          \`Use Activities\`| ${has('UseEmbeddedActivities') ? yes : no}
          `,
          inline: true,
        },
        {
          name: '➢ __Stage Channel Permissions:__',
          value: stripIndents`
          \`Request to Speak\`| ${has('RequestToSpeak') ? yes : no}
          `,
          inline: true,
        },
        {
          name: '➢ __Events Permissions:__',
          value: stripIndents`
          \`Create Events\`| ${has('CreateEvents') ? yes : no}
          \`Manage Events\`| ${has('ManageEvents') ? yes : no}
          `,
          inline: true,
        },
        {
          name: '➢ __Advanced Permissions:__',
          value: stripIndents`
          \`Administrator\`| ${has('Administrator') ? yes : no}
          `,
          inline: true,
        },
      ]);

    if (infoMemOrRole.user?.displayAvatarURL) {
      const newMsg = { ...msg, member: infoMemOrRole, author: infoMemOrRole.user, guild: msg.guild };
      const permLevel = this.client.permlevel(newMsg);
      const friendly = this.client.config.permLevels.find((l) => l.level === permLevel).name;

      embed
        .setAuthor({ name: infoMemOrRole.displayName, iconURL: infoMemOrRole.user.displayAvatarURL({ dynamic: true }) })
        .setTitle(`${infoMemOrRole.displayName}'s Permissions`)
        .addFields([{ name: '➢ __Bot User Level:__', value: `${permLevel} - ${friendly}`, inline: true }]);
    } else {
      embed.setTitle(`${infoMemOrRole.name}'s Permissions`);
    }

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Permissions;
