/* eslint-disable prefer-regex-literals */
import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, oldMessage, newMessage) {
  if (oldMessage.author.bot) return;

  async function LogSystem(client, oldMessage, newMessage) {
    if (!newMessage.guild) return;

    const logChan = await db.get(`servers.${newMessage.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = await db.get(`servers.${newMessage.guild.id}.logs.logSystem.message-edited`);
    if (!logSys || logSys !== 'enabled') return;

    const chans = (await db.get(`servers.${newMessage.guild.id}.logs.noLogChans`)) || [];
    if (chans.includes(newMessage.channel.id)) return;

    const logChannel = newMessage.guild.channels.cache.get(logChan);
    if (!logChannel.permissionsFor(client.user.id).has('SendMessages')) return;
    if (oldMessage.content === newMessage.content) return;

    const authorName = oldMessage.author.discriminator === '0' ? oldMessage.author.username : oldMessage.author.tag;
    const embed = new EmbedBuilder()
      .setTitle('Message Edited')
      .setURL(newMessage.url)
      .setAuthor({ name: authorName, iconURL: oldMessage.author.displayAvatarURL() })
      .setColor('#EE82EE')
      .setThumbnail(oldMessage.author.displayAvatarURL())
      .addFields([
        {
          name: 'Original Message',
          value: oldMessage.content.length <= 1024 ? oldMessage.content : `${oldMessage.content.substring(0, 1020)}...`,
        },
        {
          name: 'Edited Message',
          value: newMessage.content.length <= 1024 ? newMessage.content : `${newMessage.content.substring(0, 1020)}...`,
        },
        { name: 'Channel', value: oldMessage.channel.toString() },
        { name: 'Message Author', value: `${oldMessage.author} (${authorName})` },
      ])
      .setTimestamp();

    if (newMessage.mentions.users.size === 0)
      embed.addFields([
        {
          name: 'Mentioned Users',
          value: `Mentioned Member Count: ${
            [...newMessage.mentions.users.values()].length
          } \nMentioned Users List: \n${[...newMessage.mentions.users.values()]}`,
        },
      ]);
    newMessage.guild.channels.cache.get(logChan).send({ embeds: [embed] });

    await db.add(`servers.${newMessage.guild.id}.logs.message-edited`, 1);
    await db.add(`servers.${newMessage.guild.id}.logs.all`, 1);
  }

  async function CommandUpdate(client, oldMessage, newMessage) {
    let bool = true;
    const re = /'http'/;

    if (re.test(newMessage.content)) return;
    if (oldMessage.content === newMessage.content || oldMessage === newMessage) return;
    if (newMessage.guild && !newMessage.channel.permissionsFor(newMessage.guild.members.me).missing('SendMessages'))
      return;

    const settings = client.getSettings(newMessage.guild);
    newMessage.settings = settings;
    let tag = settings.prefix;

    const prefixMention = new RegExp(`^(<@!?${client.user.id}>)(\\s+)?`);
    if (newMessage.guild && newMessage.content.match(prefixMention)) {
      tag = String(newMessage.guild.members.me);
    } else if (newMessage.content.indexOf(settings.prefix) !== 0) {
      bool = false;
      return;
    }

    if (!bool) return;

    const args = newMessage.content.slice(tag.length).trim().split(/\s+/g);
    const command = args.shift().toLowerCase();
    if (!command && tag === String(newMessage.guild?.members.me)) {
      if (!args || args.length < 1)
        return newMessage.channel.send(`The current prefix is: ${newMessage.settings.prefix}`);
    }

    // If the member on a guild is invisible or not cached, fetch them.
    if (newMessage.guild && !newMessage.member) await newMessage.guild.fetchMember(newMessage.author);
    // Get the user or member's permission level from the elevation
    const level = client.permlevel(newMessage);

    const cmd = client.commands.get(command) || client.commands.get(client.aliases.get(command));
    if (!cmd) return;

    // Check if the member is blacklisted from using commands in this guild.
    if (newMessage.guild) {
      const bl = await db.get(`servers.${newMessage.guild.id}.users.${newMessage.member.id}.blacklist`);
      if (bl && level < 4 && cmd.help.name !== 'blacklist') {
        return newMessage.channel.send(
          `Sorry ${newMessage.member.displayName}, you are currently blacklisted from using commands in this server.`,
        );
      }
    }

    // Some commands may not be useable in DMs. This check prevents those commands from running
    // and return a friendly error message.
    if (!newMessage.guild && cmd.conf.guildOnly) {
      return newMessage.channel.send(
        'This command is unavailable via private message. Please run this command in a guild.',
      );
    }

    if (level < client.levelCache[cmd.conf.permLevel]) {
      if (settings.systemNotice === 'true') {
        const authorName = newMessage.author.discriminator === '0' ? newMessage.author.username : newMessage.author.tag;
        const embed = new EmbedBuilder()
          .setTitle('Missing Permission')
          .setAuthor({ name: authorName, iconURL: newMessage.author.displayAvatarURL() })
          .setColor(newMessage.settings.embedErrorColor)
          .addFields([
            {
              name: 'Your Level',
              value: `${level} (${client.config.permLevels.find((l) => l.level === level).name})`,
              inline: true,
            },
            {
              name: 'Required Level',
              value: `${client.levelCache[cmd.conf.permLevel]} (${cmd.conf.permLevel})`,
              inline: true,
            },
          ]);

        return newMessage.channel.send({ embeds: [embed] });
      } else {
        return;
      }
    }
    newMessage.author.permLevel = level;

    if (cmd.conf.requiredArgs > args.length) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: newMessage.author.username, iconURL: newMessage.author.displayAvatarURL() })
        .setColor(newMessage.settings.embedErrorColor)
        .setTitle('Missing Command Arguments')
        .setFooter({ text: '[] = optional, <> = required' })
        .addFields([
          { name: 'Incorrect Usage', value: newMessage.settings.prefix + cmd.help.usage },
          { name: 'Examples', value: cmd.help.examples?.join('\n') || 'None' },
        ]);
      return newMessage.channel.send({ embeds: [embed] });
    }

    // If the command exists, **AND** the user has permission, run it.
    await db.add('global.commands', 1);
    cmd.run(newMessage, args, level);
  }

  LogSystem(client, oldMessage, newMessage);
  CommandUpdate(client, oldMessage, newMessage);
}
