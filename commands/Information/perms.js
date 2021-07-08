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

    if (infoMem.hasPermission('ADMINISTRATOR')) {
      const embed = new DiscordJS.MessageEmbed();
      embed.setColor('#2BFED5');
      embed.setAuthor(infoMem.displayName, infoMem.user.displayAvatarURL());
      embed.setFooter(`Requested by: ${msg.member.displayName}`);
      embed.setTimestamp();

      // General Perms
      embed.addField('➢ __General Permissions:__', stripIndents`
        \`Administrator\`| ${yes}`, true);

      return msg.channel.send(embed);
    }

    // Non admin perms:
    const embed = new DiscordJS.MessageEmbed();
    embed.setColor('#2BFED5');
    embed.setAuthor(infoMem.displayName, infoMem.user.displayAvatarURL());
    embed.setFooter(`Requested by: ${msg.member.displayName}`);
    embed.setTimestamp();

    // General Perms
    embed.addField('➢ __General Permissions:__', stripIndents`
    \`Administrator\`| ${no}
    \`View Audit Logs\`| ${(infoMem.hasPermission('VIEW_AUDIT_LOG') ? yes : no)}
    \`Manage Server\`| ${(infoMem.hasPermission('MANAGE_GUILD') ? yes : no)}
    \`Manage Roles\`| ${(infoMem.hasPermission('MANAGE_ROLES') ? yes : no)}
    \`Manage Channels\`| ${(infoMem.hasPermission('MANAGE_CHANNELS') ? yes : no)}
    \`Kick Members\`| ${(infoMem.hasPermission('KICK_MEMBERS') ? yes : no)}
    \`Ban Members\`| ${(infoMem.hasPermission('BAN_MEMBERS') ? yes : no)}
    \`Create Invite\`| ${(infoMem.hasPermission('CREATE_INSTANT_INVITE') ? yes : no)}
    \`Change Nickname\`| ${(infoMem.hasPermission('CHANGE_NICKNAME') ? yes : no)}
    \`Manage Nicknames\`| ${(infoMem.hasPermission('MANAGE_NICKNAMES') ? yes : no)}
    \`Manage Emojis\`| ${(infoMem.hasPermission('MANAGE_EMOJIS') ? yes : no)}
    \`Manage Webhooks\`| ${(infoMem.hasPermission('MANAGE_WEBHOOKS') ? yes : no)}
    \`View Guild Insights\`| ${infoMem.hasPermission('VIEW_GUILD_INSIGHTS') ? yes : no}
    \`Use Stream\`| ${infoMem.hasPermission('STREAM') ? yes : no}
    `, true);

    // Text Perms
    embed.addField('➢ __Text Permissions:__', stripIndents`
    \`Read Messages\`| ${(infoMem.permissions.has(1024) ? yes : no)}
    \`Send Messages\`| ${(infoMem.hasPermission('SEND_MESSAGES') ? yes : no)}
    \`Send TTS Messages\`| ${(infoMem.hasPermission('SEND_TTS_MESSAGES') ? yes : no)}
    \`Manage Messages\`| ${(infoMem.hasPermission('MANAGE_MESSAGES') ? yes : no)}
    \`Embed Links\`| ${(infoMem.hasPermission('EMBED_LINKS') ? yes : no)}
    \`Attach Files\`| ${(infoMem.hasPermission('ATTACH_FILES') ? yes : no)}
    \`Read Message History\`| ${(infoMem.hasPermission('READ_MESSAGE_HISTORY') ? yes : no)}
    \`Mention @everyone, @here, and All Roles\`| ${(infoMem.hasPermission('MENTION_EVERYONE') ? yes : no)}
    \`Use External Emojis\`| ${(infoMem.hasPermission('USE_EXTERNAL_EMOJIS') ? yes : no)}
    \`Add Reactions\`| ${(infoMem.hasPermission('ADD_REACTIONS') ? yes : no)}
    `, true);
    // \`Use Slash Commands\`| ${(infoMem.hasPermission('USE_SLASH_COMMANDS') ? yes : no)}
    // Not added in d.js yet?

    // Voice Perms
    embed.addField('➢ __Voice Permissions:__', stripIndents`
    \`Connect\`| ${(infoMem.hasPermission('CONNECT') ? yes : no)}
    \`Speak\`| ${(infoMem.hasPermission('SPEAK') ? yes : no)}
    \`Mute Members\`| ${(infoMem.hasPermission('MUTE_MEMBERS') ? yes : no)}
    \`Deafen Members\`| ${(infoMem.hasPermission('DEAFEN_MEMBERS') ? yes : no)}
    \`Move Members\`| ${(infoMem.hasPermission('MOVE_MEMBERS') ? yes : no)}
    \`Use Voice Activity\`| ${(infoMem.hasPermission('USE_VAD') ? yes : no)}
    \`Priority Speaker\`| ${(infoMem.hasPermission('PRIORITY_SPEAKER') ? yes : no)}
    `, true);

    return msg.channel.send(embed);
  }
}

module.exports = Perms;
