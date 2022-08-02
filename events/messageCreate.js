const db = require('quick.db');
const { ChannelType } = require('discord.js');
const { DateTime } = require('luxon');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (message) {
    let bool = false;
    let tag;

    if (message.author.bot) return;

    // if (message.guild && !message.channel.permissionsFor(this.client.user.id).has('SEND_MESSAGES')) return;
    if (message.guild && !message.guild.members.me.permissions.has('SEND_MESSAGES')) return;

    const settings = this.client.getSettings(message.guild);
    message.settings = settings;

    // Checks if the bot was mentioned, with no message after it, returns the prefix.
    // eslint-disable-next-line no-useless-escape
    const prefixMention = new RegExp(`^(<@!?${this.client.user.id}>)(\s+)?`);
    if (message.guild && message.content.match(prefixMention)) {
      bool = true;
      tag = String(message.guild.members.me);
    } else if (message.content.indexOf(settings.prefix) !== 0) {
      // Ticket message storage

      if (message.channel.type === ChannelType.GuildText && message.channel.name.startsWith('ticket-')) {
        if (message.channel.name === 'ticket-logs') return;
        const tix = db.get(`servers.${message.guild.id}.tickets.${message.channel.name}`);
        if (!tix) return;

        const tName = message.channel.name;

        const attachments = [];
        const mArray = [...message.attachments?.values()];
        if (mArray.length > 0) {
          for (let i = 0; i < mArray.length; i++) {
            attachments.push(mArray[i].url);
          }
        }

        let content;
        if (!message.content.length > 0 && !attachments.length > 0) {
          content = 'The bot could not read this message.';
        } else if (message.content.length > 0 && attachments.length > 0) {
          content = `${message.content} \nAttachments: ${attachments.join('\n')}`;
        } else if (!message.content.length > 0 && attachments.length > 0) {
          content = `Attachments: ${attachments.join('\n')}`;
        } else {
          content = message.content;
        }

        const output = `${DateTime.now().toLocaleString(DateTime.DATETIME_FULL)} - [${message.author.tag}]: \n${content}`;

        db.push(`servers.${message.guild.id}.tickets.${tName}.chatLogs`, output);
        return;
      }

      // Economy chat money event
      if (message.channel.type === ChannelType.DM) return;
      const msg = message;
      const server = msg.guild;
      const member = msg.member;
      const type = 'chat';

      const min = db.get(`servers.${server.id}.economy.${type}.min`) || 10;
      const max = db.get(`servers.${server.id}.economy.${type}.max`) || 100;

      const now = Date.now();
      const cooldown = db.get(`servers.${server.id}.economy.${type}.cooldown`) || 60; // get cooldown from database or set to 60 seconds (1 minute)
      let userCooldown = db.get(`servers.${server.id}.users.${member.id}.economy.${type}.cooldown`) || {};

      if (userCooldown.active) {
        const timeleft = userCooldown.time - now;
        if (timeleft < 0 || timeleft > (cooldown * 1000)) {
          // this is to check if the bot restarted before their cooldown was set.
          userCooldown = {};
          userCooldown.active = false;
          db.set(`servers.${server.id}.users.${member.id}.economy.${type}.cooldown`, userCooldown);
        } else {
          return;
        }
      }

      const amount = Math.floor(Math.random() * (max - min + 1) + min);
      db.add(`servers.${server.id}.users.${member.id}.economy.cash`, amount);
      userCooldown.time = now + (cooldown * 1000);
      userCooldown.active = true;
      db.set(`servers.${server.id}.users.${member.id}.economy.${type}.cooldown`, userCooldown);

      return setTimeout(() => {
        userCooldown = {};
        userCooldown.active = false;
        db.set(`servers.${server.id}.users.${member.id}.economy.${type}.cooldown`, userCooldown);
      }, cooldown * 1000);
    } else {
      bool = true;
      tag = settings.prefix;
    }

    // Here we separate our "command" name, and our "arguments" for the command.
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    if (!bool) return;
    const args = message.content.slice(tag.length).trim().split(/\s+/g);
    const command = args.shift().toLowerCase();
    if (!command && tag === String(message.guild?.me)) {
      if (!args || args.length < 1) return message.channel.send(`The current prefix is: ${message.settings.prefix}`);
    }

    // If the member on a guild is invisible or not cached, fetch them.
    if (message.guild && !message.member) await message.guild.fetchMember(message.author);

    // Get the user or member's permission level from the elevation
    const level = this.client.permlevel(message);

    // Check whether the command, or alias, exist in the collections defined
    // in app.js.
    const cmd = this.client.commands.get(command) || this.client.commands.get(this.client.aliases.get(command));
    if (!cmd) return;

    // Check if the member is blacklisted from using commands in this guild.
    if (message.guild) {
      const bl = db.get(`servers.${message.guild.id}.users.${message.member.id}.blacklist`);
      if (bl && level < 4 && (cmd.help.name !== 'blacklist')) {
        return message.channel.send(`Sorry ${message.member.displayName}, you are currently blacklisted from using commands in this server.`);
      }
    }

    if (!message.guild && cmd.conf.guildOnly) return message.channel.send('This command is unavailable via private message. Please run this command in a guild.');

    if (cmd.conf.nsfw && !message.channel.nsfw) return message.channel.send('This command can only be used in NSFW channels.');

    if (!cmd.conf.enabled) return message.channel.send('This command is currently disabled.');

    if (level < this.client.levelCache[cmd.conf.permLevel]) {
      if (settings.systemNotice === 'true') {
        return message.channel.send(`You do not have permission to use this command.
Your permission level is ${level} (${this.client.config.permLevels.find(l => l.level === level).name})
This command requires level ${this.client.levelCache[cmd.conf.permLevel]} (${cmd.conf.permLevel})`);
      } else {
        return;
      }
    }

    // To simplify message arguments, the author's level is now put on level (not member, so it is supported in DMs)
    // The "level" command module argument will be deprecated in the future.
    message.author.permLevel = level;

    // If the command exists, **AND** the user has permission, run it.
    db.add('global.commands', 1);
    cmd.run(message, args, level);
  }
};
