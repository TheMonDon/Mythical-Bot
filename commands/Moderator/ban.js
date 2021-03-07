const Command = require('../../base/Command.js');
const { getMember } = require('../../base/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class Ban extends Command {
  constructor (client) {
    super(client, {
      name: 'ban',
      description: 'Ban a naughty member',
      usage: 'ban <member> <reason>',
      category: 'Moderator',
      guildOnly: true
    });
  }

  async run (msg, text) {
    const me = msg.guild.me;

    const logChan = db.get(`servers.${msg.guild.id}.logging.channel`);

    if (!text[0]) return msg.channel.send('Please provide a member and a reason.');
    const banMem = getMember(msg, text[0]);

    if (!msg.guild.me.permissions.has('BAN_MEMBERS')) return msg.channel.send('The bot is missing the ban members permission.');
    if (!msg.member.permissions.has('BAN_MEMBERS')) return msg.channel.send('Why do you think you can use this?');

    // start reason
    text.shift();
    const reason = text.join(' ');
    if (!reason) return msg.channel.send('Please provide a reason.');
    if (me.permissions.has('MANAGE_MESSAGES')) msg.delete();
    if (!banMem) return msg.channel.send('That user was not found.');
    if (!banMem.bannable) return msg.channel.send('That user is not bannable.');

    const em = new DiscordJS.MessageEmbed()
      .setTitle('Member Banned')
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setColor('RED')
      .addField('User', banMem, true)
      .addField('Banned By', msg.member, true)
      .addField('Reason', reason, true)
      .setFooter(`ID: ${banMem.id}`)
      .setTimestamp();
    banMem.ban({ reason: reason });

    if (logChan) msg.guild.channels.cache.get(logChan).send(em);
    return msg.channel.send(em);
  }
}

module.exports = Ban;
