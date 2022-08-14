const Command = require('../../base/Command.js');
const { getTotalPoints } = require('../../util/Util.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class DeleteWarning extends Command {
  constructor (client) {
    super(client, {
      name: 'delete-warning',
      description: 'Delete a specific warnings case.',
      usage: 'Delete-Warning <CaseID>',
      category: 'Administrator',
      permLevel: 'Administrator',
      aliases: ['delwarn', 'deletecase', 'deletewarn', 'delcase', 'clearcase', 'deletewarning', 'delwarning'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    let title = 'Case Cleared';
    let color = '#0099CC';
    if (!args || args.length < 1) return msg.channel.send('Incorrect Usage: Delete-Warning <CaseID>');

    const caseID = args.join(' ');
    const warning = db.get(`servers.${msg.guild.id}.warns.warnings.${caseID}`);

    if (!warning) return msg.channel.send('I couldn\'t find any case with that ID.');

    const userID = warning.user;
    const user = await this.client.users.fetch(userID);
    const warnReason = warning.reason || '???';

    const previousPoints = getTotalPoints(userID, msg);
    db.delete(`servers.${msg.guild.id}.warns.warnings.${caseID}`);
    const newerPoints = getTotalPoints(userID, msg);
    if (previousPoints >= 10 && newerPoints < 10) {
      if (!msg.guild.members.me.permissions.has('BanMembers')) {
        msg.channel.send('The bot does not have BanMembers permission to unban the user.');
      } else {
        await msg.guild.members.unban(userID).catch(() => null);
        title = 'User Unbanned';
        color = '#00FF00';
      }
    }

    const em = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(`${msg.author} has cleared a case from a user.`)
      .addFields([
        { name: 'User', value: `${user} (${user.id})` },
        { name: 'Deleted Case', value: `\`${caseID}\`` },
        { name: 'Case Reason', value: warnReason }
      ]);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = DeleteWarning;
