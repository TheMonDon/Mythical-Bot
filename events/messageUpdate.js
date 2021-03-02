const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  // eslint-disable-next-line no-unused-vars
  async run (oldmsg, newmsg) {
    if (oldmsg.author.bot) return;

    (async () => {
      const logChan = db.get(`servers.${newmsg.guild.id}.logs.channel`);
      if (!logChan) return;

      const logSys = db.get(`servers.${newmsg.guild.id}.logs.log_system.message-edited`);
      if (logSys !== 'enabled') return;

      const chans = db.get(`servers.${newmsg.guild.id}.logs.noLogChans`) || [];
      if (chans.includes(newmsg.channel.id)) return;
      const logChannel = newmsg.guild.channels.cache.get(logChan);
      if (!logChannel.permissionsFor(this.client.user.id).has('SEND_MESSAGES')) return;

      const msg1 = oldmsg;
      const msg2 = newmsg;
      if (msg1.content === msg2.content) return;

      const embed = new DiscordJS.MessageEmbed();
      embed.setTitle('Message Edited');
      embed.setURL(msg2.url);
      embed.setAuthor(msg1.author.tag, msg1.author.displayAvatarURL());
      embed.setColor('#EE82EE');
      embed.setThumbnail(msg1.author.displayAvatarURL());
      embed.addField('Original Message', (msg1.content.length <= 1024) ? msg1.content : `${msg1.content.substring(0, 1020)}...`, true);
      embed.addField('Edited Message', (msg2.content.length <= 1024) ? msg2.content : `${msg2.content.substring(0, 1020)}...`, true);
      embed.addField('Channel', msg1.channel, true);
      embed.addField('Message Author', `${msg1.author} (${msg1.author.tag})`, true);
      embed.addField('Number of Edits', msg2.edits.length, true);
      (msg2.mentions.users.size === 0) ? embed.addField('Mentioned Users', 'None', true) : embed.addField('Mentioned Users', `Mentioned Member Count: ${msg2.mentions.users.array().length} \n Mentioned Users List: \n ${msg2.mentions.users.array()}`, true);
      embed.setTimestamp();
      newmsg.guild.channels.cache.get(logChan).send(embed);
      db.add(`servers.${newmsg.guild.id}.logs.message-edited`, 1);
      db.add(`servers.${newmsg.guild.id}.logs.all`, 1);
    })();

    let bool;
    let tag;
    const re = new RegExp('http');
    if (re.test(newmsg)) {

    } else if (oldmsg.content === newmsg.content || oldmsg === newmsg) {

    } else {
      if (newmsg.guild && !newmsg.channel.permissionsFor(newmsg.guild.me).missing('SEND_MESSAGES')) return;

      const settings = this.client.getSettings(newmsg.guild);
      newmsg.settings = settings;

      const prefixMention = new RegExp(`^(<@!?${this.client.user.id}>)(\s+)?`);
      if (newmsg.content.match(prefixMention)) {
        bool = true;
        tag = String(newmsg.guild.me);
      } else if (newmsg.content.indexOf(settings.prefix) !== 0) {
        return;
      } else {
        bool = true;
        tag = settings.prefix;
      }

      if (!bool) return;
      const args = newmsg.content.slice(tag.length).trim().split(/ +/g);
      let command = args.shift().toLowerCase();
      if (tag === String(newmsg.guild.me)) {
        command = args.shift().toLowerCase();
      }

      // If the member on a guild is invisible or not cached, fetch them.
      if (newmsg.guild && !newmsg.member) await newmsg.guild.fetchMember(newmsg.author);
      // Get the user or member's permission level from the elevation
      const level = this.client.permlevel(newmsg);

      // Check whether the command, or alias, exist in the collections defined
      // in app.js.
      const cmd = this.client.commands.get(command) || this.client.commands.get(this.client.aliases.get(command));
      // using this const varName = thing OR otherthign; is a pretty efficient
      // and clean way to grab one of 2 values!
      if (!cmd) return;

      // Check if the member is blacklisted from using commands in this guild.
      if (newmsg.guild) {
        const bl = db.get(`servers.${newmsg.guild.id}.users.${newmsg.member.id}.blacklist`);
        if (bl && level < 4 && (cmd.help.name !== 'blacklist')) {
          return newmsg.channel.send(`Sorry ${newmsg.member.displayName}, you are currently blacklisted from using commands in this server.`);
        }
      }

      // Some commands may not be useable in DMs. This check prevents those commands from running
      // and return a friendly error message.
      if (cmd && !newmsg.guild && cmd.conf.guildOnly) { return newmsg.channel.send('This command is unavailable via private message. Please run this command in a guild.'); }

      if (level < this.client.levelCache[cmd.conf.permLevel]) {
        if (settings.systemNotice === 'true') {
          return newmsg.channel.send(`You do not have permission to use this command.
Your permission level is ${level} (${this.client.config.permLevels.find(l => l.level === level).name})
This command requires level ${this.client.levelCache[cmd.conf.permLevel]} (${cmd.conf.permLevel})`);
        } else {
          return;
        }
      }
      newmsg.author.permLevel = level;
      /*
      newmsg.flags = [];
      while (args[0] && args[0][0] === '-') {
        newmsg.flags.push(args.shift().slice(1));
      }
      */
      // If the command exists, **AND** the user has permission, run it.
      db.add('global.commands', 1);
      cmd.run(newmsg, args, level);
    }
  }
};
