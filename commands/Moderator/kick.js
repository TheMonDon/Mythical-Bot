const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Kick extends Command {
  constructor(client) {
    super(client, {
      name: 'kick',
      description: 'Kick a naughty user',
      usage: 'kick <member> <reason>',
      category: 'Moderator',
      permLevel: 'Moderator',
      requiredArgs: 2,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (msg.guild.members.me.permissions.has('ManageMessages')) msg.delete();
    if (!msg.guild.members.me.permissions.has('KickMembers'))
      return this.client.util.errorEmbed(msg, 'The bot is missing the Kick Members permission.');

    const logChan = await db.get(`servers.${msg.guild.id}.logs.channel`);
    const kickMem = await this.client.util.getMember(msg, args[0]);
    if (!kickMem) return this.client.util.errorEmbed(msg, 'Member is either not in server or is invalid.');
    if (!kickMem.kickable) return this.client.util.errorEmbed(msg, 'The member is not kickable by the bot.');

    // start reason
    args.shift();
    const reason = args.join(' ');

    kickMem.kick(reason);

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
