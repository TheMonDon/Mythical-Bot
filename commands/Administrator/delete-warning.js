const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class deletewarning extends Command {
  constructor (client) {
    super(client, {
      name: 'delete-warning',
      description: 'Delete a specific warnings case.',
      usage: 'delete-warning <caseID>',
      category: 'Administrator',
      guildOnly: true,
      permLevel: 'Administrator',
      aliases: ['delwarn', 'clearwarn', 'deletecase', 'deletewarn', 'delcase', 'clearcase', 'deletewarning']
    });
  }

  async run (msg, args) {
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
    if (previousPoints >= 5 && newerPoints < 5) {
      if (!msg.guild.me.permissions.has('BAN_MEMBERS')) msg.channel.send('The bot does not have ban members perms to unban the member.');
      await msg.guild.unban(userID).catch(() => null);
    }

    const em = new DiscordJS.MessageEmbed()
      .setColor('BLUE')
      .setDescription(`${msg.author} has cleared a case from a user.`)
      .addField('From User', user, true)
      .addField('Deleted Case', `\`${caseID}\``, true)
      .addField('Case Reason', warnReason, false);
    return msg.channel.send(em);

  }
}

function getWarns (userID, msg) {
  const warns = db.get(`servers.${msg.guild.id}.warns.warnings`);
  const userCases = [];
  if (warns) {
    Object.values(warns).forEach((val) => {
      if (val.user === userID) {
        userCases.push(val);
      }
    });
  }
  if (!userCases) return;
  return userCases;
}

function getTotalPoints (userID, msg) {
  const warns = getWarns(userID, msg);
  let total = 0;
  if (warns) {
    Object.keys(warns).forEach(c => {
      total += Number(warns[c].points);
    });
  }
  return total;
}

module.exports = deletewarning;