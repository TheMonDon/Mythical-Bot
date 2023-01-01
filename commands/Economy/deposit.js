const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const db = require('quick.db');

class Deposit extends Command {
  constructor (client) {
    super(client, {
      name: 'deposit',
      category: 'Economy',
      description: 'Deposit your money into the bank',
      examples: ['deposit'],
      aliases: ['dep'],
      guildOnly: true
    });
  }

  run (msg, args) {
    let amount = args.join(' ');
    const usage = `${msg.settings.prefix}Deposit <amount | all>`;

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    const cash = parseFloat(db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0);
    const bank = parseFloat(db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`) || 0);

    amount = amount.replace(/,/g, '');
    amount = amount.replace(currencySymbol, '');
    if (isNaN(amount) || !amount) {
      if (amount.toLowerCase() === 'all') {
        if (cash <= 0) return msg.channel.send('You don\'t have any money to deposit.');
        if ((cash + bank) > Number.MAX_VALUE) {
          return msg.channel.send('You have too much money in the bank to deposit all your cash.');
        }

        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, 0);
        db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, cash);

        const em = new EmbedBuilder()
          .setColor('#04ACF4')
          .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
          .setDescription(`Deposited ${currencySymbol}${cash.toLocaleString()} to your bank.`);
        return msg.channel.send({ embeds: [em] });
      } else {
        const embed = new EmbedBuilder()
          .setColor(msg.settings.embedErrorColor)
          .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
          .setDescription(`Incorrect Usage: ${usage}`);
        return msg.channel.send({ embeds: [embed] });
      }
    }
    amount = parseInt(amount, 10);

    if (amount < 0) return msg.channel.send('You can\'t deposit negative amounts of money.');
    if (amount > cash) return msg.channel.send(`You don't have that much money to deposit. You currently have ${currencySymbol}${cash.toLocaleString()} in cash.`);
    if (cash <= 0) return msg.channel.send('You don\'t have any money to deposit.');
    if ((amount + bank) > Number.MAX_VALUE) {
      return msg.channel.send('You have too much money in the bank to deposit that much.');
    }

    db.subtract(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, amount); // take money from cash
    db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, amount); // set money to bank

    const embed = new EmbedBuilder()
      .setColor('#04ACF4')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setDescription(`Deposited ${currencySymbol}${amount.toLocaleString()} to your bank.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Deposit;
