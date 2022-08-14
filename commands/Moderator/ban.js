const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class Ban extends Command {
  constructor (client) {
    super(client, {
      name: 'ban',
      description: 'Ban a naughty user',
      usage: 'ban <user> <reason>',
      category: 'Moderator',
      guildOnly: true
    });
  }

  async run (msg, args) {
    const logChan = db.get(`servers.${msg.guild.id}.logging.channel`);

    if (!args[0]) return msg.channel.send('Please provide a user and a reason.');
    const banMem = getMember(msg, args[0]);

    if (!msg.guild.members.me.permissions.has('BanMembers')) return msg.channel.send('The bot is missing the ban members permission.');
    if (!msg.member.permissions.has('BanMembers')) return msg.channel.send('You do not have permissions to ban members.');

    // start reason
    args.shift();
    const reason = args.join(' ');
    if (!reason) return msg.channel.send('Please provide a reason.');
    if (msg.guild.members.me.permissions.has('ManageMessages')) msg.delete();
    if (!banMem) return msg.channel.send('That user was not found.');
    if (!banMem.bannable) return msg.channel.send('That user is not bannable.');

    const em = new EmbedBuilder()
      .setTitle('User Banned')
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setColor('#ff0000')
      .addFields([
        { name: 'User', value: banMem.toString() },
        { name: 'Banned By', value: msg.member.displayName.toString() },
        { name: 'Reason', value: reason }
      ])
      .setFooter({ text: `User ID: ${banMem.id}` })
      .setTimestamp();
    msg.guild.bans.create(banMem, { reason });

    if (logChan) {
      const em2 = new EmbedBuilder()
        .setTitle('User Banned')
        .setColor('#ff0000')
        .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
        .setDescription('Full info posted in the log channel.');

      const reply = await msg.channel.send(em2);
      msg.guild.channels.cache.get(logChan).send({ embeds: [em] });
      setTimeout(() => {
        reply.delete();
      }, 30000);
    } else {
      return msg.channel.send({ embeds: [em] });
    }
  }
}

module.exports = Ban;
