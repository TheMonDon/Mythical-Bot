const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

class Balance extends Command {
  constructor (client) {
    super(client, {
      name: 'balance',
      category: 'Economy',
      description: 'Get yours or another members balance',
      usage: 'balance [member]',
      aliases: ['bal', 'money'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    let mem = msg.member;

    if (args && args.length > 0) mem = await getMember(msg, args.join(' '));

    if (!mem) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setColor(msg.settings.embedErrorColor)
        .setDescription(stripIndents`
      :x: Invalid member given.

      Usage: ${msg.settings.prefix}balance [member]
      `);
      return msg.channel.send({ embeds: [embed] });
    }

    const cash = parseFloat(db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0);
    const bank = parseFloat(db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`) || 0);
    const netWorth = cash + bank;

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    const embed = new EmbedBuilder()
      .setAuthor({ name: mem.user.tag, iconURL: mem.user.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .addFields([
        { name: 'Cash:', value: currencySymbol + cash.toLocaleString() },
        { name: 'Bank:', value: currencySymbol + bank.toLocaleString() },
        { name: 'Net Worth:', value: currencySymbol + netWorth.toLocaleString() }
      ])
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Balance;
