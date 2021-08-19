const Command = require('../../base/Command.js');
const { getTotalPoints } = require('../../util/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class DeleteWarning extends Command {
  constructor (client) {
    super(client, {
      name: 'delete-warning',
      description: 'Delete a specific warnings case.',
      usage: 'delete-warning <caseID>',
      category: 'Administrator',
      guildOnly: true,
      permLevel: 'Administrator',
      aliases: ['delwarn', 'deletecase', 'deletewarn', 'delcase', 'clearcase', 'deletewarning', 'delwarning']
    });
  }

  async run (msg, args) {
    let title = 'Case Cleared';
    let color = 'BLUE';
    if (!args || args.length < 1) return msg.channel.send('incorrect usage deletewarning <caseID>');

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
      if (!msg.guild.me.permissions.has('BAN_MEMBERS')) {
        msg.channel.send('The bot does not have Ban Members permission to unban the user.');
      } else {
        await msg.guild.members.unban(userID).catch(() => null);
        title = 'User Unbanned';
        color = 'GREEN';
      }
    }

    const em = new DiscordJS.MessageEmbed()
      .setColor(color)
      .setTitle(title)
      .setDescription(`${msg.author} has cleared a case from a user.`)
      .addField('User', `${user} (${user.id})`, true)
      .addField('Deleted Case', `\`${caseID}\``, true)
      .addField('Case Reason', warnReason, false);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = DeleteWarning;
