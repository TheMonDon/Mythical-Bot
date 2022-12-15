const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

class Perms extends Command {
  constructor (client) {
    super(client, {
      name: 'perms',
      description: 'Figure out what permissions you or another user have.',
      usage: 'perms [user]',
      category: 'Information',
      aliases: ['permissions'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    let infoMem = msg.member;

    if (args && args.length > 0) {
      await msg.guild.members.fetch();
      infoMem = await getMember(msg, args.join(' '));
    }

    if (!infoMem) return msg.channel.send('That user was not found, please try again.');

    const yes = '<:approved:622961998807826432>';
    const no = '<:denied:622961970093752320>';

    function has (perm) {
      return infoMem.permissions.has(perm);
    }

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: infoMem.displayName, iconURL: infoMem.user.displayAvatarURL({ dynamic: true }) })
      .setFooter({ text: `Requested by: ${msg.member.displayName}` })
      .setTimestamp()
      .addFields([
        {
          name: '➢ __General Server Permissions:__',
          value: stripIndents`
          \`View Channels\`| ${has('ViewChannel') ? yes : no}
          \`Manage Channels\`| ${has('ManageChannels') ? yes : no}
          \`Manage Roles\`| ${has('ManageRoles') ? yes : no}
          \`Manage Emojis and Stickers\`| ${has('ManageEmojisAndStickers') ? yes : no}
          \`View Audit Log\`| ${has('ViewAuditLog') ? yes : no}
          \`View Server Insights\`| ${has('ViewGuildInsights') ? yes : no}
          \`Manage Webhooks\`| ${has('ManageWebhooks') ? yes : no}
          \`Manage Server\`| ${has('ManageGuild') ? yes : no}
          `,
          inline: true
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
          inline: true
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
          \`Use Application Commands\`| ${has('UseApplicationCommands') ? yes : no}
          `,
          inline: true
        },
        {
          name: '➢ __Voice Permissions:__',
          value: stripIndents`
          \`Connect\`| ${(has('Connect') ? yes : no)}
          \`Speak\`| ${(has('Speak') ? yes : no)}
          \`Stream\`| ${has('Stream') ? yes : no}
          \`Use Voice Activity\`| ${(has('UseVAD') ? yes : no)}
          \`Priority Speaker\`| ${(has('PrioritySpeaker') ? yes : no)}
          \`Mute Members\`| ${(has('MuteMembers') ? yes : no)}
          \`Deafen Members\`| ${(has('DeafenMembers') ? yes : no)}
          \`Move Members\`| ${(has('MoveMembers') ? yes : no)}
          `,
          inline: true
        },
        {
          name: '➢ __Stage Channel Permissions:__',
          value: stripIndents`
          \`Request to Speak\`| ${has('RequestToSpeak') ? yes : no}
          `,
          inline: true
        },
        {
          name: '➢ __Advanced Permissions:__',
          value: stripIndents`
          \`Administrator\`| ${has('Administrator') ? yes : no}
          `,
          inline: true
        }
      ]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Perms;
