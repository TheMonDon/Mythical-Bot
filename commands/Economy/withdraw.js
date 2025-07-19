const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

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

  async run(msg, args) {
    let amount = args.join(' ');
    const embed = new EmbedBuilder().setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    const bank = BigInt((await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`)) || 0);
    const cash = BigInt((await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`)) || 0);

    let csBankAmount = currencySymbol + bank.toLocaleString();
    csBankAmount = this.client.util.limitStringLength(csBankAmount, 0, 1024);

    amount = amount.replace(/,/g, '').replace(currencySymbol, '');
    if (isNaN(amount)) {
      if (amount.toLowerCase() === 'all') {
        if (bank <= BigInt(0)) return msg.channel.send("You don't have any money to withdraw.");

        await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, 0);
        const newAmount = bank + cash;
        await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());

        embed.setColor(msg.settings.embedColor).setDescription(`Withdrew ${csBankAmount} from your bank!`);
        return msg.channel.send({ embeds: [embed] });
      } else {
        return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
      }
    }

    amount = BigInt(
      amount
        .replace(/\..*/, '') // Remove everything after the first period
        .replace(/[^0-9,]/g, '') // Keep only digits and commas
        .replace(/,/g, ''), // Remove commas
    );

    if (amount < BigInt(0)) return this.client.util.errorEmbed(msg, "You can't withdraw negative amounts of money.");
    if (amount > bank)
      return this.client.util.errorEmbed(
        msg,
        `You don't have that much money to withdraw. You currently have ${csBankAmount} in the bank.`,
      );

    if (bank <= BigInt(0)) return this.client.util.errorEmbed(msg, "You don't have any money to withdraw.");

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = this.client.util.limitStringLength(csAmount, 0, 1024);

    const newBankAmount = bank - amount;
    const newCashAmount = cash + amount;
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, newBankAmount.toString());
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newCashAmount.toString());

    embed.setColor(msg.settings.embedColor).setDescription(`Withdrew ${csAmount} from your bank.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Withdraw;
