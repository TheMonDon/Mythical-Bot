const Command = require('../../base/Command.js');
const { getMember } = require('../../base/Util.js');
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

    const embed = new DiscordJS.MessageEmbed();
    embed.setColor('#2BFED5');
    embed.setAuthor(infoMem.displayName, infoMem.user.displayAvatarURL({ dynamic: true }));
    embed.setFooter(`Requested by: ${msg.member.displayName}`);
    embed.setTimestamp();

    embed.addField('➢ __General Server Permissions:__', stripIndents`
    \`View Channels\`| ${infoMem.hasPermission('VIEW_CHANNELS') ? yes : no}
    \`Manage Channels\`| ${infoMem.hasPermission('MANAGE_CHANNELS') ? yes : no}
    \`Manage Roles\`| ${infoMem.hasPermission('MANAGE_ROLES') ? yes : no}
    \`Manage Emojis and Stickers\`| ${infoMem.hasPermission('MANAGE_EMOJIS') ? yes : no}
    \`View Audit Log\`| ${infoMem.hasPermission('VIEW_AUDIT_LOG') ? yes : no}
    \`View Server Insights\`| ${infoMem.hasPermission('VIEW_SERVER_INSIGHTS') ? yes : no}
    \`Manage Webhooks\`| ${infoMem.hasPermission('MANAGE_WEBHOOKS') ? yes : no}
    \`Manage Server\`| ${infoMem.hasPermission('MANAGE_SERVER') ? yes : no}
    `, true);

    embed.addField('➢ __Membership Permissions:__', stripIndents`
    \`Create Invite\`| ${infoMem.hasPermission('CREATE_INVITE') ? yes : no}
    \`Change Nickname\`| ${infoMem.hasPermission('CHANGE_NICKNAME') ? yes : no}
    \`Manage Nicknames\`| ${infoMem.hasPermission('MANAGE_NICKNAMES') ? yes : no}
    \`Kick Members\`| ${infoMem.hasPermission('KICK_MEMBERS') ? yes : no}
    \`Ban Members\`| ${infoMem.hasPermission('BAN_MEMBERS') ? yes : no}
    `, true);

    embed.addField('➢ __Text Channel Permissions:__', stripIndents`
    \`Send Messages\`| ${infoMem.hasPermission('SEND_MESSAGES') ? yes : no}
    \`Public Thrads\`| ${infoMem.hasPermission('PUBLIC_THREADS') ? yes : no}
    \`Public Thrads\`| ${infoMem.hasPermission('PUBLIC_THREADS') ? yes : no}
    \`Embed Links\`| ${infoMem.hasPermission('EMBED_LINKS') ? yes : no}
    \`Attach Files\`| ${infoMem.hasPermission('ATTACH_FILES') ? yes : no}
    \`Add Reactions\`| ${infoMem.hasPermission('ADD_REACTIONS') ? yes : no}
    \`Use External Emojis\`| ${infoMem.hasPermission('USE_EXTERNAL_EMOJIS') ? yes : no}
    \`Use External Stickers\`| ${infoMem.hasPermission('USE_EXTERNAL_STICKERS') ? yes : no}
    \`Mention @everyone, @here, and All Roles\`| ${infoMem.hasPermission('MENTION_EVERYONE') ? yes : no}
    \`Manage Messages\`| ${infoMem.hasPermission('MANAGE_MESSAGES') ? yes : no}
    \'Manage Threads\'| ${infoMem.hasPermission('MANAGE_THREADS') ? yes : no}
    \`Read Message History\`| ${infoMem.hasPermission('READ_MESSAGE_HISTORY') ? yes : no}
    \`Send Text-to-Speech Messages\`| ${infoMem.hasPermission('SEND_TTS_MESSAGES') ? yes : no}
    \'Use Application Commands\'| ${infoMem.hasPermission('USE_APPLICATION_COMMANDS') ? yes : no}
    `, true);

    // Voice Perms
    embed.addField('➢ __Voice Permissions:__', stripIndents`
    \`Connect\`| ${(infoMem.hasPermission('CONNECT') ? yes : no)}
    \`Speak\`| ${(infoMem.hasPermission('SPEAK') ? yes : no)}
    \`Video\`| ${infoMem.hasPermission('VIDEO') ? yes : no}
    \`Use Voice Activity\`| ${(infoMem.hasPermission('USE_VAD') ? yes : no)}
    \`Priority Speaker\`| ${(infoMem.hasPermission('PRIORITY_SPEAKER') ? yes : no)}
    \`Mute Members\`| ${(infoMem.hasPermission('MUTE_MEMBERS') ? yes : no)}
    \`Deafen Members\`| ${(infoMem.hasPermission('DEAFEN_MEMBERS') ? yes : no)}
    \`Move Members\`| ${(infoMem.hasPermission('MOVE_MEMBERS') ? yes : no)}
    `, true);

    embed.addField('➢ __Advanced Permissions:__', stripIndents`
    \`Request to Speak\`| ${infoMem.hasPermission('REQUEST_TO_SPEAK') ? yes : no}
    `, true);

    embed.addField('➢ __Advanced Permissions:__', stripIndents`
    \`Administrator\`| ${infoMem.hasPermission('ADMINISTRATOR') ? yes : no}
    `, true);

    return msg.channel.send(embed);
  }
}

module.exports = Perms;
