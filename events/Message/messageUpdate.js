/* eslint-disable prefer-regex-literals */
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(oldmsg, newmsg) {
    if (oldmsg.author.bot) return;

    async function LogSystem(client, oldmsg, newmsg) {
      if (!newmsg.guild) return;

      const logChan = await db.get(`servers.${newmsg.guild.id}.logs.channel`);
      if (!logChan) return;

      const logSys = await db.get(`servers.${newmsg.guild.id}.logs.logSystem.message-edited`);
      if (!logSys || logSys !== 'enabled') return;

      const chans = (await db.get(`servers.${newmsg.guild.id}.logs.noLogChans`)) || [];
      if (chans.includes(newmsg.channel.id)) return;

      const logChannel = newmsg.guild.channels.cache.get(logChan);
      if (!logChannel.permissionsFor(client.user.id).has('SendMessages')) return;

      const msg1 = oldmsg;
      const msg2 = newmsg;
      if (msg1.content === msg2.content) return;

      const authorName = msg1.author.discriminator === '0' ? msg1.author.username : msg1.author.tag;
      const embed = new EmbedBuilder()
        .setTitle('Message Edited')
        .setURL(msg2.url)
        .setAuthor({ name: authorName, iconURL: msg1.author.displayAvatarURL() })
        .setColor('#EE82EE')
        .setThumbnail(msg1.author.displayAvatarURL())
        .addFields([
          {
            name: 'Original Message',
            value: msg1.content.length <= 1024 ? msg1.content : `${msg1.content.substring(0, 1020)}...`,
          },
          {
            name: 'Edited Message',
            value: msg2.content.length <= 1024 ? msg2.content : `${msg2.content.substring(0, 1020)}...`,
          },
          { name: 'Channel', value: msg1.channel.toString() },
          { name: 'Message Author', value: `${msg1.author} (${authorName})` },
        ])
        .setTimestamp();

      if (msg2.mentions.users.size === 0)
        embed.addFields([
          {
            name: 'Mentioned Users',
            value: `Mentioned Member Count: ${[...msg2.mentions.users.values()].length} \nMentioned Users List: \n${[
              ...msg2.mentions.users.values(),
            ]}`,
          },
        ]);
      newmsg.guild.channels.cache.get(logChan).send({ embeds: [embed] });

      await db.add(`servers.${newmsg.guild.id}.logs.message-edited`, 1);
      await db.add(`servers.${newmsg.guild.id}.logs.all`, 1);
    }

    async function CommandUpdate(client, oldmsg, newmsg) {
      let bool = true;
      const re = /'http'/;

      if (re.test(newmsg.content)) return;
      if (oldmsg.content === newmsg.content || oldmsg === newmsg) return;
      if (newmsg.guild && !newmsg.channel.permissionsFor(newmsg.guild.members.me).missing('SendMessages')) return;

      const settings = client.getSettings(newmsg.guild);
      newmsg.settings = settings;
      let tag = settings.prefix;

      const prefixMention = new RegExp(`^(<@!?${client.user.id}>)(\\s+)?`);
      if (newmsg.guild && newmsg.content.match(prefixMention)) {
        tag = String(newmsg.guild.members.me);
      } else if (newmsg.content.indexOf(settings.prefix) !== 0) {
        bool = false;
        return;
      }

      if (!bool) return;

      const args = newmsg.content.slice(tag.length).trim().split(/\s+/g);
      const command = args.shift().toLowerCase();
      if (!command && tag === String(newmsg.guild?.members.me)) {
        if (!args || args.length < 1) return newmsg.channel.send(`The current prefix is: ${newmsg.settings.prefix}`);
      }

      // If the member on a guild is invisible or not cached, fetch them.
      if (newmsg.guild && !newmsg.member) await newmsg.guild.fetchMember(newmsg.author);
      // Get the user or member's permission level from the elevation
      const level = client.permlevel(newmsg);

      const cmd = client.commands.get(command) || client.commands.get(client.aliases.get(command));
      if (!cmd) return;

      // Check if the member is blacklisted from using commands in this guild.
      if (newmsg.guild) {
        const bl = await db.get(`servers.${newmsg.guild.id}.users.${newmsg.member.id}.blacklist`);
        if (bl && level < 4 && cmd.help.name !== 'blacklist') {
          return newmsg.channel.send(
            `Sorry ${newmsg.member.displayName}, you are currently blacklisted from using commands in this server.`,
          );
        }
      }

      // Some commands may not be useable in DMs. This check prevents those commands from running
      // and return a friendly error message.
      if (!newmsg.guild && cmd.conf.guildOnly) {
        return newmsg.channel.send(
          'This command is unavailable via private message. Please run this command in a guild.',
        );
      }

      if (level < client.levelCache[cmd.conf.permLevel]) {
        if (settings.systemNotice === 'true') {
          const authorName = newmsg.author.discriminator === '0' ? newmsg.author.username : newmsg.author.tag;
          const embed = new EmbedBuilder()
            .setTitle('Missing Permission')
            .setAuthor({ name: authorName, iconURL: newmsg.author.displayAvatarURL() })
            .setColor(newmsg.settings.embedErrorColor)
            .addFields([
              {
                name: 'Your Level',
                value: `${level} (${this.client.config.permLevels.find((l) => l.level === level).name})`,
                inline: true,
              },
              {
                name: 'Required Level',
                value: `${this.client.levelCache[cmd.conf.permLevel]} (${cmd.conf.permLevel})`,
                inline: true,
              },
            ]);

          return newmsg.channel.send({ embeds: [embed] });
        } else {
          return;
        }
      }
      newmsg.author.permLevel = level;

      if (cmd.conf.requiredArgs > args.length) {
        const embed = new EmbedBuilder()
          .setAuthor({ name: newmsg.author.username, iconURL: newmsg.author.displayAvatarURL() })
          .setColor(newmsg.settings.embedErrorColor)
          .setTitle('Missing Command Arguments')
          .setFooter({ text: '[] = optional, <> = required' })
          .addFields([
            { name: 'Incorrect Usage', value: newmsg.settings.prefix + cmd.help.usage },
            { name: 'Examples', value: cmd.help.examples?.join('\n') || 'None' },
          ]);
        return newmsg.channel.send({ embeds: [embed] });
      }
      // If the command exists, **AND** the user has permission, run it.
      await db.add('global.commands', 1);
      cmd.run(newmsg, args, level);
    }

    LogSystem(this.client, oldmsg, newmsg);
    CommandUpdate(this.client, oldmsg, newmsg);
  }
};
