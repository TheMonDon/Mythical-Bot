const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const moment = require('moment');

class WarnInfo extends Command {
  constructor (client) {
    super(client, {
      name: 'warn-info',
      description: 'View the information of a specific case.',
      usage: 'warn-info <caseID>',
      category: 'Moderator',
      guildOnly: true,
      permLevel: 'Moderator',
      aliases: ['case', 'warning', 'caseinfo', 'warninginfo', 'warninfo']
    });
  }

  async run (msg, args) {
    if (!args || args.length < 1) return msg.channel.send('Incorrect Usage: Please supply a caseID');
    const caseID = args.join(' ');
    const warn = db.get(`servers.${msg.guild.id}.warns.warnings.${caseID}`);

    if (!warn) return msg.channel.send('I couldn\'t find any case with that ID.');

    const { mod, points, reason, user, timestamp, messageURL } = warn;
    const victim = await this.client.users.fetch(user);
    const moderator = await this.client.users.fetch(mod);

    const em = new DiscordJS.MessageEmbed()
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setColor('#0099CC')
      .addField('Case ID', caseID.toString(), true)
      .addField('User', victim.toString(), true)
      .addField('Points', points.toString(), true)
      .addField('Moderator', moderator.toString(), true)
      .addField('Warned on', moment(timestamp).format('LLL'), true)
      .addField('Message URL', messageURL, true)
      .addField('Reason', reason, false);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = WarnInfo;
