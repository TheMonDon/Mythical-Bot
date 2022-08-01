const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

class Perms extends Command {
  constructor (client) {
    super(client, {
      name: 'perms',
      description: 'Figure out what permissions you or another member have.',
      usage: 'perms',
      category: 'Information',
      aliases: ['permissions'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    let infoMem = msg.member;

    if (args && args.length > 0) infoMem = getMember(msg, args.join(' '));
    if (!infoMem) return msg.channel.send('That user was not found, please try again.');

    const yes = '<:approved:622961998807826432>';
    const no = '<:denied:622961970093752320>';

    const embed = new EmbedBuilder()
      .setColor('#2BFED5')
      .setAuthor({ name: infoMem.displayName, iconURL: infoMem.user.displayAvatarURL({ dynamic: true }) })
      .setFooter({ text: `Requested by: ${msg.member.displayName}` })
      .setTimestamp()
      .addFields([
        {
          name: '➢ __General Server Permissions:__',
          value: stripIndents`
          \`View Channels\`| ${infoMem.permissions.has('ViewChannel') ? yes : no}
          \`Manage Channels\`| ${infoMem.permissions.has('ManageChannels') ? yes : no}
          \`Manage Roles\`| ${infoMem.permissions.has('ManageRoles') ? yes : no}
          \`Manage Emojis and Stickers\`| ${infoMem.permissions.has('ManageEmojisAndStickers') ? yes : no}
          \`View Audit Log\`| ${infoMem.permissions.has('ViewAuditLog') ? yes : no}
          \`View Server Insights\`| ${infoMem.permissions.has('ViewGuildInsights') ? yes : no}
          \`Manage Webhooks\`| ${infoMem.permissions.has('ManageWebhooks') ? yes : no}
          \`Manage Server\`| ${infoMem.permissions.has('ManageGuild') ? yes : no}
          `,
          inLine: true
        },
        {
          name: '➢ __Membership Permissions:__',
          value: stripIndents`
          \`Create Invite\`| ${infoMem.permissions.has('CreateInstantInvite') ? yes : no}
          \`Change Nickname\`| ${infoMem.permissions.has('ChangeNickname') ? yes : no}
          \`Manage Nicknames\`| ${infoMem.permissions.has('ManageNicknames') ? yes : no}
          \`Kick Members\`| ${infoMem.permissions.has('KickMembers') ? yes : no}
          \`Ban Members\`| ${infoMem.permissions.has('BanMembers') ? yes : no}
          \`Timeout Members\`| ${infoMem.permissions.has('ModerateMembers') ? yes : no}
          `,
          inLine: true
        },
        {
          name: '➢ __Text Channel Permissions:__',
          value: stripIndents`
          \`Send Messages\`| ${infoMem.permissions.has('SendMessages') ? yes : no}
          \`Create Public Threads\`| ${infoMem.permissions.has('CreatePublicThreads') ? yes : no}
          \`Create Private Threads\`| ${infoMem.permissions.has('CreatePrivateThreads') ? yes : no}
          \`Embed Links\`| ${infoMem.permissions.has('EmbedLinks') ? yes : no}
          \`Attach Files\`| ${infoMem.permissions.has('AttachFiles') ? yes : no}
          \`Add Reactions\`| ${infoMem.permissions.has('AddReactions') ? yes : no}
          \`Use External Emojis\`| ${infoMem.permissions.has('UseExternalEmojis') ? yes : no}
          \`Use External Stickers\`| ${infoMem.permissions.has('UseExternalStickers') ? yes : no}
          \`Mention @everyone, @here, and All Roles\`| ${infoMem.permissions.has('MentionEveryone') ? yes : no}
          \`Manage Messages\`| ${infoMem.permissions.has('ManageMessages') ? yes : no}
          \`Manage Threads\`| ${infoMem.permissions.has('ManageThreads') ? yes : no}
          \`Read Message History\`| ${infoMem.permissions.has('ReadMessageHistory') ? yes : no}
          \`Send Text-to-Speech Messages\`| ${infoMem.permissions.has('SendTTSMessages') ? yes : no}
          \`Use Application Commands\`| ${infoMem.permissions.has('UseApplicationCommands') ? yes : no}
          `,
          inLine: true
        },
        {
          name: '➢ __Voice Permissions:__',
          value: stripIndents`
          \`Connect\`| ${(infoMem.permissions.has('Connect') ? yes : no)}
          \`Speak\`| ${(infoMem.permissions.has('Speak') ? yes : no)}
          \`Stream\`| ${infoMem.permissions.has('Stream') ? yes : no}
          \`Use Voice Activity\`| ${(infoMem.permissions.has('UseVAD') ? yes : no)}
          \`Priority Speaker\`| ${(infoMem.permissions.has('PrioritySpeaker') ? yes : no)}
          \`Mute Members\`| ${(infoMem.permissions.has('MuteMembers') ? yes : no)}
          \`Deafen Members\`| ${(infoMem.permissions.has('DeafenMembers') ? yes : no)}
          \`Move Members\`| ${(infoMem.permissions.has('MoveMembers') ? yes : no)}
          `,
          inLine: true
        },
        {
          name: '➢ __Stage Channel Permissions:__',
          value: stripIndents`
          \`Request to Speak\`| ${infoMem.permissions.has('RequestToSpeak') ? yes : no}
          `,
          inLine: true
        },
        {
          name: '➢ __Advanced Permissions:__',
          value: stripIndents`
          \`Administrator\`| ${infoMem.permissions.has('Administrator') ? yes : no}
          `,
          inLine: true
        }
      ]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Perms;
