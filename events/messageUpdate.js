// The MESSAGE event runs anytime a message is received
// Note that due to the binding of client to every event, every event
// goes `client, other, args` when this function is run.
const db = require('quick.db');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  // eslint-disable-next-line no-unused-vars
  async run (oldmsg, newmsg) {
    let bool;
    let tag;
    const re = new RegExp('http');
    if (re.test(newmsg)) { 
      return;
    } else if (oldmsg.content === newmsg.content || oldmsg === newmsg) {
      return;
    } else {
      if (oldmsg.author.bot) return;
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

      // Some commands may not be useable in DMs. This check prevents those commands from running
      // and return a friendly error message.
      if (cmd && !newmsg.guild && cmd.conf.guildOnly)
        return newmsg.channel.send('This command is unavailable via private message. Please run this command in a guild.');

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

      newmsg.flags = [];
      while (args[0] &&args[0][0] === '-') {
        newmsg.flags.push(args.shift().slice(1));
      }
      // If the command exists, **AND** the user has permission, run it.
      db.add('global.commands', 1);
      cmd.run(newmsg, args, level);
    }
  }
};