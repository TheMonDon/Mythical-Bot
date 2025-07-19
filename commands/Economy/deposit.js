const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Deposit extends Command {
  constructor(client) {
    super(client, {
      name: 'deposit',
      category: 'Economy',
      description: 'Deposit your money into the bank',
      examples: ['deposit'],
      usage: 'deposit <amount | all>',
      aliases: ['dep'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let amount = args.join(' ');
    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';

    const cashValue = await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`);
    const startBalance = BigInt((await db.get(`servers.${msg.guild.id}.economy.startBalance`)) || 0);
    const cash = cashValue === undefined ? startBalance : BigInt(cashValue);

    const bank = BigInt((await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`)) || 0);

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    let csCashAmount = currencySymbol + cash.toLocaleString();
    csCashAmount = this.client.util.limitStringLength(csCashAmount, 0, 1024);

    amount = amount.replace(/,/g, '').replace(currencySymbol, '');
    if (isNaN(amount) || !amount) {
      if (amount.toLowerCase() === 'all') {
        if (cash <= BigInt(0))
          return this.client.util.errorEmbed(msg, "You don't have any cash to deposit.", 'Invalid Parameter');

        await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, 0);
        const newAmount = bank + cash;
        await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, newAmount.toString());

        embed.setDescription(`Deposited ${csCashAmount} to your bank.`);
        return msg.channel.send({ embeds: [embed] });
      } else {
        return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Amount');
      }
    }
    amount = BigInt(
      amount
        .replace(/\..*/, '') // Remove everything after the first period
        .replace(/[^0-9,]/g, '') // Keep only digits and commas
        .replace(/,/g, ''), // Remove commas
    );

    if (amount < BigInt(0))
      return this.client.util.errorEmbed(msg, "You can't deposit negative amounts of cash", 'Invalid Parameter');
    if (amount > cash)
      return this.client.util.errorEmbed(
        msg,
        `You don't have that much money to deposit. You currently have ${csCashAmount} in cash.`,
        'Invalid Parameter',
      );
    if (cash <= BigInt(0))
      return this.client.util.errorEmbed(msg, "You don't have any cash to deposit", 'Invalid Parameter');

    const newCashAmount = cash - amount;
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newCashAmount.toString());
    const newBankAmount = bank + amount;
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, newBankAmount.toString());

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = this.client.util.limitStringLength(csAmount, 0, 1024);
    embed.setDescription(`Deposited ${csAmount} to your bank.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Deposit;
