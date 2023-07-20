const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const db = require('quick.db');

class Withdraw extends Command {
  constructor(client) {
    super(client, {
      name: 'withdraw',
      category: 'Economy',
      description: 'Withdraw your money from the bank',
      usage: 'withdraw <amount | all>',
      aliases: ['with'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  run(msg, text) {
    let amount = text.join(' ');
    const errorColor = msg.settings.embedErrorColor;

    const usage = `${msg.settings.prefix}withdraw <amount | all>`;

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder()
      .setColor(errorColor)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
      .setDescription(`Incorrect Usage: ${usage}`);

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';
    const bank = BigInt(db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`) || 0);
    const cash = BigInt(db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) || 0);

    let csBankAmount = currencySymbol + bank.toLocaleString();
    csBankAmount = csBankAmount.length > 1024 ? `${csBankAmount.slice(0, 1021) + '...'}` : csBankAmount;

    amount = amount.replace(/,/g, '').replace(currencySymbol, '');
    if (isNaN(amount)) {
      if (amount.toLowerCase() === 'all') {
        if (bank <= BigInt(0)) return msg.channel.send("You don't have any money to withdraw.");

        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, 0);
        const newAmount = bank + cash;
        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());

        embed.setColor('#04ACF4').setDescription(`Withdrew ${currencySymbol}${bank.toLocaleString()} from your bank!`);
        return msg.channel.send({ embeds: [embed] });
      } else {
        return msg.channel.send({ embeds: [embed] });
      }
    }
    amount = BigInt(amount.replace(/[^0-9\\.]/g, ''));

    if (amount < BigInt(0)) return msg.channel.send("You can't withdraw negative amounts of money.");
    if (amount > bank)
      return msg.channel.send(
        `You don't have that much money to withdraw. You currently have ${csBankAmount} in the bank.`,
      );
    if (bank <= BigInt(0)) return msg.channel.send("You don't have any money to withdraw.");

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = csAmount.length > 1024 ? `${csAmount.slice(0, 1021) + '...'}` : csAmount;

    const newBankAmount = bank - amount;
    const newCashAmount = cash + amount;
    db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, newBankAmount.toString());
    db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newCashAmount.toString());

    embed.setColor('#04ACF4').setDescription(`Withdrew ${csAmount} from your bank.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Withdraw;
