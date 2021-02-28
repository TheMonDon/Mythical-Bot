const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class Ban extends Command {
  constructor (client) {
    super(client, {
      name: 'ban',
      description: 'Ban a naughty member',
      usage: 'ban <member> <reason>',
      category: 'Moderator',
      guildOnly: true,
    });
  }

  async run (msg, text) {
    const me = msg.guild.me;
    const server = msg.guild;
    let ban_mem;

    const log_chan = db.get(`servers.${msg.guild.id}.logging.channel`);

    if (text[0]) {
      ban_mem = msg.mentions.members.first() || server.members.cache.find(m => m.id === `${text[0]}`) || server.members.cache.find(m => m.displayName.toUpperCase() === `${text[0].toUpperCase()}`) || server.members.cache.find(m => m.user.username.toUpperCase() === `${text[0].toUpperCase()}`) || server.members.cache.find(m => m.user.username.toLowerCase()
        .includes(`${text[0].toLowerCase()}`));
    } else {
      return msg.channel.send('Please provide a member and a reason.');
    }

    if (!msg.guild.me.permissions.has('BAN_MEMBERS')) return msg.channel.send('The bot is missing the ban members permission.');
    if (!msg.member.permissions.has('BAN_MEMBERS')) return msg.channel.send('Why do you think you can use this?');

    // start reason
    text.shift();
    const reason = text.join(' ');
    if (!reason) return msg.channel.send('Please provide a reason.');
    if (me.permissions.has('MANAGE_MESSAGES')) msg.delete();
    if (!ban_mem) return msg.channel.send('That user was not found.');
    if (!ban_mem.bannable) return msg.channel.send('That user is not bannable.');

    const em = new DiscordJS.MessageEmbed()
      .setTitle('Member Banned')
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setColor('RED')
      .addField('User', ban_mem, true)
      .addField('Banned By', msg.member, true)
      .addField('Reason', reason, true)
      .setFooter(`ID: ${ban_mem.id}`)
      .setTimestamp();
    ban_mem.ban({ reason: reason });
    
    if (log_chan) msg.guild.channels.cache.get(log_chan).send(em);
    return msg.channel.send(em);
  }
}

module.exports = Ban;
