const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

class Balance extends Command {
  constructor(client) {
    super(client, {
      name: 'balance',
      category: 'Economy',
      description: 'Get yours or another members balance',
      usage: 'balance [member]',
      aliases: ['bal', 'money'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let mem = msg.member;

    if (args && args.length > 0) mem = await this.client.util.getMember(msg, args.join(' '));

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder().setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() });

    if (!mem) {
      embed.setColor(msg.settings.embedErrorColor).setDescription(stripIndents`
      :x: Invalid member given.

      Usage: ${msg.settings.prefix}balance [member]
      `);
      return msg.channel.send({ embeds: [embed] });
    }

    const cash = BigInt(
      db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) ||
        db.get(`servers.${msg.guild.id}.economy.startBalance`) ||
        0,
    );
    const bank = BigInt(db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`) || 0);
    const netWorth = cash + bank;

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    const memberName = mem.user.discriminator === '0' ? mem.user.username : msg.user.tag;
    embed
      .setAuthor({ name: memberName, iconURL: mem.user.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .addFields([
        { name: 'Cash:', value: currencySymbol + cash.toLocaleString() },
        { name: 'Bank:', value: currencySymbol + bank.toLocaleString() },
        { name: 'Net Worth:', value: currencySymbol + netWorth.toLocaleString() },
      ])
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Balance;
