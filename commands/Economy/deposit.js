const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const db = require('quick.db');

class Deposit extends Command {
  constructor(client) {
    super(client, {
      name: 'deposit',
      category: 'Economy',
      description: 'Deposit your money into the bank',
      examples: ['deposit'],
      aliases: ['dep'],
      guildOnly: true,
    });
  }

  run(msg, args) {
    let amount = args.join(' ');
    const usage = `${msg.settings.prefix}Deposit <amount | all>`;

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    const cash = BigInt(
      db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) ||
        db.get(`servers.${msg.guild.id}.economy.startBalance`) ||
        0,
    );
    const bank = BigInt(db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`) || 0);
    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;

    const embed = new EmbedBuilder()
      .setColor('#04ACF4')
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() });

    let csCashAmount = currencySymbol + cash.toLocaleString();
    csCashAmount = csCashAmount.length > 1024 ? `${csCashAmount.slice(0, 1021) + '...'}` : csCashAmount;

    amount = amount.replace(/,/g, '').replace(currencySymbol, '');
    if (isNaN(amount) || !amount) {
      if (amount.toLowerCase() === 'all') {
        if (cash <= BigInt(0)) return msg.channel.send("You don't have any money to deposit.");

        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, 0);
        const newAmount = bank + cash;
        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, newAmount.toString());

        embed.setDescription(`Deposited ${csCashAmount} to your bank.`);
        return msg.channel.send({ embeds: [embed] });
      } else {
        embed.setColor(msg.settings.embedErrorColor).setDescription(`Incorrect Usage: ${usage}`);
        return msg.channel.send({ embeds: [embed] });
      }
    }
    amount = BigInt(amount.replace(/[^0-9\\.]/g, ''));

    if (amount < BigInt(0)) return msg.channel.send("You can't deposit negative amounts of money.");
    if (amount > cash)
      return msg.channel.send(`You don't have that much money to deposit. You currently have ${csCashAmount} in cash.`);
    if (cash <= BigInt(0)) return msg.channel.send("You don't have any money to deposit.");

    const newCashAmount = cash - amount;
    db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newCashAmount.toString());
    const newBankAmount = bank + amount;
    db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, newBankAmount.toString());

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = csAmount.length > 1024 ? `${csAmount.slice(0, 1021) + '...'}` : csAmount;
    embed.setDescription(`Deposited ${csAmount} to your bank.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Deposit;
