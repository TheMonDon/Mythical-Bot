const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');
const DiscordJS = require('discord.js');
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

    const embed = new DiscordJS.EmbedBuilder();
    embed.setColor('#2BFED5');
    embed.setAuthor({ name: infoMem.displayName, iconURL: infoMem.user.displayAvatarURL({ dynamic: true }) });
    embed.setFooter({ text: `Requested by: ${msg.member.displayName}` });
    embed.setTimestamp();

    embed.addField('➢ __General Server Permissions:__', stripIndents`
    \`View Channels\`| ${infoMem.permissions.has('VIEW_CHANNEL') ? yes : no}
    \`Manage Channels\`| ${infoMem.permissions.has('MANAGE_CHANNELS') ? yes : no}
    \`Manage Roles\`| ${infoMem.permissions.has('MANAGE_ROLES') ? yes : no}
    \`Manage Emojis and Stickers\`| ${infoMem.permissions.has('MANAGE_EMOJIS_AND_STICKERS') ? yes : no}
    \`View Audit Log\`| ${infoMem.permissions.has('VIEW_AUDIT_LOG') ? yes : no}
    \`View Server Insights\`| ${infoMem.permissions.has('VIEW_GUILD_INSIGHTS') ? yes : no}
    \`Manage Webhooks\`| ${infoMem.permissions.has('MANAGE_WEBHOOKS') ? yes : no}
    \`Manage Server\`| ${infoMem.permissions.has('MANAGE_GUILD') ? yes : no}
    `, true);

    embed.addField('➢ __Membership Permissions:__', stripIndents`
    \`Create Invite\`| ${infoMem.permissions.has('CREATE_INSTANT_INVITE') ? yes : no}
    \`Change Nickname\`| ${infoMem.permissions.has('CHANGE_NICKNAME') ? yes : no}
    \`Manage Nicknames\`| ${infoMem.permissions.has('MANAGE_NICKNAMES') ? yes : no}
    \`Kick Members\`| ${infoMem.permissions.has('KICK_MEMBERS') ? yes : no}
    \`Ban Members\`| ${infoMem.permissions.has('BAN_MEMBERS') ? yes : no}
    `, true);

    embed.addField('➢ __Text Channel Permissions:__', stripIndents`
    \`Send Messages\`| ${infoMem.permissions.has('SEND_MESSAGES') ? yes : no}
    \`Public Threads\`| ${infoMem.permissions.has('USE_PUBLIC_THREADS') ? yes : no}
    \`Private Threads\`| ${infoMem.permissions.has('USE_PRIVATE_THREADS') ? yes : no}
    \`Embed Links\`| ${infoMem.permissions.has('EMBED_LINKS') ? yes : no}
    \`Attach Files\`| ${infoMem.permissions.has('ATTACH_FILES') ? yes : no}
    \`Add Reactions\`| ${infoMem.permissions.has('ADD_REACTIONS') ? yes : no}
    \`Use External Emojis\`| ${infoMem.permissions.has('USE_EXTERNAL_EMOJIS') ? yes : no}
    \`Use External Stickers\`| ${infoMem.permissions.has('USE_EXTERNAL_STICKERS') ? yes : no}
    \`Mention @everyone, @here, and All Roles\`| ${infoMem.permissions.has('MENTION_EVERYONE') ? yes : no}
    \`Manage Messages\`| ${infoMem.permissions.has('MANAGE_MESSAGES') ? yes : no}
    \`Manage Threads\`| ${infoMem.permissions.has('MANAGE_THREADS') ? yes : no}
    \`Read Message History\`| ${infoMem.permissions.has('READ_MESSAGE_HISTORY') ? yes : no}
    \`Send Text-to-Speech Messages\`| ${infoMem.permissions.has('SEND_TTS_MESSAGES') ? yes : no}
    \`Use Application Commands\`| ${infoMem.permissions.has('USE_APPLICATION_COMMANDS') ? yes : no}
    `, true);

    // Voice Perms
    embed.addField('➢ __Voice Permissions:__', stripIndents`
    \`Connect\`| ${(infoMem.permissions.has('CONNECT') ? yes : no)}
    \`Speak\`| ${(infoMem.permissions.has('SPEAK') ? yes : no)}
    \`Stream\`| ${infoMem.permissions.has('STREAM') ? yes : no}
    \`Use Voice Activity\`| ${(infoMem.permissions.has('USE_VAD') ? yes : no)}
    \`Priority Speaker\`| ${(infoMem.permissions.has('PRIORITY_SPEAKER') ? yes : no)}
    \`Mute Members\`| ${(infoMem.permissions.has('MUTE_MEMBERS') ? yes : no)}
    \`Deafen Members\`| ${(infoMem.permissions.has('DEAFEN_MEMBERS') ? yes : no)}
    \`Move Members\`| ${(infoMem.permissions.has('MOVE_MEMBERS') ? yes : no)}
    `, true);

    embed.addField('➢ __Stage Channel Permissions:__', stripIndents`
    \`Request to Speak\`| ${infoMem.permissions.has('REQUEST_TO_SPEAK') ? yes : no}
    `, true);

    embed.addField('➢ __Advanced Permissions:__', stripIndents`
    \`Administrator\`| ${infoMem.permissions.has('ADMINISTRATOR') ? yes : no}
    `, true);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Perms;
