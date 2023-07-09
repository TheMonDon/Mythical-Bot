const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class Kick extends Command {
  constructor(client) {
    super(client, {
      name: 'kick',
      description: 'Kick a naughty user',
      usage: 'Kick <User> <Reason>',
      category: 'Moderator',
      permLevel: 'Moderator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!msg.guild.members.me.permissions.has('KickMembers'))
      return msg.channel.send('The bot is missing the Kick Members permission.');

    const logChan = db.get(`servers.${msg.guild.id}.logs.channel`);

    if (!args[0]) return msg.channel.send('Please provide a user and a reason.');
    const kickMem = await this.client.util.getMember(msg, args[0]);

    // start reason
    args.shift();
    const reason = args.join(' ');
    if (!reason) return msg.channel.send('Please provide a reason.');
    if (msg.guild.members.me.permissions.has('ManageMessages')) msg.delete();
    if (!kickMem) return msg.channel.send('That user was not found.');
    if (!kickMem.kickable) return msg.channel.send('That user is not kickable.');

    kickMem.kick({ reason });

    const em = new EmbedBuilder()
      .setTitle('User Kicked')
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setColor('#FFA500')
      .addFields([
        { name: 'User', value: kickMem.toString() },
        { name: 'Kicked By', value: msg.member.displayName.toString() },
        { name: 'Reason', value: reason },
      ])
      .setFooter({ text: `User ID: ${kickMem.id}` })
      .setTimestamp();

    if (logChan) {
      const em2 = new EmbedBuilder()
        .setTitle('User Kicked')
        .setColor('#FFA500')
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

module.exports = Kick;
