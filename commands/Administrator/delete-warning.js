const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class DeleteWarning extends Command {
  constructor(client) {
    super(client, {
      name: 'delete-warning',
      description: 'Delete a specific warnings case.',
      usage: 'Delete-Warning <CaseID>',
      category: 'Administrator',
      permLevel: 'Administrator',
      aliases: ['delwarn', 'deletecase', 'deletewarn', 'delcase', 'clearcase', 'deletewarning', 'delwarning'],
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    let title = 'Case Cleared';
    let color = msg.settings.embedColor;

    const caseID = args.join(' ');
    const warning = db.get(`servers.${msg.guild.id}.warns.warnings.${caseID}`);

    if (!warning) return msg.channel.send("I couldn't find any case with that ID.");

    const logChan = db.get(`servers.${msg.guild.id}.warns.channel`);
    const userID = warning.user;
    const user = await this.client.users.fetch(userID);
    const warnReason = warning.reason || '???';

    if (!user) return msg.channel.send("I couldn't find the user of that case.");

    const previousPoints = this.client.util.getTotalPoints(userID, msg);
    db.delete(`servers.${msg.guild.id}.warns.warnings.${caseID}`);
    const newerPoints = this.client.util.getTotalPoints(userID, msg);

    if (previousPoints >= 10 && newerPoints < 10) {
      if (!msg.guild.members.me.permissions.has('BanMembers')) {
        msg.channel.send('The bot does not have BanMembers permission to unban the user.');
      } else {
        await msg.guild.members.unban(userID).catch(() => null);
        title += ' & User Unbanned';
        color = msg.settings.embedSuccessColor;
      }
    }

    const userEmbed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color)
      .addFields([
        { name: 'Moderator', value: `${msg.author} (${msg.author.id})`, inline: true },
        { name: 'Deleted Case', value: `\`${caseID}\``, inline: true },
        { name: 'Case Reason', value: warnReason, inline: true },
        { name: 'Issued In', value: msg.guild.name, inline: true },
      ]);
    const userMessage = await user.send({ embeds: [userEmbed] }).catch(() => null);

    const logEmbed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color)
      .addFields([
        { name: 'Moderator', value: `${msg.author} (${msg.author.id})`, inline: true },
        { name: 'User', value: `${user} (${user.id})`, inline: true },
        { name: 'Deleted Case', value: `\`${caseID}\``, inline: true },
        { name: 'Case Reason', value: warnReason, inline: true },
      ]);
    if (!userMessage) logEmbed.setFooter({ text: 'Failed to send a DM to the user. (User has DMs disabled)' });

    if (logChan) {
      const channelEmbed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .addFields([
          { name: 'User', value: `${user} (${user.id})`, inline: true },
          { name: 'Deleted Case', value: `\`${caseID}\``, inline: true },
        ]);

      msg.guild.channel.send({ embeds: [channelEmbed] }).then((embed) => {
        setTimeout(() => embed.delete(), 30000);
      });

      return msg.guild.channels.cache.get(logChan).send({ embeds: [logEmbed] });
    } else {
      return msg.channel.send({ embeds: [logEmbed] });
    }
  }
}

module.exports = DeleteWarning;
