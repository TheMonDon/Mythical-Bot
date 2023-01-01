const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const db = require('quick.db');

class Withdraw extends Command {
  constructor (client) {
    super(client, {
      name: 'withdraw',
      category: 'Economy',
      description: 'Withdraw your money from the bank',
      usage: 'withdraw <amount>',
      aliases: ['with'],
      guildOnly: true
    });
  }

  run (msg, text) {
    let amount = text.join(' ');
    const errorColor = msg.settings.embedErrorColor;

    const usage = `${msg.settings.prefix}Withdraw <amount | all>`;
    if (!amount || amount.length < 1) {
      const embed = new EmbedBuilder()
        .setColor(errorColor)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(`Incorrect Usage: ${usage}`);
      return msg.channel.send({ embeds: [embed] });
    }

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';
    const bank = parseFloat(db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`) || 0); // store bank info prior to checking args
    const cash = parseFloat(db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) || 0); // same thing but cash

    amount = amount.replace(/,/g, '').replace(currencySymbol, '');
    if (isNaN(amount)) {
      if (amount.toLowerCase() === 'all') {
        if (bank <= 0) return msg.channel.send('You don\'t have any money to withdraw.');
        if ((bank + cash) > Number.MAX_VALUE) {
          return msg.channel.send('You have too much cash to be able to withdraw all your bank');
        }

        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, 0);
        db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bank);

        const em = new EmbedBuilder()
          .setColor('#04ACF4')
          .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
          .setDescription(`Withdrew ${currencySymbol}${bank.toLocaleString()} from your bank!`);
        return msg.channel.send({ embeds: [em] });
      } else {
        const embed = new EmbedBuilder()
          .setColor(errorColor)
          .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
          .setDescription(`Incorrect Usage: ${usage}`);
        return msg.channel.send({ embeds: [embed] });
      }
    }
    amount = parseFloat(amount);

    if (amount < 0) return msg.channel.send('You can\'t withdraw negative amounts of money.');
    if (amount > bank) return msg.channel.send(`You don't have that much money to withdraw. You currently have ${currencySymbol}${bank.toLocaleString()} in the bank.`);
    if (bank <= 0) return msg.channel.send('You don\'t have any money to withdraw.');
    if ((cash + amount) > Number.MAX_VALUE) {
      return msg.channel.send('You have too much cash to be able to withdraw that much money.');
    }

    db.subtract(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, amount); // take money from bank
    db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, amount); // set money to cash

    const embed = new EmbedBuilder()
      .setColor('#04ACF4')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setDescription(`Withdrew ${currencySymbol}${amount.toLocaleString()} from your bank!`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Withdraw;
