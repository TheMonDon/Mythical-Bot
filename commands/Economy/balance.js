const Command = require('../../base/Command.js');
const { getMember } = require('../../base/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const { stripIndents } = require('common-tags');

class Balance extends Command {
  constructor (client) {
    super(client, {
      name: 'balance',
      category: 'Economy',
      description: 'Gives you your or another member\'s balance',
      usage: 'balance [member]',
      aliases: ['bal', 'money'],
      guildOnly: true
    });
  }

  run (msg, args) {
    let mem = msg.member;

    if (args && args.length > 0) mem = getMember(msg, args.join(' '));

    if (!mem) {
      const embed = new DiscordJS.MessageEmbed()
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setColor('#EC5454')
        .setDescription(stripIndents`
      :x: Invalid member given.

      Usage: ${msg.settings.prefix}balance [member]
      `);
      return msg.channel.send({ embeds: [embed] });
    }

    const cash = db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;
    const bank = db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`) || 0;
    const nw = cash + bank;

    const cs = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    const embed = new DiscordJS.MessageEmbed()
      .setAuthor(mem.user.tag, mem.user.displayAvatarURL())
      .setColor('#03A9F4')
      .addField('Cash:', cs + cash.toLocaleString(), true)
      .addField('Bank:', cs + bank.toLocaleString(), true)
      .addField('Net Worth:', cs + nw.toLocaleString(), true)
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Balance;
