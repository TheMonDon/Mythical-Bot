const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class DeleteWarning extends Command {
  constructor(client) {
    super(client, {
      name: 'delete-warning',
      description: 'Delete a specific warnings case',
      usage: 'delete-warning <CaseID>',
      category: 'Administrator',
      permLevel: 'Administrator',
      aliases: [
        'delwarn',
        'deletecase',
        'deletewarn',
        'delcase',
        'clearcase',
        'deletewarning',
        'delwarning',
        'del-warn',
        'remove-warning',
      ],
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    let title = 'Case Cleared';
    let color = msg.settings.embedColor;

    const caseID = args.join(' ');
    const warning = await db.get(`servers.${msg.guild.id}.warns.warnings.${caseID}`);

    if (!warning) return this.client.util.errorEmbed(msg, 'No warning case found', 'Invalid Case ID');

    const logChan = await db.get(`servers.${msg.guild.id}.warns.channel`);
    const userID = warning.user;
    const user = await this.client.users.fetch(userID);
    const warnReason = warning.reason || '???';

    if (!user) return this.client.util.errorEmbed(msg, 'User not found', 'Invalid User');

    const previousPoints = this.client.util.getTotalPoints(userID, msg);
    await db.delete(`servers.${msg.guild.id}.warns.warnings.${caseID}`);
    const newerPoints = this.client.util.getTotalPoints(userID, msg);

    if (previousPoints >= 10 && newerPoints < 10) {
      if (!msg.guild.members.me.permissions.has('BanMembers')) {
        this.client.util.errorEmbed(
          msg,
          'Please unban the user manually, the bot does not have Ban Members permission.',
          'Missing Permission',
        );
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
